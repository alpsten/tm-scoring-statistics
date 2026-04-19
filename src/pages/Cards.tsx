import { useEffect, useMemo, useRef } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import Tag from '../components/ui/Tag'
import { parseTags } from '../components/ui/tagUtils'
import EmptyState from '../components/ui/EmptyState'
import FilterPill from '../components/ui/FilterPill'
import { useCardStats, useCardReference } from '../lib/hooks'
import { TAG_ICONS } from '../lib/expansions'

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  Automated:   { bg: 'rgba(74, 158, 107, 0.1)',  color: '#4a9e6b' },
  Active:      { bg: 'rgba(91, 141, 217, 0.1)',  color: '#5b8dd9' },
  Event:       { bg: 'rgba(224, 85, 53, 0.1)',   color: '#e05535' },
  Corporation: { bg: 'rgba(201, 160, 48, 0.1)',  color: '#c9a030' },
  Prelude:     { bg: 'rgba(220, 100, 150, 0.1)', color: '#d46496' },
  CEO:         { bg: 'rgba(210, 120, 50, 0.1)',  color: '#d07832' },
}

const CARD_TYPES = ['Automated', 'Active', 'Event', 'Corporation', 'Prelude', 'CEO'] as const
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
  const sortKey = parseSortKey(searchParams.get('sort'))
  const sortDir: 'asc' | 'desc' = searchParams.get('dir') === 'desc' ? 'desc' : 'asc'
  const scrollRestoredRef = useRef(false)
  const { data: cardStats, isLoading, error } = useCardStats()
  const { data: cardRef } = useCardReference()

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

  const allTags = [...new Set(
    Object.values(tagMap).flatMap(t => parseTags(t))
  )].sort()

  const cards = (cardStats ?? []).filter(c => {
    if (!c.card_name.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilters.length > 0) {
      const type = typeMap[c.card_name.toLowerCase()]
      if (!typeFilters.includes(type as CardType)) return false
    }
    if (tagFilters.length > 0) {
      const cardTags = parseTags(tagMap[c.card_name.toLowerCase()] ?? null)
      if (!tagFilters.some(t => cardTags.includes(t))) return false
    }
    return true
  })

  const sorted = [...cards].sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1
    if (sortKey === 'card_name') return mul * a.card_name.localeCompare(b.card_name)
    return mul * ((a[sortKey] ?? 0) - (b[sortKey] ?? 0))
  })

  const hasFilters = !!search || typeFilters.length > 0 || tagFilters.length > 0

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
        subtitle={hasFilters ? `${cards.length} of ${cardStats?.length ?? 0} cards` : 'Performance analysis across all played games'}
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
          </div>
        )}
      </div>

      {cards.length === 0 ? (
        <EmptyState message="No card play data yet. Cards are tracked when logged in a game session." />
      ) : (
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '6px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bd-panel)' }}>
                {([
                  { label: 'Card',     key: 'card_name'           as SortKey, align: 'left'   },
                  { label: 'Type',     key: null,                              align: 'center' },
                  { label: 'Tags',     key: null,                              align: 'center' },
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
                const type = typeMap[card.card_name.toLowerCase()]
                const typeStyle = type ? TYPE_COLORS[type] : null
                return (
                  <tr
                    key={card.card_name}
                    style={{ borderBottom: i < cards.length - 1 ? '1px solid var(--bd-panel)' : 'none', transition: 'background 0.1s', background: 'var(--bg-row)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-row-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-row)')}
                  >
                    <td style={{ padding: '12px 16px', textAlign: 'left' }}>
                      <Link to={`/cards/${encodeURIComponent(card.card_name)}`} onClick={rememberScroll} style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-1)', textDecoration: 'none' }}>
                        {card.card_name}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {type && typeStyle && (
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 500, padding: '2px 7px', borderRadius: '3px', background: typeStyle.bg, color: typeStyle.color, whiteSpace: 'nowrap' }}>
                          {type}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {parseTags(tagMap[card.card_name.toLowerCase()] ?? null).map((tag, i) => (
                          <Tag key={`${tag}-${i}`} name={tag} />
                        ))}
                      </div>
                    </td>
                    <td style={{ ...numTd, textAlign: 'center' }}>{card.times_played}</td>
                    <td style={{ ...numTd, textAlign: 'center', color: card.win_rate >= 50 ? '#4a9e6b' : card.win_rate > 33 ? '#c9a030' : '#e05535' }}>
                      {Math.round(card.win_rate)}%
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: 'var(--text-4)', marginLeft: '4px' }}>
                        ({card.win_count}/{card.times_played})
                      </span>
                    </td>
                    <td style={{ ...numTd, textAlign: 'center', color: '#c9a030' }}>{Math.round(card.avg_vp_contribution)}</td>
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
