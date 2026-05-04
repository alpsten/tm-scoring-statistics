# Terraforming Mars — Scoring Statistics

A fan-made statistics tracker for the board game **Terraforming Mars**. Records game sessions, tracks scores over time, and surfaces insights about players, corporations, cards, milestones, and awards.

> **Fan project — not affiliated with, endorsed by, or sponsored by FryxGames in any way.** All Terraforming Mars intellectual property belongs to FryxGames.

---

## What is this?

A web application built for physical (and digital) Terraforming Mars groups who want to keep a proper record of their games. Once you log a session you get:

- Full score breakdowns per game (TR, milestones, awards, greeneries, cities, cards)
- Win rates and score trends per player and corporation
- Card play frequency and affinity stats
- Milestone and award claim/funding rates
- A printable score sheet to fill in during the game

It started as a passion project — our group never wrote down scores during physical games, so stats just disappeared. This fixes that.

**Note:** The card reference is still being filled in, some cards display oddly, and the app is under active development. Stats are fun, but take them with a grain of salt.

---

## For visitors — just browsing

If someone has shared a link to a running instance, everything is publicly readable — no account needed. You can explore all games, players, cards and stats freely. Only adding or editing data requires a login.

---

## Setting up your own instance

This section is for people who want to run the app for their own playgroup. It requires some basic familiarity with the command line and web development tools. If that sounds daunting, feel free to reach out — a more beginner-friendly guide may come later.

### What you will need

- **Node.js 20+** — the runtime that builds the app ([nodejs.org](https://nodejs.org))
- **A Supabase account** — free tier is more than enough. Supabase is a hosted database service that the app uses to store all game data ([supabase.com](https://supabase.com))
- **A GitHub account** — if you want to deploy to GitHub Pages for free

### Step 1 — Fork and clone the repo

Fork this repository to your own GitHub account, then clone it locally:

```bash
git clone https://github.com/<your-username>/tm-scoring-statistics.git
cd tm-scoring-statistics
npm install
```

### Step 2 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Once it's ready, go to **Project Settings → API** and copy your **Project URL** and **anon public key**

### Step 3 — Create the database tables

In your Supabase project, go to **SQL Editor** and run the schema below to create all the tables the app needs:

```sql
-- Core game tables
create table game_sessions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  map_name text,
  player_count int,
  generations int,
  turn_order text[],
  game_number int
);

create table player_results (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references game_sessions(id) on delete cascade,
  player_name text,
  position int,
  corporation text,
  corporation_2 text,
  tr int, milestone_vp int, award_vp int,
  greenery_vp int, city_vp int, card_vp int,
  total_vp int, mc int,
  key_notes text
);

create table game_expansions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references game_sessions(id) on delete cascade,
  expansion_name text
);

create table game_colonies (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references game_sessions(id) on delete cascade,
  colony_name text
);

create table game_milestones (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references game_sessions(id) on delete cascade,
  milestone_name text,
  player_name text,
  claimed_order int
);

create table game_awards (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references game_sessions(id) on delete cascade,
  award_name text,
  funder_name text,
  funded_order int,
  winner_name text,
  winner_name_2 text,
  second_name text,
  second_name_2 text
);

create table parameter_contributions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references game_sessions(id) on delete cascade,
  player_name text,
  temperature_steps int default 0,
  oxygen_steps int default 0,
  ocean_steps int default 0,
  venus_steps int default 0,
  habitat_steps int default 0,
  mining_steps int default 0,
  logistics_steps int default 0
);

create table cards_played (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references game_sessions(id) on delete cascade,
  player_name text,
  card_name text,
  vp_from_card int,
  generation int
);

-- Card reference library
create table card_reference (
  id uuid primary key default gen_random_uuid(),
  card_name text unique,
  card_type text,
  cost int,
  tags text,
  base_vp int,
  vp_type text,
  vp_per text,
  resource_type text,
  description text
);

create table card_expansions (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references card_reference(id) on delete cascade,
  expansion text
);

-- Player profiles and notes
create table player_profiles (
  id uuid primary key default gen_random_uuid(),
  player_name text unique,
  preferred_color text,
  display_name text
);

create table site_notes (
  id uuid primary key default gen_random_uuid(),
  category text,
  content text,
  created_at timestamptz default now()
);
```

### Step 4 — Enable Row Level Security

Still in the SQL Editor, run this to lock down writes to authenticated users only while keeping everything publicly readable:

```sql
-- Enable RLS
alter table game_sessions           enable row level security;
alter table player_results          enable row level security;
alter table game_expansions         enable row level security;
alter table game_colonies           enable row level security;
alter table game_milestones         enable row level security;
alter table game_awards             enable row level security;
alter table parameter_contributions enable row level security;
alter table cards_played            enable row level security;
alter table card_reference          enable row level security;
alter table card_expansions         enable row level security;
alter table player_profiles         enable row level security;
alter table site_notes              enable row level security;

-- Public read
create policy "public read" on game_sessions           for select using (true);
create policy "public read" on player_results          for select using (true);
create policy "public read" on game_expansions         for select using (true);
create policy "public read" on game_colonies           for select using (true);
create policy "public read" on game_milestones         for select using (true);
create policy "public read" on game_awards             for select using (true);
create policy "public read" on parameter_contributions for select using (true);
create policy "public read" on cards_played            for select using (true);
create policy "public read" on card_reference          for select using (true);
create policy "public read" on card_expansions         for select using (true);
create policy "public read" on player_profiles         for select using (true);
create policy "public read" on site_notes              for select using (true);

-- Authenticated write
create policy "auth insert" on game_sessions           for insert with check (auth.role() = 'authenticated');
create policy "auth insert" on player_results          for insert with check (auth.role() = 'authenticated');
create policy "auth insert" on game_expansions         for insert with check (auth.role() = 'authenticated');
create policy "auth insert" on game_colonies           for insert with check (auth.role() = 'authenticated');
create policy "auth insert" on game_milestones         for insert with check (auth.role() = 'authenticated');
create policy "auth insert" on game_awards             for insert with check (auth.role() = 'authenticated');
create policy "auth insert" on parameter_contributions for insert with check (auth.role() = 'authenticated');
create policy "auth insert" on cards_played            for insert with check (auth.role() = 'authenticated');
create policy "auth insert" on card_reference          for insert with check (auth.role() = 'authenticated');
create policy "auth insert" on card_expansions         for insert with check (auth.role() = 'authenticated');
create policy "auth insert" on player_profiles         for insert with check (auth.role() = 'authenticated');
create policy "auth insert" on site_notes              for insert with check (auth.role() = 'authenticated');

create policy "auth update" on game_sessions           for update using (auth.role() = 'authenticated');
create policy "auth update" on player_results          for update using (auth.role() = 'authenticated');
create policy "auth update" on game_expansions         for update using (auth.role() = 'authenticated');
create policy "auth update" on game_colonies           for update using (auth.role() = 'authenticated');
create policy "auth update" on game_milestones         for update using (auth.role() = 'authenticated');
create policy "auth update" on game_awards             for update using (auth.role() = 'authenticated');
create policy "auth update" on parameter_contributions for update using (auth.role() = 'authenticated');
create policy "auth update" on cards_played            for update using (auth.role() = 'authenticated');
create policy "auth update" on card_reference          for update using (auth.role() = 'authenticated');
create policy "auth update" on card_expansions         for update using (auth.role() = 'authenticated');
create policy "auth update" on player_profiles         for update using (auth.role() = 'authenticated');
create policy "auth update" on site_notes              for update using (auth.role() = 'authenticated');

create policy "auth delete" on game_sessions           for delete using (auth.role() = 'authenticated');
create policy "auth delete" on player_results          for delete using (auth.role() = 'authenticated');
create policy "auth delete" on game_expansions         for delete using (auth.role() = 'authenticated');
create policy "auth delete" on game_colonies           for delete using (auth.role() = 'authenticated');
create policy "auth delete" on game_milestones         for delete using (auth.role() = 'authenticated');
create policy "auth delete" on game_awards             for delete using (auth.role() = 'authenticated');
create policy "auth delete" on parameter_contributions for delete using (auth.role() = 'authenticated');
create policy "auth delete" on cards_played            for delete using (auth.role() = 'authenticated');
create policy "auth delete" on card_reference          for delete using (auth.role() = 'authenticated');
create policy "auth delete" on card_expansions         for delete using (auth.role() = 'authenticated');
create policy "auth delete" on player_profiles         for delete using (auth.role() = 'authenticated');
create policy "auth delete" on site_notes              for delete using (auth.role() = 'authenticated');
```

Also go to **Authentication → Providers → Email** and disable **"Allow new users to sign up"** — then create your admin account manually in **Authentication → Users** before disabling it. This ensures only you can log in.

### Step 5 — Configure environment variables

Create a `.env.local` file in the project root:

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

### Step 6 — Run locally

```bash
npm run dev
```

Open [http://localhost:5173/tm-scoring-statistics/](http://localhost:5173/tm-scoring-statistics/) in your browser.

### Step 7 — Deploy to GitHub Pages (optional)

```bash
npm run build
```

Then push to your fork and enable GitHub Pages in your repository settings, pointing at the `dist` folder or using a GitHub Actions workflow.

---

## Importing from the online TM app

If your group plays on [terraforming-mars.herokuapp.com](https://terraforming-mars.herokuapp.com), you can import game data directly from the game log instead of entering it manually.

**How it works:**

1. After a game ends, open the game log in the online app — it contains a full play-by-play of every card played, milestone claimed, and award funded
2. Copy the entire log text
3. In the admin panel, go to **Parse Log** and paste it in
4. The parser extracts players, cards played per generation, milestones, and awards and shows you a preview before saving
5. You still fill in the score breakdown (VP totals) manually on the Add Game screen — the log does not contain final scores

The parser handles known encoding issues and card name differences between the online app and the card reference. Some milestone variants require a manual disambiguation step since the log output is ambiguous.

---

## Pages

### Public

| Route | Page | What it shows |
|-------|------|---------------|
| `/` | Dashboard | Recent games, top stats, quick links |
| `/games` | Games | Full game log with filters |
| `/games/:id` | Game detail | Complete breakdown of one session |
| `/players` | Players | All players, win rates, scores |
| `/players/:name` | Player detail | Card affinity, corp history, score trends |
| `/cards` | Cards | Card reference with play and win rate stats |
| `/cards/:name` | Card detail | Who played it, in which games, VP contributed |
| `/corporations` | Corporations | Win rates and score averages per corporation |
| `/ceos` | CEOs | CEO card stats |
| `/ma` | Milestones & Awards | Claim and funding rates |
| `/leaderboard` | Leaderboard | All-time player standings |
| `/scoresheet` | Score sheet | Printable score sheet for physical games |
| `/notes` | Notes | Session notes |

### Admin (login required)

| Route | Page | What it does |
|-------|------|--------------|
| `/admin` | Dashboard | Links to all admin tools |
| `/admin/add-game` | Add game | Record a new session |
| `/admin/cards/reference` | Card reference | Add and edit the card library |
| `/admin/parse-log` | Parse log | Import game data from a log format |
| `/admin/player-profile` | Player profiles | Edit player names and profile info |

---

## Assets and intellectual property

The source code in this repository is released under the MIT license — see `LICENSE` for details.

Some visual assets used in the app (icons, frames, and graphical elements) are derived from or inspired by the Terraforming Mars board game and the open-source community project [terraforming-mars/terraforming-mars](https://github.com/terraforming-mars/terraforming-mars). These assets are **not** covered by the MIT license and remain the property of their respective owners.

This project is non-commercial and fan-made. It is not affiliated with FryxGames in any way.

---

## Acknowledgements

### FryxGames

A heartfelt thank you to **FryxGames** for creating Terraforming Mars — one of the greatest board games ever made. This project exists entirely because of the joy their game has brought to our table. If you haven't played it, [go get a copy](https://fryxgames.se/).

> This application is a fan project and is **not affiliated with, endorsed by, or sponsored by FryxGames** in any way. All Terraforming Mars intellectual property belongs to FryxGames.

### terraforming-mars community

The card icons, tag icons, expansion icons, and resource icons used throughout this application were sourced from and inspired by the incredible open-source community project:

**[terraforming-mars/terraforming-mars](https://github.com/terraforming-mars/terraforming-mars)**

This project would not look the way it does without the work of every contributor there. Thank you.

---

## Disclaimer

This is a personal, non-commercial fan project. All game content, card names, corporation names, and related intellectual property belong to their respective owners.
