import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: leagues } = await supabase.from('leagues').select('id, name, description').order('name')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Brighton Badminton League</h1>
        <p className="mt-2 text-gray-500">Standings, results and fixtures</p>
      </div>

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
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
          No leagues yet. An admin needs to set them up.
        </div>
      )}
    </div>
  )
}
