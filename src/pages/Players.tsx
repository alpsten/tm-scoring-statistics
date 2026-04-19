import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import DataTable from '../components/ui/DataTable'
import type { DataTableColumn } from '../components/ui/DataTable'
import { usePlayerStats, usePlayerProfiles } from '../lib/hooks'
import type { PlayerStats } from '../types/database'

type SortKey = keyof Pick<PlayerStats, 'player_name' | 'games_played' | 'wins' | 'win_rate' | 'avg_score' | 'best_score' | 'avg_position'>

export default function Players() {
  const { data, isLoading, error } = usePlayerStats()
  const { data: profiles = [] } = usePlayerProfiles()
  const profileMap = Object.fromEntries(profiles.map(p => [p.player_name, p]))
  const [sortKey, setSortKey] = useState<SortKey>('wins')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  if (isLoading) return <div style={loadingStyle}>Loading…</div>
  if (error) return <div style={loadingStyle}>Failed to load data.</div>

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
      tdStyle: { fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-1)' },
      render: p => (
        <Link
          to={`/players/${encodeURIComponent(p.player_name)}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-1)', textDecoration: 'none' }}
        >
          {profileMap[p.player_name]?.preferred_color && (
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: profileMap[p.player_name].preferred_color!, border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0, display: 'inline-block' }} />
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
        <span style={{ color: p.win_rate >= 50 ? '#4a9e6b' : p.win_rate > 0 ? '#c9a030' : '#707070' }}>
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
      tdStyle: { color: '#c9a030', fontWeight: 700 },
      render: p => <>{p.best_score}<span style={{ marginLeft: '3px' }}>VP</span></>,
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
    <div className="page-enter" style={{ padding: '32px 36px' }}>
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
      <div className="players-mobile" style={{ gap: '1px', background: 'var(--bd-panel)', border: '1px solid var(--bd-panel)', borderRadius: '6px', overflow: 'hidden' }}>
        {players.map(p => {
          const color = profileMap[p.player_name]?.preferred_color
          return (
            <div key={p.player_name} style={{ background: 'var(--bg-panel)', padding: '14px 16px' }}>
              <Link
                to={`/players/${encodeURIComponent(p.player_name)}`}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-1)', textDecoration: 'none', marginBottom: '10px' }}
              >
                {color && (
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0, display: 'inline-block' }} />
                )}
                {p.player_name}
                <span style={{ marginLeft: 'auto', color: 'var(--text-4)', fontSize: '0.75rem' }}>→</span>
              </Link>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: '7px', columnGap: '16px' }}>
                <div>
                  <div style={mobileLabel}>Wins</div>
                  <div style={mobileValue}>{p.wins} <span style={mobileSub}>of {p.games_played} games</span></div>
                </div>
                <div>
                  <div style={mobileLabel}>Win rate</div>
                  <div style={{ ...mobileValue, color: p.win_rate >= 50 ? '#4a9e6b' : p.win_rate > 0 ? '#c9a030' : '#707070' }}>{Math.round(p.win_rate)}%</div>
                </div>
                <div>
                  <div style={mobileLabel}>Avg score</div>
                  <div style={mobileValue}>{Math.round(p.avg_score)} <span style={mobileSub}>VP</span></div>
                </div>
                <div>
                  <div style={mobileLabel}>Best score</div>
                  <div style={{ ...mobileValue, color: '#c9a030', fontWeight: 700 }}>{p.best_score} <span style={{ ...mobileSub, color: '#707070' }}>VP</span></div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const loadingStyle: React.CSSProperties = {
  padding: '32px 36px',
  color: 'var(--text-4)',
  fontFamily: 'var(--font-body)',
}

const mobileLabel: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.6rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-4)',
  marginBottom: '2px',
}

const mobileValue: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.85rem',
  color: 'var(--text-2)',
}

const mobileSub: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.72rem',
  color: 'var(--text-4)',
}
