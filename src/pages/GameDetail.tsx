import { useParams, Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import { MOCK_GAMES } from '../lib/mockData'

export default function GameDetail() {
  const { id } = useParams<{ id: string }>()
  const game = MOCK_GAMES.find(g => g.id === id)

  if (!game) {
    return (
      <div style={{ padding: '32px 36px', color: '#5e5b57' }}>
        Game not found. <Link to="/games" style={{ color: '#e05535' }}>Back to games</Link>
      </div>
    )
  }

  const sorted = [...game.player_results].sort((a, b) => a.position - b.position)
  const winner = sorted[0]

  const scoreFields: { key: keyof typeof winner; label: string }[] = [
    { key: 'tr',          label: 'TR'         },
    { key: 'milestone_vp', label: 'Milestones' },
    { key: 'award_vp',    label: 'Awards'     },
    { key: 'greenery_vp', label: 'Greeneries' },
    { key: 'city_vp',     label: 'Cities'     },
    { key: 'card_vp',     label: 'Cards'      },
  ]

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/games" style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#5e5b57', textDecoration: 'none' }}>
          ← Games
        </Link>
      </div>

      <PageHeader
        title={`${game.map_name} — ${new Date(game.date).toLocaleDateString('sv-SE')}`}
        subtitle={`${game.player_count} players · ${game.generations ?? '?'} generations · ${game.id}`}
      />

      {/* Game meta */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <StatCard label="Winner"      value={winner.player_name} sub={winner.corporation} accent="mars"  />
        <StatCard label="Winning score" value={winner.total_vp}  sub="VP"                accent="score" />
        <StatCard label="Expansions"  value={game.expansions.length || '—'} sub={game.expansions.join(', ') || 'Base only'} accent="atmo" />
        <StatCard label="Colonies"    value={game.colonies.length || '—'}   sub={game.colonies.join(', ') || 'None'} accent="neutral" />
      </div>

      {/* Score breakdown table */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5e5b57', marginBottom: '14px' }}>
          Score breakdown
        </h2>
        <div style={{ background: '#141820', border: '1px solid #1a1f2a', borderRadius: '6px', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1a1f2a' }}>
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
                <tr key={r.id} style={{ borderBottom: i < sorted.length - 1 ? '1px solid #1a1f2a' : 'none' }}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: r.position === 1 ? '#e05535' : '#3d4352' }}>
                        #{r.position}
                      </span>
                      <Link to={`/players/${r.player_name}`} style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: '#ddd9d0', textDecoration: 'none', fontWeight: r.position === 1 ? 600 : 400 }}>
                        {r.player_name}
                      </Link>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <Link to={`/corporations/${r.corporation}`} style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: '#8a8680', textDecoration: 'none' }}>
                      {r.corporation}
                    </Link>
                  </td>
                  {scoreFields.map(f => (
                    <td key={f.key} style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#b5b0a8' }}>
                      {r[f.key] ?? '—'}
                    </td>
                  ))}
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem', color: r.position === 1 ? '#c9a030' : '#8a8680' }}>
                    {r.total_vp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes */}
      {sorted.some(r => r.key_notes) && (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5e5b57', marginBottom: '14px' }}>
            Strategy notes
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sorted.filter(r => r.key_notes).map(r => (
              <div key={r.id} style={{ background: '#141820', border: '1px solid #1a1f2a', borderRadius: '4px', padding: '12px 16px', display: 'flex', gap: '12px' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.83rem', color: '#ddd9d0', minWidth: '70px' }}>
                  {r.player_name}
                </span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: '#8a8680', fontStyle: 'italic' }}>
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

const thStyle: React.CSSProperties = {
  padding: '10px 16px',
  textAlign: 'left',
  fontFamily: 'var(--font-body)',
  fontSize: '0.68rem',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#3d4352',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
}
