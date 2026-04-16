import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import Tag from '../components/ui/Tag'
import { parseTags } from '../components/ui/tagUtils'
import { useCardStats, useCardReference } from '../lib/hooks'
import { TAG_ICONS } from '../lib/expansions'

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  Automated:   { bg: 'rgba(74, 158, 107, 0.1)',  color: '#4a9e6b' },
  Active:      { bg: 'rgba(91, 141, 217, 0.1)',  color: '#5b8dd9' },
  Event:       { bg: 'rgba(224, 85, 53, 0.1)',   color: '#e05535' },
  Corporation: { bg: 'rgba(201, 160, 48, 0.1)',  color: '#c9a030' },
  Prelude:     { bg: 'rgba(220, 100, 150, 0.1)', color: '#d46496' },
  CEO:         { bg: 'rgba(210, 120, 50, 0.1)',  color: '#d07832' },
}

const CARD_TYPES = ['Automated', 'Active', 'Event', 'Corporation', 'Prelude', 'CEO'] as const
type CardType = typeof CARD_TYPES[number]

const TAG_COLORS: Record<string, { bg: string; color: string }> = {
  'Animal':   { bg: 'rgba(74, 158, 107, 0.12)',  color: '#4a9e6b' },
  'Building': { bg: 'rgba(180, 120, 60, 0.12)',  color: '#c97b3a' },
  'City':     { bg: 'rgba(100, 140, 200, 0.12)', color: '#7aa0d0' },
  'Earth':    { bg: 'rgba(100, 140, 200, 0.12)', color: '#7aa0d0' },
  'Event':    { bg: 'rgba(200, 80, 60, 0.12)',   color: '#d06050' },
  'Jovian':   { bg: 'rgba(180, 100, 40, 0.12)',  color: '#c07030' },
  'Microbe':  { bg: 'rgba(90, 160, 80, 0.12)',   color: '#5aa050' },
  'Plant':    { bg: 'rgba(60, 160, 80, 0.12)',   color: '#40a060' },
  'Power':    { bg: 'rgba(180, 90, 200, 0.12)',  color: '#c070d0' },
  'Science':  { bg: 'rgba(200, 200, 60, 0.12)',  color: '#d0c030' },
  'Space':    { bg: 'rgba(60, 100, 200, 0.12)',  color: '#5080c0' },
  'Venus':    { bg: 'rgba(220, 160, 60, 0.12)',  color: '#d0a040' },
  'Moon':     { bg: 'rgba(140, 148, 176, 0.12)', color: '#8c94b0' },
  'Mars':     { bg: 'rgba(196, 88, 52, 0.12)',   color: '#c45834' },
  'Planet':   { bg: 'rgba(92, 172, 110, 0.12)',  color: '#5cac6e' },
}

export default function Cards() {
  const [search, setSearch] = useState('')
  const [typeFilters, setTypeFilters] = useState<CardType[]>([])
  const [tagFilters, setTagFilters] = useState<string[]>([])
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

  const allTags = [...new Set(
    Object.values(tagMap).flatMap(t => parseTags(t))
  )].sort()

  const cards = (cardStats ?? []).filter(c => {
    if (!c.card_name.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilters.length > 0) {
      const type = typeMap[c.card_name.toLowerCase()]
      if (!typeFilters.includes(type as CardType)) return false
    }
    if (tagFilters.length > 0) {
      const cardTags = parseTags(tagMap[c.card_name.toLowerCase()] ?? null)
      if (!tagFilters.some(t => cardTags.includes(t))) return false
    }
    return true
  })

  const hasFilters = !!search || typeFilters.length > 0 || tagFilters.length > 0

  function toggleType(type: CardType) {
    setTypeFilters(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])
  }
  function toggleTag(tag: string) {
    setTagFilters(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <PageHeader
        title="Cards"
        subtitle={hasFilters ? `${cards.length} of ${cardStats?.length ?? 0} cards` : 'Performance analysis across all played games'}
      />

      <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Search + clear */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search cards…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '240px', height: '34px', padding: '0 12px',
              background: '#1e1835', border: '1px solid #3e325e', borderRadius: '4px',
              color: '#ece6ff', fontFamily: 'var(--font-body)', fontSize: '0.83rem', outline: 'none',
            }}
          />
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setTypeFilters([]); setTagFilters([]) }}
              style={{
                height: '34px', padding: '0 12px',
                background: 'transparent', border: '1px solid #3e325e', borderRadius: '4px',
                color: '#625c7c', fontFamily: 'var(--font-body)', fontSize: '0.78rem', cursor: 'pointer',
              }}
            >
              Clear all
            </button>
          )}
        </div>

        {/* Type pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#504270', marginRight: '2px' }}>Type</span>
          {CARD_TYPES.map(type => {
            const active = typeFilters.includes(type)
            const colors = TYPE_COLORS[type]
            return (
              <button key={type} onClick={() => toggleType(type)} style={{
                padding: '3px 11px',
                background: active ? colors.bg : 'transparent',
                border: `1px solid ${active ? colors.color : '#3e325e'}`,
                borderRadius: '12px', cursor: 'pointer', transition: 'all 0.12s',
                fontFamily: 'var(--font-body)', fontSize: '0.75rem',
                color: active ? colors.color : '#625c7c',
              }}>
                {active ? '✓ ' : ''}{type}
              </button>
            )
          })}
        </div>

        {/* Tag pills */}
        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#504270', marginRight: '2px' }}>Tag</span>
            {allTags.map(tag => {
              const active = tagFilters.includes(tag)
              const icon = TAG_ICONS[tag]
              const colors = TAG_COLORS[tag] ?? { bg: 'rgba(100,100,100,0.12)', color: '#8e87a8' }
              return (
                <button key={tag} onClick={() => toggleTag(tag)} title={tag} style={{
                  padding: icon ? '4px' : '3px 11px',
                  background: active ? colors.bg : 'transparent',
                  border: `1px solid ${active ? colors.color : '#3e325e'}`,
                  borderRadius: '6px', cursor: 'pointer', transition: 'all 0.12s',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  opacity: active ? 1 : 0.45,
                  fontFamily: 'var(--font-body)', fontSize: '0.75rem',
                  color: active ? colors.color : '#625c7c',
                }}>
                  {icon
                    ? <img src={icon} alt={tag} style={{ width: '20px', height: '20px', objectFit: 'contain', display: 'block' }} />
                    : <>{active ? '✓ ' : ''}{tag}</>
                  }
                </button>
              )
            })}
          </div>
        )}
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
                {['Card', 'Type', 'Tags', 'Played', 'Win rate', 'Avg VP'].map(h => (
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
                      {Math.round(card.win_rate)}%
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: '#504270', marginLeft: '4px' }}>
                        ({card.win_count}/{card.times_played})
                      </span>
                    </td>
                    <td style={{ ...numTd, color: '#c9a030' }}>{Math.round(card.avg_vp_contribution)}</td>
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
