export const ALL_MAPS = [
  'Tharsis', 'Hellas', 'Elysium', 'Arabia Terra',
  'Amazonis Planitia', 'Terra Cimmeria', 'Vastitas Borealis', 'Utopia Planitia',
]

export const ALL_EXPANSIONS = [
  'Ares', 'CEO', 'Colonies', 'Moon', 'Pathfinders',
  'Prelude', 'Prelude 2', 'Promos', 'Turmoil', 'Venus Next',
]

export const EXPANSION_ICONS: Record<string, string> = {
  'Ares':           '/tm-scoring-statistics/expansions/expansion_icon_ares.png',
  'Corporate Era':  '/tm-scoring-statistics/expansions/expansion_icon_corporateEra.png',
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

export const TAG_ICONS: Record<string, string> = {
  'Animal':   '/tm-scoring-statistics/tags/animal.png',
  'Building': '/tm-scoring-statistics/tags/building.png',
  'City':     '/tm-scoring-statistics/tags/city.png',
  'Earth':    '/tm-scoring-statistics/tags/earth.png',
  'Event':    '/tm-scoring-statistics/tags/event.png',
  'Jovian':   '/tm-scoring-statistics/tags/jovian.png',
  'Mars':     '/tm-scoring-statistics/tags/mars.png',
  'Microbe':  '/tm-scoring-statistics/tags/microbe.png',
  'Moon':     '/tm-scoring-statistics/tags/moon.png',
  'Plant':    '/tm-scoring-statistics/tags/plant.png',
  'Power':    '/tm-scoring-statistics/tags/power.png',
  'Science':  '/tm-scoring-statistics/tags/science.png',
  'Space':    '/tm-scoring-statistics/tags/space.png',
  'Venus':    '/tm-scoring-statistics/tags/venus.png',
  'Wild':     '/tm-scoring-statistics/tags/wild.png',
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
