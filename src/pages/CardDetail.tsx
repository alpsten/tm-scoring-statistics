import { Fragment } from 'react'
import type { ReactNode } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import { SkeletonHeader, SkeletonStatGrid, SkeletonTable } from '../components/ui/PageSkeleton'
import StatCard from '../components/ui/StatCard'
import CardFrame from '../components/ui/CardFrame'
import { useCardStats, useCardReference, useCorpStats, useCEOStats, useGames, useCardPlays, useCardEffectStatsGlobal, useCardEffectEventStats, useCardResourceStats, useCardResourceRemovalStats } from '../lib/hooks'
import PositionBadge from '../components/ui/PositionBadge'
import SectionHeading from '../components/ui/SectionHeading'
import DataTable from '../components/ui/DataTable'
import type { DataTableColumn } from '../components/ui/DataTable'
import { parseCardName } from '../components/ui/tagUtils'
import { CARD_NAME_CORRECTIONS } from '../lib/logParser'
import { getCorps, isMergerResult } from '../types/database'
function normalizeForLookup(s: string) { return s.toLowerCase().replace(/\s+/g, '') }

const VARIANT_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  ares:  { bg: 'rgba(210,80,50,0.12)',  color: '#d05032', border: 'rgba(210,80,50,0.35)'  },
  promo: { bg: 'rgba(91,141,217,0.12)', color: '#5b8dd9', border: 'rgba(91,141,217,0.35)' },
}

// Cards whose MC gain always comes paired with a fixed-ratio second resource from the
// same trigger (Floating Refinery: 2 M€ + 1 Titanium per use; Optimal Aerobraking: 3 M€ +
// 3 heat per card played) — the two stats can never point at different games, so they're
// shown as one combined "Avg"/"Best" pair instead of two separately-computed ones.
const PAIRED_MC_STAT: Record<string, { eventType: string; unit: string }> = {
  'Floating Refinery': { eventType: 'titanium_gain', unit: 'Ti' },
  'Optimal Aerobraking': { eventType: 'heat_gain', unit: 'Heat' },
}

export default function CardDetail() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const rawName = decodeURIComponent(name ?? '')
  const cardName = CARD_NAME_CORRECTIONS[rawName] ?? rawName

  const { data: refData,   isLoading: refLoading   } = useCardReference()
  const { data: statsData, isLoading: statsLoading } = useCardStats()
  const { data: corpData,  isLoading: corpLoading  } = useCorpStats()
  const { data: ceoData,   isLoading: ceoLoading   } = useCEOStats()
  const { data: games,     isLoading: gamesLoading } = useGames()
  const { data: cardPlays, isLoading: playsLoading } = useCardPlays(cardName)
  const { data: effectStatsGlobal = [] } = useCardEffectStatsGlobal()
  const { data: effectEventStats = [] } = useCardEffectEventStats()
  const { data: resourceStats = [] } = useCardResourceStats()
  const { data: resourceRemovalStats = [] } = useCardResourceRemovalStats()

  const ref = (refData ?? []).find(c => c.card_name === cardName)
    ?? (refData ?? []).find(c => normalizeForLookup(c.card_name) === normalizeForLookup(cardName))
  const isCorporation = ref?.card_type === 'Corporation'
  const isCEO = ref?.card_type === 'CEO'

  if (refLoading || statsLoading || corpLoading || ceoLoading || gamesLoading || playsLoading) {
    return (
      <div className="page-enter py-8 px-9">
        <SkeletonHeader />
        <SkeletonStatGrid count={4} />
        <SkeletonTable rows={6} cols={4} />
      </div>
    )
  }

  const corpStat  = (corpData ?? []).find(c => c.corporation === cardName)
  const ceoStat   = (ceoData ?? []).find(c => c.ceo_name === cardName)
  const cardStat  = (statsData ?? []).find(c => c.card_name === cardName)
  const hasData   = isCorporation ? !!corpStat : isCEO ? !!ceoStat : !!cardStat

  if (!ref && !hasData) {
    return (
      <div className="py-8 px-9 font-body text-[var(--text-4)]">
        Card not found.{' '}
        <button onClick={() => navigate(-1)} className="bg-transparent border-none text-mars-500 cursor-pointer font-body text-[0.82rem] p-0">Back</button>
      </div>
    )
  }

  const corpGames = isCorporation
    ? (games ?? [])
        .filter(g => g.player_results.some(r => !isMergerResult(r) && r.corporation === cardName))
        .sort((a, b) => b.date.localeCompare(a.date))
    : []

  const mergerGames = isCorporation
    ? (games ?? [])
        .filter(g => g.player_results.some(r => isMergerResult(r) && getCorps(r).includes(cardName)))
        .sort((a, b) => b.date.localeCompare(a.date))
    : []

  const ceoGames = isCEO
    ? (games ?? [])
        .filter(g => g.player_results.some(r => r.ceo === cardName))
        .sort((a, b) => b.date.localeCompare(a.date))
    : []

  const timesPlayed = isCorporation ? (corpStat?.games_played ?? 0) : isCEO ? (ceoStat?.times_played ?? 0) : (cardStat?.times_played ?? 0)

  const gameById = Object.fromEntries((games ?? []).map(g => [g.id, g]))
  // Sub-line for a "Best" StatCard: who achieved it, linked to their player page,
  // and the game it happened in, linked to that game. Null when either can't be
  // resolved (e.g. no games yet) — the StatCard just omits the sub-line then.
  function bestStatSub(maxGameId: string | null | undefined, maxPlayerName: string | null | undefined): ReactNode {
    const game = maxGameId ? gameById[maxGameId] : null
    if (!game || !maxPlayerName) return null
    return (
      <>
        <Link to={`/players/${encodeURIComponent(maxPlayerName)}`} className="text-violet-400 no-underline hover:text-violet-300">
          {maxPlayerName}
        </Link>
        {' · '}
        <Link to={`/games/${game.game_number}`} className="text-[var(--text-4)] no-underline hover:text-foreground transition-colors">
          {new Date(game.date).toLocaleDateString('sv-SE')}
        </Link>
      </>
    )
  }

  type HistoryRow = { id: string; game_number: number | null; date: string; map_name: string | null; player_name: string; position: number; total_vp: number }
  type CEOHistoryRow = HistoryRow & { corporation: string }
  type MergerRow = HistoryRow & { combo: string }

  const corpHistoryColumns: DataTableColumn<HistoryRow>[] = [
    {
      key: 'date', label: 'Date',
      tdStyle: { fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-3)' },
      render: r => r.game_number != null
        ? <Link to={`/games/${r.game_number}`} className="font-mono text-[0.78rem] text-[var(--text-3)] no-underline">{new Date(r.date).toLocaleDateString('sv-SE')}</Link>
        : <>{new Date(r.date).toLocaleDateString('sv-SE')}</>,
    },
    {
      key: 'map_name', label: 'Map',
      tdStyle: { fontFamily: 'var(--font-body)', fontSize: '0.83rem' },
      render: r => <span className="text-foreground">{r.map_name ?? '—'}</span>,
    },
    {
      key: 'player_name', label: 'Player',
      tdStyle: { fontFamily: 'var(--font-body)', fontSize: '0.83rem' },
      render: r => <Link to={`/players/${encodeURIComponent(r.player_name)}`} className="text-[var(--text-3)] no-underline hover:text-mars-400 transition-colors">{r.player_name}</Link>,
    },
    { key: 'position', label: 'Position', render: r => <PositionBadge position={r.position} /> },
    {
      key: 'total_vp', label: 'Score',
      tdStyle: { fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem' },
      render: r => (
        <span className={r.position === 1 ? 'text-score-400' : 'text-[var(--text-3)]'}>
          {r.total_vp}<span className="ml-[3px]">VP</span>
        </span>
      ),
    },
  ]

  const ceoHistoryColumns: DataTableColumn<CEOHistoryRow>[] = [
    ...corpHistoryColumns.slice(0, 3) as DataTableColumn<CEOHistoryRow>[],
    {
      key: 'corporation', label: 'Corporation',
      tdStyle: { fontFamily: 'var(--font-body)', fontSize: '0.83rem' },
      render: r => <Link to={`/cards/${encodeURIComponent(r.corporation)}`} className="text-[var(--text-3)] no-underline hover:text-mars-400 transition-colors">{r.corporation}</Link>,
    },
    ...corpHistoryColumns.slice(3) as DataTableColumn<CEOHistoryRow>[],
  ]

  const { baseName, variant } = parseCardName(cardName)
  const variantStyle = variant ? (VARIANT_STYLE[variant] ?? null) : null

  return (
    <div className="page-enter card-detail-page py-8 px-9">
      <style>{`
        @media (max-width: 480px) {
          .card-detail-page { padding: 20px 16px; }
          .card-detail-grid { grid-template-columns: 1fr; }
          .card-frame-wrapper { display: flex; justify-content: center; }
        }
      `}</style>

      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="bg-transparent border-none text-[var(--text-4)] cursor-pointer font-body text-[0.78rem] p-0 hover:text-muted-foreground transition-colors">
          ← Back
        </button>
      </div>

      <PageHeader
        title={variant && variantStyle ? (
          <span className="inline-flex items-center gap-2.5">
            {baseName}
            <span
              className="font-mono text-[0.75rem] font-bold tracking-[0.06em] uppercase px-[7px] py-[2px] rounded"
              style={{ background: variantStyle.bg, color: variantStyle.color, border: `1px solid ${variantStyle.border}` }}
            >
              {variant}
            </span>
          </span>
        ) : cardName}
        subtitle={hasData ? `Played ${timesPlayed} time${timesPlayed !== 1 ? 's' : ''}` : 'No play history yet'}
      />

      {/* Card frame */}
      {ref && (
        <div className="card-frame-wrapper">
          <CardFrame card={ref} />
        </div>
      )}

      {/* Corporation stats */}
      {isCorporation && corpStat && (
        <>
          <div className="card-detail-grid grid grid-cols-2 gap-4 mb-8">
            <StatCard label="Games played" value={corpStat.games_played} sub={`${corpStat.wins} wins`} accent="neutral" />
            <StatCard label="Win rate"     value={`${Math.round(corpStat.win_rate)}%`} sub={`(${corpStat.wins}/${corpStat.games_played} wins)`} accent={corpStat.win_rate >= 60 ? 'win' : corpStat.win_rate >= 40 ? 'score' : 'mars'} />
            <StatCard label="Avg score"    value={Math.round(corpStat.avg_score)} valueSuffix="VP" accent="score" />
            <StatCard label="Best score"   value={corpStat.best_score} valueSuffix="VP" accent="score" badge />
          </div>

          {corpGames.length > 0 && (
            <>
              <SectionHeading>Game history</SectionHeading>
              <DataTable
                compact
                wrapperStyle={{ marginBottom: '32px' }}
                columns={corpHistoryColumns}
                rows={corpGames.map(game => {
                  const result = game.player_results.find(r => !isMergerResult(r) && r.corporation === cardName)!
                  return { id: game.id, game_number: game.game_number, date: game.date, map_name: game.map_name, player_name: result.player_name, position: result.position, total_vp: result.total_vp }
                })}
                rowKey={r => r.id}
              />
            </>
          )}

          {mergerGames.length > 0 && (
            <>
              <SectionHeading>Merger plays</SectionHeading>
              <DataTable
                compact
                wrapperStyle={{ marginBottom: '32px' }}
                columns={[
                  ...corpHistoryColumns.slice(0, 3) as DataTableColumn<MergerRow>[],
                  {
                    key: 'combo', label: 'Combo',
                    tdStyle: { fontFamily: 'var(--font-body)', fontSize: '0.83rem' },
                    render: r => (
                      <span className="inline-flex items-center gap-1 flex-wrap">
                        {r.combo.split(' + ').map((corp, ci) => (
                          <span key={corp} className="inline-flex items-center gap-1">
                            {ci > 0 && <span className="text-[var(--text-4)]">+</span>}
                            <Link to={`/cards/${encodeURIComponent(corp)}`} className="text-[var(--text-3)] no-underline hover:text-mars-400 transition-colors">{corp}</Link>
                          </span>
                        ))}
                      </span>
                    ),
                  },
                  ...corpHistoryColumns.slice(3) as DataTableColumn<MergerRow>[],
                ]}
                rows={mergerGames.map(game => {
                  const result = game.player_results.find(r => isMergerResult(r) && getCorps(r).includes(cardName))!
                  const combo = [...getCorps(result)].sort().join(' + ')
                  return { id: game.id, game_number: game.game_number, date: game.date, map_name: game.map_name, player_name: result.player_name, position: result.position, total_vp: result.total_vp, combo }
                })}
                rowKey={r => r.id}
              />
            </>
          )}
        </>
      )}

      {/* CEO stats */}
      {isCEO && ceoStat && (
        <>
          <div className="card-detail-grid grid grid-cols-2 gap-4 mb-8">
            <StatCard label="Games played" value={ceoStat.times_played} sub={`${ceoStat.wins} wins`} accent="neutral" />
            <StatCard label="Win rate"     value={`${Math.round(ceoStat.win_rate)}%`} sub={`(${ceoStat.wins}/${ceoStat.times_played} wins)`} accent={ceoStat.win_rate >= 60 ? 'win' : ceoStat.win_rate >= 40 ? 'score' : 'mars'} />
            <StatCard label="Avg score"    value={Math.round(ceoStat.avg_score)} valueSuffix="VP" accent="score" />
            <StatCard label="Best score"   value={ceoStat.best_score} valueSuffix="VP" accent="score" badge />
          </div>

          {ceoGames.length > 0 && (
            <>
              <SectionHeading>Game history</SectionHeading>
              <DataTable
                compact
                wrapperStyle={{ marginBottom: '32px' }}
                columns={ceoHistoryColumns}
                rows={ceoGames.map(game => {
                  const result = game.player_results.find(r => r.ceo === cardName)!
                  return { id: game.id, game_number: game.game_number, date: game.date, map_name: game.map_name, player_name: result.player_name, corporation: result.corporation, position: result.position, total_vp: result.total_vp }
                })}
                rowKey={r => r.id}
              />
            </>
          )}
        </>
      )}

      {/* Project card stats */}
      {!isCorporation && !isCEO && cardStat && (() => {
        const playsMap: Record<string, Record<string, number | null>> = {}
        for (const p of cardPlays ?? []) {
          if (!playsMap[p.game_id]) playsMap[p.game_id] = {}
          playsMap[p.game_id][p.player_name] = p.vp_from_card
        }
        type CardHistoryRow = { id: string; game_number: number | null; date: string; map_name: string | null; player_name: string; position: number; total_vp: number; vp_from_card: number | null }
        const historyRows: CardHistoryRow[] = []
        for (const [game_id, players] of Object.entries(playsMap)) {
          const game = gameById[game_id]
          if (!game) continue
          for (const [player_name, vp_from_card] of Object.entries(players)) {
            const result = game.player_results.find(r => r.player_name === player_name)
            if (!result) continue
            historyRows.push({ id: `${game_id}-${player_name}`, game_number: game.game_number, date: game.date, map_name: game.map_name, player_name, position: result.position, total_vp: result.total_vp, vp_from_card })
          }
        }
        historyRows.sort((a, b) => b.date.localeCompare(a.date))

        const hasVP = historyRows.some(r => r.vp_from_card != null)
        const cardHistoryColumns: DataTableColumn<CardHistoryRow>[] = [
          {
            key: 'date', label: 'Date',
            tdStyle: { fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-3)' },
            render: r => r.game_number != null
              ? <Link to={`/games/${r.game_number}`} className="font-mono text-[0.78rem] text-[var(--text-3)] no-underline">{new Date(r.date).toLocaleDateString('sv-SE')}</Link>
              : <>{new Date(r.date).toLocaleDateString('sv-SE')}</>,
          },
          {
            key: 'map_name', label: 'Map',
            tdStyle: { fontFamily: 'var(--font-body)', fontSize: '0.83rem' },
            render: r => <span className="text-foreground">{r.map_name ?? '—'}</span>,
          },
          {
            key: 'player_name', label: 'Player',
            tdStyle: { fontFamily: 'var(--font-body)', fontSize: '0.83rem' },
            render: r => <Link to={`/players/${encodeURIComponent(r.player_name)}`} className="text-[var(--text-3)] no-underline hover:text-mars-400 transition-colors">{r.player_name}</Link>,
          },
          { key: 'position', label: 'Position', align: 'center', render: r => <PositionBadge position={r.position} /> },
          {
            key: 'total_vp', label: 'Score', align: 'center',
            tdStyle: { fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem' },
            render: r => (
              <span className={r.position === 1 ? 'text-score-400' : 'text-[var(--text-3)]'}>
                {r.total_vp}<span className="ml-[3px]">VP</span>
              </span>
            ),
          },
          ...(hasVP ? [{
            key: 'vp_from_card' as const, label: 'Card VP', align: 'center' as const,
            tdStyle: { fontFamily: 'var(--font-mono)', fontSize: '0.85rem' },
            render: (r: CardHistoryRow) => r.vp_from_card != null
              ? <span className="text-score-400">{r.vp_from_card} VP</span>
              : <span className="text-[var(--text-5)]">—</span>,
          }] : []),
        ]

        return (
          <>
            <div className="card-detail-grid grid grid-cols-2 gap-4 mb-8">
              <StatCard label="Times played" value={cardStat.times_played} accent="neutral" />
              <StatCard label="Win rate"     value={`${Math.round(cardStat.win_rate)}%`} sub={`(${cardStat.win_count}/${cardStat.times_played} wins)`} accent={cardStat.win_rate >= 50 ? 'win' : cardStat.win_rate > 33 ? 'score' : 'mars'} />
              {cardStat.avg_vp_contribution > 0 && (
                <StatCard label="Avg VP contribution" value={Math.round(cardStat.avg_vp_contribution)} accent="score" />
              )}
              <StatCard label="Avg player score" value={Math.round(cardStat.avg_player_score)} valueSuffix="VP" accent="score" badge />
            </div>

            {(() => {
              const EVENT_STAT_LABELS: Record<string, string> = {
                draw: 'Cards drawn',
                mc_gain: 'MC gained',
                production_raise: 'Production raises',
                floater_added: 'Floaters added',
                bought: 'Cards bought',
                discarded: 'Cards discarded',
                oxygen_raise: 'Oxygen level raises',
                venus_raise: 'Venus scale raises',
                floater_traded: 'Trades paid with a floater',
                titanium_gain: 'Titanium gained',
                heat_gain: 'Heat gained',
                plant_gain: 'Plants gained',
              }
              const bucket1 = effectStatsGlobal.filter(s => s.card === cardName)
              const bucket2 = effectEventStats.filter(s => s.card_name === cardName && s.event_type !== 'resource_added' && s.event_type !== 'resource_removed')
              const resourceStat = resourceStats.find(s => s.card_name === cardName)
              const removalStat = resourceRemovalStats.find(s => s.card_name === cardName)
              if (bucket1.length === 0 && bucket2.length === 0 && !resourceStat && !removalStat) return null
              return (
                <div className="card-detail-grid grid grid-cols-2 gap-4 mb-8">
                  {resourceStat && (
                    <>
                      <StatCard
                        label="Avg VP from resources"
                        value={Math.round(resourceStat.avgVp * 10) / 10}
                        sub={`${resourceStat.gamesTriggered} games`}
                        accent="score"
                      />
                      <StatCard
                        label="Best VP from resources"
                        value={resourceStat.maxVp}
                        valueSuffix="VP"
                        sub={<>{bestStatSub(resourceStat.maxGameId, resourceStat.maxPlayerName)} ({resourceStat.maxResourceTotal} {resourceStat.resource_type ?? 'resources'})</>}
                        accent="score"
                        badge
                      />
                    </>
                  )}
                  {removalStat && (
                    <>
                      <StatCard
                        label="Avg MC saved"
                        value={Math.round(removalStat.avgMcSaved * 10) / 10}
                        sub={`avg ${Math.round(removalStat.avgGained * 10) / 10} gained, ${removalStat.gamesTriggered} games`}
                        accent="score"
                      />
                      <StatCard
                        label="Best MC saved"
                        value={removalStat.maxMcSaved}
                        valueSuffix="MC"
                        sub={bestStatSub(removalStat.maxGameId, removalStat.maxPlayerName)}
                        accent="score"
                        badge
                      />
                    </>
                  )}
                  {bucket1.map(s => (
                    <Fragment key={s.label}>
                      <StatCard label={s.label} value={Math.round(s.avgPerGame * 10) / 10} sub={`${s.gamesTriggered} games`} accent="score" />
                      <StatCard label={`Best ${s.label.toLowerCase()}`} value={s.maxInGame} sub={bestStatSub(s.maxGameId, s.maxPlayerName)} accent="score" badge />
                    </Fragment>
                  ))}
                  {PAIRED_MC_STAT[cardName] ? (() => {
                    const { eventType, unit } = PAIRED_MC_STAT[cardName]
                    const mc = bucket2.find(s => s.event_type === 'mc_gain')
                    const secondary = bucket2.find(s => s.event_type === eventType)
                    if (!mc || !secondary) return null
                    return (
                      <>
                        <StatCard
                          label={`Avg MC + ${unit} gained`}
                          value={`${Math.round(mc.avgPerGame * 10) / 10} MC / ${Math.round(secondary.avgPerGame * 10) / 10} ${unit}`}
                          sub={`${mc.gamesPlayed} games`}
                          accent="score"
                        />
                        <StatCard
                          label={`Best MC + ${unit} gained`}
                          value={`${mc.maxInGame} MC / ${secondary.maxInGame} ${unit}`}
                          sub={bestStatSub(mc.maxGameId, mc.maxPlayerName)}
                          accent="score"
                          badge
                        />
                      </>
                    )
                  })() : bucket2.map(s => {
                    const label = (EVENT_STAT_LABELS[s.event_type] ?? s.event_type).toLowerCase()
                    return (
                      <Fragment key={`${s.card_name}-${s.event_type}`}>
                        <StatCard
                          label={`Avg ${label}`}
                          value={Math.round(s.avgPerGame * 10) / 10}
                          sub={`${s.gamesPlayed} games`}
                          accent="score"
                        />
                        <StatCard
                          label={`Best ${label}`}
                          value={s.maxInGame}
                          sub={bestStatSub(s.maxGameId, s.maxPlayerName)}
                          accent="score"
                          badge
                        />
                      </Fragment>
                    )
                  })}
                </div>
              )
            })()}

            {historyRows.length > 0 && (
              <>
                <SectionHeading>Game history</SectionHeading>
                <DataTable compact wrapperStyle={{ marginBottom: '24px' }} columns={cardHistoryColumns} rows={historyRows} rowKey={r => r.id} />
              </>
            )}

            <div className="bg-card border border-border rounded-[6px] px-6 py-5">
              <p className="font-body text-[0.78rem] text-[var(--text-4)] italic m-0">
                Note: Win rate reflects the playing player's final game result, not a causal claim about this card's strength.
                Always consider sample size when interpreting percentages.
              </p>
            </div>
          </>
        )
      })()}
    </div>
  )
}
