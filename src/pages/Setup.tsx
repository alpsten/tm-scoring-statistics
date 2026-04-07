import PageHeader from '../components/ui/PageHeader'
import { useGames } from '../lib/hooks'

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
                  <tr style={{ borderBottom: '1px solid #282042' }}>
                    <th style={th}>Map</th>
                    <th style={{ ...th, textAlign: 'right' }}>Games</th>
                    <th style={{ ...th, textAlign: 'right' }}>Avg score</th>
                  </tr>
                </thead>
                <tbody>
                  {mapScores.sort((a, b) => b.count - a.count).map((m, i) => (
                    <tr key={m.map} style={{ borderBottom: i < mapScores.length - 1 ? '1px solid #282042' : 'none' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: '#ece6ff' }}>{m.map}</td>
                      <td style={numTd}>{m.count}</td>
                      <td style={{ ...numTd, color: '#c9a030' }}>{m.avgScore.toFixed(1)}</td>
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
                  <tr style={{ borderBottom: '1px solid #282042' }}>
                    <th style={th}>Expansion</th>
                    <th style={{ ...th, textAlign: 'right' }}>Games used</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(expansionCounts).sort((a, b) => b[1] - a[1]).map(([exp, count], i, arr) => (
                    <tr key={exp} style={{ borderBottom: i < arr.length - 1 ? '1px solid #282042' : 'none' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: '#ece6ff' }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#2e8b8b', marginRight: '8px' }} />
                        {exp}
                      </td>
                      <td style={numTd}>{count}</td>
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
                  <tr style={{ borderBottom: '1px solid #282042' }}>
                    <th style={th}>Colony</th>
                    <th style={{ ...th, textAlign: 'right' }}>Appearances</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(colonyCounts).sort((a, b) => b[1] - a[1]).map(([col, count], i, arr) => (
                    <tr key={col} style={{ borderBottom: i < arr.length - 1 ? '1px solid #282042' : 'none' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: '#ece6ff' }}>{col}</td>
                      <td style={numTd}>{count}</td>
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
  color: '#625c7c',
  fontFamily: 'var(--font-body)',
}

const emptyCard: React.CSSProperties = {
  background: '#1e1835',
  border: '1px solid #282042',
  borderRadius: '6px',
  padding: '20px 14px',
  fontFamily: 'var(--font-body)',
  fontSize: '0.8rem',
  color: '#504270',
  textAlign: 'center',
}

const tableWrap: React.CSSProperties = {
  background: '#1e1835',
  border: '1px solid #282042',
  borderRadius: '6px',
  overflow: 'hidden',
}

const sectionTitle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: '0.82rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#625c7c',
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
  color: '#504270',
}

const numTd: React.CSSProperties = {
  padding: '10px 14px',
  textAlign: 'right',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.82rem',
  color: '#bbb4d0',
}
