export const ALL_MAPS = [
  'Tharsis', 'Hellas', 'Elysium', 'Arabia Terra',
  'Amazonis Planitia', 'Terra Cimmeria', 'Vastitas Borealis', 'Utopia Planitia',
]

// Expansions shown on the Games filter and selectable when recording a game
export const ALL_EXPANSIONS = [
  'Ares', 'CEO', 'Colonies', 'Corporate Era', 'The Moon', 'Pathfinders',
  'Prelude', 'Prelude 2', 'Promos', 'Turmoil', 'Venus Next',
]

// All expansion origins used in the card reference admin (includes base sets)
export const CARD_EXPANSIONS = [
  'Base', 'Corporate Era', 'Prelude', 'Prelude 2',
  'Venus Next', 'Colonies', 'Turmoil', 'Ares', 'CEO', 'The Moon', 'Pathfinders', 'Promos',
]

// Fan expansions excluded when the Official-Cards toggle is active
export const UNOFFICIAL_EXPANSIONS = new Set(['Ares', 'CEO', 'The Moon', 'Pathfinders'])

// Maps legacy or variant expansion names from old DB records to canonical form
export function normalizeExpansion(name: string): string {
  if (name === 'Moon') return 'The Moon'
  if (name === 'Venus') return 'Venus Next'
  return name
}

export const PROJECT_CARD_TYPES = ['Automated', 'Active', 'Event'] as const
export type ProjectCardType = typeof PROJECT_CARD_TYPES[number]

export const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  Automated:      { bg: 'rgba(74, 158, 107, 0.1)',  color: '#4a9e6b' },
  Active:         { bg: 'rgba(91, 141, 217, 0.1)',  color: '#5b8dd9' },
  Event:          { bg: 'rgba(224, 85, 53, 0.1)',   color: '#e05535' },
  Corporation:    { bg: 'rgba(201, 160, 48, 0.1)',  color: '#c9a030' },
  Prelude:        { bg: 'rgba(220, 100, 150, 0.1)', color: '#d46496' },
  CEO:            { bg: 'rgba(210, 120, 50, 0.1)',  color: '#d07832' },
  'Global Event': { bg: 'rgba(160, 110, 190, 0.1)', color: '#a870c8' },
}

export const NO_TAG_ICON = '/tm-scoring-statistics/tags/no-tag.png'
export const NO_TAG = '__no_tag__'

export const EXPANSION_ICONS: Record<string, string> = {
  'Base':          '/tm-scoring-statistics/expansions/expansion_icon_base_game.png',
  'Ares':          '/tm-scoring-statistics/expansions/expansion_icon_ares.png',
  'Corporate Era': '/tm-scoring-statistics/expansions/expansion_icon_corporateEra.png',
  'CEO':           '/tm-scoring-statistics/expansions/expansion_icon_ceo.png',
  'Colonies':      '/tm-scoring-statistics/expansions/expansion_icon_colonies.png',
  'Pathfinders':   '/tm-scoring-statistics/expansions/expansion_icon_pathfinders.png',
  'Prelude':       '/tm-scoring-statistics/expansions/expansion_icon_prelude.png',
  'Prelude 2':     '/tm-scoring-statistics/expansions/expansion_icon_prelude2.png',
  'Promos':        '/tm-scoring-statistics/expansions/expansion_icon_promo.png',
  'The Moon':      '/tm-scoring-statistics/expansions/expansion_icon_themoon.png',
  'Turmoil':       '/tm-scoring-statistics/expansions/expansion_icon_turmoil.png',
  'Venus Next':    '/tm-scoring-statistics/expansions/expansion_icon_venus.png',
}

export const PLACEMENT_VP_TYPES: readonly string[] = [
  'City-tile', 'Ocean-tile', 'Mining-tile', 'Road-tile', 'Greenery', 'Cathedral', 'Colony',
]

export const MULTIPLIER_VP_TYPES: readonly string[] = [
  'Venus', 'Jovian', 'Moon', 'City-tiles', 'Off-World City-tiles',
]

export const PLACEMENT_ICONS: Record<string, string> = {
  'City-tile':   '/tm-scoring-statistics/resources/tile-special.png',
  'Ocean-tile':  '/tm-scoring-statistics/resources/tile-special.png',
  'Mining-tile': '/tm-scoring-statistics/resources/tile-special.png',
  'Road-tile':   '/tm-scoring-statistics/resources/tile-special.png',
  'Greenery':    '/tm-scoring-statistics/resources/tile-special.png',
  'Cathedral':   '/tm-scoring-statistics/resources/tile-special.png',
  'Colony':      '/tm-scoring-statistics/resources/tile-special.png',
}

export const RESOURCE_ICONS: Record<string, string> = {
  'Animal':        '/tm-scoring-statistics/resources/animal.png',
  'Asteroid':      '/tm-scoring-statistics/resources/asteroid.png',
  'Camp':          '/tm-scoring-statistics/resources/camp.png',
  'Data':          '/tm-scoring-statistics/resources/data.png',
  'Floater':       '/tm-scoring-statistics/resources/floater.png',
  'Hydroelectric': '/tm-scoring-statistics/resources/hydroelectric-resource.png',
  'Microbe':       '/tm-scoring-statistics/resources/microbe.png',
  'Preservation':  '/tm-scoring-statistics/resources/preservation.png',
  'Science':       '/tm-scoring-statistics/resources/science.png',
}

export const TAG_ICONS: Record<string, string> = {
  [NO_TAG]:   NO_TAG_ICON,
  'Animal':   '/tm-scoring-statistics/tags/animal.png',
  'Building': '/tm-scoring-statistics/tags/building.png',
  'City':     '/tm-scoring-statistics/tags/city.png',
  'Earth':    '/tm-scoring-statistics/tags/earth.png',
  'Event':    '/tm-scoring-statistics/tags/event.png',
  'Jovian':   '/tm-scoring-statistics/tags/jovian.png',
  'Mars':     '/tm-scoring-statistics/tags/mars.png',
  'Microbe':  '/tm-scoring-statistics/tags/microbe.png',
  'Moon':     '/tm-scoring-statistics/tags/moon.png',
  'Planet':   '/tm-scoring-statistics/tags/planet.png',
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
