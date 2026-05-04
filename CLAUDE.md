# CLAUDE.md — Conventions & Domain Knowledge

This file documents conventions, patterns, and domain rules for this codebase. Update it after major refactors or whenever a new pattern is established — not after every small change.

---

## Single Source of Truth

All shared constants live in **`src/lib/expansions.ts`**. Never duplicate them in page files.

| Export | Purpose |
|--------|---------|
| `ALL_EXPANSIONS` | Expansions shown in the Games filter and selectable when recording a game (does not include 'Base') |
| `CARD_EXPANSIONS` | Expansion origins used in the Card Reference admin (includes 'Base') |
| `UNOFFICIAL_EXPANSIONS` | Set of fan expansion names: `Ares`, `CEO`, `The Moon`, `Pathfinders` |
| `PROJECT_CARD_TYPES` | `['Automated', 'Active', 'Event']` — use everywhere instead of local arrays |
| `TYPE_COLORS` | Card type → `{ bg, color }` — import this, never define locally |
| `MULTIPLIER_VP_TYPES` | VP types that multiply by a tag/city count |
| `PLACEMENT_VP_TYPES` | VP types awarded for tile placement |
| `normalizeExpansion()` | Maps legacy DB values to canonical names |

---

## Expansion Name Rules

Canonical names used throughout the codebase:

| Canonical | Legacy DB value (do not use in code) |
|-----------|--------------------------------------|
| `'The Moon'` | `'Moon'` |
| `'Venus Next'` | `'Venus'` |

`normalizeExpansion()` is applied **once at query load time** in `src/lib/queries.ts`. Downstream code always receives canonical names — never normalize again in components.

---

## VP Category Model

There are four VP categories. Each card has at most one.

| Category | How it works | Filter sentinel |
|----------|-------------|-----------------|
| Base VP | Fixed numeric VP (e.g. `base_vp = 3`) | — |
| Resource VP | VP per resource on the card (Animal, Microbe, etc.) | resource type string |
| Placement VP | VP for placing a tile (City-tile, Greenery, etc.) | `'__placement__'` |
| Multiplier VP | VP per tag or city count (Venus, Jovian, Moon, etc.) | `'__multiplier__'` |

`PLACEMENT_VP_TYPES` and `MULTIPLIER_VP_TYPES` are both in `expansions.ts`.

Legacy DB values for Multiplier: `'Jovian-tag'`, `'Moon-tag'`, `'Venus-tag'` — these are handled in the admin by `LEGACY_MULTIPLIER_TYPES` and are functionally equivalent to `'Jovian'`, `'Moon'`, `'Venus'`.

---

## URL Parameter Patterns

Use `parseListParam` / `writeListParam` from **`src/lib/filterUtils.ts`** for all multi-value URL params. Never write this logic inline.

```ts
// reading
const tags = parseListParam(params.get('tags'))   // string[]

// writing
writeListParam(next, 'tags', selectedTags)         // sets or deletes the key
```

Filter state lives in `URLSearchParams` (via `useSearchParams`) so filters are bookmarkable and shareable.

---

## Data Flow

```
Supabase DB
  └── queries.ts         ← normalizeExpansion() applied here
        └── TanStack Query (useQuery)
              └── page components
                    └── filter state (URLSearchParams)
                          └── derived filtered rows (useMemo)
```

Never fetch data inside components directly — always go through the query functions in `queries.ts`.

---

## Pool Isolation for Affinity / Stats

Stats are computed against the correct pool depending on card type:

| Card type | Pool |
|-----------|------|
| Project (Automated / Active / Event) | All project cards from all games |
| Corporation | Corporation pool only |
| Prelude | Prelude pool only |
| CEO | CEO pool only |

Affinity formula: `(playerPlays / playerTotal) / (poolCount / poolTotal)` — a ratio above 1.0 means the player picks this card more than average.

---

## Key "Don't Do This" Rules

- **Don't duplicate expansion lists.** `ALL_EXPANSIONS` and `CARD_EXPANSIONS` cover both use cases.
- **Don't normalize expansion names in components.** `normalizeExpansion()` runs once in `queries.ts`.
- **Don't define local `TYPE_COLORS`.** Import from `expansions.ts`.
- **Don't define `PROJECT_CARD_TYPES` / `UNOFFICIAL_EXPANSIONS` locally.** Import from `expansions.ts`.
- **Don't inline `parseListParam` / `writeListParam`.** Use `filterUtils.ts`.
- **Don't hardcode theme colors.** Use CSS custom properties (`--bg-panel`, `--text-2`, etc.). Semantic accent colors (Mars Red, Forest Green) are the only exception.
- **Don't add sort arrows to `<DataTable>` without passing `onSort`.** The component guards against this but always wire both together.

---

## Admin Authentication

The admin is guarded by `AdminGuard.tsx`. Authentication state is stored in `sessionStorage` (key: `tm_admin_auth`). The guard redirects unauthenticated users to `/admin/login`. There is no server-side role enforcement — the guard is client-only.

---

## When to Update This File

Update `CLAUDE.md` when:
- A new shared constant is added to `expansions.ts` or a new utility module is created
- A new architectural pattern is established (e.g., a new query shape, a new filter convention)
- A "don't do this" mistake is discovered and fixed

Do **not** update it for:
- Bug fixes or UI tweaks
- Adding new cards to the reference database
- Routine page additions that follow existing patterns
