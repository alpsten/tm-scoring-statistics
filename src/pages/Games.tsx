import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getCorps } from '../types/database'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonHeader, SkeletonTable } from '../components/ui/PageSkeleton'
import { useGames, usePlayerProfiles } from '../lib/hooks'
import { EXPANSION_ICONS, ALL_MAPS, ALL_EXPANSIONS } from '../lib/expansions'
import SectionHeading from '../components/ui/SectionHeading'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function Games() {
  const { data, isLoading, error } = useGames()
  const { data: profiles = [] } = usePlayerProfiles()
  const profileColors = Object.fromEntries(profiles.map(p => [p.player_name, p.preferred_color]))
  const [search, setSearch]                     = useState('')
  const [mapFilters, setMapFilters]             = useState<string[]>([])
  const [expansionFilters, setExpansionFilters] = useState<string[]>([])

  if (isLoading) return (
    <div className="page-enter py-8 px-9">
      <SkeletonHeader />
      <div className="flex gap-2 mb-4"><div className="h-[34px] w-48 bg-card border border-border rounded-[5px] animate-pulse" /><div className="h-[34px] w-28 bg-card border border-border rounded-[5px] animate-pulse" /></div>
      <SkeletonTable rows={8} cols={5} />
    </div>
  )
  if (error)     return <div className="py-8 px-9 font-body text-[var(--text-4)]">Failed to load data.</div>

  const games = data ?? []

  const filtered = games.filter(g => {
    if (mapFilters.length > 0 && !mapFilters.includes(g.map_name ?? '')) return false
    if (expansionFilters.length > 0 && !expansionFilters.some(e => g.expansions.includes(e))) return false
    if (search) {
      const q = search.toLowerCase()
      const matchesPlayer = g.player_results.some(r => r.player_name.toLowerCase().includes(q))
      const matchesMap    = g.map_name?.toLowerCase().includes(q) ?? false
      if (!matchesPlayer && !matchesMap) return false
    }
    return true
  }).sort((a, b) => (b.game_number ?? 0) - (a.game_number ?? 0))

  const hasFilters = !!search || mapFilters.length > 0 || expansionFilters.length > 0

  function toggleMap(map: string) {
    setMapFilters(prev => prev.includes(map) ? prev.filter(m => m !== map) : [...prev, map])
  }
  function toggleExpansion(exp: string) {
    setExpansionFilters(prev => prev.includes(exp) ? prev.filter(e => e !== exp) : [...prev, exp])
  }

  return (
    <div className="page-enter py-8 px-9">
      <PageHeader
        title="Games"
        subtitle={hasFilters ? `${filtered.length} of ${games.length} sessions` : `${games.length} sessions logged`}
      />

      {/* Filter bar */}
      <div className="mb-6 flex flex-col gap-2">
        {/* Search */}
        <div className="flex gap-2.5 items-center flex-wrap">
          <Input
            type="text"
            placeholder="Search player or map…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-[220px] h-[34px] text-[0.83rem]"
          />
          {hasFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSearch(''); setMapFilters([]); setExpansionFilters([]) }}
              className="h-[34px] text-[0.78rem] text-[var(--text-4)]"
            >
              Clear all
            </Button>
          )}
        </div>

        {/* Map pills */}
        <div className="flex flex-col gap-1.5">
          <SectionHeading effect style={{ marginTop: '-40px', marginBottom: '-65px' }}>Map-Selection</SectionHeading>
          <div className="flex gap-1.5 flex-wrap pl-0.5 relative z-10">
            {ALL_MAPS.map(map => {
              const active = mapFilters.includes(map)
              return (
                <button
                  key={map}
                  onClick={() => toggleMap(map)}
                  className={cn(
                    'px-3 py-1 rounded border cursor-pointer transition-all font-display font-semibold text-[0.75rem]',
                    active
                      ? 'bg-[rgba(91,141,217,0.15)] border-[#5b8dd9] text-[#5b8dd9]'
                      : 'bg-card border-border text-[var(--text-4)] hover:text-muted-foreground'
                  )}
                >
                  {active ? '✓ ' : ''}{map}
                </button>
              )
            })}
          </div>
        </div>

        {/* Expansion pills */}
        <div className="flex flex-col gap-1.5">
          <SectionHeading effect style={{ marginTop: '-40px', marginBottom: '-65px' }}>Expansion-Selection</SectionHeading>
          <div className="flex gap-1.5 flex-wrap pl-0.5 relative z-10">
            {ALL_EXPANSIONS.map(exp => {
              const active = expansionFilters.includes(exp)
              return (
                <button
                  key={exp}
                  onClick={() => toggleExpansion(exp)}
                  title={exp}
                  className={cn(
                    'py-1 px-1.5 rounded border cursor-pointer transition-all flex items-center justify-center',
                    active
                      ? 'bg-[rgba(91,141,217,0.12)] border-[#5b8dd9] opacity-100'
                      : 'bg-card border-border opacity-70 hover:opacity-100'
                  )}
                >
                  {EXPANSION_ICONS[exp]
                    ? <img src={EXPANSION_ICONS[exp]} alt={exp} className="w-5 h-5 object-contain" />
                    : <span className={cn('font-body text-[0.75rem] px-1', active ? 'text-[#5b8dd9]' : 'text-[var(--text-4)]')}>{exp}</span>
                  }
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No games match the current filters." />
      ) : (
        <div className="flex flex-col gap-3.5">
          {filtered.map(game => {
            const sorted  = [...game.player_results].sort((a, b) => a.position - b.position)
            const gameNum = game.game_number

            return (
              <Link
                key={game.id}
                to={`/games/${gameNum}`}
                className="panel-hover block bg-card border border-border rounded-[6px] px-5 py-4 no-underline"
              >
                {/* Map name + game number */}
                <div className="flex justify-between items-start mb-1">
                  <span className="font-display font-semibold text-[1.55rem] text-foreground">
                    {game.map_name ?? 'Digital'}
                  </span>
                  <span className="font-mono text-[0.85rem] font-bold text-[#5b8dd9] tracking-[0.04em] shrink-0">
                    #{gameNum}
                  </span>
                </div>

                {/* Info row: date · players · generations · format */}
                <div className="font-body text-[0.75rem] text-[var(--text-4)] mb-1.5">
                  {new Date(game.date).toLocaleDateString('sv-SE')}
                  {' · '}{game.player_count} players
                  {game.generations ? ` · ${game.generations} generations` : ''}
                  {game.format ? ` · ${game.format}` : ''}
                </div>

                {/* Expansion icons */}
                {game.expansions.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                    {game.expansions.map(exp => {
                      const icon = EXPANSION_ICONS[exp]
                      return icon ? (
                        <img key={exp} src={icon} alt={exp} title={exp} className="w-5 h-5 object-contain" />
                      ) : (
                        <span key={exp} className="font-body text-[0.65rem] px-1.5 py-[1px] rounded-[3px] bg-atmo-500/8 text-atmo-500 border border-atmo-500/20">{exp}</span>
                      )
                    })}
                  </div>
                )}

                {/* Score breakdown table */}
                <div className="overflow-x-auto -mx-5 px-5">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-3 py-2 text-left font-body text-[0.68rem] font-semibold tracking-[0.08em] uppercase text-[var(--text-4)]">Player</th>
                        <th className="px-3 py-2 text-left font-body text-[0.68rem] font-semibold tracking-[0.08em] uppercase text-[var(--text-4)]">Corporation</th>
                        {['TR', 'Milestones', 'Awards', 'Greeneries', 'Cities', 'Cards'].map(h => (
                          <th key={h} className="px-3 py-2 text-center font-body text-[0.68rem] font-semibold tracking-[0.08em] uppercase text-[var(--text-4)]">{h}</th>
                        ))}
                        <th className="px-3 py-2 text-center font-body text-[0.68rem] font-semibold tracking-[0.08em] uppercase text-score-400">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((result, i) => (
                        <tr key={result.id} className={i < sorted.length - 1 ? 'border-b border-border' : ''}>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className={cn('font-mono text-[0.68rem]', result.position === 1 ? 'text-win-500' : 'text-[var(--text-4)]')}>
                                #{result.position}
                              </span>
                              {profileColors[result.player_name] && (
                                <div className="w-2 h-2 rounded-full shrink-0 border border-white/15" style={{ background: profileColors[result.player_name]! }} />
                              )}
                              <div>
                                <span className={cn('font-body text-[0.85rem]', result.position === 1 ? 'font-semibold text-foreground' : 'font-normal text-secondary-foreground')}>
                                  {result.player_name}
                                </span>
                                {result.ceo && (
                                  <span className="ml-1.5 font-mono text-[0.62rem] text-[#d07832] bg-[rgba(210,120,50,0.1)] border border-[rgba(210,120,50,0.3)] rounded px-1.5 py-[1px]">
                                    {result.ceo}
                                  </span>
                                )}
                                {result.key_notes && (
                                  <div className="font-body text-[0.7rem] text-[var(--text-4)] italic">{result.key_notes}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 font-body text-[0.8rem] text-violet-400">
                            {getCorps(result).join(' + ')}
                            {getCorps(result).length > 1 && (
                              <span className="ml-1.5 font-mono text-[0.6rem] text-score-400 bg-score-400/10 border border-score-400/30 rounded px-[5px] py-[1px]">Merger</span>
                            )}
                          </td>
                          {[result.tr, result.milestone_vp, result.award_vp, result.greenery_vp, result.city_vp, result.card_vp].map((val, vi) => (
                            <td key={vi} className="px-3 py-2.5 text-center font-mono text-[0.82rem] text-secondary-foreground">{val ?? '—'}</td>
                          ))}
                          <td className={cn('px-3 py-2.5 text-center font-mono font-bold text-[0.95rem]', result.position === 1 ? 'text-score-400' : 'text-[var(--text-3)]')}>
                            {result.total_vp}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>


              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
