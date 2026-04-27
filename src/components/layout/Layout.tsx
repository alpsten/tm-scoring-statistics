import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

const footerCard: React.CSSProperties = { padding: '10px 14px', background: 'rgba(210,120,50,0.08)', border: '1px solid rgba(210,120,50,0.25)', borderRadius: '4px', fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: '#d07832', lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: '6px' }
const orangeBtn: React.CSSProperties = { padding: '2px 8px', background: 'rgba(224,85,53,0.15)', border: '1px solid rgba(224,85,53,0.5)', borderRadius: '3px', color: '#e05535', textDecoration: 'none', fontWeight: 600, fontSize: '0.68rem' }
const greenBtn: React.CSSProperties = { padding: '3px 10px', background: 'rgba(74,158,107,0.15)', border: '1px solid rgba(74,158,107,0.4)', borderRadius: '3px', color: '#4a9e6b', textDecoration: 'none', fontWeight: 600, fontSize: '0.68rem', justifyContent: 'center' }

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
          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            <div style={footerCard}>
              Not affiliated with or endorsed by FryxGames — but you should buy
              <a href="https://fryxgames.se/product/terraforming-mars/" target="_blank" rel="noopener noreferrer" style={orangeBtn}>THEIR GAME</a>
            </div>
            <div style={footerCard}>
              This site was made possible with help from the
              <a href="https://github.com/terraforming-mars/terraforming-mars" target="_blank" rel="noopener noreferrer" style={orangeBtn}>Terraforming Mars Community</a>
            </div>

          </div>
        </footer>
      </main>
    </div>
  )
}
