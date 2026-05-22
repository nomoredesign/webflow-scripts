import { createClient } from '@/lib/supabase-server'
import { calculatePlayerStats } from '@/lib/scoring'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Fixture } from '@/lib/types'

export default async function StatsPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params
  const supabase = await createClient()

  const { data: league } = await supabase.from('leagues').select('id, name').eq('id', leagueId).single()
  if (!league) notFound()

  const { data: season } = await supabase
    .from('seasons')
    .select('id, name')
    .eq('league_id', leagueId)
    .eq('is_active', true)
    .single()

  let stats: ReturnType<typeof calculatePlayerStats> = []

  if (season) {
    const { data } = await supabase
      .from('fixtures')
      .select(`
        id, status, home_team_id, away_team_id,
        home_team:teams!home_team_id(id, name),
        away_team:teams!away_team_id(id, name),
        rubbers(
          id, winner,
          home_player1:players!home_player1_id(id, first_name, last_name),
          home_player2:players!home_player2_id(id, first_name, last_name),
          away_player1:players!away_player1_id(id, first_name, last_name),
          away_player2:players!away_player2_id(id, first_name, last_name)
        )
      `)
      .eq('season_id', season.id)

    stats = calculatePlayerStats((data ?? []) as unknown as Fixture[])
  }

  return (
    <div>
      <div className="mb-4">
        <Link href={`/leagues/${leagueId}`} className="text-sm text-blue-600 hover:underline">← {league.name}</Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Player Stats</h1>
      {season && <p className="text-sm text-blue-700 font-medium mb-6">{season.name}</p>}

      {!season ? (
        <p className="text-gray-500">No active season.</p>
      ) : stats.length === 0 ? (
        <p className="text-gray-500">No player data yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-3 text-left w-8">#</th>
                <th className="px-3 py-3 text-left">Player</th>
                <th className="px-3 py-3 text-left">Team</th>
                <th className="px-3 py-3 text-center">Played</th>
                <th className="px-3 py-3 text-center">Won</th>
                <th className="px-3 py-3 text-center">Lost</th>
                <th className="px-3 py-3 text-center">Win %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.map((s, i) => (
                <tr key={s.player_id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-900">{s.player_name}</td>
                  <td className="px-3 py-2.5 text-gray-600">{s.team_name}</td>
                  <td className="px-3 py-2.5 text-center text-gray-600">{s.rubbers_played}</td>
                  <td className="px-3 py-2.5 text-center text-gray-600">{s.rubbers_won}</td>
                  <td className="px-3 py-2.5 text-center text-gray-600">{s.rubbers_lost}</td>
                  <td className="px-3 py-2.5 text-center font-medium text-blue-700">{s.win_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
