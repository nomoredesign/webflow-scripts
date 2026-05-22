import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Fixture } from '@/lib/types'

export default async function FixturesPage({ params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params
  const supabase = await createClient()

  const { data: league } = await supabase.from('leagues').select('id, name').eq('id', leagueId).single()
  if (!league) notFound()

  const { data: season } = await supabase
    .from('seasons')
    .select('id, name')
    .eq('league_id', leagueId)
    .eq('is_active', true)
    .single()

  let fixtures: Fixture[] = []
  if (season) {
    const { data } = await supabase
      .from('fixtures')
      .select(`
        id, season_id, home_team_id, away_team_id, scheduled_date, venue, status,
        home_team:teams!home_team_id(id, name),
        away_team:teams!away_team_id(id, name),
        rubbers(id, rubber_number, winner)
      `)
      .eq('season_id', season.id)
      .order('scheduled_date', { ascending: true })
    fixtures = (data ?? []) as unknown as Fixture[]
  }

  const completed = fixtures.filter(f => f.status === 'completed')
  const scheduled = fixtures.filter(f => f.status === 'scheduled')
  const other = fixtures.filter(f => f.status !== 'completed' && f.status !== 'scheduled')

  function FixtureRow({ f }: { f: Fixture }) {
    const homeRW = (f.rubbers ?? []).filter(r => r.winner === 'home').length
    const awayRW = (f.rubbers ?? []).filter(r => r.winner === 'away').length
    const homeTeam = f.home_team as unknown as { name: string } | undefined
    const awayTeam = f.away_team as unknown as { name: string } | undefined
    return (
      <div className="rounded border border-gray-200 bg-white p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className={homeRW > awayRW && f.status === 'completed' ? 'font-semibold' : ''}>{homeTeam?.name}</span>
          <span className="mx-3 text-gray-700 font-medium">
            {f.status === 'completed' ? `${homeRW} – ${awayRW}` : 'vs'}
          </span>
          <span className={awayRW > homeRW && f.status === 'completed' ? 'font-semibold' : ''}>{awayTeam?.name}</span>
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
          {f.scheduled_date && <span>{new Date(f.scheduled_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
          {f.venue && <span>{f.venue}</span>}
          {f.status !== 'scheduled' && f.status !== 'completed' && (
            <span className="capitalize text-amber-600">{f.status}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <Link href={`/leagues/${leagueId}`} className="text-sm text-blue-600 hover:underline">← {league.name}</Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Fixtures</h1>
      {season && <p className="text-sm text-blue-700 font-medium mb-6">{season.name}</p>}

      {!season ? (
        <p className="text-gray-500">No active season.</p>
      ) : (
        <div className="space-y-8">
          {scheduled.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-gray-700 mb-3">Upcoming</h2>
              <div className="space-y-2">{scheduled.map(f => <FixtureRow key={f.id} f={f} />)}</div>
            </section>
          )}
          {completed.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-gray-700 mb-3">Results</h2>
              <div className="space-y-2">{completed.map(f => <FixtureRow key={f.id} f={f} />)}</div>
            </section>
          )}
          {other.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-gray-700 mb-3">Other</h2>
              <div className="space-y-2">{other.map(f => <FixtureRow key={f.id} f={f} />)}</div>
            </section>
          )}
          {fixtures.length === 0 && <p className="text-gray-500">No fixtures yet.</p>}
        </div>
      )}
    </div>
  )
}
