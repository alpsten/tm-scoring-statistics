import { useParams, useNavigate, Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import { SkeletonHeader, SkeletonStatGrid, SkeletonTable } from '../components/ui/PageSkeleton'
import StatCard from '../components/ui/StatCard'
import CardFrame from '../components/ui/CardFrame'
import { useCardStats, useCardReference, useCorpStats, useCEOStats, useGames, useCardPlays } from '../lib/hooks'
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
        const gameMap = Object.fromEntries((games ?? []).map(g => [g.id, g]))
        const playsMap: Record<string, Record<string, number | null>> = {}
        for (const p of cardPlays ?? []) {
          if (!playsMap[p.game_id]) playsMap[p.game_id] = {}
          playsMap[p.game_id][p.player_name] = p.vp_from_card
        }
        type CardHistoryRow = { id: string; game_number: number | null; date: string; map_name: string | null; player_name: string; position: number; total_vp: number; vp_from_card: number | null }
        const historyRows: CardHistoryRow[] = []
        for (const [game_id, players] of Object.entries(playsMap)) {
          const game = gameMap[game_id]
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
