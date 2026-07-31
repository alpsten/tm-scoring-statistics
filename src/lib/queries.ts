import { supabase } from './supabase'
import { normalizeExpansion } from './expansions'
import { evaluateCardEffects, aggregateCardEffects } from './cardEffectRules'
import type { CardEffectAggregateStat } from './cardEffectRules'
import { basePoints, milestoneAwardBonus, pairRandomRound, pairByStandings, determineFinalists, compareStandings } from './tournamentRules'
import type { GameWithResults, PlayerStats, CorporationStats, CardStats, CardReference, PlayerProfile } from '../types/database'

// ── Raw shape returned by Supabase nested selects ─────────────────────────────

interface RawGame {
  id: string
  game_number: number | null
  date: string
  player_count: number
  generations: number | null
  map_name: string | null
  notes: string | null
  format: 'Physical' | 'Digital' | null
  created_at: string
  raw_log: string | null
  parameter_contributions?: Array<{
    id: string
    game_id: string
    player_name: string
    oxygen_steps: number
    temperature_steps: number
    ocean_steps: number
    venus_steps: number
    habitat_steps: number
    mining_steps: number
    logistics_steps: number
  }>
  player_results: Array<{
    id: string
    game_id: string
    player_name: string
    corporation: string
    tr: number
    milestone_vp: number
    award_vp: number
    greenery_vp: number
    city_vp: number
    card_vp: number
    habitat_vp: number | null
    logistics_vp: number | null
    mining_vp: number | null
    plantery_vp: number | null
    mc: number | null
    total_vp: number
    position: number
    key_notes: string | null
    ceo: string | null
    corporations: string[] | null
    is_merger: boolean | null
    second_corporation: string | null
  }>
  game_expansions: Array<{ expansion_name: string }>
  game_colonies: Array<{ colony_name: string }>
  turn_order: string[] | null
}

function mapGame(raw: RawGame): GameWithResults {
  return {
    ...raw,
    expansions: raw.game_expansions.map(e => normalizeExpansion(e.expansion_name)),
    colonies: raw.game_colonies.map(c => c.colony_name),
    parameter_contributions: raw.parameter_contributions ?? [],
    player_results: raw.player_results.map(r => ({
      ...r,
      corporations: r.corporations ?? [],
    })),
  }
}

const GAME_LIST_SELECT = `*, player_results(*), game_expansions(expansion_name), game_colonies(colony_name)`
const GAME_DETAIL_SELECT = `*, player_results(*), game_expansions(expansion_name), game_colonies(colony_name), parameter_contributions(*)`

// ── Query functions ────────────────────────────────────────────────────────────

export async function fetchGames(): Promise<GameWithResults[]> {
  const { data, error } = await supabase
    .from('game_sessions')
    .select(GAME_LIST_SELECT)
    .order('date', { ascending: false })
  if (error) throw error
  return (data as RawGame[]).map(mapGame)
}

export async function fetchGame(id: string): Promise<GameWithResults> {
  const { data, error } = await supabase
    .from('game_sessions')
    .select(GAME_DETAIL_SELECT)
    .eq('id', id)
    .single()
  if (error) throw error
  return mapGame(data as RawGame)
}

export async function fetchGameByNumber(num: number): Promise<GameWithResults> {
  const { data, error } = await supabase
    .from('game_sessions')
    .select(GAME_DETAIL_SELECT)
    .eq('game_number', num)
    .single()
  if (error) throw error
  return mapGame(data as RawGame)
}

export async function fetchPlayerStats(): Promise<PlayerStats[]> {
  const { data, error } = await supabase
    .from('player_results')
    .select('player_name, total_vp, position')
  if (error) throw error

  const map: Record<string, { vp: number; pos: number }[]> = {}
  for (const r of data!) {
    ;(map[r.player_name] ??= []).push({ vp: r.total_vp, pos: r.position })
  }

  return Object.entries(map).map(([player_name, rows]) => {
    const wins = rows.filter(r => r.pos === 1).length
    const vps = rows.map(r => r.vp)
    return {
      player_name,
      games_played: rows.length,
      wins,
      win_rate: (wins / rows.length) * 100,
      avg_score: vps.reduce((s, v) => s + v, 0) / vps.length,
      best_score: Math.max(...vps),
      avg_position: rows.reduce((s, r) => s + r.pos, 0) / rows.length,
    }
  })
}

export async function fetchCorporationStats(): Promise<CorporationStats[]> {
  const { data, error } = await supabase
    .from('player_results')
    .select('corporation, corporations, total_vp, position')
  if (error) throw error

  const map: Record<string, { vp: number; pos: number }[]> = {}
  for (const r of data!) {
    const corps: string[] = r.corporations?.length ? r.corporations : [r.corporation]
    if (corps.length > 1) continue  // skip merger rows
    ;(map[corps[0]] ??= []).push({ vp: r.total_vp, pos: r.position })
  }

  return Object.entries(map).map(([corporation, rows]) => {
    const wins = rows.filter(r => r.pos === 1).length
    const vps = rows.map(r => r.vp)
    return {
      corporation,
      games_played: rows.length,
      wins,
      win_rate: (wins / rows.length) * 100,
      avg_score: vps.reduce((s, v) => s + v, 0) / vps.length,
      best_score: Math.max(...vps),
    }
  })
}

export async function fetchCardStats(): Promise<CardStats[]> {
  const { data: cards, error: ce } = await supabase
    .from('cards_played')
    .select('card_name, vp_from_card, card_order, game_id, player_name')
    .limit(10000)
  if (ce) throw ce
  if (!cards || cards.length === 0) return []

  const gameIds = [...new Set(cards.map(c => c.game_id))]
  const { data: results, error: re } = await supabase
    .from('player_results')
    .select('game_id, player_name, total_vp, position')
    .in('game_id', gameIds)
  if (re) throw re

  const resultMap: Record<string, Record<string, { total_vp: number; position: number }>> = {}
  for (const r of results!) {
    ;(resultMap[r.game_id] ??= {})[r.player_name] = { total_vp: r.total_vp, position: r.position }
  }

  const map: Record<string, typeof cards> = {}
  for (const c of cards) {
    ;(map[c.card_name] ??= []).push(c)
  }

  return Object.entries(map).map(([card_name, plays]) => {
    const times_played = plays.length
    const playerResults = plays
      .map(p => resultMap[p.game_id]?.[p.player_name])
      .filter(Boolean) as { total_vp: number; position: number }[]
    const wins = playerResults.filter(r => r.position === 1).length
    const vps = plays.filter(p => p.vp_from_card != null).map(p => p.vp_from_card!)
    const scores = playerResults.map(r => r.total_vp)
    const orders = plays.filter(p => p.card_order != null).map(p => p.card_order!)

    return {
      card_name,
      times_played,
      win_count: wins,
      win_rate: times_played > 0 ? (wins / times_played) * 100 : 0,
      avg_vp_contribution: vps.length > 0 ? vps.reduce((s, v) => s + v, 0) / vps.length : 0,
      avg_player_score: scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0,
      avg_card_order: orders.length > 0 ? orders.reduce((s, v) => s + v, 0) / orders.length : null,
    }
  })
}

export async function deleteGame(id: string): Promise<void> {
  // Delete children first in case CASCADE isn't configured
  await supabase.from('parameter_contributions').delete().eq('game_id', id)
  await supabase.from('game_milestones').delete().eq('game_id', id)
  await supabase.from('game_awards').delete().eq('game_id', id)
  await supabase.from('game_colonies').delete().eq('game_id', id)
  await supabase.from('game_expansions').delete().eq('game_id', id)
  await supabase.from('player_results').delete().eq('game_id', id)
  const { error } = await supabase.from('game_sessions').delete().eq('id', id)
  if (error) throw error
}

export interface PlayerCardStat {
  card_name: string
  times_played: number
  avg_vp: number | null
}

export interface GameCardEntry {
  player_name: string
  card_name: string
  card_order: number | null
  generation: number | null
  vp_from_card: number | null
}

export async function fetchGameCards(gameId: string): Promise<GameCardEntry[]> {
  const { data, error } = await supabase
    .from('cards_played')
    .select('player_name, card_name, card_order, generation, vp_from_card')
    .eq('game_id', gameId)
    .order('card_order', { ascending: true })
  if (error) throw error
  return data as GameCardEntry[]
}

export async function fetchAllGameCards(): Promise<(GameCardEntry & { game_id: string })[]> {
  const { data, error } = await supabase
    .from('cards_played')
    .select('game_id, player_name, card_name, card_order, generation, vp_from_card')
    .limit(10000)
  if (error) throw error
  return data as (GameCardEntry & { game_id: string })[]
}

export async function fetchCardEffectStatsGlobal(): Promise<CardEffectAggregateStat[]> {
  const [allCards, cardRef] = await Promise.all([fetchAllGameCards(), fetchCardReference()])
  const cardRefMap = Object.fromEntries(cardRef.map(c => [c.card_name.toLowerCase(), c]))
  const byGame: Record<string, typeof allCards> = {}
  for (const c of allCards) (byGame[c.game_id] ??= []).push(c)
  const perGame = Object.values(byGame).map(cards => evaluateCardEffects(cards, cardRefMap))
  return aggregateCardEffects(perGame)
}

export interface CardEffectEventStat {
  card_name: string
  event_type: string
  gamesPlayed: number
  totalAmount: number
  avgPerGame: number
  maxInGame: number
}

export interface GameCardEffectEvent {
  player_name: string
  card_name: string
  event_type: string
  amount: number
  generation: number | null
  event_order: number
  resource_type: string | null
  source_card: string | null
}

export async function fetchGameCardEffectEvents(gameId: string): Promise<GameCardEffectEvent[]> {
  const { data, error } = await supabase
    .from('card_effect_events')
    .select('player_name, card_name, event_type, amount, generation, event_order, resource_type, source_card')
    .eq('game_id', gameId)
    .order('event_order', { ascending: true })
  if (error) throw error
  return data as GameCardEffectEvent[]
}

// Cards whose 'resource_added' total needs grouping by trigger reason rather than by
// literal source card — e.g. Venusian Animals accumulates from *any* science-tag play,
// so those are bucketed together instead of listing every distinct science card.
export const RESOURCE_ADD_GROUP_TAG: Record<string, string> = {
  'Venusian Animals': 'Science',
  'Carbon Nanosystems': 'Science',
}

// Cards whose 'resource_removed' events represent a resource being spent for a fixed
// MC-equivalent value rather than a card action — e.g. Carbon Nanosystems' graphenes,
// spendable as 4 M€ each toward space/city tag cards.
export const RESOURCE_REMOVE_MC_VALUE: Record<string, number> = {
  'Carbon Nanosystems': 4,
}

export interface CardResourceRemovalStat {
  card_name: string
  gamesTriggered: number
  avgGained: number
  avgResourceTotal: number
  maxResourceTotal: number
  avgMcSaved: number
  maxMcSaved: number
}

// Only cards with an explicit MC-per-resource rate (RESOURCE_REMOVE_MC_VALUE) get an
// "MC saved" stat — other cards' resource_removed events don't represent a fixed-value
// spend (e.g. Red Spot Observatory's stray removal isn't a discount at all).
export async function fetchCardResourceRemovalStats(): Promise<CardResourceRemovalStat[]> {
  const discountCards = Object.keys(RESOURCE_REMOVE_MC_VALUE)
  if (discountCards.length === 0) return []

  const [{ data: removed, error: removedErr }, { data: added, error: addedErr }] = await Promise.all([
    supabase.from('card_effect_events').select('game_id, player_name, card_name, amount')
      .eq('event_type', 'resource_removed').in('card_name', discountCards).limit(10000),
    supabase.from('card_effect_events').select('game_id, player_name, card_name, amount')
      .eq('event_type', 'resource_added').in('card_name', discountCards).limit(10000),
  ])
  if (removedErr) throw removedErr
  if (addedErr) throw addedErr

  const removedByPlayInGame: Record<string, number> = {}
  for (const row of removed ?? []) {
    const key = `${row.card_name}::${row.game_id}::${row.player_name}`
    removedByPlayInGame[key] = (removedByPlayInGame[key] ?? 0) + row.amount
  }
  const addedByPlayInGame: Record<string, number> = {}
  for (const row of added ?? []) {
    const key = `${row.card_name}::${row.game_id}::${row.player_name}`
    addedByPlayInGame[key] = (addedByPlayInGame[key] ?? 0) + row.amount
  }

  const byCard: Record<string, { totals: number[]; gained: number[] }> = {}
  for (const [key, total] of Object.entries(removedByPlayInGame)) {
    const card_name = key.split('::')[0]
    const entry = (byCard[card_name] ??= { totals: [], gained: [] })
    entry.totals.push(total)
    entry.gained.push(addedByPlayInGame[key] ?? 0)
  }

  return Object.entries(byCard).map(([card_name, { totals, gained }]) => {
    const mcPer = RESOURCE_REMOVE_MC_VALUE[card_name]
    const mcValues = totals.map(t => t * mcPer)
    return {
      card_name,
      gamesTriggered: totals.length,
      avgGained: gained.reduce((s, v) => s + v, 0) / gained.length,
      avgResourceTotal: totals.reduce((s, v) => s + v, 0) / totals.length,
      maxResourceTotal: Math.max(...totals),
      avgMcSaved: mcValues.reduce((s, v) => s + v, 0) / mcValues.length,
      maxMcSaved: Math.max(...mcValues),
    }
  })
}

export interface CardResourceStat {
  card_name: string
  resource_type: string | null
  gamesTriggered: number
  avgResourceTotal: number
  maxResourceTotal: number
  avgVp: number
  maxVp: number
}

export async function fetchCardResourceStats(): Promise<CardResourceStat[]> {
  const [{ data, error }, cardRef] = await Promise.all([
    supabase
      .from('card_effect_events')
      .select('game_id, player_name, card_name, amount, resource_type')
      .eq('event_type', 'resource_added')
      .limit(10000),
    fetchCardReference(),
  ])
  if (error) throw error
  const cardRefMap = Object.fromEntries(cardRef.map(c => [c.card_name.toLowerCase(), c]))

  const byPlayInGame: Record<string, { total: number; resource_type: string | null }> = {}
  for (const row of data ?? []) {
    const key = `${row.card_name}::${row.game_id}::${row.player_name}`
    const entry = (byPlayInGame[key] ??= { total: 0, resource_type: row.resource_type })
    entry.total += row.amount
  }

  const byCard: Record<string, { totals: number[]; resource_type: string | null }> = {}
  for (const [key, { total, resource_type }] of Object.entries(byPlayInGame)) {
    const card_name = key.split('::')[0]
    const entry = (byCard[card_name] ??= { totals: [], resource_type })
    entry.totals.push(total)
  }

  return Object.entries(byCard)
    // Only cards that actually convert this resource into VP — e.g. Red Spot
    // Observatory's floaters just enable a draw action, no VP tied to the count.
    .filter(([card_name]) => cardRefMap[card_name.toLowerCase()]?.resource_vp_type != null)
    .map(([card_name, { totals, resource_type }]) => {
      const vpPer = cardRefMap[card_name.toLowerCase()]?.resource_vp_per ?? 1
      // VP is always floored — there's no such thing as half a VP.
      const vps = totals.map(t => Math.floor(t / vpPer))
      return {
        card_name,
        resource_type,
        gamesTriggered: totals.length,
        avgResourceTotal: totals.reduce((s, v) => s + v, 0) / totals.length,
        maxResourceTotal: Math.max(...totals),
        avgVp: vps.reduce((s, v) => s + v, 0) / vps.length,
        maxVp: Math.max(...vps),
      }
    })
}

export async function fetchCardEffectEventStats(): Promise<CardEffectEventStat[]> {
  const { data, error } = await supabase
    .from('card_effect_events')
    .select('game_id, card_name, event_type, amount')
    .limit(10000)
  if (error) throw error

  const byCardType: Record<string, { perGame: Record<string, number> }> = {}
  for (const row of data) {
    const key = `${row.card_name}::${row.event_type}`
    byCardType[key] ??= { perGame: {} }
    byCardType[key].perGame[row.game_id] = (byCardType[key].perGame[row.game_id] ?? 0) + row.amount
  }
  return Object.entries(byCardType).map(([key, { perGame }]) => {
    const [card_name, event_type] = key.split('::')
    const totals = Object.values(perGame)
    return {
      card_name, event_type,
      gamesPlayed: totals.length,
      totalAmount: totals.reduce((s, v) => s + v, 0),
      avgPerGame: totals.reduce((s, v) => s + v, 0) / totals.length,
      maxInGame: Math.max(...totals),
    }
  })
}

export async function fetchPlayerCardStats(playerName: string): Promise<PlayerCardStat[]> {
  const { data, error } = await supabase
    .from('cards_played')
    .select('card_name, vp_from_card')
    .eq('player_name', playerName)
  if (error) throw error
  if (!data || data.length === 0) return []

  const map: Record<string, { count: number; vps: number[] }> = {}
  for (const row of data) {
    if (!map[row.card_name]) map[row.card_name] = { count: 0, vps: [] }
    map[row.card_name].count++
    if (row.vp_from_card != null) map[row.card_name].vps.push(row.vp_from_card)
  }

  return Object.entries(map)
    .map(([card_name, { count, vps }]) => ({
      card_name,
      times_played: count,
      avg_vp: vps.length > 0 ? vps.reduce((s, v) => s + v, 0) / vps.length : null,
    }))
    .sort((a, b) => b.times_played - a.times_played || a.card_name.localeCompare(b.card_name))
}

export interface CardPlay {
  game_id: string
  player_name: string
  vp_from_card: number | null
}

export async function fetchCardPlays(cardName: string): Promise<CardPlay[]> {
  const { data, error } = await supabase
    .from('cards_played')
    .select('game_id, player_name, vp_from_card')
    .eq('card_name', cardName)
  if (error) throw error
  return (data ?? []) as CardPlay[]
}

export async function fetchPlayerProfiles(): Promise<PlayerProfile[]> {
  const { data, error } = await supabase
    .from('player_profiles')
    .select('*')
  if (error) throw error
  return data as PlayerProfile[]
}

export interface GameMilestoneEntry {
  milestone_name: string
  player_name: string | null
  claimed_order: number | null
}

export interface GameAwardEntry {
  award_name: string
  funded_order: number | null
  funder_name: string | null
  winner_name: string | null
  winner_name_2: string | null
  second_name: string | null
  second_name_2: string | null
}

export async function fetchGameMilestones(gameId: string): Promise<GameMilestoneEntry[]> {
  const { data, error } = await supabase
    .from('game_milestones')
    .select('milestone_name, player_name, claimed_order')
    .eq('game_id', gameId)
  if (error) throw error

  type RawRow = { milestone_name: string; player_name: string | null; claimed_order: number | null }
  // Merge: prefer claimed (non-null player) over config entry (null player)
  const map = new Map<string, { player_name: string | null; claimed_order: number | null }>()
  for (const row of data as RawRow[]) {
    if (!map.has(row.milestone_name) || row.player_name !== null) {
      map.set(row.milestone_name, { player_name: row.player_name, claimed_order: row.claimed_order })
    }
  }
  return Array.from(map.entries()).map(([milestone_name, { player_name, claimed_order }]) => ({
    milestone_name, player_name, claimed_order,
  }))
}

export async function fetchGameAwards(gameId: string): Promise<GameAwardEntry[]> {
  const { data, error } = await supabase
    .from('game_awards')
    .select('award_name, player_name, funded_order, winner_name, winner_name_2, second_name, second_name_2')
    .eq('game_id', gameId)
    .order('funded_order', { ascending: true, nullsFirst: false })
  if (error) throw error

  type RawRow = {
    award_name: string; player_name: string | null; funded_order: number | null
    winner_name: string | null; winner_name_2: string | null
    second_name: string | null; second_name_2: string | null
  }
  const map = new Map<string, Omit<GameAwardEntry, 'award_name'>>()
  for (const row of data as RawRow[]) {
    if (!map.has(row.award_name)) {
      map.set(row.award_name, {
        funder_name: row.player_name, funded_order: row.funded_order,
        winner_name: row.winner_name, winner_name_2: row.winner_name_2,
        second_name: row.second_name, second_name_2: row.second_name_2,
      })
    } else {
      const e = map.get(row.award_name)!
      if (row.player_name)   e.funder_name   = row.player_name
      if (row.funded_order)  e.funded_order  = row.funded_order
      if (row.winner_name)   e.winner_name   = row.winner_name
      if (row.winner_name_2) e.winner_name_2 = row.winner_name_2
      if (row.second_name)   e.second_name   = row.second_name
      if (row.second_name_2) e.second_name_2 = row.second_name_2
    }
  }
  return Array.from(map.entries()).map(([award_name, rest]) => ({ award_name, ...rest }))
}

export async function fetchAllMilestones(): Promise<{ milestone_name: string; player_name: string | null; game_id: string }[]> {
  const { data, error } = await supabase
    .from('game_milestones')
    .select('milestone_name, player_name, game_id')
  if (error) throw error
  return data as { milestone_name: string; player_name: string | null; game_id: string }[]
}

export async function fetchAllAwards(): Promise<{ award_name: string; funder_name: string | null; game_id: string }[]> {
  const { data, error } = await supabase
    .from('game_awards')
    .select('award_name, player_name, game_id')
  if (error) throw error
  return (data as { award_name: string; player_name: string | null; game_id: string }[])
    .map(r => ({ award_name: r.award_name, funder_name: r.player_name, game_id: r.game_id }))
}

export interface CEOStat {
  ceo_name: string
  times_played: number
  wins: number
  win_rate: number
  avg_score: number
  best_score: number
}

export async function fetchCEOStats(): Promise<CEOStat[]> {
  const { data, error } = await supabase
    .from('player_results')
    .select('ceo, position, total_vp')
    .not('ceo', 'is', null)
  if (error) throw error
  if (!data || data.length === 0) return []

  const map: Record<string, { count: number; wins: number; vps: number[] }> = {}
  for (const r of data as { ceo: string; position: number; total_vp: number }[]) {
    if (!map[r.ceo]) map[r.ceo] = { count: 0, wins: 0, vps: [] }
    map[r.ceo].count++
    map[r.ceo].vps.push(r.total_vp)
    if (r.position === 1) map[r.ceo].wins++
  }

  return Object.entries(map)
    .map(([ceo_name, { count, wins, vps }]) => ({
      ceo_name,
      times_played: count,
      wins,
      win_rate: (wins / count) * 100,
      avg_score: vps.reduce((s, v) => s + v, 0) / vps.length,
      best_score: Math.max(...vps),
    }))
    .sort((a, b) => b.times_played - a.times_played || a.ceo_name.localeCompare(b.ceo_name))
}

export interface MergerStat {
  combo: string       // e.g. "Arklight + Inventrix" (sorted alphabetically)
  corp1: string
  corp2: string
  corps: string[]     // all corps sorted (supports 3+)
  games_played: number
  wins: number
  win_rate: number
  avg_score: number
  best_score: number
}

export async function fetchMergerStats(): Promise<MergerStat[]> {
  const { data, error } = await supabase
    .from('player_results')
    .select('corporation, second_corporation, corporations, total_vp, position')
  if (error) throw error
  if (!data || data.length === 0) return []

  const map: Record<string, { vp: number; pos: number; corps: string[] }[]> = {}
  for (const r of data as { corporation: string; second_corporation: string | null; corporations: string[] | null; total_vp: number; position: number }[]) {
    const corps: string[] = r.corporations?.length ? r.corporations : [r.corporation, r.second_corporation].filter(Boolean) as string[]
    if (corps.length < 2) continue  // skip non-merger rows
    const key = [...corps].sort().join(' + ')
    ;(map[key] ??= []).push({ vp: r.total_vp, pos: r.position, corps })
  }

  return Object.entries(map).map(([combo, rows]) => {
    const corps = [...rows[0].corps].sort()
    const wins = rows.filter(r => r.pos === 1).length
    const vps = rows.map(r => r.vp)
    return {
      combo,
      corp1: corps[0],
      corp2: corps[1],
      corps,
      games_played: rows.length,
      wins,
      win_rate: (wins / rows.length) * 100,
      avg_score: vps.reduce((s, v) => s + v, 0) / vps.length,
      best_score: Math.max(...vps),
    }
  }).sort((a, b) => b.games_played - a.games_played || a.combo.localeCompare(b.combo))
}

export async function fetchCardReference(): Promise<CardReference[]> {
  const { data, error } = await supabase
    .from('card_reference')
    .select('*, card_expansions(expansion)')
    .order('card_name')
  if (error) throw error
  return (data as any[]).map(c => ({
    ...c,
    expansions: (c.card_expansions ?? []).map((e: { expansion: string }) => normalizeExpansion(e.expansion)),
  })) as CardReference[]
}

// ── Site notes ────────────────────────────────────────────────────────────────

export type NoteCategory = 'in_progress' | 'todo' | 'done'

export interface SiteNote {
  id: string
  category: NoteCategory
  content: string
  created_at: string
}

export async function fetchNotes(): Promise<SiteNote[]> {
  const { data, error } = await supabase
    .from('site_notes')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as SiteNote[]
}

export async function addNote(category: NoteCategory, content: string): Promise<void> {
  const { error } = await supabase.from('site_notes').insert({ category, content })
  if (error) throw error
}

export async function updateNote(id: string, patch: Partial<Pick<SiteNote, 'category' | 'content'>>): Promise<void> {
  const { error } = await supabase.from('site_notes').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('site_notes').delete().eq('id', id)
  if (error) throw error
}

// ── Tournaments ────────────────────────────────────────────────────────────
// A tournament match is recorded directly (placement + TR + milestone/award
// counts per player) rather than through the full game_sessions/player_results
// flow — see tournamentRules.ts for the scoring and pairing math. Pairings are
// persisted the moment they're generated (createRoundMatches) so a round can
// never be silently reshuffled; only saveMatchResults touches results after
// that, and it can be called again to correct a mistake.

export interface Tournament {
  id: string
  name: string
  status: 'qualifying' | 'final' | 'completed'
  created_at: string
}

export interface TournamentStanding {
  player_name: string
  tp: number
  games_played: number
  active: boolean
  /** This player's tp earned in each completed qualifying round, in round order — used to break ties. */
  roundTp: number[]
}

export interface TournamentMatchPlayer {
  player_name: string
  position: number | null
  milestones_claimed: number
  awards_won: number
}

export interface TournamentMatch {
  id: string
  round: number
  players: TournamentMatchPlayer[]
}

export interface TournamentPlayerEntry {
  player_name: string
  active: boolean
}

export async function fetchTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Tournament[]
}

export async function fetchTournament(id: string): Promise<Tournament> {
  const { data, error } = await supabase.from('tournaments').select('*').eq('id', id).single()
  if (error) throw error
  return data as Tournament
}

export async function updateTournamentStatus(id: string, status: Tournament['status']): Promise<void> {
  const { error } = await supabase.from('tournaments').update({ status }).eq('id', id)
  if (error) throw error
}

export async function deleteTournament(id: string): Promise<void> {
  const { error } = await supabase.from('tournaments').delete().eq('id', id)
  if (error) throw error
}

export async function createTournament(name: string, playerNames: string[]): Promise<string> {
  const { data, error } = await supabase.from('tournaments').insert({ name }).select('id').single()
  if (error) throw error
  const tournamentId = (data as { id: string }).id

  const rows = playerNames.map(player_name => ({ tournament_id: tournamentId, player_name }))
  const { error: playersError } = await supabase.from('tournament_players').insert(rows)
  if (playersError) throw playersError

  return tournamentId
}

export async function fetchTournamentPlayers(tournamentId: string): Promise<TournamentPlayerEntry[]> {
  const { data, error } = await supabase
    .from('tournament_players')
    .select('player_name, active')
    .eq('tournament_id', tournamentId)
  if (error) throw error
  return data as TournamentPlayerEntry[]
}

/** Excludes a withdrawn player from future round pairings — already-recorded results are untouched. */
export async function setTournamentPlayerActive(tournamentId: string, playerName: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from('tournament_players')
    .update({ active })
    .eq('tournament_id', tournamentId)
    .eq('player_name', playerName)
  if (error) throw error
}

/**
 * Fixes a typo'd player name — updates the roster entry and every match row
 * they've already been recorded in, so past results and standings stay
 * attributed to the corrected name instead of forking into two players.
 */
export async function renameTournamentPlayer(tournamentId: string, oldName: string, newName: string): Promise<void> {
  const trimmed = newName.trim()
  if (!trimmed || trimmed === oldName) return

  const players = await fetchTournamentPlayers(tournamentId)
  if (players.some(p => p.player_name === trimmed)) {
    throw new Error(`${trimmed} is already in this tournament.`)
  }

  const { error: playerError } = await supabase
    .from('tournament_players')
    .update({ player_name: trimmed })
    .eq('tournament_id', tournamentId)
    .eq('player_name', oldName)
  if (playerError) throw playerError

  const matchIds = (await fetchTournamentMatches(tournamentId)).map(m => m.id)
  if (matchIds.length > 0) {
    const { error: matchPlayerError } = await supabase
      .from('tournament_match_players')
      .update({ player_name: trimmed })
      .in('match_id', matchIds)
      .eq('player_name', oldName)
    if (matchPlayerError) throw matchPlayerError
  }
}

export async function fetchTournamentMatches(tournamentId: string): Promise<TournamentMatch[]> {
  const { data, error } = await supabase
    .from('tournament_matches')
    .select('id, round, tournament_match_players(player_name, position, milestones_claimed, awards_won)')
    .eq('tournament_id', tournamentId)
    .order('round', { ascending: true })
  if (error) throw error

  type RawRow = { id: string; round: number; tournament_match_players: TournamentMatchPlayer[] }
  return (data as unknown as RawRow[]).map(m => ({
    id: m.id,
    round: m.round,
    players: m.tournament_match_players,
  }))
}

async function fetchActivePlayerNames(tournamentId: string): Promise<Set<string>> {
  const players = await fetchTournamentPlayers(tournamentId)
  return new Set(players.filter(p => p.active).map(p => p.player_name))
}

/**
 * Generates and immediately persists the pairings for a round — round 1 is
 * random, rounds 2-3 group players with similar standings, and round 99 (the
 * final) takes the qualifying finalists. Withdrawn players are excluded.
 * Throws if the round already has matches, since pairings are never
 * reshuffled once created.
 */
export async function createRoundMatches(tournamentId: string, round: 1 | 2 | 3 | 99): Promise<void> {
  const existing = await fetchTournamentMatches(tournamentId)
  if (existing.some(m => m.round === round)) {
    throw new Error(`Round ${round === 99 ? 'Final' : round} already has pairings — edit results instead of regenerating.`)
  }

  const activeNames = await fetchActivePlayerNames(tournamentId)

  let groups: string[][]
  if (round === 1) {
    groups = pairRandomRound([...activeNames])
  } else if (round === 99) {
    groups = [await fetchTournamentFinalists(tournamentId)]
  } else {
    const standings = (await fetchTournamentStandings(tournamentId)).filter(s => activeNames.has(s.player_name))
    groups = pairByStandings(standings)
  }

  for (const group of groups) {
    const { data, error } = await supabase
      .from('tournament_matches')
      .insert({ tournament_id: tournamentId, round })
      .select('id')
      .single()
    if (error) throw error
    const matchId = (data as { id: string }).id

    const rows = group.map(player_name => ({ match_id: matchId, player_name }))
    const { error: playersError } = await supabase.from('tournament_match_players').insert(rows)
    if (playersError) throw playersError
  }
}

/**
 * Deletes a round's pairings so they can be regenerated — e.g. round 2 was
 * paired using round 1 standings, then a mistake in round 1 got corrected
 * afterward. Only allowed while the round is untouched (no player in any of
 * its matches has a recorded position yet); once a table has been played,
 * its pairing is permanent.
 */
export async function deleteRoundMatches(tournamentId: string, round: number): Promise<void> {
  const matches = (await fetchTournamentMatches(tournamentId)).filter(m => m.round === round)
  if (matches.some(m => m.players.some(p => p.position != null))) {
    throw new Error('This round already has recorded results — it can no longer be regenerated.')
  }

  const { error } = await supabase
    .from('tournament_matches')
    .delete()
    .eq('tournament_id', tournamentId)
    .eq('round', round)
  if (error) throw error
}

/** Saves (or re-saves) a match's results — safe to call again to correct a mistake. */
export async function saveMatchResults(matchId: string, results: TournamentMatchPlayer[]): Promise<void> {
  for (const r of results) {
    const { error } = await supabase
      .from('tournament_match_players')
      .update({
        position: r.position,
        milestones_claimed: r.milestones_claimed,
        awards_won: r.awards_won,
      })
      .eq('match_id', matchId)
      .eq('player_name', r.player_name)
    if (error) throw error
  }
}

export async function fetchTournamentStandings(tournamentId: string): Promise<TournamentStanding[]> {
  const [matches, activeNames] = await Promise.all([
    fetchTournamentMatches(tournamentId),
    fetchActivePlayerNames(tournamentId),
  ])

  // tp per player per round, so ties can be broken by standing before the
  // round that produced them instead of arbitrarily — see compareStandings.
  const roundTpByPlayer = new Map<string, Map<number, number>>()
  for (const match of matches) {
    if (match.round < 1 || match.round > 3) continue // only qualifying rounds count toward standings
    const playerCount = match.players.length
    if (playerCount !== 3 && playerCount !== 4) continue

    for (const p of match.players) {
      if (p.position == null) continue // result not recorded yet

      const tp = basePoints(p.position, playerCount) + milestoneAwardBonus(p.milestones_claimed, p.awards_won)
      const perRound = roundTpByPlayer.get(p.player_name) ?? new Map<number, number>()
      perRound.set(match.round, (perRound.get(match.round) ?? 0) + tp)
      roundTpByPlayer.set(p.player_name, perRound)
    }
  }

  const standings: TournamentStanding[] = []
  for (const [player_name, perRound] of roundTpByPlayer) {
    const rounds = [...perRound.keys()].sort((a, b) => a - b)
    const roundTp = rounds.map(r => perRound.get(r)!)
    standings.push({
      player_name,
      tp: roundTp.reduce((sum, v) => sum + v, 0),
      games_played: rounds.length,
      active: activeNames.has(player_name),
      roundTp,
    })
  }

  return standings.sort(compareStandings)
}

export async function fetchTournamentFinalists(tournamentId: string): Promise<string[]> {
  const [standings, activeNames] = await Promise.all([
    fetchTournamentStandings(tournamentId),
    fetchActivePlayerNames(tournamentId),
  ])
  return determineFinalists(standings.filter(s => activeNames.has(s.player_name)))
}

