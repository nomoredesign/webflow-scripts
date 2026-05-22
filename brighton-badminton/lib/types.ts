export type Role = 'admin' | 'captain'

export interface Club {
  id: string
  name: string
  short_name: string | null
  created_at: string
}

export interface Team {
  id: string
  club_id: string
  name: string
  created_at: string
  club?: Club
}

export interface League {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface Season {
  id: string
  league_id: string
  name: string
  start_date: string | null
  end_date: string | null
  is_active: boolean
  created_at: string
  league?: League
}

export interface SeasonTeam {
  id: string
  season_id: string
  team_id: string
  team?: Team
}

export interface Player {
  id: string
  club_id: string
  first_name: string
  last_name: string
  created_at: string
  club?: Club
  full_name?: string
}

export interface Fixture {
  id: string
  season_id: string
  home_team_id: string
  away_team_id: string
  scheduled_date: string | null
  venue: string | null
  status: 'scheduled' | 'completed' | 'postponed' | 'cancelled'
  created_at: string
  home_team?: Team
  away_team?: Team
  season?: Season
  rubbers?: Rubber[]
}

export interface Rubber {
  id: string
  fixture_id: string
  rubber_number: number
  home_player1_id: string | null
  home_player2_id: string | null
  away_player1_id: string | null
  away_player2_id: string | null
  winner: 'home' | 'away' | null
  home_player1?: Player
  home_player2?: Player
  away_player1?: Player
  away_player2?: Player
  games?: RubberGame[]
}

export interface RubberGame {
  id: string
  rubber_id: string
  game_number: number
  home_score: number
  away_score: number
}

export interface Profile {
  id: string
  role: Role
  display_name: string | null
  created_at: string
}

export interface TeamCaptain {
  user_id: string
  team_id: string
  team?: Team
}

// Calculated standing for a team in a season
export interface TeamStanding {
  team_id: string
  team_name: string
  club_name: string
  played: number
  won: number
  lost: number
  points: number
  rubbers_won: number
  rubbers_lost: number
  games_for: number
  games_against: number
}

// Player stats across a season
export interface PlayerStats {
  player_id: string
  player_name: string
  team_name: string
  rubbers_played: number
  rubbers_won: number
  rubbers_lost: number
  win_rate: number
}
