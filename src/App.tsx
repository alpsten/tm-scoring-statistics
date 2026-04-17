import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/layout/Layout'
import AdminGuard from './pages/admin/AdminGuard'

// Public pages
import Dashboard from './pages/Dashboard'
import Games from './pages/Games'
import GameDetail from './pages/GameDetail'
import Players from './pages/Players'
import PlayerDetail from './pages/PlayerDetail'
import Corporations from './pages/Corporations'
import CorporationDetail from './pages/CorporationDetail'
import Cards from './pages/Cards'
import CardDetail from './pages/CardDetail'
import Setup from './pages/Setup'
import MilestonesAwards from './pages/MilestonesAwards'
import CEOs from './pages/CEOs'

// Admin pages
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AddGame from './pages/admin/AddGame'
import CardReferenceAdmin from './pages/admin/CardReferenceAdmin'
import PlayerProfileAdmin from './pages/admin/PlayerProfileAdmin'
import ParseLog from './pages/admin/ParseLog'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter basename="/tm-scoring-statistics">
          <Routes>
            {/* Full-page route — no sidebar */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Sidebar layout wraps all other routes via Outlet */}
            <Route element={<Layout />}>
              <Route index                    element={<Dashboard />}         />
              <Route path="games"             element={<Games />}             />
              <Route path="games/:id"         element={<GameDetail />}        />
              <Route path="players"           element={<Players />}           />
              <Route path="players/:name"     element={<PlayerDetail />}      />
              <Route path="corporations"      element={<Corporations />}      />
              <Route path="corporations/:name" element={<CorporationDetail />} />
              <Route path="cards"             element={<Cards />}             />
              <Route path="cards/:name"       element={<CardDetail />}        />
              <Route path="setup"             element={<Setup />}             />
              <Route path="ceos"             element={<CEOs />}             />
              <Route path="ma"               element={<MilestonesAwards />} />

              {/* Protected admin routes */}
              <Route path="admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
              <Route path="admin/games/new" element={<AdminGuard><AddGame /></AdminGuard>} />
              <Route path="admin/games/:id/edit" element={<AdminGuard><AddGame /></AdminGuard>} />
              <Route path="admin/cards/reference" element={<AdminGuard><CardReferenceAdmin /></AdminGuard>} />
              <Route path="admin/players/profiles" element={<AdminGuard><PlayerProfileAdmin /></AdminGuard>} />
              <Route path="admin/parse-log" element={<AdminGuard><ParseLog /></AdminGuard>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
