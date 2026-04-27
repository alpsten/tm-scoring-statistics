import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile backdrop */}
      <div
        className={`sidebar-backdrop${sidebarOpen ? ' sidebar-backdrop--open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Hamburger button – mobile only, hidden when sidebar is open */}
      <button
        className="hamburger-btn"
        onClick={() => setSidebarOpen(o => !o)}
        aria-label="Toggle menu"
        style={{ display: sidebarOpen ? 'none' : undefined }}
      >
        <span />
        <span />
        <span />
      </button>

      <main
        className="grid-bg"
        style={{
          flex: 1,
          background: 'var(--bg-main)',
        }}
      >
        <Outlet />

        <footer style={{ borderTop: '1px solid var(--bd-panel)', padding: '24px 36px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            {[
              {
                label: 'A fan-made statistics tracker for Terraforming Mars. Not affiliated with or endorsed by FryxGames — but you should buy their game!',
                href: 'https://fryxgames.se/product/terraforming-mars/',
                linkText: 'Buy here ↗',
              },
              {
                label: 'Made possible with help from the Terraforming Mars community.',
                href: 'https://github.com/terraforming-mars/terraforming-mars',
                linkText: 'Community repo ↗',
              },
              {
                label: 'View the source code for this app.',
                href: 'https://github.com/alpsten/tm-scoring-statistics',
                linkText: 'GitHub ↗',
              },
            ].map(({ label, href, linkText }) => (
              <div
                key={label}
                style={{
                  padding: '10px 14px',
                  background: 'rgba(210,120,50,0.08)',
                  border: '1px solid rgba(210,120,50,0.25)',
                  borderRadius: '4px',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.72rem',
                  color: 'var(--text-4)',
                  lineHeight: 1.5,
                }}
              >
                {label}
                {href && linkText && (
                  <>{' '}<a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#d07832', textDecoration: 'none', fontWeight: 600 }}>{linkText}</a></>
                )}
              </div>
            ))}
          </div>
        </footer>
      </main>
    </div>
  )
}
