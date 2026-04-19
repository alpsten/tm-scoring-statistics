# Visual Guide — TM Scoring Statistics

## Design Philosophy

Clean, minimal, high-contrast — the precision of a Terraforming Mars card translated into a data dashboard. Think Apple attention to detail applied to a board game stats tracker: every element earns its place, nothing decorative without purpose.

---

## Theme System

All themeable colors live as CSS custom properties in `src/index.css`. The app uses a single dark neutral theme, defined on `:root`.

### Background tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-body` | `#111111` | `<html>` / `<body>` |
| `--bg-main` | `#141414` | Main content area |
| `--bg-sidebar` | `#1a1a1a` | Sidebar |
| `--bg-panel` | `#1e1e1e` | Cards, tables, panels |
| `--bg-row` | `#1c1c1c` | Table rows (default) |
| `--bg-row-hover` | `#252525` | Table rows (hover) |
| `--bg-input` | `#1c1c1c` | Input fields |

### Border tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--bd-sidebar` | `#2a2a2a` | Sidebar dividers |
| `--bd-panel` | `#2a2a2a` | Panel / table borders |
| `--bd-input` | `#2e2e2e` | Input field borders |
| `--bd-secondary` | `#3a3a3a` | Secondary / inner borders |

### Text tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--text-1` | `#e8e6e3` | Primary text, headings |
| `--text-2` | `#b0aeaa` | Secondary text, values |
| `--text-3` | `#888888` | Links, tertiary text |
| `--text-4` | `#606060` | Labels, captions, column headers |
| `--text-5` | `#484848` | Faintest text, placeholders |
| `--sort-active` | `#e8e6e3` | Active sort column indicator |

---

## Functional Accent Colors

These carry semantic meaning and should not be replaced with theme tokens.

| Name | Hex | Light variant | Dark variant | Usage |
|------|-----|---------------|--------------|-------|
| Mars Red | `#e05535` | `#ff7755` | `#b83018` | Losses, last place, Event cards |
| Forest Green | `#4a9e6b` | `#76bf90` | `#2a7048` | Wins, first place, Automated cards |
| Sky Blue | `#5b8dd9` | `#80aff5` | `#3568b5` | Active cards |
| Gold | `#c9a030` | `#e8c050` | `#9a7818` | VP, scores, Corporation cards |
| Prelude Pink | `#d46496` | `#f084b8` | `#a84070` | Prelude cards |
| CEO Orange | `#d07832` | `#f09852` | `#a85820` | CEO cards |

Light/dark variants are used for the gradient accent stripes on the card frame only.

---

## Typography

Three fonts, each with a distinct role. Defined in `src/index.css` `@theme` and available as Tailwind utility classes.

| Role | Font | Tailwind class | CSS var | Usage |
|------|------|----------------|---------|-------|
| Display | Exo 2 | `font-display` | `--font-display` | Page titles, card names, section headings |
| Monospace | Space Mono | `font-mono` | `--font-mono` | Numbers, stats, badges, column data |
| Body | Outfit | `font-body` | `--font-body` | Navigation, prose, labels, UI copy |

**Scale guidance**

| Element | Size | Font | Weight | Notes |
|---------|------|------|--------|-------|
| Page title | `1.6rem` | Display | 700 | `letter-spacing: -0.01em` |
| Section heading | `0.82rem` | Display | 600 | Uppercase, `tracking-[0.1em]` |
| Column header | `0.68rem` | Body | 600 | Uppercase, `tracking-[0.08em]` |
| Table value | `0.83–0.9rem` | Mono | 400–700 | |
| Stat label | `0.72rem` | Body | 500 | Uppercase, `tracking-[0.06em]` |
| Caption / note | `0.73–0.78rem` | Body | 400 | Italic for disclaimers |

---

## Card Frame Anatomy

The TM card frame uses its own light metallic treatment so it looks like a physical card against the dark app chrome.

```
┌─────────────────────────────────────────┐  ← type-color border (3px solid)
│  [cost]  CARD NAME              [tags]  │  ← silver metallic header
│          (uppercase, dark text)         │    gradient: #b0b0b0 → #dedede
├═════════════════════════════════════════╡  ← accent stripe (16px, gradient)
│                                         │    light → type-color → dark variant
│                card text                │  ← pure white body (#ffffff)
│                                         │
├═════════════════════════════════════════╡  ← accent stripe (12px, portrait only)
│  [expansion icons]             [VP ●]   │  ← silver metallic footer
└─────────────────────────────────────────┘    gradient: #bcbcbc → #e8e8e8
```

| Card type | Orientation | Width | Aspect ratio |
|-----------|-------------|-------|--------------|
| Automated, Active, Event, CEO | Portrait | 240px | 5:7 |
| Corporation, Prelude | Landscape | 336px | 7:5 |

**Rules:**
- MC cost badge (gold square) — top-left; hidden for landscape cards and CEO type
- Tags — top-right, pushed with `margin-left: auto`
- Landscape cards: one accent stripe (top only)
- Portrait cards: two accent stripes (top + bottom)
- Card name: uppercase, truncated with ellipsis

---

## Using Theme Tokens

### In Tailwind (preferred for new/refactored components)
```tsx
<div className="bg-[var(--bg-panel)] border border-[var(--bd-panel)] text-[var(--text-1)]">
```

### In inline styles (complex layouts, dynamic values)
```tsx
<div style={{ background: 'var(--bg-panel)', color: 'var(--text-1)' }}>
```

### Never hardcode themeable colors
```tsx
// ✗ bypasses theme tokens
<div style={{ background: '#f5f5f5', color: '#1c1c1c' }}>

// ✓ correct
<div style={{ background: 'var(--bg-panel)', color: 'var(--text-1)' }}>
```

### Hardcoding accent colors is fine — they are semantic, not themeable
```tsx
// ✓ correct — green always means a win
<span style={{ color: '#4a9e6b' }}>WINNER</span>
```

---

## Component Inventory

| Component | File | Tailwind | Status |
|-----------|------|----------|--------|
| `<StatCard>` | `components/ui/StatCard.tsx` | Partial | Stable |
| `<PositionBadge>` | `components/ui/PositionBadge.tsx` | ✓ | Stable |
| `<Tag>` | `components/ui/Tag.tsx` | — | Stable |
| `<PageHeader>` | `components/ui/PageHeader.tsx` | — | Stable |
| `<DataTable>` | `components/ui/DataTable.tsx` | ✓ | Stable |
| `<FilterPill>` | `components/ui/FilterPill.tsx` | ✓ | Stable |
| `<EmptyState>` | `components/ui/EmptyState.tsx` | ✓ | Stable |
| `<SectionHeading>` | `components/ui/SectionHeading.tsx` | ✓ | Stable |
| `<CardFrame>` | `components/ui/CardFrame.tsx` | — | Stable |

---

## Naming Conventions

- Component files: `PascalCase.tsx`
- Hook / utility files: `camelCase.ts`
- CSS token names: `--bg-*` (backgrounds), `--bd-*` (borders), `--text-*` (text)
- Pages: `src/pages/PascalCase.tsx`
- Admin pages: `src/pages/admin/PascalCase.tsx`
