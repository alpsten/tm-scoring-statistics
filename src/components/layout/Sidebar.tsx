import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const NAV_ITEMS = [
  { to: '/',              label: 'Overview'     },
  { to: '/games',         label: 'Games'        },
  { to: '/players',       label: 'Players'      },
  { to: '/corporations',  label: 'Corporations' },
  { to: '/cards',         label: 'Cards'        },
  { to: '/setup',         label: 'Setup'        },
]

const NAV_ARROW = '/tm-scoring-statistics/misc/arrow.png'

const PARAM_LABELS = [
  { label: 'OXYGEN',      color: '#4a9e6b' },
  { label: 'TEMPERATURE', color: '#e05535' },
  { label: 'OCEANS',      color: '#2e8b8b' },
]

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <aside
      className={`sidebar${open ? ' sidebar--open' : ''}`}
      style={{
        width: '220px',
        minWidth: '220px',
        background: '#171228',
        borderRight: '1px solid #282042',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflow: 'hidden',
      }}
    >
      {/* Logo / title */}
      <div style={{ padding: '52px 20px 20px', borderBottom: '1px solid #282042', position: 'relative' }}>
        {/* Mobile close button */}
        <button
          className="sidebar-close-btn"
          onClick={onClose}
          aria-label="Close menu"
        >
          ✕
        </button>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.2em', color: '#625c7c', textTransform: 'uppercase', marginBottom: '6px' }}>
          Mission log
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: '#ece6ff', lineHeight: 1.2 }}>
          Terraforming<br />
          <span style={{ color: '#e05535' }}>Mars</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#504270', marginTop: '8px', letterSpacing: '0.05em' }}>
          STATISTICS v1.0
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '12px 0', flex: 1, overflowY: 'auto' }}>
        {NAV_ITEMS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 20px',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-body)',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? '#b87aff' : '#8e87a8',
              background: isActive ? 'rgba(155, 80, 240, 0.1)' : 'transparent',
              borderRight: isActive ? '2px solid #9b50f0' : '2px solid transparent',
              textDecoration: 'none',
              transition: 'color 0.15s, background 0.15s',
              letterSpacing: '0.01em',
            })}
          >
            <img src={NAV_ARROW} alt="" style={{ width: '14px', height: '14px', objectFit: 'contain', opacity: 0.7, flexShrink: 0 }} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Terraforming parameter decoration */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #282042', borderBottom: '1px solid #282042' }}>
        {PARAM_LABELS.map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
            <div className="pulse-mars" style={{ width: '5px', height: '5px', borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.12em', color: '#504270', textTransform: 'uppercase' }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Admin / auth section */}
      <div style={{ padding: '14px 20px' }}>
        {user ? (
          <div>
            <NavLink
              to="/admin"
              onClick={onClose}
              style={({ isActive }) => ({
                display: 'block',
                padding: '8px 12px',
                marginBottom: '8px',
                background: isActive ? 'rgba(155, 80, 240, 0.15)' : 'rgba(155, 80, 240, 0.06)',
                border: '1px solid rgba(155, 80, 240, 0.25)',
                borderRadius: '4px',
                color: '#b87aff',
                fontSize: '0.78rem',
                fontFamily: 'var(--font-body)',
                fontWeight: 500,
                textDecoration: 'none',
                textAlign: 'center',
                letterSpacing: '0.03em',
              })}
            >
              ＋ Add game
            </NavLink>
            <button
              onClick={handleSignOut}
              style={{
                width: '100%',
                padding: '6px',
                background: 'transparent',
                border: '1px solid #3e325e',
                borderRadius: '4px',
                color: '#625c7c',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-body)',
                cursor: 'pointer',
                letterSpacing: '0.03em',
              }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <NavLink
            to="/admin/login"
            style={{
              display: 'block',
              padding: '7px 12px',
              background: 'transparent',
              border: '1px solid #3e325e',
              borderRadius: '4px',
              color: '#625c7c',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-body)',
              textDecoration: 'none',
              textAlign: 'center',
              letterSpacing: '0.03em',
            }}
          >
            Admin login
          </NavLink>
        )}
      </div>
    </aside>
  )
}
