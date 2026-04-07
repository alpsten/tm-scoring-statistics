import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import Tag from '../components/ui/Tag'
import { parseTags } from '../components/ui/tagUtils'
import { useCardStats, useCardReference } from '../lib/hooks'

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  Automated:   { bg: 'rgba(59, 191, 191, 0.1)',  color: '#3bbfbf' },
  Active:      { bg: 'rgba(155, 80, 240, 0.1)',  color: '#b87aff' },
  Event:       { bg: 'rgba(224, 85, 53, 0.1)',   color: '#e05535' },
  Corporation: { bg: 'rgba(212, 168, 32, 0.1)',  color: '#d4a820' },
  Prelude:     { bg: 'rgba(74, 158, 107, 0.1)',  color: '#4a9e6b' },
}

export default function Cards() {
  const [search, setSearch] = useState('')
  const { data: cardStats, isLoading, error } = useCardStats()
  const { data: cardRef } = useCardReference()

  if (isLoading) return <div style={loadingStyle}>Loading…</div>
  if (error) return <div style={loadingStyle}>Failed to load card stats: {String((error as Error)?.message ?? error)}</div>

  const tagMap: Record<string, string | null> = {}
  const typeMap: Record<string, string> = {}
  for (const c of cardRef ?? []) {
    const key = c.card_name.toLowerCase()
    tagMap[key] = c.tags
    typeMap[key] = c.card_type
  }

  const cards = (cardStats ?? []).filter(c =>
    c.card_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <PageHeader title="Cards" subtitle="Performance analysis across all played games" />

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search cards…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '280px',
            padding: '8px 14px',
            background: '#1e1835',
            border: '1px solid #3e325e',
            borderRadius: '4px',
            color: '#ece6ff',
            fontFamily: 'var(--font-body)',
            fontSize: '0.85rem',
            outline: 'none',
          }}
        />
      </div>

      {cards.length === 0 ? (
        <div style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', padding: '32px', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: '#504270' }}>
          No card play data yet. Cards are tracked when logged in a game session.
        </div>
      ) : (
        <div style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #282042' }}>
                {['Card', 'Type', 'Tags', 'Played', 'Win rate', 'Avg VP', 'Avg player score'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: h === 'Card' || h === 'Type' || h === 'Tags' ? 'left' : 'right', fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#504270' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cards.map((card, i) => {
                const type = typeMap[card.card_name.toLowerCase()]
                const typeStyle = type ? TYPE_COLORS[type] : null
                return (
                  <tr
                    key={card.card_name}
                    style={{ borderBottom: i < cards.length - 1 ? '1px solid #282042' : 'none', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#282042')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <Link to={`/cards/${encodeURIComponent(card.card_name)}`} style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.85rem', color: '#ece6ff', textDecoration: 'none' }}>
                        {card.card_name}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {type && typeStyle && (
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 500, padding: '2px 7px', borderRadius: '3px', background: typeStyle.bg, color: typeStyle.color, whiteSpace: 'nowrap' }}>
                          {type}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {parseTags(tagMap[card.card_name.toLowerCase()] ?? null).map(tag => (
                          <Tag key={tag} name={tag} />
                        ))}
                      </div>
                    </td>
                    <td style={numTd}>{card.times_played}</td>
                    <td style={{ ...numTd, color: card.win_rate >= 66 ? '#4a9e6b' : card.win_rate >= 33 ? '#c9a030' : '#625c7c' }}>
                      {card.win_rate.toFixed(1)}%
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: '#504270', marginLeft: '4px' }}>
                        ({card.win_count}/{card.times_played})
                      </span>
                    </td>
                    <td style={{ ...numTd, color: '#c9a030' }}>{card.avg_vp_contribution.toFixed(1)}</td>
                    <td style={numTd}>{card.avg_player_score.toFixed(1)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: '14px', fontFamily: 'var(--font-body)', fontSize: '0.73rem', color: '#504270', fontStyle: 'italic' }}>
        Win rate reflects the player's game result when this card was played, not the card's direct contribution to winning.
      </p>
    </div>
  )
}

const loadingStyle: React.CSSProperties = { padding: '32px 36px', color: '#625c7c', fontFamily: 'var(--font-body)' }
const numTd: React.CSSProperties = { padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.83rem', color: '#bbb4d0' }
