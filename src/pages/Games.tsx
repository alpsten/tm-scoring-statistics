import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import { useGames } from '../lib/hooks'

export default function Games() {
  const { data, isLoading, error } = useGames()

  if (isLoading) return <div style={loadingStyle}>Loading…</div>
  if (error) return <div style={loadingStyle}>Failed to load data.</div>

  const games = data ?? []

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <PageHeader
        title="Games"
        subtitle={`${games.length} sessions logged`}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {games.map(game => {
          const sorted = [...game.player_results].sort((a, b) => a.position - b.position)

          return (
            <Link
              key={game.id}
              to={`/games/${game.id}`}
              className="panel-hover"
              style={{
                display: 'block',
                background: '#1e1835',
                border: '1px solid #282042',
                borderRadius: '6px',
                padding: '20px 24px',
                textDecoration: 'none',
              }}
            >
              {/* Game header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: '#ece6ff' }}>
                      {game.map_name ?? 'Digital'}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#504270', letterSpacing: '0.05em' }}>
                      {game.id}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#625c7c' }}>
                    <span>{new Date(game.date).toLocaleDateString('sv-SE')}</span>
                    <span>{game.player_count} players</span>
                    {game.generations && <span>{game.generations} generations</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {game.expansions.map(exp => (
                    <span
                      key={exp}
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.68rem',
                        padding: '2px 8px',
                        borderRadius: '3px',
                        background: 'rgba(46, 139, 139, 0.08)',
                        color: '#2e8b8b',
                        border: '1px solid rgba(46, 139, 139, 0.2)',
                      }}
                    >
                      {exp}
                    </span>
                  ))}
                </div>
              </div>

              {/* Player result rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {sorted.map(result => (
                  <div
                    key={result.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      background: result.position === 1 ? 'rgba(224, 85, 53, 0.04)' : 'transparent',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: result.position === 1 ? '#e05535' : '#504270', width: '16px' }}>
                      #{result.position}
                    </span>
                    <span style={{ fontFamily: 'var(--font-body)', fontWeight: result.position === 1 ? 600 : 400, fontSize: '0.85rem', color: result.position === 1 ? '#ece6ff' : '#bbb4d0', minWidth: '130px' }}>
                      {result.player_name}
                    </span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#625c7c', flex: 1 }}>
                      {result.corporation}
                    </span>
                    {result.key_notes && (
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: '#504270', fontStyle: 'italic', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {result.key_notes}
                      </span>
                    )}
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem', color: result.position === 1 ? '#c9a030' : '#8e87a8', marginLeft: 'auto' }}>
                      {result.total_vp}
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: '#504270', marginLeft: '3px', fontWeight: 400 }}>VP</span>
                    </span>
                  </div>
                ))}
              </div>

              {game.notes && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #282042', fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#504270', fontStyle: 'italic' }}>
                  {game.notes}
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

const loadingStyle: React.CSSProperties = {
  padding: '32px 36px',
  color: '#625c7c',
  fontFamily: 'var(--font-body)',
}
