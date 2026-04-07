// ─── Mock data for development / before Supabase is connected ─────────────────
// Replace calls to these with real Supabase queries once credentials are set up.

import type { GameWithResults, PlayerStats, CorporationStats, CardStats } from '../types/database'

export const MOCK_GAMES: GameWithResults[] = [
  {
    id: 'G001',
    date: '2026-03-28',
    player_count: 3,
    generations: 12,
    map_name: 'Tharsis',
    notes: null,
    game_code: 'TM-2026-001',
    created_at: '2026-03-28T20:00:00Z',
    expansions: ['Prelude', 'Colonies'],
    colonies: ["Ceres", "Europa", "Ganymede"], parameter_contributions: [],
    player_results: [
      { id: 'PR001', game_id: 'G001', player_name: 'Emil', corporation: 'Helion', tr: 32, milestone_vp: 5, award_vp: 5, greenery_vp: 8, city_vp: 6, card_vp: 14, habitat_vp: null, logistics_vp: null, mining_vp: null, plantery_vp: null, mc: null, total_vp: 70, position: 1, key_notes: 'Heat engine, space strategy' },
      { id: 'PR002', game_id: 'G001', player_name: 'Alex', corporation: 'Ecoline', tr: 28, milestone_vp: 5, award_vp: 0, greenery_vp: 14, city_vp: 4, card_vp: 8, habitat_vp: null, logistics_vp: null, mining_vp: null, plantery_vp: null, mc: null, total_vp: 59, position: 2, key_notes: 'Plant engine' },
      { id: 'PR003', game_id: 'G001', player_name: 'Sara', corporation: 'Interplanetary Cinematics', tr: 25, milestone_vp: 0, award_vp: 5, greenery_vp: 4, city_vp: 2, card_vp: 20, habitat_vp: null, logistics_vp: null, mining_vp: null, plantery_vp: null, mc: null, total_vp: 56, position: 3, key_notes: 'Steel/card engine' },
    ],
  },
  {
    id: 'G002',
    date: '2026-03-14',
    player_count: 4,
    generations: 14,
    map_name: 'Elysium',
    notes: 'First time with Turmoil',
    game_code: 'TM-2026-002',
    created_at: '2026-03-14T19:30:00Z',
    expansions: ['Prelude', 'Turmoil', 'Venus Next'],
    colonies: [], parameter_contributions: [],
    player_results: [
      { id: 'PR004', game_id: 'G002', player_name: 'Sara', corporation: 'Teractor', tr: 35, milestone_vp: 5, award_vp: 5, greenery_vp: 6, city_vp: 8, card_vp: 12, habitat_vp: null, logistics_vp: null, mining_vp: null, plantery_vp: null, mc: null, total_vp: 71, position: 1, key_notes: 'Earth discount engine' },
      { id: 'PR005', game_id: 'G002', player_name: 'Emil', corporation: 'Point Luna', tr: 30, milestone_vp: 5, award_vp: 0, greenery_vp: 8, city_vp: 6, card_vp: 16, habitat_vp: null, logistics_vp: null, mining_vp: null, plantery_vp: null, mc: null, total_vp: 65, position: 2, key_notes: 'Earth/draw engine' },
      { id: 'PR006', game_id: 'G002', player_name: 'Marcus', corporation: 'Mons Insurance', tr: 28, milestone_vp: 0, award_vp: 5, greenery_vp: 4, city_vp: 4, card_vp: 18, habitat_vp: null, logistics_vp: null, mining_vp: null, plantery_vp: null, mc: null, total_vp: 59, position: 3, key_notes: null },
      { id: 'PR007', game_id: 'G002', player_name: 'Alex', corporation: 'Arklight', tr: 25, milestone_vp: 0, award_vp: 0, greenery_vp: 10, city_vp: 2, card_vp: 10, habitat_vp: null, logistics_vp: null, mining_vp: null, plantery_vp: null, mc: null, total_vp: 47, position: 4, key_notes: 'Animal engine, slow start' },
    ],
  },
  {
    id: 'G003',
    date: '2026-02-22',
    player_count: 2,
    generations: 10,
    map_name: 'Tharsis',
    notes: null,
    game_code: 'TM-2026-003',
    created_at: '2026-02-22T18:00:00Z',
    expansions: ['Prelude', 'Prelude 2'],
    colonies: [], parameter_contributions: [],
    player_results: [
      { id: 'PR008', game_id: 'G003', player_name: 'Emil', corporation: 'Credicor', tr: 38, milestone_vp: 5, award_vp: 5, greenery_vp: 10, city_vp: 8, card_vp: 10, habitat_vp: null, logistics_vp: null, mining_vp: null, plantery_vp: null, mc: null, total_vp: 76, position: 1, key_notes: 'Megacredit engine, fast terraforming' },
      { id: 'PR009', game_id: 'G003', player_name: 'Alex', corporation: 'Mining Guild', tr: 33, milestone_vp: 5, award_vp: 0, greenery_vp: 8, city_vp: 4, card_vp: 14, habitat_vp: null, logistics_vp: null, mining_vp: null, plantery_vp: null, mc: null, total_vp: 64, position: 2, key_notes: 'Steel focus' },
    ],
  },
]

export const MOCK_PLAYER_STATS: PlayerStats[] = [
  { player_name: 'Emil',   games_played: 3, wins: 2, win_rate: 66.7, avg_score: 70.3, best_score: 76, avg_position: 1.3 },
  { player_name: 'Sara',   games_played: 2, wins: 1, win_rate: 50.0, avg_score: 63.5, best_score: 71, avg_position: 1.5 },
  { player_name: 'Alex',   games_played: 3, wins: 0, win_rate: 0.0,  avg_score: 56.7, best_score: 64, avg_position: 2.7 },
  { player_name: 'Marcus', games_played: 1, wins: 0, win_rate: 0.0,  avg_score: 59.0, best_score: 59, avg_position: 3.0 },
]

export const MOCK_CORP_STATS: CorporationStats[] = [
  { corporation: 'Credicor',                  games_played: 1, wins: 1, win_rate: 100, avg_score: 76, best_score: 76 },
  { corporation: 'Teractor',                  games_played: 1, wins: 1, win_rate: 100, avg_score: 71, best_score: 71 },
  { corporation: 'Helion',                    games_played: 1, wins: 1, win_rate: 100, avg_score: 70, best_score: 70 },
  { corporation: 'Point Luna',                games_played: 1, wins: 0, win_rate: 0,   avg_score: 65, best_score: 65 },
  { corporation: 'Mons Insurance',            games_played: 1, wins: 0, win_rate: 0,   avg_score: 59, best_score: 59 },
  { corporation: 'Ecoline',                   games_played: 1, wins: 0, win_rate: 0,   avg_score: 59, best_score: 59 },
  { corporation: 'Mining Guild',              games_played: 1, wins: 0, win_rate: 0,   avg_score: 64, best_score: 64 },
  { corporation: 'Interplanetary Cinematics', games_played: 1, wins: 0, win_rate: 0,   avg_score: 56, best_score: 56 },
  { corporation: 'Arklight',                  games_played: 1, wins: 0, win_rate: 0,   avg_score: 47, best_score: 47 },
]

export const MOCK_CARD_STATS: CardStats[] = [
  { card_name: 'AI Central',          times_played: 3, avg_player_score: 65, win_count: 2, win_rate: 66.7, avg_vp_contribution: 1, avg_card_order: 8 },
  { card_name: 'Ganymede Colony',     times_played: 4, avg_player_score: 62, win_count: 2, win_rate: 50.0, avg_vp_contribution: 2, avg_card_order: 12 },
  { card_name: 'Search for Life',     times_played: 2, avg_player_score: 68, win_count: 2, win_rate: 100,  avg_vp_contribution: 3, avg_card_order: 4 },
  { card_name: 'Pets',                times_played: 3, avg_player_score: 61, win_count: 1, win_rate: 33.3, avg_vp_contribution: 4, avg_card_order: 10 },
  { card_name: 'Physics Complex',     times_played: 2, avg_player_score: 59, win_count: 1, win_rate: 50.0, avg_vp_contribution: 4, avg_card_order: 15 },
]
