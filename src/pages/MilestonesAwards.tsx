import PageHeader from '../components/ui/PageHeader'
import SectionHeading from '../components/ui/SectionHeading'
import { SkeletonHeader, SkeletonTable } from '../components/ui/PageSkeleton'
import { useAllMilestones, useAllAwards } from '../lib/hooks'

// ── helpers ──────────────────────────────────────────────────────────────────

function rankBy<T>(items: T[], key: keyof T): { item: T; count: number }[] {
  const map = new Map<string, number>()
  for (const item of items) {
    const val = item[key] as string | null
    if (!val) continue
    map.set(val, (map.get(val) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ item: { [key]: name } as unknown as T, count }))
    .sort((a, b) => b.count - a.count || (a.item[key] as string).localeCompare(b.item[key] as string))
}

// ── sub-components ────────────────────────────────────────────────────────────

interface RankRow {
  name: string
  count: number
  total: number
}

function RankTable({ rows, nameLabel }: { rows: RankRow[]; nameLabel: string }) {
  if (rows.length === 0) {
    return (
      <div className="p-5 font-body text-[0.83rem] text-[var(--text-4)]">
        No data yet.
      </div>
    )
  }

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className="w-9 px-4 py-[10px] text-left font-mono text-[0.72rem] tracking-[0.08em] uppercase text-[var(--text-4)] font-normal border-b border-border">#</th>
          <th className="px-4 py-[10px] text-left font-mono text-[0.72rem] tracking-[0.08em] uppercase text-[var(--text-4)] font-normal border-b border-border">{nameLabel}</th>
          <th className="px-4 py-[10px] text-right font-mono text-[0.72rem] tracking-[0.08em] uppercase text-[var(--text-4)] font-normal border-b border-border">Times</th>
          <th className="px-4 py-[10px] text-right font-mono text-[0.72rem] tracking-[0.08em] uppercase text-[var(--text-4)] font-normal border-b border-border">% of games</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const pct = (total: number) => total > 0 ? Math.round((row.count / total) * 100) : 0
          return (
            <tr key={row.name} className="border-b border-border hover:bg-accent transition-colors">
              <td className="px-4 py-3 font-mono text-[0.7rem] text-[var(--text-4)]">{i + 1}</td>
              <td className="px-4 py-3 font-body text-[0.87rem] text-foreground">{row.name}</td>
              <td className="px-4 py-3 font-mono text-[0.87rem] text-violet-400 text-right">{row.count}</td>
              <td className="px-4 py-3 font-mono text-[0.82rem] text-[var(--text-4)] text-right">{pct(row.total)}%</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function MilestonesAwards() {
  const { data: milestoneRows = [], isLoading: mlLoading } = useAllMilestones()
  const { data: awardRows = [], isLoading: awLoading } = useAllAwards()

  const claimed = milestoneRows.filter(r => r.player_name !== null)
  const funded  = awardRows.filter(r => r.funder_name !== null)

  const totalGames = new Set([
    ...milestoneRows.map(r => r.game_id),
    ...awardRows.map(r => r.game_id),
  ]).size

  const milestoneRanked = rankBy(claimed, 'milestone_name').map(({ item, count }) => ({
    name: (item as { milestone_name: string }).milestone_name,
    count,
    total: totalGames,
  }))

  const awardRanked = rankBy(funded, 'award_name').map(({ item, count }) => ({
    name: (item as { award_name: string }).award_name,
    count,
    total: totalGames,
  }))

  // Per-player milestone and award stats
  type PlayerEntry = { name: string; milestones: number; awards: number }
  const playerMap = new Map<string, PlayerEntry>()
  for (const r of claimed) {
    const n = r.player_name!
    if (!playerMap.has(n)) playerMap.set(n, { name: n, milestones: 0, awards: 0 })
    playerMap.get(n)!.milestones++
  }
  for (const r of funded) {
    const n = r.funder_name!
    if (!playerMap.has(n)) playerMap.set(n, { name: n, milestones: 0, awards: 0 })
    playerMap.get(n)!.awards++
  }
  const playerEntries = Array.from(playerMap.values())
    .sort((a, b) => (b.milestones + b.awards) - (a.milestones + a.awards) || a.name.localeCompare(b.name))

  const loading = mlLoading || awLoading

  if (loading) {
    return (
      <div className="page-enter py-8 px-9">
        <SkeletonHeader />
        <div className="grid grid-cols-2 gap-6">
          <SkeletonTable rows={6} cols={3} />
          <SkeletonTable rows={6} cols={3} />
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter py-8 px-9">
      <PageHeader title="Milestones & Awards" subtitle={`${totalGames} games tracked`} />

      <div className="mb-7 px-3.5 py-2.5 bg-card border border-border rounded-[6px] font-body text-[0.78rem] text-[var(--text-4)]">
        Generation breakdown coming soon — requires a database schema update to track which generation milestones were claimed / awards were funded.
      </div>

      <div className="grid gap-7 mb-7" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <div>
          <SectionHeading effect style={{ marginBottom: '-60px' }}>Milestones — most claimed</SectionHeading>
          <div className="bg-card border border-border rounded-[6px] overflow-hidden">
            <RankTable rows={milestoneRanked} nameLabel="Milestone" />
          </div>
        </div>
        <div>
          <SectionHeading effect style={{ marginBottom: '-60px' }}>Awards — most funded</SectionHeading>
          <div className="bg-card border border-border rounded-[6px] overflow-hidden">
            <RankTable rows={awardRanked} nameLabel="Award" />
          </div>
        </div>
      </div>

      <div>
        <SectionHeading effect style={{ marginBottom: '-60px' }}>Per-player activity</SectionHeading>
        <div className="bg-card border border-border rounded-[6px] overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {(['Player', 'Milestones', 'Awards', 'Total'] as const).map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-[10px] font-mono text-[0.72rem] tracking-[0.08em] uppercase text-[var(--text-4)] font-normal border-b border-border ${i === 0 ? 'text-left' : 'text-right'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {playerEntries.map(p => (
                <tr key={p.name} className="border-b border-border hover:bg-accent transition-colors">
                  <td className="px-4 py-3 font-display font-semibold text-[0.87rem] text-foreground">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-[0.87rem] text-win-500 text-right">{p.milestones}</td>
                  <td className="px-4 py-3 font-mono text-[0.87rem] text-score-400 text-right">{p.awards}</td>
                  <td className="px-4 py-3 font-mono text-[0.87rem] text-violet-400 text-right">{p.milestones + p.awards}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
