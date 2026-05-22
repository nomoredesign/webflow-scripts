import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

async function createPlayer(formData: FormData) {
  'use server'
  const supabase = await createClient()
  await supabase.from('players').insert({
    club_id: formData.get('club_id') as string,
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
  })
  revalidatePath('/dashboard/players')
}

async function deletePlayer(formData: FormData) {
  'use server'
  const supabase = await createClient()
  await supabase.from('players').delete().eq('id', formData.get('player_id') as string)
  revalidatePath('/dashboard/players')
}

export default async function PlayersPage() {
  const supabase = await createClient()

  const { data: clubs } = await supabase.from('clubs').select('id, name').order('name')
  const { data: players } = await supabase
    .from('players')
    .select('id, club_id, first_name, last_name, club:clubs(name)')
    .order('last_name')

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Players</h1>

      {/* Add player */}
      <section className="mb-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4">Add Player</h2>
        <form action={createPlayer} className="flex flex-wrap gap-3">
          <select name="club_id" required className="input">
            <option value="">Select club</option>
            {(clubs ?? []).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input name="first_name" required placeholder="First name" className="input" />
          <input name="last_name" required placeholder="Last name" className="input" />
          <button type="submit" className="btn-primary">Add player</button>
        </form>
      </section>

      {/* Players table */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Club</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(players ?? []).map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-900">
                  {p.last_name}, {p.first_name}
                </td>
                <td className="px-4 py-2.5 text-gray-500">
                  {(p.club as unknown as { name: string } | null)?.name}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <form action={deletePlayer}>
                    <input type="hidden" name="player_id" value={p.id} />
                    <button type="submit" className="text-xs text-red-500 hover:underline">
                      Remove
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {(players ?? []).length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                  No players yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
