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

/** Round 1: random seeding into tables of 3/4. */
export function pairRandomRound(playerNames: string[]): string[][] {
  return bucket(shuffle(playerNames), tableSizes(playerNames.length))
}

/**
 * Rounds 2-3: sort by current tp (desc) and bucket into consecutive tables, so
 * each table is a cluster of players with similar standing. Ties are shuffled
 * before sorting so the same standings don't always split the same way.
 */
export function pairByStandings(standings: { player_name: string; tp: number }[]): string[][] {
  const sorted = shuffle(standings).sort((a, b) => b.tp - a.tp)
  return bucket(sorted.map(s => s.player_name), tableSizes(sorted.length))
}

/**
 * Top 4 by tp advance to the final, extended past 4 only while tied exactly
 * with 4th place (5 players if 2-way tied for 4th). If 3+ players are tied
 * for 4th, the tie is dropped entirely and only the clear top finishers above
 * it advance — per the tournament rules, which favor a playable final over
 * including everyone tied at the cutoff.
 */
export function determineFinalists(standings: { player_name: string; tp: number }[]): string[] {
  const sorted = [...standings].sort((a, b) => b.tp - a.tp)
  if (sorted.length <= 4) return sorted.map(s => s.player_name)

  const fourthTp = sorted[3].tp
  const aboveFourth = sorted.filter(s => s.tp > fourthTp)
  const tiedAt4th = sorted.filter(s => s.tp === fourthTp)

  if (tiedAt4th.length >= 3) return aboveFourth.map(s => s.player_name)
  return [...aboveFourth, ...tiedAt4th].map(s => s.player_name)
}
