import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import { useGames } from '../lib/hooks'
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
    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '6px', overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', background: bg, borderBottom: `1px solid ${border}` }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color }}>{label}</span>
      </div>
      <div style={{ padding: '4px 0' }}>
        {entries.map((e, i) => {
          const badge = (
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color, background: bg, border: `1px solid ${border}`, borderRadius: '4px', padding: '2px 9px', whiteSpace: 'nowrap' as const }}>
              {unit === '+VP' ? `+${e.value} VP` : `${e.value} ${unit}`}
            </span>
          )
          return (
            <div key={e.player} style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: i < entries.length - 1 ? '1px solid var(--bd-panel)' : 'none', gap: '10px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700, color: RANK_COLORS[i], minWidth: '18px' }}>#{i + 1}</span>
              <Link to={`/players/${encodeURIComponent(e.player)}`} style={{ fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: 'var(--text-1)', textDecoration: 'none', flex: 1 }}>
                {e.player}
              </Link>
              {e.gameNumber != null
                ? <Link to={`/games/${e.gameNumber}`} style={{ textDecoration: 'none' }}>{badge}</Link>
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

  if (isLoading) return <div style={{ padding: '32px 36px', color: 'var(--text-4)', fontFamily: 'var(--font-body)' }}>Loading…</div>

  const stats = [
    { label: 'Highest Score',       unit: 'VP',  color: '#c9a030', bg: 'rgba(201,160,48,0.10)',  border: 'rgba(201,160,48,0.35)',  entries: computeBest(games, r => r.total_vp) },
    { label: 'Biggest Win',         unit: '+VP', color: '#c9a030', bg: 'rgba(201,160,48,0.10)',  border: 'rgba(201,160,48,0.35)',  entries: computeBiggestWin(games) },
    { label: 'Terraforming Rating', unit: 'TR',  color: '#e05535', bg: 'rgba(224,85,53,0.10)',   border: 'rgba(224,85,53,0.35)',   entries: computeBest(games, r => r.tr) },
    { label: 'Greenery VP',         unit: 'VP',  color: '#4a9e6b', bg: 'rgba(74,158,107,0.10)',  border: 'rgba(74,158,107,0.35)',  entries: computeBest(games, r => r.greenery_vp) },
    { label: 'City VP',             unit: 'VP',  color: '#8e8e9a', bg: 'rgba(142,142,154,0.10)', border: 'rgba(142,142,154,0.35)', entries: computeBest(games, r => r.city_vp) },
    { label: 'Card VP',             unit: 'VP',  color: '#a0693a', bg: 'rgba(160,105,58,0.10)',  border: 'rgba(160,105,58,0.35)',  entries: computeBest(games, r => r.card_vp) },
    { label: 'Habitat VP',          unit: 'VP',  color: '#8c94b0', bg: 'rgba(140,148,176,0.10)', border: 'rgba(140,148,176,0.35)', entries: computeBest(games, r => r.habitat_vp) },
    { label: 'Mining VP',           unit: 'VP',  color: '#c97b3a', bg: 'rgba(201,123,58,0.10)',  border: 'rgba(201,123,58,0.35)',  entries: computeBest(games, r => r.mining_vp) },
    { label: 'Logistics VP',        unit: 'VP',  color: '#2e8b8b', bg: 'rgba(46,139,139,0.10)',  border: 'rgba(46,139,139,0.35)',  entries: computeBest(games, r => r.logistics_vp) },
  ]

  const moonStats = stats.slice(6)
  const mainStats = stats.slice(0, 6)
  const hasMoon = moonStats.some(s => s.entries.length > 0)

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <PageHeader title="Leaderboard" subtitle="All-time records across all players" />

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(91,141,217,0.08)', border: '1px solid rgba(91,141,217,0.25)', borderRadius: '4px', padding: '8px 14px', marginBottom: '28px', fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#5b8dd9' }}>
        Every record on this page is the best performance achieved in a single game — it does not necessarily mean that player won that game.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px', marginBottom: hasMoon ? '32px' : 0 }}>
        {mainStats.map(s => <LeaderboardCard key={s.label} {...s} />)}
      </div>

      {hasMoon && (
        <>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8c94b0', marginBottom: '12px' }}>
            Moon Expansion
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {moonStats.map(s => <LeaderboardCard key={s.label} {...s} />)}
          </div>
        </>
      )}
    </div>
  )
}
