import { useParams, Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import { MOCK_CARD_STATS } from '../lib/mockData'

export default function CardDetail() {
  const { name } = useParams<{ name: string }>()
  const cardName = decodeURIComponent(name ?? '')
  const stats = MOCK_CARD_STATS.find(c => c.card_name === cardName)

  if (!stats) {
    return (
      <div style={{ padding: '32px 36px', color: '#5e5b57' }}>
        Card not found in played history. <Link to="/cards" style={{ color: '#e05535' }}>Back</Link>
      </div>
    )
  }

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/cards" style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#5e5b57', textDecoration: 'none' }}>← Cards</Link>
      </div>

      <PageHeader
        title={cardName}
        subtitle={`Played ${stats.times_played} time${stats.times_played !== 1 ? 's' : ''}`}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <StatCard label="Times played"       value={stats.times_played}                        accent="neutral" />
        <StatCard label="Win rate"           value={`${stats.win_rate.toFixed(1)}%`} sub={`${stats.win_count} wins`} accent="mars" />
        <StatCard label="Avg VP contribution" value={stats.avg_vp_contribution.toFixed(1)}     accent="score"   />
        <StatCard label="Avg player score"   value={stats.avg_player_score.toFixed(1)} sub="VP" accent="atmo"   />
      </div>

      <div style={{ background: '#141820', border: '1px solid #1a1f2a', borderRadius: '6px', padding: '20px 24px' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#3d4352', fontStyle: 'italic', margin: 0 }}>
          Note: Win rate reflects the playing player's final game result, not a causal claim about this card's strength.
          Always consider sample size when interpreting percentages.
        </p>
      </div>
    </div>
  )
}
