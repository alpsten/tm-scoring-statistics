import { Link } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader'
import { useAuth } from '../../context/useAuth'

const CARDS = [
  {
    to: '/admin/games/new',
    icon: '＋',
    iconColor: 'text-mars-500',
    borderClass: 'border-mars-500/20 hover:border-mars-500/40',
    title: 'Add game',
    desc: 'Log a new game session with players, scores, and cards',
  },
  {
    to: '/admin/parse-log',
    icon: '⌨',
    iconColor: 'text-mars-500',
    borderClass: 'border-mars-500/20 hover:border-mars-500/40',
    title: 'Parse game log',
    desc: 'Import cards played and milestones from a game log',
  },
  {
    to: '/admin/players/profiles',
    icon: '◉',
    iconColor: 'text-violet-500',
    borderClass: 'border-[#3e325e] hover:border-violet-500/30',
    title: 'Player profiles',
    desc: 'Colors, playing styles, rivals, and trivia',
  },
  {
    to: '/admin/cards/reference',
    icon: '▣',
    iconColor: 'text-[#2e8b8b]',
    borderClass: 'border-[#3e325e] hover:border-[rgba(46,139,139,0.3)]',
    title: 'Card reference',
    desc: 'Manage the card database — tags, types, expansions',
  },
  {
    to: '/admin/tournaments',
    icon: '⚔',
    iconColor: 'text-score-400',
    borderClass: 'border-score-400/20 hover:border-score-400/40',
    title: 'Tournaments',
    desc: 'Create tournaments, generate pairings, link games to rounds',
  },
]

export default function AdminDashboard() {
  const { user } = useAuth()

  return (
    <div className="page-enter py-8 px-9 min-h-full bg-[#0c0e12]">
      <PageHeader title="Admin" subtitle={`Signed in as ${user?.email}`} />

      <div className="admin-links-grid grid grid-cols-2 gap-4 max-w-[600px]">
        {CARDS.map(({ to, icon, iconColor, borderClass, title, desc }) => (
          <Link
            key={to}
            to={to}
            className={`block p-6 bg-[#282042] border rounded-[6px] no-underline transition-colors ${borderClass}`}
          >
            <div className={`font-display font-bold text-[1.4rem] mb-2 ${iconColor}`}>{icon}</div>
            <div className="font-display font-semibold text-[0.92rem] text-[#ece6ff] mb-1">{title}</div>
            <div className="font-body text-[0.75rem] text-[#625c7c]">{desc}</div>
          </Link>
        ))}
      </div>

      {!import.meta.env.VITE_SUPABASE_URL && (
        <div className="mt-8 px-5 py-[18px] bg-[#282042] border border-[#3e325e] rounded-[6px] max-w-[600px]">
          <div className="font-mono text-[0.7rem] tracking-[0.08em] text-[#504270] mb-2.5 uppercase">
            Setup required
          </div>
          <p className="font-body text-[0.8rem] text-[#625c7c] m-0 leading-[1.6]">
            Add <code className="bg-[#171228] px-1.5 py-[2px] rounded-[3px] font-mono text-[0.75rem] text-[#ece6ff]">VITE_SUPABASE_URL</code> and{' '}
            <code className="bg-[#171228] px-1.5 py-[2px] rounded-[3px] font-mono text-[0.75rem] text-[#ece6ff]">VITE_SUPABASE_ANON_KEY</code> to{' '}
            <code className="bg-[#171228] px-1.5 py-[2px] rounded-[3px] font-mono text-[0.75rem] text-[#ece6ff]">.env.local</code> to connect to Supabase.
            Until then, the public site shows mock data.
          </p>
        </div>
      )}
    </div>
  )
}
