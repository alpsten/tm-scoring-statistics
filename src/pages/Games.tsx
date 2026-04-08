import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import { useGames } from '../lib/hooks'

export default function Games() {
  const { data, isLoading, error } = useGames()
  const [search, setSearch]             = useState('')
  const [mapFilter, setMapFilter]       = useState('')
  const [expansionFilter, setExpansionFilter] = useState('')

  if (isLoading) return <div style={loadingStyle}>Loading…</div>
  if (error) return <div style={loadingStyle}>Failed to load data.</div>

  const games = data ?? []
  const allMaps = [...new Set(games.map(g => g.map_name).filter(Boolean) as string[])].sort()
  const allExpansions = [...new Set(games.flatMap(g => g.expansions))].sort()

  const filtered = games.filter(g => {
    if (mapFilter && g.map_name !== mapFilter) return false
    if (expansionFilter && !g.expansions.includes(expansionFilter)) return false
    if (search) {
      const q = search.toLowerCase()
      const matchesPlayer = g.player_results.some(r => r.player_name.toLowerCase().includes(q))
      const matchesMap    = g.map_name?.toLowerCase().includes(q) ?? false
      if (!matchesPlayer && !matchesMap) return false
    }
    return true
  })

  const hasFilters = !!search || !!mapFilter || !!expansionFilter

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <PageHeader
        title="Games"
        subtitle={hasFilters ? `${filtered.length} of ${games.length} sessions` : `${games.length} sessions logged`}
      />

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search player or map…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '220px', height: '34px', padding: '0 12px',
            background: '#1e1835', border: '1px solid #3e325e', borderRadius: '4px',
            color: '#ece6ff', fontFamily: 'var(--font-body)', fontSize: '0.83rem', outline: 'none',
          }}
        />

        <select
          value={mapFilter}
          onChange={e => setMapFilter(e.target.value)}
          style={{
            height: '34px', padding: '0 10px',
            background: mapFilter ? 'rgba(155,80,240,0.08)' : '#1e1835',
            border: `1px solid ${mapFilter ? '#9b50f0' : '#3e325e'}`, borderRadius: '4px',
            color: mapFilter ? '#b87aff' : '#8e87a8', fontFamily: 'var(--font-body)', fontSize: '0.83rem',
            outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">All maps</option>
          {allMaps.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <select
          value={expansionFilter}
          onChange={e => setExpansionFilter(e.target.value)}
          style={{
            height: '34px', padding: '0 10px',
            background: expansionFilter ? 'rgba(46,139,139,0.08)' : '#1e1835',
            border: `1px solid ${expansionFilter ? '#2e8b8b' : '#3e325e'}`, borderRadius: '4px',
            color: expansionFilter ? '#3bbfbf' : '#8e87a8', fontFamily: 'var(--font-body)', fontSize: '0.83rem',
            outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">All expansions</option>
          {allExpansions.map(e => <option key={e} value={e}>{e}</option>)}
        </select>

        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setMapFilter(''); setExpansionFilter('') }}
            style={{
              height: '34px', padding: '0 12px',
              background: 'transparent', border: '1px solid #3e325e', borderRadius: '4px',
              color: '#625c7c', fontFamily: 'var(--font-body)', fontSize: '0.78rem', cursor: 'pointer',
            }}
          >
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: '#504270' }}>
          No games match the current filters.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filtered.map(game => {
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
                        GameID {game.id}
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
                          fontFamily: 'var(--font-body)', fontSize: '0.68rem',
                          padding: '2px 8px', borderRadius: '3px',
                          background: 'rgba(46, 139, 139, 0.08)', color: '#2e8b8b',
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
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '6px 10px', borderRadius: '4px',
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
      )}
    </div>
  )
}

const loadingStyle: React.CSSProperties = {
  padding: '32px 36px',
  color: '#625c7c',
  fontFamily: 'var(--font-body)',
}
