const CARD_BLOCKLIST = new Set(['Law Suit'])

// Known misspellings in the TM app log output → corrected names
const MILESTONE_NAME_CORRECTIONS: Record<string, string> = {
  'Philantropist': 'Philanthropist',
}

// Fix UTF-8 text that was mis-decoded as Latin-1 (mojibake)
// e.g. "RÃ¶nnegÃ¥rd" → "Rönnegård"
function fixEncoding(s: string): string {
  try {
    return decodeURIComponent(escape(s))
  } catch {
    return s
  }
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

export interface ParsedLog {
  players: string[]
  first_player: string | null
  total_generations: number
  cards: ParsedCard[]
  milestones: ParsedMilestone[]
  awards: ParsedAward[]
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
  }

  let currentGeneration = 0
  let milestoneClaimOrder = 0
  const cardOrderByPlayer: Record<string, number> = {}
  // Deduplication: player::card — handles Astra Mechanica replays
  const seenCards = new Set<string>()

  for (const line of lines) {
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

    // Card played: "[Player] played [Card]"
    // Iterate known players to avoid ambiguity with spaces in names/cards
    for (const player of result.players) {
      const prefix = player + ' played '
      if (line.startsWith(prefix)) {
        const card = line.slice(prefix.length).trim()
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
          }
        }
        break
      }
    }
  }

  return result
}
