import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import { useGame, deleteGame } from '../lib/hooks'
import { useAuth } from '../context/useAuth'

export default function GameDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: game, isLoading, error } = useGame(id!)
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteGame(id!)
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

  const scoreFields: { key: keyof typeof winner; label: string }[] = [
    { key: 'tr',           label: 'TR'         },
    { key: 'milestone_vp', label: 'Milestones' },
    { key: 'award_vp',     label: 'Awards'     },
    { key: 'greenery_vp',  label: 'Greeneries' },
    { key: 'city_vp',      label: 'Cities'     },
    { key: 'card_vp',      label: 'Cards'      },
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
              to={`/admin/games/${id}/edit`}
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
        title={`${game.map_name ?? 'Digital'} — ${new Date(game.date).toLocaleDateString('sv-SE')}`}
        subtitle={`${game.player_count} players · ${game.generations ?? '?'} generations · GameID ${game.id}`}
      />

      {/* Game meta */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <StatCard label="Winner"        value={winner.player_name} sub={winner.corporation}                   accent="mars"    />
        <StatCard label="Winning score" value={winner.total_vp}    sub="VP"                                   accent="score"   />
        <StatCard label="Expansions"    value={game.expansions.length || '—'} sub={game.expansions.join(', ') || 'Base only'} accent="atmo" />
        <StatCard label="Colonies"      value={game.colonies.length || '—'}   sub={game.colonies.join(', ') || 'None'}        accent="neutral" />
      </div>

      {/* Score breakdown table */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#625c7c', marginBottom: '14px' }}>
          Score breakdown
        </h2>
        <div style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #282042' }}>
                <th style={thStyle}>Player</th>
                <th style={thStyle}>Corporation</th>
                {scoreFields.map(f => (
                  <th key={f.key} style={{ ...thStyle, textAlign: 'right' }}>{f.label}</th>
                ))}
                <th style={{ ...thStyle, textAlign: 'right', color: '#c9a030' }}>Total</th>
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
                      <Link to={`/players/${r.player_name}`} style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: '#ece6ff', textDecoration: 'none', fontWeight: r.position === 1 ? 600 : 400 }}>
                        {r.player_name}
                      </Link>
                    </div>
                  </td>
                  <td style={tdStyle}>
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
        const paramCols: { key: keyof typeof params[0]; label: string; color: string }[] = [
          { key: 'oxygen_steps',      label: 'Oxygen',      color: '#4a9e6b' },
          { key: 'temperature_steps', label: 'Temperature', color: '#e05535' },
          { key: 'ocean_steps',       label: 'Oceans',      color: '#2e8b8b' },
          ...(hasVenus ? [{ key: 'venus_steps' as const, label: 'Venus', color: '#b87aff' }] : []),
        ]
        return (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#625c7c', marginBottom: '14px' }}>
              Parameter contributions
            </h2>
            <div style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #282042' }}>
                    <th style={thStyle}>Player</th>
                    {paramCols.map(col => (
                      <th key={col.key} style={{ ...thStyle, textAlign: 'right', color: col.color }}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {params.map((p, i) => (
                    <tr key={p.player_name} style={{ borderBottom: i < params.length - 1 ? '1px solid #282042' : 'none' }}>
                      <td style={{ ...tdStyle, fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: '#ece6ff' }}>{p.player_name}</td>
                      {paramCols.map(col => (
                        <td key={col.key} style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: (p[col.key] as number) > 0 ? col.color : '#504270' }}>
                          {p[col.key] as number}
                        </td>
                      ))}
                    </tr>
                  ))}
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
                  </tr>
                </tbody>
              </table>
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
