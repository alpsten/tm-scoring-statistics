import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import { useGames, usePlayerProfiles } from '../lib/hooks'
import { EXPANSION_ICONS, MAP_PILL, ALL_MAPS, ALL_EXPANSIONS } from '../lib/expansions'

export default function Games() {
  const { data, isLoading, error } = useGames()
  const { data: profiles = [] } = usePlayerProfiles()
  const profileColors = Object.fromEntries(profiles.map(p => [p.player_name, p.preferred_color]))
  const [search, setSearch]               = useState('')
  const [mapFilters, setMapFilters]       = useState<string[]>([])
  const [expansionFilters, setExpansionFilters] = useState<string[]>([])

  if (isLoading) return <div style={loadingStyle}>Loading…</div>
  if (error) return <div style={loadingStyle}>Failed to load data.</div>

  const games = data ?? []
  const normalizeExp = (e: string) => e === 'Venus' ? 'Venus Next' : e

  const filtered = games.filter(g => {
    if (mapFilters.length > 0 && !mapFilters.includes(g.map_name ?? '')) return false
    if (expansionFilters.length > 0 && !expansionFilters.some(e => g.expansions.map(normalizeExp).includes(e))) return false
    if (search) {
      const q = search.toLowerCase()
      const matchesPlayer = g.player_results.some(r => r.player_name.toLowerCase().includes(q))
      const matchesMap    = g.map_name?.toLowerCase().includes(q) ?? false
      if (!matchesPlayer && !matchesMap) return false
    }
    return true
  }).sort((a, b) => (b.game_number ?? 0) - (a.game_number ?? 0))

  const hasFilters = !!search || mapFilters.length > 0 || expansionFilters.length > 0

  function formatCorp(corp: string) {
    const parts = corp.split(', ')
    if (parts.length === 1) return corp
    return parts.join(' + ') + ' (Merger)'
  }

  function expDisplayName(n: string) {
    if (n === 'Venus') return 'Venus Next'
    if (n === 'Moon') return 'The Moon'
    return n
  }

  function toggleMap(map: string) {
    setMapFilters(prev => prev.includes(map) ? prev.filter(m => m !== map) : [...prev, map])
  }
  function toggleExpansion(exp: string) {
    setExpansionFilters(prev => prev.includes(exp) ? prev.filter(e => e !== exp) : [...prev, exp])
  }

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <PageHeader
        title="Games"
        subtitle={hasFilters ? `${filtered.length} of ${games.length} sessions` : `${games.length} sessions logged`}
      />

      {/* Filter bar */}
      <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Search */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search player or map…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '220px', height: '34px', padding: '0 12px',
              background: 'var(--bg-input)', border: '1px solid var(--bd-input)', borderRadius: '4px',
              color: 'var(--text-1)', fontFamily: 'var(--font-body)', fontSize: '0.83rem', outline: 'none',
            }}
          />
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setMapFilters([]); setExpansionFilters([]) }}
              style={{
                height: '34px', padding: '0 12px',
                background: 'transparent', border: '1px solid var(--bd-input)', borderRadius: '4px',
                color: 'var(--text-4)', fontFamily: 'var(--font-body)', fontSize: '0.78rem', cursor: 'pointer',
              }}
            >
              Clear all
            </button>
          )}
        </div>

        {/* Map pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{
            display: 'inline-block', alignSelf: 'flex-start',
            fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: '#5b8dd9', padding: '3px 10px', borderRadius: '4px',
            background: 'rgba(91,141,217,0.12)', border: '1px solid rgba(91,141,217,0.25)',
          }}>Map-Selection</span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingLeft: '2px' }}>
            {ALL_MAPS.map(map => {
              const active = mapFilters.includes(map)
              return (
                <button key={map} onClick={() => toggleMap(map)} style={{
                  padding: '4px 12px',
                  background: active ? 'rgba(91,141,217,0.15)' : 'transparent',
                  border: `1px solid ${active ? '#5b8dd9' : 'var(--bd-input)'}`,
                  borderRadius: '4px', cursor: 'pointer', transition: 'all 0.12s',
                  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.75rem',
                  color: active ? '#5b8dd9' : 'var(--text-4)',
                }}>
                  {active ? '✓ ' : ''}{map}
                </button>
              )
            })}
          </div>
        </div>

        {/* Expansion pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{
            display: 'inline-block', alignSelf: 'flex-start',
            fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: '#5b8dd9', padding: '3px 10px', borderRadius: '4px',
            background: 'rgba(91,141,217,0.12)', border: '1px solid rgba(91,141,217,0.25)',
          }}>Expansion-Selection</span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingLeft: '2px' }}>
            {ALL_EXPANSIONS.map(exp => {
              const active = expansionFilters.includes(exp)
              return (
                <button key={exp} onClick={() => toggleExpansion(exp)} style={{
                  padding: '4px 10px',
                  background: active ? 'rgba(91,141,217,0.12)' : 'transparent',
                  border: `1px solid ${active ? '#5b8dd9' : 'var(--bd-input)'}`,
                  borderRadius: '4px', cursor: 'pointer', transition: 'all 0.12s',
                  fontFamily: 'var(--font-body)', fontSize: '0.75rem',
                  color: active ? '#5b8dd9' : 'var(--text-4)',
                  display: 'flex', alignItems: 'center', gap: '5px',
                }}>
                  {EXPANSION_ICONS[exp] && <img src={EXPANSION_ICONS[exp]} alt={exp} style={{ width: '14px', height: '14px', objectFit: 'contain' }} />}
                  {active ? '✓ ' : ''}{expDisplayName(exp)}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No games match the current filters." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filtered.map(game => {
            const sorted = [...game.player_results].sort((a, b) => a.position - b.position)
            const gameNum = game.game_number

            return (
              <Link
                key={game.id}
                to={`/games/${gameNum}`}
                className="panel-hover"
                style={{
                  display: 'block',
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--bd-panel)',
                  borderRadius: '6px',
                  padding: '16px 20px',
                  textDecoration: 'none',
                }}
              >
                {/* Game header */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={MAP_PILL}>{game.map_name ?? 'Digital'}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#5b8dd9', letterSpacing: '0.05em' }}>#{gameNum}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--text-4)' }}>
                    {new Date(game.date).toLocaleDateString('sv-SE')} · {game.player_count} players{game.generations ? ` · ${game.generations} gen` : ''}
                  </div>
                </div>

                {/* Expansions */}
                {game.expansions.length > 0 && (
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid var(--bd-panel)', alignItems: 'center' }}>
                    {game.expansions.map(exp => {
                      const icon = EXPANSION_ICONS[exp] ?? EXPANSION_ICONS[normalizeExp(exp)]
                      return icon ? (
                        <img key={exp} src={icon} alt={exp} title={exp} style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                      ) : (
                        <span key={exp} style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '3px', background: 'rgba(46,139,139,0.08)', color: '#2e8b8b', border: '1px solid rgba(46,139,139,0.2)' }}>
                          {expDisplayName(exp)}
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Player result rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {sorted.map(result => (
                    <div
                      key={result.id}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '10px',
                        padding: '6px 10px', borderRadius: '4px',
                        background: result.position === 1 ? 'rgba(74, 158, 107, 0.06)' : 'transparent',
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: result.position === 1 ? '#4a9e6b' : '#888888', width: '20px', flexShrink: 0, paddingTop: '3px' }}>
                        #{result.position}
                      </span>
                      {profileColors[result.player_name] && (
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: profileColors[result.player_name]!, border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0, marginTop: '3px' }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                            <span style={{ fontFamily: 'var(--font-body)', fontWeight: result.position === 1 ? 600 : 400, fontSize: '0.87rem', color: result.position === 1 ? 'var(--text-1)' : 'var(--text-2)' }}>
                              {result.player_name}
                            </span>
                            {result.ceo && (
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#d07832', background: 'rgba(210,120,50,0.1)', border: '1px solid rgba(210,120,50,0.3)', borderRadius: '4px', padding: '1px 6px', flexShrink: 0 }}>
                                {result.ceo}
                              </span>
                            )}
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color: result.position === 1 ? '#c9a030' : 'var(--text-3)', flexShrink: 0 }}>
                            {result.total_vp}
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: result.position === 1 ? '#c9a030' : 'var(--text-3)', marginLeft: '3px', fontWeight: 700 }}>VP</span>
                          </span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--text-4)', marginTop: '1px' }}>
                          {formatCorp(result.corporation)}
                        </div>
                        {result.key_notes && (
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-4)', fontStyle: 'italic', marginTop: '2px' }}>
                            {result.key_notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {game.notes && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--bd-panel)', fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--text-4)', fontStyle: 'italic' }}>
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
  color: 'var(--text-4)',
  fontFamily: 'var(--font-body)',
}
