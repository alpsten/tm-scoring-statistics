import { useParams, useNavigate } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import Tag from '../components/ui/Tag'
import { parseTags } from '../components/ui/tagUtils'
import { useCardStats, useCardReference } from '../lib/hooks'
import { EXPANSION_ICONS } from '../lib/expansions'

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
  const isLandscape = ref?.card_type === 'Prelude' || ref?.card_type === 'Corporation'

  return (
    <div className="page-enter card-detail-page">
      <style>{`
        .card-detail-page { padding: 32px 36px; }
        .card-detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 32px; }
        @media (max-width: 480px) {
          .card-detail-page { padding: 20px 16px; }
          .card-detail-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ marginBottom: '24px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#625c7c', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.78rem', padding: 0 }}>← Back</button>
      </div>

      <PageHeader
        title={cardName}
        subtitle={stats ? `Played ${stats.times_played} time${stats.times_played !== 1 ? 's' : ''}` : 'No play history yet'}
      />

      {/* Card frame */}
      {ref && (
        <div style={{
          width: isLandscape ? '336px' : '240px',
          aspectRatio: isLandscape ? '7 / 5' : '5 / 7',
          marginBottom: '28px',
          borderRadius: '12px',
          overflow: 'hidden',
          border: `3px solid ${typeColors?.color ?? '#3e325e'}`,
          background: '#0e0c1e',
          boxShadow: `0 6px 32px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.03)`,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{
            background: typeColors ? `${typeColors.color}28` : '#1a1630',
            borderBottom: `1px solid ${typeColors?.color ?? '#3e325e'}55`,
            padding: '8px 10px 7px',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
          }}>
            {/* Row 1: cost badge + tags */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {!isLandscape && (
                <div style={{
                  width: '28px', height: '28px', flexShrink: 0,
                  background: ref.mc_cost != null ? 'linear-gradient(135deg, #f0d040, #c9a030)' : 'rgba(201,160,48,0.15)',
                  border: '1px solid #c9a03066',
                  borderRadius: '4px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.88rem',
                  color: ref.mc_cost != null ? '#1a1428' : 'transparent',
                }}>
                  {ref.mc_cost ?? ''}
                </div>
              )}
              {tags.length > 0 && (
                <div style={{ display: 'flex', gap: '3px' }}>
                  {tags.map(tag => <Tag key={tag} name={tag} />)}
                </div>
              )}
            </div>
            {/* Row 2: card name */}
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#ece6ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {cardName}
            </div>
          </div>

          {/* Body — card text */}
          <div style={{ padding: '16px 14px', flex: 1, overflow: 'auto' }}>
            {ref.card_text ? (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.76rem', color: '#bbb4d0', margin: 0, lineHeight: 1.55 }}>
                {ref.card_text}
              </p>
            ) : (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.73rem', color: '#3e325e', margin: 0, fontStyle: 'italic' }}>
                No card text recorded.
              </p>
            )}
          </div>

          {/* Footer */}
          <div style={{
            borderTop: '1px solid #1e1835',
            padding: '7px 10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {ref.expansions.map(exp => EXPANSION_ICONS[exp]
                ? <img key={exp} src={EXPANSION_ICONS[exp]} alt={exp} title={exp} style={{ width: '16px', height: '16px', objectFit: 'contain', opacity: 0.65 }} />
                : <span key={exp} style={{ fontFamily: 'var(--font-body)', fontSize: '0.62rem', color: '#504270' }}>{exp}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {ref.resource_vp_type && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: '#c9a030' }}>
                  {ref.resource_vp_per && ref.resource_vp_per > 1 ? `1/${ref.resource_vp_per}` : '1'}VP/{ref.resource_vp_type}
                </span>
              )}
              {ref.base_vp != null && (
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'radial-gradient(circle at 40% 35%, #e8b840, #b8860b)',
                  border: '1px solid #c9a030',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.85rem', color: '#1a1428',
                  flexShrink: 0,
                }}>
                  {ref.base_vp}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Play stats */}
      {stats && (
        <>
          <div className="card-detail-grid">
            <StatCard label="Times played"        value={stats.times_played}                          accent="neutral" />
            <StatCard label="Win rate"            value={`${Math.round(stats.win_rate)}%`} sub={`${stats.win_count} wins`} accent={stats.win_rate >= 50 ? 'win' : stats.win_rate > 33 ? 'score' : 'mars'} />
            {stats.avg_vp_contribution > 0 && (
              <StatCard label="Avg VP contribution" value={Math.round(stats.avg_vp_contribution)} accent="score" />
            )}
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
