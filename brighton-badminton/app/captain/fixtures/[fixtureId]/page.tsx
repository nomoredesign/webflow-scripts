import { createClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import FixtureResultForm from '@/components/FixtureResultForm'
import type { Fixture, Player } from '@/lib/types'
import Link from 'next/link'

async function saveResults(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const fixtureId = formData.get('fixture_id') as string

  // Verify captain has access to this fixture
  const { data: captainTeams } = await supabase
    .from('team_captains')
    .select('team_id')
    .eq('user_id', user.id)
  const teamIds = (captainTeams ?? []).map(ct => ct.team_id)

  const { data: fixture } = await supabase
    .from('fixtures')
    .select('home_team_id, away_team_id')
    .eq('id', fixtureId)
    .single()

  if (!fixture || (!teamIds.includes(fixture.home_team_id) && !teamIds.includes(fixture.away_team_id))) {
    return
  }

  for (let rn = 1; rn <= 3; rn++) {
    const rubberId = formData.get(`rubber_${rn}_id`) as string
    if (!rubberId) continue

    const hp1 = formData.get(`rubber_${rn}_home_p1`) as string || null
    const hp2 = formData.get(`rubber_${rn}_home_p2`) as string || null
    const ap1 = formData.get(`rubber_${rn}_away_p1`) as string || null
    const ap2 = formData.get(`rubber_${rn}_away_p2`) as string || null

    const games: { game_number: number; home_score: number; away_score: number }[] = []
    let homeWins = 0, awayWins = 0
    for (let gn = 1; gn <= 3; gn++) {
      const hs = parseInt(formData.get(`rubber_${rn}_game_${gn}_home`) as string)
      const as_ = parseInt(formData.get(`rubber_${rn}_game_${gn}_away`) as string)
      if (!isNaN(hs) && !isNaN(as_)) {
        games.push({ game_number: gn, home_score: hs, away_score: as_ })
        if (hs > as_) homeWins++; else awayWins++
      }
      if (homeWins >= 2 || awayWins >= 2) break
    }

    const winner = homeWins >= 2 ? 'home' : awayWins >= 2 ? 'away' : null

    await supabase.from('rubbers').update({
      home_player1_id: hp1,
      home_player2_id: hp2,
      away_player1_id: ap1,
      away_player2_id: ap2,
      winner,
    }).eq('id', rubberId)

    await supabase.from('rubber_games').delete().eq('rubber_id', rubberId)
    if (games.length > 0) {
      await supabase.from('rubber_games').insert(
        games.map(g => ({ rubber_id: rubberId, ...g }))
      )
    }
  }

  const { data: rubbers } = await supabase
    .from('rubbers')
    .select('winner')
    .eq('fixture_id', fixtureId)

  const allDone = (rubbers ?? []).every(r => r.winner !== null)
  if (allDone) {
    await supabase.from('fixtures').update({ status: 'completed' }).eq('id', fixtureId)
  }

  revalidatePath(`/captain/fixtures/${fixtureId}`)
  revalidatePath('/captain')
}

export default async function CaptainFixturePage({ params }: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify access
  const { data: captainTeams } = await supabase
    .from('team_captains')
    .select('team_id')
    .eq('user_id', user.id)
  const teamIds = (captainTeams ?? []).map(ct => ct.team_id)

  const { data: fixtureData } = await supabase
    .from('fixtures')
    .select(`
      id, season_id, scheduled_date, venue, status, home_team_id, away_team_id,
      home_team:teams!home_team_id(id, name, club_id),
      away_team:teams!away_team_id(id, name, club_id),
      rubbers(
        id, rubber_number, winner,
        home_player1_id, home_player2_id, away_player1_id, away_player2_id,
        games:rubber_games(id, game_number, home_score, away_score)
      )
    `)
    .eq('id', fixtureId)
    .single()

  if (!fixtureData) notFound()

  const fixture = fixtureData as unknown as Fixture & { home_team_id: string; away_team_id: string }
  if (!teamIds.includes(fixture.home_team_id) && !teamIds.includes(fixture.away_team_id)) {
    redirect('/captain')
  }

  const homeTeam = fixture.home_team as unknown as { id: string; name: string; club_id: string } | null
  const awayTeam = fixture.away_team as unknown as { id: string; name: string; club_id: string } | null

  let homePlayers: Player[] = []
  let awayPlayers: Player[] = []

  if (homeTeam?.club_id) {
    const { data } = await supabase.from('players').select('id, first_name, last_name, club_id').eq('club_id', homeTeam.club_id).order('last_name')
    homePlayers = (data ?? []) as Player[]
  }
  if (awayTeam?.club_id) {
    const { data } = await supabase.from('players').select('id, first_name, last_name, club_id').eq('club_id', awayTeam.club_id).order('last_name')
    awayPlayers = (data ?? []) as Player[]
  }

  const rubbers = ((fixture.rubbers ?? []) as typeof fixture.rubbers & { games?: { game_number: number; home_score: number; away_score: number }[] }[])
    .sort((a, b) => (a?.rubber_number ?? 0) - (b?.rubber_number ?? 0))

  return (
    <div>
      <div className="mb-4">
        <Link href="/captain" className="text-sm text-blue-600 hover:underline">← My fixtures</Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {homeTeam?.name} vs {awayTeam?.name}
        </h1>
        {fixture.scheduled_date && (
          <p className="text-gray-500 mt-1">
            {new Date(fixture.scheduled_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
        {fixture.status === 'completed' && (
          <span className="inline-block mt-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Completed</span>
        )}
      </div>

      <FixtureResultForm
        fixtureId={fixtureId}
        rubbers={rubbers ?? []}
        homePlayers={homePlayers}
        awayPlayers={awayPlayers}
        homeTeamName={homeTeam?.name ?? ''}
        awayTeamName={awayTeam?.name ?? ''}
        saveResults={saveResults}
      />
    </div>
  )
}
