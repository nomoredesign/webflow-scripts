import { createClient } from '@/lib/supabase-server'
import { calculateStandings } from '@/lib/scoring'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Fixture } from '@/lib/types'

export default async function LeaguePage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params
  const supabase = await createClient()

  const { data: league } = await supabase
    .from('leagues')
    .select('id, name, description')
    .eq('id', leagueId)
    .single()

  if (!league) notFound()

  // Active season
  const { data: season } = await supabase
    .from('seasons')
    .select('id, name, start_date, end_date')
    .eq('league_id', leagueId)
    .eq('is_active', true)
    .single()

  let standings: ReturnType<typeof calculateStandings> = []
  let recentFixtures: Fixture[] = []
  let upcomingFixtures: Fixture[] = []

  if (season) {
    // Teams in this season
    const { data: seasonTeams } = await supabase
      .from('season_teams')
      .select('team_id, teams(id, name, club:clubs(id, name, short_name))')
      .eq('season_id', season.id)

    const teams = (seasonTeams ?? []).map((st) => {
      const t = st.teams as unknown as { id: string; name: string; club: { id: string; name: string; short_name: string | null } } | null
      return { id: t?.id ?? '', name: t?.name ?? '', club: t?.club ?? undefined }
    }).filter(t => t.id)

    // All fixtures with full rubber data
    const { data: fixturesData } = await supabase
      .from('fixtures')
      .select(`
        id, season_id, home_team_id, away_team_id, scheduled_date, venue, status,
        home_team:teams!home_team_id(id, name, club:clubs(id, name, short_name)),
        away_team:teams!away_team_id(id, name, club:clubs(id, name, short_name)),
        rubbers(
          id, rubber_number, winner,
          home_player1:players!home_player1_id(id, first_name, last_name),
          home_player2:players!home_player2_id(id, first_name, last_name),
          away_player1:players!away_player1_id(id, first_name, last_name),
          away_player2:players!away_player2_id(id, first_name, last_name),
          games:rubber_games(id, game_number, home_score, away_score)
        )
      `)
      .eq('season_id', season.id)
      .order('scheduled_date', { ascending: false })

    const allFixtures = (fixturesData ?? []) as unknown as Fixture[]
    standings = calculateStandings(allFixtures, teams)

    const today = new Date().toISOString().slice(0, 10)
    recentFixtures = allFixtures
      .filter(f => f.status === 'completed')
      .slice(0, 5)
    upcomingFixtures = allFixtures
      .filter(f => f.status === 'scheduled' && (f.scheduled_date ?? '') >= today)
      .sort((a, b) => (a.scheduled_date ?? '').localeCompare(b.scheduled_date ?? ''))
      .slice(0, 5)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{league.name}</h1>
        {league.description && <p className="mt-1 text-gray-500">{league.description}</p>}
        {season && <p className="mt-1 text-sm text-blue-700 font-medium">Season: {season.name}</p>}
      </div>

      {!season ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-gray-500">
          No active season for this league.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Standings table */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800">Standings</h2>
              <Link href={`/leagues/${leagueId}/stats`} className="text-sm text-blue-600 hover:underline">
                Player stats →
              </Link>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-3 text-left w-8">#</th>
                    <th className="px-3 py-3 text-left">Team</th>
                    <th className="px-3 py-3 text-center">P</th>
                    <th className="px-3 py-3 text-center">W</th>
                    <th className="px-3 py-3 text-center">L</th>
                    <th className="px-3 py-3 text-center">Rub W</th>
                    <th className="px-3 py-3 text-center">Rub L</th>
                    <th className="px-3 py-3 text-center">Pts F</th>
                    <th className="px-3 py-3 text-center">Pts A</th>
                    <th className="px-3 py-3 text-center font-bold text-gray-900">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {standings.map((row, i) => (
                    <tr key={row.team_id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-3 py-2.5 font-medium text-gray-900">{row.team_name}</td>
                      <td className="px-3 py-2.5 text-center text-gray-600">{row.played}</td>
                      <td className="px-3 py-2.5 text-center text-gray-600">{row.won}</td>
                      <td className="px-3 py-2.5 text-center text-gray-600">{row.lost}</td>
                      <td className="px-3 py-2.5 text-center text-gray-600">{row.rubbers_won}</td>
                      <td className="px-3 py-2.5 text-center text-gray-600">{row.rubbers_lost}</td>
                      <td className="px-3 py-2.5 text-center text-gray-600">{row.games_for}</td>
                      <td className="px-3 py-2.5 text-center text-gray-600">{row.games_against}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-blue-700">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Recent results */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800">Recent Results</h2>
                <Link href={`/leagues/${leagueId}/fixtures`} className="text-sm text-blue-600 hover:underline">
                  All fixtures →
                </Link>
              </div>
              <div className="space-y-2">
                {recentFixtures.length > 0 ? recentFixtures.map(f => {
                  const homeRW = (f.rubbers ?? []).filter(r => r.winner === 'home').length
                  const awayRW = (f.rubbers ?? []).filter(r => r.winner === 'away').length
                  return (
                    <div key={f.id} className="rounded border border-gray-200 bg-white p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className={homeRW > awayRW ? 'font-semibold text-gray-900' : 'text-gray-600'}>
                          {(f.home_team as unknown as { name: string } | undefined)?.name}
                        </span>
                        <span className="mx-2 font-bold text-gray-900">{homeRW} – {awayRW}</span>
                        <span className={awayRW > homeRW ? 'font-semibold text-gray-900' : 'text-gray-600'}>
                          {(f.away_team as unknown as { name: string } | undefined)?.name}
                        </span>
                      </div>
                      {f.scheduled_date && (
                        <p className="mt-1 text-xs text-gray-400">{new Date(f.scheduled_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      )}
                    </div>
                  )
                }) : (
                  <p className="text-sm text-gray-500">No results yet.</p>
                )}
              </div>
            </section>

            {/* Upcoming fixtures */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Upcoming Fixtures</h2>
              <div className="space-y-2">
                {upcomingFixtures.length > 0 ? upcomingFixtures.map(f => (
                  <div key={f.id} className="rounded border border-gray-200 bg-white p-3 text-sm">
                    <div className="flex items-center justify-between text-gray-900">
                      <span>{(f.home_team as unknown as { name: string } | undefined)?.name}</span>
                      <span className="mx-2 text-gray-400 text-xs">vs</span>
                      <span>{(f.away_team as unknown as { name: string } | undefined)?.name}</span>
                    </div>
                    {f.scheduled_date && (
                      <p className="mt-1 text-xs text-gray-400">{new Date(f.scheduled_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    )}
                    {f.venue && <p className="text-xs text-gray-400">{f.venue}</p>}
                  </div>
                )) : (
                  <p className="text-sm text-gray-500">No upcoming fixtures.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
