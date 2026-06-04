import { useEffect, useMemo, useRef } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import { SkeletonHeader, SkeletonTable } from '../components/ui/PageSkeleton'
import Tag from '../components/ui/Tag'
import { parseTags, parseCardName } from '../components/ui/tagUtils'
import EmptyState from '../components/ui/EmptyState'
import FilterPill from '../components/ui/FilterPill'
import { useCardStats, useCardReference, useCorpStats, useCEOStats } from '../lib/hooks'
import { TAG_ICONS, EXPANSION_ICONS, RESOURCE_ICONS, PLACEMENT_ICONS, PLACEMENT_VP_TYPES, MULTIPLIER_VP_TYPES, TYPE_COLORS, NO_TAG_ICON, NO_TAG } from '../lib/expansions'
import { parseListParam, writeListParam } from '../lib/filterUtils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const VARIANT_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  ares:  { bg: 'rgba(210, 80, 50, 0.12)',  color: '#d05032', border: 'rgba(210, 80, 50, 0.35)'  },
  promo: { bg: 'rgba(91, 141, 217, 0.12)', color: '#5b8dd9', border: 'rgba(91, 141, 217, 0.35)' },
}

function VariantBadge({ variant }: { variant: string }) {
  const s = VARIANT_STYLE[variant] ?? { bg: 'rgba(100,100,100,0.1)', color: '#888', border: 'rgba(100,100,100,0.3)' }
  return (
    <span
      className="font-mono text-[0.6rem] font-bold tracking-[0.06em] uppercase px-[5px] py-[1px] rounded-[3px] shrink-0"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {variant}
    </span>
  )
}

const CARD_TYPES = ['Automated', 'Active', 'Event', 'Corporation', 'Prelude', 'CEO', 'Global Event'] as const
type CardType = typeof CARD_TYPES[number]

type SortKey = 'card_name' | 'times_played' | 'win_rate' | 'base_vp'
const SORT_KEYS: SortKey[] = ['card_name', 'times_played', 'win_rate', 'base_vp']
const CARDS_SCROLL_PREFIX = 'tm-cards-scroll:'

function parseCardTypes(value: string | null): CardType[] {
  return parseListParam(value).filter((type): type is CardType => CARD_TYPES.includes(type as CardType))
}

function parseSortKey(value: string | null): SortKey {
  return SORT_KEYS.includes(value as SortKey) ? value as SortKey : 'card_name'
}

const filterLabel = 'inline-flex items-center justify-center w-24 h-[34px] px-0 shrink-0 rounded-[5px] bg-card border border-border font-mono text-[0.6rem] font-semibold tracking-[0.06em] uppercase text-[var(--text-4)] whitespace-nowrap text-center'

export default function Cards() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') ?? ''
  const typeFilters = useMemo(() => parseCardTypes(searchParams.get('type')), [searchParams])
  const tagFilters = useMemo(() => parseListParam(searchParams.get('tag')), [searchParams])
  const expansionFilters = useMemo(() => parseListParam(searchParams.get('expansion')), [searchParams])
  const exactTagsParam = searchParams.get('exacttags')
  const exactTags: number | null = exactTagsParam ? Number(exactTagsParam) : null
  const sortKey = parseSortKey(searchParams.get('sort'))
  const sortDir: 'asc' | 'desc' = searchParams.get('dir') === 'desc' ? 'desc' : 'asc'
  const vpFilter = searchParams.get('vp') ?? ''
  const resVpFilter = searchParams.get('resvp') ?? ''
  const resTypeFilter = searchParams.get('restype') ?? ''
  const scrollRestoredRef = useRef(false)
  const { data: cardStats, isLoading: statsLoading, error } = useCardStats()
  const { data: cardRef, isLoading: refLoading } = useCardReference()
  const { data: corpStats, isLoading: corpLoading } = useCorpStats()
  const { data: ceoStats, isLoading: ceoLoading } = useCEOStats()
  const isLoading = statsLoading || refLoading || corpLoading || ceoLoading

  const scrollKey = `${CARDS_SCROLL_PREFIX}${location.pathname}${location.search}`

  useEffect(() => {
    if (isLoading || scrollRestoredRef.current) return
    const saved = sessionStorage.getItem(scrollKey)
    if (saved) window.requestAnimationFrame(() => window.scrollTo(0, Number(saved)))
    scrollRestoredRef.current = true
  }, [isLoading, scrollKey])

  if (isLoading) return (
    <div className="page-enter py-8 px-9">
      <SkeletonHeader />
      <div className="flex gap-2 mb-4 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-[34px] w-20 bg-card border border-border rounded-[5px] animate-pulse" />)}
      </div>
      <SkeletonTable rows={10} cols={6} />
    </div>
  )
  if (error) return <div className="py-8 px-9 font-body text-[var(--text-4)]">Failed to load card stats: {String((error as Error)?.message ?? error)}</div>

  const tagMap: Record<string, string | null> = {}
  const typeMap: Record<string, string> = {}
  for (const c of cardRef ?? []) {
    const key = c.card_name.toLowerCase()
    tagMap[key] = c.tags
    typeMap[key] = c.card_type
  }

  const statsMap: Record<string, { times_played: number; win_rate: number; win_count: number; avg_vp_contribution: number }> = {}
  for (const s of cardStats ?? []) {
    statsMap[s.card_name.toLowerCase()] = s
  }
  for (const s of corpStats ?? []) {
    statsMap[s.corporation.toLowerCase()] = { times_played: s.games_played, win_rate: s.win_rate, win_count: s.wins, avg_vp_contribution: 0 }
  }
  for (const s of ceoStats ?? []) {
    statsMap[s.ceo_name.toLowerCase()] = { times_played: s.times_played, win_rate: s.win_rate, win_count: s.wins, avg_vp_contribution: 0 }
  }

  const allTags = [...new Set(Object.values(tagMap).flatMap(t => parseTags(t)))].sort()

  const expansionMap: Record<string, string[]> = {}
  for (const c of cardRef ?? []) {
    expansionMap[c.card_name.toLowerCase()] = c.expansions ?? []
  }
  const allExpansions = [...new Set((cardRef ?? []).flatMap(c => c.expansions ?? []))].sort()
  const allBaseVPs = [...new Set((cardRef ?? []).map(c => c.base_vp).filter((v): v is number => v !== null))].sort((a, b) => a - b)
  const allResVpPer = [...new Set((cardRef ?? []).map(c => c.resource_vp_per).filter((v): v is number => v !== null))].sort((a, b) => a - b)
  const allResTypes = [...new Set((cardRef ?? []).map(c => c.resource_vp_type).filter((v): v is string => v !== null))].sort()
  const allResourceTypes = allResTypes.filter(rt => !PLACEMENT_VP_TYPES.includes(rt) && !MULTIPLIER_VP_TYPES.includes(rt))
  const allPlacementTypes = allResTypes.filter(rt => PLACEMENT_VP_TYPES.includes(rt))
  const allMultiplierTypes = allResTypes.filter(rt => MULTIPLIER_VP_TYPES.includes(rt))

  const expansionCards = expansionFilters.length > 0 ? (cardRef ?? []).filter(c => expansionFilters.some(e => (c.expansions ?? []).includes(e))) : []
  const expansionTypeBreakdown: Partial<Record<string, number>> = {}
  const expansionTagBreakdown: Record<string, number> = {}
  for (const c of expansionCards) {
    expansionTypeBreakdown[c.card_type] = (expansionTypeBreakdown[c.card_type] ?? 0) + 1
    const tags = parseTags(c.tags)
    for (const tag of tags.length > 0 ? tags : [NO_TAG]) {
      expansionTagBreakdown[tag] = (expansionTagBreakdown[tag] ?? 0) + 1
    }
  }

  const cards = (cardRef ?? []).filter(c => {
    if (!c.card_name.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilters.length > 0 && !typeFilters.includes(c.card_type as CardType)) return false
    if (tagFilters.length > 0) {
      const cardTags = parseTags(c.tags)
      const wantsNoTag = tagFilters.includes(NO_TAG)
      const otherFilters = tagFilters.filter(t => t !== NO_TAG)
      const matchesNoTag = wantsNoTag && cardTags.length === 0
      const matchesTag = otherFilters.length > 0 && otherFilters.some(t => cardTags.includes(t))
      if (!matchesNoTag && !matchesTag) return false
    }
    if (expansionFilters.length > 0 && !expansionFilters.some(e => (c.expansions ?? []).includes(e))) return false
    if (exactTags !== null && parseTags(c.tags).length !== exactTags) return false
    if (vpFilter) {
      if (vpFilter === 'negative') { if (c.base_vp === null || c.base_vp >= 0) return false }
      else if (vpFilter === 'positive') { if (c.base_vp === null || c.base_vp <= 0) return false }
      else { const n = Number(vpFilter); if (Number.isNaN(n) || c.base_vp !== n) return false }
    }
    if (resVpFilter) { const n = Number(resVpFilter); if (c.resource_vp_per !== n) return false }
    if (resTypeFilter) {
      if (resTypeFilter === '__placement__') { if (!PLACEMENT_VP_TYPES.includes(c.resource_vp_type ?? '')) return false }
      else if (resTypeFilter === '__multiplier__') { if (!MULTIPLIER_VP_TYPES.includes(c.resource_vp_type ?? '')) return false }
      else { if (c.resource_vp_type !== resTypeFilter) return false }
    }
    return true
  })

  const sorted = [...cards].sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1
    if (sortKey === 'card_name') return mul * a.card_name.localeCompare(b.card_name)
    if (sortKey === 'base_vp') return mul * ((a.base_vp ?? -999) - (b.base_vp ?? -999))
    const aStats = statsMap[a.card_name.toLowerCase()]
    const bStats = statsMap[b.card_name.toLowerCase()]
    const sk = sortKey as 'times_played' | 'win_rate'
    return mul * ((aStats?.[sk] ?? 0) - (bStats?.[sk] ?? 0))
  })

  const hasFilters = !!search || typeFilters.length > 0 || tagFilters.length > 0 || expansionFilters.length > 0 || exactTags !== null || !!vpFilter || !!resVpFilter || !!resTypeFilter

  function handleSort(key: SortKey) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (sortKey === key) next.set('dir', sortDir === 'asc' ? 'desc' : 'asc')
      else { next.set('sort', key); next.set('dir', 'desc') }
      return next
    }, { replace: true })
  }

  function updateSearch(value: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value) next.set('q', value); else next.delete('q')
      return next
    }, { replace: true })
  }

  function toggleType(type: CardType) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      const values = parseCardTypes(next.get('type'))
      writeListParam(next, 'type', values.includes(type) ? values.filter(t => t !== type) : [...values, type])
      return next
    }, { replace: true })
  }
  function toggleTag(tag: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      const values = parseListParam(next.get('tag'))
      writeListParam(next, 'tag', values.includes(tag) ? values.filter(t => t !== tag) : [...values, tag])
      return next
    }, { replace: true })
  }

  function clearFilters() {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      ;['q', 'type', 'tag', 'expansion', 'exacttags', 'vp', 'resvp', 'restype'].forEach(k => next.delete(k))
      return next
    }, { replace: true })
  }

  function setExactTagsFilter(n: number) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (exactTags === n) next.delete('exacttags'); else next.set('exacttags', String(n))
      return next
    }, { replace: true })
  }

  function toggleExpansion(exp: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      const values = parseListParam(next.get('expansion'))
      writeListParam(next, 'expansion', values.includes(exp) ? values.filter(e => e !== exp) : [...values, exp])
      return next
    }, { replace: true })
  }

  function setVpFilter(val: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (vpFilter === val) next.delete('vp'); else next.set('vp', val)
      return next
    }, { replace: true })
  }

  function setResVpFilter(val: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (resVpFilter === val) next.delete('resvp'); else next.set('resvp', val)
      return next
    }, { replace: true })
  }

  function setResTypeFilter(val: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (resTypeFilter === val) next.delete('restype'); else next.set('restype', val)
      return next
    }, { replace: true })
  }

  function rememberScroll() {
    sessionStorage.setItem(scrollKey, String(window.scrollY))
  }

  return (
    <div className="page-enter py-8 px-9">
      <PageHeader
        title="Cards"
        subtitle={hasFilters ? `${cards.length} of ${cardRef?.length ?? 0} cards` : `${cardRef?.length ?? 0} cards in reference`}
      />

      <div className="mb-5 flex flex-col gap-2.5">
        {/* Search + clear */}
        <div className="flex gap-2.5 items-center flex-wrap">
          <Input
            type="text"
            placeholder="Search cards…"
            value={search}
            onChange={e => updateSearch(e.target.value)}
            className="w-[240px] h-[34px] text-[0.83rem]"
          />
          {hasFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="h-[34px] text-[0.78rem] text-[var(--text-4)]">
              Clear all
            </Button>
          )}
        </div>

        {/* Type pills */}
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className={filterLabel}>Type</span>
          {CARD_TYPES.map(type => (
            <FilterPill
              key={type}
              label={type}
              active={typeFilters.includes(type)}
              color={TYPE_COLORS[type].color}
              onClick={() => toggleType(type)}
            />
          ))}
        </div>

        {/* Expansion pills */}
        {allExpansions.length > 0 && (
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className={filterLabel}>Expansion</span>
            {allExpansions.map(exp => (
              <FilterPill
                key={exp}
                label={exp.slice(0, 3).toUpperCase()}
                tooltip={exp}
                icon={EXPANSION_ICONS[exp]}
                active={expansionFilters.includes(exp)}
                color="#c9a030"
                onClick={() => toggleExpansion(exp)}
              />
            ))}
          </div>
        )}

        {/* Expansion breakdown panel */}
        {expansionFilters.length > 0 && expansionCards.length > 0 && (
          <div className="bg-card border border-border rounded-[6px] px-[18px] py-3.5 flex flex-col gap-2.5">
            <span className="font-mono text-[0.65rem] tracking-[0.1em] uppercase text-[var(--text-4)]">
              {expansionFilters.join(' + ')} — {expansionCards.length} cards
            </span>
            <div className="flex gap-[18px] flex-wrap">
              <div>
                <div className="font-body text-[0.62rem] font-semibold tracking-[0.08em] uppercase text-[var(--text-4)] mb-1.5">By type</div>
                <div className="flex gap-[5px] flex-wrap">
                  {Object.entries(expansionTypeBreakdown).sort((a, b) => b[1]! - a[1]!).map(([type, count]) => {
                    const col = TYPE_COLORS[type]
                    return (
                      <span key={type} className="font-body text-[0.72rem] px-2 py-[2px] rounded-[3px] whitespace-nowrap" style={{ background: col?.bg ?? 'rgba(255,255,255,0.05)', color: col?.color ?? 'var(--text-2)' }}>
                        {type} <span className="font-mono font-bold">{count}</span>
                      </span>
                    )
                  })}
                </div>
              </div>
              <div>
                <div className="font-body text-[0.62rem] font-semibold tracking-[0.08em] uppercase text-[var(--text-4)] mb-1.5">By tag</div>
                <div className="flex gap-[5px] flex-wrap items-center">
                  {Object.entries(expansionTagBreakdown).sort((a, b) => b[1] - a[1]).map(([tag, count]) => (
                    <span key={tag} title={tag} className="flex items-center gap-1 px-1.5 py-[3px] rounded-[3px] bg-secondary border border-border whitespace-nowrap">
                      {TAG_ICONS[tag]
                        ? <img src={TAG_ICONS[tag]} alt={tag} className="w-3.5 h-3.5 object-contain" />
                        : <span className="font-body text-[0.65rem] text-[var(--text-3)]">{tag.slice(0, 3)}</span>
                      }
                      <span className="font-mono font-bold text-[0.72rem] text-secondary-foreground">{count}</span>
                    </span>
                  ))}
                  {Object.keys(expansionTagBreakdown).length === 0 && (
                    <span className="font-body text-[0.72rem] text-[var(--text-4)]">No tags</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tag pills */}
        {allTags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className={filterLabel}>Tag</span>
            {allTags.map(tag => (
              <FilterPill key={tag} label={tag} icon={TAG_ICONS[tag]} active={tagFilters.includes(tag)} onClick={() => toggleTag(tag)} />
            ))}
            <FilterPill label="No tag" icon={NO_TAG_ICON} active={tagFilters.includes(NO_TAG)} onClick={() => toggleTag(NO_TAG)} />
          </div>
        )}

        {/* Exact tag count pills */}
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className={filterLabel}>Min tags</span>
          {[1, 2, 3, 4].map(n => (
            <FilterPill key={n} label={String(n)} tooltip={`Exactly ${n} tag${n > 1 ? 's' : ''}`} active={exactTags === n} color="#5b8dd9" onClick={() => setExactTagsFilter(n)} />
          ))}
        </div>

        {/* VP pills */}
        {allBaseVPs.length > 0 && (
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className={filterLabel}>VP</span>
            {allBaseVPs.some(v => v < 0) && (
              <FilterPill label="−" tooltip="All negative VP" active={vpFilter === 'negative'} color="#e05535" onClick={() => setVpFilter('negative')} />
            )}
            {allBaseVPs.map(v => (
              <FilterPill key={v} label={v > 0 ? `+${v}` : `${v}`} active={vpFilter === String(v)} color={v > 0 ? '#4a9e6b' : v < 0 ? '#e05535' : '#888888'} onClick={() => setVpFilter(String(v))} />
            ))}
            {allBaseVPs.some(v => v > 0) && (
              <FilterPill label="+" tooltip="All positive VP" active={vpFilter === 'positive'} color="#4a9e6b" onClick={() => setVpFilter('positive')} />
            )}
          </div>
        )}

        {/* Resource VP pills */}
        {allResVpPer.length > 0 && (
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className={filterLabel}>Resource VP</span>
            {allResVpPer.map(n => (
              <FilterPill key={n} label={`1/${n}`} tooltip={`1 VP per ${n} resource${n > 1 ? 's' : ''}`} active={resVpFilter === String(n)} color="#c9a030" onClick={() => setResVpFilter(String(n))} />
            ))}
          </div>
        )}

        {/* Resource type pills */}
        {allResourceTypes.length > 0 && (
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className={filterLabel}>Resource</span>
            {allResourceTypes.map(rt => (
              <FilterPill key={rt} label={rt} tooltip={rt} icon={RESOURCE_ICONS[rt]} active={resTypeFilter === rt} color="#b87aff" onClick={() => setResTypeFilter(rt)} />
            ))}
          </div>
        )}

        {/* Placement VP pills */}
        {allPlacementTypes.length > 0 && (
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className={filterLabel}>Placement VP</span>
            <FilterPill
              icon={PLACEMENT_ICONS[allPlacementTypes[0]]}
              tooltip={`Placement VP (${allPlacementTypes.join(', ')})`}
              active={resTypeFilter === '__placement__'}
              color="#5b8dd9"
              onClick={() => setResTypeFilter('__placement__')}
            />
          </div>
        )}

        {/* Multiplier VP pills */}
        {allMultiplierTypes.length > 0 && (
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className={filterLabel}>Multiplier VP</span>
            {allMultiplierTypes.map(rt => (
              <FilterPill key={rt} label={rt} active={resTypeFilter === rt} color="#b87aff" onClick={() => setResTypeFilter(rt)} />
            ))}
          </div>
        )}
      </div>

      {cards.length === 0 ? (
        <EmptyState message="No cards match the current filters." />
      ) : (
        <div className="bg-card border border-border rounded-[6px] overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                {([
                  { label: 'Card',      key: 'card_name'    as SortKey, align: 'left'   },
                  { label: 'Type',      key: null,                       align: 'center' },
                  { label: 'Tags',      key: null,                       align: 'center' },
                  { label: 'Expansion', key: null,                       align: 'center' },
                  { label: 'Cost',      key: null,                       align: 'center' },
                  { label: 'Played',    key: 'times_played' as SortKey, align: 'center' },
                  { label: 'Win Rate',  key: 'win_rate'     as SortKey, align: 'center' },
                  { label: 'VP',        key: 'base_vp'      as SortKey, align: 'center' },
                ] as { label: string; key: SortKey | null; align: string }[]).map(({ label, key, align }) => {
                  const active = key && sortKey === key
                  return (
                    <th
                      key={label}
                      onClick={key ? () => handleSort(key) : undefined}
                      className={cn(
                        'px-4 py-[11px] font-body text-[0.68rem] font-semibold tracking-[0.08em] uppercase select-none whitespace-nowrap',
                        align === 'center' ? 'text-center' : 'text-left',
                        key ? 'cursor-pointer' : 'cursor-default',
                        active ? 'text-[#5b8dd9]' : 'text-[var(--text-4)]'
                      )}
                    >
                      {label}{active ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {sorted.map((card, i) => {
                const type = card.card_type
                const typeStyle = TYPE_COLORS[type] ?? null
                const stats = statsMap[card.card_name.toLowerCase()]
                return (
                  <tr
                    key={card.card_name}
                    className={cn('hover:bg-accent transition-colors', i < cards.length - 1 && 'border-b border-border')}
                  >
                    <td className="px-4 py-3 text-left">
                      <Link
                        to={`/cards/${encodeURIComponent(card.card_name)}`}
                        onClick={rememberScroll}
                        className="inline-flex items-center gap-1.5 font-body font-normal text-[0.85rem] text-foreground no-underline hover:text-mars-400 transition-colors"
                      >
                        {(() => { const { baseName, variant } = parseCardName(card.card_name); return <><span>{baseName}</span>{variant && <VariantBadge variant={variant} />}</> })()}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {typeStyle && (
                        <span className="font-body text-[0.7rem] font-normal px-[7px] py-[2px] rounded-[3px] whitespace-nowrap" style={{ background: typeStyle.bg, color: typeStyle.color }}>
                          {type}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1 flex-wrap justify-center">
                        {parseTags(card.tags).map((tag, i) => (
                          <Tag key={`${tag}-${i}`} name={tag} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1 flex-wrap justify-center">
                        {(card.expansions ?? []).map(exp => (
                          EXPANSION_ICONS[exp]
                            ? <img key={exp} src={EXPANSION_ICONS[exp]} alt={exp} title={exp} className="w-[18px] h-[18px] object-contain opacity-85" />
                            : <span key={exp} className="font-mono text-[0.6rem] text-[var(--text-4)]">{exp}</span>
                        ))}
                      </div>
                    </td>
                    <td className={cn('px-4 py-3 text-center font-mono text-[0.83rem]', card.mc_cost != null ? 'text-score-400' : 'text-[var(--text-5)]')}>
                      {card.mc_cost != null ? `${card.mc_cost}` : '/'}
                    </td>
                    <td className={cn('px-4 py-3 text-center font-mono text-[0.83rem]', stats ? 'text-secondary-foreground' : 'text-[var(--text-5)]')}>
                      {stats ? stats.times_played : '—'}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-[0.83rem]">
                      {stats ? (
                        <span className={stats.win_rate >= 50 ? 'text-win-500' : stats.win_rate > 33 ? 'text-score-400' : 'text-mars-500'}>
                          {Math.round(stats.win_rate)}%
                          <span className="font-body text-[0.65rem] text-[var(--text-4)] ml-1">
                            ({stats.win_count}/{stats.times_played})
                          </span>
                        </span>
                      ) : <span className="text-[var(--text-5)]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {card.base_vp !== null ? (
                        <span className={cn('font-mono text-[0.83rem] font-bold', card.base_vp > 0 ? 'text-score-400' : card.base_vp < 0 ? 'text-mars-500' : 'text-[var(--text-4)]')}>
                          {card.base_vp}
                        </span>
                      ) : card.resource_vp_per !== null ? (
                        PLACEMENT_VP_TYPES.includes(card.resource_vp_type ?? '') ? (
                          <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-[5px] bg-[rgba(91,141,217,0.1)] border border-[rgba(91,141,217,0.3)] font-mono text-[0.72rem] font-bold text-[#5b8dd9]">
                            1/{card.resource_vp_per}
                            {card.resource_vp_type && (PLACEMENT_ICONS[card.resource_vp_type]
                              ? <img src={PLACEMENT_ICONS[card.resource_vp_type]} alt={card.resource_vp_type} title={card.resource_vp_type} className="w-3.5 h-3.5 object-contain" />
                              : <span className="text-[0.65rem] text-[rgba(91,141,217,0.7)]">{card.resource_vp_type}</span>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-[5px] bg-[rgba(201,160,48,0.1)] border border-[rgba(201,160,48,0.3)] font-mono text-[0.72rem] font-bold text-score-400">
                            1/{card.resource_vp_per}
                            {card.resource_vp_type && (RESOURCE_ICONS[card.resource_vp_type]
                              ? <img src={RESOURCE_ICONS[card.resource_vp_type]} alt={card.resource_vp_type} title={card.resource_vp_type} className="w-3.5 h-3.5 object-contain" />
                              : <span className="text-[0.65rem] text-[rgba(201,160,48,0.7)]">{card.resource_vp_type}</span>
                            )}
                          </span>
                        )
                      ) : (
                        <span className="text-[var(--text-5)]">/</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3.5 font-body text-[0.73rem] text-[var(--text-4)] italic">
        Win rate reflects the player's game result when this card was played, not the card's direct contribution to winning.
      </p>
    </div>
  )
}
