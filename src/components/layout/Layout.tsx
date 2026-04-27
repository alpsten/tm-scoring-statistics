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

        <footer style={{
          borderTop: '1px solid var(--bd-panel)',
          padding: '24px 36px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px 32px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-4)' }}>
              A fan-made statistics tracker for Terraforming Mars.
            </span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-4)' }}>
              Not affiliated with or endorsed by FryxGames.
            </span>
          </div>
          <a
            href="https://github.com/alpsten/tm-scoring-statistics"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-3)', textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            GitHub ↗
          </a>
        </footer>
      </main>
    </div>
  )
}
