import PageHeader from '../components/ui/PageHeader'
import { MOCK_GAMES } from '../lib/mockData'

export default function Setup() {
  const mapCounts = MOCK_GAMES.reduce<Record<string, number>>((acc, g) => {
    acc[g.map_name] = (acc[g.map_name] ?? 0) + 1
    return acc
  }, {})

  const expansionCounts = MOCK_GAMES.flatMap(g => g.expansions).reduce<Record<string, number>>((acc, e) => {
    acc[e] = (acc[e] ?? 0) + 1
    return acc
  }, {})

  const colonyCounts = MOCK_GAMES.flatMap(g => g.colonies).reduce<Record<string, number>>((acc, c) => {
    acc[c] = (acc[c] ?? 0) + 1
    return acc
  }, {})

  const mapScores = Object.keys(mapCounts).map(map => {
    const results = MOCK_GAMES.filter(g => g.map_name === map).flatMap(g => g.player_results)
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
          <div style={{ background: '#141820', border: '1px solid #1a1f2a', borderRadius: '6px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1a1f2a' }}>
                  <th style={th}>Map</th>
                  <th style={{ ...th, textAlign: 'right' }}>Games</th>
                  <th style={{ ...th, textAlign: 'right' }}>Avg score</th>
                </tr>
              </thead>
              <tbody>
                {mapScores.sort((a, b) => b.count - a.count).map((m, i) => (
                  <tr key={m.map} style={{ borderBottom: i < mapScores.length - 1 ? '1px solid #1a1f2a' : 'none' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: '#ddd9d0' }}>{m.map}</td>
                    <td style={numTd}>{m.count}</td>
                    <td style={{ ...numTd, color: '#c9a030' }}>{m.avgScore.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expansions */}
        <div>
          <h2 style={sectionTitle}>Expansions</h2>
          <div style={{ background: '#141820', border: '1px solid #1a1f2a', borderRadius: '6px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1a1f2a' }}>
                  <th style={th}>Expansion</th>
                  <th style={{ ...th, textAlign: 'right' }}>Games used</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(expansionCounts).sort((a, b) => b[1] - a[1]).map(([exp, count], i, arr) => (
                  <tr key={exp} style={{ borderBottom: i < arr.length - 1 ? '1px solid #1a1f2a' : 'none' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: '#ddd9d0' }}>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#2e8b8b', marginRight: '8px' }} />
                      {exp}
                    </td>
                    <td style={numTd}>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Colonies */}
        <div>
          <h2 style={sectionTitle}>Colonies</h2>
          {Object.keys(colonyCounts).length === 0 ? (
            <div style={{ background: '#141820', border: '1px solid #1a1f2a', borderRadius: '6px', padding: '20px 14px', fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: '#3d4352', textAlign: 'center' }}>
              No colony data logged yet
            </div>
          ) : (
            <div style={{ background: '#141820', border: '1px solid #1a1f2a', borderRadius: '6px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1a1f2a' }}>
                    <th style={th}>Colony</th>
                    <th style={{ ...th, textAlign: 'right' }}>Appearances</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(colonyCounts).sort((a, b) => b[1] - a[1]).map(([col, count], i, arr) => (
                    <tr key={col} style={{ borderBottom: i < arr.length - 1 ? '1px solid #1a1f2a' : 'none' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: '#ddd9d0' }}>{col}</td>
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

const sectionTitle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: '0.82rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#5e5b57',
  marginBottom: '12px',
  marginTop: 0,
}
const th: React.CSSProperties = { padding: '9px 14px', textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: '0.66rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3d4352' }
const numTd: React.CSSProperties = { padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#b5b0a8' }
