import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import { SkeletonHeader, SkeletonTable } from '../components/ui/PageSkeleton'
import DataTable from '../components/ui/DataTable'
import type { DataTableColumn } from '../components/ui/DataTable'
import { usePlayerStats, usePlayerProfiles } from '../lib/hooks'
import type { PlayerStats } from '../types/database'
import { cn } from '@/lib/utils'

type SortKey = keyof Pick<PlayerStats, 'player_name' | 'games_played' | 'wins' | 'win_rate' | 'avg_score' | 'best_score' | 'avg_position'>

export default function Players() {
  const { data, isLoading, error } = usePlayerStats()
  const { data: profiles = [] } = usePlayerProfiles()
  const profileMap = Object.fromEntries(profiles.map(p => [p.player_name, p]))
  const [sortKey, setSortKey] = useState<SortKey>('wins')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  if (isLoading) return (
    <div className="page-enter py-8 px-9">
      <SkeletonHeader />
      <SkeletonTable rows={6} cols={6} />
    </div>
  )
  if (error)     return <div className="py-8 px-9 font-body text-[var(--text-4)]">Failed to load data.</div>

  function handleSort(key: string) {
    const k = key as SortKey
    if (sortKey === k) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(k)
      setSortDir(k === 'player_name' ? 'asc' : 'desc')
    }
  }

  const players = [...(data ?? [])].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    const dir = sortDir === 'asc' ? 1 : -1
    if (typeof av === 'string') return av.localeCompare(bv as string) * dir
    return ((av as number) - (bv as number)) * dir
  })

  const columns: DataTableColumn<PlayerStats>[] = [
    {
      key: 'player_name',
      label: 'Player',
      align: 'left',
      sortable: true,
      render: p => (
        <Link
          to={`/players/${encodeURIComponent(p.player_name)}`}
          className="inline-flex items-center gap-2 font-body font-semibold text-[0.9rem] text-foreground no-underline hover:text-mars-400 transition-colors"
        >
          {profileMap[p.player_name]?.preferred_color && (
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 inline-block border border-white/15"
              style={{ background: profileMap[p.player_name].preferred_color! }}
            />
          )}
          {p.player_name}
        </Link>
      ),
    },
    { key: 'games_played', label: 'Games',          align: 'center', sortable: true },
    { key: 'wins',         label: 'Total Wins',     align: 'center', sortable: true },
    {
      key: 'win_rate',
      label: 'Win Rate',
      align: 'center',
      sortable: true,
      render: p => (
        <span className={cn(p.win_rate >= 50 ? 'text-win-500' : p.win_rate > 0 ? 'text-score-400' : 'text-[var(--text-4)]')}>
          {Math.round(p.win_rate)}%
        </span>
      ),
    },
    {
      key: 'avg_score',
      label: 'Avg Score/Game',
      align: 'center',
      sortable: true,
      render: p => <>{Math.round(p.avg_score)}</>,
    },
    {
      key: 'best_score',
      label: 'Best Score',
      align: 'center',
      sortable: true,
      tdStyle: { fontWeight: 700 },
      render: p => <span className="text-score-400 font-bold">{p.best_score}<span className="ml-[3px]">VP</span></span>,
    },
    {
      key: 'avg_position',
      label: 'Avg Position',
      align: 'center',
      sortable: true,
      tdStyle: { color: 'var(--text-3)' },
      render: p => <>{Math.round(p.avg_position)}</>,
    },
  ]

  return (
    <div className="page-enter py-8 px-9">
      <PageHeader title="Players" subtitle={`${players.length} players in the record`} />

      <DataTable
        className="players-table"
        columns={columns}
        rows={players}
        rowKey={p => p.player_name}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
      />

      {/* Mobile card list */}
      <div className="players-mobile flex-col gap-px bg-border border border-border rounded-[6px] overflow-hidden">
        {players.map(p => {
          const color = profileMap[p.player_name]?.preferred_color
          return (
            <div key={p.player_name} className="bg-card px-4 py-3.5">
              <Link
                to={`/players/${encodeURIComponent(p.player_name)}`}
                className="flex items-center gap-2 font-body font-semibold text-[0.95rem] text-foreground no-underline mb-2.5"
              >
                {color && (
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 inline-block border border-white/15" style={{ background: color }} />
                )}
                {p.player_name}
                <span className="ml-auto text-[var(--text-4)] text-[0.75rem]">→</span>
              </Link>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                <div>
                  <div className="font-mono text-[0.6rem] tracking-[0.08em] uppercase text-[var(--text-4)] mb-[2px]">Wins</div>
                  <div className="font-mono text-[0.85rem] text-secondary-foreground">
                    {p.wins} <span className="font-body text-[0.72rem] text-[var(--text-4)]">of {p.games_played} games</span>
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[0.6rem] tracking-[0.08em] uppercase text-[var(--text-4)] mb-[2px]">Win rate</div>
                  <div className={cn('font-mono text-[0.85rem]', p.win_rate >= 50 ? 'text-win-500' : p.win_rate > 0 ? 'text-score-400' : 'text-[var(--text-4)]')}>
                    {Math.round(p.win_rate)}%
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[0.6rem] tracking-[0.08em] uppercase text-[var(--text-4)] mb-[2px]">Avg score</div>
                  <div className="font-mono text-[0.85rem] text-secondary-foreground">
                    {Math.round(p.avg_score)} <span className="font-body text-[0.72rem] text-[var(--text-4)]">VP</span>
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[0.6rem] tracking-[0.08em] uppercase text-[var(--text-4)] mb-[2px]">Best score</div>
                  <div className="font-mono text-[0.85rem] font-bold text-score-400">
                    {p.best_score} <span className="font-body text-[0.72rem] text-[var(--text-4)]">VP</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
