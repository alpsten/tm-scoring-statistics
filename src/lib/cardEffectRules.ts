import type { GameCardEntry } from './queries'
import type { CardReference } from '../types/database'
import { parseTags } from '../components/ui/tagUtils'

type CardRefMap = Record<string, CardReference>  // keyed by card_name.toLowerCase()

interface FlatDiscountRule { kind: 'flat_discount_own_subsequent'; card: string; amountPerPlay: number; label: string }
interface TagDiscountRule { kind: 'tag_discount_own_subsequent'; card: string; tag: string; amountPerPlay: number; label: string }
interface TagAccumulationRule { kind: 'tag_accumulation_own_subsequent'; card: string; tag: string; includeSelf?: boolean; resourcePerVp?: number; label: string }
interface CostCountRule { kind: 'cost_count_own_subsequent'; card: string; minCost: number; label: string }
interface TagTypeCountAnyPlayerRule { kind: 'tag_type_count_any_player_subsequent'; card: string; tag: string; cardType: CardReference['card_type']; label: string }

export type CardEffectRule = FlatDiscountRule | TagDiscountRule | TagAccumulationRule | CostCountRule | TagTypeCountAnyPlayerRule

// Bucket 1: card effects fully derivable from cards_played + card_reference,
// no raw-log parsing needed. See plan doc for per-card rationale and the
// card_order-is-per-player caveat that forces the cross-player rule to
// approximate via `generation` instead.
export const CARD_EFFECT_RULES: CardEffectRule[] = [
  { kind: 'flat_discount_own_subsequent', card: 'Sky Docks', amountPerPlay: 1, label: 'MC saved' },
  { kind: 'flat_discount_own_subsequent', card: 'Earth Catapult', amountPerPlay: 2, label: 'MC saved' },
  { kind: 'tag_discount_own_subsequent', card: 'Space Station', tag: 'Space', amountPerPlay: 2, label: 'MC saved' },
  { kind: 'tag_discount_own_subsequent', card: 'Earth Office', tag: 'Earth', amountPerPlay: 3, label: 'MC saved' },
  { kind: 'tag_discount_own_subsequent', card: 'Solar Logistics', tag: 'Earth', amountPerPlay: 2, label: 'MC saved' },
  { kind: 'tag_type_count_any_player_subsequent', card: 'Solar Logistics', tag: 'Space', cardType: 'Event', label: 'Cards drawn (any player)' },
  { kind: 'cost_count_own_subsequent', card: 'Advertising', minCost: 20, label: '20+ MC cards played after' },
  // Venusian Animals and Martian Zoo used to be estimated here (tag plays ≈ animals
  // gained), but their real totals are now tracked directly from 'resource_added'/
  // 'mc_gain' log events (src/lib/logParser.ts), which also capture animals added by
  // other cards
  // (e.g. Freyja Biodomes) that this tag-based estimate could never see.
]

export interface CardEffectStat {
  card: string
  label: string
  playerName: string
  triggerCardOrder: number
  value: number
}

export function evaluateCardEffects(gameCards: GameCardEntry[], cardRefMap: CardRefMap): CardEffectStat[] {
  const byPlayer: Record<string, GameCardEntry[]> = {}
  for (const c of gameCards) (byPlayer[c.player_name] ??= []).push(c)  // already card_order-ascending

  const results: CardEffectStat[] = []
  for (const rule of CARD_EFFECT_RULES) {
    for (const trigger of gameCards.filter(c => c.card_name === rule.card)) {
      const order = trigger.card_order ?? 0
      const gen = trigger.generation ?? 0
      const own = byPlayer[trigger.player_name] ?? []
      let value = 0

      if (rule.kind === 'flat_discount_own_subsequent') {
        value = own.filter(c => (c.card_order ?? 0) > order).length * rule.amountPerPlay
      } else if (rule.kind === 'tag_discount_own_subsequent') {
        value = own.filter(c => (c.card_order ?? 0) > order && hasTag(cardRefMap, c.card_name, rule.tag)).length * rule.amountPerPlay
      } else if (rule.kind === 'tag_accumulation_own_subsequent') {
        const matches = own.filter(c =>
          (rule.includeSelf ? (c.card_order ?? 0) >= order : (c.card_order ?? 0) > order)
          && hasTag(cardRefMap, c.card_name, rule.tag))
        value = rule.resourcePerVp ? matches.length / rule.resourcePerVp : matches.length
      } else if (rule.kind === 'cost_count_own_subsequent') {
        value = own.filter(c => (c.card_order ?? 0) > order && (cardRefMap[c.card_name.toLowerCase()]?.mc_cost ?? -1) >= rule.minCost).length
      } else if (rule.kind === 'tag_type_count_any_player_subsequent') {
        // Cross-player: card_order isn't comparable across players (it's assigned
        // per-player in logParser.ts), so fall back to generation as an approximation.
        value = gameCards.filter(c =>
          (c.generation ?? 0) >= gen
          && cardRefMap[c.card_name.toLowerCase()]?.card_type === rule.cardType
          && hasTag(cardRefMap, c.card_name, rule.tag)).length
      }

      results.push({ card: rule.card, label: rule.label, playerName: trigger.player_name, triggerCardOrder: order, value })
    }
  }
  return results
}

function hasTag(map: CardRefMap, cardName: string, tag: string): boolean {
  return parseTags(map[cardName.toLowerCase()]?.tags ?? null).includes(tag)
}

export interface CardEffectAggregateStat {
  card: string
  label: string
  gamesTriggered: number
  totalValue: number
  avgPerGame: number
  maxInGame: number
}

export function aggregateCardEffects(perGameStats: CardEffectStat[][]): CardEffectAggregateStat[] {
  const byCard: Record<string, { label: string; perGame: number[] }> = {}
  for (const gameStats of perGameStats) {
    const totalsThisGame: Record<string, number> = {}
    for (const s of gameStats) {
      totalsThisGame[s.card] = (totalsThisGame[s.card] ?? 0) + s.value
      byCard[s.card] ??= { label: s.label, perGame: [] }
    }
    for (const [card, total] of Object.entries(totalsThisGame)) byCard[card].perGame.push(total)
  }
  return Object.entries(byCard).map(([card, { label, perGame }]) => ({
    card, label,
    gamesTriggered: perGame.length,
    totalValue: perGame.reduce((s, v) => s + v, 0),
    avgPerGame: perGame.reduce((s, v) => s + v, 0) / perGame.length,
    maxInGame: Math.max(...perGame),
  }))
}
