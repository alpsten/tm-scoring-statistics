const CARD_BLOCKLIST = new Set(['Law Suit'])

// Known misspellings in the TM app log output → corrected names
const MILESTONE_NAME_CORRECTIONS: Record<string, string> = {
  'Philantropist': 'Philanthropist',
}

// Known card name mismatches between app log output and card_reference canonical names.
// Add entries here whenever a card is renamed or the app log spells it differently.
export const CARD_NAME_CORRECTIONS: Record<string, string> = {
  'MarsMaths': 'Mars Maths',
  'Anti-desertification Techniques': 'Anti-Desertification Techniques',
  'Anti-desertification techniques': 'Anti-Desertification Techniques',
  'Anti-desertification Techniques ': 'Anti-Desertification Techniques',
  'COÂ² Reducers': 'CO2 Reducers',
  'CO² Reducers': 'CO2 Reducers',
}

// Cards whose action-use events we extract into ParsedLog.cardEffects.
// AI Central's draw line and Inventors' Guild's discard line are inferred
// by analogy (see src/lib/cardEffectRules.ts plan notes) — verify against
// a real log on first occurrence.
const TRACKED_ACTION_CARDS = new Set([
  'AI Central', 'Martian Zoo', "Inventors' Guild", 'Hi-Tech Lab', 'Local Shading', 'Cloud Tourism',
  'Red Spot Observatory', 'Regolith Eaters', 'Rotator Impacts', 'Weather Balloons',
])

// Cards whose action removes N of their own resource(s) as a one-shot global-parameter
// raise — the removed amount is irrelevant (it's however many were needed for 1 step),
// so these are counted per action-use (amount 1), same shape as Local Shading's
// production_raise. Confirmed against a real log: "removed N resource(s) from
// {player}'s {card}" always follows "used {card} action" for these.
const ACTION_REMOVE_EVENT_TYPE: Record<string, ParsedCardEffectEventType> = {
  'Local Shading': 'production_raise',
  'Regolith Eaters': 'oxygen_raise',
  'Rotator Impacts': 'venus_raise',
}

// Cards that draw a card immediately when *played* (not via a repeatable action) —
// tracked as the same 'draw' event_type as their action-draws so both sum into one total.
const TRACKED_PLAY_DRAW_CARDS = new Set(['Red Spot Observatory'])

// Cards already producing a resource-count event via TRACKED_ACTION_CARDS above —
// excluded from the generic "added N X(s) to Y" scan below to avoid double-counting.
const GENERIC_RESOURCE_EXCLUDED_TARGETS = new Set(['Cloud Tourism'])

// Cards whose "removed N resource(s) from {player}'s {card}" is already consumed by
// TRACKED_ACTION_CARDS above (ACTION_REMOVE_EVENT_TYPE's action-based raises, and
// Weather Balloons' dynamic mc_gain) — excluded from the generic resource-removed scan
// below to avoid double-counting or misreading them as a fixed per-resource MC value.
const GENERIC_RESOURCE_REMOVED_EXCLUDED_TARGETS = new Set([
  'Local Shading', 'Regolith Eaters', 'Rotator Impacts', 'Weather Balloons',
])

// Cards whose resource-added trigger isn't "the player played/used a card" at all (so the
// played/used backward-lookback below is the wrong model and produces garbage attributions)
// — these get a fixed source label instead. Pets: "when ANY city tile is placed by ANYONE,
// gain 2 M€ and add 1 animal" — confirmed by tracing every instance against a real log,
// where the lookback kept grabbing whatever unrelated card the player last played/used.
const FIXED_RESOURCE_SOURCE: Record<string, string> = {
  'Pets': 'city tile placed',
}

// How many lines to look back from a "added N X(s) to Y" line when trying to
// attribute it to the card/action that caused it (best-effort — not logged directly).
const SOURCE_LOOKBACK_LINES = 10

// Windows-1252 byte values for the 0x80-0x9F range that differ from plain Latin-1 — the TM
// app's log export mis-decodes UTF-8 as Windows-1252, not Latin-1, so characters in this
// range (notably € itself) need an explicit reverse mapping back to their original byte.
const CP1252_HIGH_CHARS: Record<string, number> = {
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85,
  '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8A,
  '‹': 0x8B, 'Œ': 0x8C, 'Ž': 0x8E, '‘': 0x91, '’': 0x92,
  '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
  '˜': 0x98, '™': 0x99, 'š': 0x9A, '›': 0x9B, 'œ': 0x9C,
  'ž': 0x9E, 'Ÿ': 0x9F,
}

// Fix UTF-8 text that was mis-decoded as Windows-1252 (mojibake)
// e.g. "RÃ¶nnegÃ¥rd" → "Rönnegård", "Mâ‚¬" → "M€"
// Note: the previous decodeURIComponent(escape(s)) approach silently failed (and returned
// the ENTIRE string unfixed) whenever € appeared, since escape() can't represent U+201A —
// one of the three characters € mojibakes into — breaking every "M€" match downstream.
function fixEncoding(s: string): string {
  try {
    const bytes = Uint8Array.from(Array.from(s, ch => CP1252_HIGH_CHARS[ch] ?? ch.charCodeAt(0)))
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return s
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export interface ParsedCard {
  player_name: string
  card_name: string
  card_order: number   // per-player order
  generation: number
}

export interface ParsedMilestone {
  player_name: string
  milestone_name: string
  claimed_order: number  // 1 = first claimed, 2 = second, 3 = third
}

export interface ParsedAward {
  player_name: string
  award_name: string
}

export type ParsedCardEffectEventType =
  | 'draw' | 'mc_gain' | 'production_raise' | 'floater_added' | 'bought' | 'discarded'
  | 'resource_added' | 'resource_removed' | 'oxygen_raise' | 'venus_raise'

export interface ParsedCardEffectEvent {
  player_name: string
  card_name: string
  event_type: ParsedCardEffectEventType
  amount: number
  generation: number
  event_order: number
  resource_type?: string      // only for 'resource_added'
  source_card?: string | null // only for 'resource_added' — best-effort attribution
}

export interface ParsedLog {
  players: string[]
  first_player: string | null
  total_generations: number
  cards: ParsedCard[]
  milestones: ParsedMilestone[]
  awards: ParsedAward[]
  cardEffects: ParsedCardEffectEvent[]
}

export function parseGameLog(raw: string): ParsedLog {
  const text = fixEncoding(raw)
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  const result: ParsedLog = {
    players: [],
    first_player: null,
    total_generations: 0,
    cards: [],
    milestones: [],
    awards: [],
    cardEffects: [],
  }

  let currentGeneration = 0
  let milestoneClaimOrder = 0
  const cardOrderByPlayer: Record<string, number> = {}
  // Deduplication: player::card — handles Astra Mechanica replays
  const seenCards = new Set<string>()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Player names: "Good luck Emil Alpsten!"
    const playerMatch = line.match(/^Good luck (.+)!$/)
    if (playerMatch) {
      const name = playerMatch[1].trim()
      if (!result.players.includes(name)) result.players.push(name)
      continue
    }

    // Generation marker: "Generation 3"
    const genMatch = line.match(/^Generation (\d+)$/)
    if (genMatch) {
      currentGeneration = parseInt(genMatch[1])
      if (currentGeneration > result.total_generations) {
        result.total_generations = currentGeneration
      }
      continue
    }

    // First player (first occurrence wins — that's the overall first player)
    if (!result.first_player) {
      const fpMatch = line.match(/^First player this generation is (.+)$/)
      if (fpMatch) {
        result.first_player = fpMatch[1].trim()
        continue
      }
    }

    // Milestone: "Emil Alpsten claimed Terran milestone"
    const milestoneMatch = line.match(/^(.+) claimed (.+) milestone$/)
    if (milestoneMatch) {
      milestoneClaimOrder++
      const rawName = milestoneMatch[2].trim()
      result.milestones.push({
        player_name: milestoneMatch[1].trim(),
        milestone_name: MILESTONE_NAME_CORRECTIONS[rawName] ?? rawName,
        claimed_order: milestoneClaimOrder,
      })
      continue
    }

    // Award: "Felix Rönnegård funded Botanist award"
    const awardMatch = line.match(/^(.+) funded (.+) award$/)
    if (awardMatch) {
      result.awards.push({
        player_name: awardMatch[1].trim(),
        award_name: awardMatch[2].trim(),
      })
      continue
    }

    // Card effect action use: "[Player] used [Card] action" — the following
    // line(s) classify what happened. Only tracked for cards we have a
    // defined effect rule for.
    const actionMatch = line.match(/^(.+) used (.+) action$/)
    if (actionMatch && TRACKED_ACTION_CARDS.has(actionMatch[2])) {
      const player = actionMatch[1].trim()
      const card = actionMatch[2].trim()
      const next1 = lines[i + 1] ?? ''
      const next2 = lines[i + 2] ?? ''
      const esc = escapeRegExp(player)

      // Draw/MC-gain lines may be immediately after the action, or one line later if an
      // intermediate cost/resource line (e.g. Hi-Tech Lab's "spent N energy", Weather
      // Balloons' "removed 1 resource(s) from ... Weather Balloons") comes first.
      const drawRe = new RegExp(`^${esc} drew (\\d+) card\\(s\\)$`)
      const drawMatch = next1.match(drawRe) ?? next2.match(drawRe)
      const mcRe = new RegExp(`^${esc} gained (\\d+) M€$`) // no "production" suffix
      const mcMatch = next1.match(mcRe) ?? next2.match(mcRe)
      const removedFromOwnCard = new RegExp(`^${esc} removed \\d+ resource\\(s\\) from ${esc}'s ${escapeRegExp(card)}$`).test(next1)
      const boughtMatch = next1.match(new RegExp(`^${esc} bought (\\d+) card\\(s\\)$`))

      let event: Omit<ParsedCardEffectEvent, 'event_order'> | null = null
      if ((card === 'Hi-Tech Lab' || card === 'AI Central' || card === 'Red Spot Observatory') && drawMatch) {
        event = { player_name: player, card_name: card, event_type: 'draw', amount: Number(drawMatch[1]), generation: currentGeneration }
      } else if ((card === 'Martian Zoo' || card === 'Weather Balloons') && mcMatch) {
        event = { player_name: player, card_name: card, event_type: 'mc_gain', amount: Number(mcMatch[1]), generation: currentGeneration }
      } else if (ACTION_REMOVE_EVENT_TYPE[card] && removedFromOwnCard) {
        event = { player_name: player, card_name: card, event_type: ACTION_REMOVE_EVENT_TYPE[card], amount: 1, generation: currentGeneration }
      } else if (card === 'Cloud Tourism') {
        event = { player_name: player, card_name: card, event_type: 'floater_added', amount: 1, generation: currentGeneration }
      } else if (card === "Inventors' Guild" && boughtMatch) {
        event = { player_name: player, card_name: card, event_type: boughtMatch[1] === '0' ? 'discarded' : 'bought', amount: 1, generation: currentGeneration }
      }
      if (event) {
        result.cardEffects.push({ ...event, event_order: result.cardEffects.length + 1 })
      }
      continue
    }

    // Generic resource-added: "[Player] added N [Resource](s) to [Card]" — covers any
    // card that accumulates resources for VP (Venusian Animals, Ants, etc.), regardless
    // of whether the resource came from the target card's own passive effect or from
    // another card's one-time effect (e.g. Freyja Biodomes adding animals elsewhere).
    // Note: unlike "card(s)"/"resource(s)" (always literal), resource type names are
    // genuinely pluralized — singular counts drop the "(s)" entirely (e.g. "1 Animal"
    // vs "2 Animal(s)") — so the suffix must be optional here.
    const addedMatch = line.match(/^(.+) added (\d+) (\w+)(?:\(s\))? to (.+)$/)
    if (addedMatch) {
      const player = addedMatch[1].trim()
      const targetCard = CARD_NAME_CORRECTIONS[addedMatch[4].trim()] ?? addedMatch[4].trim()
      if (!GENERIC_RESOURCE_EXCLUDED_TARGETS.has(targetCard)) {
        let sourceCard: string | null = FIXED_RESOURCE_SOURCE[targetCard] ?? null
        if (!sourceCard) {
          const esc = escapeRegExp(player)
          const playedRe = new RegExp(`^${esc} played (.+)$`)
          const usedRe = new RegExp(`^${esc} used (.+) action$`)
          for (let j = i - 1; j >= 0 && j >= i - SOURCE_LOOKBACK_LINES; j--) {
            if (/^Generation \d+$/.test(lines[j])) break
            const m = lines[j].match(playedRe) ?? lines[j].match(usedRe)
            if (m) {
              sourceCard = CARD_NAME_CORRECTIONS[m[1].trim()] ?? m[1].trim()
              break
            }
          }
        }
        result.cardEffects.push({
          player_name: player,
          card_name: targetCard,
          event_type: 'resource_added',
          amount: Number(addedMatch[2]),
          resource_type: addedMatch[3].trim(),
          source_card: sourceCard,
          generation: currentGeneration,
          event_order: result.cardEffects.length + 1,
        })
      }
      continue
    }

    // Generic resource-removed: "[Player] removed N resource(s) from [Player]'s [Card]" —
    // covers cards that spend accumulated resources for a one-time benefit outside of a
    // repeatable action (e.g. Carbon Nanosystems spending graphenes as MC when playing a
    // space/city tag card). "resource(s)" here is always literal, unlike the resource-type
    // names in the added-match above.
    const removedMatch = line.match(/^(.+?) removed (\d+) resource\(s\) from (.+)'s (.+)$/)
    if (removedMatch && removedMatch[1] === removedMatch[3]) {
      const player = removedMatch[1].trim()
      const targetCard = CARD_NAME_CORRECTIONS[removedMatch[4].trim()] ?? removedMatch[4].trim()
      if (!GENERIC_RESOURCE_REMOVED_EXCLUDED_TARGETS.has(targetCard)) {
        result.cardEffects.push({
          player_name: player,
          card_name: targetCard,
          event_type: 'resource_removed',
          amount: Number(removedMatch[2]),
          generation: currentGeneration,
          event_order: result.cardEffects.length + 1,
        })
      }
      continue
    }

    // Card played: "[Player] played [Card]"
    // Iterate known players to avoid ambiguity with spaces in names/cards
    for (const player of result.players) {
      const prefix = player + ' played '
      if (line.startsWith(prefix)) {
        const rawCard = line.slice(prefix.length).trim()
        const card = CARD_NAME_CORRECTIONS[rawCard] ?? rawCard
        if (!CARD_BLOCKLIST.has(card)) {
          const key = `${player}::${card}`
          if (!seenCards.has(key)) {
            seenCards.add(key)
            cardOrderByPlayer[player] = (cardOrderByPlayer[player] ?? 0) + 1
            result.cards.push({
              player_name: player,
              card_name: card,
              card_order: cardOrderByPlayer[player],
              generation: currentGeneration,
            })

            // Some cards draw immediately on play (not via a repeatable action) —
            // tracked as the same 'draw' event_type so it sums with any action-draws.
            if (TRACKED_PLAY_DRAW_CARDS.has(card)) {
              const esc = escapeRegExp(player)
              const drawRe = new RegExp(`^${esc} drew (\\d+) card\\(s\\)$`)
              const drawMatch = (lines[i + 1] ?? '').match(drawRe) ?? (lines[i + 2] ?? '').match(drawRe)
              if (drawMatch) {
                result.cardEffects.push({
                  player_name: player,
                  card_name: card,
                  event_type: 'draw',
                  amount: Number(drawMatch[1]),
                  generation: currentGeneration,
                  event_order: result.cardEffects.length + 1,
                })
              }
            }
          }
        }
        break
      }
    }
  }

  return result
}
