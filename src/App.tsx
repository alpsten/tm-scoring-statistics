import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { TooltipProvider } from '@/components/ui/tooltip'
import Layout from './components/layout/Layout'
import AdminGuard from './pages/admin/AdminGuard'

// Public pages — each becomes its own JS chunk
const Dashboard        = lazy(() => import('./pages/Dashboard'))
const Games            = lazy(() => import('./pages/Games'))
const GameDetail       = lazy(() => import('./pages/GameDetail'))
const Players          = lazy(() => import('./pages/Players'))
const PlayerDetail     = lazy(() => import('./pages/PlayerDetail'))
const Corporations     = lazy(() => import('./pages/Corporations'))
const Cards            = lazy(() => import('./pages/Cards'))
const CardDetail       = lazy(() => import('./pages/CardDetail'))
const Setup            = lazy(() => import('./pages/Setup'))
const MilestonesAwards = lazy(() => import('./pages/MilestonesAwards'))
const CEOs             = lazy(() => import('./pages/CEOs'))
const Leaderboard      = lazy(() => import('./pages/Leaderboard'))
const Notes            = lazy(() => import('./pages/Notes'))
const ScoresheetHub    = lazy(() => import('./pages/ScoresheetHub'))
const PrintScoresheet  = lazy(() => import('./pages/PrintScoresheet'))
const Tournaments      = lazy(() => import('./pages/Tournaments'))
const TournamentDetail = lazy(() => import('./pages/TournamentDetail'))

// Admin pages
const AdminLogin          = lazy(() => import('./pages/admin/AdminLogin'))
const AdminDashboard      = lazy(() => import('./pages/admin/AdminDashboard'))
const AddGame             = lazy(() => import('./pages/admin/AddGame'))
const CardReferenceAdmin  = lazy(() => import('./pages/admin/CardReferenceAdmin'))
const PlayerProfileAdmin  = lazy(() => import('./pages/admin/PlayerProfileAdmin'))
const ParseLog            = lazy(() => import('./pages/admin/ParseLog'))
const TournamentAdmin     = lazy(() => import('./pages/admin/TournamentAdmin'))

function CorpDetailRedirect() {
  const { name } = useParams<{ name: string }>()
  return <Navigate to={`/cards/${name}`} replace />
}

function CEODetailRedirect() {
  const { name } = useParams<{ name: string }>()
  return <Navigate to={`/cards/${name}`} replace />
}

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
        <TooltipProvider>
          <BrowserRouter basename="/tm-scoring-statistics">
            <Suspense fallback={null}>
              <Routes>
                {/* Full-page routes — no sidebar */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/scoresheet/print" element={<PrintScoresheet />} />
                <Route path="/scoresheet/base"  element={<PrintScoresheet />} />

                {/* Sidebar layout wraps all other routes via Outlet */}
                <Route element={<Layout />}>
                  <Route index                    element={<Dashboard />}         />
                  <Route path="games"             element={<Games />}             />
                  <Route path="games/:id"         element={<GameDetail />}        />
                  <Route path="players"           element={<Players />}           />
                  <Route path="players/:name"     element={<PlayerDetail />}      />
                  <Route path="corporations"      element={<Corporations />}      />
                  <Route path="corporations/:name" element={<CorpDetailRedirect />} />
                  <Route path="cards"             element={<Cards />}             />
                  <Route path="cards/:name"       element={<CardDetail />}        />
                  <Route path="setup"             element={<Setup />}             />
                  <Route path="ceos"             element={<CEOs />}             />
                  <Route path="ceos/:name"       element={<CEODetailRedirect />} />
                  <Route path="ma"               element={<MilestonesAwards />} />
                  <Route path="leaderboard"      element={<Leaderboard />}      />
                  <Route path="under-development" element={<Notes />}            />
                  <Route path="scoresheet"       element={<ScoresheetHub />}    />
                  <Route path="tournaments"      element={<Tournaments />}      />
                  <Route path="tournaments/:id"  element={<TournamentDetail />} />

                  {/* Protected admin routes */}
                  <Route path="admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
                  <Route path="admin/games/new" element={<AdminGuard><AddGame /></AdminGuard>} />
                  <Route path="admin/games/:id/edit" element={<AdminGuard><AddGame /></AdminGuard>} />
                  <Route path="admin/cards/reference" element={<AdminGuard><CardReferenceAdmin /></AdminGuard>} />
                  <Route path="admin/players/profiles" element={<AdminGuard><PlayerProfileAdmin /></AdminGuard>} />
                  <Route path="admin/parse-log" element={<AdminGuard><ParseLog /></AdminGuard>} />
                  <Route path="admin/tournaments" element={<AdminGuard><TournamentAdmin /></AdminGuard>} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
