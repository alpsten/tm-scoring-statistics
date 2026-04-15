import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import { useCorpStats } from '../lib/hooks'
import type { CorporationStats } from '../types/database'

type SortKey = keyof Pick<CorporationStats, 'corporation' | 'games_played' | 'wins' | 'win_rate' | 'avg_score' | 'best_score'>

const CORP_COLORS = ['#9b50f0', '#e05535', '#2e8b8b', '#d4a820', '#4a9e6b', '#b87aff']
const PIE_COLORS = ['#9b50f0','#e05535','#2e8b8b','#c9a030','#4a9e6b','#b87aff','#3bbfbf','#5b8dd9','#d4a820','#8e87a8','#504270']

export default function Corporations() {
  const { data, isLoading, error } = useCorpStats()
  const [sortKey, setSortKey] = useState<SortKey>('avg_score')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  if (isLoading) return <div style={loadingStyle}>Loading…</div>
  if (error) return <div style={loadingStyle}>Failed to load data.</div>

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  function toggleSelect(corp: string) {
    setSelected(s => s.includes(corp) ? s.filter(c => c !== corp) : [...s, corp])
  }

  const allCorps = data ?? []
  const singleCorps = allCorps.filter(c => !c.corporation.includes(', '))
  const mergerCorps = allCorps.filter(c => c.corporation.includes(', '))

  function sortCorps(list: typeof allCorps) {
    return [...list]
      .filter(c => c.corporation.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey]
        if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
        return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
      })
  }

  const filtered = sortCorps(singleCorps)
  const filteredMergers = sortCorps(mergerCorps)

  const selectedCorps = allCorps.filter(c => selected.includes(c.corporation))

  const COLS: { key: SortKey; label: string; align: 'left' | 'center' }[] = [
    { key: 'corporation', label: 'Corporation', align: 'left'   },
    { key: 'games_played', label: 'Games',       align: 'center' },
    { key: 'wins',         label: 'Wins',        align: 'center' },
    { key: 'win_rate',     label: 'Win rate',    align: 'center' },
    { key: 'avg_score',    label: 'Avg score',   align: 'center' },
    { key: 'best_score',   label: 'Best score',  align: 'center' },
  ]

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <PageHeader title="Corporations" subtitle={`${singleCorps.length} corporations played`} />

      {/* Comparison panel */}
      {selectedCorps.length >= 2 && (
        <div style={{ background: '#1e1835', border: '1px solid #9b50f0', borderRadius: '6px', padding: '20px 24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b87aff' }}>
              Comparing {selectedCorps.length} corporations
            </span>
            <button onClick={() => setSelected([])} style={{ background: 'transparent', border: 'none', color: '#625c7c', fontFamily: 'var(--font-body)', fontSize: '0.75rem', cursor: 'pointer', padding: '2px 8px' }}>
              Clear ✕
            </button>
          </div>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${selectedCorps.length}, 1fr)`, gap: '12px', marginBottom: '20px' }}>
            {selectedCorps.map((c, i) => (
              <div key={c.corporation} style={{ background: '#282042', borderRadius: '5px', padding: '14px 16px', borderLeft: `3px solid ${CORP_COLORS[i % CORP_COLORS.length]}` }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.88rem', color: '#ece6ff', marginBottom: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.corporation}
                </div>
                {[
                  { label: 'Games',     value: c.games_played.toString() },
                  { label: 'Wins',      value: c.wins.toString() },
                  { label: 'Win rate',  value: `${c.win_rate.toFixed(0)}%` },
                  { label: 'Avg score', value: Math.round(c.avg_score) },
                  { label: 'Best',      value: c.best_score.toString() },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: '#625c7c' }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#bbb4d0' }}>{value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Avg score bar chart */}
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#504270', marginBottom: '8px' }}>
            Avg score comparison
          </div>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={selectedCorps} layout="vertical" barSize={16}>
              <XAxis type="number" tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#504270' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="corporation" width={130} tick={{ fontFamily: 'var(--font-body)', fontSize: 11, fill: '#8e87a8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#282042', border: '1px solid #3e325e', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#ece6ff' }}
                cursor={{ fill: 'rgba(155,80,240,0.05)' }}
              />
              <Bar dataKey="avg_score" radius={[0, 3, 3, 0]}>
                {selectedCorps.map((_, i) => (
                  <Cell key={i} fill={CORP_COLORS[i % CORP_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Play count pie chart */}
      {singleCorps.length > 0 && (() => {
        const sorted = [...singleCorps].sort((a, b) => b.games_played - a.games_played)
        const top = sorted.slice(0, 10)
        const rest = sorted.slice(10)
        const pieData = [
          ...top.map(c => ({ name: c.corporation, value: c.games_played })),
          ...(rest.length > 0 ? [{ name: 'Other', value: rest.reduce((s, c) => s + c.games_played, 0) }] : []),
        ]
        return (
          <div style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', padding: '20px 24px', marginBottom: '28px' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#504270', marginBottom: '16px' }}>
              Play count distribution
            </div>
            <div className="corp-pie-layout">
              {/* Custom legend list */}
              <div className="corp-pie-legend">
                {pieData.map((item, i) => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#bbb4d0', flex: 1 }}>{item.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#504270' }}>{item.value}</span>
                  </div>
                ))}
              </div>
              {/* Pie chart */}
              <div className="corp-pie-container">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius="80%"
                      paddingAngle={1}
                      label={({ cx, cy, midAngle, outerRadius, percent }: { cx: number; cy: number; midAngle: number; outerRadius: number; percent: number }) => {
                        if (percent <= 0.04) return null
                        const RADIAN = Math.PI / 180
                        const r = outerRadius * 0.75
                        const x = cx + r * Math.cos(-midAngle * RADIAN)
                        const y = cy + r * Math.sin(-midAngle * RADIAN)
                        return (
                          <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
                            style={{ fontSize: '9px', fontFamily: 'Space Mono, monospace', fill: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        )
                      }}
                      labelLine={false}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#282042', border: '1px solid #3e325e', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#ece6ff' }}
                      formatter={(value: number, name: string) => [`${value} games`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Search + hint */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Search corporations…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '240px', padding: '7px 12px', background: '#1e1835', border: '1px solid #3e325e', borderRadius: '4px', color: '#ece6ff', fontFamily: 'var(--font-body)', fontSize: '0.83rem', outline: 'none' }}
        />
        {selected.length > 0 && selected.length < 2 && (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#625c7c' }}>
            Select one more to compare
          </span>
        )}
        {selected.length === 0 && (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#504270' }}>
            Check boxes to compare corporations
          </span>
        )}
      </div>

      <div style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #282042' }}>
              <th style={{ padding: '11px 14px', width: '36px' }} />
              {COLS.map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  style={{
                    padding: '11px 18px',
                    textAlign: col.align,
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: sortKey === col.key ? '#b87aff' : '#504270',
                    cursor: 'pointer',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span style={{ marginLeft: '4px', opacity: 0.7 }}>{sortDir === 'desc' ? '↓' : '↑'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => {
              const isSelected = selected.includes(c.corporation)
              return (
                <tr
                  key={c.corporation}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid #282042' : 'none', transition: 'background 0.1s', background: isSelected ? 'rgba(155, 80, 240, 0.06)' : 'transparent' }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#282042' }}
                  onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(155, 80, 240, 0.06)' : 'transparent' }}
                >
                  <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(c.corporation)}
                      style={{ accentColor: '#9b50f0', cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '13px 18px' }}>
                    <Link to={`/corporations/${encodeURIComponent(c.corporation)}`} style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.87rem', color: '#ece6ff', textDecoration: 'none' }}>
                      {c.corporation}
                    </Link>
                  </td>
                  <td style={numTd}>{c.games_played}</td>
                  <td style={numTd}>{c.wins}</td>
                  <td style={{ ...numTd, color: c.win_rate === 100 ? '#4a9e6b' : c.win_rate > 0 ? '#c9a030' : '#625c7c' }}>
                    {c.win_rate.toFixed(0)}%
                  </td>
                  <td style={numTd}>{Math.round(c.avg_score)}</td>
                  <td style={{ ...numTd, color: '#c9a030', fontWeight: 700 }}>{c.best_score}<span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: '#c9a030', marginLeft: '3px' }}>VP</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: '16px', fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#504270', fontStyle: 'italic' }}>
        Win rate with fewer than 5 games is statistically noisy. Sample size shown for context.
      </p>

      {/* Merger plays */}
      {filteredMergers.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#625c7c', margin: 0 }}>
              Merger plays
            </h2>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: '#504270', background: '#1e1835', border: '1px solid #282042', borderRadius: '10px', padding: '1px 8px' }}>
              Merger Prelude card
            </span>
          </div>
          <div style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #282042' }}>
                  <th style={{ padding: '11px 14px', width: '36px' }} />
                  {COLS.map(col => (
                    <th key={col.key} style={{ padding: '11px 18px', textAlign: col.align, fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#504270', whiteSpace: 'nowrap' }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMergers.map((c, i) => {
                  const isSelected = selected.includes(c.corporation)
                  const parts = c.corporation.split(', ')
                  return (
                    <tr
                      key={c.corporation}
                      style={{ borderBottom: i < filteredMergers.length - 1 ? '1px solid #282042' : 'none', transition: 'background 0.1s', background: isSelected ? 'rgba(155, 80, 240, 0.06)' : 'transparent' }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#282042' }}
                      onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(155, 80, 240, 0.06)' : 'transparent' }}
                    >
                      <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(c.corporation)}
                          style={{ accentColor: '#9b50f0', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '13px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {parts.map((p, pi) => (
                            <span key={p} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Link to={`/corporations/${encodeURIComponent(p.trim())}`} style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.87rem', color: '#ece6ff', textDecoration: 'none' }}>
                                {p.trim()}
                              </Link>
                              {pi < parts.length - 1 && (
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#d4a820', fontWeight: 700 }}>+</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={numTd}>{c.games_played}</td>
                      <td style={numTd}>{c.wins}</td>
                      <td style={{ ...numTd, color: c.win_rate === 100 ? '#4a9e6b' : c.win_rate > 0 ? '#c9a030' : '#625c7c' }}>
                        {c.win_rate.toFixed(0)}%
                      </td>
                      <td style={numTd}>{Math.round(c.avg_score)}</td>
                      <td style={{ ...numTd, color: '#c9a030', fontWeight: 700 }}>{c.best_score}<span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: '#c9a030', marginLeft: '3px' }}>VP</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: '10px', fontFamily: 'var(--font-body)', fontSize: '0.73rem', color: '#504270', fontStyle: 'italic' }}>
            Merger plays are tracked as a combined entry. Individual corporation links show their solo stats.
          </p>
        </div>
      )}
    </div>
  )
}

const loadingStyle: React.CSSProperties = { padding: '32px 36px', color: '#625c7c', fontFamily: 'var(--font-body)' }
const numTd: React.CSSProperties = { padding: '13px 18px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#bbb4d0' }
