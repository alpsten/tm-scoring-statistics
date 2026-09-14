import { NavLink, useNavigate } from 'react-router-dom'
import { LogIn, LogOut, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useDevicePreviewMode } from '@/lib/useDevicePreviewMode'
import terraformingMarsLogo from '../../assets/terraforming-mars-logo.png'
import scoringStatisticsLogo from '../../assets/scoring-statistics-logo.png'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const NAV_ITEMS = [
  { to: '/',             label: 'Home'              },
  { to: '/overview',     label: 'Overview'          },
  { to: '/leaderboard',  label: 'Leaderboard'       },
  { to: '/games',        label: 'Games'             },
  { to: '/players',      label: 'Players'           },
  { to: '/corporations', label: 'Corporations'      },
  { to: '/cards',        label: 'Cards'             },
  { to: '/ceos',         label: 'CEOs'              },
  { to: '/ma',           label: 'Milestones/Awards' },
  { to: '/setup',        label: 'Setup'             },
  { to: '/under-development', label: 'Under Development' },
  { to: '/scoresheet',   label: 'Score Sheet'       },
]

const NAV_PILL = '/tm-scoring-statistics/misc/standard-project-blank.png'

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { mode, toggle } = useDevicePreviewMode()

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <aside
      className={cn(
        'sidebar w-[220px] min-w-[220px] flex flex-col h-screen sticky top-0 overflow-x-hidden overflow-y-auto',
        'bg-[var(--bg-sidebar)] border-r border-border',
        open && 'sidebar--open'
      )}
    >
      {/* Logo / title */}
      <div className="relative pt-[52px] pb-5 px-5 border-b border-border text-center">
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          ✕
        </button>
        <img
          src={terraformingMarsLogo}
          alt="Terraforming Mars"
          className="mx-auto w-full max-w-[170px] h-auto"
        />
        <img
          src={scoringStatisticsLogo}
          alt="Scoring Statistics"
          className="mx-auto w-full max-w-[170px] h-auto mt-2"
        />
      </div>

      {/* Navigation */}
      <nav className="py-3 flex-none">
        {NAV_ITEMS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'block relative mx-6 my-[3px] no-underline transition-opacity duration-150',
                isActive ? 'opacity-100' : 'opacity-55 hover:opacity-75'
              )
            }
          >
            <img src={NAV_PILL} alt="" aria-hidden className="w-full h-9 object-fill block" />
            <span className="absolute inset-0 flex items-center justify-center font-display font-bold text-[0.78rem] tracking-[0.06em] uppercase text-[#1a0a00]">
              {label}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* Device preview toggle */}
      <div className="px-5 py-3 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[0.55rem] tracking-[0.12em] text-[var(--text-4)] uppercase">
            View
          </span>
          <div className="flex gap-1">
            {(['desktop', 'mobile'] as const).map(m => (
              <button
                key={m}
                onClick={() => toggle(m)}
                className={cn(
                  'px-2 py-0.5 font-mono text-[0.55rem] tracking-[0.08em] uppercase cursor-pointer rounded-[3px] border transition-colors',
                  mode === m
                    ? 'border-[#5b8dd9] bg-[rgba(91,141,217,0.15)] text-[#5b8dd9]'
                    : 'border-border text-[var(--text-4)] bg-transparent hover:text-muted-foreground'
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Admin / auth section */}
      <div className="mt-auto px-5 py-[14px] border-t border-border">
        {user ? (
          <div className="flex flex-col gap-2">
            <NavLink
              to="/admin"
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-center gap-1.5 py-2 px-3 border rounded text-[0.78rem] font-body font-semibold no-underline text-center tracking-[0.03em] transition-colors',
                  isActive
                    ? 'bg-[rgba(210,120,50,0.25)] border-[rgba(210,120,50,0.5)] text-[#d07832]'
                    : 'bg-[rgba(210,120,50,0.15)] border-[rgba(210,120,50,0.5)] text-[#d07832] hover:bg-[rgba(210,120,50,0.25)]'
                )
              }
            >
              <ShieldCheck className="size-3.5" />
              ADMIN
            </NavLink>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full text-[var(--text-4)] text-[0.72rem] border border-border hover:text-foreground"
            >
              <LogOut className="size-3.5" />
              Sign out
            </Button>
          </div>
        ) : (
          <NavLink
            to="/admin/login"
            className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-transparent border border-border rounded text-[var(--text-4)] text-[0.75rem] font-body no-underline text-center tracking-[0.03em] hover:text-foreground transition-colors"
          >
            <LogIn className="size-3.5" />
            Admin login
          </NavLink>
        )}
      </div>
    </aside>
  )
}
