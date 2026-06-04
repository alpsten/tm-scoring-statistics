import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import { SkeletonHeader, SkeletonTable } from '../components/ui/PageSkeleton'
import { useCorpStats, useMergerStats } from '../lib/hooks'
import type { CorporationStats } from '../types/database'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type SortKey = keyof Pick<CorporationStats, 'corporation' | 'games_played' | 'wins' | 'win_rate' | 'avg_score' | 'best_score'>

const CORP_COLORS = ['#9b50f0', '#e05535', '#2e8b8b', '#d4a820', '#4a9e6b', '#b87aff']
const PIE_COLORS = ['#9b50f0','#e05535','#2e8b8b','#c9a030','#4a9e6b','#b87aff','#3bbfbf','#5b8dd9','#d4a820','#aaaaaa','#888888']

const numTdClass = 'px-[18px] py-[13px] text-center font-mono text-[0.85rem] text-secondary-foreground'

const COLS: { key: SortKey; label: string; align: 'left' | 'center' }[] = [
  { key: 'corporation', label: 'Corporation', align: 'left'   },
  { key: 'games_played', label: 'Games',       align: 'center' },
  { key: 'wins',         label: 'Wins',        align: 'center' },
  { key: 'win_rate',     label: 'Win rate',    align: 'center' },
  { key: 'avg_score',    label: 'Avg score',   align: 'center' },
  { key: 'best_score',   label: 'Best score',  align: 'center' },
]

function winRateColor(wr: number) {
  return wr >= 60 ? 'text-win-500' : wr >= 40 ? 'text-score-400' : 'text-mars-500'
}

export default function Corporations() {
  const { data, isLoading, error } = useCorpStats()
  const { data: mergerData } = useMergerStats()
  const [sortKey, setSortKey] = useState<SortKey>('corporation')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  if (isLoading) return (
    <div className="page-enter py-8 px-9">
      <SkeletonHeader />
      <SkeletonTable rows={8} cols={6} />
    </div>
  )
  if (error) return <div className="py-8 px-9 font-body text-[var(--text-4)]">Failed to load data.</div>

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  function toggleSelect(corp: string) {
    setSelected(s => s.includes(corp) ? s.filter(c => c !== corp) : [...s, corp])
  }

  const allCorps = data ?? []
  const mergerCorps = mergerData ?? []

  function sortCorps(list: typeof allCorps) {
    return [...list]
      .filter(c => c.corporation.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey]
        if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
        return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
      })
  }

  const filtered = sortCorps(allCorps)
  const filteredMergers = mergerCorps.filter(c => c.combo.toLowerCase().includes(search.toLowerCase()))
  const selectedCorps = allCorps.filter(c => selected.includes(c.corporation))

  return (
    <div className="page-enter py-8 px-9">
      <PageHeader title="Corporations" subtitle={`${allCorps.length} corporations played`} />

      {/* Comparison panel */}
      {selectedCorps.length >= 2 && (
        <div className="bg-card border border-violet-500/40 rounded-[6px] px-6 py-5 mb-6">
          <div className="flex justify-between items-center mb-4">
            <span className="font-display font-semibold text-[0.8rem] tracking-[0.1em] uppercase text-violet-400">
              Comparing {selectedCorps.length} corporations
            </span>
            <Button variant="ghost" size="xs" onClick={() => setSelected([])} className="text-[var(--text-4)] text-[0.75rem]">
              Clear ✕
            </Button>
          </div>

          <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: `repeat(${selectedCorps.length}, 1fr)` }}>
            {selectedCorps.map((c, i) => (
              <div
                key={c.corporation}
                className="bg-accent rounded-[5px] px-4 py-3.5"
                style={{ borderLeft: `3px solid ${CORP_COLORS[i % CORP_COLORS.length]}` }}
              >
                <div className="font-display font-semibold text-[0.88rem] text-foreground mb-2.5 truncate">
                  {c.corporation}
                </div>
                {[
                  { label: 'Games',     value: c.games_played.toString() },
                  { label: 'Wins',      value: c.wins.toString() },
                  { label: 'Win rate',  value: `${Math.round(c.win_rate)}%` },
                  { label: 'Avg score', value: Math.round(c.avg_score) },
                  { label: 'Best',      value: c.best_score.toString() },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between mb-1">
                    <span className="font-body text-[0.72rem] text-[var(--text-4)]">{label}</span>
                    <span className="font-mono text-[0.78rem] text-secondary-foreground">{value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="font-body text-[0.68rem] tracking-[0.08em] uppercase text-[var(--text-4)] mb-2">
            Avg score comparison
          </div>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={selectedCorps} layout="vertical" barSize={16}>
              <XAxis type="number" tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-4)' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="corporation" width={130} tick={{ fontFamily: 'var(--font-body)', fontSize: 11, fill: 'var(--text-4)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-input)', border: '1px solid var(--bd-secondary)', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-1)' }}
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
      {allCorps.length > 0 && (() => {
        const sorted = [...allCorps].sort((a, b) => b.games_played - a.games_played)
        const top = sorted.slice(0, 10)
        const rest = sorted.slice(10)
        const pieData = [
          ...top.map(c => ({ name: c.corporation, value: c.games_played })),
          ...(rest.length > 0 ? [{ name: 'Other', value: rest.reduce((s, c) => s + c.games_played, 0) }] : []),
        ]
        return (
          <div className="bg-card border border-border rounded-[6px] px-6 py-5 mb-7">
            <div className="font-body text-[0.68rem] font-semibold tracking-[0.08em] uppercase text-[var(--text-4)] mb-4">
              Play count distribution
            </div>
            <div className="corp-pie-layout">
              <div className="corp-pie-legend">
                {pieData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="font-body text-[0.78rem] text-secondary-foreground flex-1">{item.name}</span>
                    <span className="font-mono text-[0.72rem] text-[var(--text-4)]">{item.value}</span>
                  </div>
                ))}
              </div>
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
                      label={({ cx, cy, midAngle, outerRadius, percent }: { cx?: number; cy?: number; midAngle?: number; outerRadius?: number; percent?: number }) => {
                        if ((percent ?? 0) <= 0.04) return null
                        const RADIAN = Math.PI / 180
                        const r = (outerRadius ?? 0) * 0.75
                        const x = (cx ?? 0) + r * Math.cos(-(midAngle ?? 0) * RADIAN)
                        const y = (cy ?? 0) + r * Math.sin(-(midAngle ?? 0) * RADIAN)
                        return (
                          <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
                            style={{ fontSize: '9px', fontFamily: 'Space Mono, monospace', fill: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>
                            {`${Math.round((percent ?? 0) * 100)}%`}
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
                      contentStyle={{ background: 'var(--bg-input)', border: '1px solid var(--bd-secondary)', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-1)' }}
                      formatter={(value, name) => [`${value} games`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Search + hint */}
      <div className="flex items-center gap-4 mb-4">
        <Input
          type="text"
          placeholder="Search corporations…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-[240px] h-[34px] text-[0.83rem]"
        />
        {selected.length > 0 && selected.length < 2 && (
          <span className="font-body text-[0.75rem] text-[var(--text-4)]">Select one more to compare</span>
        )}
        {selected.length === 0 && (
          <span className="font-body text-[0.75rem] text-[var(--text-4)]">Check boxes to compare corporations</span>
        )}
      </div>

      <div className="bg-card border border-border rounded-[6px] overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3.5 py-[11px] w-9" />
              {COLS.map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={cn(
                    'px-[18px] py-[11px] font-body text-[0.7rem] font-semibold tracking-[0.08em] uppercase cursor-pointer select-none whitespace-nowrap transition-colors',
                    col.align === 'center' ? 'text-center' : 'text-left',
                    sortKey === col.key ? 'text-[#5b8dd9]' : 'text-[var(--text-4)]'
                  )}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1 opacity-70">{sortDir === 'desc' ? '↓' : '↑'}</span>
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
                  className={cn(
                    'transition-colors',
                    i < filtered.length - 1 && 'border-b border-border',
                    isSelected ? 'bg-violet-500/6' : 'hover:bg-accent'
                  )}
                >
                  <td className="px-3.5 py-[11px] text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(c.corporation)}
                      className="cursor-pointer accent-violet-500"
                    />
                  </td>
                  <td className="px-[18px] py-[13px]">
                    <Link
                      to={`/corporations/${encodeURIComponent(c.corporation)}`}
                      className="font-body font-medium text-[0.87rem] text-foreground no-underline hover:text-mars-400 transition-colors"
                    >
                      {c.corporation}
                    </Link>
                  </td>
                  <td className={numTdClass}>{c.games_played}</td>
                  <td className={numTdClass}>{c.wins}</td>
                  <td className={cn(numTdClass, winRateColor(c.win_rate))}>{Math.round(c.win_rate)}%</td>
                  <td className={numTdClass}>{Math.round(c.avg_score)}</td>
                  <td className={cn(numTdClass, 'text-score-400 font-bold')}>
                    {c.best_score}<span className="font-mono text-[0.85rem] font-bold text-score-400 ml-[3px]">VP</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 font-body text-[0.75rem] text-[var(--text-4)] italic">
        Win rate with fewer than 5 games is statistically noisy. Sample size shown for context.
      </p>

      {/* Merger plays */}
      {filteredMergers.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2.5 mb-3">
            <h2 className="font-display font-semibold text-[0.85rem] tracking-[0.1em] uppercase text-[var(--text-4)] m-0">
              Merger plays
            </h2>
            <span className="font-body text-[0.72rem] text-[var(--text-4)] bg-card border border-border rounded-[10px] px-2 py-[1px]">
              Merger Prelude card
            </span>
          </div>
          <div className="bg-card border border-border rounded-[6px] overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3.5 py-[11px] w-9" />
                  {COLS.map(col => (
                    <th key={col.key} className={cn('px-[18px] py-[11px] font-body text-[0.7rem] font-semibold tracking-[0.08em] uppercase text-[var(--text-4)] whitespace-nowrap', col.align === 'center' ? 'text-center' : 'text-left')}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMergers.map((c, i) => (
                  <tr
                    key={c.combo}
                    className={cn('hover:bg-accent transition-colors', i < filteredMergers.length - 1 && 'border-b border-border')}
                  >
                    <td className="px-3.5 py-[11px]" />
                    <td className="px-[18px] py-[13px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link to={`/cards/${encodeURIComponent(c.corp1)}`} className="font-body font-medium text-[0.87rem] text-foreground no-underline hover:text-mars-400 transition-colors">{c.corp1}</Link>
                        <span className="font-mono text-[0.7rem] text-score-400 font-bold">+</span>
                        <Link to={`/cards/${encodeURIComponent(c.corp2)}`} className="font-body font-medium text-[0.87rem] text-foreground no-underline hover:text-mars-400 transition-colors">{c.corp2}</Link>
                      </div>
                    </td>
                    <td className={numTdClass}>{c.games_played}</td>
                    <td className={numTdClass}>{c.wins}</td>
                    <td className={cn(numTdClass, winRateColor(c.win_rate))}>{Math.round(c.win_rate)}%</td>
                    <td className={numTdClass}>{Math.round(c.avg_score)}</td>
                    <td className={cn(numTdClass, 'text-score-400 font-bold')}>
                      {c.best_score}<span className="font-mono text-[0.85rem] font-bold text-score-400 ml-[3px]">VP</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2.5 font-body text-[0.73rem] text-[var(--text-4)] italic">
            Merger plays are tracked as a combined entry. Individual corporation links show their solo stats.
          </p>
        </div>
      )}
    </div>
  )
}
