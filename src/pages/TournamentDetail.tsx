import { useParams, Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import DataTable from '../components/ui/DataTable'
import type { DataTableColumn } from '../components/ui/DataTable'
import { SkeletonHeader, SkeletonTable } from '../components/ui/PageSkeleton'
import TournamentPositionBadge from '../components/ui/TournamentPositionBadge'
import { useTournament, useTournamentStandings, useTournamentMatches } from '../lib/hooks'
import type { TournamentStanding, TournamentMatch } from '../lib/queries'
import { basePoints, milestoneAwardBonus, pointsTierStyle } from '../lib/tournamentRules'

const ROUND_LABEL: Record<number, string> = { 1: 'Round 1', 2: 'Round 2', 3: 'Round 3', 99: 'Final' }

function roundColumn(roundIndex: number, label: string): DataTableColumn<TournamentStanding & { rank: number }> {
  return {
    key: `round${roundIndex}`,
    label,
    align: 'center',
    tdStyle: { whiteSpace: 'nowrap' },
    render: s => {
      if (s.roundPlacements[roundIndex] == null) return <span className="text-[0.8rem] text-[var(--text-4)]">—</span>
      const style = pointsTierStyle(s.roundBasePoints[roundIndex])
      return (
        <div className="flex items-center justify-center gap-1.5">
          <TournamentPositionBadge position={s.roundPlacements[roundIndex]} tableSize={s.roundTableSize[roundIndex]} compact />
          <span
            className="inline-block font-mono text-[0.68rem] font-semibold rounded px-[6px] py-[2px] border"
            style={{ color: style.color, backgroundColor: style.bg, borderColor: style.border }}
          >
            {s.roundTp[roundIndex].toFixed(1)}
          </span>
        </div>
      )
    },
  }
}

const columns: DataTableColumn<TournamentStanding & { rank: number }>[] = [
  { key: 'rank', label: '#', align: 'center', tdStyle: { width: '36px', fontSize: '0.7rem', color: 'var(--text-4)' } },
  {
    key: 'player_name',
    label: 'Player',
    align: 'left',
    tdStyle: { fontFamily: 'var(--font-body)', fontSize: '0.87rem', color: 'var(--text-1)' },
    render: s => (
      <>
        {s.player_name}
        {!s.active && <span className="font-mono text-[0.62rem] tracking-[0.06em] uppercase text-[var(--text-4)] ml-2">withdrew</span>}
      </>
    ),
  },
  roundColumn(0, 'R1'),
  roundColumn(1, 'R2'),
  roundColumn(2, 'R3'),
  { key: 'tp', label: 'TP', align: 'right', render: s => s.tp.toFixed(1) },
  { key: 'games_played', label: 'Games', align: 'right' },
]

function MatchTable({ match, tableNumber }: { match: TournamentMatch; tableNumber: number }) {
  const tableSize = match.players.length
  const complete = match.players.every(p => p.position != null)
  const showPoints = match.round !== 99 && (tableSize === 3 || tableSize === 4)

  return (
    <div className="bg-card border border-border rounded-[6px] px-6 py-5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center mb-6">
        <span />
        <div className="justify-self-center flex flex-col items-center gap-1.5">
          <span className="inline-block font-mono text-[0.9rem] tracking-[0.06em] uppercase text-foreground/80 bg-foreground/10 border border-foreground/20 rounded px-2.5 py-1">
            Table {tableNumber} <span className="opacity-60">· {tableSize} players</span>
          </span>
          {!complete && <span className="font-mono text-[0.8rem] uppercase text-score-400">in progress</span>}
        </div>
        <span />
      </div>
      <div className="flex flex-col divide-y divide-border">
        {[...match.players].sort((a, b) => (a.position ?? 99) - (b.position ?? 99)).map(p => (
          <div key={p.player_name} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {p.position != null && <TournamentPositionBadge position={p.position} tableSize={tableSize} />}
              <span className="font-body font-semibold text-[0.92rem] text-foreground truncate">{p.player_name}</span>
            </div>
            {p.position != null && (
              <span className="font-mono text-[0.68rem] text-[var(--text-4)]">
                {showPoints && (
                  <span className="text-foreground font-semibold">
                    {(basePoints(p.position, tableSize) + milestoneAwardBonus(p.milestones_claimed, p.awards_won)).toFixed(1)} pts ·{' '}
                  </span>
                )}
                {p.milestones_claimed} milestones · {p.awards_won} awards
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TournamentDetail() {
  const { id = '' } = useParams<{ id: string }>()
  const { data: tournament, isLoading: loadingTournament } = useTournament(id)
  const { data: standings = [], isLoading: loadingStandings } = useTournamentStandings(id)
  const { data: matches = [] } = useTournamentMatches(id)

  if (loadingTournament || loadingStandings) return (
    <div className="page-enter py-8 px-9">
      <SkeletonHeader />
      <SkeletonTable rows={6} cols={4} />
    </div>
  )

  if (!tournament) return <EmptyState message="Tournament not found." />

  const rows = standings.map((s, i) => ({ ...s, rank: i + 1 }))
  const matchesByRound = new Map<number, TournamentMatch[]>()
  for (const m of matches) {
    matchesByRound.set(m.round, [...(matchesByRound.get(m.round) ?? []), m])
  }
  const rounds = [...matchesByRound.keys()].sort((a, b) => a - b).filter(r => r !== 99)
  const finalMatches = matchesByRound.get(99) ?? []
  const champion = finalMatches[0]?.players.find(p => p.position === 1)

  return (
    <div className="page-enter py-8 px-9">
      <Link to="/tournaments" className="font-mono text-[0.7rem] tracking-[0.06em] uppercase text-[var(--text-4)] no-underline hover:text-mars-400 transition-colors">
        ← Tournaments
      </Link>
      <PageHeader
        title={tournament.name}
        subtitle={`Status: ${tournament.status}`}
      />

      {finalMatches.length > 0 && (
        <div className="mb-6 bg-card border border-[#d4a820]/40 rounded-[6px] px-6 py-5">
          {champion && (
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <span className="font-display font-bold text-win-500 text-[1.1rem]">Champion: {champion.player_name}</span>
            </div>
          )}
          <div className="font-mono text-[0.68rem] tracking-[0.08em] uppercase text-[#d07832] mb-3">Final</div>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {finalMatches.map((m, i) => <MatchTable key={m.id} match={m} tableNumber={i + 1} />)}
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="font-display font-semibold text-[0.8rem] tracking-[0.06em] uppercase text-[var(--text-4)] mb-3">
          Standings
        </div>
        {rows.length === 0 ? (
          <EmptyState message="No qualifying results recorded yet." />
        ) : (
          <DataTable columns={columns} rows={rows} rowKey={s => s.player_name} compact />
        )}
      </div>

      {rounds.length > 0 && (
        <div>
          <div className="font-display font-semibold text-[0.8rem] tracking-[0.06em] uppercase text-[var(--text-4)] mb-3">
            Rounds
          </div>
          <div className="flex flex-col gap-8">
            {rounds.map(round => (
              <div key={round}>
                <div className="font-mono text-[0.68rem] tracking-[0.08em] uppercase text-[#d07832] mb-3">
                  {ROUND_LABEL[round] ?? `Round ${round}`}
                </div>
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                  {(matchesByRound.get(round) ?? []).map((m, i) => <MatchTable key={m.id} match={m} tableNumber={i + 1} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
