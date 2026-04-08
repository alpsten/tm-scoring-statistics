import { useParams, Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, type DotProps } from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import { useGames, usePlayerStats } from '../lib/hooks'

export default function PlayerDetail() {
  const { name } = useParams<{ name: string }>()
  const { data: games, isLoading: gamesLoading } = useGames()
  const { data: playerStats, isLoading: statsLoading } = usePlayerStats()

  if (gamesLoading || statsLoading) return <div style={loadingStyle}>Loading…</div>

  const stats = (playerStats ?? []).find(p => p.player_name === name)
  const playerGames = (games ?? [])
    .filter(g => g.player_results.some(r => r.player_name === name))
    .sort((a, b) => b.date.localeCompare(a.date))

  if (!stats) {
    return <div style={loadingStyle}>Player not found. <Link to="/players" style={{ color: '#e05535' }}>Back</Link></div>
  }

  const chartData = playerGames.map(g => {
    const result = g.player_results.find(r => r.player_name === name)!
    return { date: g.date.slice(5), score: result.total_vp, win: result.position === 1 }
  }).reverse()

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/players" style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#625c7c', textDecoration: 'none' }}>← Players</Link>
      </div>

      <PageHeader title={name!} subtitle={`${stats.games_played} games played`} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <StatCard label="Wins"        value={stats.wins}                      sub={`of ${stats.games_played} games`} accent="mars"    />
        <StatCard label="Win rate"    value={`${stats.win_rate.toFixed(1)}%`}                                        accent="atmo"    />
        <StatCard label="Avg score"   value={stats.avg_score.toFixed(1)}      sub="VP"                               accent="score"   />
        <StatCard label="Best score"  value={stats.best_score}                sub="VP"                               accent="neutral" />
      </div>

      {/* Score trend chart */}
      <div style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', padding: '20px 24px', marginBottom: '28px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.82rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#625c7c', marginBottom: '16px' }}>
          Score trend
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <XAxis dataKey="date" tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#504270' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#504270' }} axisLine={false} tickLine={false} width={32} />
            <Tooltip
              contentStyle={{ background: '#282042', border: '1px solid #3e325e', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#ece6ff' }}
              cursor={{ stroke: 'rgba(255,255,255,0.06)' }}
            />
            <ReferenceLine y={stats.avg_score} stroke="#3e325e" strokeDasharray="4 3" label={{ value: 'avg', position: 'insideTopRight', fontSize: 9, fill: '#504270', fontFamily: 'var(--font-mono)' }} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#504270"
              strokeWidth={1.5}
              dot={(props: DotProps & { payload?: { win: boolean } }) => {
                const { cx, cy, payload } = props
                return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={5} fill={payload?.win ? '#e05535' : '#3e325e'} stroke="#171228" strokeWidth={1.5} />
              }}
              activeDot={{ r: 6, fill: '#b87aff', stroke: '#171228', strokeWidth: 1.5 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: '#504270' }}>
          <span><span style={{ color: '#e05535' }}>●</span> Win</span>
          <span><span style={{ color: '#3e325e' }}>●</span> Other finish</span>
        </div>
      </div>

      {/* Head-to-head */}
      {(() => {
        // Build per-opponent records from shared games
        const records: Record<string, { games: number; wins: number; losses: number; scoreDiffs: number[] }> = {}
        for (const game of playerGames) {
          const myResult = game.player_results.find(r => r.player_name === name)!
          for (const opp of game.player_results) {
            if (opp.player_name === name) continue
            if (!records[opp.player_name]) records[opp.player_name] = { games: 0, wins: 0, losses: 0, scoreDiffs: [] }
            records[opp.player_name].games++
            if (myResult.position === 1) records[opp.player_name].wins++
            else if (opp.position === 1) records[opp.player_name].losses++
            records[opp.player_name].scoreDiffs.push(myResult.total_vp - opp.total_vp)
          }
        }

        const opponents = Object.entries(records).sort((a, b) => b[1].games - a[1].games)
        if (opponents.length === 0) return null

        return (
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.82rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#625c7c', marginBottom: '14px' }}>
              Head-to-head
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
              {opponents.map(([opp, rec]) => {
                const avgDiff = rec.scoreDiffs.reduce((s, v) => s + v, 0) / rec.scoreDiffs.length
                const winRate = (rec.wins / rec.games) * 100
                return (
                  <div key={opp} style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <Link to={`/players/${opp}`} style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.87rem', color: '#ece6ff', textDecoration: 'none' }}>
                        {opp}
                      </Link>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#504270' }}>
                        {rec.games}G
                      </span>
                    </div>
                    {/* W / L bar */}
                    <div style={{ display: 'flex', height: '4px', borderRadius: '2px', overflow: 'hidden', marginBottom: '10px', background: '#282042' }}>
                      {rec.wins > 0 && (
                        <div style={{ width: `${winRate}%`, background: '#4a9e6b', transition: 'width 0.3s' }} />
                      )}
                      {rec.losses > 0 && (
                        <div style={{ width: `${(rec.losses / rec.games) * 100}%`, background: '#e05535', transition: 'width 0.3s' }} />
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#4a9e6b' }}>{rec.wins}W</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#e05535' }}>{rec.losses}L</span>
                        {rec.games - rec.wins - rec.losses > 0 && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#625c7c' }}>
                            {rec.games - rec.wins - rec.losses}—
                          </span>
                        )}
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: avgDiff > 0 ? '#4a9e6b' : avgDiff < 0 ? '#e05535' : '#625c7c' }}>
                        {avgDiff > 0 ? '+' : ''}{avgDiff.toFixed(1)} VP avg
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Games played */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.82rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#625c7c', marginBottom: '14px' }}>
          Game history
        </h2>
        <div style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #282042' }}>
                {['Date', 'Map', 'Corporation', 'Position', 'Score', 'Notes'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#504270' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {playerGames.map((game, i) => {
                const result = game.player_results.find(r => r.player_name === name)!
                return (
                  <tr key={game.id} style={{ borderBottom: i < playerGames.length - 1 ? '1px solid #282042' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#282042')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#8e87a8' }}>
                      <Link to={`/games/${game.id}`} style={{ color: '#8e87a8', textDecoration: 'none' }}>
                        {new Date(game.date).toLocaleDateString('sv-SE')}
                      </Link>
                    </td>
                    <td style={{ padding: '11px 16px', fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: '#ece6ff' }}>{game.map_name ?? '—'}</td>
                    <td style={{ padding: '11px 16px', fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: '#8e87a8' }}>
                      <Link to={`/corporations/${encodeURIComponent(result.corporation)}`} style={{ color: '#8e87a8', textDecoration: 'none' }}>
                        {result.corporation}
                      </Link>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      {result.position === 1
                        ? <span className="win-badge">Winner</span>
                        : <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#625c7c' }}>#{result.position}</span>
                      }
                    </td>
                    <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color: result.position === 1 ? '#c9a030' : '#8e87a8' }}>
                      {result.total_vp}
                    </td>
                    <td style={{ padding: '11px 16px', fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#504270', fontStyle: 'italic' }}>
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

const loadingStyle: React.CSSProperties = {
  padding: '32px 36px',
  color: '#625c7c',
  fontFamily: 'var(--font-body)',
}
