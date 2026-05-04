# Terraforming Mars — Scoring Statistics

A fan-made statistics tracker for the board game **Terraforming Mars**. Records game sessions, tracks scores over time, and surfaces insights about players, corporations, cards, milestones, and awards.

---

## Tech Stack

| Layer | Library / Tool | Version |
|-------|---------------|---------|
| UI framework | React + TypeScript + Vite | React 19, TS 6 |
| Routing | React Router v7 | — |
| Data fetching | TanStack Query v5 | — |
| Forms | React Hook Form + Zod | — |
| Charts | Recharts | v3 |
| Database / Auth | Supabase (PostgreSQL) | — |
| Styling | Tailwind CSS v4 + CSS custom properties | — |

---

## Running Locally

### Prerequisites

- Node.js 20+
- A Supabase project (free tier is fine)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env        # or create .env manually

# 3. Fill in your Supabase credentials
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# 4. Start the dev server
npm run dev
```

### Build for production

```bash
npm run build    # type-checks then bundles
npm run preview  # serves the built output locally
```

The app is configured for GitHub Pages deployment at the `/tm-scoring-statistics/` base path (see `vite.config.ts`).

---

## Supabase Setup

The app uses two categories of data in Supabase:

### Play data (recorded per game)

These tables are populated via the Admin panel:

| Table | Description |
|-------|-------------|
| `games` | One row per game session — date, map, players, score totals |
| `game_expansions` | Which expansions were active for each game |
| `game_players` | Per-player results for each game (score breakdown, corporation, etc.) |
| `game_player_cards` | Cards played by each player in each game |
| `milestones` | Milestones claimed per game |
| `awards` | Awards funded per game |
| `parameters` | Oxygen, temperature, ocean, Venus progress contributions |

### Card reference data (maintained via Admin → Card Reference)

These tables define the card library that play data links against:

| Table | Description |
|-------|-------------|
| `card_reference` | One row per card — name, type, cost, tags, VP info, expansion |
| `card_expansions` | Many-to-many: which expansion(s) each card belongs to |

Card reference data is not automatically populated — it must be entered manually through the admin panel or imported. The play data tables reference cards by name, so a card must exist in `card_reference` before its stats appear correctly.

---

## Page Overview

### Public pages

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Dashboard | High-level snapshot — recent games, top stats, quick links |
| `/games` | Games | Full game log with expansion and map filters |
| `/games/:id` | Game Detail | Complete breakdown of one game session |
| `/players` | Players | Leaderboard of all players, win rates, scores |
| `/players/:id` | Player Detail | Deep dive per player — card affinity, corp history, score trends |
| `/cards` | Cards | Browsable card reference with play/win rate stats; filterable by type, tag, expansion, VP |
| `/cards/:id` | Card Detail | Stats for one card — who played it, in which games, VP contributed |
| `/corporations` | Corporations | Corporation win rates and score averages |
| `/ceos` | CEOs | CEO card stats (CEO expansion) |
| `/milestones-awards` | Milestones & Awards | Claim rates, funding rates, and winner correlations |
| `/leaderboard` | Leaderboard | Ranked view of all-time player standings |
| `/notes` | Notes | Freeform session notes attached to games |

### Admin pages (password-protected)

| Route | Page | Purpose |
|-------|------|---------|
| `/admin` | Admin Dashboard | Links to all admin tools |
| `/admin/add-game` | Add Game | Record a new game session |
| `/admin/cards/reference` | Card Reference | Add and edit cards in the reference library |
| `/admin/parse-log` | Parse Log | Import game data from a structured log format |
| `/admin/player-profile` | Player Profile | Edit player display names and profile info |

---

## Acknowledgements

### FryxGames

A heartfelt thank you to **FryxGames** for creating Terraforming Mars — one of the greatest board games ever made. This project exists entirely because of the joy their game has brought to our table. If you haven't played it, [go get a copy](https://fryxgames.se/).

> This application is a fan project and is **not affiliated with, endorsed by, or sponsored by FryxGames** in any way. All Terraforming Mars intellectual property belongs to FryxGames.

### terraforming-mars community

The card icons, tag icons, expansion icons, and resource icons used throughout this application were sourced from and inspired by the incredible open-source community project:

**[terraforming-mars/terraforming-mars](https://github.com/terraforming-mars/terraforming-mars)**

This project would not look the way it does without the work of every contributor there. Thank you for building such a comprehensive digital implementation of the game, and for making your assets available to the community.

---

## Disclaimer

This is a personal, non-commercial fan project. All game content, card names, corporation names, and related intellectual property belong to their respective owners.
