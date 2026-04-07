-- ─── Terraforming Mars Statistics — Initial Schema ────────────────────────────
-- Run this in your Supabase SQL editor (or via supabase db push).

-- ─── Enable UUID extension ────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Game sessions ────────────────────────────────────────────────────────────
create table if not exists game_sessions (
  id            text primary key default 'G' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 4),
  date          date        not null,
  player_count  smallint    not null check (player_count between 1 and 6),
  generations   smallint,
  map_name      text        not null,
  notes         text,
  game_code     text,
  created_at    timestamptz not null default now()
);

-- ─── Player results ───────────────────────────────────────────────────────────
create table if not exists player_results (
  id            uuid primary key default gen_random_uuid(),
  game_id       text        not null references game_sessions(id) on delete cascade,
  player_name   text        not null,
  corporation   text        not null,
  tr            smallint    not null default 0,
  milestone_vp  smallint    not null default 0,
  award_vp      smallint    not null default 0,
  greenery_vp   smallint    not null default 0,
  city_vp       smallint    not null default 0,
  card_vp       smallint    not null default 0,
  habitat_vp    smallint,                            -- Moon expansion
  logistics_vp  smallint,                            -- Moon expansion
  mining_vp     smallint,                            -- Moon expansion
  total_vp      smallint    not null,
  position      smallint    not null check (position >= 1),
  key_notes     text
);

-- ─── Game expansions (one row per expansion per game) ─────────────────────────
create table if not exists game_expansions (
  id             uuid primary key default gen_random_uuid(),
  game_id        text not null references game_sessions(id) on delete cascade,
  expansion_name text not null
);

-- ─── Game colonies (one row per colony available in game) ─────────────────────
create table if not exists game_colonies (
  id          uuid primary key default gen_random_uuid(),
  game_id     text not null references game_sessions(id) on delete cascade,
  colony_name text not null
);

-- ─── Cards played (one row per card per player per game) ──────────────────────
create table if not exists cards_played (
  id           uuid primary key default gen_random_uuid(),
  game_id      text    not null references game_sessions(id) on delete cascade,
  player_name  text    not null,
  card_order   smallint,
  card_name    text    not null,
  vp_from_card smallint not null default 0,
  notes        text
);

-- ─── Card reference (one row per unique card definition) ──────────────────────
create table if not exists card_reference (
  id         uuid primary key default gen_random_uuid(),
  card_name  text not null unique,
  tags       text,               -- Comma-separated, alphabetical: "Animal, Microbe"
  card_type  text not null check (card_type in ('Automated', 'Active', 'Event')),
  expansion  text,               -- null = Base game
  base_vp    smallint
);

-- ─── Reference lists (controlled vocabulary for UI dropdowns) ─────────────────
create table if not exists reference_lists (
  id         uuid primary key default gen_random_uuid(),
  list_type  text not null check (list_type in ('player', 'corporation', 'map', 'expansion', 'colony')),
  value      text not null,
  unique (list_type, value)
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists idx_player_results_game    on player_results(game_id);
create index if not exists idx_player_results_player  on player_results(player_name);
create index if not exists idx_player_results_corp    on player_results(corporation);
create index if not exists idx_cards_played_game      on cards_played(game_id);
create index if not exists idx_cards_played_card      on cards_played(card_name);
create index if not exists idx_cards_played_player    on cards_played(player_name);
create index if not exists idx_game_expansions_game   on game_expansions(game_id);
create index if not exists idx_game_colonies_game     on game_colonies(game_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Public can read everything. Only authenticated users can write.

alter table game_sessions   enable row level security;
alter table player_results  enable row level security;
alter table game_expansions enable row level security;
alter table game_colonies   enable row level security;
alter table cards_played    enable row level security;
alter table card_reference  enable row level security;
alter table reference_lists enable row level security;

-- Read policies (public)
create policy "public read game_sessions"   on game_sessions   for select using (true);
create policy "public read player_results"  on player_results  for select using (true);
create policy "public read game_expansions" on game_expansions for select using (true);
create policy "public read game_colonies"   on game_colonies   for select using (true);
create policy "public read cards_played"    on cards_played    for select using (true);
create policy "public read card_reference"  on card_reference  for select using (true);
create policy "public read reference_lists" on reference_lists for select using (true);

-- Write policies (authenticated only)
create policy "auth write game_sessions"   on game_sessions   for all using (auth.role() = 'authenticated');
create policy "auth write player_results"  on player_results  for all using (auth.role() = 'authenticated');
create policy "auth write game_expansions" on game_expansions for all using (auth.role() = 'authenticated');
create policy "auth write game_colonies"   on game_colonies   for all using (auth.role() = 'authenticated');
create policy "auth write cards_played"    on cards_played    for all using (auth.role() = 'authenticated');
create policy "auth write card_reference"  on card_reference  for all using (auth.role() = 'authenticated');
create policy "auth write reference_lists" on reference_lists for all using (auth.role() = 'authenticated');
