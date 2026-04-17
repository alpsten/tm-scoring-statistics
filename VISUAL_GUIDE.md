# Visual & Styling Guide

A reference for consistent UI decisions across the app. When adding or editing any UI, follow these rules.

---

## Fonts

Three font variables are defined in `index.css`:

| Variable | Usage |
|---|---|
| `var(--font-display)` | Section headings, map names, player names in headers |
| `var(--font-body)` | Labels, prose, notes, subtitles |
| `var(--font-mono)` | All numbers, stat labels (uppercase), codes, positions |

**Rule:** Stat labels (e.g. "Total Wins", "Win Rate") always use `--font-mono` + `uppercase` + `letterSpacing: '0.08em'`. Numbers always use `--font-mono`.

---

## Colors

| Color | Hex | Used for |
|---|---|---|
| Gold | `#c9a030` | VP scores, best scores, winner score |
| Green | `#4a9e6b` | Wins, winner highlights, positive results |
| Red | `#e05535` | Losses, negative results, 2nd/3rd/4th/5th place |
| Purple | `#b87aff` | Corporations, card names, player profile links |
| Dark Blue | `#5b8dd9` | Maps, game numbers, filter pills, counts (e.g. `5G`) |
| Teal | `#2e8b8b` | Win totals ("of N games"), atmosphere track |
| Muted purple | `#8e87a8` | Secondary numbers (non-winner scores) |
| Dim | `#625c7c` | Secondary labels, metadata |
| Very dim | `#504270` | Tertiary labels, stat label text |

---

## Number Formatting

- **Always use `Math.round()`** — never `.toFixed()`. No `.0` suffixes anywhere.
- Win rates display as whole percentages: `Math.round(win_rate)` → `50%`
- Scores are always whole numbers: `Math.round(avg_score)` → `85`
- Positions are whole numbers: `Math.round(avg_position)` → `2`

---

## VP Suffix

Wherever a VP number appears, the `VP` label must match the number exactly in font, size, color, and weight.

```tsx
// Correct
<span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color: '#c9a030' }}>
  85<span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color: '#c9a030', marginLeft: '3px' }}>VP</span>
</span>

// Wrong — VP smaller, different color, different font
<span>85 <span style={{ fontSize: '0.65rem', color: '#504270' }}>VP</span></span>
```

---

## Section Headings

All section headings (`h2`-level) across every page use this exact style:

```tsx
<h2 style={{
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: '0.82rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#625c7c',
  marginBottom: '14px',
}}>
  Section Name
</h2>
```

---

## Stat Labels (inline row style)

Labels next to a stat value (e.g. in player detail stats box):

```tsx
<span style={{
  fontFamily: 'var(--font-mono)',
  fontSize: '0.68rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#504270',
}}>
  Label
</span>
```

---

## Position Badges (Game History)

Badges are small pill-shaped labels with background + border, `borderRadius: '4px'`, `padding: '2px 7px'`.

| Position | Text | Color | Background | Border |
|---|---|---|---|---|
| 1st | `WINNER` | `#4a9e6b` | `rgba(74,158,107,0.12)` | `rgba(74,158,107,0.35)` |
| 2nd–5th | `2ND PLACE` etc. | `#e05535` | `rgba(224,85,53,0.1)` | `rgba(224,85,53,0.3)` |

Font: `var(--font-mono)`, `0.68rem`, weight 700 for WINNER / 600 for others, letterSpacing `0.05em`.

---

## Filter Pills (Games page)

- Label pill (MAP-SELECTION, EXPANSION-SELECTION): dark blue bg/border, uppercase, bold, `borderRadius: '4px'`
- Option pills: transparent bg by default, dark blue when active, `borderRadius: '4px'`
- Options always appear **below** their label on a new line

---

## Win Rate Color Thresholds

Used on player leaderboard and player detail:

| Rate | Color |
|---|---|
| ≥ 50% | `#4a9e6b` (green) |
| > 0% | `#c9a030` (gold) |
| 0% | `#625c7c` (dim) |

Card win rate thresholds (used on /cards list and card detail):

| Rate | Color |
|---|---|
| ≥ 50% | `#4a9e6b` (green) |
| > 33% | `#c9a030` (gold) |
| ≤ 33% | `#e05535` (red) |

Corporation win rate thresholds (used on corp pages):

| Rate | Color |
|---|---|
| ≥ 60% | `#4a9e6b` (green) |
| ≥ 40% | `#c9a030` (gold) |
| < 40% | `#e05535` (red) |

---

## Panel / Card Style

```tsx
background: '#1e1835'
border: '1px solid #282042'
borderRadius: '6px'
```

Hover state (interactive panels): `background: '#282042'`

---

## Expansion Icons

All expansion icons live in `public/expansions/` and are mapped in `src/lib/expansions.ts`.
Always import `EXPANSION_ICONS` from there — never hardcode paths inline.
`MAP_PILL`, `ALL_MAPS`, and `ALL_EXPANSIONS` are also exported from that file.

---

## Tag Icons

All tag icons live in `public/tags/` and are mapped as `TAG_ICONS` in `src/lib/expansions.ts`.
Use the `<Tag />` component (`src/components/ui/Tag.tsx`) to render tags — it handles icon vs. text badge fallback automatically.

---

## Card Type Colors

Used consistently across `/cards`, `/cards/:name`, `GameDetail`, and `CardReferenceAdmin`:

| Type | Color | Background |
|---|---|---|
| Automated | `#4a9e6b` (green) | `rgba(74,158,107,0.1)` |
| Active | `#5b8dd9` (blue) | `rgba(91,141,217,0.1)` |
| Event | `#e05535` (red) | `rgba(224,85,53,0.1)` |
| Corporation | `#c9a030` (gold) | `rgba(201,160,48,0.1)` |
| Prelude | `#ad1457` (pink) | `rgba(173,20,87,0.1)` |
| CEO | `#d07832` (orange) | `rgba(210,120,50,0.1)` |

---

## CEO Badge

Used inline next to player names (e.g. `/games` list):

```tsx
<span style={{
  fontFamily: 'var(--font-mono)',
  fontSize: '0.65rem',
  color: '#d07832',
  background: 'rgba(210,120,50,0.1)',
  border: '1px solid rgba(210,120,50,0.3)',
  borderRadius: '4px',
  padding: '1px 6px',
}}>
  Apollo
</span>
```

---

## Merger Corporation Formatting

When a player used the Merger promo, corporations are stored as `"Corp1, Corp2"` in the DB.
Always format for display using:

```ts
function formatCorp(corp: string) {
  const parts = corp.split(', ')
  if (parts.length === 1) return corp
  return parts.join(' + ') + ' (Merger)'
}
```

Example: `"Credicor, Inventrix"` → `"Credicor + Inventrix (Merger)"`
