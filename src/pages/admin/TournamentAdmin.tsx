import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import PageHeader from '../../components/ui/PageHeader'
import EmptyState from '../../components/ui/EmptyState'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import PositionBadge from '../../components/ui/PositionBadge'
import {
  useTournaments,
  useTournament,
  useTournamentPlayers,
  useTournamentStandings,
  useTournamentMatches,
  usePlayerStats,
  createTournament,
  createRoundMatches,
  deleteRoundMatches,
  saveMatchResults,
  updateTournamentStatus,
  deleteTournament,
  setTournamentPlayerActive,
  renameTournamentPlayer,
} from '../../lib/hooks'
import type { Tournament, TournamentMatch, TournamentPlayerEntry } from '../../lib/queries'

const inputClass = 'w-full bg-[#110d1e] border border-[#3e325e] rounded text-[#ece6ff] px-2.5 py-[7px] font-body text-[0.82rem] outline-none focus:border-violet-500/60 transition-colors'
const labelClass = 'block font-mono text-[0.65rem] tracking-[0.08em] uppercase text-[#504270] mb-1'
const panelClass = 'bg-[#161320] border border-[#3e325e] rounded-[6px] p-5'

const ROUND_LABEL: Record<number, string> = { 1: 'Round 1', 2: 'Round 2', 3: 'Round 3', 99: 'Final' }

function isRoundComplete(matches: TournamentMatch[], round: number): boolean {
  const roundMatches = matches.filter(m => m.round === round)
  return roundMatches.length > 0 && roundMatches.every(m => m.players.every(p => p.position != null))
}

// ─── Create tournament ──────────────────────────────────────────────────────

function CreateTournamentForm({ onCreated }: { onCreated: (id: string) => void }) {
  const queryClient = useQueryClient()
  const { data: playerStats = [] } = usePlayerStats()
  const knownPlayers = useMemo(() => playerStats.map(p => p.player_name).sort(), [playerStats])

  const [name, setName] = useState('')
  const [players, setPlayers] = useState<string[]>([])
  const [nameToAdd, setNameToAdd] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addPlayer(p: string) {
    const trimmed = p.trim()
    if (!trimmed || players.includes(trimmed)) return
    setPlayers(prev => [...prev, trimmed])
    setNameToAdd('')
  }

  async function handleSubmit() {
    if (!name.trim() || players.length < 3) return
    setSubmitting(true)
    setError(null)
    try {
      const id = await createTournament(name.trim(), players)
      await queryClient.invalidateQueries({ queryKey: ['tournaments'] })
      setName('')
      setPlayers([])
      onCreated(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create tournament')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={panelClass}>
      <div className="font-display font-semibold text-[0.85rem] text-[#ece6ff] mb-4">New tournament</div>

      <div className="mb-3">
        <label className={labelClass}>Name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Summer 2026 Open"
          className={inputClass}
        />
      </div>

      <div className="mb-3">
        <label className={labelClass}>Players ({players.length})</label>
        <div className="flex gap-2 mb-2">
          <input
            value={nameToAdd}
            onChange={e => setNameToAdd(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPlayer(nameToAdd) } }}
            placeholder="Player name"
            list="known-players"
            className={inputClass}
          />
          <datalist id="known-players">
            {knownPlayers.map(p => <option key={p} value={p} />)}
          </datalist>
          <Button type="button" variant="secondary" onClick={() => addPlayer(nameToAdd)}>Add</Button>
        </div>
        {players.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {players.map(p => (
              <span
                key={p}
                className="inline-flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/30 text-[#ece6ff] rounded px-2 py-1 font-body text-[0.78rem]"
              >
                {p}
                <button
                  type="button"
                  onClick={() => setPlayers(prev => prev.filter(x => x !== p))}
                  className="text-[#625c7c] hover:text-mars-400"
                  aria-label={`Remove ${p}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
        {players.length > 0 && players.length < 3 && (
          <p className="font-body text-[0.72rem] text-mars-500 mt-2">Need at least 3 players.</p>
        )}
      </div>

      {error && <p className="font-body text-[0.75rem] text-mars-500 mb-3">{error}</p>}

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !name.trim() || players.length < 3}
      >
        {submitting ? 'Creating…' : 'Create tournament'}
      </Button>
    </div>
  )
}

// ─── Match result entry ─────────────────────────────────────────────────────

type MatchEditState = Record<string, { position: string; milestones_claimed: string; awards_won: string }>

function initialEditState(match: TournamentMatch): MatchEditState {
  return Object.fromEntries(match.players.map(p => [p.player_name, {
    position: p.position?.toString() ?? '',
    milestones_claimed: String(p.milestones_claimed ?? 0),
    awards_won: String(p.awards_won ?? 0),
  }]))
}

function PlacementPicker({ tableSize, value, onChange }: { tableSize: number; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: tableSize }, (_, i) => i + 1).map(n => {
        const selected = value === String(n)
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(String(n))}
            aria-label={`Place ${n}`}
            className={cn(
              'size-9 shrink-0 rounded-full border font-mono text-[0.85rem] font-semibold transition-colors',
              selected
                ? 'bg-mars-500 border-mars-500 text-white'
                : 'border-[#3e325e] text-[#625c7c] hover:border-mars-500/50 hover:text-[#ece6ff]'
            )}
          >
            {n}
          </button>
        )
      })}
    </div>
  )
}

function CountSelect({ value, onChange, max = 3 }: { value: string; onChange: (v: string) => void; max?: number }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-[52px] shrink-0 bg-[#110d1e] border border-[#3e325e] rounded text-[#ece6ff] px-1 py-1.5 font-mono text-[0.82rem] text-center outline-none focus:border-violet-500/60 transition-colors"
    >
      {Array.from({ length: max + 1 }, (_, n) => n).map(n => <option key={n} value={n}>{n}</option>)}
    </select>
  )
}

function MatchCard({ tournamentId, match, tableNumber }: { tournamentId: string; match: TournamentMatch; tableNumber: number }) {
  const queryClient = useQueryClient()
  const tableSize = match.players.length
  const isComplete = match.players.every(p => p.position != null)

  const [editing, setEditing] = useState(!isComplete)
  const [edits, setEdits] = useState<MatchEditState>(() => initialEditState(match))
  const [saving, setSaving] = useState(false)

  function updateField(player: string, field: keyof MatchEditState[string], value: string) {
    setEdits(prev => ({ ...prev, [player]: { ...prev[player], [field]: value } }))
  }

  const positions = match.players.map(p => Number(edits[p.player_name]?.position))
  const allPositionsChosen = positions.every(p => p >= 1 && p <= tableSize)
  const positionsDistinct = new Set(positions).size === positions.length

  // Only 3 milestones exist per game, and each can be claimed by one player —
  // so the total claimed across the table can never exceed 3 (awards can tie,
  // so no such cap applies there).
  const totalMilestones = match.players.reduce((sum, p) => sum + (Number(edits[p.player_name]?.milestones_claimed) || 0), 0)
  const milestonesValid = totalMilestones <= 3

  function maxMilestonesFor(playerName: string): number {
    const own = Number(edits[playerName]?.milestones_claimed) || 0
    const remaining = Math.max(0, Math.min(3, 3 - (totalMilestones - own)))
    return Math.max(remaining, own) // never hide the currently-selected value
  }

  const canSave = allPositionsChosen && positionsDistinct && milestonesValid

  async function handleSave() {
    setSaving(true)
    try {
      await saveMatchResults(match.id, match.players.map(p => ({
        player_name: p.player_name,
        position: Number(edits[p.player_name].position),
        milestones_claimed: Number(edits[p.player_name].milestones_claimed) || 0,
        awards_won: Number(edits[p.player_name].awards_won) || 0,
      })))
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tournament-matches', tournamentId] }),
        queryClient.invalidateQueries({ queryKey: ['tournament-standings', tournamentId] }),
      ])
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function handleCancelEdit() {
    setEdits(initialEditState(match))
    setEditing(false)
  }

  return (
    <div className="bg-[#110d1e] border border-[#3e325e] rounded-[6px] px-4 py-3.5">
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[0.68rem] tracking-[0.08em] uppercase text-[#a89ec0]">
          Table {tableNumber} <span className="text-[#504270]">· {tableSize} players</span>
          {isComplete && <span className="text-win-500 ml-2">✓ recorded</span>}
        </div>
        {!editing && (
          <button
            type="button"
            className="font-mono text-[0.65rem] tracking-[0.06em] uppercase text-[#5b8dd9] hover:underline"
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col">
          <div className="flex items-center gap-4 pb-1.5 mb-1">
            <span className="flex-1" />
            <span className={cn(labelClass, 'w-[168px] text-center mb-0')}>Placement</span>
            <span className={cn(labelClass, 'w-[52px] text-center mb-0')}>Miles.</span>
            <span className={cn(labelClass, 'w-[52px] text-center mb-0')}>Awards</span>
          </div>
          <div className="flex flex-col divide-y divide-[#241d38]">
            {match.players.map(p => (
              <div key={p.player_name} className="flex items-center gap-4 py-2.5 first:pt-1">
                <span className="flex-1 min-w-0 font-body font-semibold text-[0.95rem] text-[#ece6ff] truncate">
                  {p.player_name}
                </span>
                <div className="w-[168px] flex justify-center">
                  <PlacementPicker
                    tableSize={tableSize}
                    value={edits[p.player_name].position}
                    onChange={v => updateField(p.player_name, 'position', v)}
                  />
                </div>
                <CountSelect
                  value={edits[p.player_name].milestones_claimed}
                  onChange={v => updateField(p.player_name, 'milestones_claimed', v)}
                  max={maxMilestonesFor(p.player_name)}
                />
                <CountSelect value={edits[p.player_name].awards_won} onChange={v => updateField(p.player_name, 'awards_won', v)} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3">
            <Button type="button" size="sm" onClick={handleSave} disabled={saving || !canSave}>
              {saving ? 'Saving…' : 'Save match'}
            </Button>
            {isComplete && (
              <Button type="button" size="sm" variant="ghost" onClick={handleCancelEdit}>Cancel</Button>
            )}
            {!positionsDistinct && (
              <p className="font-body text-[0.72rem] text-mars-500">Each player needs a distinct placement.</p>
            )}
            {!milestonesValid && (
              <p className="font-body text-[0.72rem] text-mars-500">Only 3 milestones exist per game — the total can't exceed 3.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-[#241d38]">
          {[...match.players].sort((a, b) => (a.position ?? 99) - (b.position ?? 99)).map(p => (
            <div key={p.player_name} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {p.position != null && <PositionBadge position={p.position} />}
                <span className="font-body font-semibold text-[0.92rem] text-[#ece6ff] truncate">{p.player_name}</span>
              </div>
              <span className="font-mono text-[0.72rem] text-[#625c7c] whitespace-nowrap">
                {p.milestones_claimed} milestones · {p.awards_won} awards
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Round section ──────────────────────────────────────────────────────────

function RoundSection({ tournamentId, round, matches, canGenerate, blockedReason }: {
  tournamentId: string
  round: 1 | 2 | 3 | 99
  matches: TournamentMatch[]
  canGenerate: boolean
  blockedReason: string
}) {
  const queryClient = useQueryClient()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const roundLabel = round === 99 ? 'final' : ROUND_LABEL[round].toLowerCase()
  const untouched = matches.length > 0 && matches.every(m => m.players.every(p => p.position == null))

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      await createRoundMatches(tournamentId, round)
      await queryClient.invalidateQueries({ queryKey: ['tournament-matches', tournamentId] })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate pairings')
    } finally {
      setGenerating(false)
    }
  }

  async function handleRegenerate() {
    if (!window.confirm(
      `Regenerate ${roundLabel} pairings? This only works because no results have been recorded for it yet — ` +
      'use this if an earlier round\'s results were corrected and these pairings no longer reflect that.'
    )) return

    setGenerating(true)
    setError(null)
    try {
      await deleteRoundMatches(tournamentId, round)
      await createRoundMatches(tournamentId, round)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to regenerate pairings')
    } finally {
      await queryClient.invalidateQueries({ queryKey: ['tournament-matches', tournamentId] })
      setGenerating(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono text-[0.68rem] tracking-[0.08em] uppercase text-[#d07832]">
          {ROUND_LABEL[round]}
        </div>
        {untouched && (
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={generating}
            className="font-mono text-[0.62rem] tracking-[0.06em] uppercase text-[#5b8dd9] hover:underline disabled:opacity-50"
          >
            {generating ? 'Regenerating…' : 'Regenerate pairings'}
          </button>
        )}
      </div>
      {matches.length === 0 ? (
        canGenerate ? (
          <div>
            <Button type="button" variant="secondary" size="sm" onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generating…' : `Generate ${roundLabel} pairings`}
            </Button>
            {error && <p className="font-body text-[0.72rem] text-mars-500 mt-1.5">{error}</p>}
          </div>
        ) : (
          <p className="font-body text-[0.78rem] text-[#504270]">{blockedReason}</p>
        )
      ) : (
        <div className="flex flex-col gap-3">
          {error && <p className="font-body text-[0.72rem] text-mars-500">{error}</p>}
          {matches.map((m, i) => <MatchCard key={m.id} tournamentId={tournamentId} match={m} tableNumber={i + 1} />)}
        </div>
      )}
    </div>
  )
}

// ─── Players panel ──────────────────────────────────────────────────────────

function PlayersPanel({ tournamentId, players }: { tournamentId: string; players: TournamentPlayerEntry[] }) {
  const queryClient = useQueryClient()
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)

  async function toggle(playerName: string, active: boolean) {
    await setTournamentPlayerActive(tournamentId, playerName, active)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tournament-players', tournamentId] }),
      queryClient.invalidateQueries({ queryKey: ['tournament-standings', tournamentId] }),
    ])
  }

  function startEdit(playerName: string) {
    setEditingPlayer(playerName)
    setEditValue(playerName)
    setRenameError(null)
  }

  async function commitEdit() {
    if (!editingPlayer) return
    const oldName = editingPlayer
    const trimmed = editValue.trim()

    if (!trimmed || trimmed === oldName) {
      setEditingPlayer(null)
      return
    }

    try {
      await renameTournamentPlayer(tournamentId, oldName, trimmed)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tournament-players', tournamentId] }),
        queryClient.invalidateQueries({ queryKey: ['tournament-standings', tournamentId] }),
        queryClient.invalidateQueries({ queryKey: ['tournament-matches', tournamentId] }),
      ])
      setEditingPlayer(null)
    } catch (e) {
      setRenameError(e instanceof Error ? e.message : 'Failed to rename player')
    }
  }

  return (
    <div className={panelClass}>
      <div className="font-display font-semibold text-[0.85rem] text-[#ece6ff] mb-3">Players</div>
      <div className="flex flex-wrap gap-1.5">
        {players.map(p => (
          editingPlayer === p.player_name ? (
            <input
              key={p.player_name}
              autoFocus
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
                if (e.key === 'Escape') { e.preventDefault(); setEditingPlayer(null) }
              }}
              className="w-[140px] bg-[#110d1e] border border-violet-500/50 rounded px-2 py-1 font-body text-[0.78rem] text-[#ece6ff] outline-none"
            />
          ) : (
            <span
              key={p.player_name}
              className={cn(
                'inline-flex items-center gap-1.5 rounded px-2 py-1 font-body text-[0.78rem] border',
                p.active
                  ? 'bg-violet-500/10 border-violet-500/30 text-[#ece6ff]'
                  : 'bg-transparent border-[#3e325e] text-[#504270] line-through'
              )}
            >
              {p.player_name}
              <button
                type="button"
                onClick={() => startEdit(p.player_name)}
                className="no-underline text-[#625c7c] hover:text-[#5b8dd9]"
                aria-label={`Rename ${p.player_name}`}
              >
                ✎
              </button>
              <button
                type="button"
                onClick={() => toggle(p.player_name, !p.active)}
                className="no-underline text-[#625c7c] hover:text-mars-400"
                aria-label={p.active ? `Remove ${p.player_name}` : `Restore ${p.player_name}`}
              >
                {p.active ? '✕' : '↺'}
              </button>
            </span>
          )
        ))}
      </div>
      {renameError && <p className="font-body text-[0.72rem] text-mars-500 mt-2">{renameError}</p>}
      <p className="font-body text-[0.7rem] text-[#625c7c] mt-2 leading-relaxed">
        Click ✎ to fix a typo — it updates their name everywhere, including past results. Removing a player
        excludes them from future round pairings, but keeps already-recorded results.
      </p>
    </div>
  )
}

// ─── Tournament panel ───────────────────────────────────────────────────────

function TournamentPanel({ tournamentId }: { tournamentId: string }) {
  const queryClient = useQueryClient()
  const { data: tournament } = useTournament(tournamentId)
  const { data: players = [] } = useTournamentPlayers(tournamentId)
  const { data: standings = [] } = useTournamentStandings(tournamentId)
  const { data: matches = [] } = useTournamentMatches(tournamentId)

  async function handleStatusChange(status: Tournament['status']) {
    await updateTournamentStatus(tournamentId, status)
    await queryClient.invalidateQueries({ queryKey: ['tournaments'] })
    await queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] })
  }

  async function handleDelete() {
    if (!window.confirm(`Delete tournament "${tournament?.name}"? This cannot be undone.`)) return
    await deleteTournament(tournamentId)
    await queryClient.invalidateQueries({ queryKey: ['tournaments'] })
  }

  if (!tournament) return null

  const matchesByRound = (round: number) => matches.filter(m => m.round === round)
  const qualifyingComplete = [1, 2, 3].every(r => isRoundComplete(matches, r))

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display font-semibold text-[1.05rem] text-[#ece6ff]">{tournament.name}</div>
          <div className="font-mono text-[0.65rem] tracking-[0.06em] uppercase text-[#504270] mt-0.5">
            {players.length} players · status: {tournament.status}
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={tournament.status} onValueChange={v => handleStatusChange(v as Tournament['status'])}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="qualifying">Qualifying</SelectItem>
              <SelectItem value="final">Final</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="destructive" size="sm" onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      <PlayersPanel tournamentId={tournamentId} players={players} />

      <div className={panelClass}>
        <div className="font-display font-semibold text-[0.85rem] text-[#ece6ff] mb-3">Standings</div>
        {standings.length === 0 ? (
          <p className="font-body text-[0.8rem] text-[#625c7c]">No qualifying results recorded yet.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#3e325e]">
                <th className="text-left font-mono text-[0.65rem] tracking-[0.06em] uppercase text-[#504270] pb-2">Player</th>
                <th className="text-right font-mono text-[0.65rem] tracking-[0.06em] uppercase text-[#504270] pb-2">TP</th>
                <th className="text-right font-mono text-[0.65rem] tracking-[0.06em] uppercase text-[#504270] pb-2">Games</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.player_name} className={cn(i > 0 && 'border-t border-[#241d38]')}>
                  <td className="font-body text-[0.83rem] text-[#ece6ff] py-1.5">
                    {s.player_name}
                    {!s.active && (
                      <span className="font-mono text-[0.62rem] tracking-[0.06em] uppercase text-[#504270] ml-2">withdrew</span>
                    )}
                  </td>
                  <td className="text-right font-mono text-[0.83rem] text-[#ece6ff] py-1.5">{s.tp.toFixed(1)}</td>
                  <td className="text-right font-mono text-[0.8rem] text-[#625c7c] py-1.5">{s.games_played}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={panelClass}>
        <div className="font-display font-semibold text-[0.85rem] text-[#ece6ff] mb-4">Rounds</div>
        <div className="flex flex-col gap-5">
          <RoundSection
            tournamentId={tournamentId}
            round={1}
            matches={matchesByRound(1)}
            canGenerate={matchesByRound(1).length === 0}
            blockedReason=""
          />
          <RoundSection
            tournamentId={tournamentId}
            round={2}
            matches={matchesByRound(2)}
            canGenerate={matchesByRound(2).length === 0 && isRoundComplete(matches, 1)}
            blockedReason="Complete round 1 first."
          />
          <RoundSection
            tournamentId={tournamentId}
            round={3}
            matches={matchesByRound(3)}
            canGenerate={matchesByRound(3).length === 0 && isRoundComplete(matches, 2)}
            blockedReason="Complete round 2 first."
          />
          <RoundSection
            tournamentId={tournamentId}
            round={99}
            matches={matchesByRound(99)}
            canGenerate={matchesByRound(99).length === 0 && qualifyingComplete}
            blockedReason="Complete all 3 qualifying rounds first."
          />
        </div>
      </div>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function TournamentAdmin() {
  const { data: tournaments = [], isLoading } = useTournaments()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = selectedId ?? tournaments[0]?.id ?? null

  return (
    <div className="page-enter py-8 px-9 min-h-full bg-[#0c0e12]">
      <PageHeader title="Tournaments" subtitle="Manage qualifying rounds, pairings, and finals" />

      <div className="grid gap-6" style={{ gridTemplateColumns: '260px 1fr' }}>
        <div className="flex flex-col gap-5">
          <CreateTournamentForm onCreated={setSelectedId} />

          <div className={panelClass}>
            <div className="font-display font-semibold text-[0.85rem] text-[#ece6ff] mb-3">All tournaments</div>
            {isLoading ? (
              <p className="font-body text-[0.8rem] text-[#625c7c]">Loading…</p>
            ) : tournaments.length === 0 ? (
              <p className="font-body text-[0.8rem] text-[#625c7c]">None yet.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {tournaments.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={cn(
                      'text-left px-2.5 py-1.5 rounded font-body text-[0.82rem] transition-colors',
                      t.id === selected ? 'bg-violet-500/15 text-[#ece6ff]' : 'text-[#a89ec0] hover:bg-[#241d38]'
                    )}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          {selected ? <TournamentPanel tournamentId={selected} /> : <EmptyState message="Create a tournament to get started." />}
        </div>
      </div>
    </div>
  )
}
