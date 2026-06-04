import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import HexBackground from './HexBackground'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <HexBackground />
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

      <main className="flex-1">
        <Outlet />

        <footer className="border-t border-border px-9 py-5">
          <p className="font-body text-[0.8rem] text-[var(--text-4)] m-0 leading-relaxed">
            Not affiliated with or endorsed by{' '}
            <a href="https://fryxgames.se/product/terraforming-mars/" target="_blank" rel="noopener noreferrer" className="text-[var(--text-3)] no-underline hover:text-foreground transition-colors">
              FryxGames
            </a>
            {' '}· Made with help from the{' '}
            <a href="https://github.com/terraforming-mars/terraforming-mars" target="_blank" rel="noopener noreferrer" className="text-[var(--text-3)] no-underline hover:text-foreground transition-colors">
              Terraforming Mars Community
            </a>
          </p>
        </footer>
      </main>
    </div>
  )
}
