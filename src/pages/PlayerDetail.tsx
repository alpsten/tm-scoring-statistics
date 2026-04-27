import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import PageHeader from '../components/ui/PageHeader'
import PositionBadge from '../components/ui/PositionBadge'
import SectionHeading from '../components/ui/SectionHeading'
import DataTable from '../components/ui/DataTable'
import type { DataTableColumn } from '../components/ui/DataTable'
import { useGames, usePlayerStats, usePlayerProfiles, usePlayerCardStats, useCardReference } from '../lib/hooks'
import { CARD_NAME_CORRECTIONS } from '../lib/logParser'
import { getCorps } from '../types/database'

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
  const { data: games, isLoading: gamesLoading } = useGames()
  const { data: playerStats, isLoading: statsLoading } = usePlayerStats()
  const { data: profiles = [] } = usePlayerProfiles()
  const { data: playerCards = [] } = usePlayerCardStats(name!)
  const { data: cardRef = [] } = useCardReference()

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
  const highestTR      = myResults.length > 0 ? Math.max(...myResults.map(r => r.tr))          : null
  const highestGreenery = myResults.length > 0 ? Math.max(...myResults.map(r => r.greenery_vp)) : null
  const highestCity    = myResults.length > 0 ? Math.max(...myResults.map(r => r.city_vp))      : null
  const highestCardVP  = myResults.length > 0 ? Math.max(...myResults.map(r => r.card_vp))      : null

  const chartData = playerGames.map(g => {
    const result = g.player_results.find(r => r.player_name === name)!
    return { date: g.date.slice(5), score: result.total_vp, win: result.position === 1 }
  }).reverse()

  type GameRow = { id: string; game_number: number | null; date: string; map_name: string | null; corporation: string; position: number; total_vp: number; key_notes: string | null }
  const gameRows: GameRow[] = playerGames.map(game => {
    const result = game.player_results.find(r => r.player_name === name)!
    return { id: game.id, game_number: game.game_number, date: game.date, map_name: game.map_name, corporation: result.corporation, position: result.position, total_vp: result.total_vp, key_notes: result.key_notes ?? null }
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
    { key: 'times_played', label: 'Times played', align: 'right', tdStyle: { fontSize: '0.82rem' } },
    {
      key: 'avg_vp',
      label: 'Avg VP',
      align: 'right',
      tdStyle: { fontSize: '0.82rem' },
      render: c => (
        <span style={{ color: c.avg_vp != null ? '#c9a030' : 'var(--text-5)' }}>
          {c.avg_vp != null ? Math.round(c.avg_vp) : '—'}
        </span>
      ),
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
      key: 'corporation',
      label: 'Corporation',
      tdStyle: { fontFamily: 'var(--font-body)', fontSize: '0.8rem' },
      render: r => (
        <Link to={`/corporations/${encodeURIComponent(r.corporation)}`} style={{ color: '#b87aff', textDecoration: 'none' }}>
          {r.corporation}
        </Link>
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

      {profile && (profile.preferred_color || profile.playing_style || profile.rival || profile.favorite_card || profile.most_tilting_card || profile.trivia) && (
        <>
        <SectionHeading>Profile</SectionHeading>
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '6px', padding: '16px 20px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
          {profile.playing_style && (
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: '3px' }}>Style</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: 'var(--text-2)' }}>{profile.playing_style}</div>
            </div>
          )}
          {profile.rival && (
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: '3px' }}>Rival</div>
              <Link to={`/players/${encodeURIComponent(profile.rival)}`} style={{ fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: '#e05535', textDecoration: 'none' }}>{profile.rival}</Link>
            </div>
          )}
          {profile.favorite_card && (
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: '3px' }}>Favorite card</div>
              <Link to={`/cards/${encodeURIComponent(profile.favorite_card)}`} style={{ fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: '#b87aff', textDecoration: 'none' }}>{profile.favorite_card}</Link>
            </div>
          )}
          {profile.most_tilting_card && (
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: '3px' }}>Most Frustrating Card</div>
              <Link to={`/cards/${encodeURIComponent(profile.most_tilting_card)}`} style={{ fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: 'var(--text-2)', textDecoration: 'none' }}>{profile.most_tilting_card}</Link>
            </div>
          )}
          {profile.trivia && (
            <div style={{ width: '100%' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: '3px' }}>Trivia</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--text-3)', fontStyle: 'italic', lineHeight: 1.55 }}>{profile.trivia}</div>
            </div>
          )}
        </div>
        </>
      )}

      <SectionHeading>Personal Achievements</SectionHeading>
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '6px', padding: '4px 16px', marginBottom: '32px' }}>
        {([
          {
            label: 'Wins',
            node: (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700 }}>
                <span style={{ color: '#c9a030' }}>{stats.wins} wins of {stats.games_played} games</span>
                <span style={{ color: stats.win_rate >= 60 ? '#4a9e6b' : stats.win_rate >= 40 ? '#c9a030' : '#e05535', fontWeight: 400 }}> ({Math.round(stats.win_rate)}% Win Rate)</span>
              </span>
            ),
          },
          {
            label: 'Average Score Per Game',
            node: (
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem', color: '#c9a030' }}>
                {Math.round(stats.avg_score)}<span style={{ marginLeft: '5px', fontWeight: 400, fontSize: '0.8rem' }}>VP</span>
              </span>
            ),
          },
          {
            label: 'Highest Score',
            node: (
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color: '#c9a030', background: 'rgba(201,160,48,0.12)', border: '1px solid rgba(201,160,48,0.4)', borderRadius: '4px', padding: '3px 10px' }}>
                {stats.best_score} VP
              </span>
            ),
          },
          {
            label: 'Highest TR',
            node: highestTR != null
              ? <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color: '#e05535', background: 'rgba(224,85,53,0.12)', border: '1px solid rgba(224,85,53,0.4)', borderRadius: '4px', padding: '3px 10px' }}>{highestTR} TR</span>
              : <span style={{ color: 'var(--text-5)' }}>—</span>,
          },
          {
            label: 'Most Greenery VP',
            node: highestGreenery != null
              ? <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color: '#4a9e6b', background: 'rgba(74,158,107,0.12)', border: '1px solid rgba(74,158,107,0.4)', borderRadius: '4px', padding: '3px 10px' }}>{highestGreenery} VP</span>
              : <span style={{ color: 'var(--text-5)' }}>—</span>,
          },
          {
            label: 'Most City VP',
            node: highestCity != null
              ? <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color: '#8e8e9a', background: 'rgba(142,142,154,0.12)', border: '1px solid rgba(142,142,154,0.4)', borderRadius: '4px', padding: '3px 10px' }}>{highestCity} VP</span>
              : <span style={{ color: 'var(--text-5)' }}>—</span>,
          },
          {
            label: 'Most Card VP',
            node: highestCardVP != null
              ? <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color: '#a0693a', background: 'rgba(160,105,58,0.12)', border: '1px solid rgba(160,105,58,0.4)', borderRadius: '4px', padding: '3px 10px' }}>{highestCardVP} VP</span>
              : <span style={{ color: 'var(--text-5)' }}>—</span>,
          },
        ]).map((row, i, arr) => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--bd-panel)' : 'none' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-4)' }}>{row.label}</span>
            {row.node}
          </div>
        ))}
      </div>

      {/* Score trend chart */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '6px', padding: '20px 24px', marginBottom: '28px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.82rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-4)', marginBottom: '16px' }}>
          Score trend
        </div>
        {isMobile ? (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
            <div style={{ width: Math.max(chartData.length * 22, 300), height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-4)' }} axisLine={false} tickLine={false} interval={Math.floor(chartData.length / 8)} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-4)' }} axisLine={false} tickLine={false} width={26} />
                  <Tooltip contentStyle={{ background: 'var(--bg-input)', border: '1px solid var(--bd-secondary)', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-1)' }} cursor={{ stroke: 'rgba(255,255,255,0.06)' }} />
                  <ReferenceLine y={stats.avg_score} stroke="var(--bd-secondary)" strokeDasharray="4 3" />
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
          </div>
        ) : (
        <div className="player-score-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="date" tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-4)' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 'auto']} tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--text-4)' }} axisLine={false} tickLine={false} width={32} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-input)', border: '1px solid var(--bd-secondary)', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-1)' }}
              cursor={{ stroke: 'rgba(255,255,255,0.06)' }}
            />
            <ReferenceLine y={stats.avg_score} stroke="var(--bd-secondary)" strokeDasharray="4 3" label={{ value: 'avg', position: 'insideTopRight', fontSize: 9, fill: 'var(--text-4)', fontFamily: 'var(--font-mono)' }} />
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
        )}
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
        const corpCounts: Record<string, number> = {}
        for (const game of playerGames) {
          const result = game.player_results.find(r => r.player_name === name)!
          for (const corp of getCorps(result)) {
            corpCounts[corp] = (corpCounts[corp] ?? 0) + 1
          }
        }
        const sorted = Object.entries(corpCounts).sort((a, b) => b[1] - a[1])
        if (sorted.length === 0) return null
        return (
          <div style={{ marginBottom: '28px' }}>
            <SectionHeading>Corporations Played</SectionHeading>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {sorted.map(([corp, count]) => (
                <Link key={corp} to={`/corporations/${encodeURIComponent(corp)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '6px', padding: '8px 14px', textDecoration: 'none' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: '#b87aff' }}>{corp}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-4)' }}>({count})</span>
                </Link>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Cards played */}
      {playerCards.length > 0 && (() => {
        const typeMap = Object.fromEntries(cardRef.map(c => [c.card_name, c.card_type]))
        const sections: { label: string; color: string; bg: string; border: string; types: string[] }[] = [
          { label: 'Green cards',  color: '#4a9e6b', bg: 'rgba(74,158,107,0.08)',  border: 'rgba(74,158,107,0.3)',  types: ['Automated'] },
          { label: 'Blue cards',   color: '#5b8dd9', bg: 'rgba(91,141,217,0.08)',  border: 'rgba(91,141,217,0.3)',  types: ['Active'] },
          { label: 'Red cards',    color: '#e05535', bg: 'rgba(224,85,53,0.08)',   border: 'rgba(224,85,53,0.3)',   types: ['Event'] },
        ]
        return (
          <div style={{ marginBottom: '28px' }}>
            <SectionHeading>Cards played · {playerCards.length} unique</SectionHeading>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sections.map(({ label, color, bg, border, types }) => {
                const rows = playerCards.filter(c => {
                  const canonical = CARD_NAME_CORRECTIONS[c.card_name] ?? c.card_name
                  return types.includes(typeMap[canonical] ?? '')
                }).sort((a, b) => b.times_played - a.times_played)
                if (rows.length === 0) return null
                return (
                  <div key={label}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color, background: bg, border: `1px solid ${border}`, borderRadius: '4px', padding: '5px 12px', marginBottom: '4px', display: 'inline-block' }}>
                      {label} · {rows.length}
                    </div>
                    <DataTable compact columns={cardColumns} rows={rows} rowKey={c => c.card_name} />
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
