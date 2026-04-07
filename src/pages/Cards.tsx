import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import Tag, { parseTags } from '../components/ui/Tag'
import { MOCK_CARD_STATS } from '../lib/mockData'

// Full card reference from the imported CSV — used for tag display
const CARD_TAGS: Record<string, string> = {
  'AI Central':      'Building, Science',
  'Ganymede Colony': 'City, Jovian, Space',
  'Search for Life': 'Science',
  'Pets':            'Animal, Earth',
  'Physics Complex': 'Building, Science',
}

export default function Cards() {
  const [search, setSearch] = useState('')
  const cards = MOCK_CARD_STATS.filter(c =>
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
            background: '#141820',
            border: '1px solid #2e3340',
            borderRadius: '4px',
            color: '#ddd9d0',
            fontFamily: 'var(--font-body)',
            fontSize: '0.85rem',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ background: '#141820', border: '1px solid #1a1f2a', borderRadius: '6px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1a1f2a' }}>
              {['Card', 'Tags', 'Played', 'Win rate', 'Avg VP', 'Avg player score'].map(h => (
                <th key={h} style={{ padding: '11px 16px', textAlign: h === 'Card' || h === 'Tags' ? 'left' : 'right', fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3d4352' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cards.map((card, i) => (
              <tr
                key={card.card_name}
                style={{ borderBottom: i < cards.length - 1 ? '1px solid #1a1f2a' : 'none', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1a1f2a')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '12px 16px' }}>
                  <Link to={`/cards/${encodeURIComponent(card.card_name)}`} style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.85rem', color: '#ddd9d0', textDecoration: 'none' }}>
                    {card.card_name}
                  </Link>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {parseTags(CARD_TAGS[card.card_name] ?? null).map(tag => (
                      <Tag key={tag} name={tag} />
                    ))}
                  </div>
                </td>
                <td style={numTd}>{card.times_played}</td>
                <td style={{ ...numTd, color: card.win_rate >= 66 ? '#4a9e6b' : card.win_rate >= 33 ? '#c9a030' : '#5e5b57' }}>
                  {card.win_rate.toFixed(1)}%
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: '#3d4352', marginLeft: '4px' }}>
                    ({card.win_count}/{card.times_played})
                  </span>
                </td>
                <td style={{ ...numTd, color: '#c9a030' }}>{card.avg_vp_contribution.toFixed(1)}</td>
                <td style={numTd}>{card.avg_player_score.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: '14px', fontFamily: 'var(--font-body)', fontSize: '0.73rem', color: '#3d4352', fontStyle: 'italic' }}>
        Win rate reflects the player's game result when this card was played, not the card's direct contribution to winning.
      </p>
    </div>
  )
}

const numTd: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'right',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.83rem',
  color: '#b5b0a8',
}
