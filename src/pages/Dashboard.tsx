import { Link } from 'react-router-dom'
import StatCard from '../components/ui/StatCard'
import PageHeader from '../components/ui/PageHeader'
import SectionHeading from '../components/ui/SectionHeading'
import { SkeletonHeader, SkeletonStatGrid, SkeletonTable } from '../components/ui/PageSkeleton'
import { useGames, usePlayerStats, useCorpStats } from '../lib/hooks'
import type { GameWithResults, PlayerResult } from '../types/database'
import { isMergerResult } from '../types/database'
import { EXPANSION_ICONS } from '../lib/expansions'
import { cn } from '@/lib/utils'

export default function Dashboard() {
  const { data: games, isLoading: gamesLoading, error: gamesError } = useGames()
  const { data: playerStats, isLoading: statsLoading } = usePlayerStats()
  const { data: corpStats, isLoading: corpsLoading } = useCorpStats()

  if (gamesLoading || statsLoading || corpsLoading)
    return (
      <div className="page-enter py-8 px-9">
        <SkeletonHeader />
        <SkeletonStatGrid count={4} />
        <div className="grid grid-cols-2 gap-6 mt-6">
          <SkeletonTable rows={5} cols={3} />
          <SkeletonTable rows={5} cols={3} />
        </div>
      </div>
    )
  if (gamesError)
    return <div className="py-8 px-9 font-body text-[var(--text-4)]">Failed to load data.</div>

  const allResults = (games ?? []).flatMap(g => g.player_results)
  const totalGames = games?.length ?? 0
  const avgScore   = allResults.length
    ? Math.round(allResults.reduce((s, r) => s + r.total_vp, 0) / allResults.length)
    : 0

  const mapCounts: Record<string, number> = {}
  for (const g of games ?? []) {
    if (g.map_name) mapCounts[g.map_name] = (mapCounts[g.map_name] ?? 0) + 1
  }
  const topMap = Object.entries(mapCounts).sort((a, b) => b[1] - a[1])[0]

  const corpCounts: Record<string, number> = {}
  for (const r of allResults) {
    if (!isMergerResult(r)) corpCounts[r.corporation] = (corpCounts[r.corporation] ?? 0) + 1
  }
  const topCorpPlayed = Object.entries(corpCounts).sort((a, b) => b[1] - a[1])[0]

  const highScoreResult = allResults.reduce<PlayerResult | null>(
    (best, r) => (!best || r.total_vp > best.total_vp ? r : best), null
  )
  const highScoreGame = highScoreResult
    ? (games ?? []).find(g => g.player_results.some(r => r === highScoreResult))
    : null

  const topCorp = [...(corpStats ?? [])]
    .filter(c => c.games_played >= 2)
    .sort((a, b) => b.avg_score - a.avg_score)[0]

  const longestGame = (games ?? []).reduce<GameWithResults | null>(
    (best, g) => (!best || (g.generations ?? 0) > (best.generations ?? 0) ? g : best), null
  )

  const bestWinRate = [...(playerStats ?? [])]
    .filter(p => p.games_played >= 3)
    .sort((a, b) => b.win_rate - a.win_rate)[0]

  const bestCorpWinRate = (() => {
    const eligible = [...(corpStats ?? [])]
      .filter(c => c.games_played >= 3)
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
    <div className="page-enter py-8 px-9">
      <PageHeader title="Mission Overview" subtitle="Terraforming Mars — match statistics and analysis" />

      {/* Stat strip */}
      <div className="mb-9">
        <SectionHeading banner>General Stats</SectionHeading>
        <div className="stat-grid grid grid-cols-2 gap-3">
          <StatCard label="Games logged"        value={totalGames}   accent="mars"  />
          <StatCard label="Average final score" value={avgScore} valueSuffix="VP" suffixColor="#c9a030" accent="score" />
          <StatCard label="Most played map"     value={topMap?.[0] ?? '—'}        sub={topMap        ? `(${topMap[1]})`        : undefined} accent="neutral" />
          <StatCard label="Most played corp"    value={topCorpPlayed?.[0] ?? '—'} sub={topCorpPlayed ? `(${topCorpPlayed[1]})` : undefined} accent="atmo"    />
        </div>
      </div>

      {/* Records */}
      <div className="mb-8">
        <SectionHeading banner>Records &amp; highlights</SectionHeading>
        <div className="records-grid grid grid-cols-2 gap-2">
          {/* All-time high score */}
          <RecordCard label="All-time high score">
            {highScoreResult && highScoreGame ? (
              <>
                <span className="font-mono font-bold text-[0.9rem] text-score-400 leading-none">
                  {highScoreResult.total_vp}
                  <span className="font-body text-[0.9rem] font-bold text-score-400 ml-1">VP</span>
                  <span className="font-body text-[0.78rem] font-normal text-[var(--text-4)] ml-1.5">
                    with <Link to={`/corporations/${encodeURIComponent(highScoreResult.corporation)}`} className="text-violet-400 no-underline hover:text-violet-300">{highScoreResult.corporation}</Link>
                  </span>
                </span>
                <MetaRow>
                  <Link to={`/players/${encodeURIComponent(highScoreResult.player_name)}`} className="text-violet-400 no-underline hover:text-violet-300">{highScoreResult.player_name}</Link>
                  <Dot />
                  <Link to={`/games/${highScoreGame.game_number}`} className="text-[var(--text-4)] no-underline">{new Date(highScoreGame.date).toLocaleDateString('sv-SE')}</Link>
                </MetaRow>
              </>
            ) : <EmptyValue />}
          </RecordCard>

          {/* Best win rate */}
          <RecordCard label={<>Best Player Win Rate <span className="text-[var(--text-4)]">(min 3 games)</span></>}>
            {bestWinRate ? (
              <>
                <span className="font-mono font-bold text-[0.9rem] text-win-500 leading-none">
                  {Math.round(bestWinRate.win_rate)}<span className="ml-0.5">%</span>
                </span>
                <MetaRow>
                  <Link to={`/players/${encodeURIComponent(bestWinRate.player_name)}`} className="text-violet-400 no-underline hover:text-violet-300">{bestWinRate.player_name}</Link>
                  <Dot />
                  <span>
                    <span className="text-win-500">{bestWinRate.wins}</span>
                    {' Wins / '}
                    <span className="text-mars-500">{bestWinRate.games_played - bestWinRate.wins}</span>
                    {' Losses'}
                  </span>
                </MetaRow>
              </>
            ) : <EmptyValue />}
          </RecordCard>

          {/* Top corporation by avg score */}
          <RecordCard label="Top Corporation by Average Score">
            {topCorp ? (
              <>
                <span className="font-mono font-bold text-[0.9rem] text-score-400 leading-none">
                  {Math.round(topCorp.avg_score)}<span className="font-body font-bold ml-1">VP</span>
                </span>
                <MetaRow>
                  <Link to={`/corporations/${encodeURIComponent(topCorp.corporation)}`} className="text-violet-400 no-underline hover:text-violet-300">{topCorp.corporation}</Link>
                  <Dot /><span>{topCorp.games_played} games</span><Dot />
                  <span>
                    <span className={cn(topCorp.win_rate < 40 ? 'text-mars-500' : topCorp.win_rate < 60 ? 'text-score-400' : 'text-win-500')}>
                      {Math.round(topCorp.win_rate)}%
                    </span>
                    {' win rate'}
                  </span>
                </MetaRow>
              </>
            ) : <EmptyValue />}
          </RecordCard>

          {/* Best corporation by win rate */}
          <RecordCard label={<>Best Corporation by Win Rate <span className="text-[var(--text-4)]">(min 3 games)</span></>}>
            {bestCorpWinRate.length > 0 ? (
              <>
                <span className="font-mono font-bold text-[0.9rem] text-win-500 leading-none">
                  {Math.round(bestCorpWinRate[0].win_rate)}<span className="ml-0.5">%</span>
                </span>
                <MetaRow>
                  {bestCorpWinRate.map((c, i) => (
                    <span key={c.corporation} className="inline-flex items-center gap-1.5">
                      {i > 0 && <Dot />}
                      <Link to={`/corporations/${encodeURIComponent(c.corporation)}`} className="text-violet-400 no-underline hover:text-violet-300">{c.corporation}</Link>
                      <span className="text-[var(--text-4)]">({c.games_played} games)</span>
                    </span>
                  ))}
                </MetaRow>
              </>
            ) : <EmptyValue />}
          </RecordCard>

          {/* Highest card VP */}
          <RecordCard label="Highest Card VP in a single game">
            {highCardVpResult && highCardVpGame ? (
              <>
                <span className="font-mono font-bold text-[0.9rem] text-score-400 leading-none">
                  {highCardVpResult.card_vp}<span className="font-body font-bold ml-1">VP</span>
                </span>
                <MetaRow>
                  <Link to={`/players/${encodeURIComponent(highCardVpResult.player_name)}`} className="text-violet-400 no-underline hover:text-violet-300">{highCardVpResult.player_name}</Link>
                  <Dot />
                  <Link to={`/corporations/${encodeURIComponent(highCardVpResult.corporation)}`} className="text-violet-400 no-underline hover:text-violet-300">{highCardVpResult.corporation}</Link>
                  <Dot />
                  <Link to={`/games/${highCardVpGame.game_number}`} className="text-[var(--text-4)] no-underline">{new Date(highCardVpGame.date).toLocaleDateString('sv-SE')}</Link>
                </MetaRow>
              </>
            ) : <EmptyValue />}
          </RecordCard>

          {/* Longest game */}
          <RecordCard label="Longest game">
            {longestGame && longestGame.generations ? (
              <>
                <span className="font-mono font-bold text-[0.9rem] text-[#5b8dd9] leading-none">
                  {longestGame.generations}<span className="font-body font-bold ml-1">GENERATIONS</span>
                </span>
                <MetaRow>
                  <Link to={`/games/${longestGame.game_number}`} className="text-violet-400 no-underline hover:text-violet-300">{longestGame.map_name ?? 'Digital'}</Link>
                  <Dot /><span>{new Date(longestGame.date).toLocaleDateString('sv-SE')}</span>
                  <Dot /><span>{longestGame.player_count} players</span>
                </MetaRow>
              </>
            ) : <EmptyValue />}
          </RecordCard>
        </div>
      </div>

      {/* Player leaderboard */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <SectionHeading banner>Player leaderboard</SectionHeading>
          <Link to="/players" className="font-body text-[0.78rem] text-violet-500 no-underline hover:text-violet-400">
            Full stats →
          </Link>
        </div>
        <div className="bg-card border border-border rounded-[6px] overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                {['#', 'Player', 'Games', 'Wins', 'Win rate', 'Avg score', 'Best Score'].map((h, i) => (
                  <th key={h} className={cn('py-2.5 px-4 font-body text-[0.75rem] font-semibold tracking-[0.08em] uppercase text-[var(--text-4)]', i <= 1 ? 'text-left' : 'text-center')}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...(playerStats ?? [])].sort((a, b) => b.wins - a.wins).map((p, i) => (
                <tr key={p.player_name} className={cn('bg-secondary hover:bg-accent transition-colors', i < (playerStats?.length ?? 0) - 1 && 'border-b border-border')}>
                  <td className={cn('py-[11px] px-4 font-mono text-[0.72rem]', i === 0 ? 'text-mars-500' : 'text-[var(--text-4)]')}>
                    {i + 1}
                  </td>
                  <td className="py-[11px] px-4">
                    <Link to={`/players/${encodeURIComponent(p.player_name)}`} className={cn('font-body text-[0.87rem] text-foreground no-underline hover:text-mars-400', i === 0 && 'font-semibold')}>
                      {p.player_name}
                    </Link>
                  </td>
                  <td className="py-[11px] px-4 text-center font-mono text-[0.83rem] text-secondary-foreground">{p.games_played}</td>
                  <td className="py-[11px] px-4 text-center font-mono text-[0.83rem] text-mars-500">{p.wins}</td>
                  <td className={cn('py-[11px] px-4 text-center font-mono text-[0.83rem]', p.win_rate > 50 ? 'text-win-500' : p.win_rate > 25 ? 'text-score-400' : 'text-[var(--text-4)]')}>
                    {Math.round(p.win_rate)}%
                  </td>
                  <td className="py-[11px] px-4 text-center font-mono text-[0.83rem] text-secondary-foreground">{Math.round(p.avg_score)}</td>
                  <td className="py-[11px] px-4 text-center font-mono text-[0.83rem] font-bold text-score-400">
                    {p.best_score}<span className="ml-[3px]">VP</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent games */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <SectionHeading banner>Recent games</SectionHeading>
          <Link to="/games" className="font-body text-[0.78rem] text-violet-500 no-underline hover:text-violet-400">
            View all →
          </Link>
        </div>
        <div className="bg-card border border-border rounded-[6px] overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                {['Date', 'Map', 'Players', 'Expansions', 'Winner', 'Score'].map(h => (
                  <th key={h} className="py-2.5 px-4 text-left font-body text-[0.7rem] font-semibold tracking-[0.08em] uppercase text-[var(--text-4)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentGames.map((game, i) => {
                const winner = game.player_results.find(r => r.position === 1)
                return (
                  <tr key={game.id} className={cn('bg-secondary hover:bg-accent transition-colors', i < recentGames.length - 1 && 'border-b border-border')}>
                    <td className="py-3 px-4 font-mono text-[0.78rem] text-muted-foreground">
                      <Link to={`/games/${game.id}`} className="text-muted-foreground no-underline hover:text-foreground">
                        {new Date(game.date).toLocaleDateString('sv-SE')}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-body text-[0.83rem] text-foreground">{game.map_name ?? '—'}</td>
                    <td className="py-3 px-4 font-mono text-[0.78rem] text-muted-foreground text-center">{game.player_count}</td>
                    <td className="py-3 px-4">
                      {game.expansions.length === 0 ? (
                        <span className="font-body text-[0.75rem] text-[var(--text-4)]">—</span>
                      ) : (
                        <div className="flex gap-1 flex-wrap items-center">
                          {game.expansions.map(exp => EXPANSION_ICONS[exp] ? (
                            <img key={exp} src={EXPANSION_ICONS[exp]} alt={exp} title={exp} className="w-5 h-5 object-contain" />
                          ) : (
                            <span key={exp} className="font-body text-[0.72rem] text-[var(--text-4)]">{exp}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {winner && (
                        <Link to={`/players/${encodeURIComponent(winner.player_name)}`} className="no-underline">
                          <div className="font-body text-[0.83rem] text-foreground font-medium">{winner.player_name}</div>
                          <div className="font-body text-[0.7rem] text-[var(--text-4)] mt-[2px]">{winner.corporation}</div>
                        </Link>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[0.9rem] font-bold text-score-400">
                      {winner?.total_vp ?? '—'}
                      {winner && <span className="ml-[3px]">VP</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick links */}
      <div className="quick-links-grid grid grid-cols-3 gap-4">
        {[
          { to: '/corporations', label: 'Corporation stats', sub: `${(corpStats ?? []).length} corporations played` },
          { to: '/cards',        label: 'Card analysis',     sub: 'Performance by card' },
          { to: '/players',      label: 'Player profiles',   sub: `${playerStats?.length ?? 0} players tracked` },
        ].map(({ to, label, sub }) => (
          <Link
            key={to}
            to={to}
            className="panel-hover block py-5 px-[22px] bg-card border border-border rounded-[6px] no-underline"
          >
            <div className="font-display font-semibold text-[0.9rem] text-foreground mb-1.5">{label} →</div>
            <div className="font-body text-[0.78rem] text-[var(--text-4)]">{sub}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function RecordCard({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-[6px] px-5 py-3.5 flex flex-col gap-1.5">
      <span className="font-body text-[0.72rem] font-medium text-[var(--text-4)] tracking-[0.06em] uppercase">{label}</span>
      {children}
    </div>
  )
}

function MetaRow({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-body text-[0.72rem] text-[var(--text-4)] flex items-center gap-2 flex-wrap">{children}</span>
  )
}

function Dot() {
  return <span>·</span>
}

function EmptyValue() {
  return <span className="font-mono font-bold text-[0.9rem] text-foreground leading-none">—</span>
}
