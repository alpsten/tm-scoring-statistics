// Tournament-only placement badge — colored by tournament points actually
// earned rather than raw position, unlike the shared PositionBadge (used
// elsewhere in the app) which treats every non-winning place the same. A
// 3-player table's 2nd place only earns 2 tp — the same as a 4-player
// table's 3rd place — so both get the same color.

import { basePoints, POINT_TIER_STYLE } from '../../lib/tournamentRules'

interface TournamentPositionBadgeProps {
  position: number
  /** Table size — points only apply for the qualifying 3/4-player format; any other size (e.g. a 5-player final) falls back to a neutral color. */
  tableSize: number
  /** Drops the " PLACE" suffix (just "1ST", "2ND", ...) — used in the Standings table where columns are narrow. */
  compact?: boolean
}

const PLACE_LABELS: Record<number, string> = { 1: '1ST', 2: '2ND', 3: '3RD', 4: '4TH', 5: '5TH' }

export default function TournamentPositionBadge({ position, tableSize, compact }: TournamentPositionBadgeProps) {
  const label = (PLACE_LABELS[position] ?? `${position}TH`) + (compact ? '' : ' PLACE')

  if (position === 1) {
    return (
      <span className="inline-block font-mono text-[0.68rem] font-bold tracking-[0.05em] uppercase text-win-500 bg-win-500/10 border border-win-500/30 rounded px-[7px] py-[2px]">
        {label}
      </span>
    )
  }

  const points = tableSize === 3 || tableSize === 4 ? basePoints(position, tableSize) : null
  const style = points != null ? POINT_TIER_STYLE[points] : undefined

  if (style) {
    return (
      <span
        className="inline-block font-mono text-[0.68rem] font-semibold tracking-[0.04em] uppercase rounded px-[7px] py-[2px] border"
        style={{ color: style.color, backgroundColor: style.bg, borderColor: style.border }}
      >
        {label}
      </span>
    )
  }

  // 1-point placements, and any non-qualifying table size (e.g. a 5-player final).
  return (
    <span className="inline-block font-mono text-[0.68rem] font-semibold tracking-[0.04em] uppercase text-mars-500 bg-mars-500/10 border border-mars-500/30 rounded px-[7px] py-[2px]">
      {label}
    </span>
  )
}
