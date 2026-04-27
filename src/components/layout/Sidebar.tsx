import { useState, useEffect } from 'react'
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
  { to: '/ma',            label: 'Milestones/Awards' },
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
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>(
    () => (localStorage.getItem('viewportMode') as 'desktop' | 'mobile') ?? 'desktop'
  )
  const [showMobileDisclaimer, setShowMobileDisclaimer] = useState(false)

  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]')
    if (meta) {
      meta.setAttribute('content', viewMode === 'desktop' ? 'width=1280' : 'width=device-width, initial-scale=1.0')
    }
    localStorage.setItem('viewportMode', viewMode)
  }, [viewMode])

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
        minHeight: '100vh',
        height: 'fit-content',
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
      <nav style={{ padding: '12px 0', flex: '0 0 auto' }}>
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
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--bd-sidebar)' }}>
        {PARAM_LABELS.map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
            <div className="pulse-mars" style={{ width: '5px', height: '5px', borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.12em', color: 'var(--text-4)', textTransform: 'uppercase' }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* View mode toggle */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--bd-sidebar)', borderBottom: '1px solid var(--bd-sidebar)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', letterSpacing: '0.12em', color: 'var(--text-4)', textTransform: 'uppercase' }}>View</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['desktop', 'mobile'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => { if (mode === 'mobile') { setShowMobileDisclaimer(true) } else { setViewMode(mode) } }}
                style={{
                  padding: '2px 8px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.55rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  borderRadius: '3px',
                  border: `1px solid ${viewMode === mode ? '#5b8dd9' : 'var(--bd-sidebar)'}`,
                  background: viewMode === mode ? 'rgba(91,141,217,0.15)' : 'transparent',
                  color: viewMode === mode ? '#5b8dd9' : 'var(--text-4)',
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        {viewMode === 'mobile' && (
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.62rem', color: '#c9a030', fontStyle: 'italic', lineHeight: 1.4 }}>
            Mobile view is still in development — some layouts may appear unexpected.
          </div>
        )}
        <a
          href="https://github.com/alpsten/tm-scoring-statistics"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block', marginTop: '10px', padding: '4px 8px', background: 'rgba(74,158,107,0.1)', border: '1px solid rgba(74,158,107,0.35)', borderRadius: '3px', color: '#4a9e6b', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', textAlign: 'center' }}
        >
          Source Code
        </a>
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
                background: isActive ? 'rgba(210,120,50,0.25)' : 'rgba(210,120,50,0.15)',
                border: '1px solid rgba(210,120,50,0.5)',
                borderRadius: '4px',
                color: '#d07832',
                fontSize: '0.78rem',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                textDecoration: 'none',
                textAlign: 'center',
                letterSpacing: '0.03em',
              })}
            >
              ADMIN
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

      {showMobileDisclaimer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '8px', padding: '28px 24px', maxWidth: '320px', width: '100%' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: '#c9a030', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>
              ⚠ Mobile View
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.6, margin: '0 0 20px' }}>
              Mobile view is currently under development. Some layouts and elements may not appear as expected.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowMobileDisclaimer(false)}
                style={{ flex: 1, padding: '8px', background: 'transparent', border: '1px solid var(--bd-sidebar)', borderRadius: '4px', color: 'var(--text-4)', fontFamily: 'var(--font-body)', fontSize: '0.78rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setViewMode('mobile'); setShowMobileDisclaimer(false) }}
                style={{ flex: 1, padding: '8px', background: 'rgba(201,160,48,0.15)', border: '1px solid rgba(201,160,48,0.4)', borderRadius: '4px', color: '#c9a030', fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Continue anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
