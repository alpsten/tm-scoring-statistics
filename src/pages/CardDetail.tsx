import { useParams, useNavigate } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import Tag from '../components/ui/Tag'
import { parseTags } from '../components/ui/tagUtils'
import { useCardStats, useCardReference } from '../lib/hooks'

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  Automated:   { bg: 'rgba(74,158,107,0.1)',  color: '#4a9e6b' },
  Active:      { bg: 'rgba(91,141,217,0.1)',  color: '#5b8dd9' },
  Event:       { bg: 'rgba(224,85,53,0.1)',   color: '#e05535' },
  Corporation: { bg: 'rgba(201,160,48,0.1)',  color: '#c9a030' },
  Prelude:     { bg: 'rgba(220,100,150,0.1)', color: '#d46496' },
  CEO:         { bg: 'rgba(210,120,50,0.1)',  color: '#d07832' },
}

export default function CardDetail() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const cardName = decodeURIComponent(name ?? '')
  const { data: statsData, isLoading: statsLoading } = useCardStats()
  const { data: refData, isLoading: refLoading } = useCardReference()

  if (statsLoading || refLoading) return <div style={loadingStyle}>Loading…</div>

  const stats = (statsData ?? []).find(c => c.card_name === cardName)
  const ref   = (refData ?? []).find(c => c.card_name === cardName)

  if (!stats && !ref) {
    return (
      <div style={loadingStyle}>
        Card not found.{' '}
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#e05535', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.82rem', padding: 0 }}>Back</button>
      </div>
    )
  }

  const tags = parseTags(ref?.tags ?? null)
  const typeColors = ref ? TYPE_COLORS[ref.card_type] : null

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: '24px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#625c7c', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.78rem', padding: 0 }}>← Back</button>
      </div>

      <PageHeader
        title={cardName}
        subtitle={stats ? `Played ${stats.times_played} time${stats.times_played !== 1 ? 's' : ''}` : 'No play history yet'}
      />

      {/* Card reference metadata */}
      {ref && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '28px' }}>
          {typeColors && (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 500, padding: '3px 9px', borderRadius: '3px', background: typeColors.bg, color: typeColors.color }}>
              {ref.card_type}
            </span>
          )}
          {ref.expansion && (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: '#625c7c' }}>{ref.expansion}</span>
          )}
          {tags.map(tag => <Tag key={tag} name={tag} />)}
          {ref.base_vp != null && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#c9a030' }}>{ref.base_vp} VP</span>
          )}
          {ref.resource_vp_type && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#c9a030' }}>
              {ref.resource_vp_per && ref.resource_vp_per > 1 ? `1/${ref.resource_vp_per}` : '1'} VP / {ref.resource_vp_type}
            </span>
          )}
        </div>
      )}

      {/* Play stats */}
      {stats && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
            <StatCard label="Times played"        value={stats.times_played}                          accent="neutral" />
            <StatCard label="Win rate"            value={`${Math.round(stats.win_rate)}%`} sub={`${stats.win_count} wins`} accent={stats.win_rate >= 50 ? 'win' : stats.win_rate > 33 ? 'score' : 'mars'} />
            <StatCard label="Avg VP contribution" value={Math.round(stats.avg_vp_contribution)}        accent="score"   />
            <StatCard label="Avg player score"    value={Math.round(stats.avg_player_score)} valueSuffix="VP" accent="score" badge />
          </div>

          <div style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', padding: '20px 24px' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#504270', fontStyle: 'italic', margin: 0 }}>
              Note: Win rate reflects the playing player's final game result, not a causal claim about this card's strength.
              Always consider sample size when interpreting percentages.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

const loadingStyle: React.CSSProperties = {
  padding: '32px 36px',
  color: '#625c7c',
  fontFamily: 'var(--font-body)',
}
