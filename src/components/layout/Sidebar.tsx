import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Code2, LogIn, LogOut, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const NAV_ITEMS = [
  { to: '/',             label: 'Overview'          },
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
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>(
    () => (localStorage.getItem('viewportMode') as 'desktop' | 'mobile') ?? 'desktop'
  )
  const [showMobileDisclaimer, setShowMobileDisclaimer] = useState(false)

  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]')
    if (meta) {
      meta.setAttribute(
        'content',
        viewMode === 'desktop' ? 'width=1280' : 'width=device-width, initial-scale=1.0'
      )
    }
    localStorage.setItem('viewportMode', viewMode)
  }, [viewMode])

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
        <div className="font-display text-[0.65rem] tracking-[0.2em] text-[var(--text-4)] uppercase mb-1.5">
          Mission log
        </div>
        <div className="font-display font-bold text-mars-500 uppercase leading-[1.1]">
          <div className="text-[1.25rem]">Terraforming</div>
          <div className="text-[2.3rem] leading-[0.95]">Mars</div>
        </div>
        <div className="font-mono text-[0.6rem] text-[var(--text-4)] mt-2 tracking-[0.05em]">
          STATISTICS v1.0
        </div>
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

      {/* View mode toggle */}
      <div className="px-5 py-3 border-t border-b border-border">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-mono text-[0.55rem] tracking-[0.12em] text-[var(--text-4)] uppercase">
            View
          </span>
          <div className="flex gap-1">
            {(['desktop', 'mobile'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => {
                  if (mode === 'mobile') setShowMobileDisclaimer(true)
                  else setViewMode(mode)
                }}
                className={cn(
                  'px-2 py-0.5 font-mono text-[0.55rem] tracking-[0.08em] uppercase cursor-pointer rounded-[3px] border transition-colors',
                  viewMode === mode
                    ? 'border-[#5b8dd9] bg-[rgba(91,141,217,0.15)] text-[#5b8dd9]'
                    : 'border-border text-[var(--text-4)] bg-transparent hover:text-muted-foreground'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        {viewMode === 'mobile' && (
          <p className="font-body text-[0.62rem] text-score-400 italic leading-[1.4]">
            Mobile view is still in development — some layouts may appear unexpected.
          </p>
        )}
        <div className="border-t border-border mt-2.5 pt-2.5">
          <a
            href="https://github.com/alpsten/tm-scoring-statistics"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-1 px-2 bg-win-500/10 border border-win-500/35 rounded-[3px] text-win-500 font-mono text-[0.6rem] font-semibold tracking-[0.08em] uppercase no-underline hover:bg-win-500/20 transition-colors"
          >
            <Code2 className="size-3" />
            Source Code
          </a>
        </div>
      </div>

      {/* Admin / auth section */}
      <div className="px-5 py-[14px]">
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

      {/* Mobile disclaimer dialog */}
      <Dialog open={showMobileDisclaimer} onOpenChange={setShowMobileDisclaimer}>
        <DialogContent className="max-w-[320px]">
          <DialogHeader>
            <DialogTitle className="font-display text-score-400 tracking-[0.06em] uppercase text-[0.9rem]">
              ⚠ Mobile View
            </DialogTitle>
          </DialogHeader>
          <p className="font-body text-[0.82rem] text-muted-foreground leading-relaxed">
            Mobile view is currently under development. Some layouts and elements may not appear as
            expected.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowMobileDisclaimer(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-score-400 border-score-400/40 bg-score-400/10 hover:bg-score-400/20"
              onClick={() => {
                setViewMode('mobile')
                setShowMobileDisclaimer(false)
              }}
            >
              Continue anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
