import { useParams, Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import { MOCK_GAMES, MOCK_CORP_STATS } from '../lib/mockData'

export default function CorporationDetail() {
  const { name } = useParams<{ name: string }>()
  const corpName = decodeURIComponent(name ?? '')
  const stats = MOCK_CORP_STATS.find(c => c.corporation === corpName)
  const games = MOCK_GAMES
    .filter(g => g.player_results.some(r => r.corporation === corpName))
    .sort((a, b) => b.date.localeCompare(a.date))

  if (!stats) {
    return <div style={{ padding: '32px 36px', color: '#5e5b57' }}>Corporation not found. <Link to="/corporations" style={{ color: '#e05535' }}>Back</Link></div>
  }

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/corporations" style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#5e5b57', textDecoration: 'none' }}>← Corporations</Link>
      </div>

      <PageHeader title={corpName} subtitle={`${stats.games_played} game${stats.games_played !== 1 ? 's' : ''} on record`} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <StatCard label="Wins"       value={stats.wins}                      sub={`of ${stats.games_played}`}  accent="mars"    />
        <StatCard label="Win rate"   value={`${stats.win_rate.toFixed(0)}%`}                                   accent="atmo"    />
        <StatCard label="Avg score"  value={stats.avg_score.toFixed(1)}      sub="VP"                         accent="score"   />
        <StatCard label="Best score" value={stats.best_score}                sub="VP"                         accent="neutral" />
      </div>

      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.82rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5e5b57', marginBottom: '14px' }}>
        Game history
      </h2>
      <div style={{ background: '#141820', border: '1px solid #1a1f2a', borderRadius: '6px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1a1f2a' }}>
              {['Date', 'Map', 'Player', 'Position', 'Score'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3d4352' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {games.map((game, i) => {
              const result = game.player_results.find(r => r.corporation === corpName)!
              return (
                <tr key={game.id} style={{ borderBottom: i < games.length - 1 ? '1px solid #1a1f2a' : 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1a1f2a')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#8a8680' }}>
                    <Link to={`/games/${game.id}`} style={{ color: '#8a8680', textDecoration: 'none' }}>
                      {new Date(game.date).toLocaleDateString('sv-SE')}
                    </Link>
                  </td>
                  <td style={{ padding: '11px 16px', fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: '#ddd9d0' }}>{game.map_name}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <Link to={`/players/${result.player_name}`} style={{ fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: '#8a8680', textDecoration: 'none' }}>
                      {result.player_name}
                    </Link>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    {result.position === 1
                      ? <span className="win-badge">Winner</span>
                      : <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#5e5b57' }}>#{result.position}</span>
                    }
                  </td>
                  <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color: result.position === 1 ? '#c9a030' : '#8a8680' }}>
                    {result.total_vp}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
