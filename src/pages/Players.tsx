import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
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

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'player_name' ? 'asc' : 'desc')
    }
  }

  const players = [...(data ?? [])].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    const dir = sortDir === 'asc' ? 1 : -1
    if (typeof av === 'string') return av.localeCompare(bv as string) * dir
    return ((av as number) - (bv as number)) * dir
  })

  function SortIndicator({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span style={{ color: '#3e325e', marginLeft: '3px' }}>⇅</span>
    return <span style={{ color: '#b87aff', marginLeft: '3px' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
  }

  const columns: { label: string; key: SortKey; align: 'left' | 'right' }[] = [
    { label: 'Player',       key: 'player_name',   align: 'left'  },
    { label: 'Games',        key: 'games_played',  align: 'right' },
    { label: 'Wins',         key: 'wins',          align: 'right' },
    { label: 'Win rate',     key: 'win_rate',      align: 'right' },
    { label: 'Avg score',    key: 'avg_score',     align: 'right' },
    { label: 'Best score',   key: 'best_score',    align: 'right' },
    { label: 'Avg position', key: 'avg_position',  align: 'right' },
  ]

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <PageHeader title="Players" subtitle={`${players.length} players in the record`} />

      <div style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #282042' }}>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{
                    padding: '11px 18px',
                    textAlign: col.align,
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: sortKey === col.key ? '#8e87a8' : '#504270',
                    cursor: 'pointer',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.label}<SortIndicator col={col.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr
                key={p.player_name}
                style={{ borderBottom: i < players.length - 1 ? '1px solid #282042' : 'none', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#282042')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '13px 18px' }}>
                  <Link to={`/players/${p.player_name}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.9rem', color: '#ece6ff', textDecoration: 'none' }}>
                    {profileMap[p.player_name]?.preferred_color && (
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: profileMap[p.player_name].preferred_color!, border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0, display: 'inline-block' }} />
                    )}
                    {p.player_name}
                  </Link>
                </td>
                <td style={numTd}>{p.games_played}</td>
                <td style={numTd}>{p.wins}</td>
                <td style={{ ...numTd, color: p.win_rate >= 50 ? '#4a9e6b' : p.win_rate > 0 ? '#c9a030' : '#625c7c' }}>
                  {p.win_rate.toFixed(1)}%
                </td>
                <td style={numTd}>{p.avg_score.toFixed(1)}</td>
                <td style={{ ...numTd, color: '#c9a030', fontWeight: 700 }}>{p.best_score}</td>
                <td style={{ ...numTd, color: '#8e87a8' }}>{p.avg_position.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const loadingStyle: React.CSSProperties = {
  padding: '32px 36px',
  color: '#625c7c',
  fontFamily: 'var(--font-body)',
}

const numTd: React.CSSProperties = {
  padding: '13px 18px',
  textAlign: 'right',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.85rem',
  color: '#bbb4d0',
}
