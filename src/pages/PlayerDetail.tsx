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
import { EXPANSION_ICONS } from '../lib/expansions'

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
  const [collapsedCardSections, setCollapsedCardSections] = useState<Set<string>>(new Set(['Green cards', 'Blue cards', 'Red cards']))
  const [allCorpsOpen, setAllCorpsOpen] = useState(false)
  const [chartYear, setChartYear] = useState<string>('All')
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
  const globalWinRateMap = Object.fromEntries(globalCardStats.map(s => [s.card_name, s.win_rate]))

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
    { key: 'times_played', label: 'Played', align: 'center', tdStyle: { fontSize: '0.82rem' } },
    {
      key: 'card_name' as any,
      label: 'VP',
      align: 'center',
      tdStyle: { fontSize: '0.82rem' },
      render: c => {
        const canonical = CARD_NAME_CORRECTIONS[c.card_name] ?? c.card_name
        const base_vp = cardRefMap[canonical]?.base_vp
        return <span style={{ color: base_vp != null ? '#c9a030' : 'var(--text-5)' }}>{base_vp ?? '—'}</span>
      },
    },
    {
      key: 'card_name' as any,
      label: 'Win Rate',
      align: 'center',
      tdStyle: { fontSize: '0.82rem' },
      render: c => {
        const canonical = CARD_NAME_CORRECTIONS[c.card_name] ?? c.card_name
        const wr = globalWinRateMap[canonical]
        if (wr == null) return <span style={{ color: 'var(--text-5)' }}>—</span>
        return <span style={{ color: wr >= 50 ? '#4a9e6b' : wr > 33 ? '#c9a030' : '#e05535' }}>{Math.round(wr)}%</span>
      },
    },
    {
      key: 'card_name' as any,
      label: 'Cost',
      align: 'center',
      tdStyle: { fontSize: '0.82rem' },
      render: c => {
        const canonical = CARD_NAME_CORRECTIONS[c.card_name] ?? c.card_name
        const ref = cardRefMap[canonical]
        if (!ref || ref.mc_cost == null) return <span style={{ color: 'var(--text-5)' }}>—</span>
        return <span style={{ color: '#c9a030' }}>{ref.mc_cost}</span>
      },
    },
    {
      key: 'card_name' as any,
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
      key: 'card_name' as any,
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

      {/* Panel 1: Win stats */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '6px', padding: '4px 16px', marginBottom: '16px' }}>
        {([
          {
            label: 'Wins',
            node: (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700 }}>
                <span style={{ color: 'var(--text-1)' }}>{stats.wins} wins of {stats.games_played} games</span>
                <span style={{ color: stats.win_rate >= 60 ? '#4a9e6b' : stats.win_rate >= 40 ? '#c9a030' : '#e05535', fontWeight: 400 }}> ({Math.round(stats.win_rate)}% Win Rate)</span>
              </span>
            ),
          },
          {
            label: 'Average Score Per Game',
            node: (
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem', color: '#c9a030' }}>
                {Math.round(stats.avg_score)} <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>VP</span>
              </span>
            ),
          },
          {
            label: 'Total VP Gained',
            node: (
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem', color: '#c9a030' }}>
                {totalVP.toLocaleString()} <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>VP</span>
              </span>
            ),
          },
        ]).map((row, i, arr) => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--bd-panel)' : 'none' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)' }}>{row.label}</span>
            {row.node}
          </div>
        ))}
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
        const records: Record<string, { games: number; wins: number; losses: number; scoreDiffs: number[] }> = {}
        for (const game of playerGames) {
          const myResult = game.player_results.find(r => r.player_name === name)!
          for (const opp of game.player_results) {
            if (opp.player_name === name) continue
            if (!records[opp.player_name]) records[opp.player_name] = { games: 0, wins: 0, losses: 0, scoreDiffs: [] }
            records[opp.player_name].games++
            if (myResult.position === 1) records[opp.player_name].wins++
            else if (opp.position === 1) records[opp.player_name].losses++
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
                        {rec.games}G
                      </span>
                    </div>
                    {/* W / L bar */}
                    <div style={{ display: 'flex', height: '4px', borderRadius: '2px', overflow: 'hidden', marginBottom: '10px', background: 'var(--bd-panel)' }}>
                      {rec.wins > 0 && (
                        <div style={{ width: `${winRate}%`, background: '#4a9e6b', transition: 'width 0.3s' }} />
                      )}
                      {rec.losses > 0 && (
                        <div style={{ width: `${(rec.losses / rec.games) * 100}%`, background: '#e05535', transition: 'width 0.3s' }} />
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#4a9e6b' }}>{rec.wins}W</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#e05535' }}>{rec.losses}L</span>
                        {rec.games - rec.wins - rec.losses > 0 && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-4)' }}>
                            {rec.games - rec.wins - rec.losses}—
                          </span>
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
        const typeMap = Object.fromEntries(cardRef.map(c => [c.card_name, c.card_type]))
        const top10 = [...playerCards].sort((a, b) => b.times_played - a.times_played).slice(0, 10)
        const sections: { label: string; color: string; bg: string; border: string; types: string[] }[] = [
          { label: 'Green cards', color: '#4a9e6b', bg: 'rgba(74,158,107,0.08)',  border: 'rgba(74,158,107,0.3)',  types: ['Automated'] },
          { label: 'Blue cards',  color: '#5b8dd9', bg: 'rgba(91,141,217,0.08)',  border: 'rgba(91,141,217,0.3)',  types: ['Active'] },
          { label: 'Red cards',   color: '#e05535', bg: 'rgba(224,85,53,0.08)',   border: 'rgba(224,85,53,0.3)',   types: ['Event'] },
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
                <DataTable compact columns={cardColumns} rows={top10} rowKey={c => c.card_name} />
              </div>

              {/* Colour sections — collapsed by default */}
              {sections.map(({ label, color, bg, border, types }) => {
                const rows = playerCards.filter(c => {
                  const canonical = CARD_NAME_CORRECTIONS[c.card_name] ?? c.card_name
                  return types.includes(typeMap[canonical] ?? '')
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
                        <DataTable compact columns={cardColumns} rows={rows} rowKey={c => c.card_name} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

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
