// Helper to parse "Animal, Microbe, Plant" into individual tag labels.
export function parseTags(tags: string | null): string[] {
  if (!tags) return []
  return tags.split(',').map(t => t.trim()).filter(Boolean)
}

// Known card variant suffixes in the game log (e.g. "Lava Flows:ares")
const CARD_VARIANTS = ['ares', 'promo'] as const
export type CardVariant = typeof CARD_VARIANTS[number]

export function parseCardName(raw: string): { baseName: string; variant: CardVariant | null } {
  const colonIdx = raw.lastIndexOf(':')
  if (colonIdx === -1) return { baseName: raw, variant: null }
  const suffix = raw.slice(colonIdx + 1).toLowerCase()
  if ((CARD_VARIANTS as readonly string[]).includes(suffix)) {
    return { baseName: raw.slice(0, colonIdx), variant: suffix as CardVariant }
  }
  return { baseName: raw, variant: null }
}
