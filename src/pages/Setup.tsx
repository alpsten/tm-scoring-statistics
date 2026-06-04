import PageHeader from '../components/ui/PageHeader'
import { SkeletonHeader, SkeletonTable } from '../components/ui/PageSkeleton'
import { useGames } from '../lib/hooks'
import { EXPANSION_ICONS } from '../lib/expansions'

export default function Setup() {
  const { data, isLoading, error } = useGames()

  if (isLoading) return (
    <div className="page-enter py-8 px-9">
      <SkeletonHeader />
      <SkeletonTable rows={6} cols={4} />
    </div>
  )
  if (error)     return <div className="py-8 px-9 font-body text-[var(--text-4)]">Failed to load data.</div>

  const games = data ?? []

  const mapCounts: Record<string, number> = {}
  for (const g of games) {
    if (g.map_name) mapCounts[g.map_name] = (mapCounts[g.map_name] ?? 0) + 1
  }

  const expansionCounts: Record<string, number> = {}
  for (const exp of games.flatMap(g => g.expansions)) {
    expansionCounts[exp] = (expansionCounts[exp] ?? 0) + 1
  }

  const colonyCounts: Record<string, number> = {}
  for (const col of games.flatMap(g => g.colonies)) {
    colonyCounts[col] = (colonyCounts[col] ?? 0) + 1
  }

  const mapScores = Object.keys(mapCounts).map(map => {
    const results = games.filter(g => g.map_name === map).flatMap(g => g.player_results)
    const avg = results.reduce((s, r) => s + r.total_vp, 0) / results.length
    return { map, count: mapCounts[map], avgScore: avg }
  })

  return (
    <div className="page-enter py-8 px-9">
      <PageHeader title="Setup" subtitle="Maps, expansions, and colonies" />

      <div className="grid grid-cols-3 gap-6">

        {/* Maps */}
        <div>
          <h2 className="font-display font-semibold text-[0.82rem] tracking-[0.1em] uppercase text-[var(--text-4)] mb-3 mt-0">
            Maps
          </h2>
          {mapScores.length === 0 ? (
            <EmptyCard>No map data logged yet</EmptyCard>
          ) : (
            <div className="bg-card border border-border rounded-[6px] overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <Th>Map</Th>
                    <Th center>Games</Th>
                    <Th center>Avg score</Th>
                  </tr>
                </thead>
                <tbody>
                  {mapScores.sort((a, b) => b.count - a.count).map((m, i) => (
                    <tr key={m.map} className={i < mapScores.length - 1 ? 'border-b border-border' : ''}>
                      <td className="py-2.5 px-3.5 font-body text-[0.83rem] text-foreground">{m.map}</td>
                      <NumTd>{m.count}</NumTd>
                      <NumTd className="text-score-400">{Math.round(m.avgScore)}</NumTd>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Expansions */}
        <div>
          <h2 className="font-display font-semibold text-[0.82rem] tracking-[0.1em] uppercase text-[var(--text-4)] mb-3 mt-0">
            Expansions
          </h2>
          {Object.keys(expansionCounts).length === 0 ? (
            <EmptyCard>No expansion data logged yet</EmptyCard>
          ) : (
            <div className="bg-card border border-border rounded-[6px] overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <Th>Expansion</Th>
                    <Th center>Games used</Th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(expansionCounts).sort((a, b) => b[1] - a[1]).map(([exp, count], i, arr) => (
                    <tr key={exp} className={i < arr.length - 1 ? 'border-b border-border' : ''}>
                      <td className="py-2.5 px-3.5 font-body text-[0.83rem] text-foreground">
                        <span className="inline-flex items-center gap-2">
                          {EXPANSION_ICONS[exp] && (
                            <img src={EXPANSION_ICONS[exp]} alt={exp} className="w-4 h-4 object-contain" />
                          )}
                          {exp}
                        </span>
                      </td>
                      <NumTd>{count}</NumTd>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Colonies */}
        <div>
          <h2 className="font-display font-semibold text-[0.82rem] tracking-[0.1em] uppercase text-[var(--text-4)] mb-3 mt-0">
            Colonies
          </h2>
          {Object.keys(colonyCounts).length === 0 ? (
            <EmptyCard>No colony data logged yet</EmptyCard>
          ) : (
            <div className="bg-card border border-border rounded-[6px] overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <Th>Colony</Th>
                    <Th center>Appearances</Th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(colonyCounts).sort((a, b) => b[1] - a[1]).map(([col, count], i, arr) => (
                    <tr key={col} className={i < arr.length - 1 ? 'border-b border-border' : ''}>
                      <td className="py-2.5 px-3.5 font-body text-[0.83rem] text-foreground">{col}</td>
                      <NumTd>{count}</NumTd>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-[6px] py-5 px-3.5 font-body text-[0.8rem] text-[var(--text-4)] text-center">
      {children}
    </div>
  )
}

function Th({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <th className={`py-[9px] px-3.5 font-body text-[0.66rem] font-semibold tracking-[0.08em] uppercase text-[var(--text-4)] ${center ? 'text-center' : 'text-left'}`}>
      {children}
    </th>
  )
}

function NumTd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`py-2.5 px-3.5 text-center font-mono text-[0.82rem] text-secondary-foreground ${className ?? ''}`}>
      {children}
    </td>
  )
}
