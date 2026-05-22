import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

async function createClub(formData: FormData) {
  'use server'
  const supabase = await createClient()
  await supabase.from('clubs').insert({
    name: formData.get('name') as string,
    short_name: (formData.get('short_name') as string) || null,
  })
  revalidatePath('/dashboard/clubs')
}

async function createTeam(formData: FormData) {
  'use server'
  const supabase = await createClient()
  await supabase.from('teams').insert({
    club_id: formData.get('club_id') as string,
    name: formData.get('name') as string,
  })
  revalidatePath('/dashboard/clubs')
}

export default async function ClubsPage() {
  const supabase = await createClient()

  const { data: clubs } = await supabase
    .from('clubs')
    .select('id, name, short_name')
    .order('name')

  const { data: teams } = await supabase
    .from('teams')
    .select('id, club_id, name')
    .order('name')

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Clubs & Teams</h1>

      {/* Add club */}
      <section className="mb-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4">Add Club</h2>
        <form action={createClub} className="flex flex-wrap gap-3">
          <input name="name" required placeholder="Club name (e.g. Brighton BC)" className="input flex-1 min-w-48" />
          <input name="short_name" placeholder="Short name (e.g. BBC)" className="input w-32" />
          <button type="submit" className="btn-primary">Add club</button>
        </form>
      </section>

      {/* Clubs list */}
      <div className="space-y-4">
        {(clubs ?? []).map(club => {
          const clubTeams = (teams ?? []).filter(t => t.club_id === club.id)
          return (
            <div key={club.id} className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{club.name}</h3>
                {club.short_name && <span className="text-xs text-gray-400">({club.short_name})</span>}
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  {clubTeams.map(team => (
                    <span key={team.id} className="bg-gray-100 text-gray-700 text-sm px-2 py-0.5 rounded">
                      {team.name}
                    </span>
                  ))}
                  {clubTeams.length === 0 && <span className="text-sm text-gray-400">No teams yet</span>}
                </div>
                <form action={createTeam} className="flex gap-2">
                  <input type="hidden" name="club_id" value={club.id} />
                  <input
                    name="name"
                    required
                    placeholder={`${club.short_name ?? club.name} 1`}
                    className="input text-sm py-1 w-52"
                  />
                  <button type="submit" className="btn-secondary text-sm py-1">Add team</button>
                </form>
              </div>
            </div>
          )
        })}
        {(clubs ?? []).length === 0 && (
          <p className="text-gray-500 text-sm">No clubs yet. Add one above.</p>
        )}
      </div>
    </div>
  )
}
