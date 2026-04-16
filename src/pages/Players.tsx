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

  const columns: { label: string; key: SortKey; align: 'left' | 'center' }[] = [
    { label: 'Player',          key: 'player_name',   align: 'left'   },
    { label: 'Games',           key: 'games_played',  align: 'center' },
    { label: 'Total Wins',      key: 'wins',          align: 'center' },
    { label: 'Win Rate',        key: 'win_rate',      align: 'center' },
    { label: 'Avg Score/Game',  key: 'avg_score',     align: 'center' },
    { label: 'Best Score',      key: 'best_score',    align: 'center' },
    { label: 'Avg Position',    key: 'avg_position',  align: 'center' },
  ]

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <PageHeader title="Players" subtitle={`${players.length} players in the record`} />

      {/* Desktop table */}
      <div className="players-table" style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', overflow: 'hidden' }}>
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
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.68rem',
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
                  <Link to={`/players/${encodeURIComponent(p.player_name)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.9rem', color: '#ece6ff', textDecoration: 'none' }}>
                    {profileMap[p.player_name]?.preferred_color && (
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: profileMap[p.player_name].preferred_color!, border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0, display: 'inline-block' }} />
                    )}
                    {p.player_name}
                  </Link>
                </td>
                <td style={numTd}>{p.games_played}</td>
                <td style={numTd}>{p.wins}</td>
                <td style={{ ...numTd, color: p.win_rate >= 50 ? '#4a9e6b' : p.win_rate > 0 ? '#c9a030' : '#625c7c' }}>
                  {Math.round(p.win_rate)}%
                </td>
                <td style={numTd}>{Math.round(p.avg_score)}</td>
                <td style={{ ...numTd, color: '#c9a030', fontWeight: 700 }}>{p.best_score}<span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: '#c9a030', marginLeft: '3px' }}>VP</span></td>
                <td style={{ ...numTd, color: '#8e87a8' }}>{Math.round(p.avg_position)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="players-mobile" style={{ gap: '1px', background: '#282042', border: '1px solid #282042', borderRadius: '6px', overflow: 'hidden' }}>
        {players.map(p => {
          const color = profileMap[p.player_name]?.preferred_color
          return (
            <div key={p.player_name} style={{ background: '#1e1835', padding: '14px 16px' }}>
              <Link
                to={`/players/${encodeURIComponent(p.player_name)}`}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.95rem', color: '#ece6ff', textDecoration: 'none', marginBottom: '10px' }}
              >
                {color && (
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0, display: 'inline-block' }} />
                )}
                {p.player_name}
                <span style={{ marginLeft: 'auto', color: '#504270', fontSize: '0.75rem' }}>→</span>
              </Link>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: '7px', columnGap: '16px' }}>
                <div>
                  <div style={mobileLabel}>Wins</div>
                  <div style={mobileValue}>{p.wins} <span style={mobileSub}>of {p.games_played} games</span></div>
                </div>
                <div>
                  <div style={mobileLabel}>Win rate</div>
                  <div style={{ ...mobileValue, color: p.win_rate >= 50 ? '#4a9e6b' : p.win_rate > 0 ? '#c9a030' : '#625c7c' }}>{Math.round(p.win_rate)}%</div>
                </div>
                <div>
                  <div style={mobileLabel}>Avg score</div>
                  <div style={mobileValue}>{Math.round(p.avg_score)} <span style={mobileSub}>VP</span></div>
                </div>
                <div>
                  <div style={mobileLabel}>Best score</div>
                  <div style={{ ...mobileValue, color: '#c9a030', fontWeight: 700 }}>{p.best_score} <span style={{ ...mobileSub, color: '#625c7c' }}>VP</span></div>
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
  color: '#625c7c',
  fontFamily: 'var(--font-body)',
}

const numTd: React.CSSProperties = {
  padding: '13px 18px',
  textAlign: 'center',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.85rem',
  color: '#bbb4d0',
}

const mobileLabel: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.6rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#504270',
  marginBottom: '2px',
}

const mobileValue: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.85rem',
  color: '#bbb4d0',
}

const mobileSub: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.72rem',
  color: '#504270',
}
