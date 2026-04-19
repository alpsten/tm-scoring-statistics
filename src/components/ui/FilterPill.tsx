interface FilterPillProps {
  label?: string
  icon?: string        // optional image src
  active: boolean
  color?: string       // accent color when active (hex)
  onClick: () => void
}

export default function FilterPill({ label, icon, active, color = '#888888', onClick }: FilterPillProps) {
  const activeBg = `${color}1e`  // ~12% opacity
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        padding: icon ? '4px' : '3px 11px',
        background: active ? activeBg : 'transparent',
        border: `1px solid ${active ? color : 'var(--bd-secondary)'}`,
        borderRadius: icon ? '6px' : '12px',
        cursor: 'pointer',
        transition: 'all 0.12s',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: active ? 1 : 0.55,
        fontFamily: 'var(--font-body)',
        fontSize: '0.75rem',
        color: active ? color : 'var(--text-4)',
      }}
    >
      {icon
        ? <img src={icon} alt={label ?? ''} style={{ width: '20px', height: '20px', objectFit: 'contain', display: 'block' }} />
        : <>{active ? '✓ ' : ''}{label}</>
      }
    </button>
  )
}
