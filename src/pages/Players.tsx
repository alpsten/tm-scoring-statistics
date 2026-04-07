import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import { usePlayerStats } from '../lib/hooks'

export default function Players() {
  const { data, isLoading, error } = usePlayerStats()

  if (isLoading) return <div style={loadingStyle}>Loading…</div>
  if (error) return <div style={loadingStyle}>Failed to load data.</div>

  const players = [...(data ?? [])].sort((a, b) => b.wins - a.wins || b.win_rate - a.win_rate)

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <PageHeader title="Players" subtitle={`${players.length} players in the record`} />

      <div style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #282042' }}>
              {['Player', 'Games', 'Wins', 'Win rate', 'Avg score', 'Best score', 'Avg position'].map(h => (
                <th key={h} style={{ padding: '11px 18px', textAlign: h === 'Player' ? 'left' : 'right', fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#504270' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr
                key={p.player_name}
                style={{ borderBottom: i < players.length - 1 ? '1px solid #282042' : 'none', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#282042')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '13px 18px' }}>
                  <Link to={`/players/${p.player_name}`} style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.9rem', color: '#ece6ff', textDecoration: 'none' }}>
                    {p.player_name}
                  </Link>
                </td>
                <td style={numTd}>{p.games_played}</td>
                <td style={numTd}>{p.wins}</td>
                <td style={{ ...numTd, color: p.win_rate >= 50 ? '#4a9e6b' : p.win_rate > 0 ? '#c9a030' : '#625c7c' }}>
                  {p.win_rate.toFixed(1)}%
                </td>
                <td style={numTd}>{p.avg_score.toFixed(1)}</td>
                <td style={{ ...numTd, color: '#c9a030', fontWeight: 700 }}>{p.best_score}</td>
                <td style={{ ...numTd, color: '#8e87a8' }}>{p.avg_position.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const loadingStyle: React.CSSProperties = {
  padding: '32px 36px',
  color: '#625c7c',
  fontFamily: 'var(--font-body)',
}

const numTd: React.CSSProperties = {
  padding: '13px 18px',
  textAlign: 'right',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.85rem',
  color: '#bbb4d0',
}
