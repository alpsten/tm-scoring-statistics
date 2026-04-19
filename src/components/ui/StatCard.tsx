interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: 'mars' | 'atmo' | 'score' | 'neutral' | 'win'
  valueSuffix?: string
  suffixColor?: string
  badge?: boolean
}

const ACCENT_COLORS = {
  mars:    '#e05535',
  atmo:    '#2e8b8b',
  score:   '#c9a030',
  neutral: '#888888',
  win:     '#4a9e6b',
}

export default function StatCard({ label, value, sub, accent = 'neutral', valueSuffix, suffixColor, badge }: StatCardProps) {
  const color = ACCENT_COLORS[accent]

  return (
    <div
      className="panel-hover"
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--bd-panel)',
        borderRadius: '6px',
        padding: '14px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-4)', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <span style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: '6px', flexShrink: 0 }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700, color,
          ...(badge ? { background: `${color}1f`, border: `1px solid ${color}66`, borderRadius: '4px', padding: '3px 10px' } : {}),
        }}>
          {value}
          {valueSuffix && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700, color: suffixColor ?? color, marginLeft: '4px' }}>
              {valueSuffix}
            </span>
          )}
        </span>
        {sub && (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-4)' }}>
            {sub}
          </span>
        )}
      </span>
    </div>
  )
}
