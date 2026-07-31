import { useParams, Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import DataTable from '../components/ui/DataTable'
import type { DataTableColumn } from '../components/ui/DataTable'
import { SkeletonHeader, SkeletonTable } from '../components/ui/PageSkeleton'
import PositionBadge from '../components/ui/PositionBadge'
import { useTournament, useTournamentStandings, useTournamentMatches } from '../lib/hooks'
import type { TournamentStanding, TournamentMatch } from '../lib/queries'

const ROUND_LABEL: Record<number, string> = { 1: 'Round 1', 2: 'Round 2', 3: 'Round 3', 99: 'Final' }

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
  { key: 'tp', label: 'TP', align: 'right', render: s => s.tp.toFixed(1) },
  { key: 'games_played', label: 'Games', align: 'right' },
]

function MatchTable({ match, tableNumber }: { match: TournamentMatch; tableNumber: number }) {
  const complete = match.players.every(p => p.position != null)
  return (
    <div className="bg-card border border-border rounded-[6px] px-4 py-3.5">
      <div className="font-mono text-[0.68rem] tracking-[0.08em] uppercase text-[var(--text-4)] mb-2.5">
        Table {tableNumber} <span className="opacity-60">· {match.players.length} players</span>
        {!complete && <span className="text-score-400 ml-2">in progress</span>}
      </div>
      <div className="flex flex-col divide-y divide-border">
        {[...match.players].sort((a, b) => (a.position ?? 99) - (b.position ?? 99)).map(p => (
          <div key={p.player_name} className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {p.position != null && <PositionBadge position={p.position} />}
              <span className="font-body font-semibold text-[0.92rem] text-foreground truncate">{p.player_name}</span>
            </div>
            {p.position != null && (
              <span className="font-mono text-[0.68rem] text-[var(--text-4)]">
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
  const rounds = [...matchesByRound.keys()].sort((a, b) => a - b)

  return (
    <div className="page-enter py-8 px-9">
      <Link to="/tournaments" className="font-mono text-[0.7rem] tracking-[0.06em] uppercase text-[var(--text-4)] no-underline hover:text-mars-400 transition-colors">
        ← Tournaments
      </Link>
      <PageHeader
        title={tournament.name}
        subtitle={`Status: ${tournament.status}`}
      />

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
          <div className="flex flex-col gap-4">
            {rounds.map(round => (
              <div key={round}>
                <div className="font-mono text-[0.68rem] tracking-[0.08em] uppercase text-[#d07832] mb-1.5">
                  {ROUND_LABEL[round] ?? `Round ${round}`}
                </div>
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
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
