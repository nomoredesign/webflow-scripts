import { createClient } from '@/lib/supabase-server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { count: leagueCount },
    { count: clubCount },
    { count: teamCount },
    { count: playerCount },
    { count: fixtureCount },
    { count: pendingCount },
  ] = await Promise.all([
    supabase.from('leagues').select('*', { count: 'exact', head: true }),
    supabase.from('clubs').select('*', { count: 'exact', head: true }),
    supabase.from('teams').select('*', { count: 'exact', head: true }),
    supabase.from('players').select('*', { count: 'exact', head: true }),
    supabase.from('fixtures').select('*', { count: 'exact', head: true }),
    supabase.from('fixtures').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
  ])

  const stats = [
    { label: 'Leagues', value: leagueCount ?? 0, href: '/dashboard/leagues' },
    { label: 'Clubs', value: clubCount ?? 0, href: '/dashboard/clubs' },
    { label: 'Teams', value: teamCount ?? 0, href: '/dashboard/clubs' },
    { label: 'Players', value: playerCount ?? 0, href: '/dashboard/players' },
    { label: 'Fixtures', value: fixtureCount ?? 0, href: '/dashboard/fixtures' },
    { label: 'Awaiting result', value: pendingCount ?? 0, href: '/dashboard/fixtures' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {stats.map(s => (
          <a key={s.label} href={s.href} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-400 transition">
            <p className="text-2xl font-bold text-blue-700">{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
