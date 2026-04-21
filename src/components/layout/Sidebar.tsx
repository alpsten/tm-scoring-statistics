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
  { to: '/ceos',          label: 'CEOs'         },
  { to: '/ma',            label: 'M&A'          },
  { to: '/setup',         label: 'Setup'        },
]

const NAV_PILL = '/tm-scoring-statistics/misc/standard-project-blank.png'

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
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--bd-sidebar)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflowX: 'hidden',
        overflowY: 'auto',
      }}
    >
      {/* Logo / title */}
      <div style={{ padding: '52px 20px 20px', borderBottom: '1px solid var(--bd-sidebar)', position: 'relative' }}>
        {/* Mobile close button */}
        <button
          className="sidebar-close-btn"
          onClick={onClose}
          aria-label="Close menu"
        >
          ✕
        </button>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--text-4)', textTransform: 'uppercase', marginBottom: '6px' }}>
          Mission log
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--text-1)', lineHeight: 1.2 }}>
          Terraforming<br />
          <span style={{ color: '#e05535' }}>Mars</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-4)', marginTop: '8px', letterSpacing: '0.05em' }}>
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
              display: 'block',
              position: 'relative',
              margin: '3px 24px',
              textDecoration: 'none',
              borderRight: 'none',
              opacity: isActive ? 1 : 0.55,
              transition: 'opacity 0.15s',
            })}
          >
            <img src={NAV_PILL} alt="" aria-hidden style={{ width: '100%', height: '36px', objectFit: 'fill', display: 'block' }} />
            <span style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '0.78rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#1a0a00',
            }}>
              {label}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* Terraforming parameter decoration */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--bd-sidebar)', borderBottom: '1px solid var(--bd-sidebar)' }}>
        {PARAM_LABELS.map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
            <div className="pulse-mars" style={{ width: '5px', height: '5px', borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.12em', color: 'var(--text-4)', textTransform: 'uppercase' }}>
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
                background: isActive ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.05)',
                border: '1px solid rgba(0,0,0,0.15)',
                borderRadius: '4px',
                color: 'var(--text-2)',
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
                border: '1px solid var(--bd-sidebar)',
                borderRadius: '4px',
                color: 'var(--text-4)',
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
              border: '1px solid var(--bd-sidebar)',
              borderRadius: '4px',
              color: 'var(--text-4)',
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
