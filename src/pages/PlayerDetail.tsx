import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import { SkeletonHeader, SkeletonStatGrid, SkeletonTable } from '../components/ui/PageSkeleton'
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
import { cn } from '@/lib/utils'

const COLOR_NAMES: Record<string, string> = {
  '#c62828': 'Red', '#2e7d32': 'Green', '#1565c0': 'Blue', '#f9a825': 'Yellow',
  '#37474f': 'Black', '#e0e0e0': 'White', '#d84315': 'Orange', '#ad1457': 'Pink',
  '#6a1b9a': 'Purple', '#78909c': 'Silver',
}

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

  if (gamesLoading || statsLoading) return (
    <div className="page-enter py-8 px-9">
      <SkeletonHeader />
      <SkeletonStatGrid count={6} />
      <SkeletonTable rows={8} cols={5} />
    </div>
  )

  const stats = (playerStats ?? []).find(p => p.player_name === name)
  const profile = profiles.find(p => p.player_name === name)
  const playerGames = (games ?? [])
    .filter(g => g.player_results.some(r => r.player_name === name))
    .sort((a, b) => b.date.localeCompare(a.date))

  if (!stats) {
    return (
      <div className="py-8 px-9 font-body text-[var(--text-4)]">
        Player not found. <Link to="/players" className="text-mars-500">Back</Link>
      </div>
    )
  }

  const myResults = playerGames.map(g => g.player_results.find(r => r.player_name === name)!)
  const totalVP = myResults.reduce((sum, r) => sum + r.total_vp, 0)

  let longestStreak = 0, tempStreak = 0
  for (let i = myResults.length - 1; i >= 0; i--) {
    if (myResults[i].position === 1) { tempStreak++; if (tempStreak > longestStreak) longestStreak = tempStreak }
    else tempStreak = 0
  }
  let currentStreak = 0
  for (const r of myResults) { if (r.position === 1) currentStreak++; else break }

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

  const bestScore     = findBest(r => r.total_vp)
  const bestTR        = findBest(r => r.tr)
  const bestGreenery  = findBest(r => r.greenery_vp)
  const bestCity      = findBest(r => r.city_vp)
  const bestCardVP    = findBest(r => r.card_vp)
  const bestHabitat   = findBest(r => r.habitat_vp)
  const bestMining    = findBest(r => r.mining_vp)
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
      render: c => {
        const canonical = CARD_NAME_CORRECTIONS[c.card_name] ?? c.card_name
        return (
          <Link to={`/cards/${encodeURIComponent(canonical)}`} className="font-body text-[0.83rem] text-foreground no-underline hover:text-mars-400 transition-colors">
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
        return <span className={base_vp != null ? 'text-score-400' : 'text-[var(--text-5)]'}>{base_vp ?? '/'}</span>
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
        if (wr == null) return <span className="text-[var(--text-5)]">—</span>
        return <span className={wr >= 50 ? 'text-win-500' : wr > 33 ? 'text-score-400' : 'text-mars-500'}>{Math.round(wr)}%</span>
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
        if (tags.length === 0) return <span className="text-[var(--text-5)]">—</span>
        return (
          <span className="inline-flex gap-[3px] flex-wrap justify-center">
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
        if (exps.length === 0) return <span className="text-[var(--text-5)]">—</span>
        return (
          <span className="inline-flex gap-[3px] flex-wrap justify-center">
            {exps.map(exp => EXPANSION_ICONS[exp]
              ? <img key={exp} src={EXPANSION_ICONS[exp]} alt={exp} title={exp} className="w-4 h-4 object-contain" />
              : <span key={exp} className="font-mono text-[0.55rem] text-[var(--text-4)]">{exp.slice(0, 3).toUpperCase()}</span>
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
        <Link to={`/games/${r.game_number}`} className="font-mono text-[0.78rem] text-[var(--text-3)] no-underline">
          {new Date(r.date).toLocaleDateString('sv-SE')}
        </Link>
      ) : <>{new Date(r.date).toLocaleDateString('sv-SE')}</>,
    },
    {
      key: 'map_name',
      label: 'Map',
      tdStyle: { fontFamily: 'var(--font-body)', fontSize: '0.83rem' },
      render: r => <>{r.map_name ?? '—'}</>,
    },
    {
      key: 'corporations',
      label: 'Corporation',
      tdStyle: { fontFamily: 'var(--font-body)', fontSize: '0.8rem' },
      render: r => (
        <span className="inline-flex flex-wrap gap-1 items-center">
          {r.corporations.map((corp, i) => (
            <span key={corp} className="inline-flex items-center gap-1">
              {i > 0 && <span className="text-[var(--text-5)] text-[0.7rem]">+</span>}
              <Link to={`/corporations/${encodeURIComponent(corp)}`} className="text-violet-400 no-underline hover:text-violet-300 transition-colors">{corp}</Link>
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
        <span className={r.position === 1 ? 'text-score-400' : 'text-[var(--text-3)]'}>
          {r.total_vp}<span className="ml-[3px]">VP</span>
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
    <div className="page-enter py-8 px-9">
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="bg-transparent border-none text-[var(--text-4)] cursor-pointer font-body text-[0.78rem] p-0 hover:text-muted-foreground transition-colors">
          ← Back
        </button>
      </div>

      <PageHeader
        title={
          profile?.preferred_color
            ? <span className="inline-flex items-center gap-2.5">
                <span className="w-3.5 h-3.5 rounded-full shrink-0 inline-block border border-white/15" style={{ background: profile.preferred_color }} />
                {name}
              </span>
            : name!
        }
        subtitle={`${stats.games_played} games played`}
      />

      {profile && (profile.preferred_color || profile.playing_style || profile.rival || profile.favorite_card || profile.most_tilting_card || profile.favorite_corporation || profile.trivia) && (() => {
        const labelEl = (text: string) => (
          <div className="font-mono text-[0.72rem] tracking-[0.08em] uppercase text-[var(--text-4)] mb-[5px]">{text}</div>
        )
        const rankedList = (items: (string | null | undefined)[], render: (v: string, i: number) => React.ReactNode) => (
          <div className="flex flex-col gap-1">
            {items.filter(Boolean).map((v, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="font-mono text-[0.72rem] text-[var(--text-5)] min-w-[12px]">{i + 1}.</span>
                {render(v!, i)}
              </div>
            ))}
          </div>
        )
        return (
          <>
            <SectionHeading>Profile</SectionHeading>
            <div className="bg-card border border-border rounded-[6px] px-5 py-4 mb-6 inline-block min-w-0">
              <div className={cn('flex flex-wrap gap-6', (profile.playing_style || profile.rival || profile.trivia) && 'mb-4')}>
                {(profile.preferred_color || profile.preferred_color_2 || profile.preferred_color_3) && (
                  <div>
                    {labelEl('Preferred Colors')}
                    {rankedList([profile.preferred_color, profile.preferred_color_2, profile.preferred_color_3], (col) => (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full shrink-0 border border-white/15" style={{ background: col }} />
                        <span className="font-body text-[0.83rem] text-secondary-foreground">{COLOR_NAMES[col] ?? col}</span>
                      </span>
                    ))}
                  </div>
                )}
                {profile.favorite_card && (
                  <div>
                    {labelEl('Favorite Cards')}
                    {rankedList([profile.favorite_card, profile.favorite_card_2, profile.favorite_card_3], (card) => (
                      <Link to={`/cards/${encodeURIComponent(card)}`} className="font-body text-[0.83rem] text-violet-400 no-underline hover:text-violet-300 transition-colors">{card}</Link>
                    ))}
                  </div>
                )}
                {profile.most_tilting_card && (
                  <div>
                    {labelEl('Most Frustrating Cards')}
                    {rankedList([profile.most_tilting_card, profile.most_tilting_card_2, profile.most_tilting_card_3], (card) => (
                      <Link to={`/cards/${encodeURIComponent(card)}`} className="font-body text-[0.83rem] text-secondary-foreground no-underline">{card}</Link>
                    ))}
                  </div>
                )}
                {profile.favorite_corporation && (
                  <div>
                    {labelEl('Favorite Corporations')}
                    {rankedList([profile.favorite_corporation, profile.favorite_corporation_2, profile.favorite_corporation_3], (corp) => (
                      <Link to={`/cards/${encodeURIComponent(corp)}`} className="font-body text-[0.83rem] text-score-400 no-underline hover:text-score-300 transition-colors">{corp}</Link>
                    ))}
                  </div>
                )}
              </div>
              {(profile.playing_style || profile.rival || profile.trivia) && (
                <div className="flex flex-wrap gap-5 pt-3.5 border-t border-border items-baseline">
                  {profile.playing_style && (
                    <div>
                      {labelEl('Style')}
                      <div className="font-body text-[0.83rem] text-secondary-foreground">{profile.playing_style}</div>
                    </div>
                  )}
                  {profile.rival && (
                    <div>
                      {labelEl('Rival')}
                      <div className="font-body text-[0.83rem]">
                        <Link to={`/players/${encodeURIComponent(profile.rival)}`} className="text-mars-500 no-underline hover:text-mars-400 transition-colors">{profile.rival}</Link>
                      </div>
                    </div>
                  )}
                  {profile.trivia && (
                    <div>
                      {labelEl('Trivia')}
                      <div className="font-body text-[0.83rem] text-secondary-foreground">{profile.trivia}</div>
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
      <div className="bg-card border border-border rounded-[6px] mb-4">
        {(() => {
          const statLabel = (text: string) => (
            <span className="font-mono text-[0.68rem] tracking-[0.08em] uppercase text-[var(--text-4)]">{text}</span>
          )
          const statRow = (label: string, node: React.ReactNode, last: boolean) => (
            <div key={label} className={cn('flex justify-between items-center px-4 py-2.5', !last && 'border-b border-border')}>
              {statLabel(label)}
              {node}
            </div>
          )
          const wrColor = (wr: number) => wr >= 60 ? 'text-win-500' : wr >= 40 ? 'text-score-400' : 'text-mars-500'
          const left = [
            statRow('Wins', (
              <span className="font-mono text-[0.9rem] font-bold text-[var(--text-3)]">
                {stats.wins} wins of {stats.games_played} games
              </span>
            ), false),
            statRow('Overall Win Rate', (
              <span className={cn('font-mono font-bold text-[0.95rem]', wrColor(stats.win_rate))}>
                {Math.round(stats.win_rate)}%
              </span>
            ), false),
            statRow('Win Rate by Player Count', (
              <span className="inline-flex gap-3.5 font-mono text-[0.82rem]">
                {Object.entries(winRateByCount).sort(([a], [b]) => Number(a) - Number(b)).map(([count, { wins, games }]) => {
                  const wr = wins / games * 100
                  return (
                    <span key={count}>
                      <span className="font-bold text-[#5b8dd9]">{count}P </span>
                      <span className={cn('font-bold', wrColor(wr))}>{Math.round(wr)}%</span>
                      <span className="text-[0.75rem] text-[var(--text-3)]"> (<span className={wrColor(wr)}>{wins}</span>/{games})</span>
                    </span>
                  )
                })}
              </span>
            ), true),
          ]
          const right = [
            statRow('Win Streak', (
              <span className="font-mono text-[0.85rem]">
                <span className="font-bold text-score-400">{longestStreak} games in a row</span>
                {currentStreak > 0 && <>
                  <span className="text-[var(--text-5)] mx-2">·</span>
                  <span className="font-bold text-win-500">Current {currentStreak} in a row</span>
                </>}
              </span>
            ), false),
            statRow('Average Score Per Game', (
              <span className="font-mono font-bold text-[0.95rem] text-score-400">
                {Math.round(stats.avg_score)} VP
              </span>
            ), false),
            statRow('Total VP Gained', (
              <span className="font-mono font-bold text-[0.95rem] text-score-400">
                {totalVP.toLocaleString()} VP
              </span>
            ), true),
          ]
          return (
            <div className="grid grid-cols-2">
              <div className="border-r border-border">{left}</div>
              <div>{right}</div>
            </div>
          )
        })()}
      </div>

      {/* Panel 2: Per-game records grid */}
      <div className="bg-card border border-border rounded-[6px] px-4 py-3.5 mb-8">
        <div className="font-display font-semibold text-[0.72rem] tracking-[0.1em] uppercase text-[var(--text-4)] mb-3">
          Highest In a Single Game
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: 'repeat(3, auto)', gridAutoFlow: 'column' }}>
          {([
            { label: 'Highest Score',       record: bestScore,    color: '#e8c84a', bg: 'rgba(232,200,74,0.28)',  border: 'rgba(232,200,74,0.60)',  fmt: (v: number) => `${v} VP`  },
            { label: 'Biggest Win',         record: biggestWin,   color: '#e8c84a', bg: 'rgba(232,200,74,0.28)',  border: 'rgba(232,200,74,0.60)',  fmt: (v: number) => `+${v} VP` },
            { label: 'Terraforming Rating', record: bestTR,       color: '#ff7a60', bg: 'rgba(255,122,96,0.28)',  border: 'rgba(255,122,96,0.60)',  fmt: (v: number) => `${v} TR`  },
            { label: 'Greenery VP',         record: bestGreenery, color: '#e8c84a', bg: 'rgba(232,200,74,0.28)',  border: 'rgba(232,200,74,0.60)',  fmt: (v: number) => `${v} VP`  },
            { label: 'City VP',             record: bestCity,     color: '#e8c84a', bg: 'rgba(232,200,74,0.28)',  border: 'rgba(232,200,74,0.60)',  fmt: (v: number) => `${v} VP`  },
            { label: 'Card VP',             record: bestCardVP,   color: '#e8c84a', bg: 'rgba(232,200,74,0.28)',  border: 'rgba(232,200,74,0.60)',  fmt: (v: number) => `${v} VP`  },
            { label: 'Habitat VP',          record: bestHabitat,  color: '#e8c84a', bg: 'rgba(232,200,74,0.28)',  border: 'rgba(232,200,74,0.60)',  fmt: (v: number) => `${v} VP`  },
            { label: 'Mining VP',           record: bestMining,   color: '#e8c84a', bg: 'rgba(232,200,74,0.28)',  border: 'rgba(232,200,74,0.60)',  fmt: (v: number) => `${v} VP`  },
            { label: 'Logistics VP',        record: bestLogistics, color: '#e8c84a', bg: 'rgba(232,200,74,0.28)',  border: 'rgba(232,200,74,0.60)',  fmt: (v: number) => `${v} VP`  },
          ] as const).map(({ label, record, color, bg, border, fmt }) => {
            const badge = record
              ? record.gameNumber != null
                ? <Link to={`/games/${record.gameNumber}`} className="font-mono font-bold text-[0.9rem] rounded px-2.5 py-[3px] no-underline min-w-[82px] inline-block text-center" style={{ color, background: bg, border: `1px solid ${border}` }}>{fmt(record.value)}</Link>
                : <span className="font-mono font-bold text-[0.9rem] rounded px-2.5 py-[3px] min-w-[82px] inline-block text-center" style={{ color, background: bg, border: `1px solid ${border}` }}>{fmt(record.value)}</span>
              : <span className="text-[var(--text-5)]">—</span>
            return (
              <div key={label} className="bg-card border border-border rounded-[6px] px-3.5 py-2.5 flex justify-between items-center gap-2">
                <span className="font-mono text-[0.72rem] tracking-[0.08em] uppercase text-[var(--text-4)]">{label}</span>
                {badge}
              </div>
            )
          })}
        </div>
      </div>

      {/* Score trend chart */}
      <div className="bg-card border border-border rounded-[6px] px-6 py-5 mb-7">
        <div className="flex items-center gap-2.5 flex-wrap mb-4">
          <span className="font-display font-semibold text-[0.82rem] tracking-[0.1em] uppercase text-[var(--text-4)]">Score trend</span>
          <div className="flex gap-[5px] flex-wrap">
            {['All', ...chartYears].map(y => (
              <button
                key={y}
                onClick={() => setChartYear(y)}
                className={cn(
                  'px-2.5 py-[2px] rounded-[10px] font-mono text-[0.68rem] cursor-pointer transition-all',
                  chartYear === y
                    ? 'border border-[#5b8dd9] bg-[rgba(91,141,217,0.12)] text-[#5b8dd9]'
                    : 'border border-border bg-transparent text-[var(--text-4)]'
                )}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
        {(() => {
          const N = chartData.length
          const monthLabels = (leftMargin: number, rightMargin: number) => monthGroups.length > 0 ? (
            <div className="relative h-7" style={{ marginLeft: `${leftMargin}px`, marginRight: `${rightMargin}px` }}>
              {monthGroups.map((g, i) => {
                const firstIdx = chartData.findIndex(d => d.fullDate === g.firstDate)
                const nextFirstIdx = i < monthGroups.length - 1 ? chartData.findIndex(d => d.fullDate === monthGroups[i + 1].firstDate) : N
                const leftPct = firstIdx / N * 100
                const nextPct = nextFirstIdx / N * 100
                const midPct = (leftPct + nextPct) / 2
                return (
                  <div key={g.key}>
                    <div className="absolute top-0 w-px h-3 bg-[#5b8dd9]" style={{ left: `${leftPct}%` }} />
                    <div className="absolute top-[14px] font-mono text-[9px] font-semibold text-[#5b8dd9] tracking-[0.06em] whitespace-nowrap -translate-x-1/2" style={{ left: `${midPct}%` }}>
                      {g.label.toUpperCase()}
                    </div>
                  </div>
                )
              })}
              <div className="absolute top-0 right-0 w-px h-3 bg-[#5b8dd9]" />
            </div>
          ) : null
          return isMobile ? (
            <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' as any }}>
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
        <div className="flex gap-4 mt-2.5 font-body text-[0.7rem] text-[var(--text-4)]">
          <span><span className="text-mars-500">●</span> Win</span>
          <span><span className="text-[var(--bd-secondary)]">●</span> Other finish</span>
        </div>
      </div>

      {/* Head-to-head */}
      {(() => {
        const records: Record<string, { games: number; wins: number; losses: number; draws: number; scoreDiffs: number[] }> = {}
        for (const game of playerGames) {
          const myResult = game.player_results.find(r => r.player_name === name)!
          for (const opp of game.player_results) {
            if (opp.player_name === name) continue
            if (!records[opp.player_name]) records[opp.player_name] = { games: 0, wins: 0, losses: 0, draws: 0, scoreDiffs: [] }
            records[opp.player_name].games++
            if (myResult.position === 1 && opp.position === 1) {
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
          <div className="mb-7">
            <SectionHeading>Head-to-head</SectionHeading>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {opponents.map(([opp, rec]) => {
                const avgDiff = rec.scoreDiffs.reduce((s, v) => s + v, 0) / rec.scoreDiffs.length
                const winRate = (rec.wins / rec.games) * 100
                return (
                  <div key={opp} className="bg-card border border-border rounded-[6px] px-4 py-3.5">
                    <div className="flex justify-between items-start mb-2.5">
                      <Link to={`/players/${encodeURIComponent(opp)}`} className="font-body font-semibold text-[0.87rem] text-foreground no-underline hover:text-mars-400 transition-colors">
                        {opp}
                      </Link>
                      <span className="font-mono text-[0.75rem] text-[#5b8dd9]">{rec.games} Games</span>
                    </div>
                    <div className="flex h-1 rounded-full overflow-hidden mb-2.5 bg-border">
                      {rec.wins > 0 && <div className="bg-win-500 transition-[width] duration-300" style={{ width: `${winRate}%` }} />}
                      {rec.draws > 0 && <div className="bg-[#707070] transition-[width] duration-300" style={{ width: `${(rec.draws / rec.games) * 100}%` }} />}
                      {rec.losses > 0 && <div className="bg-mars-500 transition-[width] duration-300" style={{ width: `${(rec.losses / rec.games) * 100}%` }} />}
                    </div>
                    <div className="flex justify-between">
                      <div className="flex gap-2.5">
                        <span className="font-mono text-[0.8rem] text-win-500">{rec.wins}W</span>
                        <span className="font-mono text-[0.8rem] text-mars-500">{rec.losses}L</span>
                        {rec.draws > 0 && <span className="font-mono text-[0.8rem] text-[var(--text-4)]">{rec.draws}D</span>}
                      </div>
                      <span className={cn('font-mono text-[0.75rem]', avgDiff > 0 ? 'text-score-400' : avgDiff < 0 ? 'text-mars-500' : 'text-[#707070]')}>
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
              <Link to={`/corporations/${encodeURIComponent(r.corp)}`} className="text-violet-400 no-underline hover:text-violet-300 transition-colors">
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
            render: r => <span className="text-win-500">{r.wins}</span>,
          },
          {
            key: 'win_rate',
            label: 'Win Rate',
            align: 'center',
            tdStyle: { fontSize: '0.82rem' },
            render: r => (
              <span className={r.win_rate >= 60 ? 'text-win-500' : r.win_rate >= 40 ? 'text-score-400' : 'text-mars-500'}>
                {Math.round(r.win_rate)}%
              </span>
            ),
          },
          {
            key: 'avg_score',
            label: 'Avg Score',
            align: 'center',
            tdStyle: { fontSize: '0.82rem' },
            render: r => <span className="text-score-400">{Math.round(r.avg_score)} VP</span>,
          },
        ]

        return (
          <div className="mb-7">
            <SectionHeading>Corporations Played</SectionHeading>
            <DataTable compact columns={corpColumns} rows={corpRows} rowKey={r => r.corp} />
            {allCorpRows.length > 5 && (
              <div className="mt-2">
                <button
                  onClick={() => setAllCorpsOpen(o => !o)}
                  className={cn(
                    'w-full flex justify-between items-center px-3.5 py-2 bg-violet-400/6 border border-violet-400/20 cursor-pointer transition-colors',
                    allCorpsOpen ? 'rounded-t-[6px]' : 'rounded-[6px]'
                  )}
                >
                  <span className="font-display font-semibold text-[0.72rem] tracking-[0.1em] uppercase text-violet-400">All corporations · {allCorpRows.length}</span>
                  <span className={cn('text-[0.7rem] text-violet-400 transition-transform duration-150', allCorpsOpen && 'rotate-180')}>▼</span>
                </button>
                {allCorpsOpen && (
                  <div className="border border-violet-400/20 border-t-0 rounded-b-[6px] overflow-hidden">
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
          { label: 'Prelude cards',   color: '#d9689a', bg: 'rgba(217,104,154,0.08)', border: 'rgba(217,104,154,0.3)', types: ['Prelude'] },
          { label: 'Automated cards', color: '#4a9e6b', bg: 'rgba(74,158,107,0.08)',  border: 'rgba(74,158,107,0.3)',  types: ['Automated'] },
          { label: 'Active cards',    color: '#5b8dd9', bg: 'rgba(91,141,217,0.08)',  border: 'rgba(91,141,217,0.3)',  types: ['Active'] },
          { label: 'Event cards',     color: '#e05535', bg: 'rgba(224,85,53,0.08)',   border: 'rgba(224,85,53,0.3)',   types: ['Event'] },
        ]
        const toggleSection = (label: string) =>
          setCollapsedCardSections(prev => { const s = new Set(prev); s.has(label) ? s.delete(label) : s.add(label); return s })
        return (
          <div className="mb-7">
            <SectionHeading>Cards played · {playerCards.length} unique</SectionHeading>
            <div className="flex flex-col gap-2">
              <div className="bg-card border border-border rounded-[6px] px-3.5 py-2.5 mb-1">
                <div className="font-display font-semibold text-[0.72rem] tracking-[0.1em] uppercase text-[var(--text-3)] mb-2">
                  Top 10 Most Played
                </div>
                <DataTable compact columns={cardColumns} rows={sortCards(top10)} rowKey={c => c.card_name} sortKey={cardSortKey} sortDir={cardSortDir} onSort={handleCardSort} />
              </div>
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
                      className={cn('w-full flex justify-between items-center px-3.5 py-2 cursor-pointer', collapsed ? 'rounded-[6px]' : 'rounded-t-[6px]')}
                      style={{ background: bg, border: `1px solid ${border}` }}
                    >
                      <span className="font-display font-semibold text-[0.72rem] tracking-[0.1em] uppercase" style={{ color }}>{label} · {rows.length}</span>
                      <span className={cn('text-[0.7rem] transition-transform duration-150', !collapsed && 'rotate-180')} style={{ color }}>▼</span>
                    </button>
                    {!collapsed && (
                      <div className="border-t-0 rounded-b-[6px] overflow-hidden" style={{ border: `1px solid ${border}` }}>
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
        <div className="mb-7">
          <SectionHeading>Favourites</SectionHeading>
          <div className="bg-card border border-border rounded-[6px] overflow-hidden">
            <div className="px-4 py-2 border-b border-border flex gap-1">
              {([['Official-Cards', true], ['Unofficial-Fan-Cards', false]] as const).map(([label, val]) => {
                const active = officialOnly === val
                return (
                  <button
                    key={label}
                    onClick={() => setOfficialOnly(val)}
                    className={cn(
                      'px-2.5 py-[3px] rounded font-mono text-[0.65rem] font-bold cursor-pointer transition-all',
                      active
                        ? 'border border-[#5b8dd9] bg-[rgba(91,141,217,0.12)] text-[#5b8dd9]'
                        : 'border border-border bg-transparent text-[var(--text-4)]'
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            {topTags.length > 0 && (
              <div className="px-4 py-2.5 flex flex-col gap-2.5">
                <div className="font-mono text-[0.72rem] tracking-[0.08em] uppercase text-[var(--text-4)]">Tags on Project Cards</div>
                <div className="flex gap-0 items-start flex-wrap">
                  {Array.from({ length: Math.ceil(topTags.length / 5) }, (_, col) => (
                    <div key={col} className="flex items-stretch">
                      {col > 0 && <div className="w-px bg-border mx-[31px] self-stretch" />}
                      <div className="flex flex-col gap-2.5 min-w-[165px]">
                        {topTags.slice(col * 5, col * 5 + 5).map(({ tag, plays, affinity }, i) => {
                          const rank = col * 5 + i + 1
                          return (
                            <div key={tag} className="flex items-center gap-2.5">
                              <span className="font-mono text-[0.65rem] text-[var(--text-5)] min-w-[18px] text-right">{rank}.</span>
                              <Tag name={tag} />
                              <span className="font-mono font-bold text-[0.82rem] text-secondary-foreground">{affinity.toFixed(2)}×</span>
                              <span className="font-mono text-[0.7rem] text-[var(--text-5)]">({plays})</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(topCorpTags.length > 0 || topPreludeTags.length > 0) && (
              <div className="border-t border-border px-4 py-2.5 flex gap-0 items-stretch">
                {topCorpTags.length > 0 && (
                  <div className="flex flex-col gap-2.5 min-w-[165px]">
                    <div className="font-mono text-[0.72rem] tracking-[0.08em] uppercase text-[var(--text-4)]">Corporations</div>
                    {topCorpTags.map(({ tag, plays, affinity }, i) => (
                      <div key={tag} className="flex items-center gap-2.5">
                        <span className="font-mono text-[0.65rem] text-[var(--text-5)] min-w-[18px] text-right">{i + 1}.</span>
                        <Tag name={tag} />
                        <span className="font-mono font-bold text-[0.82rem] text-secondary-foreground">{affinity.toFixed(2)}×</span>
                        <span className="font-mono text-[0.7rem] text-[var(--text-5)]">({plays})</span>
                      </div>
                    ))}
                  </div>
                )}
                {topPreludeTags.length > 0 && (
                  <div className="flex items-stretch shrink-0">
                    {topCorpTags.length > 0 && <div className="w-px bg-border mx-[31px] self-stretch" />}
                    <div className="flex flex-col gap-2.5">
                      <div className="font-mono text-[0.72rem] tracking-[0.08em] uppercase text-[var(--text-4)]">Preludes</div>
                      {topPreludeTags.map(({ tag, plays, affinity }, i) => (
                        <div key={tag} className="flex items-center gap-2.5">
                          <span className="font-mono text-[0.65rem] text-[var(--text-5)] min-w-[18px] text-right">{i + 1}.</span>
                          <Tag name={tag} />
                          <span className="font-mono font-bold text-[0.82rem] text-secondary-foreground">{affinity.toFixed(2)}×</span>
                          <span className="font-mono text-[0.7rem] text-[var(--text-5)]">({plays})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {topCardTypes.length > 0 && (
              <div className="border-t border-border px-4 py-2.5 flex flex-col gap-2.5">
                <div className="font-mono text-[0.72rem] tracking-[0.08em] uppercase text-[var(--text-4)]">Card Type</div>
                {topCardTypes.map(({ type, plays, affinity }, i) => (
                  <div key={type} className="flex items-center gap-2.5">
                    <span className="font-mono text-[0.65rem] text-[var(--text-5)] min-w-[18px] text-right">{i + 1}.</span>
                    <span className="font-body text-[0.8rem] font-semibold min-w-[80px]" style={{ color: TYPE_COLORS[type]?.color }}>{type}</span>
                    <span className="font-mono font-bold text-[0.82rem] text-secondary-foreground">{affinity.toFixed(2)}×</span>
                    <span className="font-mono text-[0.7rem] text-[var(--text-5)]">({plays})</span>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-border px-4 py-2">
              <span className="font-body text-[var(--text-5)] italic leading-[1.6] text-[0.78rem]">
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
              <div key={year} className="mb-2">
                <button
                  onClick={() => setOpenYears(prev => { const s = new Set(prev); s.has(year) ? s.delete(year) : s.add(year); return s })}
                  className={cn(
                    'w-full flex justify-between items-center px-4 py-2.5 bg-card border border-border cursor-pointer font-display font-semibold text-[0.82rem] tracking-[0.08em] text-[var(--text-3)]',
                    open ? 'rounded-t-[6px]' : 'rounded-[6px]'
                  )}
                >
                  <span>{year}</span>
                  <span className="flex items-center gap-2.5">
                    <span className="font-mono text-[0.7rem] text-[var(--text-5)] font-normal">{byYear[year].length} games</span>
                    <span className={cn('text-[0.7rem] text-[var(--text-5)] transition-transform duration-150', open && 'rotate-180')}>▼</span>
                  </span>
                </button>
                {open && (
                  <div className="border border-border border-t-0 rounded-b-[6px] overflow-hidden">
                    <DataTable compact columns={gameHistoryColumns} rows={byYear[year]} rowKey={r => r.id} />
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
