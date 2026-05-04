import React, { useEffect, useMemo, useRef } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import Tag from '../components/ui/Tag'
import { parseTags, parseCardName } from '../components/ui/tagUtils'
import EmptyState from '../components/ui/EmptyState'
import FilterPill from '../components/ui/FilterPill'
import { useCardStats, useCardReference, useCorpStats, useCEOStats } from '../lib/hooks'
import { TAG_ICONS, EXPANSION_ICONS, RESOURCE_ICONS, PLACEMENT_ICONS, PLACEMENT_VP_TYPES, MULTIPLIER_VP_TYPES, TYPE_COLORS, NO_TAG_ICON, NO_TAG } from '../lib/expansions'
import { parseListParam, writeListParam } from '../lib/filterUtils'

const filterLabelStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '96px',
  height: '34px',
  padding: 0,
  flexShrink: 0,
  borderRadius: '5px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--bd-panel)',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.6rem',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--text-4)',
  whiteSpace: 'nowrap',
  textAlign: 'center',
}


const VARIANT_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  ares:  { bg: 'rgba(210, 80, 50, 0.12)',  color: '#d05032', border: 'rgba(210, 80, 50, 0.35)'  },
  promo: { bg: 'rgba(91, 141, 217, 0.12)', color: '#5b8dd9', border: 'rgba(91, 141, 217, 0.35)' },
}

function VariantBadge({ variant }: { variant: string }) {
  const s = VARIANT_STYLE[variant] ?? { bg: 'rgba(100,100,100,0.1)', color: '#888', border: 'rgba(100,100,100,0.3)' }
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '1px 5px', borderRadius: '3px', background: s.bg, color: s.color, border: `1px solid ${s.border}`, flexShrink: 0 }}>
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
    if (saved) {
      window.requestAnimationFrame(() => window.scrollTo(0, Number(saved)))
    }

    scrollRestoredRef.current = true
  }, [isLoading, scrollKey])

  if (isLoading) return <div style={loadingStyle}>Loading…</div>
  if (error) return <div style={loadingStyle}>Failed to load card stats: {String((error as Error)?.message ?? error)}</div>

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

  const allTags = [...new Set(
    Object.values(tagMap).flatMap(t => parseTags(t))
  )].sort()

  const expansionMap: Record<string, string[]> = {}
  for (const c of cardRef ?? []) {
    expansionMap[c.card_name.toLowerCase()] = c.expansions ?? []
  }
  const allExpansions = [...new Set(
    (cardRef ?? []).flatMap(c => c.expansions ?? [])
  )].sort()

  const allBaseVPs = [...new Set(
    (cardRef ?? []).map(c => c.base_vp).filter((v): v is number => v !== null)
  )].sort((a, b) => a - b)

  const allResVpPer = [...new Set(
    (cardRef ?? []).map(c => c.resource_vp_per).filter((v): v is number => v !== null)
  )].sort((a, b) => a - b)

  const allResTypes = [...new Set(
    (cardRef ?? []).map(c => c.resource_vp_type).filter((v): v is string => v !== null)
  )].sort()
  const allResourceTypes = allResTypes.filter(rt => !PLACEMENT_VP_TYPES.includes(rt) && !MULTIPLIER_VP_TYPES.includes(rt))
  const allPlacementTypes = allResTypes.filter(rt => PLACEMENT_VP_TYPES.includes(rt))
  const allMultiplierTypes = allResTypes.filter(rt => MULTIPLIER_VP_TYPES.includes(rt))

  const expansionCards = expansionFilters.length > 0
    ? (cardRef ?? []).filter(c => expansionFilters.some(e => (c.expansions ?? []).includes(e)))
    : []
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
      else {
        next.set('sort', key)
        next.set('dir', 'desc')
      }
      return next
    }, { replace: true })
  }

  function updateSearch(value: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value) next.set('q', value)
      else next.delete('q')
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
      next.delete('q')
      next.delete('type')
      next.delete('tag')
      next.delete('expansion')
      next.delete('exacttags')
      next.delete('vp')
      next.delete('resvp')
      next.delete('restype')
      return next
    }, { replace: true })
  }

  function setExactTagsFilter(n: number) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (exactTags === n) next.delete('exacttags')
      else next.set('exacttags', String(n))
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
      if (vpFilter === val) next.delete('vp')
      else next.set('vp', val)
      return next
    }, { replace: true })
  }

  function setResVpFilter(val: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (resVpFilter === val) next.delete('resvp')
      else next.set('resvp', val)
      return next
    }, { replace: true })
  }

  function setResTypeFilter(val: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (resTypeFilter === val) next.delete('restype')
      else next.set('restype', val)
      return next
    }, { replace: true })
  }

  function rememberScroll() {
    sessionStorage.setItem(scrollKey, String(window.scrollY))
  }

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <PageHeader
        title="Cards"
        subtitle={hasFilters ? `${cards.length} of ${cardRef?.length ?? 0} cards` : `${cardRef?.length ?? 0} cards in reference`}
      />

      <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Search + clear */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search cards…"
            value={search}
            onChange={e => updateSearch(e.target.value)}
            style={{
              width: '240px', height: '34px', padding: '0 12px',
              background: 'var(--bg-input)', border: '1px solid var(--bd-input)', borderRadius: '4px',
              color: 'var(--text-1)', fontFamily: 'var(--font-body)', fontSize: '0.83rem', outline: 'none',
            }}
          />
          {hasFilters && (
            <button
              onClick={clearFilters}
              style={{
                height: '34px', padding: '0 12px',
                background: 'transparent', border: '1px solid var(--bd-input)', borderRadius: '4px',
                color: 'var(--text-4)', fontFamily: 'var(--font-body)', fontSize: '0.78rem', cursor: 'pointer',
              }}
            >
              Clear all
            </button>
          )}
        </div>

        {/* Type pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={filterLabelStyle}>Type</span>
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
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={filterLabelStyle}>Expansion</span>
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
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '6px', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-4)' }}>
              {expansionFilters.join(' + ')} — {expansionCards.length} cards
            </span>
            <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: '6px' }}>By type</div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {Object.entries(expansionTypeBreakdown).sort((a, b) => b[1]! - a[1]!).map(([type, count]) => {
                    const col = TYPE_COLORS[type]
                    return (
                      <span key={type} style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '3px', background: col?.bg ?? 'rgba(255,255,255,0.05)', color: col?.color ?? 'var(--text-2)', whiteSpace: 'nowrap' }}>
                        {type} <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{count}</span>
                      </span>
                    )
                  })}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: '6px' }}>By tag</div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {Object.entries(expansionTagBreakdown).sort((a, b) => b[1] - a[1]).map(([tag, count]) => (
                    <span key={tag} title={tag} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 6px', borderRadius: '3px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--bd-panel)', whiteSpace: 'nowrap' }}>
                      {TAG_ICONS[tag]
                        ? <img src={TAG_ICONS[tag]} alt={tag} style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                        : <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-3)' }}>{tag.slice(0, 3)}</span>
                      }
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.72rem', color: 'var(--text-2)' }}>{count}</span>
                    </span>
                  ))}
                  {Object.keys(expansionTagBreakdown).length === 0 && (
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--text-4)' }}>No tags</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tag pills */}
        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={filterLabelStyle}>Tag</span>
            {allTags.map(tag => (
              <FilterPill
                key={tag}
                label={tag}
                icon={TAG_ICONS[tag]}
                active={tagFilters.includes(tag)}
                onClick={() => toggleTag(tag)}
              />
            ))}
            <FilterPill
              label="No tag"
              icon={NO_TAG_ICON}
              active={tagFilters.includes(NO_TAG)}
              onClick={() => toggleTag(NO_TAG)}
            />
          </div>
        )}

        {/* Min tag count pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={filterLabelStyle}>Min tags</span>
          {[1, 2, 3, 4].map(n => (
            <FilterPill
              key={n}
              label={String(n)}
              tooltip={`Exactly ${n} tag${n > 1 ? 's' : ''}`}
              active={exactTags === n}
              color="#5b8dd9"
              onClick={() => setExactTagsFilter(n)}
            />
          ))}
        </div>

        {/* VP pills */}
        {allBaseVPs.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={filterLabelStyle}>VP</span>
            {allBaseVPs.some(v => v < 0) && (
              <FilterPill label="−" tooltip="All negative VP" active={vpFilter === 'negative'} color="#e05535" onClick={() => setVpFilter('negative')} />
            )}
            {allBaseVPs.map(v => (
              <FilterPill
                key={v}
                label={v > 0 ? `+${v}` : `${v}`}
                active={vpFilter === String(v)}
                color={v > 0 ? '#4a9e6b' : v < 0 ? '#e05535' : '#888888'}
                onClick={() => setVpFilter(String(v))}
              />
            ))}
            {allBaseVPs.some(v => v > 0) && (
              <FilterPill label="+" tooltip="All positive VP" active={vpFilter === 'positive'} color="#4a9e6b" onClick={() => setVpFilter('positive')} />
            )}
          </div>
        )}

        {/* Resource VP pills */}
        {allResVpPer.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={filterLabelStyle}>Resource VP</span>
            {allResVpPer.map(n => (
              <FilterPill
                key={n}
                label={`1/${n}`}
                tooltip={`1 VP per ${n} resource${n > 1 ? 's' : ''}`}
                active={resVpFilter === String(n)}
                color="#c9a030"
                onClick={() => setResVpFilter(String(n))}
              />
            ))}
          </div>
        )}

        {/* Resource type pills */}
        {allResourceTypes.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={filterLabelStyle}>Resource</span>
            {allResourceTypes.map(rt => (
              <FilterPill
                key={rt}
                label={rt}
                tooltip={rt}
                icon={RESOURCE_ICONS[rt]}
                active={resTypeFilter === rt}
                color="#b87aff"
                onClick={() => setResTypeFilter(rt)}
              />
            ))}
          </div>
        )}

        {/* Placement VP type pill */}
        {allPlacementTypes.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={filterLabelStyle}>Placement VP</span>
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
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={filterLabelStyle}>Multiplier VP</span>
            {allMultiplierTypes.map(rt => (
              <FilterPill
                key={rt}
                label={rt}
                active={resTypeFilter === rt}
                color="#b87aff"
                onClick={() => setResTypeFilter(rt)}
              />
            ))}
          </div>
        )}
      </div>

      {cards.length === 0 ? (
        <EmptyState message="No cards match the current filters." />
      ) : (
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '6px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bd-panel)' }}>
                {([
                  { label: 'Card',      key: 'card_name'           as SortKey, align: 'left'   },
                  { label: 'Type',      key: null,                              align: 'center' },
                  { label: 'Tags',      key: null,                              align: 'center' },
                  { label: 'Expansion', key: null,                              align: 'center' },
                  { label: 'Cost',      key: null,                              align: 'center' },
                  { label: 'Played',   key: 'times_played'        as SortKey, align: 'center' },
                  { label: 'Win Rate', key: 'win_rate' as SortKey, align: 'center' },
                  { label: 'VP',       key: 'base_vp'  as SortKey, align: 'center' },
                ] as { label: string; key: SortKey | null; align: string }[]).map(({ label, key, align }) => {
                  const active = key && sortKey === key
                  return (
                    <th
                      key={label}
                      onClick={key ? () => handleSort(key) : undefined}
                      style={{
                        padding: '11px 16px', textAlign: align as 'left' | 'center',
                        fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: active ? 'var(--sort-active)' : 'var(--text-4)',
                        cursor: key ? 'pointer' : 'default',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                      }}
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
                    style={{ borderBottom: i < cards.length - 1 ? '1px solid var(--bd-panel)' : 'none', transition: 'background 0.1s', background: 'var(--bg-row)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-row-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-row)')}
                  >
                    <td style={{ padding: '12px 16px', textAlign: 'left' }}>
                      <Link to={`/cards/${encodeURIComponent(card.card_name)}`} onClick={rememberScroll} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-1)', textDecoration: 'none' }}>
                        {(() => { const { baseName, variant } = parseCardName(card.card_name); return <><span>{baseName}</span>{variant && <VariantBadge variant={variant} />}</> })()}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {typeStyle && (
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 500, padding: '2px 7px', borderRadius: '3px', background: typeStyle.bg, color: typeStyle.color, whiteSpace: 'nowrap' }}>
                          {type}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {parseTags(card.tags).map((tag, i) => (
                          <Tag key={`${tag}-${i}`} name={tag} />
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {(card.expansions ?? []).map(exp => (
                          EXPANSION_ICONS[exp]
                            ? <img key={exp} src={EXPANSION_ICONS[exp]} alt={exp} title={exp} style={{ width: '18px', height: '18px', objectFit: 'contain', opacity: 0.85 }} />
                            : <span key={exp} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-4)' }}>{exp}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ ...numTd, textAlign: 'center', color: card.mc_cost != null ? '#c9a030' : 'var(--text-5)' }}>
                      {card.mc_cost != null ? `${card.mc_cost}` : '/'}
                    </td>
                    <td style={{ ...numTd, textAlign: 'center', color: stats ? 'var(--text-2)' : 'var(--text-5)' }}>
                      {stats ? stats.times_played : '—'}
                    </td>
                    <td style={{ ...numTd, textAlign: 'center', color: stats ? (stats.win_rate >= 50 ? '#4a9e6b' : stats.win_rate > 33 ? '#c9a030' : '#e05535') : 'var(--text-5)' }}>
                      {stats ? (
                        <>
                          {Math.round(stats.win_rate)}%
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-4)', marginLeft: '4px' }}>
                            ({stats.win_count}/{stats.times_played})
                          </span>
                        </>
                      ) : '—'}
                    </td>
                    <td style={{ ...numTd, textAlign: 'center' }}>
                      {card.base_vp !== null ? (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.83rem', fontWeight: 700, color: card.base_vp > 0 ? '#4a9e6b' : card.base_vp < 0 ? '#e05535' : 'var(--text-4)' }}>
                          {card.base_vp}
                        </span>
                      ) : card.resource_vp_per !== null ? (
                        PLACEMENT_VP_TYPES.includes(card.resource_vp_type ?? '') ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '5px', background: 'rgba(91,141,217,0.1)', border: '1px solid rgba(91,141,217,0.3)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, color: '#5b8dd9' }}>
                            1/{card.resource_vp_per}
                            {card.resource_vp_type && (PLACEMENT_ICONS[card.resource_vp_type]
                              ? <img src={PLACEMENT_ICONS[card.resource_vp_type]} alt={card.resource_vp_type} title={card.resource_vp_type} style={{ width: '13px', height: '13px', objectFit: 'contain' }} />
                              : <span style={{ fontSize: '0.65rem', color: 'rgba(91,141,217,0.7)' }}>{card.resource_vp_type}</span>
                            )}
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '5px', background: 'rgba(201,160,48,0.1)', border: '1px solid rgba(201,160,48,0.3)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, color: '#c9a030' }}>
                            1/{card.resource_vp_per}
                            {card.resource_vp_type && (RESOURCE_ICONS[card.resource_vp_type]
                              ? <img src={RESOURCE_ICONS[card.resource_vp_type]} alt={card.resource_vp_type} title={card.resource_vp_type} style={{ width: '13px', height: '13px', objectFit: 'contain' }} />
                              : <span style={{ fontSize: '0.65rem', color: 'rgba(201,160,48,0.7)' }}>{card.resource_vp_type}</span>
                            )}
                          </span>
                        )
                      ) : (
                        <span style={{ color: 'var(--text-5)' }}>/</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: '14px', fontFamily: 'var(--font-body)', fontSize: '0.73rem', color: 'var(--text-4)', fontStyle: 'italic' }}>
        Win rate reflects the player's game result when this card was played, not the card's direct contribution to winning.
      </p>
    </div>
  )
}

const loadingStyle: React.CSSProperties = { padding: '32px 36px', color: 'var(--text-4)', fontFamily: 'var(--font-body)' }
const numTd: React.CSSProperties = { padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.83rem', color: 'var(--text-2)' }
