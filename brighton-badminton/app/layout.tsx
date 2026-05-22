import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'

export const metadata: Metadata = {
  title: 'Brighton Badminton League',
  description: 'League scores, standings and fixtures for Brighton Badminton',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let role: string | null = null
  if (user) {
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    role = data?.role ?? null
  }

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <header className="bg-blue-700 text-white shadow">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="text-lg font-bold tracking-tight hover:text-blue-100">
              Brighton Badminton
            </Link>
            <nav className="flex items-center gap-4 text-sm font-medium">
              <Link href="/leagues" className="hover:text-blue-200">Leagues</Link>
              {user ? (
                <>
                  {role === 'admin' && (
                    <Link href="/dashboard" className="hover:text-blue-200">Admin</Link>
                  )}
                  {role === 'captain' && (
                    <Link href="/captain" className="hover:text-blue-200">My Team</Link>
                  )}
                  <form action="/auth/signout" method="post">
                    <button type="submit" className="hover:text-blue-200 cursor-pointer">
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="hover:text-blue-200">Sign in</Link>
              )}
            </nav>
          </div>
        </header>
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
          {children}
        </main>
        <footer className="text-center text-xs text-gray-400 py-4 border-t border-gray-200">
          Brighton Badminton League
        </footer>
      </body>
    </html>
  )
}
