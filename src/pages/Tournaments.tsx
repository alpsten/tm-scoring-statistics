import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonHeader, SkeletonCardGrid } from '../components/ui/PageSkeleton'
import { useTournaments } from '../lib/hooks'
import { cn } from '@/lib/utils'

const STATUS_STYLE: Record<string, string> = {
  qualifying: 'text-[#5b8dd9] bg-[rgba(91,141,217,0.1)] border-[rgba(91,141,217,0.3)]',
  final:      'text-score-400 bg-score-400/10 border-score-400/30',
  completed:  'text-win-500 bg-win-500/10 border-win-500/30',
}

export default function Tournaments() {
  const { data: tournaments, isLoading } = useTournaments()

  if (isLoading) return (
    <div className="page-enter py-8 px-9">
      <SkeletonHeader />
      <SkeletonCardGrid count={3} />
    </div>
  )

  const rows = tournaments ?? []

  return (
    <div className="page-enter py-8 px-9">
      <PageHeader title="Tournaments" subtitle={rows.length > 0 ? `${rows.length} tournaments` : undefined} />
      {rows.length === 0 ? (
        <EmptyState message="No tournaments yet." />
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {rows.map(t => (
            <Link
              key={t.id}
              to={`/tournaments/${t.id}`}
              className="block p-5 bg-card border border-border rounded-[6px] no-underline hover:border-mars-500/40 transition-colors"
            >
              <div className="font-display font-semibold text-[0.95rem] text-foreground mb-2">{t.name}</div>
              <span className={cn('inline-block font-mono text-[0.65rem] tracking-[0.08em] uppercase border rounded px-2 py-[2px]', STATUS_STYLE[t.status])}>
                {t.status}
              </span>
              <div className="font-body text-[0.72rem] text-[var(--text-4)] mt-3">
                Started {new Date(t.created_at).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
