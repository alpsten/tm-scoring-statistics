import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import { MOCK_CORP_STATS } from '../lib/mockData'

export default function Corporations() {
  const corps = [...MOCK_CORP_STATS].sort((a, b) => b.avg_score - a.avg_score)

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <PageHeader title="Corporations" subtitle={`${corps.length} corporations played`} />

      <div style={{ background: '#141820', border: '1px solid #1a1f2a', borderRadius: '6px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1a1f2a' }}>
              {['Corporation', 'Games', 'Wins', 'Win rate', 'Avg score', 'Best score'].map(h => (
                <th key={h} style={{ padding: '11px 18px', textAlign: h === 'Corporation' ? 'left' : 'right', fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3d4352' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {corps.map((c, i) => (
              <tr
                key={c.corporation}
                style={{ borderBottom: i < corps.length - 1 ? '1px solid #1a1f2a' : 'none', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1a1f2a')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '13px 18px' }}>
                  <Link to={`/corporations/${encodeURIComponent(c.corporation)}`} style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.87rem', color: '#ddd9d0', textDecoration: 'none' }}>
                    {c.corporation}
                  </Link>
                </td>
                <td style={numTd}>{c.games_played}</td>
                <td style={numTd}>{c.wins}</td>
                <td style={{ ...numTd, color: c.win_rate === 100 ? '#4a9e6b' : c.win_rate > 0 ? '#c9a030' : '#5e5b57' }}>
                  {c.win_rate.toFixed(0)}%
                </td>
                <td style={{ ...numTd }}>{c.avg_score.toFixed(1)}</td>
                <td style={{ ...numTd, color: '#c9a030', fontWeight: 700 }}>{c.best_score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: '16px', fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#3d4352', fontStyle: 'italic' }}>
        Win rate with fewer than 5 games is statistically noisy. Sample size shown for context.
      </p>
    </div>
  )
}

const numTd: React.CSSProperties = {
  padding: '13px 18px',
  textAlign: 'right',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.85rem',
  color: '#b5b0a8',
}
