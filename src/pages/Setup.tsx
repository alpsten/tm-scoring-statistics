import PageHeader from '../components/ui/PageHeader'
import { useGames } from '../lib/hooks'
import { EXPANSION_ICONS } from '../lib/expansions'

export default function Setup() {
  const { data, isLoading, error } = useGames()

  if (isLoading) return <div style={loadingStyle}>Loading…</div>
  if (error) return <div style={loadingStyle}>Failed to load data.</div>

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
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <PageHeader title="Setup" subtitle="Maps, expansions, and colonies" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>

        {/* Maps */}
        <div>
          <h2 style={sectionTitle}>Maps</h2>
          {mapScores.length === 0 ? (
            <div style={emptyCard}>No map data logged yet</div>
          ) : (
            <div style={tableWrap}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--bd-panel)' }}>
                    <th style={th}>Map</th>
                    <th style={{ ...th, textAlign: 'center' }}>Games</th>
                    <th style={{ ...th, textAlign: 'center' }}>Avg score</th>
                  </tr>
                </thead>
                <tbody>
                  {mapScores.sort((a, b) => b.count - a.count).map((m, i) => (
                    <tr key={m.map} style={{ borderBottom: i < mapScores.length - 1 ? '1px solid var(--bd-panel)' : 'none' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: 'var(--text-1)' }}>{m.map}</td>
                      <td style={{ ...numTd, textAlign: 'center' }}>{m.count}</td>
                      <td style={{ ...numTd, textAlign: 'center', color: '#c9a030' }}>{Math.round(m.avgScore)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Expansions */}
        <div>
          <h2 style={sectionTitle}>Expansions</h2>
          {Object.keys(expansionCounts).length === 0 ? (
            <div style={emptyCard}>No expansion data logged yet</div>
          ) : (
            <div style={tableWrap}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--bd-panel)' }}>
                    <th style={th}>Expansion</th>
                    <th style={{ ...th, textAlign: 'center' }}>Games used</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(expansionCounts).sort((a, b) => b[1] - a[1]).map(([exp, count], i, arr) => (
                    <tr key={exp} style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--bd-panel)' : 'none' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: 'var(--text-1)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          {EXPANSION_ICONS[exp] && <img src={EXPANSION_ICONS[exp]} alt={exp} style={{ width: '16px', height: '16px', objectFit: 'contain' }} />}
                          {exp}
                        </span>
                      </td>
                      <td style={{ ...numTd, textAlign: 'center' }}>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Colonies */}
        <div>
          <h2 style={sectionTitle}>Colonies</h2>
          {Object.keys(colonyCounts).length === 0 ? (
            <div style={emptyCard}>No colony data logged yet</div>
          ) : (
            <div style={tableWrap}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--bd-panel)' }}>
                    <th style={th}>Colony</th>
                    <th style={{ ...th, textAlign: 'center' }}>Appearances</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(colonyCounts).sort((a, b) => b[1] - a[1]).map(([col, count], i, arr) => (
                    <tr key={col} style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--bd-panel)' : 'none' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: 'var(--text-1)' }}>{col}</td>
                      <td style={{ ...numTd, textAlign: 'center' }}>{count}</td>
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

const loadingStyle: React.CSSProperties = {
  padding: '32px 36px',
  color: 'var(--text-4)',
  fontFamily: 'var(--font-body)',
}

const emptyCard: React.CSSProperties = {
  background: 'var(--bg-panel)',
  border: '1px solid var(--bd-panel)',
  borderRadius: '6px',
  padding: '20px 14px',
  fontFamily: 'var(--font-body)',
  fontSize: '0.8rem',
  color: 'var(--text-4)',
  textAlign: 'center',
}

const tableWrap: React.CSSProperties = {
  background: 'var(--bg-panel)',
  border: '1px solid var(--bd-panel)',
  borderRadius: '6px',
  overflow: 'hidden',
}

const sectionTitle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: '0.82rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--text-4)',
  marginBottom: '12px',
  marginTop: 0,
}

const th: React.CSSProperties = {
  padding: '9px 14px',
  textAlign: 'left',
  fontFamily: 'var(--font-body)',
  fontSize: '0.66rem',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-4)',
}

const numTd: React.CSSProperties = {
  padding: '10px 14px',
  textAlign: 'right',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.82rem',
  color: 'var(--text-2)',
}
