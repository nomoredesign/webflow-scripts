import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import type { Fixture } from '@/lib/types'

export default async function CaptainPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Get teams this captain manages
  const { data: captainTeams } = await supabase
    .from('team_captains')
    .select('team_id, teams(id, name)')
    .eq('user_id', user.id)

  const teamIds = (captainTeams ?? []).map(ct => ct.team_id)

  let fixtures: Fixture[] = []
  if (teamIds.length > 0) {
    const { data } = await supabase
      .from('fixtures')
      .select(`
        id, season_id, scheduled_date, venue, status,
        home_team:teams!home_team_id(id, name),
        away_team:teams!away_team_id(id, name),
        rubbers(winner)
      `)
      .or(`home_team_id.in.(${teamIds.join(',')}),away_team_id.in.(${teamIds.join(',')})`)
      .order('scheduled_date', { ascending: true })
    fixtures = (data ?? []) as unknown as Fixture[]
  }

  const pending = fixtures.filter(f => f.status === 'scheduled')
  const completed = fixtures.filter(f => f.status === 'completed')

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">My Team</h1>
      <div className="flex flex-wrap gap-2 mb-6">
        {(captainTeams ?? []).map(ct => (
          <span key={ct.team_id} className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full font-medium">
            {(ct.teams as unknown as unknown as { name: string } | null)?.name}
          </span>
        ))}
      </div>

      {teamIds.length === 0 && (
        <p className="text-gray-500">You have not been assigned to a team yet. Contact your league admin.</p>
      )}

      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Upcoming / Awaiting Result</h2>
          <div className="space-y-2">
            {pending.map(f => {
              const homeTeam = f.home_team as unknown as { name: string } | undefined
              const awayTeam = f.away_team as unknown as { name: string } | undefined
              return (
                <Link
                  key={f.id}
                  href={`/captain/fixtures/${f.id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-400 transition"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {homeTeam?.name} <span className="text-gray-400 font-normal">vs</span> {awayTeam?.name}
                    </p>
                    {f.scheduled_date && (
                      <p className="text-sm text-gray-400 mt-0.5">
                        {new Date(f.scheduled_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <span className="text-sm text-blue-600 font-medium">Enter result →</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Past Results</h2>
          <div className="space-y-2">
            {completed.map(f => {
              const rubbers = f.rubbers as unknown as { winner: string | null }[] ?? []
              const homeRW = rubbers.filter(r => r.winner === 'home').length
              const awayRW = rubbers.filter(r => r.winner === 'away').length
              const homeTeam = f.home_team as unknown as { name: string } | undefined
              const awayTeam = f.away_team as unknown as { name: string } | undefined
              return (
                <Link
                  key={f.id}
                  href={`/captain/fixtures/${f.id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-gray-300 transition"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {homeTeam?.name} <span className="font-bold text-blue-700">{homeRW}–{awayRW}</span> {awayTeam?.name}
                    </p>
                    {f.scheduled_date && (
                      <p className="text-sm text-gray-400 mt-0.5">
                        {new Date(f.scheduled_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <span className="text-sm text-gray-400">Edit →</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
