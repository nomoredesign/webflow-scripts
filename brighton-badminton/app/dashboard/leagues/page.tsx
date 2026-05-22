import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

async function createLeague(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  await supabase.from('leagues').insert({ name, description: description || null })
  revalidatePath('/dashboard/leagues')
}

async function createSeason(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const league_id = formData.get('league_id') as string
  const name = formData.get('name') as string
  const start_date = formData.get('start_date') as string
  const end_date = formData.get('end_date') as string

  // Deactivate other seasons in this league first
  await supabase.from('seasons').update({ is_active: false }).eq('league_id', league_id)
  await supabase.from('seasons').insert({
    league_id,
    name,
    start_date: start_date || null,
    end_date: end_date || null,
    is_active: true,
  })
  revalidatePath('/dashboard/leagues')
}

async function toggleSeasonActive(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const seasonId = formData.get('season_id') as string
  const leagueId = formData.get('league_id') as string
  const current = formData.get('current') === 'true'

  if (!current) {
    await supabase.from('seasons').update({ is_active: false }).eq('league_id', leagueId)
    await supabase.from('seasons').update({ is_active: true }).eq('id', seasonId)
  } else {
    await supabase.from('seasons').update({ is_active: false }).eq('id', seasonId)
  }
  revalidatePath('/dashboard/leagues')
}

async function addTeamToSeason(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const season_id = formData.get('season_id') as string
  const team_id = formData.get('team_id') as string
  await supabase.from('season_teams').upsert({ season_id, team_id })
  revalidatePath('/dashboard/leagues')
}

async function removeTeamFromSeason(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const season_id = formData.get('season_id') as string
  const team_id = formData.get('team_id') as string
  await supabase.from('season_teams').delete().eq('season_id', season_id).eq('team_id', team_id)
  revalidatePath('/dashboard/leagues')
}

export default async function LeaguesAdminPage() {
  const supabase = await createClient()

  const { data: leagues } = await supabase
    .from('leagues')
    .select('id, name, description')
    .order('name')

  const { data: seasons } = await supabase
    .from('seasons')
    .select('id, league_id, name, start_date, end_date, is_active')
    .order('created_at', { ascending: false })

  const { data: seasonTeams } = await supabase
    .from('season_teams')
    .select('season_id, team_id, teams(id, name)')

  const { data: allTeams } = await supabase
    .from('teams')
    .select('id, name, club:clubs(name)')
    .order('name')

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Leagues & Seasons</h1>

      {/* Add league */}
      <section className="mb-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4">Add League</h2>
        <form action={createLeague} className="flex flex-col sm:flex-row gap-3">
          <input name="name" required placeholder="League name" className="input flex-1" />
          <input name="description" placeholder="Description (optional)" className="input flex-1" />
          <button type="submit" className="btn-primary">Add</button>
        </form>
      </section>

      {/* Leagues list */}
      <div className="space-y-6">
        {(leagues ?? []).map(league => {
          const leagueSeasons = (seasons ?? []).filter(s => s.league_id === league.id)
          return (
            <div key={league.id} className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">{league.name}</h3>
                {league.description && <p className="text-sm text-gray-500">{league.description}</p>}
              </div>
              <div className="p-5">
                {/* Add season */}
                <form action={createSeason} className="mb-4">
                  <input type="hidden" name="league_id" value={league.id} />
                  <div className="flex flex-wrap gap-2 items-end">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Season name</label>
                      <input name="name" required placeholder="e.g. 2024/25" className="input w-36" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Start</label>
                      <input name="start_date" type="date" className="input" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">End</label>
                      <input name="end_date" type="date" className="input" />
                    </div>
                    <button type="submit" className="btn-secondary">Add season</button>
                  </div>
                </form>

                {/* Seasons */}
                {leagueSeasons.length > 0 && (
                  <div className="space-y-3">
                    {leagueSeasons.map(season => {
                      const enrolled = (seasonTeams ?? [])
                        .filter(st => st.season_id === season.id)
                        .map(st => st.teams as unknown as { id: string; name: string } | null)
                        .filter(Boolean) as unknown as { id: string; name: string }[]
                      const enrolledIds = new Set(enrolled.map(t => t.id))
                      const available = (allTeams ?? []).filter(t => !enrolledIds.has(t.id))

                      return (
                        <div key={season.id} className="rounded border border-gray-200 p-3">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium text-sm text-gray-900">{season.name}</span>
                            {season.is_active && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Active</span>
                            )}
                            <form action={toggleSeasonActive}>
                              <input type="hidden" name="season_id" value={season.id} />
                              <input type="hidden" name="league_id" value={league.id} />
                              <input type="hidden" name="current" value={String(season.is_active)} />
                              <button type="submit" className="text-xs text-blue-600 hover:underline">
                                {season.is_active ? 'Deactivate' : 'Set active'}
                              </button>
                            </form>
                          </div>

                          {/* Teams in season */}
                          <div className="flex flex-wrap gap-2 mb-2">
                            {enrolled.map(team => (
                              <span key={team.id} className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 text-xs px-2 py-0.5 rounded">
                                {team.name}
                                <form action={removeTeamFromSeason} className="inline">
                                  <input type="hidden" name="season_id" value={season.id} />
                                  <input type="hidden" name="team_id" value={team.id} />
                                  <button type="submit" className="text-blue-400 hover:text-red-500 ml-1">×</button>
                                </form>
                              </span>
                            ))}
                          </div>

                          {/* Add team */}
                          {available.length > 0 && (
                            <form action={addTeamToSeason} className="flex gap-2">
                              <input type="hidden" name="season_id" value={season.id} />
                              <select name="team_id" className="input text-xs py-1">
                                {available.map(t => (
                                  <option key={t.id} value={t.id}>
                                    {(t.club as unknown as { name: string } | null)?.name} — {t.name}
                                  </option>
                                ))}
                              </select>
                              <button type="submit" className="btn-secondary text-xs py-1">Add team</button>
                            </form>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
