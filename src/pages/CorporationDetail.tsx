import { useParams, Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import { useGames, useCorpStats } from '../lib/hooks'

export default function CorporationDetail() {
  const { name } = useParams<{ name: string }>()
  const corpName = decodeURIComponent(name ?? '')
  const { data: games, isLoading: gamesLoading } = useGames()
  const { data: corpStats, isLoading: statsLoading } = useCorpStats()

  if (gamesLoading || statsLoading) return <div style={loadingStyle}>Loading…</div>

  const stats = (corpStats ?? []).find(c => c.corporation === corpName)
  const corpGames = (games ?? [])
    .filter(g => g.player_results.some(r => r.corporation === corpName))
    .sort((a, b) => b.date.localeCompare(a.date))

  if (!stats) {
    return <div style={loadingStyle}>Corporation not found. <Link to="/corporations" style={{ color: '#e05535' }}>Back</Link></div>
  }

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/corporations" style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#625c7c', textDecoration: 'none' }}>← Corporations</Link>
      </div>

      <PageHeader title={corpName} subtitle={`${stats.games_played} game${stats.games_played !== 1 ? 's' : ''} on record`} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <StatCard label="Wins"       value={stats.wins}                      sub={`of ${stats.games_played}`} accent="mars"    />
        <StatCard label="Win rate"   value={`${Math.round(stats.win_rate)}%`}                                  accent="atmo"    />
        <StatCard label="Avg score"  value={Math.round(stats.avg_score)}      sub="VP"                        accent="score"   />
        <StatCard label="Best score" value={stats.best_score}                sub="VP"                        accent="neutral" />
      </div>

      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.82rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#625c7c', marginBottom: '14px' }}>
        Game history
      </h2>
      <div style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #282042' }}>
              {['Date', 'Map', 'Player', 'Position', 'Score'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#504270' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {corpGames.map((game, i) => {
              const result = game.player_results.find(r => r.corporation === corpName)!
              return (
                <tr key={game.id} style={{ borderBottom: i < corpGames.length - 1 ? '1px solid #282042' : 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#282042')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#8e87a8' }}>
                    <Link to={`/games/${game.id}`} style={{ color: '#8e87a8', textDecoration: 'none' }}>
                      {new Date(game.date).toLocaleDateString('sv-SE')}
                    </Link>
                  </td>
                  <td style={{ padding: '11px 16px', fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: '#ece6ff' }}>{game.map_name ?? '—'}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <Link to={`/players/${encodeURIComponent(result.player_name)}`} style={{ fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: '#8e87a8', textDecoration: 'none' }}>
                      {result.player_name}
                    </Link>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    {result.position === 1
                      ? <span style={{ display: 'inline-block', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', fontWeight: 700, color: '#4a9e6b', letterSpacing: '0.05em', background: 'rgba(74,158,107,0.12)', border: '1px solid rgba(74,158,107,0.35)', borderRadius: '4px', padding: '2px 7px' }}>WINNER</span>
                      : <span style={{ display: 'inline-block', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', fontWeight: 600, color: '#e05535', letterSpacing: '0.04em', background: 'rgba(224,85,53,0.1)', border: '1px solid rgba(224,85,53,0.3)', borderRadius: '4px', padding: '2px 7px' }}>
                          {['', '', '2ND', '3RD', '4TH', '5TH'][result.position] ?? `${result.position}TH`} PLACE
                        </span>
                    }
                  </td>
                  <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color: result.position === 1 ? '#c9a030' : '#8e87a8' }}>
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

const loadingStyle: React.CSSProperties = {
  padding: '32px 36px',
  color: '#625c7c',
  fontFamily: 'var(--font-body)',
}
