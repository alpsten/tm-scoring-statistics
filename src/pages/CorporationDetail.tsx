import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import PositionBadge from '../components/ui/PositionBadge'
import SectionHeading from '../components/ui/SectionHeading'
import DataTable from '../components/ui/DataTable'
import type { DataTableColumn } from '../components/ui/DataTable'
import { useGames, useCorpStats } from '../lib/hooks'

type CorpGameRow = {
  id: string
  game_number: number | null
  date: string
  map_name: string | null
  player_name: string
  position: number
  total_vp: number
}

const columns: DataTableColumn<CorpGameRow>[] = [
  {
    key: 'date',
    label: 'Date',
    tdStyle: { fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-3)' },
    render: r => r.game_number != null ? (
      <Link to={`/games/${r.game_number}`} style={{ color: 'var(--text-3)', textDecoration: 'none' }}>
        {new Date(r.date).toLocaleDateString('sv-SE')}
      </Link>
    ) : <>{new Date(r.date).toLocaleDateString('sv-SE')}</>,
  },
  {
    key: 'map_name',
    label: 'Map',
    tdStyle: { fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: 'var(--text-1)' },
    render: r => <>{r.map_name ?? '—'}</>,
  },
  {
    key: 'player_name',
    label: 'Player',
    tdStyle: { fontFamily: 'var(--font-body)', fontSize: '0.83rem' },
    render: r => (
      <Link to={`/players/${encodeURIComponent(r.player_name)}`} style={{ color: 'var(--text-3)', textDecoration: 'none' }}>
        {r.player_name}
      </Link>
    ),
  },
  {
    key: 'position',
    label: 'Position',
    render: r => <PositionBadge position={r.position} />,
  },
  {
    key: 'total_vp',
    label: 'Score',
    tdStyle: { fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem' },
    render: r => (
      <span style={{ color: r.position === 1 ? '#c9a030' : 'var(--text-3)' }}>
        {r.total_vp}<span style={{ marginLeft: '3px' }}>VP</span>
      </span>
    ),
  },
]

export default function CorporationDetail() {
  const { name } = useParams<{ name: string }>()
  const corpName = decodeURIComponent(name ?? '')
  const { data: games, isLoading: gamesLoading } = useGames()
  const { data: corpStats, isLoading: statsLoading } = useCorpStats()
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  if (gamesLoading || statsLoading) return <div style={loadingStyle}>Loading…</div>

  const stats = (corpStats ?? []).find(c => c.corporation === corpName)
  const corpGames = (games ?? [])
    .filter(g => g.player_results.some(r => r.corporation === corpName))
    .sort((a, b) => b.date.localeCompare(a.date))

  if (!stats) {
    return <div style={loadingStyle}>Corporation not found. <Link to="/corporations" style={{ color: '#e05535' }}>Back</Link></div>
  }

  const tableRows: CorpGameRow[] = corpGames.map(game => {
    const result = game.player_results.find(r => r.corporation === corpName)!
    return {
      id: game.id,
      game_number: game.game_number,
      date: game.date,
      map_name: game.map_name,
      player_name: result.player_name,
      position: result.position,
      total_vp: result.total_vp,
    }
  })

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/corporations" style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: 'var(--text-4)', textDecoration: 'none' }}>← Corporations</Link>
      </div>

      <PageHeader title={corpName} subtitle={`${stats.games_played} game${stats.games_played !== 1 ? 's' : ''} on record`} />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <StatCard label="Wins"       value={stats.wins}                      sub={`of ${stats.games_played}`} accent="win"   />
        <StatCard label="Win rate"   value={`${Math.round(stats.win_rate)}%`}                                  accent="atmo"  />
        <StatCard label="Avg score"  value={Math.round(stats.avg_score)}      valueSuffix="VP"                 accent="score" />
        <StatCard label="Best score" value={stats.best_score}                valueSuffix="VP"                 accent="score" badge />
      </div>

      <SectionHeading>Game history</SectionHeading>
      <DataTable columns={columns} rows={tableRows} rowKey={r => r.id} compact />
    </div>
  )
}

const loadingStyle: React.CSSProperties = {
  padding: '32px 36px',
  color: 'var(--text-4)',
  fontFamily: 'var(--font-body)',
}
