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
  'Titan Floating Launch-pad': 'Titan Floating Launch-Pad',
}

// Cards whose action-use events we extract into ParsedLog.cardEffects.
// AI Central's draw line and Inventors' Guild's discard line are inferred
// by analogy (see src/lib/cardEffectRules.ts plan notes) — verify against
// a real log on first occurrence.
const TRACKED_ACTION_CARDS = new Set([
  'AI Central', 'Martian Zoo', "Inventors' Guild", 'Hi-Tech Lab', 'Local Shading', 'Cloud Tourism',
  'Red Spot Observatory', 'Regolith Eaters', 'Rotator Impacts', 'Weather Balloons', 'Floating Refinery',
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
  'Local Shading', 'Regolith Eaters', 'Rotator Impacts', 'Weather Balloons', 'Floating Refinery',
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
// Fixed per LINE, not per document: a byte like 0x96 ('–') is ambiguous — it's either a
// mojibake'd CP1252 special char or a character that was already correctly-decoded Unicode
// to begin with (e.g. a genuine en dash in an admin-added "GameID – N" header line). Running
// the whole ~40KB log through one fatal decode meant a single such line — one that doesn't
// even need fixing — threw and silently discarded the € fix for every OTHER line in the
// entire game (undercounting every M€-gain stat for that game). Isolating the decode to one
// line at a time means only that one ambiguous line is left unfixed, not the whole document.
function fixEncoding(raw: string): string {
  return raw.split('\n').map(fixLineEncoding).join('\n')
}

function fixLineEncoding(s: string): string {
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
  | 'resource_added' | 'resource_removed' | 'oxygen_raise' | 'venus_raise' | 'floater_traded'
  | 'titanium_gain' | 'heat_gain' | 'plant_gain'

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
      const next3 = lines[i + 3] ?? ''
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
      // Floating Refinery removes floaters from ANY card the player owns (not necessarily
      // Floating Refinery itself), so this checks for "removed N resource(s) from {player}'s
      // {any card}" rather than requiring the target to match the acting card's own name.
      const removedFromAnyCard = new RegExp(`^${esc} removed \\d+ resource\\(s\\) from ${esc}'s .+$`).test(next1)
      const titaniumRe = new RegExp(`^${esc} gained (\\d+) titanium$`)
      const titaniumMatch = next2.match(titaniumRe) ?? next3.match(titaniumRe)

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
      } else if (card === 'Floating Refinery' && removedFromAnyCard) {
        // Two separate gains from one action use, so pushed directly instead of via
        // the single-event `event` variable above.
        if (mcMatch) {
          result.cardEffects.push({ player_name: player, card_name: card, event_type: 'mc_gain', amount: Number(mcMatch[1]), generation: currentGeneration, event_order: result.cardEffects.length + 1 })
        }
        if (titaniumMatch) {
          result.cardEffects.push({ player_name: player, card_name: card, event_type: 'titanium_gain', amount: Number(titaniumMatch[1]), generation: currentGeneration, event_order: result.cardEffects.length + 1 })
        }
      }
      if (event) {
        result.cardEffects.push({ ...event, event_order: result.cardEffects.length + 1 })
      }
      continue
    }

    // Trade: "[Player] spent N [resource] to trade with [Colony]" — not wrapped in a
    // "used {card} action" line (trading isn't a card action), so it needs its own match.
    // Two independent card effects key off this same line:
    //  - Venus Trade Hub grants a flat 3 M€ on any trade the player makes; matched by the
    //    literal "gained 3 M€" text (not a captured amount) so a colony's own MC-based trade
    //    income (e.g. Luna's, which scales with its colony track and could only coincidentally
    //    ever equal 3) doesn't get misattributed to the card.
    //  - Titan Floating Launch-Pad's action lets you pay for a trade with 1 floater from the
    //    card instead of the normal cost — identified by the spent resource being "floater"
    //    (no other trade payment is ever a floater). Tracked as a plain count, not an MC
    //    value, since the cost it substitutes for varies by colony/discounts.
    // Both gated on the player having already played the respective card earlier in the game.
    const tradeMatch = line.match(/^(.+) spent (\d+) (\S+) to trade with .+$/)
    if (tradeMatch) {
      const player = tradeMatch[1].trim()
      const spentAmount = Number(tradeMatch[2])
      const spentResource = tradeMatch[3]

      if (result.cards.some(c => c.player_name === player && c.card_name === 'Venus Trade Hub')) {
        const esc = escapeRegExp(player)
        const gainedThreeRe = new RegExp(`^${esc} gained 3 M€$`)
        const found = [lines[i + 1], lines[i + 2], lines[i + 3]].some(l => l && gainedThreeRe.test(l))
        if (found) {
          result.cardEffects.push({
            player_name: player,
            card_name: 'Venus Trade Hub',
            event_type: 'mc_gain',
            amount: 3,
            generation: currentGeneration,
            event_order: result.cardEffects.length + 1,
          })
        }
      }

      if (spentResource === 'floater' && result.cards.some(c => c.player_name === player && c.card_name === 'Titan Floating Launch-Pad')) {
        result.cardEffects.push({
          player_name: player,
          card_name: 'Titan Floating Launch-Pad',
          event_type: 'floater_traded',
          amount: spentAmount,
          generation: currentGeneration,
          event_order: result.cardEffects.length + 1,
        })
      }
      continue
    }

    // "[Player] gained N M€ because of Optimal Aerobraking" / "... N heat because of
    // Optimal Aerobraking" — a passive effect triggered by playing ANY card (not a card
    // action), so there's no "used {card} action" line to anchor a lookahead from. Unlike
    // Venus Trade Hub's trade bonus, the log tags both gains with the card's name directly,
    // so matching the line itself is unambiguous — no play-order gating needed.
    const aerobrakingMcMatch = line.match(/^(.+) gained (\d+) M€ because of Optimal Aerobraking$/)
    if (aerobrakingMcMatch) {
      result.cardEffects.push({
        player_name: aerobrakingMcMatch[1].trim(),
        card_name: 'Optimal Aerobraking',
        event_type: 'mc_gain',
        amount: Number(aerobrakingMcMatch[2]),
        generation: currentGeneration,
        event_order: result.cardEffects.length + 1,
      })
      continue
    }
    const aerobrakingHeatMatch = line.match(/^(.+) gained (\d+) heat because of Optimal Aerobraking$/)
    if (aerobrakingHeatMatch) {
      result.cardEffects.push({
        player_name: aerobrakingHeatMatch[1].trim(),
        card_name: 'Optimal Aerobraking',
        event_type: 'heat_gain',
        amount: Number(aerobrakingHeatMatch[2]),
        generation: currentGeneration,
        event_order: result.cardEffects.length + 1,
      })
      continue
    }

    // "[Player] gained N plant(s) because of Viral Enhancers" — same shape as Optimal
    // Aerobraking: a passive effect (triggers on playing any Animal/Plant/Microbe tag,
    // including itself) that the app already evaluates and tags with the card's name
    // directly, so no cross-referencing of card tags is needed here — just capture the
    // number. A card that also collects its own resource on tag-play (e.g. Decomposers'
    // "added N microbe(s) to Decomposers") logs that as a completely separate line, already
    // covered by the generic resource-added match below — no overlap with this one.
    const viralEnhancersMatch = line.match(/^(.+) gained (\d+) plants? because of Viral Enhancers$/)
    if (viralEnhancersMatch) {
      result.cardEffects.push({
        player_name: viralEnhancersMatch[1].trim(),
        card_name: 'Viral Enhancers',
        event_type: 'plant_gain',
        amount: Number(viralEnhancersMatch[2]),
        generation: currentGeneration,
        event_order: result.cardEffects.length + 1,
      })
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
          // Lowercased: the app's log text isn't consistent about case for this word
          // (e.g. "microbe" in most games, "Microbe" in others) — normalized here so
          // display text doesn't vary game-to-game for what's the same resource type.
          resource_type: addedMatch[3].trim().toLowerCase(),
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
