-- Brighton Badminton League Scoring App
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Clubs: independent clubs (e.g. Brighton BC, Hove BC)
create table clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text,
  created_at timestamptz default now()
);

-- Teams: a club can have multiple teams (Brighton BC 1, Brighton BC 2)
create table teams (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references clubs(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

-- Leagues: separate competitions (Men's A, Men's B, Mixed etc.)
create table leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz default now()
);

-- Seasons: one active season per league at a time
create table seasons (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references leagues(id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,
  is_active boolean default false,
  created_at timestamptz default now()
);

-- Season teams: which teams participate in a season
create table season_teams (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references seasons(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  unique(season_id, team_id)
);

-- Players: individual players belonging to a club
create table players (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references clubs(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  created_at timestamptz default now()
);

-- Fixtures: scheduled matches between two teams in a season
create table fixtures (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references seasons(id) on delete cascade,
  home_team_id uuid references teams(id),
  away_team_id uuid references teams(id),
  scheduled_date date,
  venue text,
  status text default 'scheduled' check (status in ('scheduled', 'completed', 'postponed', 'cancelled')),
  created_at timestamptz default now(),
  check (home_team_id <> away_team_id)
);

-- Rubbers: each fixture has 3 doubles rubbers
create table rubbers (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid references fixtures(id) on delete cascade,
  rubber_number integer not null check (rubber_number between 1 and 3),
  home_player1_id uuid references players(id),
  home_player2_id uuid references players(id),
  away_player1_id uuid references players(id),
  away_player2_id uuid references players(id),
  winner text check (winner in ('home', 'away')),
  unique(fixture_id, rubber_number)
);

-- Rubber games: game scores within each rubber (best of 3)
create table rubber_games (
  id uuid primary key default gen_random_uuid(),
  rubber_id uuid references rubbers(id) on delete cascade,
  game_number integer not null check (game_number between 1 and 3),
  home_score integer not null default 0,
  away_score integer not null default 0,
  unique(rubber_id, game_number)
);

-- Profiles: extends Supabase auth.users with role info
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'captain' check (role in ('admin', 'captain')),
  display_name text,
  created_at timestamptz default now()
);

-- Team captains: which teams a captain manages
create table team_captains (
  user_id uuid references profiles(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  primary key (user_id, team_id)
);

-- Auto-create profile on sign-up
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into profiles (id, role)
  values (new.id, 'captain');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Row Level Security
alter table clubs enable row level security;
alter table teams enable row level security;
alter table leagues enable row level security;
alter table seasons enable row level security;
alter table season_teams enable row level security;
alter table players enable row level security;
alter table fixtures enable row level security;
alter table rubbers enable row level security;
alter table rubber_games enable row level security;
alter table profiles enable row level security;
alter table team_captains enable row level security;

-- Public read access for leagues/seasons/fixtures/results
create policy "Public read clubs" on clubs for select using (true);
create policy "Public read teams" on teams for select using (true);
create policy "Public read leagues" on leagues for select using (true);
create policy "Public read seasons" on seasons for select using (true);
create policy "Public read season_teams" on season_teams for select using (true);
create policy "Public read players" on players for select using (true);
create policy "Public read fixtures" on fixtures for select using (true);
create policy "Public read rubbers" on rubbers for select using (true);
create policy "Public read rubber_games" on rubber_games for select using (true);

-- Admins can do everything
create policy "Admins full access clubs" on clubs for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins full access teams" on teams for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins full access leagues" on leagues for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins full access seasons" on seasons for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins full access season_teams" on season_teams for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins full access players" on players for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins full access fixtures" on fixtures for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins full access rubbers" on rubbers for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins full access rubber_games" on rubber_games for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins read profiles" on profiles for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins update profiles" on profiles for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins full access team_captains" on team_captains for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Captains can update results for their own team's fixtures
create policy "Captains upsert rubbers" on rubbers for all
  using (
    exists (
      select 1 from team_captains tc
      join fixtures f on f.id = fixture_id
      where tc.user_id = auth.uid()
      and (tc.team_id = f.home_team_id or tc.team_id = f.away_team_id)
    )
  );
create policy "Captains upsert rubber_games" on rubber_games for all
  using (
    exists (
      select 1 from team_captains tc
      join rubbers r on r.id = rubber_id
      join fixtures f on f.id = r.fixture_id
      where tc.user_id = auth.uid()
      and (tc.team_id = f.home_team_id or tc.team_id = f.away_team_id)
    )
  );
create policy "Captains update their fixtures" on fixtures for update
  using (
    exists (
      select 1 from team_captains tc
      where tc.user_id = auth.uid()
      and (tc.team_id = home_team_id or tc.team_id = away_team_id)
    )
  );

-- Users can read and update their own profile
create policy "Users read own profile" on profiles for select
  using (auth.uid() = id);
create policy "Users update own profile" on profiles for update
  using (auth.uid() = id);

-- Users can read their own team_captains
create policy "Users read own team_captains" on team_captains for select
  using (user_id = auth.uid());
