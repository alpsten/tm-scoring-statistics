import { supabase } from './supabase'
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
  }>
  game_expansions: Array<{ expansion_name: string }>
  game_colonies: Array<{ colony_name: string }>
  turn_order: string[] | null
}

function mapGame(raw: RawGame): GameWithResults {
  return {
    ...raw,
    expansions: raw.game_expansions.map(e => e.expansion_name),
    colonies: raw.game_colonies.map(c => c.colony_name),
    parameter_contributions: raw.parameter_contributions ?? [],
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
    .select('corporation, total_vp, position')
  if (error) throw error

  const map: Record<string, { vp: number; pos: number }[]> = {}
  for (const r of data!) {
    ;(map[r.corporation] ??= []).push({ vp: r.total_vp, pos: r.position })
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
}

export async function fetchCEOStats(): Promise<CEOStat[]> {
  const { data, error } = await supabase
    .from('player_results')
    .select('ceo, position')
    .not('ceo', 'is', null)
  if (error) throw error
  if (!data || data.length === 0) return []

  const map: Record<string, { count: number; wins: number }> = {}
  for (const r of data as { ceo: string; position: number }[]) {
    if (!map[r.ceo]) map[r.ceo] = { count: 0, wins: 0 }
    map[r.ceo].count++
    if (r.position === 1) map[r.ceo].wins++
  }

  return Object.entries(map)
    .map(([ceo_name, { count, wins }]) => ({
      ceo_name,
      times_played: count,
      wins,
      win_rate: (wins / count) * 100,
    }))
    .sort((a, b) => b.times_played - a.times_played || a.ceo_name.localeCompare(b.ceo_name))
}

export async function fetchCardReference(): Promise<CardReference[]> {
  const { data, error } = await supabase
    .from('card_reference')
    .select('*, card_expansions(expansion)')
    .order('card_name')
  if (error) throw error
  return (data as any[]).map(c => ({
    ...c,
    expansions: (c.card_expansions ?? []).map((e: { expansion: string }) => e.expansion),
  })) as CardReference[]
}
