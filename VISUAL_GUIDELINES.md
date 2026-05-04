# Visual Guidelines — TM Scoring Statistics

Behavioral rules for building new UI. For design tokens, typography scale, card frame anatomy, and component inventory see **`VISUAL_GUIDE.md`**.

---

## Tables (`<DataTable>`)

### Column alignment

**All columns use `align: 'center'` except the first (name/label) column.**

The first column is always left-aligned. Every other column — numbers, rates, tags, icons, actions — is center-aligned.

```ts
// Correct
const columns = [
  { key: 'name',     label: 'Card',    align: 'left'   },
  { key: 'plays',    label: 'Plays',   align: 'center' },
  { key: 'win_rate', label: 'Win %',   align: 'center' },
  { key: 'avg_vp',   label: 'Avg VP',  align: 'center' },
]
```

### Win rate format

Win rates are displayed as **`X%`** — a rounded integer with a percent sign, no decimal places.

Below the percentage, show the raw count as `(W / G)` in a smaller muted color:

```tsx
render: row => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontWeight: 600 }}>{Math.round(row.win_rate * 100)}%</div>
    <div style={{ fontSize: '0.72rem', color: 'var(--text-4)' }}>
      {row.wins} / {row.games}
    </div>
  </div>
)
```

### Number formatting

| Value type | Format | Example |
|------------|--------|---------|
| Win rate | `X%` | `67%` |
| Average score | One decimal | `87.3` |
| Average VP | One decimal | `4.1` |
| Play count | Integer | `42` |
| Cost (MC) | Integer | `18` |

### Sort indicators

Always pass both `sortKey` + `sortDir` + `onSort` together. Sort arrows are suppressed by `<DataTable>` when `onSort` is absent — but a column marked `sortable: true` without an `onSort` handler is misleading; don't do it.

### Compact mode

Use `compact` prop on tables inside detail pages (e.g., cards-played list on a Player Detail page). Use full size on standalone list pages.

---

## Filter Pills (`<FilterPill>`)

- All filter pills use the same height and border-radius — never custom-size individual pills.
- Active pill: filled background (type/accent color). Inactive pill: transparent with subtle border.
- Group related pills on one row with a label at the left. One row per filter category.
- "All" / clear option is always the first pill in a group.
- Pills that represent a catch-all bucket (e.g., "Other" for placement VP) should be labeled concisely — don't list all members in the pill label.

---

## Percentage Display

When showing a percentage alongside a count, the hierarchy is:

1. The **percentage** is the headline — large, weighted
2. The **raw fraction** (wins/total or plays/total) is the supporting detail — small, muted

Never show a fraction without also showing the derived percentage, and never show a percentage without the fraction nearby.

---

## Color Semantics

These colors carry fixed meaning and must not be repurposed:

| Color | Hex | Always means |
|-------|-----|-------------|
| Forest Green | `#4a9e6b` | Win / first place / positive outcome |
| Mars Red | `#e05535` | Loss / last place / negative outcome / Event cards |
| Gold | `#c9a030` | Score, VP, money |
| Sky Blue | `#5b8dd9` | Active card type / neutral highlight |
| Prelude Pink | `#d46496` | Prelude card type |
| CEO Orange | `#d07832` | CEO card type |
| Corp Gold | `#c9a030` | Corporation card type |

Do not use green for anything other than wins/positive outcomes, and do not use red for anything other than losses/negative outcomes.

---

## Expansion Icons

Always use `EXPANSION_ICONS` from `src/lib/expansions.ts` — never hardcode icon paths. Expansion icon size in tables and pills: 16×16px. In card frames and headers: 20×20px.

---

## Tag Icons

Always use `TAG_ICONS` from `src/lib/expansions.ts`. No-tag state uses `NO_TAG_ICON` (the sentinel value `NO_TAG = '__no_tag__'`). Never show an empty space where a tag icon should be — use the no-tag icon.

---

## Card Type Badges

Use `TYPE_COLORS` from `src/lib/expansions.ts` for all type badge styling:

```tsx
import { TYPE_COLORS } from '../lib/expansions'

const colors = TYPE_COLORS[card.card_type] ?? { bg: 'transparent', color: 'var(--text-3)' }
<span style={{ background: colors.bg, color: colors.color, ... }}>
  {card.card_type}
</span>
```

Never define a local copy of these colors.

---

## New Pages Checklist

When adding a new page or table, verify:

- [ ] First column left-aligned, all others center-aligned
- [ ] Win rates shown as `X%` with `(W/G)` subscript
- [ ] Numbers formatted consistently (see table above)
- [ ] Colors from `TYPE_COLORS` / `TAG_ICONS` / `EXPANSION_ICONS` — no local copies
- [ ] Filter state in URLSearchParams (bookmarkable)
- [ ] `parseListParam` / `writeListParam` for multi-value params
- [ ] No hardcoded theme colors — CSS custom properties only
- [ ] `<DataTable compact>` for detail sub-tables, full size for list pages
