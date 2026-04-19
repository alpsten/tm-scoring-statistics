import { Link } from 'react-router-dom'
import StatCard from '../components/ui/StatCard'
import PageHeader from '../components/ui/PageHeader'
import { useGames, usePlayerStats, useCorpStats } from '../lib/hooks'
import type { GameWithResults, PlayerResult } from '../types/database'

import { EXPANSION_ICONS } from '../lib/expansions'

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


  const mapCounts: Record<string, number> = {}
  for (const g of games ?? []) {
    if (g.map_name) mapCounts[g.map_name] = (mapCounts[g.map_name] ?? 0) + 1
  }
  const topMap = Object.entries(mapCounts).sort((a, b) => b[1] - a[1])[0]

  const corpCounts: Record<string, number> = {}
  for (const r of allResults) {
    if (!r.corporation.includes(', ')) corpCounts[r.corporation] = (corpCounts[r.corporation] ?? 0) + 1
  }
  const topCorpPlayed = Object.entries(corpCounts).sort((a, b) => b[1] - a[1])[0]

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

  const bestCorpWinRate = (() => {
    const eligible = [...(corpStats ?? [])]
      .filter(c => !c.corporation.includes(', ') && c.games_played >= 3)
      .sort((a, b) => b.win_rate - a.win_rate || b.games_played - a.games_played)
    if (eligible.length === 0) return []
    const topRate = eligible[0].win_rate
    return eligible.filter(c => c.win_rate === topRate)
  })()

  const highCardVpResult = allResults.reduce<PlayerResult | null>(
    (best, r) => (!best || r.card_vp > best.card_vp ? r : best), null
  )
  const highCardVpGame = highCardVpResult
    ? (games ?? []).find(g => g.player_results.some(r => r === highCardVpResult))
    : null

  const recentGames = (games ?? []).slice(0, 5)

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <PageHeader
        title="Mission Overview"
        subtitle="Terraforming Mars — match statistics and analysis"
      />

      {/* Stat strip */}
      <div style={{ marginBottom: '36px' }}>
        <h2 style={sectionHeader}>General Stats</h2>
        <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        <StatCard label="Games logged"       value={totalGames}                                   accent="mars"    />
        <StatCard label="Average final score" value={avgScore} valueSuffix="VP" suffixColor="#c9a030" accent="score" />
        <StatCard label="Most played map"  value={topMap?.[0] ?? '—'}        sub={topMap        ? `(${topMap[1]})`        : undefined} accent="neutral" />
        <StatCard label="Most played corp" value={topCorpPlayed?.[0] ?? '—'} sub={topCorpPlayed ? `(${topCorpPlayed[1]})` : undefined} accent="atmo"    />
        </div>
      </div>

      {/* Records */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={sectionHeader}>Records &amp; highlights</h2>
        <div className="records-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {/* All-time high score */}
          <div style={recordCard}>
            <span style={recordLabel}>All-time high score</span>
            {highScoreResult && highScoreGame ? (
              <>
                <span style={{ ...recordValue, color: '#c9a030' }}>
                  {highScoreResult.total_vp}
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 700, color: '#c9a030', marginLeft: '4px' }}>VP</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 400, color: 'var(--text-4)', marginLeft: '6px' }}>with <Link to={`/corporations/${encodeURIComponent(highScoreResult.corporation)}`} style={{ color: '#b87aff', textDecoration: 'none' }}>{highScoreResult.corporation}</Link></span>
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Link to={`/players/${encodeURIComponent(highScoreResult.player_name)}`} style={{ color: '#b87aff', textDecoration: 'none' }}>{highScoreResult.player_name}</Link>
                  <span>·</span>
                  <Link to={`/games/${highScoreGame.game_number}`} style={{ color: 'var(--text-4)', textDecoration: 'none' }}>{new Date(highScoreGame.date).toLocaleDateString('sv-SE')}</Link>
                </span>
              </>
            ) : <span style={recordValue}>—</span>}
          </div>

          {/* Best win rate */}
          <div style={recordCard}>
            <span style={recordLabel}>Best Player Win Rate <span style={{ color: 'var(--bd-secondary)' }}>(min 3 games)</span></span>
            {bestWinRate ? (
              <>
                <span style={{ ...recordValue, color: '#4a9e6b' }}>
                  {Math.round(bestWinRate.win_rate)}
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 700, color: '#4a9e6b', marginLeft: '2px' }}>%</span>
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Link to={`/players/${encodeURIComponent(bestWinRate.player_name)}`} style={{ color: '#b87aff', textDecoration: 'none' }}>{bestWinRate.player_name}</Link>
                  <span>·</span>
                  <span>
                    <span style={{ color: '#4a9e6b' }}>{bestWinRate.wins}</span>
                    {' Wins / '}
                    <span style={{ color: '#e05535' }}>{bestWinRate.games_played - bestWinRate.wins}</span>
                    {' Losses'}
                  </span>
                </span>
              </>
            ) : <span style={recordValue}>—</span>}
          </div>

          {/* Top corporation by avg score */}
          <div style={recordCard}>
            <span style={recordLabel}>Top Corporation by Average Score</span>
            {topCorp ? (
              <>
                <span style={{ ...recordValue, color: '#c9a030' }}>
                  {Math.round(topCorp.avg_score)}
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 700, color: '#c9a030', marginLeft: '4px' }}>VP</span>
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Link to={`/corporations/${encodeURIComponent(topCorp.corporation)}`} style={{ color: '#b87aff', textDecoration: 'none' }}>{topCorp.corporation}</Link>
                  <span>·</span>
                  <span>{topCorp.games_played} games</span>
                  <span>·</span>
                  <span><span style={{ color: topCorp.win_rate < 40 ? '#e05535' : topCorp.win_rate < 60 ? '#c9a030' : '#4a9e6b' }}>{Math.round(topCorp.win_rate)}%</span> win rate</span>
                </span>
              </>
            ) : <span style={recordValue}>—</span>}
          </div>

          {/* Best corporation by win rate */}
          <div style={recordCard}>
            <span style={recordLabel}>Best Corporation by Win Rate <span style={{ color: 'var(--bd-secondary)' }}>(min 3 games)</span></span>
            {bestCorpWinRate.length > 0 ? (
              <>
                <span style={{ ...recordValue, color: '#4a9e6b' }}>
                  {Math.round(bestCorpWinRate[0].win_rate)}
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 700, color: '#4a9e6b', marginLeft: '2px' }}>%</span>
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-4)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {bestCorpWinRate.map((c, i) => (
                    <span key={c.corporation} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {i > 0 && <span style={{ color: 'var(--bd-secondary)' }}>·</span>}
                      <Link to={`/corporations/${encodeURIComponent(c.corporation)}`} style={{ color: '#b87aff', textDecoration: 'none' }}>{c.corporation}</Link>
                      <span style={{ color: 'var(--text-4)' }}>({c.games_played} games)</span>
                    </span>
                  ))}
                </span>
              </>
            ) : <span style={recordValue}>—</span>}
          </div>

          {/* Highest card VP */}
          <div style={recordCard}>
            <span style={recordLabel}>Highest Card VP in a single game</span>
            {highCardVpResult && highCardVpGame ? (
              <>
                <span style={{ ...recordValue, color: '#c9a030' }}>
                  {highCardVpResult.card_vp}
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 700, color: '#c9a030', marginLeft: '4px' }}>VP</span>
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Link to={`/players/${encodeURIComponent(highCardVpResult.player_name)}`} style={{ color: '#b87aff', textDecoration: 'none' }}>{highCardVpResult.player_name}</Link>
                  <span>·</span>
                  <Link to={`/corporations/${encodeURIComponent(highCardVpResult.corporation)}`} style={{ color: '#b87aff', textDecoration: 'none' }}>{highCardVpResult.corporation}</Link>
                  <span>·</span>
                  <Link to={`/games/${highCardVpGame.game_number}`} style={{ color: 'var(--text-4)', textDecoration: 'none' }}>{new Date(highCardVpGame.date).toLocaleDateString('sv-SE')}</Link>
                </span>
              </>
            ) : <span style={recordValue}>—</span>}
          </div>

          {/* Longest game */}
          <div style={recordCard}>
            <span style={recordLabel}>Longest game</span>
            {longestGame && longestGame.generations ? (
              <>
                <span style={{ ...recordValue, color: '#5b8dd9' }}>
                  {longestGame.generations}
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 700, color: '#5b8dd9', marginLeft: '4px' }}>GENERATIONS</span>
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Link to={`/games/${longestGame.game_number}`} style={{ color: '#b87aff', textDecoration: 'none' }}>{longestGame.map_name ?? 'Digital'}</Link>
                  <span>·</span>
                  <span>{new Date(longestGame.date).toLocaleDateString('sv-SE')}</span>
                  <span>·</span>
                  <span>{longestGame.player_count} players</span>
                </span>
              </>
            ) : <span style={recordValue}>—</span>}
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
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '6px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bd-panel)' }}>
                {['#', 'Player', 'Games', 'Wins', 'Win rate', 'Avg score', 'Best Score'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: i <= 1 ? 'left' : 'center', fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...(playerStats ?? [])].sort((a, b) => b.wins - a.wins).map((p, i) => (
                <tr
                  key={p.player_name}
                  style={{ borderBottom: i < (playerStats?.length ?? 0) - 1 ? '1px solid var(--bd-panel)' : 'none', transition: 'background 0.1s', background: 'var(--bg-row)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-row-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-row)')}
                >
                  <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: i === 0 ? '#e05535' : 'var(--text-4)' }}>
                    {i + 1}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <Link to={`/players/${encodeURIComponent(p.player_name)}`} style={{ fontFamily: 'var(--font-body)', fontSize: '0.87rem', color: 'var(--text-1)', textDecoration: 'none', fontWeight: i === 0 ? 600 : 400 }}>
                      {p.player_name}
                    </Link>
                  </td>
                  <td style={numTd}>{p.games_played}</td>
                  <td style={{ ...numTd, color: '#e05535' }}>{p.wins}</td>
                  <td style={{ ...numTd, color: p.win_rate > 50 ? '#4a9e6b' : p.win_rate > 25 ? '#c9a030' : '#707070' }}>
                    {Math.round(p.win_rate)}%
                  </td>
                  <td style={numTd}>{Math.round(p.avg_score)}</td>
                  <td style={{ ...numTd, color: '#c9a030', fontWeight: 700 }}>{p.best_score}<span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.83rem', fontWeight: 700, color: '#c9a030', marginLeft: '3px' }}>VP</span></td>
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

        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '6px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bd-panel)' }}>
                {['Date', 'Map', 'Players', 'Expansions', 'Winner', 'Score'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)' }}>
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
                    style={{ borderBottom: i < recentGames.length - 1 ? '1px solid var(--bd-panel)' : 'none', transition: 'background 0.1s', background: 'var(--bg-row)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-row-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-row)')}
                  >
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-3)' }}>
                      <Link to={`/games/${game.id}`} style={{ color: 'var(--text-3)', textDecoration: 'none' }}>
                        {new Date(game.date).toLocaleDateString('sv-SE')}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: 'var(--text-1)' }}>
                      {game.map_name ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-3)', textAlign: 'center' }}>
                      {game.player_count}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {game.expansions.length === 0 ? (
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--text-4)' }}>—</span>
                      ) : (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {game.expansions.map(exp => EXPANSION_ICONS[exp] ? (
                            <img key={exp} src={EXPANSION_ICONS[exp]} alt={exp} title={exp} style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                          ) : (
                            <span key={exp} style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-4)' }}>{exp}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {winner && (
                        <Link to={`/players/${encodeURIComponent(winner.player_name)}`} style={{ textDecoration: 'none' }}>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: 'var(--text-1)', fontWeight: 500 }}>
                            {winner.player_name}
                          </div>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--text-4)', marginTop: '2px' }}>
                            {winner.corporation}
                          </div>
                        </Link>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700, color: '#c9a030' }}>
                      {winner?.total_vp ?? '—'}
                      {winner && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700, color: '#c9a030', marginLeft: '3px' }}>VP</span>}
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
              background: 'var(--bg-panel)',
              border: '1px solid var(--bd-panel)',
              borderRadius: '6px',
              textDecoration: 'none',
            }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-1)', marginBottom: '6px' }}>
              {label} →
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--text-4)' }}>
              {sub}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

const loadingStyle: React.CSSProperties = { padding: '32px 36px', color: 'var(--text-4)', fontFamily: 'var(--font-body)' }
const sectionHeader: React.CSSProperties = { fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: '14px' }
const numTd: React.CSSProperties = { padding: '11px 16px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.83rem', color: 'var(--text-2)' }
const recordCard: React.CSSProperties = { background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '6px', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }
const recordLabel: React.CSSProperties = { fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-4)', letterSpacing: '0.06em', textTransform: 'uppercase' }
const recordValue: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-1)', lineHeight: 1 }
