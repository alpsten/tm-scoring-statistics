import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: ReactNode
  subtitle?: string
  action?: ReactNode
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-end justify-between mb-7 pb-5 border-b border-border">
      <div>
        <h1 className="font-display font-bold text-[1.6rem] text-foreground m-0 tracking-[-0.01em]">
          {title}
        </h1>
        {subtitle && (
          <p className="font-body text-[0.82rem] text-[var(--text-4)] mt-1 mb-0 tracking-[0.01em]">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
