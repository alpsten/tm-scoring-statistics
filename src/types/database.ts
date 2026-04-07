// ─── Core domain types matching the database schema ───────────────────────────

export interface GameSession {
  id: string
  date: string          // ISO date string
  player_count: number
  generations: number | null
  map_name: string
  notes: string | null
  game_code: string | null
  created_at: string
}

export interface PlayerResult {
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
  habitat_vp: number | null   // Moon expansion
  logistics_vp: number | null // Moon expansion
  mining_vp: number | null    // Moon expansion
  total_vp: number
  position: number
  key_notes: string | null
}

export interface GameExpansion {
  id: string
  game_id: string
  expansion_name: string
}

export interface GameColony {
  id: string
  game_id: string
  colony_name: string
}

export interface CardPlayed {
  id: string
  game_id: string
  player_name: string
  card_order: number | null
  card_name: string
  vp_from_card: number
  notes: string | null
}

export interface CardReference {
  id: string
  card_name: string
  tags: string | null         // Comma-separated, alphabetical: "Animal, Microbe"
  card_type: 'Automated' | 'Active' | 'Event'
  expansion: string | null
  base_vp: number | null
}

// ─── Reference / lookup types ─────────────────────────────────────────────────

export type ReferenceType =
  | 'player'
  | 'corporation'
  | 'map'
  | 'expansion'
  | 'colony'

export interface ReferenceItem {
  id: string
  list_type: ReferenceType
  value: string
}

// ─── Joined / computed types used in the UI ──────────────────────────────────

export interface GameWithResults extends GameSession {
  player_results: PlayerResult[]
  expansions: string[]
  colonies: string[]
}

export interface PlayerStats {
  player_name: string
  games_played: number
  wins: number
  win_rate: number
  avg_score: number
  best_score: number
  avg_position: number
}

export interface CorporationStats {
  corporation: string
  games_played: number
  wins: number
  win_rate: number
  avg_score: number
  best_score: number
}

export interface CardStats {
  card_name: string
  times_played: number
  avg_player_score: number
  win_count: number
  win_rate: number
  avg_vp_contribution: number
  avg_card_order: number | null
}

// ─── Form input types ─────────────────────────────────────────────────────────

export interface GameSessionInput {
  date: string
  player_count: number
  generations: number | null
  map_name: string
  notes: string
  game_code: string
  expansions: string[]
  colonies: string[]
}

export interface PlayerResultInput {
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
  total_vp: number
  position: number
  key_notes: string
}

export interface CardPlayedInput {
  card_name: string
  vp_from_card: number
  card_order: number | null
  notes: string
}
