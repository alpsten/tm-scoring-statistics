import { Link } from 'react-router-dom'
import StatCard from '../components/ui/StatCard'
import PageHeader from '../components/ui/PageHeader'
import { useGames, usePlayerStats, useCorpStats } from '../lib/hooks'
import type { GameWithResults, PlayerResult } from '../types/database'

export default function Dashboard() {
  const { data: games, isLoading: gamesLoading, error: gamesError } = useGames()
  const { data: playerStats, isLoading: statsLoading } = usePlayerStats()
  const { data: corpStats, isLoading: corpsLoading } = useCorpStats()

  if (gamesLoading || statsLoading || corpsLoading) return <div style={loadingStyle}>Loading…</div>
  if (gamesError) return <div style={loadingStyle}>Failed to load data.</div>

  const allResults = (games ?? []).flatMap(g => g.player_results)
  const totalGames = games?.length ?? 0
  const avgScore = allResults.length
    ? Math.round(allResults.reduce((s, r) => s + r.total_vp, 0) / allResults.length)
    : 0

  const topPlayer = [...(playerStats ?? [])].sort((a, b) => b.wins - a.wins)[0]

  const mapCounts: Record<string, number> = {}
  for (const g of games ?? []) {
    if (g.map_name) mapCounts[g.map_name] = (mapCounts[g.map_name] ?? 0) + 1
  }
  const topMap = Object.entries(mapCounts).sort((a, b) => b[1] - a[1])[0]

  // Records
  const highScoreResult = allResults.reduce<PlayerResult | null>(
    (best, r) => (!best || r.total_vp > best.total_vp ? r : best), null
  )
  const highScoreGame = highScoreResult
    ? (games ?? []).find(g => g.player_results.some(r => r === highScoreResult))
    : null

  const topCorp = [...(corpStats ?? [])]
    .filter(c => !c.corporation.includes(', ') && c.games_played >= 2)
    .sort((a, b) => b.avg_score - a.avg_score)[0]

  const longestGame = (games ?? []).reduce<GameWithResults | null>(
    (best, g) => (!best || (g.generations ?? 0) > (best.generations ?? 0) ? g : best), null
  )

  const bestWinRate = [...(playerStats ?? [])]
    .filter(p => p.games_played >= 3)
    .sort((a, b) => b.win_rate - a.win_rate)[0]

  const recentGames = (games ?? []).slice(0, 5)

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <PageHeader
        title="Mission Overview"
        subtitle="Terraforming Mars — match statistics and analysis"
      />

      {/* Stat strip */}
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard label="Games logged"    value={totalGames}                                   accent="mars"    />
        <StatCard label="Avg final score" value={avgScore}           sub="VP"                  accent="score"   />
        <StatCard label="Leading player"  value={topPlayer?.player_name ?? '—'} sub={topPlayer ? `${topPlayer.wins} wins` : undefined} accent="atmo" />
        <StatCard label="Most played map" value={topMap?.[0] ?? '—'} sub={topMap ? `${topMap[1]} games` : undefined} accent="neutral" />
      </div>

      {/* Records */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={sectionHeader}>Records &amp; highlights</h2>
        <div className="records-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {/* All-time high score */}
          <div style={recordCard}>
            <div style={recordLabel}>All-time high score</div>
            {highScoreResult && highScoreGame ? (
              <>
                <div style={recordValue}>{highScoreResult.total_vp} <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: '#625c7c' }}>VP</span></div>
                <Link to={`/players/${encodeURIComponent(highScoreResult.player_name)}`} style={recordSub}>{highScoreResult.player_name}</Link>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: '#504270', marginTop: '2px' }}>
                  {highScoreResult.corporation} ·{' '}
                  <Link to={`/games/${highScoreGame.id}`} style={{ color: '#504270', textDecoration: 'none' }}>
                    {new Date(highScoreGame.date).toLocaleDateString('sv-SE')}
                  </Link>
                </div>
              </>
            ) : <div style={recordValue}>—</div>}
          </div>

          {/* Best win rate */}
          <div style={recordCard}>
            <div style={recordLabel}>Best win rate <span style={{ color: '#3e325e' }}>(min 3 games)</span></div>
            {bestWinRate ? (
              <>
                <div style={recordValue}>{bestWinRate.win_rate.toFixed(0)}<span style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: '#625c7c' }}>%</span></div>
                <Link to={`/players/${encodeURIComponent(bestWinRate.player_name)}`} style={recordSub}>{bestWinRate.player_name}</Link>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: '#504270', marginTop: '2px' }}>
                  {bestWinRate.wins}W / {bestWinRate.games_played - bestWinRate.wins}L
                </div>
              </>
            ) : <div style={recordValue}>—</div>}
          </div>

          {/* Top corporation by avg score */}
          <div style={recordCard}>
            <div style={recordLabel}>Top corp by avg score</div>
            {topCorp ? (
              <>
                <div style={recordValue}>{topCorp.avg_score.toFixed(1)} <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: '#625c7c' }}>VP</span></div>
                <Link to={`/corporations/${encodeURIComponent(topCorp.corporation)}`} style={recordSub}>{topCorp.corporation}</Link>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: '#504270', marginTop: '2px' }}>
                  {topCorp.games_played} games · {topCorp.win_rate.toFixed(0)}% win rate
                </div>
              </>
            ) : <div style={recordValue}>—</div>}
          </div>

          {/* Longest game */}
          <div style={recordCard}>
            <div style={recordLabel}>Longest game</div>
            {longestGame && longestGame.generations ? (
              <>
                <div style={recordValue}>{longestGame.generations} <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: '#625c7c' }}>gen</span></div>
                <Link to={`/games/${longestGame.id}`} style={recordSub}>{longestGame.map_name ?? 'Digital'}</Link>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: '#504270', marginTop: '2px' }}>
                  {new Date(longestGame.date).toLocaleDateString('sv-SE')} · {longestGame.player_count} players
                </div>
              </>
            ) : <div style={recordValue}>—</div>}
          </div>
        </div>
      </div>

      {/* Player leaderboard */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ ...sectionHeader, margin: 0 }}>Player leaderboard</h2>
          <Link to="/players" style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#9b50f0', textDecoration: 'none' }}>
            Full stats →
          </Link>
        </div>
        <div style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #282042' }}>
                {['#', 'Player', 'Games', 'Wins', 'Win rate', 'Avg score', 'Best'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: i <= 1 ? 'left' : 'right', fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#504270' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...(playerStats ?? [])].sort((a, b) => b.wins - a.wins).map((p, i) => (
                <tr
                  key={p.player_name}
                  style={{ borderBottom: i < (playerStats?.length ?? 0) - 1 ? '1px solid #282042' : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#282042')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: i === 0 ? '#e05535' : '#504270' }}>
                    {i + 1}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <Link to={`/players/${encodeURIComponent(p.player_name)}`} style={{ fontFamily: 'var(--font-body)', fontSize: '0.87rem', color: '#ece6ff', textDecoration: 'none', fontWeight: i === 0 ? 600 : 400 }}>
                      {p.player_name}
                    </Link>
                  </td>
                  <td style={numTd}>{p.games_played}</td>
                  <td style={{ ...numTd, color: '#e05535' }}>{p.wins}</td>
                  <td style={{ ...numTd, color: p.win_rate > 50 ? '#4a9e6b' : p.win_rate > 25 ? '#c9a030' : '#625c7c' }}>
                    {p.win_rate.toFixed(0)}%
                  </td>
                  <td style={numTd}>{p.avg_score.toFixed(1)}</td>
                  <td style={{ ...numTd, color: '#c9a030', fontWeight: 700 }}>{p.best_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent games */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ ...sectionHeader, margin: 0 }}>Recent games</h2>
          <Link to="/games" style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#9b50f0', textDecoration: 'none' }}>
            View all →
          </Link>
        </div>

        <div style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #282042' }}>
                {['Date', 'Map', 'Players', 'Expansions', 'Winner', 'Score'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#504270' }}>
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
                    style={{ borderBottom: i < recentGames.length - 1 ? '1px solid #282042' : 'none', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#282042')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#8e87a8' }}>
                      <Link to={`/games/${game.id}`} style={{ color: '#8e87a8', textDecoration: 'none' }}>
                        {new Date(game.date).toLocaleDateString('sv-SE')}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: '#ece6ff' }}>
                      {game.map_name ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#8e87a8', textAlign: 'center' }}>
                      {game.player_count}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#625c7c' }}>
                      {game.expansions.join(', ') || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {winner && (
                        <Link to={`/players/${encodeURIComponent(winner.player_name)}`} style={{ fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: '#ece6ff', textDecoration: 'none', fontWeight: 500 }}>
                          {winner.player_name}
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: '#625c7c', marginLeft: '6px' }}>
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
      <div className="quick-links-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {[
          { to: '/corporations', label: 'Corporation stats',  sub: `${[...(corpStats ?? [])].filter(c => !c.corporation.includes(', ')).length} corporations played` },
          { to: '/cards',        label: 'Card analysis',      sub: 'Performance by card' },
          { to: '/players',      label: 'Player profiles',    sub: `${playerStats?.length ?? 0} players tracked` },
        ].map(({ to, label, sub }) => (
          <Link
            key={to}
            to={to}
            className="panel-hover"
            style={{
              display: 'block',
              padding: '20px 22px',
              background: '#1e1835',
              border: '1px solid #282042',
              borderRadius: '6px',
              textDecoration: 'none',
            }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9rem', color: '#ece6ff', marginBottom: '6px' }}>
              {label} →
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#625c7c' }}>
              {sub}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

const loadingStyle: React.CSSProperties = { padding: '32px 36px', color: '#625c7c', fontFamily: 'var(--font-body)' }
const sectionHeader: React.CSSProperties = { fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#625c7c', marginBottom: '14px' }
const numTd: React.CSSProperties = { padding: '11px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.83rem', color: '#bbb4d0' }
const recordCard: React.CSSProperties = { background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', padding: '16px 18px' }
const recordLabel: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: '0.67rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#504270', marginBottom: '8px' }
const recordValue: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.6rem', color: '#ece6ff', lineHeight: 1, marginBottom: '6px' }
const recordSub: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: '#b87aff', textDecoration: 'none', display: 'block' }
