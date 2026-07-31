// Pure tournament scoring/pairing logic — no Supabase I/O. See queries.ts for
// the data-fetching functions that use these (fetchTournamentStandings,
// generateNextRoundPairings, fetchTournamentFinalists).

export type TableSize = 3 | 4

const BASE_POINTS: Record<TableSize, number[]> = {
  4: [4, 3, 2, 1],
  3: [4, 2, 1],
}

export function basePoints(position: number, playerCount: TableSize): number {
  return BASE_POINTS[playerCount][position - 1] ?? 0
}

export function milestoneAwardBonus(milestonesClaimed: number, awardsWon: number): number {
  return 0.1 * (milestonesClaimed + awardsWon)
}

// Shared tier colors for base points earned (4/3/2/1) — used by both the
// tournament match-card badges and the Standings table's R1/R2/R3 cells, so
// they always match. A 3-player table's 2nd place only earns 2 points — the
// same as a 4-player table's 3rd place — so both get the same color.
export const POINT_TIER_STYLE: Record<number, { color: string; bg: string; border: string }> = {
  4: { color: '#4a9e6b', bg: 'rgba(74,158,107,0.1)', border: 'rgba(74,158,107,0.3)' }, // green (winner)
  3: { color: '#d4a820', bg: 'rgba(212,168,32,0.1)', border: 'rgba(212,168,32,0.3)' }, // yellow
  2: { color: '#d07832', bg: 'rgba(210,120,50,0.1)', border: 'rgba(210,120,50,0.3)' }, // orange
  1: { color: '#e05535', bg: 'rgba(224,85,53,0.1)', border: 'rgba(224,85,53,0.3)' },   // red
}

export function pointsTierColor(points: number): string {
  if (points >= 4) return 'var(--color-win-500)'
  if (points === 3) return POINT_TIER_STYLE[3].color
  if (points === 2) return POINT_TIER_STYLE[2].color
  return 'var(--color-mars-500)'
}

/** Full tier style (text/bg/border) for a round's base points — falls back to the 1-point (red) tier for anything unrecognized. */
export function pointsTierStyle(points: number): { color: string; bg: string; border: string } {
  return POINT_TIER_STYLE[points] ?? POINT_TIER_STYLE[1]
}

/**
 * Splits `n` players into tables of 3 or 4, using as few 3-tables as possible.
 * Throws if no valid split exists — the one real edge case is n === 5.
 */
export function tableSizes(n: number): TableSize[] {
  if (n < 3) throw new Error(`Need at least 3 players, got ${n}`)
  const threeTables = [0, 3, 2, 1][n % 4]
  const fourTables = (n - 3 * threeTables) / 4
  if (fourTables < 0) {
    throw new Error(`No valid 3/4-table split for ${n} players`)
  }
  return [...Array(fourTables).fill(4), ...Array(threeTables).fill(3)]
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function bucket<T>(items: T[], sizes: TableSize[]): T[][] {
  const groups: T[][] = []
  let i = 0
  for (const size of sizes) {
    groups.push(items.slice(i, i + size))
    i += size
  }
  return groups
}

export interface RankedStanding {
  player_name: string
  tp: number
  /** This player's tp earned in each completed qualifying round, in round order. */
  roundTp: number[]
}

/**
 * Ranks by total tp, but a tie is broken by whichever player was ahead
 * before the round that produced the tie — never by chance. If the standing
 * before that round was also tied, keep looking further back; if the whole
 * score history is identical, fall back to name for a stable order.
 */
export function compareStandings(a: RankedStanding, b: RankedStanding): number {
  let cumA = a.tp
  let cumB = b.tp
  const rounds = Math.max(a.roundTp.length, b.roundTp.length)

  for (let i = rounds - 1; i >= 0; i--) {
    if (cumA !== cumB) return cumB - cumA
    cumA -= a.roundTp[i] ?? 0
    cumB -= b.roundTp[i] ?? 0
  }
  return cumA !== cumB ? cumB - cumA : a.player_name.localeCompare(b.player_name)
}

/** Round 1: random seeding into tables of 3/4. */
export function pairRandomRound(playerNames: string[]): string[][] {
  return bucket(shuffle(playerNames), tableSizes(playerNames.length))
}

/**
 * Rounds 2-3: rank by standing (see compareStandings) and bucket into
 * consecutive tables, so each table is a cluster of players with similar
 * standing — and a tie can never shuffle someone into a tougher or easier
 * table than the player they're actually tied with deserves.
 */
export function pairByStandings(standings: RankedStanding[]): string[][] {
  const sorted = [...standings].sort(compareStandings)
  return bucket(sorted.map(s => s.player_name), tableSizes(sorted.length))
}

/**
 * Top 4 by tp advance to the final, extended past 4 only while tied exactly
 * with 4th place (5 players if 2-way tied for 4th). If 3+ players are tied
 * for 4th, the tie is dropped entirely and only the clear top finishers above
 * it advance — per the tournament rules, which favor a playable final over
 * including everyone tied at the cutoff.
 */
export function determineFinalists(standings: RankedStanding[]): string[] {
  const sorted = [...standings].sort(compareStandings)
  if (sorted.length <= 4) return sorted.map(s => s.player_name)

  const fourthTp = sorted[3].tp
  const aboveFourth = sorted.filter(s => s.tp > fourthTp)
  const tiedAt4th = sorted.filter(s => s.tp === fourthTp)

  if (tiedAt4th.length >= 3) return aboveFourth.map(s => s.player_name)
  return [...aboveFourth, ...tiedAt4th].map(s => s.player_name)
}
