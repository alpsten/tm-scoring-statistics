interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: 'mars' | 'atmo' | 'score' | 'neutral'
  valueSuffix?: string
  suffixColor?: string
}

const ACCENT_COLORS = {
  mars:    '#e05535',
  atmo:    '#2e8b8b',
  score:   '#c9a030',
  neutral: '#8e87a8',
}

export default function StatCard({ label, value, sub, accent = 'neutral', valueSuffix, suffixColor }: StatCardProps) {
  const color = ACCENT_COLORS[accent]

  return (
    <div
      className="panel-hover"
      style={{
        background: '#1e1835',
        border: '1px solid #282042',
        borderRadius: '6px',
        padding: '14px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 500, color: '#504270', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <span style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: '6px', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700, color }}>
          {value}
          {valueSuffix && (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 700, color: suffixColor ?? '#625c7c', marginLeft: '4px' }}>
              {valueSuffix}
            </span>
          )}
        </span>
        {sub && (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: '#504270' }}>
            {sub}
          </span>
        )}
      </span>
    </div>
  )
}
