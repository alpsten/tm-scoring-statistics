import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import PositionBadge from '../components/ui/PositionBadge'
import SectionHeading from '../components/ui/SectionHeading'
import DataTable from '../components/ui/DataTable'
import type { DataTableColumn } from '../components/ui/DataTable'
import { useGames, usePlayerStats, usePlayerProfiles, usePlayerCardStats, useCardReference, useCardStats } from '../lib/hooks'
import { CARD_NAME_CORRECTIONS } from '../lib/logParser'
import { getCorps } from '../types/database'
import Tag from '../components/ui/Tag'
import { parseTags } from '../components/ui/tagUtils'
import { EXPANSION_ICONS, NO_TAG, UNOFFICIAL_EXPANSIONS, PROJECT_CARD_TYPES, TYPE_COLORS } from '../lib/expansions'

export default function PlayerDetail() {
  const rawName = useParams<{ name: string }>().name
  const name = rawName ? decodeURIComponent(rawName) : rawName
  const navigate = useNavigate()
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  const [openYears, setOpenYears] = useState<Set<string>>(new Set())
  const [collapsedCardSections, setCollapsedCardSections] = useState<Set<string>>(new Set(['Prelude cards', 'Automated cards', 'Active cards', 'Event cards']))
  const [allCorpsOpen, setAllCorpsOpen] = useState(false)
  const [chartYear, setChartYear] = useState<string>('All')
  const [cardSortKey, setCardSortKey] = useState('times_played')
  const [cardSortDir, setCardSortDir] = useState<'asc' | 'desc'>('desc')
  const [officialOnly, setOfficialOnly] = useState(true)
  const { data: games, isLoading: gamesLoading } = useGames()
  const { data: playerStats, isLoading: statsLoading } = usePlayerStats()
  const { data: profiles = [] } = usePlayerProfiles()
  const { data: playerCards = [] } = usePlayerCardStats(name!)
  const { data: cardRef = [] } = useCardReference()
  const { data: globalCardStats = [] } = useCardStats()

  useEffect(() => {
    if (!gamesLoading && games) {
      const myGames = games.filter(g => g.player_results.some(r => r.player_name === name))
      if (myGames.length > 0) {
        const latest = myGames[0].date.slice(0, 4)
        setOpenYears(new Set([latest]))
      }
    }
  }, [gamesLoading])

  if (gamesLoading || statsLoading) return <div style={loadingStyle}>Loading…</div>

  const stats = (playerStats ?? []).find(p => p.player_name === name)
  const profile = profiles.find(p => p.player_name === name)
  const playerGames = (games ?? [])
    .filter(g => g.player_results.some(r => r.player_name === name))
    .sort((a, b) => b.date.localeCompare(a.date))

  if (!stats) {
    return <div style={loadingStyle}>Player not found. <Link to="/players" style={{ color: '#e05535' }}>Back</Link></div>
  }

  const myResults = playerGames.map(g => g.player_results.find(r => r.player_name === name)!)
  const totalVP = myResults.reduce((sum, r) => sum + r.total_vp, 0)

  // Win streak (playerGames is newest-first, so iterate reversed for chronological)
  let longestStreak = 0, tempStreak = 0
  for (let i = myResults.length - 1; i >= 0; i--) {
    if (myResults[i].position === 1) { tempStreak++; if (tempStreak > longestStreak) longestStreak = tempStreak }
    else tempStreak = 0
  }
  let currentStreak = 0
  for (const r of myResults) { if (r.position === 1) currentStreak++; else break }

  // Win rate by player count
  const winRateByCount: Record<number, { wins: number; games: number }> = {}
  for (let i = 0; i < playerGames.length; i++) {
    const pc = playerGames[i].player_count
    if (!winRateByCount[pc]) winRateByCount[pc] = { wins: 0, games: 0 }
    winRateByCount[pc].games++
    if (myResults[i].position === 1) winRateByCount[pc].wins++
  }

  type GameRecord = { value: number; gameNumber: number | null }
  const findBest = (fn: (r: typeof myResults[0]) => number | null): GameRecord | null => {
    let best: GameRecord | null = null
    for (const g of playerGames) {
      const r = g.player_results.find(p => p.player_name === name)!
      const v = fn(r)
      if (v === null) continue
      if (best === null || v > best.value) best = { value: v, gameNumber: g.game_number }
    }
    return best
  }

  const bestScore    = findBest(r => r.total_vp)
  const bestTR       = findBest(r => r.tr)
  const bestGreenery = findBest(r => r.greenery_vp)
  const bestCity     = findBest(r => r.city_vp)
  const bestCardVP   = findBest(r => r.card_vp)
  const bestHabitat  = findBest(r => r.habitat_vp)
  const bestMining   = findBest(r => r.mining_vp)
  const bestLogistics = findBest(r => r.logistics_vp)
  const biggestWin = (() => {
    let best: GameRecord | null = null
    for (const g of playerGames) {
      const me = g.player_results.find(r => r.player_name === name)!
      if (me.position !== 1) continue
      const second = g.player_results.find(r => r.position === 2)
      if (!second) continue
      const margin = me.total_vp - second.total_vp
      if (best === null || margin > best.value) best = { value: margin, gameNumber: g.game_number }
    }
    return best
  })()

  const allChartData = playerGames.map(g => {
    const result = g.player_results.find(r => r.player_name === name)!
    return { fullDate: g.date, date: g.date.slice(5), year: g.date.slice(0, 4), score: result.total_vp, win: result.position === 1 }
  }).reverse()
  const chartYears = [...new Set(allChartData.map(d => d.year))].sort()
  const chartData = chartYear === 'All' ? allChartData : allChartData.filter(d => d.year === chartYear)
  const chartAvg = chartData.length > 0 ? chartData.reduce((s, d) => s + d.score, 0) / chartData.length : stats.avg_score
  const monthGroups = chartData.reduce<{ key: string; label: string; firstDate: string; lastDate: string }[]>((acc, d) => {
    const key = chartYear === 'All' ? d.year : d.fullDate.slice(0, 7)
    const existing = acc.find(g => g.key === key)
    if (existing) { existing.lastDate = d.fullDate } else {
      const label = chartYear === 'All' ? d.year : new Date(d.fullDate).toLocaleString('en', { month: 'short' })
      acc.push({ key, label, firstDate: d.fullDate, lastDate: d.fullDate })
    }
    return acc
  }, [])
  type GameRow = { id: string; game_number: number | null; date: string; map_name: string | null; corporations: string[]; position: number; total_vp: number; key_notes: string | null }
  const gameRows: GameRow[] = playerGames.map(game => {
    const result = game.player_results.find(r => r.player_name === name)!
    return { id: game.id, game_number: game.game_number, date: game.date, map_name: game.map_name, corporations: result.corporations.length > 0 ? result.corporations : [result.corporation], position: result.position, total_vp: result.total_vp, key_notes: result.key_notes ?? null }
  })

  const cardRefMap = Object.fromEntries(cardRef.map(c => [c.card_name, c]))

  const isOfficial = (exps: string[]) => !exps.some(e => UNOFFICIAL_EXPANSIONS.has(e))

  const activeCardRef = officialOnly ? cardRef.filter(c => isOfficial(c.expansions)) : cardRef
  const activePlayerCards = officialOnly
    ? playerCards.filter(c => {
        const ref = cardRefMap[CARD_NAME_CORRECTIONS[c.card_name] ?? c.card_name]
        return !ref || isOfficial(ref.expansions)
      })
    : playerCards

  const PROJECT_TYPES = new Set<string>(PROJECT_CARD_TYPES)

  // --- Tags on Project Cards (Automated + Active + Event pool only) ---
  const playerProjectTagPlays: Record<string, number> = {}
  let playerProjectTotalPlays = 0
  for (const c of activePlayerCards) {
    const canonical = CARD_NAME_CORRECTIONS[c.card_name] ?? c.card_name
    const ref = cardRefMap[canonical]
    if (!ref || !PROJECT_TYPES.has(ref.card_type)) continue
    playerProjectTotalPlays += c.times_played
    const tags = parseTags(ref.tags ?? null)
    for (const tag of tags.length > 0 ? tags : [NO_TAG]) {
      playerProjectTagPlays[tag] = (playerProjectTagPlays[tag] ?? 0) + c.times_played
    }
  }
  const poolProjectTagCount: Record<string, number> = {}
  let poolProjectTotalCards = 0
  for (const c of activeCardRef) {
    if (!PROJECT_TYPES.has(c.card_type)) continue
    poolProjectTotalCards++
    const tags = parseTags(c.tags ?? null)
    for (const tag of tags.length > 0 ? tags : [NO_TAG]) {
      poolProjectTagCount[tag] = (poolProjectTagCount[tag] ?? 0) + 1
    }
  }
  const topTags = playerProjectTotalPlays > 0 && poolProjectTotalCards > 0
    ? Object.entries(playerProjectTagPlays)
        .filter(([tag]) => (poolProjectTagCount[tag] ?? 0) > 0)
        .map(([tag, plays]) => ({
          tag, plays,
          affinity: (plays / playerProjectTotalPlays) / (poolProjectTagCount[tag] / poolProjectTotalCards),
        }))
        .sort((a, b) => b.affinity - a.affinity)
    : []

  // --- Card Types (project card pool only) ---
  const playerTypePlays: Record<string, number> = {}
  for (const c of activePlayerCards) {
    const canonical = CARD_NAME_CORRECTIONS[c.card_name] ?? c.card_name
    const ctype = cardRefMap[canonical]?.card_type
    if (ctype && PROJECT_TYPES.has(ctype)) {
      playerTypePlays[ctype] = (playerTypePlays[ctype] ?? 0) + c.times_played
    }
  }
  const poolTypeCount: Record<string, number> = {}
  for (const c of activeCardRef) {
    if (PROJECT_TYPES.has(c.card_type)) {
      poolTypeCount[c.card_type] = (poolTypeCount[c.card_type] ?? 0) + 1
    }
  }
  const topCardTypes = playerProjectTotalPlays > 0 && poolProjectTotalCards > 0
    ? PROJECT_CARD_TYPES
        .filter(t => (playerTypePlays[t] ?? 0) > 0)
        .map(t => ({
          type: t,
          plays: playerTypePlays[t] ?? 0,
          affinity: ((playerTypePlays[t] ?? 0) / playerProjectTotalPlays) / ((poolTypeCount[t] ?? 1) / poolProjectTotalCards),
        }))
        .sort((a, b) => b.affinity - a.affinity)
    : []

  // --- Corporations (corporation pool only) ---
  const playerCorpTagCounts: Record<string, number> = {}
  let corpTotalPlays = 0
  for (const game of playerGames) {
    const result = game.player_results.find(r => r.player_name === name)!
    for (const corp of getCorps(result)) {
      const canonical = CARD_NAME_CORRECTIONS[corp] ?? corp
      const ref = cardRefMap[canonical]
      if (officialOnly && ref && !isOfficial(ref.expansions)) continue
      corpTotalPlays++
      const corpTags = parseTags(ref?.tags ?? null)
      for (const tag of corpTags.length > 0 ? corpTags : [NO_TAG]) {
        playerCorpTagCounts[tag] = (playerCorpTagCounts[tag] ?? 0) + 1
      }
    }
  }
  const poolCorpTagCount: Record<string, number> = {}
  let poolCorpTotal = 0
  for (const c of activeCardRef) {
    if (c.card_type !== 'Corporation') continue
    poolCorpTotal++
    const corpTags = parseTags(c.tags ?? null)
    for (const tag of corpTags.length > 0 ? corpTags : [NO_TAG]) {
      poolCorpTagCount[tag] = (poolCorpTagCount[tag] ?? 0) + 1
    }
  }
  const topCorpTags = corpTotalPlays > 0 && poolCorpTotal > 0
    ? Object.entries(playerCorpTagCounts)
        .filter(([tag]) => (poolCorpTagCount[tag] ?? 0) > 0)
        .map(([tag, plays]) => ({
          tag, plays,
          affinity: (plays / corpTotalPlays) / (poolCorpTagCount[tag] / poolCorpTotal),
        }))
        .sort((a, b) => b.affinity - a.affinity)
        .slice(0, 3)
    : []

  // --- Preludes (prelude pool only) ---
  const playerPreludeTagCounts: Record<string, number> = {}
  let preludeTotalPlays = 0
  for (const c of activePlayerCards) {
    const canonical = CARD_NAME_CORRECTIONS[c.card_name] ?? c.card_name
    if (cardRefMap[canonical]?.card_type !== 'Prelude') continue
    preludeTotalPlays += c.times_played
    const preludeTags = parseTags(cardRefMap[canonical]?.tags ?? null)
    for (const tag of preludeTags.length > 0 ? preludeTags : [NO_TAG]) {
      playerPreludeTagCounts[tag] = (playerPreludeTagCounts[tag] ?? 0) + c.times_played
    }
  }
  const poolPreludeTagCount: Record<string, number> = {}
  let poolPreludeTotal = 0
  for (const c of activeCardRef) {
    if (c.card_type !== 'Prelude') continue
    poolPreludeTotal++
    const preludeTags = parseTags(c.tags ?? null)
    for (const tag of preludeTags.length > 0 ? preludeTags : [NO_TAG]) {
      poolPreludeTagCount[tag] = (poolPreludeTagCount[tag] ?? 0) + 1
    }
  }
  const topPreludeTags = preludeTotalPlays > 0 && poolPreludeTotal > 0
    ? Object.entries(playerPreludeTagCounts)
        .filter(([tag]) => (poolPreludeTagCount[tag] ?? 0) > 0)
        .map(([tag, plays]) => ({
          tag, plays,
          affinity: (plays / preludeTotalPlays) / (poolPreludeTagCount[tag] / poolPreludeTotal),
        }))
        .sort((a, b) => b.affinity - a.affinity)
        .slice(0, 3)
    : []
  const globalWinRateMap = Object.fromEntries(globalCardStats.map(s => [s.card_name, s.win_rate]))

  const handleCardSort = (key: string) => {
    if (key === cardSortKey) setCardSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setCardSortKey(key); setCardSortDir('desc') }
  }
  const sortCards = (cards: typeof playerCards) => [...cards].sort((a, b) => {
    const cA = CARD_NAME_CORRECTIONS[a.card_name] ?? a.card_name
    const cB = CARD_NAME_CORRECTIONS[b.card_name] ?? b.card_name
    let vA: number, vB: number
    if (cardSortKey === 'win_rate') { vA = globalWinRateMap[cA] ?? -1; vB = globalWinRateMap[cB] ?? -1 }
    else if (cardSortKey === 'base_vp') { vA = cardRefMap[cA]?.base_vp ?? -1; vB = cardRefMap[cB]?.base_vp ?? -1 }
    else { vA = a.times_played; vB = b.times_played }
    return cardSortDir === 'asc' ? vA - vB : vB - vA
  })

  const cardColumns: DataTableColumn<typeof playerCards[0]>[] = [
    {
      key: 'card_name',
      label: 'Card',
      tdStyle: { fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: 'var(--text-1)' },
      render: c => {
        const canonical = CARD_NAME_CORRECTIONS[c.card_name] ?? c.card_name
        return (
          <Link to={`/cards/${encodeURIComponent(canonical)}`} style={{ color: 'var(--text-1)', textDecoration: 'none' }}>
            {canonical}
          </Link>
        )
      },
    },
    { key: 'times_played', label: 'Played', align: 'center', sortable: true, tdStyle: { fontSize: '0.82rem' } },
    {
      key: 'base_vp',
      label: 'VP',
      align: 'center',
      sortable: true,
      tdStyle: { fontSize: '0.82rem' },
      render: c => {
        const canonical = CARD_NAME_CORRECTIONS[c.card_name] ?? c.card_name
        const base_vp = cardRefMap[canonical]?.base_vp
        return <span style={{ color: base_vp != null ? '#c9a030' : 'var(--text-5)' }}>{base_vp ?? '/'}</span>
      },
    },
    {
      key: 'win_rate',
      label: 'Win Rate',
      align: 'center',
      sortable: true,
      tdStyle: { fontSize: '0.82rem' },
      render: c => {
        const canonical = CARD_NAME_CORRECTIONS[c.card_name] ?? c.card_name
        const wr = globalWinRateMap[canonical]
        if (wr == null) return <span style={{ color: 'var(--text-5)' }}>—</span>
        return <span style={{ color: wr >= 50 ? '#4a9e6b' : wr > 33 ? '#c9a030' : '#e05535' }}>{Math.round(wr)}%</span>
      },
    },
    {
      key: 'tags',
      label: 'Tags',
      align: 'center',
      tdStyle: { fontSize: '0.82rem' },
      render: c => {
        const canonical = CARD_NAME_CORRECTIONS[c.card_name] ?? c.card_name
        const tags = parseTags(cardRefMap[canonical]?.tags ?? null)
        if (tags.length === 0) return <span style={{ color: 'var(--text-5)' }}>—</span>
        return (
          <span style={{ display: 'inline-flex', gap: '3px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {tags.map((t, i) => <Tag key={`${t}-${i}`} name={t} />)}
          </span>
        )
      },
    },
    {
      key: 'expansion',
      label: 'Expansion',
      align: 'center',
      tdStyle: { fontSize: '0.82rem' },
      render: c => {
        const canonical = CARD_NAME_CORRECTIONS[c.card_name] ?? c.card_name
        const exps = cardRefMap[canonical]?.expansions ?? []
        if (exps.length === 0) return <span style={{ color: 'var(--text-5)' }}>—</span>
        return (
          <span style={{ display: 'inline-flex', gap: '3px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {exps.map(exp => EXPANSION_ICONS[exp]
              ? <img key={exp} src={EXPANSION_ICONS[exp]} alt={exp} title={exp} style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
              : <span key={exp} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-4)' }}>{exp.slice(0, 3).toUpperCase()}</span>
            )}
          </span>
        )
      },
    },
  ]

  const gameHistoryColumns: DataTableColumn<GameRow>[] = [
    {
      key: 'date',
      label: 'Date',
      tdStyle: { fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-3)' },
      render: r => r.game_number != null ? (
        <Link to={`/games/${r.game_number}`} style={{ color: 'var(--text-3)', textDecoration: 'none' }}>
          {new Date(r.date).toLocaleDateString('sv-SE')}
        </Link>
      ) : <>{new Date(r.date).toLocaleDateString('sv-SE')}</>,
    },
    {
      key: 'map_name',
      label: 'Map',
      tdStyle: { fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: 'var(--text-1)' },
      render: r => <>{r.map_name ?? '—'}</>,
    },
    {
      key: 'corporations',
      label: 'Corporation',
      tdStyle: { fontFamily: 'var(--font-body)', fontSize: '0.8rem' },
      render: r => (
        <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
          {r.corporations.map((corp, i) => (
            <span key={corp} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              {i > 0 && <span style={{ color: 'var(--text-5)', fontSize: '0.7rem' }}>+</span>}
              <Link to={`/corporations/${encodeURIComponent(corp)}`} style={{ color: '#b87aff', textDecoration: 'none' }}>{corp}</Link>
            </span>
          ))}
        </span>
      ),
    },
    {
      key: 'position',
      label: 'Position',
      render: r => <PositionBadge position={r.position} />,
    },
    {
      key: 'total_vp',
      label: 'Score',
      tdStyle: { fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem' },
      render: r => (
        <span style={{ color: r.position === 1 ? '#c9a030' : 'var(--text-3)' }}>
          {r.total_vp}<span style={{ marginLeft: '3px' }}>VP</span>
        </span>
      ),
    },
    {
      key: 'key_notes',
      label: 'Notes',
      tdStyle: { fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--text-4)', fontStyle: 'italic' },
      render: r => <>{r.key_notes ?? '—'}</>,
    },
  ]

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: '24px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#707070', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.78rem', padding: 0 }}>← Back</button>
      </div>

      <PageHeader
        title={
          profile?.preferred_color
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: profile.preferred_color, border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0, display: 'inline-block' }} />
                {name}
              </span>
            : name!
        }
        subtitle={`${stats.games_played} games played`}
      />

      {profile && (profile.preferred_color || profile.playing_style || profile.rival || profile.favorite_card || profile.most_tilting_card || profile.favorite_corporation || profile.trivia) && (() => {
        const COLOR_NAMES: Record<string, string> = {
          '#c62828': 'Red', '#2e7d32': 'Green', '#1565c0': 'Blue', '#f9a825': 'Yellow',
          '#37474f': 'Black', '#e0e0e0': 'White', '#d84315': 'Orange', '#ad1457': 'Pink',
          '#6a1b9a': 'Purple', '#78909c': 'Silver',
        }
        const labelEl = (text: string) => (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: '5px' }}>{text}</div>
        )
        const rankedList = (items: (string | null | undefined)[], render: (v: string, i: number) => React.ReactNode) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {items.filter(Boolean).map((v, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-5)', minWidth: '12px' }}>{i + 1}.</span>
                {render(v!, i)}
              </div>
            ))}
          </div>
        )
        return (
          <>
          <SectionHeading>Profile</SectionHeading>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '6px', padding: '16px 20px', marginBottom: '24px', display: 'inline-block', minWidth: 0 }}>
            {/* Top row: ranked lists */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginBottom: (profile.playing_style || profile.rival || profile.trivia) ? '16px' : 0 }}>
              {(profile.preferred_color || profile.preferred_color_2 || profile.preferred_color_3) && (
                <div>
                  {labelEl('Preferred Colors')}
                  {rankedList([profile.preferred_color, profile.preferred_color_2, profile.preferred_color_3], (col) => (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', background: col, border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: 'var(--text-2)' }}>{COLOR_NAMES[col] ?? col}</span>
                    </span>
                  ))}
                </div>
              )}
              {profile.favorite_card && (
                <div>
                  {labelEl('Favorite Cards')}
                  {rankedList([profile.favorite_card, profile.favorite_card_2, profile.favorite_card_3], (card) => (
                    <Link to={`/cards/${encodeURIComponent(card)}`} style={{ fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: '#b87aff', textDecoration: 'none' }}>{card}</Link>
                  ))}
                </div>
              )}
              {profile.most_tilting_card && (
                <div>
                  {labelEl('Most Frustrating Cards')}
                  {rankedList([profile.most_tilting_card, profile.most_tilting_card_2, profile.most_tilting_card_3], (card) => (
                    <Link to={`/cards/${encodeURIComponent(card)}`} style={{ fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: 'var(--text-2)', textDecoration: 'none' }}>{card}</Link>
                  ))}
                </div>
              )}
              {profile.favorite_corporation && (
                <div>
                  {labelEl('Favorite Corporations')}
                  {rankedList([profile.favorite_corporation, profile.favorite_corporation_2, profile.favorite_corporation_3], (corp) => (
                    <Link to={`/cards/${encodeURIComponent(corp)}`} style={{ fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: '#c9a030', textDecoration: 'none' }}>{corp}</Link>
                  ))}
                </div>
              )}
            </div>
            {/* Bottom row: style, rival, trivia */}
            {(profile.playing_style || profile.rival || profile.trivia) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', paddingTop: '14px', borderTop: '1px solid var(--bd-panel)', alignItems: 'baseline' }}>
                {profile.playing_style && (
                  <div>
                    {labelEl('Style')}
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: 'var(--text-2)' }}>{profile.playing_style}</div>
                  </div>
                )}
                {profile.rival && (
                  <div>
                    {labelEl('Rival')}
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.83rem' }}>
                      <Link to={`/players/${encodeURIComponent(profile.rival)}`} style={{ color: '#e05535', textDecoration: 'none' }}>{profile.rival}</Link>
                    </div>
                  </div>
                )}
                {profile.trivia && (
                  <div>
                    {labelEl('Trivia')}
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: 'var(--text-2)' }}>{profile.trivia}</div>
                  </div>
                )}
              </div>
            )}
          </div>
          </>
        )
      })()}

      <SectionHeading>Personal Achievements</SectionHeading>

      {/* Panel 1: Win stats — 2-column grid */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '6px', marginBottom: '16px' }}>
        {(() => {
          const statLabel = (text: string) => (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)' }}>{text}</span>
          )
          const statRow = (label: string, node: React.ReactNode, last: boolean) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: last ? 'none' : '1px solid var(--bd-panel)' }}>
              {statLabel(label)}
              {node}
            </div>
          )
          const left = [
            statRow('Wins', (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-3)' }}>
                {stats.wins} wins of {stats.games_played} games
              </span>
            ), false),
            statRow('Overall Win Rate', (
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem', color: stats.win_rate >= 60 ? '#4a9e6b' : stats.win_rate >= 40 ? '#c9a030' : '#e05535' }}>
                {Math.round(stats.win_rate)}%
              </span>
            ), false),
            statRow('Win Rate by Player Count', (
              <span style={{ display: 'inline-flex', gap: '14px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                {Object.entries(winRateByCount).sort(([a], [b]) => Number(a) - Number(b)).map(([count, { wins, games }]) => {
                  const wr = wins / games * 100
                  const wrColor = wr >= 60 ? '#4a9e6b' : wr >= 40 ? '#c9a030' : '#e05535'
                  return (
                    <span key={count}>
                      <span style={{ fontWeight: 700, color: '#5b8dd9' }}>{count}P </span>
                      <span style={{ fontWeight: 700, color: wrColor }}>{Math.round(wr)}%</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}> (<span style={{ color: wrColor }}>{wins}</span>/{games})</span>
                    </span>
                  )
                })}
              </span>
            ), true),
          ]
          const right = [
            statRow('Win Streak', (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 700, color: '#c9a030' }}>{longestStreak} games in a row</span>
                {currentStreak > 0 && <>
                  <span style={{ color: 'var(--text-5)', margin: '0 8px' }}>·</span>
                  <span style={{ fontWeight: 700, color: '#4a9e6b' }}>Current {currentStreak} in a row</span>
                </>}
              </span>
            ), false),
            statRow('Average Score Per Game', (
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem', color: '#c9a030' }}>
                {Math.round(stats.avg_score)} VP
              </span>
            ), false),
            statRow('Total VP Gained', (
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem', color: '#c9a030' }}>
                {totalVP.toLocaleString()} VP
              </span>
            ), true),
          ]
          return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
              <div style={{ borderRight: '1px solid var(--bd-panel)' }}>{left}</div>
              <div>{right}</div>
            </div>
          )
        })()}
      </div>

      {/* Panel 2: Per-game records grid */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '6px', padding: '14px 16px', marginBottom: '32px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: '12px' }}>
          Highest In a Single Game
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: 'repeat(3, auto)', gridAutoFlow: 'column', gap: '8px' }}>
          {([
            { label: 'Highest Score',       record: bestScore,    color: '#c9a030', bg: 'rgba(201,160,48,0.12)',  border: 'rgba(201,160,48,0.4)',  fmt: (v: number) => `${v} VP`  },
            { label: 'Biggest Win',         record: biggestWin,   color: '#c9a030', bg: 'rgba(201,160,48,0.12)',  border: 'rgba(201,160,48,0.4)',  fmt: (v: number) => `+${v} VP` },
            { label: 'Terraforming Rating', record: bestTR,       color: '#e05535', bg: 'rgba(224,85,53,0.12)',   border: 'rgba(224,85,53,0.4)',   fmt: (v: number) => `${v} TR`  },
            { label: 'Greenery VP',         record: bestGreenery, color: '#4a9e6b', bg: 'rgba(74,158,107,0.12)',  border: 'rgba(74,158,107,0.4)',  fmt: (v: number) => `${v} VP`  },
            { label: 'City VP',             record: bestCity,     color: '#b0b0c4', bg: 'rgba(176,176,196,0.12)', border: 'rgba(176,176,196,0.4)', fmt: (v: number) => `${v} VP`  },
            { label: 'Card VP',             record: bestCardVP,   color: '#b07840', bg: 'rgba(176,120,64,0.12)',  border: 'rgba(176,120,64,0.4)',  fmt: (v: number) => `${v} VP`  },
            { label: 'Habitat VP',          record: bestHabitat,  color: '#2ec4b6', bg: 'rgba(46,196,182,0.12)',  border: 'rgba(46,196,182,0.4)',  fmt: (v: number) => `${v} VP`  },
            { label: 'Mining VP',           record: bestMining,   color: '#7a4820', bg: 'rgba(122,72,32,0.12)',   border: 'rgba(122,72,32,0.4)',   fmt: (v: number) => `${v} VP`  },
            { label: 'Logistics VP',        record: bestLogistics, color: '#8080a0', bg: 'rgba(128,128,160,0.12)', border: 'rgba(128,128,160,0.4)', fmt: (v: number) => `${v} VP`  },
          ] as const).map(({ label, record, color, bg, border, fmt }) => {
            const badge = record
              ? record.gameNumber != null
                ? <Link to={`/games/${record.gameNumber}`} style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color, background: bg, border: `1px solid ${border}`, borderRadius: '4px', padding: '3px 10px', textDecoration: 'none', whiteSpace: 'nowrap' as const }}>{fmt(record.value)}</Link>
                : <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color, background: bg, border: `1px solid ${border}`, borderRadius: '4px', padding: '3px 10px', whiteSpace: 'nowrap' as const }}>{fmt(record.value)}</span>
              : <span style={{ color: 'var(--text-5)' }}>—</span>
            return (
              <div key={label} style={{ background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '6px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)' }}>{label}</span>
                {badge}
              </div>
            )
          })}
        </div>
      </div>

      {/* Score trend chart */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '6px', padding: '20px 24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.82rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-4)' }}>Score trend</span>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {['All', ...chartYears].map(y => (
              <button key={y} onClick={() => setChartYear(y)} style={{ padding: '2px 9px', borderRadius: '10px', border: `1px solid ${chartYear === y ? '#5b8dd9' : 'var(--bd-panel)'}`, background: chartYear === y ? 'rgba(91,141,217,0.12)' : 'transparent', color: chartYear === y ? '#5b8dd9' : 'var(--text-4)', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', cursor: 'pointer', transition: 'all 0.12s' }}>
                {y}
              </button>
            ))}
          </div>
        </div>
        {(() => {
          const N = chartData.length
          const monthLabels = (leftMargin: number, rightMargin: number) => monthGroups.length > 0 ? (
            <div style={{ position: 'relative', height: '28px', marginLeft: `${leftMargin}px`, marginRight: `${rightMargin}px` }}>
              {monthGroups.map((g, i) => {
                const firstIdx = chartData.findIndex(d => d.fullDate === g.firstDate)
                const nextFirstIdx = i < monthGroups.length - 1 ? chartData.findIndex(d => d.fullDate === monthGroups[i + 1].firstDate) : N
                const leftPct = firstIdx / N * 100
                const nextPct = nextFirstIdx / N * 100
                const midPct = (leftPct + nextPct) / 2
                return (
                  <div key={g.key}>
                    <div style={{ position: 'absolute', left: `${leftPct}%`, top: 0, width: '1px', height: '12px', background: '#5b8dd9' }} />
                    <div style={{ position: 'absolute', left: `${midPct}%`, top: '14px', transform: 'translateX(-50%)', fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 600, color: '#5b8dd9', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                      {g.label.toUpperCase()}
                    </div>
                  </div>
                )
              })}
              <div style={{ position: 'absolute', right: 0, top: 0, width: '1px', height: '12px', background: '#5b8dd9' }} />
            </div>
          ) : null
          return isMobile ? (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
              <div style={{ width: Math.max(N * 22, 300) }}>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis dataKey="fullDate" tick={false} axisLine={false} tickLine={false} height={1} />
                      <YAxis domain={['auto', 'auto']} tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-4)' }} axisLine={false} tickLine={false} width={26} />
                      <Tooltip labelFormatter={(d: any) => d} contentStyle={{ background: 'var(--bg-input)', border: '1px solid var(--bd-secondary)', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-1)' }} cursor={{ stroke: 'rgba(255,255,255,0.06)' }} />
                      <ReferenceLine y={chartAvg} stroke="var(--bd-secondary)" strokeDasharray="4 3" />
                      <Line type="monotone" dataKey="score" stroke="var(--text-4)" strokeWidth={1.5}
                        dot={(props: any) => {
                          const { cx, cy, payload } = props
                          return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={payload?.win ? '#e05535' : 'var(--bd-secondary)'} stroke="var(--bg-input)" strokeWidth={1.5} />
                        }}
                        activeDot={{ r: 5, fill: '#b87aff', stroke: 'var(--bg-input)', strokeWidth: 1.5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {monthLabels(31, 4)}
              </div>
            </div>
          ) : (
            <>
              <div className="player-score-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="fullDate" tick={false} axisLine={false} tickLine={false} height={1} />
                    <YAxis domain={[0, 'auto']} tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-4)' }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip
                      labelFormatter={(d: any) => d}
                      contentStyle={{ background: 'var(--bg-input)', border: '1px solid var(--bd-secondary)', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-1)' }}
                      cursor={{ stroke: 'rgba(255,255,255,0.06)' }}
                    />
                    <ReferenceLine y={chartAvg} stroke="var(--bd-secondary)" strokeDasharray="4 3" label={{ value: 'avg', position: 'insideTopRight', fontSize: 9, fill: 'var(--text-4)', fontFamily: 'var(--font-mono)' }} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#888888"
                      strokeWidth={1.5}
                      dot={(props: any) => {
                        const { cx, cy, payload } = props
                        return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={5} fill={payload?.win ? '#e05535' : 'var(--bd-secondary)'} stroke="var(--bg-input)" strokeWidth={1.5} />
                      }}
                      activeDot={{ r: 6, fill: '#b87aff', stroke: 'var(--bg-input)', strokeWidth: 1.5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {monthLabels(37, 5)}
            </>
          )
        })()}
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--text-4)' }}>
          <span><span style={{ color: '#e05535' }}>●</span> Win</span>
          <span><span style={{ color: 'var(--bd-secondary)' }}>●</span> Other finish</span>
        </div>
      </div>

      {/* Head-to-head */}
      {(() => {
        // Build per-opponent records from shared games
        const records: Record<string, { games: number; wins: number; losses: number; draws: number; scoreDiffs: number[] }> = {}
        for (const game of playerGames) {
          const myResult = game.player_results.find(r => r.player_name === name)!
          for (const opp of game.player_results) {
            if (opp.player_name === name) continue
            if (!records[opp.player_name]) records[opp.player_name] = { games: 0, wins: 0, losses: 0, draws: 0, scoreDiffs: [] }
            records[opp.player_name].games++
            if (myResult.position === 1 && opp.position === 1) {
              // tied on VP — tiebreaker is MegaCredits
              const myMC = myResult.mc ?? 0
              const oppMC = opp.mc ?? 0
              if (myMC > oppMC) records[opp.player_name].wins++
              else if (oppMC > myMC) records[opp.player_name].losses++
              else records[opp.player_name].draws++
            } else if (myResult.position === 1) {
              records[opp.player_name].wins++
            } else if (opp.position === 1) {
              records[opp.player_name].losses++
            }
            records[opp.player_name].scoreDiffs.push(myResult.total_vp - opp.total_vp)
          }
        }

        const opponents = Object.entries(records).sort((a, b) => b[1].games - a[1].games)
        if (opponents.length === 0) return null

        return (
          <div style={{ marginBottom: '28px' }}>
            <SectionHeading>Head-to-head</SectionHeading>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
              {opponents.map(([opp, rec]) => {
                const avgDiff = rec.scoreDiffs.reduce((s, v) => s + v, 0) / rec.scoreDiffs.length
                const winRate = (rec.wins / rec.games) * 100
                return (
                  <div key={opp} style={{ background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '6px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <Link to={`/players/${encodeURIComponent(opp)}`} style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.87rem', color: 'var(--text-1)', textDecoration: 'none' }}>
                        {opp}
                      </Link>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#5b8dd9' }}>
                        {rec.games} Games
                      </span>
                    </div>
                    {/* W / L bar */}
                    <div style={{ display: 'flex', height: '4px', borderRadius: '2px', overflow: 'hidden', marginBottom: '10px', background: 'var(--bd-panel)' }}>
                      {rec.wins > 0 && (
                        <div style={{ width: `${winRate}%`, background: '#4a9e6b', transition: 'width 0.3s' }} />
                      )}
                      {rec.draws > 0 && (
                        <div style={{ width: `${(rec.draws / rec.games) * 100}%`, background: '#707070', transition: 'width 0.3s' }} />
                      )}
                      {rec.losses > 0 && (
                        <div style={{ width: `${(rec.losses / rec.games) * 100}%`, background: '#e05535', transition: 'width 0.3s' }} />
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#4a9e6b' }}>{rec.wins}W</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#e05535' }}>{rec.losses}L</span>
                        {rec.draws > 0 && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-4)' }}>{rec.draws}D</span>
                        )}
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: avgDiff > 0 ? '#4a9e6b' : avgDiff < 0 ? '#e05535' : '#707070' }}>
                        {avgDiff > 0 ? '+' : ''}{Math.round(avgDiff)} VP avg
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Corporations played */}
      {(() => {
        type CorpRow = { corp: string; times_played: number; wins: number; win_rate: number; avg_score: number }
        const map: Record<string, { times: number; wins: number; scores: number[] }> = {}
        for (const game of playerGames) {
          const result = game.player_results.find(r => r.player_name === name)!
          for (const corp of getCorps(result)) {
            if (!map[corp]) map[corp] = { times: 0, wins: 0, scores: [] }
            map[corp].times++
            map[corp].scores.push(result.total_vp)
            if (result.position === 1) map[corp].wins++
          }
        }
        const allCorpRows: CorpRow[] = Object.entries(map)
          .map(([corp, { times, wins, scores }]) => ({
            corp,
            times_played: times,
            wins,
            win_rate: (wins / times) * 100,
            avg_score: scores.reduce((s, v) => s + v, 0) / scores.length,
          }))
          .sort((a, b) => b.times_played - a.times_played)
        const corpRows = allCorpRows.slice(0, 5)
        if (corpRows.length === 0) return null

        const corpColumns: DataTableColumn<CorpRow>[] = [
          {
            key: 'corp',
            label: 'Corporation',
            tdStyle: { fontFamily: 'var(--font-body)', fontSize: '0.83rem' },
            render: r => (
              <Link to={`/corporations/${encodeURIComponent(r.corp)}`} style={{ color: '#b87aff', textDecoration: 'none' }}>
                {r.corp}
              </Link>
            ),
          },
          { key: 'times_played', label: 'Played', align: 'center', tdStyle: { fontSize: '0.82rem' } },
          {
            key: 'wins',
            label: 'Wins',
            align: 'center',
            tdStyle: { fontSize: '0.82rem' },
            render: r => <span style={{ color: '#4a9e6b' }}>{r.wins}</span>,
          },
          {
            key: 'win_rate',
            label: 'Win Rate',
            align: 'center',
            tdStyle: { fontSize: '0.82rem' },
            render: r => (
              <span style={{ color: r.win_rate >= 60 ? '#4a9e6b' : r.win_rate >= 40 ? '#c9a030' : '#e05535' }}>
                {Math.round(r.win_rate)}%
              </span>
            ),
          },
          {
            key: 'avg_score',
            label: 'Avg Score',
            align: 'center',
            tdStyle: { fontSize: '0.82rem' },
            render: r => <span style={{ color: '#c9a030' }}>{Math.round(r.avg_score)} VP</span>,
          },
        ]

        return (
          <div style={{ marginBottom: '28px' }}>
            <SectionHeading>Corporations Played</SectionHeading>
            <DataTable compact columns={corpColumns} rows={corpRows} rowKey={r => r.corp} />
            {allCorpRows.length > 5 && (
              <div style={{ marginTop: '8px' }}>
                <button
                  onClick={() => setAllCorpsOpen(o => !o)}
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: 'rgba(184,122,255,0.06)', border: '1px solid rgba(184,122,255,0.2)', borderRadius: allCorpsOpen ? '6px 6px 0 0' : '6px', cursor: 'pointer' }}
                >
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#b87aff' }}>All corporations · {allCorpRows.length}</span>
                  <span style={{ fontSize: '0.7rem', color: '#b87aff', transform: allCorpsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
                </button>
                {allCorpsOpen && (
                  <div style={{ border: '1px solid rgba(184,122,255,0.2)', borderTop: 'none', borderRadius: '0 0 6px 6px', overflow: 'hidden' }}>
                    <DataTable compact columns={corpColumns} rows={allCorpRows} rowKey={r => r.corp} />
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })()}

      {/* Cards played */}
      {playerCards.length > 0 && (() => {
        const top10 = [...playerCards].sort((a, b) => b.times_played - a.times_played).slice(0, 10)
        const sections: { label: string; color: string; bg: string; border: string; types: string[] }[] = [
          { label: 'Prelude cards',    color: '#d9689a', bg: 'rgba(217,104,154,0.08)', border: 'rgba(217,104,154,0.3)', types: ['Prelude'] },
          { label: 'Automated cards',  color: '#4a9e6b', bg: 'rgba(74,158,107,0.08)',  border: 'rgba(74,158,107,0.3)',  types: ['Automated'] },
          { label: 'Active cards',     color: '#5b8dd9', bg: 'rgba(91,141,217,0.08)',  border: 'rgba(91,141,217,0.3)',  types: ['Active'] },
          { label: 'Event cards',      color: '#e05535', bg: 'rgba(224,85,53,0.08)',   border: 'rgba(224,85,53,0.3)',   types: ['Event'] },
        ]
        const toggleSection = (label: string) =>
          setCollapsedCardSections(prev => { const s = new Set(prev); s.has(label) ? s.delete(label) : s.add(label); return s })
        return (
          <div style={{ marginBottom: '28px' }}>
            <SectionHeading>Cards played · {playerCards.length} unique</SectionHeading>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

              {/* Top 10 across all types */}
              <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '6px', padding: '10px 14px', marginBottom: '4px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px' }}>
                  Top 10 Most Played
                </div>
                <DataTable compact columns={cardColumns} rows={sortCards(top10)} rowKey={c => c.card_name} sortKey={cardSortKey} sortDir={cardSortDir} onSort={handleCardSort} />
              </div>

              {/* Colour sections — collapsed by default */}
              {sections.map(({ label, color, bg, border, types }) => {
                const rows = playerCards.filter(c => {
                  const canonical = CARD_NAME_CORRECTIONS[c.card_name] ?? c.card_name
                  return types.includes(cardRefMap[canonical]?.card_type ?? '')
                }).sort((a, b) => b.times_played - a.times_played)
                if (rows.length === 0) return null
                const collapsed = collapsedCardSections.has(label)
                return (
                  <div key={label}>
                    <button
                      onClick={() => toggleSection(label)}
                      style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: bg, border: `1px solid ${border}`, borderRadius: collapsed ? '6px' : '6px 6px 0 0', cursor: 'pointer' }}
                    >
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color }}>{label} · {rows.length}</span>
                      <span style={{ fontSize: '0.7rem', color, transform: collapsed ? 'none' : 'rotate(180deg)', transition: 'transform 0.15s' }}>▼</span>
                    </button>
                    {!collapsed && (
                      <div style={{ border: `1px solid ${border}`, borderTop: 'none', borderRadius: '0 0 6px 6px', overflow: 'hidden' }}>
                        <DataTable compact columns={cardColumns} rows={sortCards(rows)} rowKey={c => c.card_name} sortKey={cardSortKey} sortDir={cardSortDir} onSort={handleCardSort} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Favourites */}
      {(topTags.length > 0 || topCorpTags.length > 0 || topPreludeTags.length > 0 || topCardTypes.length > 0) && (
        <div style={{ marginBottom: '28px' }}>
          <SectionHeading>Favourites</SectionHeading>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '6px', overflow: 'hidden' }}>

            {/* Toggle — left aligned */}
            <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--bd-panel)', display: 'flex', gap: '4px' }}>
              {([['Official-Cards', true], ['Unofficial-Fan-Cards', false]] as const).map(([label, val]) => {
                const active = officialOnly === val
                return (
                  <button key={label} onClick={() => setOfficialOnly(val)} style={{ padding: '3px 10px', borderRadius: '4px', border: `1px solid ${active ? '#5b8dd9' : 'var(--bd-secondary)'}`, background: active ? 'rgba(91,141,217,0.12)' : 'transparent', color: active ? '#5b8dd9' : 'var(--text-4)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.12s' }}>
                    {label}
                  </button>
                )
              })}
            </div>

            {/* Tags on Project Cards — full width, 5 per column */}
            {topTags.length > 0 && (
              <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)' }}>Tags on Project Cards</div>
                <div style={{ display: 'flex', gap: '0', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {Array.from({ length: Math.ceil(topTags.length / 5) }, (_, col) => (
                    <div key={col} style={{ display: 'flex', alignItems: 'stretch' }}>
                      {col > 0 && <div style={{ width: '1px', background: 'var(--bd-panel)', margin: '0 31px', alignSelf: 'stretch' }} />}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '165px' }}>
                        {topTags.slice(col * 5, col * 5 + 5).map(({ tag, plays, affinity }, i) => {
                          const rank = col * 5 + i + 1
                          return (
                            <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-5)', minWidth: '18px', textAlign: 'right' }}>{rank}.</span>
                              <Tag name={tag} />
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-2)' }}>{affinity.toFixed(2)}×</span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-5)' }}>({plays})</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Corporations + Preludes row */}
            {(topCorpTags.length > 0 || topPreludeTags.length > 0) && (
              <div style={{ borderTop: '1px solid var(--bd-panel)', padding: '10px 16px', display: 'flex', gap: '0', alignItems: 'stretch' }}>
                {topCorpTags.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '165px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)' }}>Corporations</div>
                    {topCorpTags.map(({ tag, plays, affinity }, i) => (
                      <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-5)', minWidth: '18px', textAlign: 'right' }}>{i + 1}.</span>
                        <Tag name={tag} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-2)' }}>{affinity.toFixed(2)}×</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-5)' }}>({plays})</span>
                      </div>
                    ))}
                  </div>
                )}
                {topPreludeTags.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'stretch', flexShrink: 0 }}>
                    {topCorpTags.length > 0 && <div style={{ width: '1px', background: 'var(--bd-panel)', margin: '0 31px', alignSelf: 'stretch' }} />}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)' }}>Preludes</div>
                      {topPreludeTags.map(({ tag, plays, affinity }, i) => (
                        <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-5)', minWidth: '18px', textAlign: 'right' }}>{i + 1}.</span>
                          <Tag name={tag} />
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-2)' }}>{affinity.toFixed(2)}×</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-5)' }}>({plays})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Card Type — vertical list */}
            {topCardTypes.length > 0 && (
              <div style={{ borderTop: '1px solid var(--bd-panel)', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)' }}>Card Type</div>
                {topCardTypes.map(({ type, plays, affinity }, i) => (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-5)', minWidth: '18px', textAlign: 'right' }}>{i + 1}.</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 600, color: TYPE_COLORS[type]?.color, minWidth: '80px' }}>{type}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-2)' }}>{affinity.toFixed(2)}×</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-5)' }}>({plays})</span>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div style={{ borderTop: '1px solid var(--bd-panel)', padding: '8px 16px' }}>
              <span style={{ fontFamily: 'var(--font-body)', color: 'var(--text-5)', fontStyle: 'italic', lineHeight: 1.6, fontSize: '0.78rem' }}>
                All sections are ranked by affinity. How much more often you play a tag or type compared to its share of the relevant card pool. Tags and Card Type are calculated from project cards (Automated, Active, Event) only. Corporations and Preludes each use their own separate pools. Toggle to exclude fan-expansion cards (Ares, CEO, The Moon, Pathfinders).<br /><br />For example, if 10% of all project cards have the Jovian tag but 25% of your plays involve Jovian cards, your affinity is 2.50×. Likewise, if Automated cards make up 40% of the pool but 60% of your plays are Automated, your affinity is 1.50×. A score above 1.0× indicates a genuine preference beyond what random card selection would produce.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Games played */}
      <div>
        <SectionHeading>Game history</SectionHeading>
        {(() => {
          const byYear = gameRows.reduce<Record<string, GameRow[]>>((acc, row) => {
            const y = row.date.slice(0, 4)
            ;(acc[y] ??= []).push(row)
            return acc
          }, {})
          const years = Object.keys(byYear).sort((a, b) => b.localeCompare(a))
          return years.map(year => {
            const open = openYears.has(year)
            return (
              <div key={year} style={{ marginBottom: '8px' }}>
                <button
                  onClick={() => setOpenYears(prev => { const s = new Set(prev); s.has(year) ? s.delete(year) : s.add(year); return s })}
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: open ? '6px 6px 0 0' : '6px', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.82rem', letterSpacing: '0.08em', color: 'var(--text-3)' }}
                >
                  <span>{year}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-5)', fontWeight: 400 }}>{byYear[year].length} games</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-5)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
                  </span>
                </button>
                {open && (
                  <div style={{ border: '1px solid var(--bd-panel)', borderTop: 'none', borderRadius: '0 0 6px 6px', overflow: 'hidden' }}>
                    <DataTable
                      compact
                      columns={gameHistoryColumns}
                      rows={byYear[year]}
                      rowKey={r => r.id}
                    />
                  </div>
                )}
              </div>
            )
          })
        })()}
      </div>
    </div>
  )
}

const loadingStyle: React.CSSProperties = {
  padding: '32px 36px',
  color: 'var(--text-4)',
  fontFamily: 'var(--font-body)',
}
