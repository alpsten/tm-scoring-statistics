import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getCorps } from '../types/database'
import { useQueryClient } from '@tanstack/react-query'
import { SkeletonHeader, SkeletonTable } from '../components/ui/PageSkeleton'
import { useGame, useGameByNumber, deleteGame, useGameCards, useGameMilestones, useGameAwards, useCardReference } from '../lib/hooks'
import { useAuth } from '../context/useAuth'
import { EXPANSION_ICONS, TYPE_COLORS } from '../lib/expansions'
import Tag from '../components/ui/Tag'
import { parseTags } from '../components/ui/tagUtils'
import SectionHeading from '../components/ui/SectionHeading'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const thClass = 'px-4 py-2.5 text-left font-body text-[0.68rem] font-semibold tracking-[0.08em] uppercase text-[var(--text-4)]'
const tdClass = 'px-4 py-3'
const metaLabel = 'font-body text-[0.67rem] font-semibold tracking-[0.08em] uppercase text-[var(--text-4)]'

export default function GameDetail() {
  const { id: urlId } = useParams<{ id: string }>()
  const isNumeric = /^\d+$/.test(urlId ?? '')
  const { data: gameByNum, isLoading: numLoading, error: numError } = useGameByNumber(
    isNumeric ? Number(urlId) : 0,
    { enabled: isNumeric }
  )
  const { data: gameByText, isLoading: textLoading, error: textError } = useGame(
    isNumeric ? '' : (urlId ?? ''),
    { enabled: !isNumeric }
  )
  const game = isNumeric ? gameByNum : gameByText
  const isLoading = isNumeric ? numLoading : textLoading
  const error = isNumeric ? numError : textError
  const dbId = game?.id
  const { data: gameCards = [] } = useGameCards(dbId ?? '')
  const { data: gameMilestones = [] } = useGameMilestones(dbId ?? '')
  const { data: gameAwards = [] } = useGameAwards(dbId ?? '')
  const { data: cardRef = [] } = useCardReference()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set())

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteGame(dbId!)
      queryClient.invalidateQueries({ queryKey: ['games'] })
      queryClient.invalidateQueries({ queryKey: ['player-stats'] })
      queryClient.invalidateQueries({ queryKey: ['corp-stats'] })
      navigate('/games')
    } catch (err) {
      console.error(err)
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (isLoading) return (
    <div className="page-enter py-8 px-9">
      <SkeletonHeader />
      <SkeletonTable rows={4} cols={8} />
    </div>
  )
  if (error || !game) {
    return (
      <div className="py-8 px-9 font-body text-[var(--text-4)]">
        Game not found. <Link to="/games" className="text-mars-500">Back to games</Link>
      </div>
    )
  }

  const sorted = [...game.player_results].sort((a, b) => a.position - b.position)
  const winner = sorted[0]
  const gameNum = game?.game_number ?? null
  const cardRefMap = Object.fromEntries(cardRef.map(c => [c.card_name.toLowerCase(), c]))

  const GEN_COLORS = ['#707070', '#3bbfbf', '#b87aff', '#c9a030', '#e05535', '#4a9e6b', '#9b50f0', '#2e8b8b']
  const genColor = (gen: number) => GEN_COLORS[(gen - 1) % GEN_COLORS.length]

  const scoreFields: { key: keyof typeof winner; label: string; short: string }[] = [
    { key: 'tr',           label: 'TR',         short: 'TR' },
    { key: 'milestone_vp', label: 'Milestones', short: 'MS' },
    { key: 'award_vp',     label: 'Awards',     short: 'AW' },
    { key: 'greenery_vp',  label: 'Greeneries', short: 'GR' },
    { key: 'city_vp',      label: 'Cities',     short: 'CI' },
    { key: 'card_vp',      label: 'Cards',      short: 'CA' },
  ]

  return (
    <div className="page-enter py-8 px-9">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2.5">
        <Link to="/games" className="font-body text-[0.78rem] text-[var(--text-4)] no-underline hover:text-muted-foreground transition-colors">
          ← Games
        </Link>

        {user && (
          <div className="flex gap-2 items-center">
            <Link
              to={`/admin/games/${dbId}/edit`}
              className="px-3.5 py-[5px] bg-violet-500/8 border border-violet-500/30 rounded font-body text-[0.78rem] text-violet-400 no-underline hover:bg-violet-500/15 transition-colors"
            >
              Edit
            </Link>
            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-[var(--text-4)] text-[0.78rem]"
              >
                Delete
              </Button>
            ) : (
              <>
                <span className="font-body text-[0.78rem] text-mars-500">Permanently delete this game?</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-[0.78rem]"
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-[var(--text-4)] text-[0.78rem]"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="mb-6">
        <SectionHeading effect style={{ height: '161px', fontSize: '0.9rem', padding: '0 24px 9px', marginTop: '-58px', marginBottom: '-60px' }}>{game.map_name ?? 'Digital'}</SectionHeading>
        <div className="font-body text-[0.83rem] text-[var(--text-4)] mt-1.5">
          {gameNum ? `#${gameNum} · ` : ''}{new Date(game.date).toLocaleDateString('sv-SE')} · {game.player_count} players{game.generations ? ` · ${game.generations} generations` : ''}
        </div>
      </div>

      {/* Game meta */}
      <div className="game-meta-grid grid grid-cols-2 gap-3 mb-8">
        <div className={cn('bg-card border border-mars-500/20 rounded-[6px] px-4 py-3.5', !game.turn_order?.length && 'col-span-2')}>
          <div className={metaLabel}>Winner</div>
          <div className="flex justify-between items-start mt-1.5">
            <div>
              <div className="font-body font-semibold text-[0.95rem] text-foreground">{winner.player_name}</div>
              <div className="font-body text-[0.78rem] text-[var(--text-4)] mt-[3px]">
                {getCorps(winner).join(' + ')}{getCorps(winner).length > 1 ? ' (Merger)' : ''}
              </div>
            </div>
            <div className="font-mono font-bold text-[1.3rem] text-score-400 leading-none shrink-0">
              {winner.total_vp}<span className="ml-1">VP</span>
            </div>
          </div>
        </div>
        {game.turn_order && game.turn_order.length > 0 && (
          <div className="bg-card border border-border rounded-[6px] px-4 py-3.5">
            <div className={metaLabel}>Turn order</div>
            <div className="flex flex-col gap-[5px] mt-2">
              {game.turn_order.map((name, i) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="font-mono text-[0.65rem] text-[var(--text-4)] min-w-[14px]">#{i + 1}</span>
                  <span className="font-body text-[0.83rem] text-foreground">{name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="bg-card border border-[rgba(46,139,139,0.2)] rounded-[6px] px-4 py-3.5">
          <div className={metaLabel}>Expansions</div>
          {game.expansions.length > 0 ? (
            <div className="flex gap-1.5 flex-wrap mt-2 items-center">
              {game.expansions.map(exp => EXPANSION_ICONS[exp] ? (
                <img key={exp} src={EXPANSION_ICONS[exp]} alt={exp} title={exp} className="w-6 h-6 object-contain" />
              ) : (
                <span key={exp} className="font-body text-[0.7rem] px-2 py-[2px] rounded-[3px] bg-[rgba(46,139,139,0.1)] text-[#3bbfbf] border border-[rgba(46,139,139,0.25)]">
                  {exp}
                </span>
              ))}
            </div>
          ) : (
            <div className="font-body text-[0.85rem] text-[var(--text-4)] mt-2">Base only</div>
          )}
        </div>
        <div className="bg-card border border-border rounded-[6px] px-4 py-3.5">
          <div className={metaLabel}>Colonies</div>
          {game.colonies.length > 0 ? (
            <div className="flex gap-1.5 flex-wrap mt-2">
              {game.colonies.map(colony => (
                <span key={colony} className="font-body text-[0.7rem] px-2 py-[2px] rounded-[3px] bg-violet-500/8 text-violet-400 border border-violet-500/20">
                  {colony}
                </span>
              ))}
            </div>
          ) : (
            <div className="font-body text-[0.85rem] text-[var(--text-4)] mt-2">None</div>
          )}
        </div>
      </div>

      {/* Milestones & Awards */}
      {(gameMilestones.length > 0 || gameAwards.length > 0) && (
        <div className="game-milestone-award-grid grid grid-cols-2 gap-3 mb-8">
          {gameMilestones.length > 0 && (
            <div className="bg-card border border-border rounded-[6px] px-4 py-3.5">
              <div className={metaLabel}>Milestones</div>
              <div className="flex flex-col gap-3 mt-2.5">
                {[...gameMilestones]
                  .sort((a, b) => {
                    if (a.claimed_order !== null && b.claimed_order !== null) return a.claimed_order - b.claimed_order
                    if (a.claimed_order !== null) return -1
                    if (b.claimed_order !== null) return 1
                    return 0
                  })
                  .map(m => (
                    <div key={m.milestone_name} className="flex justify-between items-center gap-2">
                      <span className="font-body text-[0.82rem] text-foreground">{m.milestone_name}</span>
                      <div className="flex items-center gap-[5px] shrink-0">
                        {m.claimed_order !== null && (
                          <span className="font-mono text-[0.63rem] text-[var(--text-4)]">#{m.claimed_order}</span>
                        )}
                        {m.player_name ? (
                          <span className="font-body text-[0.72rem] text-score-400">{m.player_name}</span>
                        ) : (
                          <span className="font-body text-[0.72rem] text-[var(--text-4)] italic">Not claimed</span>
                        )}
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
          {gameAwards.length > 0 && (
            <div className="bg-card border border-border rounded-[6px] px-4 py-3.5">
              <div className={metaLabel}>Awards</div>
              <div className="flex flex-col gap-2.5 mt-2.5">
                {gameAwards.map(a => {
                  const hasData = !!(a.funder_name || a.winner_name || a.second_name)
                  return (
                    <div key={a.award_name}>
                      <div className={cn('flex justify-between items-center gap-2', hasData && 'mb-1')}>
                        <span className="font-body text-[0.82rem] text-foreground">{a.award_name}</span>
                        {!hasData && <span className="font-body text-[0.72rem] text-[var(--text-4)] italic">Not claimed</span>}
                      </div>
                      {hasData && (
                        <div className="flex flex-col gap-[2px] pl-2 border-l-2 border-border">
                          {a.funder_name && (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[0.6rem] text-[var(--text-4)] min-w-[16px]">
                                {a.funded_order === 1 ? 'Funded first' : a.funded_order === 2 ? 'Funded second' : a.funded_order === 3 ? 'Funded third' : 'Funded by'}
                              </span>
                              <span className="font-body text-[0.72rem] text-[var(--text-4)]">{a.funder_name}</span>
                            </div>
                          )}
                          {(a.winner_name || a.winner_name_2) && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[0.6rem] text-[var(--text-4)] min-w-[16px]">1st</span>
                              <span className="font-body text-[0.78rem] text-score-400">{a.winner_name}</span>
                              {a.winner_name_2 && <>
                                <span className="font-body text-[0.6rem] text-[var(--text-4)]">tie</span>
                                <span className="font-body text-[0.78rem] text-score-400">{a.winner_name_2}</span>
                              </>}
                            </div>
                          )}
                          {(a.second_name || a.second_name_2) && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[0.6rem] text-[var(--text-4)] min-w-[16px]">2nd</span>
                              <span className="font-body text-[0.78rem] text-[var(--text-3)]">{a.second_name}</span>
                              {a.second_name_2 && <>
                                <span className="font-body text-[0.6rem] text-[var(--text-4)]">tie</span>
                                <span className="font-body text-[0.78rem] text-[var(--text-3)]">{a.second_name_2}</span>
                              </>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Score breakdown table */}
      <div className="mb-8">
        <SectionHeading>Score breakdown</SectionHeading>
        <div className="game-score-table bg-card border border-border rounded-[6px] overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className={thClass}>Player</th>
                <th className={cn(thClass, 'corp-col')}>Corporation</th>
                {scoreFields.map(f => (
                  <th key={f.key} className={cn(thClass, 'text-center')}>
                    <span className="col-label-full">{f.label}</span>
                    <span className="col-label-short">{f.short}</span>
                  </th>
                ))}
                <th className={cn(thClass, 'text-center text-score-400')}>
                  <span className="col-label-full">Total</span>
                  <span className="col-label-short">VP</span>
                </th>
                <th className={cn(thClass, 'text-center text-[#3bbfbf]')}>
                  <span className="col-label-full">MC</span>
                  <span className="col-label-short">MC</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={r.id} className={cn(i < sorted.length - 1 && 'border-b border-border')}>
                  <td className={tdClass}>
                    <div className="flex items-center gap-2">
                      <span className={cn('font-mono text-[0.68rem]', r.position === 1 ? 'text-win-500' : 'text-[var(--text-4)]')}>
                        #{r.position}
                      </span>
                      <div>
                        <Link
                          to={`/players/${encodeURIComponent(r.player_name)}`}
                          className={cn('font-body text-[0.85rem] text-foreground no-underline hover:text-mars-400 transition-colors', r.position === 1 ? 'font-semibold' : 'font-normal')}
                        >
                          {r.player_name}
                        </Link>
                        <span className="corp-inline hidden font-body text-[0.7rem] text-violet-400">
                          {getCorps(r).join(' + ')}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className={cn(tdClass, 'corp-col')}>
                    <span className="inline-flex items-center gap-1 flex-wrap">
                      {getCorps(r).map((corp, ci) => (
                        <span key={corp} className="inline-flex items-center gap-1">
                          {ci > 0 && <span className="text-[var(--text-4)]">+</span>}
                          <Link to={`/cards/${encodeURIComponent(corp)}`} className="font-body text-[0.8rem] text-violet-400 no-underline hover:text-violet-300 transition-colors">{corp}</Link>
                        </span>
                      ))}
                      {getCorps(r).length > 1 && (
                        <span className="font-mono text-[0.65rem] text-score-400 bg-score-400/10 border border-score-400/30 rounded px-[5px] py-[1px]">Merger</span>
                      )}
                    </span>
                  </td>
                  {scoreFields.map(f => (
                    <td key={f.key} className="px-4 py-3 text-center font-mono text-[0.82rem] text-secondary-foreground">
                      {r[f.key] ?? '—'}
                    </td>
                  ))}
                  <td className={cn('px-4 py-3 text-center font-mono font-bold text-[1rem]', r.position === 1 ? 'text-score-400' : 'text-[var(--text-3)]')}>
                    {r.total_vp}
                  </td>
                  <td className={cn('px-4 py-3 text-center font-mono text-[0.82rem]', r.mc != null ? 'text-[#3bbfbf]' : 'text-border')}>
                    {r.mc != null ? r.mc : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Parameter contributions */}
      {game.parameter_contributions.length > 0 && (() => {
        const params = game.parameter_contributions
        const hasVenus = params.some(p => p.venus_steps > 0)
        const hasMoon = game.expansions.includes('The Moon')
        const paramCols: { key: keyof typeof params[0]; label: string; short: string; color: string }[] = [
          { key: 'temperature_steps', label: 'Temperature', short: 'TEMP', color: '#e05535' },
          { key: 'oxygen_steps',      label: 'Oxygen',      short: 'OX',   color: '#4a9e6b' },
          { key: 'ocean_steps',       label: 'Oceans',      short: 'OC',   color: '#2e8b8b' },
          ...(hasVenus ? [{ key: 'venus_steps'    as const, label: 'Venus',     short: 'VN',  color: '#b87aff' }] : []),
          ...(hasMoon  ? [
            { key: 'habitat_steps'   as const, label: 'Habitat',   short: 'HAB', color: '#2e8b8b' },
            { key: 'mining_steps'    as const, label: 'Mining',    short: 'MIN', color: '#a0724a' },
            { key: 'logistics_steps' as const, label: 'Logistics', short: 'LOG', color: '#555555' },
          ] : []),
        ]
        return (
          <div className="mb-8">
            <SectionHeading>Parameter contributions</SectionHeading>
            <div className="game-param-table bg-card border border-border rounded-[6px] overflow-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className={thClass}>Player</th>
                    {paramCols.map(col => (
                      <th key={col.key} className={cn(thClass, 'text-center')} style={{ color: col.color }}>
                        <span className="col-label-full">{col.label}</span>
                        <span className="col-label-short">{col.short}</span>
                      </th>
                    ))}
                    <th className={cn(thClass, 'text-center text-secondary-foreground')}>
                      <span className="col-label-full">Total</span>
                      <span className="col-label-short">TOT</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {params.map((p, i) => {
                    const rowTotal = paramCols.reduce((s, col) => s + (p[col.key] as number), 0)
                    return (
                      <tr key={p.player_name} className={cn(i < params.length - 1 && 'border-b border-border')}>
                        <td className={cn(tdClass, 'font-body text-[0.85rem] text-foreground')}>{p.player_name}</td>
                        {paramCols.map(col => (
                          <td key={col.key} className="px-4 py-3 text-center font-mono text-[0.85rem]" style={{ color: (p[col.key] as number) > 0 ? col.color : '#888888' }}>
                            {p[col.key] as number}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center font-mono font-bold text-[0.85rem] text-secondary-foreground">{rowTotal}</td>
                      </tr>
                    )
                  })}
                  <tr className="border-t border-border bg-violet-500/4">
                    <td className={cn(tdClass, 'font-body text-[0.78rem] text-[var(--text-4)] italic')}>Total</td>
                    {paramCols.map(col => {
                      const total = params.reduce((s, p) => s + (p[col.key] as number), 0)
                      return (
                        <td key={col.key} className="px-4 py-3 text-center font-mono font-bold text-[0.85rem]" style={{ color: col.color }}>
                          {total}
                        </td>
                      )
                    })}
                    <td className="px-4 py-3 text-center font-mono font-bold text-[0.85rem] text-secondary-foreground">
                      {params.reduce((s, p) => s + paramCols.reduce((ss, col) => ss + (p[col.key] as number), 0), 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* Cards played */}
      {gameCards.length > 0 && (() => {
        const byPlayer: Record<string, typeof gameCards> = {}
        for (const c of gameCards) {
          ;(byPlayer[c.player_name] ??= []).push(c)
        }
        const playerOrder = sorted.map(r => r.player_name)
        const players = [...new Set([...playerOrder, ...Object.keys(byPlayer)])]

        return (
          <div className="mb-8">
            <SectionHeading>Cards played</SectionHeading>
            <div className="flex flex-col gap-1">
              {players.map(player => {
                const cards = byPlayer[player] ?? []
                const isExpanded = expandedPlayers.has(player)
                const posResult = sorted.find(r => r.player_name === player)
                return (
                  <div key={player} className="bg-card border border-border rounded-[6px] overflow-hidden">
                    <button
                      onClick={() => setExpandedPlayers(prev => {
                        const next = new Set(prev)
                        if (next.has(player)) next.delete(player)
                        else next.add(player)
                        return next
                      })}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 bg-transparent border-none cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        {posResult && (
                          <span className={cn('font-mono text-[0.65rem]', posResult.position === 1 ? 'text-win-500' : 'text-[var(--text-4)]')}>
                            #{posResult.position}
                          </span>
                        )}
                        <Link
                          to={`/players/${encodeURIComponent(player)}`}
                          onClick={e => e.stopPropagation()}
                          className="font-display font-semibold text-[0.87rem] text-foreground no-underline hover:text-mars-400 transition-colors"
                        >
                          {player}
                        </Link>
                      </div>
                      <div className="flex gap-2.5 items-center">
                        <span className="font-mono text-[0.65rem] text-[var(--text-4)]">{cards.length} cards</span>
                        <span className={cn('font-mono text-[0.6rem] text-[var(--text-4)] transition-transform duration-150', isExpanded && 'rotate-180')}>▼</span>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-border py-1">
                        {cards.map((c, i) => (
                          <div key={i} className="flex justify-between items-center px-3.5 py-1 gap-2 hover:bg-accent transition-colors">
                            <div className="flex items-center gap-2 min-w-0">
                              <Link to={`/cards/${encodeURIComponent(c.card_name)}`} className="font-body text-[0.78rem] text-secondary-foreground no-underline leading-[1.5] hover:text-mars-400 transition-colors">
                                {c.card_name}
                              </Link>
                              {(() => {
                                const ref = cardRefMap[c.card_name.toLowerCase()]
                                if (!ref) return null
                                const tc = ref.card_type ? TYPE_COLORS[ref.card_type] : null
                                const tags = parseTags(ref.tags)
                                return (
                                  <>
                                    {tc && (
                                      <span className="font-body text-[0.62rem] font-medium px-[5px] py-[1px] rounded-[3px] whitespace-nowrap shrink-0" style={{ background: tc.bg, color: tc.color }}>
                                        {ref.card_type}
                                      </span>
                                    )}
                                    <div className="flex gap-[3px] items-center">
                                      {tags.map((tag, i) => <Tag key={`${tag}-${i}`} name={tag} />)}
                                    </div>
                                  </>
                                )
                              })()}
                            </div>
                            <div className="flex gap-1.5 items-center shrink-0">
                              {c.vp_from_card != null && (
                                <span className="font-mono text-[0.65rem] text-score-400">{c.vp_from_card}VP</span>
                              )}
                              {c.generation != null && (
                                <span className="font-mono text-[0.6rem]" style={{ color: genColor(c.generation) }}>G{c.generation}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Notes */}
      {sorted.some(r => r.key_notes) && (
        <div>
          <SectionHeading>Strategy notes</SectionHeading>
          <div className="flex flex-col gap-2">
            {sorted.filter(r => r.key_notes).map(r => (
              <div key={r.id} className="bg-card border border-border rounded px-4 py-3 flex gap-3">
                <span className="font-body font-semibold text-[0.83rem] text-foreground min-w-[70px]">
                  {r.player_name}
                </span>
                <span className="font-body text-[0.83rem] text-[var(--text-3)] italic">
                  {r.key_notes}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
