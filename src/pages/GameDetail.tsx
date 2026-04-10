import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import PageHeader from '../components/ui/PageHeader'
import { useGame, useGameByNumber, deleteGame, useGameCards } from '../lib/hooks'
import { useAuth } from '../context/useAuth'

export default function GameDetail() {
  const { id: urlId } = useParams<{ id: string }>()
  const isNumeric = /^\d+$/.test(urlId ?? '')
  // Numeric URLs: direct DB query by game_number (fast, indexed)
  const { data: gameByNum, isLoading: numLoading, error: numError } = useGameByNumber(
    isNumeric ? Number(urlId) : 0,
    { enabled: isNumeric }
  )
  // Legacy text-ID URLs: query by the text id
  const { data: gameByText, isLoading: textLoading, error: textError } = useGame(
    isNumeric ? '' : (urlId ?? ''),
    { enabled: !isNumeric }
  )
  const game = isNumeric ? gameByNum : gameByText
  const isLoading = isNumeric ? numLoading : textLoading
  const error = isNumeric ? numError : textError
  const dbId = game?.id
  const { data: gameCards = [] } = useGameCards(dbId ?? '')
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set())

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteGame(dbId!)
      queryClient.invalidateQueries({ queryKey: ['games'] })
      queryClient.invalidateQueries({ queryKey: ['player-stats'] })
      queryClient.invalidateQueries({ queryKey: ['corp-stats'] })
      navigate('/games')
    } catch (err) {
      console.error(err)
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (isLoading) return <div style={loadingStyle}>Loading…</div>
  if (error || !game) {
    return (
      <div style={loadingStyle}>
        Game not found. <Link to="/games" style={{ color: '#e05535' }}>Back to games</Link>
      </div>
    )
  }

  const sorted = [...game.player_results].sort((a, b) => a.position - b.position)
  const winner = sorted[0]
  const gameNum = game?.game_number ?? null
  const expDisplayName = (n: string) => n === 'Venus' ? 'Venus Next' : n

  const GEN_COLORS = ['#625c7c', '#3bbfbf', '#b87aff', '#c9a030', '#e05535', '#4a9e6b', '#9b50f0', '#2e8b8b']
  const genColor = (gen: number) => GEN_COLORS[(gen - 1) % GEN_COLORS.length]

  const scoreFields: { key: keyof typeof winner; label: string; short: string }[] = [
    { key: 'tr',           label: 'TR',          short: 'TR' },
    { key: 'milestone_vp', label: 'Milestones',  short: 'MS' },
    { key: 'award_vp',     label: 'Awards',      short: 'AW' },
    { key: 'greenery_vp',  label: 'Greeneries',  short: 'GR' },
    { key: 'city_vp',      label: 'Cities',      short: 'CI' },
    { key: 'card_vp',      label: 'Cards',       short: 'CA' },
  ]

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '10px' }}>
        <Link to="/games" style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#625c7c', textDecoration: 'none' }}>
          ← Games
        </Link>

        {user && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Link
              to={`/admin/games/${dbId}/edit`}
              style={{ padding: '5px 14px', background: 'rgba(155,80,240,0.08)', border: '1px solid rgba(155,80,240,0.3)', borderRadius: '4px', fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#b87aff', textDecoration: 'none' }}
            >
              Edit
            </Link>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{ padding: '5px 14px', background: 'transparent', border: '1px solid #3e325e', borderRadius: '4px', fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#625c7c', cursor: 'pointer' }}
              >
                Delete
              </button>
            ) : (
              <>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#e05535' }}>Permanently delete this game?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{ padding: '5px 14px', background: 'rgba(224,85,53,0.12)', border: '1px solid rgba(224,85,53,0.4)', borderRadius: '4px', fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#e05535', cursor: deleting ? 'not-allowed' : 'pointer' }}
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{ padding: '5px 14px', background: 'transparent', border: '1px solid #3e325e', borderRadius: '4px', fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#625c7c', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <PageHeader
        title={game.map_name ?? 'Digital'}
        subtitle={`${gameNum ? `#${gameNum} · ` : ''}${new Date(game.date).toLocaleDateString('sv-SE')} · ${game.player_count} players${game.generations ? ` · ${game.generations} generations` : ''}`}
      />

      {/* Game meta */}
      <div className="game-meta-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '32px' }}>
        <div style={{ background: '#1e1835', border: '1px solid rgba(224,85,53,0.2)', borderRadius: '6px', padding: '14px 16px' }}>
          <div style={metaLabelStyle}>Winner</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '6px' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.95rem', color: '#ece6ff' }}>{winner.player_name}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#625c7c', marginTop: '3px' }}>{winner.corporation}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.3rem', color: '#c9a030', lineHeight: 1, flexShrink: 0 }}>
              {winner.total_vp}<span style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: '#c9a030', marginLeft: '4px', fontWeight: 700 }}>VP</span>
            </div>
          </div>
        </div>
        <div style={{ background: '#1e1835', border: '1px solid rgba(46,139,139,0.2)', borderRadius: '6px', padding: '14px 16px' }}>
          <div style={metaLabelStyle}>Expansions</div>
          {game.expansions.length > 0 ? (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
              {game.expansions.map(exp => (
                <span key={exp} style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '3px', background: 'rgba(46,139,139,0.1)', color: '#3bbfbf', border: '1px solid rgba(46,139,139,0.25)' }}>
                  {expDisplayName(exp)}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: '#625c7c', marginTop: '8px' }}>Base only</div>
          )}
        </div>
        <div style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', padding: '14px 16px', gridColumn: '1 / -1' }}>
          <div style={metaLabelStyle}>Colonies</div>
          {game.colonies.length > 0 ? (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
              {game.colonies.map(colony => (
                <span key={colony} style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '3px', background: 'rgba(155,80,240,0.08)', color: '#b87aff', border: '1px solid rgba(155,80,240,0.2)' }}>
                  {colony}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: '#625c7c', marginTop: '8px' }}>None</div>
          )}
        </div>
      </div>

      {/* Score breakdown table */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#625c7c', marginBottom: '14px' }}>
          Score breakdown
        </h2>
        <div className="game-score-table" style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #282042' }}>
                <th style={thStyle}>Player</th>
                <th className="corp-col" style={thStyle}>Corporation</th>
                {scoreFields.map(f => (
                  <th key={f.key} style={{ ...thStyle, textAlign: 'right' }}>
                    <span className="col-label-full">{f.label}</span>
                    <span className="col-label-short">{f.short}</span>
                  </th>
                ))}
                <th style={{ ...thStyle, textAlign: 'right', color: '#c9a030' }}>
                  <span className="col-label-full">Total</span>
                  <span className="col-label-short">VP</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: i < sorted.length - 1 ? '1px solid #282042' : 'none' }}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: r.position === 1 ? '#e05535' : '#504270' }}>
                        #{r.position}
                      </span>
                      <div>
                        <Link to={`/players/${encodeURIComponent(r.player_name)}`} style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: '#ece6ff', textDecoration: 'none', fontWeight: r.position === 1 ? 600 : 400 }}>
                          {r.player_name}
                        </Link>
                        <Link to={`/corporations/${encodeURIComponent(r.corporation)}`} className="corp-inline" style={{ display: 'none', fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: '#625c7c', textDecoration: 'none' }}>
                          {r.corporation}
                        </Link>
                      </div>
                    </div>
                  </td>
                  <td className="corp-col" style={tdStyle}>
                    <Link to={`/corporations/${encodeURIComponent(r.corporation)}`} style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: '#8e87a8', textDecoration: 'none' }}>
                      {r.corporation}
                    </Link>
                  </td>
                  {scoreFields.map(f => (
                    <td key={f.key} style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#bbb4d0' }}>
                      {r[f.key] ?? '—'}
                    </td>
                  ))}
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem', color: r.position === 1 ? '#c9a030' : '#8e87a8' }}>
                    {r.total_vp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Parameter contributions */}
      {game.parameter_contributions.length > 0 && (() => {
        const params = game.parameter_contributions
        const hasVenus = params.some(p => p.venus_steps > 0)
        const paramCols: { key: keyof typeof params[0]; label: string; short: string; color: string }[] = [
          { key: 'oxygen_steps',      label: 'Oxygen',      short: 'OX',   color: '#4a9e6b' },
          { key: 'temperature_steps', label: 'Temperature', short: 'TEMP', color: '#e05535' },
          { key: 'ocean_steps',       label: 'Oceans',      short: 'OC',   color: '#2e8b8b' },
          ...(hasVenus ? [{ key: 'venus_steps' as const, label: 'Venus Next', short: 'VN', color: '#b87aff' }] : []),
        ]
        return (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#625c7c', marginBottom: '14px' }}>
              Parameter contributions
            </h2>
            <div className="game-param-table" style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #282042' }}>
                    <th style={thStyle}>Player</th>
                    {paramCols.map(col => (
                      <th key={col.key} style={{ ...thStyle, textAlign: 'right', color: col.color }}>
                        <span className="col-label-full">{col.label}</span>
                        <span className="col-label-short">{col.short}</span>
                      </th>
                    ))}
                    <th style={{ ...thStyle, textAlign: 'right', color: '#bbb4d0' }}>
                      <span className="col-label-full">Total</span>
                      <span className="col-label-short">TOT</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {params.map((p, i) => {
                    const rowTotal = paramCols.reduce((s, col) => s + (p[col.key] as number), 0)
                    return (
                      <tr key={p.player_name} style={{ borderBottom: i < params.length - 1 ? '1px solid #282042' : 'none' }}>
                        <td style={{ ...tdStyle, fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: '#ece6ff' }}>{p.player_name}</td>
                        {paramCols.map(col => (
                          <td key={col.key} style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: (p[col.key] as number) > 0 ? col.color : '#504270' }}>
                            {p[col.key] as number}
                          </td>
                        ))}
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: '#bbb4d0' }}>
                          {rowTotal}
                        </td>
                      </tr>
                    )
                  })}
                  <tr style={{ borderTop: '1px solid #282042', background: 'rgba(155,80,240,0.04)' }}>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#625c7c', fontStyle: 'italic' }}>Total</td>
                    {paramCols.map(col => {
                      const total = params.reduce((s, p) => s + (p[col.key] as number), 0)
                      return (
                        <td key={col.key} style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: col.color }}>
                          {total}
                        </td>
                      )
                    })}
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: '#bbb4d0' }}>
                      {params.reduce((s, p) => s + paramCols.reduce((ss, col) => ss + (p[col.key] as number), 0), 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* Cards played */}
      {gameCards.length > 0 && (() => {
        const byPlayer: Record<string, typeof gameCards> = {}
        for (const c of gameCards) {
          ;(byPlayer[c.player_name] ??= []).push(c)
        }
        // Keep player order consistent with score table
        const playerOrder = sorted.map(r => r.player_name)
        const players = [...new Set([...playerOrder, ...Object.keys(byPlayer)])]

        return (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#625c7c', marginBottom: '14px' }}>
              Cards played
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {players.map(player => {
                const cards = byPlayer[player] ?? []
                const isExpanded = expandedPlayers.has(player)
                const posResult = sorted.find(r => r.player_name === player)
                return (
                  <div key={player} style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', overflow: 'hidden' }}>
                    <button
                      onClick={() => setExpandedPlayers(prev => {
                        const next = new Set(prev)
                        if (next.has(player)) next.delete(player)
                        else next.add(player)
                        return next
                      })}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {posResult && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: posResult.position === 1 ? '#e05535' : '#504270' }}>
                            #{posResult.position}
                          </span>
                        )}
                        <Link
                          to={`/players/${encodeURIComponent(player)}`}
                          onClick={e => e.stopPropagation()}
                          style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.87rem', color: '#ece6ff', textDecoration: 'none' }}
                        >
                          {player}
                        </Link>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#504270' }}>{cards.length} cards</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#504270' }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </button>
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid #282042', padding: '4px 0' }}>
                        {cards.map((c, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 14px', gap: '6px' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#282042')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <Link to={`/cards/${encodeURIComponent(c.card_name)}`} style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#bbb4d0', textDecoration: 'none', lineHeight: 1.5 }}>
                              {c.card_name}
                            </Link>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                              {c.vp_from_card != null && (
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#c9a030' }}>{c.vp_from_card}VP</span>
                              )}
                              {c.generation != null && (
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: genColor(c.generation) }}>G{c.generation}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Notes */}
      {sorted.some(r => r.key_notes) && (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#625c7c', marginBottom: '14px' }}>
            Strategy notes
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sorted.filter(r => r.key_notes).map(r => (
              <div key={r.id} style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '4px', padding: '12px 16px', display: 'flex', gap: '12px' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.83rem', color: '#ece6ff', minWidth: '70px' }}>
                  {r.player_name}
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: '#8e87a8', fontStyle: 'italic' }}>
                  {r.key_notes}
                </span>
              </div>
            ))}
          </div>
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

const thStyle: React.CSSProperties = {
  padding: '10px 16px',
  textAlign: 'left',
  fontFamily: 'var(--font-body)',
  fontSize: '0.68rem',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#504270',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
}

const metaLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.67rem',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#504270',
}
