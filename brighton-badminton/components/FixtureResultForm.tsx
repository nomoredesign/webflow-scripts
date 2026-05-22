'use client'

import { useState } from 'react'
import type { Player, Rubber, RubberGame } from '@/lib/types'

interface RubberWithGames extends Rubber {
  games?: RubberGame[]
}

interface Props {
  fixtureId: string
  rubbers: RubberWithGames[]
  homePlayers: Player[]
  awayPlayers: Player[]
  homeTeamName: string
  awayTeamName: string
  saveResults: (fd: FormData) => Promise<void>
}

interface GameScore {
  home: string
  away: string
}

interface RubberState {
  id: string
  rubber_number: number
  home_p1: string
  home_p2: string
  away_p1: string
  away_p2: string
  games: [GameScore, GameScore, GameScore]
}

function initGame(game?: RubberGame): GameScore {
  return { home: game?.home_score?.toString() ?? '', away: game?.away_score?.toString() ?? '' }
}

function initRubber(r: RubberWithGames): RubberState {
  const sorted = (r.games ?? []).sort((a, b) => a.game_number - b.game_number)
  return {
    id: r.id,
    rubber_number: r.rubber_number,
    home_p1: r.home_player1_id ?? '',
    home_p2: r.home_player2_id ?? '',
    away_p1: r.away_player1_id ?? '',
    away_p2: r.away_player2_id ?? '',
    games: [initGame(sorted[0]), initGame(sorted[1]), initGame(sorted[2])],
  }
}

function computeWinner(games: [GameScore, GameScore, GameScore]): 'home' | 'away' | null {
  let homeWins = 0, awayWins = 0
  for (const g of games) {
    const h = parseInt(g.home), a = parseInt(g.away)
    if (!isNaN(h) && !isNaN(a) && (h > 0 || a > 0)) {
      if (h > a) homeWins++; else awayWins++
    }
    if (homeWins >= 2 || awayWins >= 2) break
  }
  if (homeWins >= 2) return 'home'
  if (awayWins >= 2) return 'away'
  return null
}

function PlayerSelect({ name, players, value, onChange }: {
  name: string
  players: Player[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <select
      name={name}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="block w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      <option value="">— select —</option>
      {players.map(p => (
        <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}</option>
      ))}
    </select>
  )
}

function ScoreInput({ label, value, onChange, name }: {
  label?: string
  value: string
  onChange: (v: string) => void
  name: string
}) {
  return (
    <div className="flex items-center gap-1">
      {label && <span className="text-xs text-gray-400 w-12 text-right">{label}</span>}
      <input
        type="number"
        name={name}
        min={0}
        max={30}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-16 rounded border border-gray-300 px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  )
}

export default function FixtureResultForm({
  fixtureId,
  rubbers,
  homePlayers,
  awayPlayers,
  homeTeamName,
  awayTeamName,
  saveResults,
}: Props) {
  const [state, setState] = useState<RubberState[]>(() =>
    rubbers.map(initRubber)
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function updateRubber(rn: number, patch: Partial<RubberState>) {
    setState(prev => prev.map(r => r.rubber_number === rn ? { ...r, ...patch } : r))
  }

  function updateGame(rn: number, gn: number, patch: Partial<GameScore>) {
    setState(prev => prev.map(r => {
      if (r.rubber_number !== rn) return r
      const games = [...r.games] as [GameScore, GameScore, GameScore]
      games[gn] = { ...games[gn], ...patch }
      return { ...r, games }
    }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    const fd = new FormData(e.currentTarget)
    await saveResults(fd)
    setSaving(false)
    setSaved(true)
  }

  // Fixture-level score summary
  const homeFixtureWins = state.filter(r => computeWinner(r.games) === 'home').length
  const awayFixtureWins = state.filter(r => computeWinner(r.games) === 'away').length

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="fixture_id" value={fixtureId} />

      {/* Score summary */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 px-5 py-3 flex items-center justify-center gap-6 text-lg font-bold text-gray-900">
        <span className={homeFixtureWins > awayFixtureWins ? 'text-blue-700' : ''}>{homeTeamName}</span>
        <span className="text-2xl">{homeFixtureWins} – {awayFixtureWins}</span>
        <span className={awayFixtureWins > homeFixtureWins ? 'text-blue-700' : ''}>{awayTeamName}</span>
      </div>

      {/* Rubber rows */}
      {state.map(rubber => {
        const winner = computeWinner(rubber.games)
        return (
          <div key={rubber.rubber_number} className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
              <span className="font-medium text-sm text-gray-700">Rubber {rubber.rubber_number}</span>
              {winner && (
                <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  {winner === 'home' ? homeTeamName : awayTeamName} wins
                </span>
              )}
            </div>

            <input type="hidden" name={`rubber_${rubber.rubber_number}_id`} value={rubber.id} />

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Home pair */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{homeTeamName}</p>
                <div className="space-y-2">
                  <PlayerSelect
                    name={`rubber_${rubber.rubber_number}_home_p1`}
                    players={homePlayers}
                    value={rubber.home_p1}
                    onChange={v => updateRubber(rubber.rubber_number, { home_p1: v })}
                  />
                  <PlayerSelect
                    name={`rubber_${rubber.rubber_number}_home_p2`}
                    players={homePlayers}
                    value={rubber.home_p2}
                    onChange={v => updateRubber(rubber.rubber_number, { home_p2: v })}
                  />
                </div>
              </div>

              {/* Away pair */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{awayTeamName}</p>
                <div className="space-y-2">
                  <PlayerSelect
                    name={`rubber_${rubber.rubber_number}_away_p1`}
                    players={awayPlayers}
                    value={rubber.away_p1}
                    onChange={v => updateRubber(rubber.rubber_number, { away_p1: v })}
                  />
                  <PlayerSelect
                    name={`rubber_${rubber.rubber_number}_away_p2`}
                    players={awayPlayers}
                    value={rubber.away_p2}
                    onChange={v => updateRubber(rubber.rubber_number, { away_p2: v })}
                  />
                </div>
              </div>
            </div>

            {/* Game scores */}
            <div className="px-4 pb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Games (best of 3)</p>
              <div className="space-y-2">
                {rubber.games.map((game, gi) => {
                  const gn = gi + 1
                  // Determine if this game needs to be played
                  let homeW = 0, awayW = 0
                  for (let i = 0; i < gi; i++) {
                    const h = parseInt(rubber.games[i].home), a = parseInt(rubber.games[i].away)
                    if (!isNaN(h) && !isNaN(a) && (h > 0 || a > 0)) {
                      if (h > a) homeW++; else awayW++
                    }
                  }
                  const alreadyDecided = homeW >= 2 || awayW >= 2
                  if (alreadyDecided) return null

                  return (
                    <div key={gn} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-14">Game {gn}</span>
                      <div className="flex items-center gap-2">
                        <ScoreInput
                          name={`rubber_${rubber.rubber_number}_game_${gn}_home`}
                          value={game.home}
                          onChange={v => updateGame(rubber.rubber_number, gi, { home: v })}
                        />
                        <span className="text-gray-400">–</span>
                        <ScoreInput
                          name={`rubber_${rubber.rubber_number}_game_${gn}_away`}
                          value={game.away}
                          onChange={v => updateGame(rubber.rubber_number, gi, { away: v })}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save results'}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">Saved</span>}
      </div>
    </form>
  )
}
