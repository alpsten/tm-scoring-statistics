import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import { MOCK_PLAYER_STATS } from '../lib/mockData'

export default function Players() {
  const players = [...MOCK_PLAYER_STATS].sort((a, b) => b.wins - a.wins || b.win_rate - a.win_rate)

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <PageHeader title="Players" subtitle={`${players.length} players in the record`} />

      <div style={{ background: '#141820', border: '1px solid #1a1f2a', borderRadius: '6px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1a1f2a' }}>
              {['Player', 'Games', 'Wins', 'Win rate', 'Avg score', 'Best score', 'Avg position'].map(h => (
                <th key={h} style={{ padding: '11px 18px', textAlign: h === 'Player' ? 'left' : 'right', fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3d4352' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr
                key={p.player_name}
                style={{ borderBottom: i < players.length - 1 ? '1px solid #1a1f2a' : 'none', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1a1f2a')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '13px 18px' }}>
                  <Link to={`/players/${p.player_name}`} style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.9rem', color: '#ddd9d0', textDecoration: 'none' }}>
                    {p.player_name}
                  </Link>
                </td>
                <td style={numTd}>{p.games_played}</td>
                <td style={numTd}>{p.wins}</td>
                <td style={{ ...numTd, color: p.win_rate >= 50 ? '#4a9e6b' : p.win_rate > 0 ? '#c9a030' : '#5e5b57' }}>
                  {p.win_rate.toFixed(1)}%
                </td>
                <td style={numTd}>{p.avg_score.toFixed(1)}</td>
                <td style={{ ...numTd, color: '#c9a030', fontWeight: 700 }}>{p.best_score}</td>
                <td style={{ ...numTd, color: '#8a8680' }}>{p.avg_position.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
