export const ALL_MAPS = [
  'Tharsis', 'Hellas', 'Elysium', 'Arabia Terra',
  'Amazonis Planitia', 'Terra Cimmeria', 'Vastitas Borealis', 'Utopia Planitia',
]

export const ALL_EXPANSIONS = [
  'Ares', 'CEO', 'Colonies', 'Moon', 'Pathfinders',
  'Prelude', 'Prelude 2', 'Promos', 'Turmoil', 'Venus Next',
]

export const EXPANSION_ICONS: Record<string, string> = {
  'Ares':        '/tm-scoring-statistics/expansions/expansion_icon_ares.png',
  'CEO':         '/tm-scoring-statistics/expansions/expansion_icon_ceo.png',
  'Colonies':    '/tm-scoring-statistics/expansions/expansion_icon_colonies.png',
  'Pathfinders': '/tm-scoring-statistics/expansions/expansion_icon_pathfinders.png',
  'Prelude':     '/tm-scoring-statistics/expansions/expansion_icon_prelude.png',
  'Prelude 2':   '/tm-scoring-statistics/expansions/expansion_icon_prelude2.png',
  'Promos':      '/tm-scoring-statistics/expansions/expansion_icon_promo.png',
  'Moon':        '/tm-scoring-statistics/expansions/expansion_icon_themoon.png',
  'The Moon':    '/tm-scoring-statistics/expansions/expansion_icon_themoon.png',
  'Turmoil':     '/tm-scoring-statistics/expansions/expansion_icon_turmoil.png',
  'Venus':       '/tm-scoring-statistics/expansions/expansion_icon_venus.png',
  'Venus Next':  '/tm-scoring-statistics/expansions/expansion_icon_venus.png',
}

import type React from 'react'

export const MAP_PILL: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '0.85rem',
  color: '#5b8dd9',
  padding: '3px 10px',
  borderRadius: '4px',
  background: 'rgba(91, 141, 217, 0.12)',
  border: '1px solid rgba(91, 141, 217, 0.25)',
  display: 'inline-block',
}
