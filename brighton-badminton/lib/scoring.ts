import type { Fixture, TeamStanding, PlayerStats, Rubber } from './types'

export function calculateStandings(
  fixtures: Fixture[],
  teams: { id: string; name: string; club?: { name: string } }[]
): TeamStanding[] {
  const map = new Map<string, TeamStanding>()

  for (const team of teams) {
    map.set(team.id, {
      team_id: team.id,
      team_name: team.name,
      club_name: team.club?.name ?? '',
      played: 0,
      won: 0,
      lost: 0,
      points: 0,
      rubbers_won: 0,
      rubbers_lost: 0,
      games_for: 0,
      games_against: 0,
    })
  }

  for (const fixture of fixtures) {
    if (fixture.status !== 'completed') continue
    const home = map.get(fixture.home_team_id)
    const away = map.get(fixture.away_team_id)
    if (!home || !away) continue

    let homeRW = 0, awayRW = 0
    let homeGF = 0, homeGA = 0

    for (const rubber of fixture.rubbers ?? []) {
      if (rubber.winner === 'home') homeRW++
      else if (rubber.winner === 'away') awayRW++

      for (const game of rubber.games ?? []) {
        homeGF += game.home_score
        homeGA += game.away_score
      }
    }

    home.played++; away.played++
    home.rubbers_won += homeRW; home.rubbers_lost += awayRW
    away.rubbers_won += awayRW; away.rubbers_lost += homeRW
    home.games_for += homeGF; home.games_against += homeGA
    away.games_for += homeGA; away.games_against += homeGF

    if (homeRW > awayRW) {
      home.won++; home.points += 2; away.lost++
    } else {
      away.won++; away.points += 2; home.lost++
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.rubbers_won !== a.rubbers_won) return b.rubbers_won - a.rubbers_won
    const aNet = a.games_for - a.games_against
    const bNet = b.games_for - b.games_against
    return bNet - aNet
  })
}

export function deriveRubberWinner(rubber: Rubber): 'home' | 'away' | null {
  const games = rubber.games ?? []
  let homeWins = 0, awayWins = 0
  for (const game of games) {
    if (game.home_score > game.away_score) homeWins++
    else awayWins++
  }
  if (homeWins >= 2) return 'home'
  if (awayWins >= 2) return 'away'
  return null
}

export function calculatePlayerStats(fixtures: Fixture[]): PlayerStats[] {
  const map = new Map<string, PlayerStats>()

  function getOrCreate(player: { id: string; first_name: string; last_name: string }, teamName: string): PlayerStats {
    if (!map.has(player.id)) {
      map.set(player.id, {
        player_id: player.id,
        player_name: `${player.first_name} ${player.last_name}`,
        team_name: teamName,
        rubbers_played: 0,
        rubbers_won: 0,
        rubbers_lost: 0,
        win_rate: 0,
      })
    }
    return map.get(player.id)!
  }

  for (const fixture of fixtures) {
    if (fixture.status !== 'completed') continue
    const homeName = fixture.home_team?.name ?? ''
    const awayName = fixture.away_team?.name ?? ''

    for (const rubber of fixture.rubbers ?? []) {
      const homePlayers = [rubber.home_player1, rubber.home_player2].filter(Boolean)
      const awayPlayers = [rubber.away_player1, rubber.away_player2].filter(Boolean)

      for (const p of homePlayers) {
        if (!p) continue
        const stat = getOrCreate(p, homeName)
        stat.rubbers_played++
        if (rubber.winner === 'home') stat.rubbers_won++
        else stat.rubbers_lost++
      }
      for (const p of awayPlayers) {
        if (!p) continue
        const stat = getOrCreate(p, awayName)
        stat.rubbers_played++
        if (rubber.winner === 'away') stat.rubbers_won++
        else stat.rubbers_lost++
      }
    }
  }

  const stats = Array.from(map.values())
  for (const s of stats) {
    s.win_rate = s.rubbers_played > 0 ? Math.round((s.rubbers_won / s.rubbers_played) * 100) : 0
  }
  return stats.sort((a, b) => {
    if (b.rubbers_won !== a.rubbers_won) return b.rubbers_won - a.rubbers_won
    return b.win_rate - a.win_rate
  })
}
