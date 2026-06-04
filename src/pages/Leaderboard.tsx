import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import { SkeletonHeader, SkeletonCardGrid } from '../components/ui/PageSkeleton'
import { useGames } from '../lib/hooks'
import { cn } from '@/lib/utils'
import type { GameWithResults } from '../types/database'

type Entry = { player: string; value: number; gameNumber: number | null }

function computeBest(
  games: GameWithResults[] | undefined,
  getValue: (r: GameWithResults['player_results'][0]) => number | null,
): Entry[] {
  const best: Record<string, Entry> = {}
  for (const g of games ?? []) {
    for (const r of g.player_results) {
      const v = getValue(r)
      if (v === null || v === undefined) continue
      if (!best[r.player_name] || v > best[r.player_name].value)
        best[r.player_name] = { player: r.player_name, value: v, gameNumber: g.game_number }
    }
  }
  return Object.values(best).sort((a, b) => b.value - a.value).slice(0, 5)
}

function computeBiggestWin(games: GameWithResults[] | undefined): Entry[] {
  const best: Record<string, Entry> = {}
  for (const g of games ?? []) {
    const winner = g.player_results.find(r => r.position === 1)
    const second = g.player_results.find(r => r.position === 2)
    if (!winner || !second) continue
    const margin = winner.total_vp - second.total_vp
    if (!best[winner.player_name] || margin > best[winner.player_name].value)
      best[winner.player_name] = { player: winner.player_name, value: margin, gameNumber: g.game_number }
  }
  return Object.values(best).sort((a, b) => b.value - a.value).slice(0, 5)
}

const RANK_COLORS = ['#c9a030', '#9ea8b8', '#c97b3a', 'var(--text-4)', 'var(--text-4)']

function LeaderboardCard({ label, unit, color, bg, border, entries }: {
  label: string
  unit: string
  color: string
  bg: string
  border: string
  entries: Entry[]
}) {
  if (entries.length === 0) return null
  return (
    <div className="bg-card border border-border rounded-[6px] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border">
        <span className="font-display font-bold text-[0.75rem] tracking-[0.1em] uppercase text-[var(--text-4)]">
          {label}
        </span>
      </div>
      <div className="py-1">
        {entries.map((e, i) => {
          const badge = (
            <span
              className="font-mono font-bold text-[0.85rem] border rounded px-[9px] py-[2px] min-w-[82px] inline-block text-center"
              style={{ color, background: bg, borderColor: border }}
            >
              {unit === '+VP' ? `+${e.value} VP` : `${e.value} ${unit}`}
            </span>
          )
          return (
            <div
              key={e.player}
              className={cn(
                'flex items-center px-4 py-2 gap-2.5',
                i < entries.length - 1 && 'border-b border-border'
              )}
            >
              <span className="font-mono text-[0.78rem] font-bold min-w-[22px]" style={{ color: RANK_COLORS[i] }}>
                #{i + 1}
              </span>
              <Link
                to={`/players/${encodeURIComponent(e.player)}`}
                className="font-body text-[0.83rem] text-foreground no-underline flex-1 hover:text-mars-400 transition-colors"
              >
                {e.player}
              </Link>
              {e.gameNumber != null
                ? <Link to={`/games/${e.gameNumber}`} className="no-underline">{badge}</Link>
                : badge}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Leaderboard() {
  const { data: games, isLoading } = useGames()

  if (isLoading) return (
    <div className="page-enter py-8 px-9">
      <SkeletonHeader />
      <SkeletonCardGrid count={6} />
    </div>
  )

  const gold = { color: '#e8c84a', bg: 'rgba(232,200,74,0.28)',  border: 'rgba(232,200,74,0.60)'  }
  const fire = { color: '#ff7a60', bg: 'rgba(255,122,96,0.28)',  border: 'rgba(255,122,96,0.60)'  }

  const stats = [
    { label: 'Highest Score',       unit: 'VP',  ...gold, entries: computeBest(games, r => r.total_vp) },
    { label: 'Biggest Win',         unit: '+VP', ...gold, entries: computeBiggestWin(games) },
    { label: 'Terraforming Rating', unit: 'TR',  ...fire, entries: computeBest(games, r => r.tr) },
    { label: 'Greenery VP',         unit: 'VP',  ...gold, entries: computeBest(games, r => r.greenery_vp) },
    { label: 'City VP',             unit: 'VP',  ...gold, entries: computeBest(games, r => r.city_vp) },
    { label: 'Card VP',             unit: 'VP',  ...gold, entries: computeBest(games, r => r.card_vp) },
    { label: 'Habitat VP',          unit: 'VP',  ...gold, entries: computeBest(games, r => r.habitat_vp) },
    { label: 'Mining VP',           unit: 'VP',  ...gold, entries: computeBest(games, r => r.mining_vp) },
    { label: 'Logistics VP',        unit: 'VP',  ...gold, entries: computeBest(games, r => r.logistics_vp) },
  ]

  const mainStats = stats.slice(0, 6)
  const moonStats = stats.slice(6)
  const hasMoon = moonStats.some(s => s.entries.length > 0)

  return (
    <div className="page-enter py-8 px-9">
      <PageHeader title="Leaderboard" subtitle="All-time records across all players" />

      <div className="bg-card border border-border rounded-[6px] px-4 py-3 mb-7 font-body text-[0.78rem] text-[var(--text-3)]">
        Every record on this page is the best performance achieved in a single game — it does not necessarily mean that player won that game.
      </div>

      <div className={cn('grid gap-4', hasMoon && 'mb-8')} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
        {mainStats.map(s => <LeaderboardCard key={s.label} {...s} />)}
      </div>

      {hasMoon && (
        <>
          <div className="font-display font-semibold text-[0.72rem] tracking-[0.12em] uppercase text-[#8c94b0] mb-3">
            Moon Expansion
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
            {moonStats.map(s => <LeaderboardCard key={s.label} {...s} />)}
          </div>
        </>
      )}
    </div>
  )
}
