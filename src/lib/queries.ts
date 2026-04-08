import { supabase } from './supabase'
import type { GameWithResults, PlayerStats, CorporationStats, CardStats, CardReference } from '../types/database'

// ── Raw shape returned by Supabase nested selects ─────────────────────────────

interface RawGame {
  id: string
  date: string
  player_count: number
  generations: number | null
  map_name: string | null
  notes: string | null
  game_code: string | null
  created_at: string
  parameter_contributions?: Array<{
    id: string
    game_id: string
    player_name: string
    oxygen_steps: number
    temperature_steps: number
    ocean_steps: number
    venus_steps: number
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
  }>
  game_expansions: Array<{ expansion_name: string }>
  game_colonies: Array<{ colony_name: string }>
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
  await supabase.from('game_colonies').delete().eq('game_id', id)
  await supabase.from('game_expansions').delete().eq('game_id', id)
  await supabase.from('player_results').delete().eq('game_id', id)
  const { error } = await supabase.from('game_sessions').delete().eq('id', id)
  if (error) throw error
}

export async function fetchCardReference(): Promise<CardReference[]> {
  const { data, error } = await supabase
    .from('card_reference')
    .select('*')
    .order('card_name')
  if (error) throw error
  return data as CardReference[]
}
