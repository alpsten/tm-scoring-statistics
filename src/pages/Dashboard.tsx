import { Link } from 'react-router-dom'
import StatCard from '../components/ui/StatCard'
import PageHeader from '../components/ui/PageHeader'
import { MOCK_GAMES, MOCK_PLAYER_STATS } from '../lib/mockData'

export default function Dashboard() {
  const totalGames = MOCK_GAMES.length
  const allResults = MOCK_GAMES.flatMap(g => g.player_results)
  const avgScore = Math.round(allResults.reduce((s, r) => s + r.total_vp, 0) / allResults.length)
  const topPlayer = [...MOCK_PLAYER_STATS].sort((a, b) => b.wins - a.wins)[0]
  const recentGames = [...MOCK_GAMES].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <PageHeader
        title="Mission Overview"
        subtitle="Terraforming Mars — match statistics and analysis"
      />

      {/* Stat strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '36px' }}>
        <StatCard label="Games logged"    value={totalGames}          accent="mars"    />
        <StatCard label="Avg final score" value={avgScore}            sub="VP"         accent="score"   />
        <StatCard label="Leading player"  value={topPlayer.player_name} sub={`${topPlayer.wins} wins`} accent="atmo" />
        <StatCard label="Most played map" value="Tharsis"             sub="3 games"    accent="neutral" />
      </div>

      {/* Recent games */}
      <div style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9rem', color: '#8a8680', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
            Recent games
          </h2>
          <Link to="/games" style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#e05535', textDecoration: 'none' }}>
            View all →
          </Link>
        </div>

        <div style={{ background: '#141820', border: '1px solid #1a1f2a', borderRadius: '6px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1a1f2a' }}>
                {['Date', 'Map', 'Players', 'Expansions', 'Winner', 'Score'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3d4352' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentGames.map((game, i) => {
                const winner = game.player_results.find(r => r.position === 1)
                return (
                  <tr
                    key={game.id}
                    style={{ borderBottom: i < recentGames.length - 1 ? '1px solid #1a1f2a' : 'none', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1a1f2a')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#8a8680' }}>
                      <Link to={`/games/${game.id}`} style={{ color: '#8a8680', textDecoration: 'none' }}>
                        {new Date(game.date).toLocaleDateString('sv-SE')}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: '#ddd9d0' }}>
                      {game.map_name}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#8a8680', textAlign: 'center' }}>
                      {game.player_count}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#5e5b57' }}>
                      {game.expansions.join(', ') || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {winner && (
                        <Link to={`/players/${winner.player_name}`} style={{ fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: '#ddd9d0', textDecoration: 'none', fontWeight: 500 }}>
                          {winner.player_name}
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: '#5e5b57', marginLeft: '6px' }}>
                            {winner.corporation}
                          </span>
                        </Link>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700, color: '#c9a030' }}>
                      {winner?.total_vp ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[
          { to: '/players',      label: 'Player rankings', sub: `${MOCK_PLAYER_STATS.length} players tracked` },
          { to: '/corporations', label: 'Corporation stats', sub: `${new Set(MOCK_GAMES.flatMap(g => g.player_results.map(r => r.corporation))).size} corporations played` },
          { to: '/cards',        label: 'Card analysis', sub: 'Performance by card' },
        ].map(({ to, label, sub }) => (
          <Link
            key={to}
            to={to}
            className="panel-hover"
            style={{
              display: 'block',
              padding: '20px 22px',
              background: '#141820',
              border: '1px solid #1a1f2a',
              borderRadius: '6px',
              textDecoration: 'none',
            }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9rem', color: '#ddd9d0', marginBottom: '6px' }}>
              {label} →
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#5e5b57' }}>
              {sub}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
