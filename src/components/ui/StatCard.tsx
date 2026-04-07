interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: 'mars' | 'atmo' | 'score' | 'neutral'
}

const ACCENT_COLORS = {
  mars:    '#e05535',
  atmo:    '#2e8b8b',
  score:   '#c9a030',
  neutral: '#8a8680',
}

export default function StatCard({ label, value, sub, accent = 'neutral' }: StatCardProps) {
  const color = ACCENT_COLORS[accent]

  return (
    <div
      className="panel-hover"
      style={{
        background: '#141820',
        border: '1px solid #1a1f2a',
        borderRadius: '6px',
        padding: '20px 22px',
      }}
    >
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5e5b57', marginBottom: '10px' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 700, color, lineHeight: 1, marginBottom: sub ? '6px' : 0 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#5e5b57', marginTop: '4px' }}>
          {sub}
        </div>
      )}
    </div>
  )
}
