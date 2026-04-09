import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: ReactNode
  subtitle?: string
  action?: ReactNode
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: '28px',
      paddingBottom: '20px',
      borderBottom: '1px solid #282042',
    }}>
      <div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '1.6rem',
          color: '#ece6ff',
          margin: 0,
          letterSpacing: '-0.01em',
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: '#625c7c', margin: '4px 0 0', letterSpacing: '0.01em' }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
