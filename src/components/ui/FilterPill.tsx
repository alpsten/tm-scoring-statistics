import { cn } from '@/lib/utils'

interface FilterPillProps {
  label?: string
  tooltip?: string
  icon?: string
  active: boolean
  color?: string
  onClick: () => void
}

export default function FilterPill({ label, tooltip, icon, active, color = '#888888', onClick }: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      title={tooltip ?? label}
      className={cn(
        'inline-flex items-center justify-center shrink-0 rounded-[5px] border transition-all duration-[120ms] cursor-pointer',
        icon ? 'size-[34px] p-0' : 'h-[34px] px-2.5',
      )}
      style={{
        background: active ? `${color}1e` : 'var(--card)',
        borderColor: active ? color : 'var(--border)',
      }}
    >
      {icon ? (
        <img src={icon} alt={tooltip ?? label ?? ''} className={cn('w-5 h-5 object-contain block transition-opacity', active ? 'opacity-100' : 'opacity-50')} />
      ) : (
        <span
          className="font-mono text-[0.65rem] font-normal tracking-[0] select-none leading-none whitespace-nowrap"
          style={{ color: active ? color : 'var(--text-4)' }}
        >
          {label}
        </span>
      )}
    </button>
  )
}
