import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  const navItems = [
    { href: '/dashboard', label: 'Overview' },
    { href: '/dashboard/leagues', label: 'Leagues' },
    { href: '/dashboard/clubs', label: 'Clubs & Teams' },
    { href: '/dashboard/players', label: 'Players' },
    { href: '/dashboard/fixtures', label: 'Fixtures' },
  ]

  return (
    <div className="flex gap-6">
      <nav className="w-44 shrink-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Admin</p>
        <ul className="space-y-1">
          {navItems.map(item => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
