import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main
        className="grid-bg"
        style={{
          flex: 1,
          overflowY: 'auto',
          background: '#0a0b0d',
        }}
      >
        <Outlet />
      </main>
    </div>
  )
}
