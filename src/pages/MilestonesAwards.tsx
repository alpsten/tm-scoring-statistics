import PageHeader from '../components/ui/PageHeader'
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
      <div style={{ padding: '20px', color: '#504270', fontFamily: 'var(--font-body)', fontSize: '0.83rem' }}>
        No data yet.
      </div>
    )
  }

  const thStyle: React.CSSProperties = {
    padding: '8px 14px',
    textAlign: 'left',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.62rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#504270',
    fontWeight: 400,
    borderBottom: '1px solid #282042',
  }
  const thRight: React.CSSProperties = { ...thStyle, textAlign: 'right' }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ ...thStyle, width: '36px' }}>#</th>
          <th style={thStyle}>{nameLabel}</th>
          <th style={thRight}>Times</th>
          <th style={thRight}>% of games</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const pct = total => total > 0 ? Math.round((row.count / total) * 100) : 0
          return (
            <tr
              key={row.name}
              style={{ borderBottom: '1px solid #1e1835' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#171228')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#504270' }}>
                {i + 1}
              </td>
              <td style={{ padding: '9px 14px', fontFamily: 'var(--font-body)', fontSize: '0.87rem', color: '#ece6ff' }}>
                {row.name}
              </td>
              <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.87rem', color: '#b87aff', textAlign: 'right' }}>
                {row.count}
              </td>
              <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#625c7c', textAlign: 'right' }}>
                {pct(row.total)}%
              </td>
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

  const sectionLabel = (text: string) => (
    <span style={{
      display: 'inline-block',
      fontFamily: 'var(--font-body)',
      fontSize: '0.68rem',
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase' as const,
      color: '#5b8dd9',
      padding: '3px 10px',
      borderRadius: '4px',
      background: 'rgba(91,141,217,0.12)',
      border: '1px solid rgba(91,141,217,0.25)',
      marginBottom: '16px',
    }}>{text}</span>
  )

  const panel = (children: React.ReactNode) => (
    <div style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', overflow: 'hidden' }}>
      {children}
    </div>
  )

  if (loading) {
    return (
      <div style={{ padding: '32px 36px', color: '#625c7c', fontFamily: 'var(--font-body)' }}>Loading…</div>
    )
  }

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <PageHeader
        title="Milestones & Awards"
        subtitle={`${totalGames} games tracked`}
      />

      {/* Generation stats TODO notice */}
      <div style={{
        marginBottom: '28px',
        padding: '10px 14px',
        background: 'rgba(201,160,48,0.06)',
        border: '1px solid rgba(201,160,48,0.2)',
        borderRadius: '4px',
        fontFamily: 'var(--font-body)',
        fontSize: '0.78rem',
        color: '#c9a030',
      }}>
        Generation breakdown coming soon — requires a database schema update to track which generation milestones were claimed / awards were funded.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px', marginBottom: '28px' }}>
        {/* Milestones */}
        <div>
          {sectionLabel('Milestones — most claimed')}
          {panel(<RankTable rows={milestoneRanked} nameLabel="Milestone" />)}
        </div>

        {/* Awards */}
        <div>
          {sectionLabel('Awards — most funded')}
          {panel(<RankTable rows={awardRanked} nameLabel="Award" />)}
        </div>
      </div>

      {/* Per-player breakdown */}
      <div>
        {sectionLabel('Per-player activity')}
        {panel(
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Player', 'Milestones', 'Awards', 'Total'].map((h, i) => (
                  <th key={h} style={{
                    padding: '8px 14px',
                    textAlign: i === 0 ? 'left' : 'right',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.62rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#504270',
                    fontWeight: 400,
                    borderBottom: '1px solid #282042',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {playerEntries.map(p => (
                <tr
                  key={p.name}
                  style={{ borderBottom: '1px solid #1e1835' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#171228')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.87rem', color: '#ece6ff' }}>{p.name}</td>
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.87rem', color: '#4a9e6b', textAlign: 'right' }}>{p.milestones}</td>
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.87rem', color: '#c9a030', textAlign: 'right' }}>{p.awards}</td>
                  <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.87rem', color: '#b87aff', textAlign: 'right' }}>{p.milestones + p.awards}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
