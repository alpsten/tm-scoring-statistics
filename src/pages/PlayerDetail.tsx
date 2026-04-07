import { useParams, Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import { MOCK_GAMES, MOCK_PLAYER_STATS } from '../lib/mockData'

export default function PlayerDetail() {
  const { name } = useParams<{ name: string }>()
  const stats = MOCK_PLAYER_STATS.find(p => p.player_name === name)
  const playerGames = MOCK_GAMES
    .filter(g => g.player_results.some(r => r.player_name === name))
    .sort((a, b) => b.date.localeCompare(a.date))

  if (!stats) {
    return <div style={{ padding: '32px 36px', color: '#5e5b57' }}>Player not found. <Link to="/players" style={{ color: '#e05535' }}>Back</Link></div>
  }

  const chartData = playerGames.map(g => {
    const result = g.player_results.find(r => r.player_name === name)!
    return { date: g.date.slice(5), score: result.total_vp, win: result.position === 1 }
  }).reverse()

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/players" style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#5e5b57', textDecoration: 'none' }}>← Players</Link>
      </div>

      <PageHeader title={name!} subtitle={`${stats.games_played} games played`} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <StatCard label="Wins"        value={stats.wins}                 sub={`of ${stats.games_played} games`} accent="mars"    />
        <StatCard label="Win rate"    value={`${stats.win_rate.toFixed(1)}%`}  accent="atmo"    />
        <StatCard label="Avg score"   value={stats.avg_score.toFixed(1)} sub="VP"               accent="score"   />
        <StatCard label="Best score"  value={stats.best_score}           sub="VP"               accent="neutral" />
      </div>

      {/* Score history chart */}
      <div style={{ background: '#141820', border: '1px solid #1a1f2a', borderRadius: '6px', padding: '20px 24px', marginBottom: '28px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.82rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5e5b57', marginBottom: '16px' }}>
          Score history
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} barSize={28}>
            <XAxis dataKey="date" tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#3d4352' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#3d4352' }} axisLine={false} tickLine={false} width={32} />
            <Tooltip
              contentStyle={{ background: '#1a1f2a', border: '1px solid #2e3340', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#ddd9d0' }}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Bar dataKey="score" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.win ? '#e05535' : '#2e3340'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: '#3d4352' }}>
          <span><span style={{ color: '#e05535' }}>■</span> Win</span>
          <span><span style={{ color: '#2e3340', border: '1px solid #3d4352', display: 'inline-block', width: '10px', height: '10px', verticalAlign: 'middle' }} /> Top finish</span>
        </div>
      </div>

      {/* Games played */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.82rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5e5b57', marginBottom: '14px' }}>
          Game history
        </h2>
        <div style={{ background: '#141820', border: '1px solid #1a1f2a', borderRadius: '6px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1a1f2a' }}>
                {['Date', 'Map', 'Corporation', 'Position', 'Score', 'Notes'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3d4352' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {playerGames.map((game, i) => {
                const result = game.player_results.find(r => r.player_name === name)!
                return (
                  <tr key={game.id} style={{ borderBottom: i < playerGames.length - 1 ? '1px solid #1a1f2a' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1a1f2a')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#8a8680' }}>
                      <Link to={`/games/${game.id}`} style={{ color: '#8a8680', textDecoration: 'none' }}>
                        {new Date(game.date).toLocaleDateString('sv-SE')}
                      </Link>
                    </td>
                    <td style={{ padding: '11px 16px', fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: '#ddd9d0' }}>{game.map_name}</td>
                    <td style={{ padding: '11px 16px', fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: '#8a8680' }}>
                      <Link to={`/corporations/${result.corporation}`} style={{ color: '#8a8680', textDecoration: 'none' }}>
                        {result.corporation}
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
                    <td style={{ padding: '11px 16px', fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#3d4352', fontStyle: 'italic' }}>
                      {result.key_notes ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
