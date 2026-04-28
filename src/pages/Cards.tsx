import { useEffect, useMemo, useRef } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import Tag from '../components/ui/Tag'
import { parseTags, parseCardName } from '../components/ui/tagUtils'
import EmptyState from '../components/ui/EmptyState'
import FilterPill from '../components/ui/FilterPill'
import { useCardStats, useCardReference, useCorpStats, useCEOStats } from '../lib/hooks'
import { TAG_ICONS, EXPANSION_ICONS, NO_TAG_ICON, NO_TAG } from '../lib/expansions'

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  Automated:   { bg: 'rgba(74, 158, 107, 0.1)',  color: '#4a9e6b' },
  Active:      { bg: 'rgba(91, 141, 217, 0.1)',  color: '#5b8dd9' },
  Event:       { bg: 'rgba(224, 85, 53, 0.1)',   color: '#e05535' },
  Corporation: { bg: 'rgba(201, 160, 48, 0.1)',  color: '#c9a030' },
  Prelude:     { bg: 'rgba(220, 100, 150, 0.1)', color: '#d46496' },
  CEO:         { bg: 'rgba(210, 120, 50, 0.1)',  color: '#d07832' },
  'Global Event': { bg: 'rgba(160, 110, 190, 0.1)', color: '#a870c8' },
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

type SortKey = 'card_name' | 'times_played' | 'win_rate' | 'avg_vp_contribution'
const SORT_KEYS: SortKey[] = ['card_name', 'times_played', 'win_rate', 'avg_vp_contribution']
const CARDS_SCROLL_PREFIX = 'tm-cards-scroll:'

function parseListParam(value: string | null) {
  return value?.split(',').map(v => v.trim()).filter(Boolean) ?? []
}

function parseCardTypes(value: string | null): CardType[] {
  return parseListParam(value).filter((type): type is CardType => CARD_TYPES.includes(type as CardType))
}

function parseSortKey(value: string | null): SortKey {
  return SORT_KEYS.includes(value as SortKey) ? value as SortKey : 'card_name'
}

function writeListParam(params: URLSearchParams, key: string, values: string[]) {
  if (values.length > 0) params.set(key, values.join(','))
  else params.delete(key)
}

export default function Cards() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') ?? ''
  const typeFilters = useMemo(() => parseCardTypes(searchParams.get('type')), [searchParams])
  const tagFilters = useMemo(() => parseListParam(searchParams.get('tag')), [searchParams])
  const expansionFilter = searchParams.get('expansion') ?? ''
  const exactTagsParam = searchParams.get('exacttags')
  const exactTags: number | null = exactTagsParam ? Number(exactTagsParam) : null
  const sortKey = parseSortKey(searchParams.get('sort'))
  const sortDir: 'asc' | 'desc' = searchParams.get('dir') === 'desc' ? 'desc' : 'asc'
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

  const expansionCards = expansionFilter
    ? (cardRef ?? []).filter(c => (c.expansions ?? []).includes(expansionFilter))
    : []
  const expansionTypeBreakdown: Partial<Record<string, number>> = {}
  const expansionTagBreakdown: Record<string, number> = {}
  for (const c of expansionCards) {
    expansionTypeBreakdown[c.card_type] = (expansionTypeBreakdown[c.card_type] ?? 0) + 1
    for (const tag of parseTags(c.tags)) {
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
    if (expansionFilter && !(c.expansions ?? []).includes(expansionFilter)) return false
    if (exactTags !== null && parseTags(c.tags).length !== exactTags) return false
    return true
  })

  const sorted = [...cards].sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1
    if (sortKey === 'card_name') return mul * a.card_name.localeCompare(b.card_name)
    const aStats = statsMap[a.card_name.toLowerCase()]
    const bStats = statsMap[b.card_name.toLowerCase()]
    return mul * ((aStats?.[sortKey] ?? 0) - (bStats?.[sortKey] ?? 0))
  })

  const hasFilters = !!search || typeFilters.length > 0 || tagFilters.length > 0 || !!expansionFilter || exactTags !== null

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

  function setExpansion(exp: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (expansionFilter === exp) next.delete('expansion')
      else next.set('expansion', exp)
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
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)', marginRight: '2px' }}>Type</span>
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
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)', marginRight: '2px' }}>Expansion</span>
            {allExpansions.map(exp => {
              const active = expansionFilter === exp
              return (
                <button key={exp} onClick={() => setExpansion(exp)} title={exp} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '30px', height: '30px', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.12s',
                  background: active ? 'rgba(201,160,48,0.12)' : 'transparent',
                  border: `1px solid ${active ? '#c9a030' : 'var(--bd-input)'}`,
                  opacity: active ? 1 : 0.5,
                  padding: 0,
                }}>
                  {EXPANSION_ICONS[exp]
                    ? <img src={EXPANSION_ICONS[exp]} alt={exp} style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                    : <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: active ? '#c9a030' : 'var(--text-4)' }}>{exp.slice(0, 3).toUpperCase()}</span>
                  }
                </button>
              )
            })}
          </div>
        )}

        {/* Expansion breakdown panel */}
        {expansionFilter && expansionCards.length > 0 && (
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '6px', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-4)' }}>
              {expansionFilter} — {expansionCards.length} cards
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
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)', marginRight: '2px' }}>Tag</span>
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
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)', marginRight: '2px' }}>Min tags</span>
          {[1, 2, 3, 4].map(n => {
            const active = exactTags === n
            return (
              <button key={n} onClick={() => setExactTagsFilter(n)} style={{
                padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.12s',
                fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700,
                background: active ? 'rgba(91,141,217,0.12)' : 'transparent',
                border: `1px solid ${active ? '#5b8dd9' : 'var(--bd-input)'}`,
                color: active ? '#5b8dd9' : 'var(--text-4)',
              }}>
                {n}
              </button>
            )
          })}
        </div>
      </div>

      {cards.length === 0 ? (
        <EmptyState message="No cards match the current filters." />
      ) : (
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '6px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bd-panel)' }}>
                {([
                  { label: 'Card',     key: 'card_name'           as SortKey, align: 'left'   },
                  { label: 'Type',     key: null,                              align: 'center' },
                  { label: 'Tags',     key: null,                              align: 'center' },
                  { label: 'Cost',     key: null,                              align: 'center' },
                  { label: 'Played',   key: 'times_played'        as SortKey, align: 'center' },
                  { label: 'Win Rate', key: 'win_rate'            as SortKey, align: 'center' },
                  { label: 'Avg VP',   key: 'avg_vp_contribution' as SortKey, align: 'center' },
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
                    <td style={{ ...numTd, textAlign: 'center', color: card.mc_cost != null ? '#c9a030' : 'var(--text-5)' }}>
                      {card.mc_cost != null ? `${card.mc_cost}` : '—'}
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
                    <td style={{ ...numTd, textAlign: 'center', color: stats ? '#c9a030' : 'var(--text-5)' }}>
                      {stats ? Math.round(stats.avg_vp_contribution) : '—'}
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
