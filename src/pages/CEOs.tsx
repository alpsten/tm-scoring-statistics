import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonTable } from '../components/ui/PageSkeleton'
import DataTable from '../components/ui/DataTable'
import type { DataTableColumn } from '../components/ui/DataTable'
import { useCEOStats } from '../lib/hooks'
import { cn } from '@/lib/utils'

type CEORow = { rank: number; ceo_name: string; times_played: number; wins: number; win_rate: number }

const columns: DataTableColumn<CEORow>[] = [
  {
    key: 'rank',
    label: '#',
    align: 'center',
    tdStyle: { width: '36px', fontSize: '0.7rem', color: 'var(--text-4)' },
  },
  {
    key: 'ceo_name',
    label: 'CEO',
    align: 'left',
    tdStyle: { fontFamily: 'var(--font-body)', fontSize: '0.87rem', color: 'var(--text-1)' },
    render: c => (
      <>
        <span className="font-mono text-[0.68rem] text-[#d07832] bg-[rgba(210,120,50,0.1)] border border-[rgba(210,120,50,0.3)] rounded mr-2 px-[7px] py-[1px]">
          CEO
        </span>
        <Link to={`/cards/${encodeURIComponent(c.ceo_name)}`} className="text-foreground no-underline hover:text-mars-400 transition-colors">
          {c.ceo_name}
        </Link>
      </>
    ),
  },
  {
    key: 'times_played',
    label: 'Played',
    align: 'center',
    tdStyle: { fontSize: '0.87rem' },
  },
  {
    key: 'wins',
    label: 'Wins',
    align: 'center',
    tdStyle: { fontSize: '0.87rem' },
    render: c => (
      <span className={c.wins > 0 ? 'text-win-500' : 'text-[var(--text-4)]'}>{c.wins}</span>
    ),
  },
  {
    key: 'win_rate',
    label: 'Win Rate',
    align: 'center',
    tdStyle: { fontSize: '0.87rem' },
    render: c => (
      <span className={cn(c.win_rate >= 50 ? 'text-win-500' : c.win_rate > 0 ? 'text-score-400' : 'text-[var(--text-4)]')}>
        {c.win_rate.toFixed(0)}%
      </span>
    ),
  },
]

export default function CEOs() {
  const { data: ceos = [], isLoading } = useCEOStats()
  const rows: CEORow[] = ceos.map((c, i) => ({ rank: i + 1, ...c }))

  return (
    <div className="page-enter py-8 px-9">
      <PageHeader
        title="CEOs"
        subtitle={ceos.length > 0 ? `${ceos.length} CEOs played` : 'CEO expansion statistics'}
      />
      {isLoading ? (
        <SkeletonTable rows={6} cols={5} />
      ) : ceos.length === 0 ? (
        <EmptyState message="No CEO data logged yet." />
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={c => c.ceo_name} compact />
      )}
    </div>
  )
}
