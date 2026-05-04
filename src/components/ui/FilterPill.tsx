interface FilterPillProps {
  label?: string
  tooltip?: string
  icon?: string
  active: boolean
  color?: string
  onClick: () => void
}

export default function FilterPill({ label, tooltip, icon, active, color = '#888888', onClick }: FilterPillProps) {
  const activeBg = color + '1e'
  return (
    <button
      onClick={onClick}
      title={tooltip ?? label}
      style={{
        height: '34px',
        width: icon ? '34px' : undefined,
        padding: icon ? 0 : '0 10px',
        minWidth: '34px',
        background: active ? activeBg : 'transparent',
        border: `1px solid ${active ? color : 'var(--bd-secondary)'}`,
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'all 0.12s',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: active ? 1 : 0.6,
        flexShrink: 0,
      }}
    >
      {icon
        ? <img src={icon} alt={tooltip ?? label ?? ''} style={{ width: '20px', height: '20px', objectFit: 'contain', display: 'block' }} />
        : <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, color: active ? color : 'var(--text-4)', letterSpacing: 0, userSelect: 'none', lineHeight: 1, whiteSpace: 'nowrap' }}>
            {label}
          </span>
      }
    </button>
  )
}
