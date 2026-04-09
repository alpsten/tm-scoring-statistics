import { useQuery } from '@tanstack/react-query'
import {
  fetchGames,
  fetchGame,
  fetchPlayerStats,
  fetchCorporationStats,
  fetchCardStats,
  fetchCardReference,
  fetchPlayerProfiles,
  fetchPlayerCardStats,
  fetchGameCards,
} from './queries'

export { deleteGame } from './queries'

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

export function usePlayerCardStats(playerName: string) {
  return useQuery({
    queryKey: ['player-card-stats', playerName],
    queryFn: () => fetchPlayerCardStats(playerName),
    enabled: !!playerName,
  })
}
