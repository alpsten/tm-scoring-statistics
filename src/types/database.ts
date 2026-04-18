// ─── Core domain types matching the database schema ───────────────────────────

export interface GameSession {
  id: string
  game_number: number | null
  date: string          // ISO date string
  player_count: number
  generations: number | null
  map_name: string | null
  notes: string | null
  format: 'Physical' | 'Digital' | null
  turn_order: string[] | null
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
  plantery_vp: number | null  // Moon expansion (planetary)
  mc: number | null           // MegaCredits at game end
  total_vp: number
  position: number
  key_notes: string | null
  ceo: string | null
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

export interface ParameterContribution {
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
}

export interface CardPlayed {
  id: string
  game_id: string
  player_name: string
  card_order: number | null
  card_name: string
  vp_from_card: number | null
  notes: string | null
  generation: number | null
}

export interface GameMilestone {
  id: string
  game_id: string
  player_name: string
  milestone_name: string
}

export interface GameAward {
  id: string
  game_id: string
  player_name: string
  award_name: string
}

export interface CardReference {
  id: string
  card_name: string
  tags: string | null             // Comma-separated, alphabetical: "Animal, Microbe"
  card_type: 'Automated' | 'Active' | 'Event' | 'Prelude' | 'Corporation' | 'CEO'
  expansions: string[]     // from card_expansions junction table
  card_text: string | null
  base_vp: number | null
  resource_vp_type: string | null // Resource type that generates VP, e.g. "Floater", "Animal"
  resource_vp_per: number | null  // Resources needed per 1 VP, e.g. 2 = "1 VP per 2 resources"
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
  parameter_contributions: ParameterContribution[]
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
  map_name: string | null
  notes: string
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
  plantery_vp: number | null
  mc: number | null
  total_vp: number
  position: number
  key_notes: string
}

export interface CardPlayedInput {
  card_name: string
  vp_from_card: number | null
  card_order: number | null
  notes: string
}

export interface PlayerProfile {
  player_name: string
  preferred_color: string | null
  trivia: string | null
  favorite_card: string | null
  most_tilting_card: string | null
  playing_style: string | null
  rival: string | null
}
