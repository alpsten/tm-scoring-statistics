// Helper to parse "Animal, Microbe, Plant" into individual tag labels.
export function parseTags(tags: string | null): string[] {
  if (!tags) return []
  return tags.split(',').map(t => t.trim()).filter(Boolean)
}
