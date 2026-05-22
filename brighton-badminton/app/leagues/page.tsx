import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'

export default async function LeaguesPage() {
  const supabase = await createClient()
  const { data: leagues } = await supabase.from('leagues').select('id, name, description').order('name')

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Leagues</h1>
      {leagues && leagues.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {leagues.map((league) => (
            <Link
              key={league.id}
              href={`/leagues/${league.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:border-blue-400 hover:shadow-md transition"
            >
              <h2 className="font-semibold text-gray-900">{league.name}</h2>
              {league.description && (
                <p className="mt-1 text-sm text-gray-500">{league.description}</p>
              )}
              <span className="mt-3 inline-block text-sm text-blue-600 font-medium">
                View standings →
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No leagues available yet.</p>
      )}
    </div>
  )
}
