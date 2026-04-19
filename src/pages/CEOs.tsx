import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import DataTable from '../components/ui/DataTable'
import type { DataTableColumn } from '../components/ui/DataTable'
import { useCEOStats } from '../lib/hooks'

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
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: '#d07832', background: 'rgba(210,120,50,0.1)', border: '1px solid rgba(210,120,50,0.3)', borderRadius: '4px', padding: '1px 7px', marginRight: '8px' }}>
          CEO
        </span>
        <Link to={`/cards/${encodeURIComponent(c.ceo_name)}`} style={{ color: 'var(--text-1)', textDecoration: 'none' }}>
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
    tdStyle: { fontSize: '0.87rem', color: '#4a9e6b' },
  },
  {
    key: 'win_rate',
    label: 'Win Rate',
    align: 'center',
    tdStyle: { fontSize: '0.87rem' },
    render: c => (
      <span style={{ color: c.win_rate >= 50 ? '#4a9e6b' : c.win_rate > 0 ? '#c9a030' : '#707070' }}>
        {c.win_rate.toFixed(0)}%
      </span>
    ),
  },
]

export default function CEOs() {
  const { data: ceos = [], isLoading } = useCEOStats()
  const rows: CEORow[] = ceos.map((c, i) => ({ rank: i + 1, ...c }))

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <PageHeader title="CEOs" subtitle={ceos.length > 0 ? `${ceos.length} CEOs played` : 'CEO expansion statistics'} />

      {/* TODO notice */}
      <div style={{
        marginBottom: '28px',
        padding: '10px 14px',
        background: 'rgba(201,160,48,0.06)',
        border: '1px solid rgba(201,160,48,0.2)',
        borderRadius: '4px',
        fontFamily: 'var(--font-body)',
        fontSize: '0.78rem',
        color: '#c9a030',
      }}>
        TODO — More CEO stats planned: win rate per CEO, pick rate by expansion.
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--text-4)', fontFamily: 'var(--font-body)' }}>Loading…</div>
      ) : ceos.length === 0 ? (
        <EmptyState message="No CEO data logged yet." />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={c => c.ceo_name}
          compact
        />
      )}
    </div>
  )
}
