import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

async function createFixture(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const season_id = formData.get('season_id') as string
  const home_team_id = formData.get('home_team_id') as string
  const away_team_id = formData.get('away_team_id') as string
  const scheduled_date = formData.get('scheduled_date') as string
  const venue = formData.get('venue') as string

  if (home_team_id === away_team_id) return

  const { data: fixture } = await supabase.from('fixtures').insert({
    season_id,
    home_team_id,
    away_team_id,
    scheduled_date: scheduled_date || null,
    venue: venue || null,
    status: 'scheduled',
  }).select('id').single()

  if (fixture) {
    // Pre-create 3 rubber slots
    await supabase.from('rubbers').insert([
      { fixture_id: fixture.id, rubber_number: 1 },
      { fixture_id: fixture.id, rubber_number: 2 },
      { fixture_id: fixture.id, rubber_number: 3 },
    ])
  }

  revalidatePath('/dashboard/fixtures')
}

export default async function FixturesAdminPage() {
  const supabase = await createClient()

  const { data: seasons } = await supabase
    .from('seasons')
    .select('id, name, is_active, leagues(name)')
    .order('created_at', { ascending: false })

  const { data: seasonTeams } = await supabase
    .from('season_teams')
    .select('season_id, team_id, teams(id, name)')

  const { data: fixtures } = await supabase
    .from('fixtures')
    .select(`
      id, season_id, scheduled_date, venue, status,
      home_team:teams!home_team_id(id, name),
      away_team:teams!away_team_id(id, name),
      rubbers(winner)
    `)
    .order('scheduled_date', { ascending: false })

  const activeSeasonIds = new Set((seasons ?? []).filter(s => s.is_active).map(s => s.id))

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Fixtures</h1>

      {/* Add fixture */}
      <section className="mb-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4">Schedule Fixture</h2>
        <FixtureForm seasons={seasons ?? []} seasonTeams={seasonTeams ?? []} createFixture={createFixture} />
      </section>

      {/* Fixtures list */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Home</th>
              <th className="px-4 py-3 text-center">Score</th>
              <th className="px-4 py-3 text-left">Away</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(fixtures ?? []).map(f => {
              const rubbers = f.rubbers as unknown as { winner: string | null }[] | undefined ?? []
              const homeRW = rubbers.filter(r => r.winner === 'home').length
              const awayRW = rubbers.filter(r => r.winner === 'away').length
              const homeTeam = f.home_team as unknown as unknown as { name: string } | null
              const awayTeam = f.away_team as unknown as unknown as { name: string } | null
              const isActive = activeSeasonIds.has(f.season_id)
              return (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                    {f.scheduled_date ? new Date(f.scheduled_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{homeTeam?.name}</td>
                  <td className="px-4 py-2.5 text-center text-gray-700 font-medium">
                    {f.status === 'completed' ? `${homeRW}–${awayRW}` : '—'}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{awayTeam?.name}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      f.status === 'completed' ? 'bg-green-100 text-green-700' :
                      f.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link href={`/dashboard/fixtures/${f.id}`} className="text-xs text-blue-600 hover:underline">
                      {f.status === 'completed' ? 'Edit' : 'Enter result'}
                    </Link>
                  </td>
                </tr>
              )
            })}
            {(fixtures ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">No fixtures yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FixtureForm({
  seasons,
  seasonTeams,
  createFixture,
}: {
  seasons: { id: string; name: string; is_active: boolean; leagues: unknown }[]
  seasonTeams: { season_id: string; team_id: string; teams: unknown }[]
  createFixture: (fd: FormData) => Promise<void>
}) {
  const activeSeasons = seasons.filter(s => s.is_active)

  return (
    <form action={createFixture} className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Season</label>
          <select name="season_id" required className="input">
            <option value="">Select season</option>
            {activeSeasons.map(s => (
              <option key={s.id} value={s.id}>
                {(s.leagues as unknown as unknown as { name: string } | { name: string }[] | null) != null
                  ? Array.isArray(s.leagues)
                    ? (s.leagues as unknown as { name: string }[])[0]?.name
                    : (s.leagues as unknown as { name: string }).name
                  : ''} — {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Date</label>
          <input name="scheduled_date" type="date" className="input" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Venue</label>
          <input name="venue" placeholder="e.g. Brighton Leisure Centre" className="input" />
        </div>
      </div>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Home team</label>
          <select name="home_team_id" required className="input">
            <option value="">Select team</option>
            {seasonTeams.map(st => {
              const t = st.teams as unknown as { id: string; name: string } | { id: string; name: string }[] | null
              const team = Array.isArray(t) ? t[0] : t
              return team ? (
                <option key={`home-${st.team_id}-${st.season_id}`} value={st.team_id}>
                  {team.name}
                </option>
              ) : null
            })}
          </select>
        </div>
        <span className="text-gray-400 pb-2 text-sm">vs</span>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Away team</label>
          <select name="away_team_id" required className="input">
            <option value="">Select team</option>
            {seasonTeams.map(st => {
              const t = st.teams as unknown as { id: string; name: string } | { id: string; name: string }[] | null
              const team = Array.isArray(t) ? t[0] : t
              return team ? (
                <option key={`away-${st.team_id}-${st.season_id}`} value={st.team_id}>
                  {team.name}
                </option>
              ) : null
            })}
          </select>
        </div>
        <button type="submit" className="btn-primary pb-2">Schedule</button>
      </div>
    </form>
  )
}
