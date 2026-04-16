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

| Position | Text | Color |
|---|---|---|
| 1st | `WINNER` | `#4a9e6b` (green) |
| 2nd | `2ND PLACE` | `#e05535` (red) |
| 3rd | `3RD PLACE` | `#e05535` (red) |
| 4th | `4TH PLACE` | `#e05535` (red) |
| 5th | `5TH PLACE` | `#e05535` (red) |

Font: `var(--font-mono)`, weight 700 for WINNER, letterSpacing `0.05em`.

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
