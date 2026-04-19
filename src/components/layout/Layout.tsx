import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
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
          overflowY: 'auto',
          background: 'var(--bg-main)',
        }}
      >
        <Outlet />
      </main>
    </div>
  )
}
