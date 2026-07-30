import { useQuery } from '@tanstack/react-query'
import {
  fetchGames,
  fetchGame,
  fetchGameByNumber,
  fetchPlayerStats,
  fetchCorporationStats,
  fetchCardStats,
  fetchCardReference,
  fetchPlayerProfiles,
  fetchPlayerCardStats,
  fetchGameCards,
  fetchGameMilestones,
  fetchGameAwards,
  fetchAllMilestones,
  fetchAllAwards,
  fetchCEOStats,
  fetchMergerStats,
  fetchNotes,
  fetchCardPlays,
  fetchCardEffectStatsGlobal,
  fetchCardEffectEventStats,
  fetchGameCardEffectEvents,
  fetchCardResourceStats,
  fetchCardResourceRemovalStats,
  fetchTournaments,
  fetchTournament,
  fetchTournamentPlayers,
  fetchTournamentStandings,
  fetchTournamentMatches,
} from './queries'

export { deleteGame, addNote, updateNote, deleteNote } from './queries'
export {
  createTournament,
  createRoundMatches,
  deleteRoundMatches,
  saveMatchResults,
  fetchTournamentFinalists,
  updateTournamentStatus,
  deleteTournament,
  setTournamentPlayerActive,
  renameTournamentPlayer,
} from './queries'

export function useGames() {
  return useQuery({ queryKey: ['games'], queryFn: fetchGames })
}

export function useGame(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['games', id],
    queryFn: () => fetchGame(id),
    enabled: options?.enabled ?? true,
  })
}

export function useGameByNumber(num: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['games', 'num', num],
    queryFn: () => fetchGameByNumber(num),
    enabled: options?.enabled ?? true,
  })
}

export function usePlayerStats() {
  return useQuery({ queryKey: ['player-stats'], queryFn: fetchPlayerStats })
}

export function useCorpStats() {
  return useQuery({ queryKey: ['corp-stats'], queryFn: fetchCorporationStats })
}

export function useCardStats() {
  return useQuery({ queryKey: ['card-stats'], queryFn: fetchCardStats })
}

export function useCardReference() {
  return useQuery({ queryKey: ['card-reference'], queryFn: fetchCardReference })
}

export function usePlayerProfiles() {
  return useQuery({ queryKey: ['player-profiles'], queryFn: fetchPlayerProfiles })
}

export function useGameCards(gameId: string) {
  return useQuery({
    queryKey: ['game-cards', gameId],
    queryFn: () => fetchGameCards(gameId),
    enabled: !!gameId,
  })
}

export function useCardEffectStatsGlobal() {
  return useQuery({ queryKey: ['card-effect-stats-global'], queryFn: fetchCardEffectStatsGlobal })
}

export function useCardEffectEventStats() {
  return useQuery({ queryKey: ['card-effect-event-stats'], queryFn: fetchCardEffectEventStats })
}

export function useGameCardEffectEvents(gameId: string) {
  return useQuery({
    queryKey: ['game-card-effect-events', gameId],
    queryFn: () => fetchGameCardEffectEvents(gameId),
    enabled: !!gameId,
  })
}

export function useCardResourceStats() {
  return useQuery({ queryKey: ['card-resource-stats'], queryFn: fetchCardResourceStats })
}

export function useCardResourceRemovalStats() {
  return useQuery({ queryKey: ['card-resource-removal-stats'], queryFn: fetchCardResourceRemovalStats })
}

export function useGameMilestones(gameId: string) {
  return useQuery({
    queryKey: ['game-milestones', gameId],
    queryFn: () => fetchGameMilestones(gameId),
    enabled: !!gameId,
  })
}

export function useGameAwards(gameId: string) {
  return useQuery({
    queryKey: ['game-awards', gameId],
    queryFn: () => fetchGameAwards(gameId),
    enabled: !!gameId,
  })
}

export function usePlayerCardStats(playerName: string) {
  return useQuery({
    queryKey: ['player-card-stats', playerName],
    queryFn: () => fetchPlayerCardStats(playerName),
    enabled: !!playerName,
  })
}

export function useCEOStats() {
  return useQuery({ queryKey: ['ceo-stats'], queryFn: fetchCEOStats })
}

export function useMergerStats() {
  return useQuery({ queryKey: ['merger-stats'], queryFn: fetchMergerStats })
}

export function useAllMilestones() {
  return useQuery({ queryKey: ['all-milestones'], queryFn: fetchAllMilestones })
}

export function useAllAwards() {
  return useQuery({ queryKey: ['all-awards'], queryFn: fetchAllAwards })
}

export function useNotes() {
  return useQuery({ queryKey: ['site-notes'], queryFn: fetchNotes })
}

export function useCardPlays(cardName: string) {
  return useQuery({
    queryKey: ['card-plays', cardName],
    queryFn: () => fetchCardPlays(cardName),
    enabled: !!cardName,
  })
}

export function useTournaments() {
  return useQuery({ queryKey: ['tournaments'], queryFn: fetchTournaments })
}

export function useTournament(id: string) {
  return useQuery({
    queryKey: ['tournament', id],
    queryFn: () => fetchTournament(id),
    enabled: !!id,
  })
}

export function useTournamentPlayers(tournamentId: string) {
  return useQuery({
    queryKey: ['tournament-players', tournamentId],
    queryFn: () => fetchTournamentPlayers(tournamentId),
    enabled: !!tournamentId,
  })
}

export function useTournamentStandings(tournamentId: string) {
  return useQuery({
    queryKey: ['tournament-standings', tournamentId],
    queryFn: () => fetchTournamentStandings(tournamentId),
    enabled: !!tournamentId,
  })
}

export function useTournamentMatches(tournamentId: string) {
  return useQuery({
    queryKey: ['tournament-matches', tournamentId],
    queryFn: () => fetchTournamentMatches(tournamentId),
    enabled: !!tournamentId,
  })
}
