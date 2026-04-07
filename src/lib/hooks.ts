import { useQuery } from '@tanstack/react-query'
import {
  fetchGames,
  fetchGame,
  fetchPlayerStats,
  fetchCorporationStats,
  fetchCardStats,
  fetchCardReference,
} from './queries'

export function useGames() {
  return useQuery({ queryKey: ['games'], queryFn: fetchGames })
}

export function useGame(id: string) {
  return useQuery({ queryKey: ['games', id], queryFn: () => fetchGame(id) })
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
