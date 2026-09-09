import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useGames, usePlayerStats, useCardReference } from '../../lib/hooks'
import { parseGameLog } from '../../lib/logParser'
import type { ParsedLog } from '../../lib/logParser'
import PageHeader from '../../components/ui/PageHeader'

type Step = 'input' | 'preview' | 'done'

type BulkSyncResult = {
  gameId: string
  gameNumber: number | null
  status: 'success' | 'skipped' | 'error'
  detail: string
}

// TM app outputs bare milestone names for versioned milestones — user must pick which variant
const MILESTONE_DISAMBIGUATION: Record<string, string[]> = {
  'Builder':    ['Builder7', 'Builder8'],
  'Forester':   ['Forester3', 'Forester4'],
  'Legend':     ['Legend4', 'Legend5'],
  'Pioneer':    ['Pioneer3', 'Pioneer4'],
  'Spacefarer': ['Spacefarer4', 'Spacefarer6'],
  'Tactician':  ['Tactician4', 'Tactician5'],
  'Terraformer':['Terraformer29', 'Terraformer35'],
  'Terran':     ['Terran5', 'Terran6'],
  'Tycoon':     ['Tycoon10', 'Tycoon15'],
}

const sectionLabelClass = 'font-mono text-[0.62rem] tracking-[0.1em] uppercase text-[#504270] mb-2'
const inputClass = 'w-full bg-[#110d1e] border border-[#3e325e] rounded text-[#ece6ff] px-2.5 py-[7px] font-body text-[0.82rem] outline-none focus:border-violet-500/60 transition-colors'

// Suggests a player-name mapping and milestone-version resolution for re-parsing an
// already-imported game, by overlap-matching the freshly parsed cards/milestones against
// what's already stored for that game. Shared by the single-game preview step (which lets
// the user review/override the suggestion) and bulk sync (which trusts it outright, since
// every game it targets was already imported once with a human-reviewed mapping).
async function computeAutoMapping(
  gameId: string,
  parsed: ParsedLog,
  allDbPlayers: string[]
): Promise<{ playerMap: Record<string, string>; milestoneResolutions: Record<string, string>; overlapMatchedPlayers: Set<string>; matchedMilestones: Set<string> }> {
  const playerMap: Record<string, string> = {}
  for (const logPlayer of parsed.players) {
    playerMap[logPlayer] = allDbPlayers.includes(logPlayer) ? logPlayer : ''
  }
  const milestoneResolutions: Record<string, string> = {}
  const overlapMatchedPlayers = new Set<string>()
  const matchedMilestones = new Set<string>()

  const [{ data: existingCards }, { data: existingMilestones }] = await Promise.all([
    supabase.from('cards_played').select('player_name, card_name').eq('game_id', gameId),
    supabase.from('game_milestones').select('player_name, milestone_name').eq('game_id', gameId),
  ])

  if (existingCards && existingCards.length > 0) {
    const parsedByPlayer: Record<string, string[]> = {}
    for (const c of parsed.cards) (parsedByPlayer[c.player_name] ??= []).push(c.card_name)
    const existingByPlayer: Record<string, string[]> = {}
    for (const c of existingCards) (existingByPlayer[c.player_name] ??= []).push(c.card_name)

    const overlapScore = (a: string[], b: string[]) => {
      const bCount: Record<string, number> = {}
      for (const name of b) bCount[name] = (bCount[name] ?? 0) + 1
      let score = 0
      for (const name of a) {
        if (bCount[name] > 0) { score++; bCount[name]-- }
      }
      return score
    }

    const pairs: { logPlayer: string; dbPlayer: string; score: number }[] = []
    for (const logPlayer of Object.keys(parsedByPlayer)) {
      for (const dbPlayer of Object.keys(existingByPlayer)) {
        pairs.push({ logPlayer, dbPlayer, score: overlapScore(parsedByPlayer[logPlayer], existingByPlayer[dbPlayer]) })
      }
    }
    pairs.sort((a, b) => b.score - a.score)

    const usedLog = new Set<string>()
    const usedDb = new Set<string>()
    for (const { logPlayer, dbPlayer, score } of pairs) {
      if (score === 0 || usedLog.has(logPlayer) || usedDb.has(dbPlayer)) continue
      playerMap[logPlayer] = dbPlayer
      usedLog.add(logPlayer)
      usedDb.add(dbPlayer)
      overlapMatchedPlayers.add(logPlayer)
    }
  }

  if (existingMilestones && existingMilestones.length > 0) {
    const existingNames = new Set(existingMilestones.map(m => m.milestone_name))
    for (const [bareName, options] of Object.entries(MILESTONE_DISAMBIGUATION)) {
      const match = options.find(opt => existingNames.has(opt))
      if (match) { milestoneResolutions[bareName] = match; matchedMilestones.add(bareName) }
    }
  }

  return { playerMap, milestoneResolutions, overlapMatchedPlayers, matchedMilestones }
}

// Deletes and re-inserts one game's log-derived rows (cards_played, game_milestones,
// card_effect_events) from a freshly parsed log — the core of both the single-game
// re-import (handleImport) and bulk sync.
async function importParsedGame(
  gameId: string,
  rawLog: string,
  parsed: ParsedLog,
  playerMap: Record<string, string>,
  milestoneResolutions: Record<string, string>
): Promise<{ cards: number; milestones: number; cardEffects: number }> {
  // Only delete log-claimed rows (player_name IS NOT NULL) — preserve config entries (player_name IS NULL)
  await supabase.from('cards_played').delete().eq('game_id', gameId)
  await supabase.from('game_milestones').delete().eq('game_id', gameId).not('player_name', 'is', null)
  await supabase.from('card_effect_events').delete().eq('game_id', gameId)

  const resolvedName = (logName: string) => playerMap[logName] || logName

  if (parsed.cards.length > 0) {
    const { error } = await supabase.from('cards_played').insert(
      parsed.cards.map(c => ({
        game_id: gameId,
        player_name: resolvedName(c.player_name),
        card_name: c.card_name,
        card_order: c.card_order,
        generation: c.generation,
        vp_from_card: null,
        notes: null,
      }))
    )
    if (error) throw error
  }

  if (parsed.milestones.length > 0) {
    const resolveMilestoneName = (logName: string): string => milestoneResolutions[logName] ?? logName
    const { error } = await supabase.from('game_milestones').insert(
      parsed.milestones.map(m => ({
        game_id: gameId,
        player_name: resolvedName(m.player_name),
        milestone_name: resolveMilestoneName(m.milestone_name),
        claimed_order: m.claimed_order,
      }))
    )
    if (error) throw error
  }

  if (parsed.cardEffects.length > 0) {
    const { error } = await supabase.from('card_effect_events').insert(
      parsed.cardEffects.map(e => ({
        game_id: gameId,
        player_name: resolvedName(e.player_name),
        card_name: e.card_name,
        event_type: e.event_type,
        amount: e.amount,
        generation: e.generation,
        event_order: e.event_order,
        resource_type: e.resource_type ?? null,
        source_card: e.source_card ?? null,
      }))
    )
    if (error) throw error
  }

  const { error: logErr } = await supabase.from('game_sessions').update({ raw_log: rawLog }).eq('id', gameId)
  if (logErr) throw logErr

  return { cards: parsed.cards.length, milestones: parsed.milestones.length, cardEffects: parsed.cardEffects.length }
}

export default function ParseLog() {
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState<Step>('input')
  const [rawLog, setRawLog] = useState('')
  const [parsed, setParsed] = useState<ParsedLog | null>(null)
  const [playerMap, setPlayerMap] = useState<Record<string, string>>({})
  const [selectedGameId, setSelectedGameId] = useState('')
  const [loadedGameId, setLoadedGameId] = useState('')
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{ cards: number; milestones: number; cardEffects: number } | null>(null)
  const [milestoneResolutions, setMilestoneResolutions] = useState<Record<string, string>>({})
  const [autoMatchedPlayers, setAutoMatchedPlayers] = useState<Set<string>>(new Set())
  const [autoMatchedMilestones, setAutoMatchedMilestones] = useState<Set<string>>(new Set())
  const [bulkSyncing, setBulkSyncing] = useState(false)
  const [bulkConfirming, setBulkConfirming] = useState(false)
  const [bulkResults, setBulkResults] = useState<BulkSyncResult[] | null>(null)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)

  const { data: games = [] } = useGames()
  const { data: playerStats = [] } = usePlayerStats()
  const { data: cardRef = [] } = useCardReference()
  // Memoized: this is a dependency of the auto-mapping effect below, and a fresh array
  // reference on every render (even with identical contents) would retrigger that effect
  // on every keystroke/selection — including the user's own manual override of the
  // suggested player mapping, silently reverting it back to the suggestion.
  const allDbPlayers = useMemo(
    () => [...new Set(playerStats.map(p => p.player_name))].sort(),
    [playerStats]
  )

  const sortedGames = [...games].sort((a, b) => (b.game_number ?? 0) - (a.game_number ?? 0))
  const gamesWithLog = sortedGames.filter(g => g.raw_log)

  // Deep-link from a game's "Edit log" button: preselect that game and load its stored log
  useEffect(() => {
    const gameParam = searchParams.get('game')
    if (!gameParam || loadedGameId) return
    const g = games.find(g => g.id === gameParam)
    if (g) {
      setLoadedGameId(g.id)
      setRawLog(g.raw_log ?? '')
    }
  }, [searchParams, games, loadedGameId])

  function handleLoadGame(gameId: string) {
    setLoadedGameId(gameId)
    const g = games.find(g => g.id === gameId)
    setRawLog(g?.raw_log ?? '')
  }

  function handleParse() {
    if (!rawLog.trim()) return
    const result = parseGameLog(rawLog)
    setParsed(result)

    // Pre-populate map: exact match → use it, else leave blank
    const map: Record<string, string> = {}
    for (const logPlayer of result.players) {
      map[logPlayer] = allDbPlayers.includes(logPlayer) ? logPlayer : ''
    }
    setPlayerMap(map)
    setSelectedGameId(loadedGameId)
    setMilestoneResolutions({})
    setAutoMatchedPlayers(new Set())
    setAutoMatchedMilestones(new Set())
    setSaveError(null)
    setExpandedPlayers(new Set())
    setStep('preview')
  }

  // When re-parsing an already-imported game, suggest the player-name mapping and
  // milestone-version resolutions from what's already stored, instead of making the
  // user redo them from scratch every time they tweak the log.
  useEffect(() => {
    if (!selectedGameId || !parsed) return
    let cancelled = false
    ;(async () => {
      const { playerMap: suggested, milestoneResolutions: suggestedMilestones, overlapMatchedPlayers, matchedMilestones } =
        await computeAutoMapping(selectedGameId, parsed, allDbPlayers)
      if (cancelled) return

      if (overlapMatchedPlayers.size > 0) {
        setPlayerMap(prev => ({ ...prev, ...suggested }))
        setAutoMatchedPlayers(overlapMatchedPlayers)
      }
      if (matchedMilestones.size > 0) {
        setMilestoneResolutions(prev => ({ ...prev, ...suggestedMilestones }))
        setAutoMatchedMilestones(matchedMilestones)
      }
    })()
    return () => { cancelled = true }
  }, [selectedGameId, parsed, allDbPlayers])

  async function handleImport() {
    if (!selectedGameId || !parsed) return
    setSaving(true)
    setSaveError(null)
    try {
      const result = await importParsedGame(selectedGameId, rawLog, parsed, playerMap, milestoneResolutions)

      await qc.invalidateQueries({ queryKey: ['card-stats'] })
      await qc.invalidateQueries({ queryKey: ['card-effect-stats-global'] })
      await qc.invalidateQueries({ queryKey: ['card-effect-event-stats'] })
      await qc.invalidateQueries({ queryKey: ['card-resource-stats'] })
      await qc.invalidateQueries({ queryKey: ['card-resource-removal-stats'] })
      await qc.invalidateQueries({ queryKey: ['games'] })

      setImportResult(result)
      setStep('done')
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message
      setSaveError(msg ?? 'Import failed')
    } finally {
      setSaving(false)
    }
  }

  // Re-parses and re-imports every game that has a saved log, using the same
  // history-based auto-matching the single-game preview suggests — trusted outright here
  // since every target game was already imported once with a human-reviewed mapping, so
  // the overlap match against its own existing cards/milestones should reproduce it exactly.
  // A game whose auto-match can't fully resolve (e.g. a player/milestone it's never seen
  // before) is skipped rather than guessed at, and reported so it can be re-parsed by hand.
  async function handleBulkSync() {
    setBulkSyncing(true)
    setBulkResults(null)
    setBulkProgress({ done: 0, total: gamesWithLog.length })
    const results: BulkSyncResult[] = []

    for (const g of gamesWithLog) {
      const raw = g.raw_log
      if (!raw) continue
      try {
        const parsedLog = parseGameLog(raw)
        const { playerMap: map, milestoneResolutions: milestones } = await computeAutoMapping(g.id, parsedLog, allDbPlayers)

        const unresolvedPlayers = parsedLog.players.filter(p => !map[p])
        const milestoneNames = [...new Set(parsedLog.milestones.map(m => m.milestone_name))]
        const unresolvedMilestones = milestoneNames.filter(name => MILESTONE_DISAMBIGUATION[name] && !milestones[name])

        if (unresolvedPlayers.length > 0 || unresolvedMilestones.length > 0) {
          const reasons = [
            unresolvedPlayers.length > 0 ? `unmapped player(s): ${unresolvedPlayers.join(', ')}` : null,
            unresolvedMilestones.length > 0 ? `ambiguous milestone(s): ${unresolvedMilestones.join(', ')}` : null,
          ].filter(Boolean).join('; ')
          results.push({ gameId: g.id, gameNumber: g.game_number, status: 'skipped', detail: reasons })
        } else {
          const counts = await importParsedGame(g.id, raw, parsedLog, map, milestones)
          results.push({ gameId: g.id, gameNumber: g.game_number, status: 'success', detail: `${counts.cards} cards, ${counts.milestones} milestones, ${counts.cardEffects} card effects` })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        results.push({ gameId: g.id, gameNumber: g.game_number, status: 'error', detail: msg })
      }
      setBulkProgress(p => (p ? { ...p, done: p.done + 1 } : p))
    }

    await qc.invalidateQueries({ queryKey: ['card-stats'] })
    await qc.invalidateQueries({ queryKey: ['card-effect-stats-global'] })
    await qc.invalidateQueries({ queryKey: ['card-effect-event-stats'] })
    await qc.invalidateQueries({ queryKey: ['card-resource-stats'] })
    await qc.invalidateQueries({ queryKey: ['card-resource-removal-stats'] })
    await qc.invalidateQueries({ queryKey: ['games'] })

    setBulkResults(results)
    setBulkSyncing(false)
    setBulkConfirming(false)
  }

  function toggleExpand(player: string) {
    setExpandedPlayers(prev => {
      const next = new Set(prev)
      next.has(player) ? next.delete(player) : next.add(player)
      return next
    })
  }

  // ── Done ────────────────────────────────────────────────────────────────────
  if (step === 'done' && importResult) {
    return (
      <div className="page-enter py-8 px-9 min-h-full bg-[#0c0e12]">
        <div className="mb-6">
          <Link to="/admin" className="font-body text-[0.78rem] text-[#625c7c] no-underline">← Admin</Link>
        </div>
        <PageHeader title="Import complete" subtitle="Log data saved successfully" />
        <div className="flex gap-4 mb-8">
          <div className="bg-[#282042] border border-violet-500/25 rounded-[6px] px-7 py-5 text-center">
            <div className="font-mono text-[1.6rem] font-bold text-[#b87aff]">{importResult.cards}</div>
            <div className="font-body text-[0.75rem] text-[#504270] mt-1">cards imported</div>
          </div>
          <div className="bg-[#282042] border border-[rgba(46,139,139,0.25)] rounded-[6px] px-7 py-5 text-center">
            <div className="font-mono text-[1.6rem] font-bold text-[#3bbfbf]">{importResult.milestones}</div>
            <div className="font-body text-[0.75rem] text-[#504270] mt-1">milestones imported</div>
          </div>
          {importResult.cardEffects > 0 && (
            <div className="bg-[#282042] border border-score-400/25 rounded-[6px] px-7 py-5 text-center">
              <div className="font-mono text-[1.6rem] font-bold text-score-400">{importResult.cardEffects}</div>
              <div className="font-body text-[0.75rem] text-[#504270] mt-1">card effects imported</div>
            </div>
          )}
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => { setStep('input'); setRawLog(''); setParsed(null); setImportResult(null); setLoadedGameId('') }}
            className="px-5 py-[9px] bg-violet-500/15 border border-violet-500/40 rounded text-[#b87aff] font-body text-[0.83rem] cursor-pointer"
          >
            Parse another log
          </button>
          <Link
            to="/admin"
            className="px-5 py-[9px] bg-transparent border border-[#3e325e] rounded text-[#625c7c] font-body text-[0.83rem] no-underline inline-flex items-center"
          >
            Back to admin
          </Link>
        </div>
      </div>
    )
  }

  // ── Preview ─────────────────────────────────────────────────────────────────
  if (step === 'preview' && parsed) {
    const cardsByPlayer: Record<string, typeof parsed.cards> = {}
    for (const c of parsed.cards) {
      ;(cardsByPlayer[c.player_name] ??= []).push(c)
    }

    type MilestoneAmbiguity = { logName: string; options: string[] }
    const milestoneAmbiguities: MilestoneAmbiguity[] = [
      ...new Set(parsed.milestones.map(m => m.milestone_name)),
    ].flatMap(logName =>
      MILESTONE_DISAMBIGUATION[logName] ? [{ logName, options: MILESTONE_DISAMBIGUATION[logName] }] : []
    )

    const resolveMilestoneName = (logName: string): string => {
      if (milestoneResolutions[logName]) return milestoneResolutions[logName]
      if (MILESTONE_DISAMBIGUATION[logName]) return logName // unresolved — return as-is until user picks
      return logName
    }

    const ambiguousUnresolved = milestoneAmbiguities.some(a => !milestoneResolutions[a.logName])
    const canImport = selectedGameId && parsed.players.every(p => playerMap[p]) && !ambiguousUnresolved

    const knownNames = new Set(cardRef.map(c => c.card_name.toLowerCase()))
    const unknownCards = [...new Set(parsed.cards.map(c => c.card_name))]
      .filter(name => !knownNames.has(name.toLowerCase()))
      .sort()

    return (
      <div className="page-enter py-8 px-9 min-h-full bg-[#0c0e12]">
        <div className="mb-6">
          <button onClick={() => setStep('input')} className="bg-transparent border-none text-[#625c7c] cursor-pointer font-body text-[0.78rem] p-0">← Edit log</button>
        </div>

        <PageHeader
          title="Log preview"
          subtitle={`${parsed.cards.length} cards · ${parsed.milestones.length} milestones · ${parsed.total_generations} generations`}
        />

        {/* Unknown card names warning */}
        {unknownCards.length > 0 && (
          <div className="bg-mars-500/7 border border-mars-500/35 rounded-[6px] px-[18px] py-3.5 mb-6">
            <div className="font-mono text-[0.62rem] tracking-[0.1em] uppercase text-mars-500 mb-2.5">
              {unknownCards.length} card{unknownCards.length !== 1 ? 's' : ''} not found in card reference — possible spelling errors
            </div>
            <div className="flex flex-wrap gap-1.5">
              {unknownCards.map(name => (
                <span key={name} className="font-mono text-[0.72rem] px-2 py-[2px] rounded-[3px] bg-mars-500/10 text-mars-500 border border-mars-500/25">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">

          {/* Left column */}
          <div className="flex flex-col gap-6">

            {/* Game session selector */}
            <div>
              <div className={sectionLabelClass}>Attach to game session *</div>
              <select
                className={`${inputClass} h-[38px]`}
                value={selectedGameId}
                onChange={e => {
                  setSelectedGameId(e.target.value)
                  setMilestoneResolutions({})
                  setAutoMatchedPlayers(new Set())
                  setAutoMatchedMilestones(new Set())
                }}
              >
                <option value="">— select a game —</option>
                {sortedGames.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.date} · {g.map_name ?? 'No map'}{g.game_number != null ? ` · #${g.game_number}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Player name mapping */}
            <div>
              <div className={sectionLabelClass}>Player name mapping</div>
              <div className="flex flex-col gap-2">
                {parsed.players.map(logName => (
                  <div key={logName} className="flex items-center gap-2.5">
                    <div className="font-mono text-[0.75rem] text-[#8e87a8] min-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap">
                      {logName}
                    </div>
                    <div className="text-[#504270] text-[0.7rem]">→</div>
                    <select
                      className={`${inputClass} flex-1 h-[34px] ${autoMatchedPlayers.has(logName) ? 'border-[#3bbfbf]' : ''}`}
                      value={playerMap[logName] ?? ''}
                      onChange={e => setPlayerMap(prev => ({ ...prev, [logName]: e.target.value }))}
                    >
                      <option value="">— select player —</option>
                      {allDbPlayers.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                      <option value={logName}>Use as-is: {logName}</option>
                    </select>
                    {autoMatchedPlayers.has(logName) && (
                      <span className="font-mono text-[0.62rem] text-[#3bbfbf] whitespace-nowrap">matched</span>
                    )}
                  </div>
                ))}
              </div>
              {parsed.players.some(p => !playerMap[p]) && (
                <div className="mt-2 font-body text-[0.72rem] text-mars-500">
                  All players must be mapped before importing.
                </div>
              )}
            </div>

            {/* Milestone disambiguation */}
            {milestoneAmbiguities.length > 0 && (
              <div>
                <div className="font-mono text-[0.62rem] tracking-[0.1em] uppercase text-[#d4a820] mb-2">Milestone disambiguation</div>
                <div className="flex flex-col gap-2">
                  {milestoneAmbiguities.map(({ logName, options }) => (
                    <div key={logName} className="flex items-center gap-2.5">
                      <div className="font-mono text-[0.75rem] text-[#d4a820] min-w-[120px]">
                        "{logName}"
                      </div>
                      <div className="text-[#504270] text-[0.7rem]">→</div>
                      <select
                        className={`${inputClass} flex-1 h-[34px] ${milestoneResolutions[logName] ? (autoMatchedMilestones.has(logName) ? 'border-[#3bbfbf]' : '') : 'border-[#d4a820]'}`}
                        value={milestoneResolutions[logName] ?? ''}
                        onChange={e => setMilestoneResolutions(prev => ({ ...prev, [logName]: e.target.value }))}
                      >
                        <option value="">— choose version —</option>
                        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                      {autoMatchedMilestones.has(logName) && (
                        <span className="font-mono text-[0.62rem] text-[#3bbfbf] whitespace-nowrap">matched</span>
                      )}
                    </div>
                  ))}
                </div>
                {ambiguousUnresolved && (
                  <div className="mt-2 font-body text-[0.72rem] text-[#d4a820]">
                    Resolve all milestone versions before importing.
                  </div>
                )}
              </div>
            )}

            {/* Milestones */}
            {parsed.milestones.length > 0 && (
              <div>
                <div className={sectionLabelClass}>Milestones ({parsed.milestones.length})</div>
                <div className="flex flex-col gap-1.5">
                  {parsed.milestones.map((m, i) => {
                    const resolved = resolveMilestoneName(m.milestone_name)
                    const wasResolved = resolved !== m.milestone_name
                    return (
                      <div key={i} className="flex justify-between px-3 py-[7px] bg-[#282042] rounded border border-[#3e325e]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-body text-[0.82rem] text-[#ece6ff]">{resolved}</span>
                          {wasResolved && (
                            <span className="font-mono text-[0.6rem] text-[#504270]">({m.milestone_name})</span>
                          )}
                        </div>
                        <span className="font-body text-[0.78rem] text-[#625c7c]">{playerMap[m.player_name] || m.player_name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Import button */}
            <div>
              {saveError && (
                <div className="mb-2.5 font-mono text-[0.72rem] text-mars-500">{saveError}</div>
              )}
              <button
                onClick={handleImport}
                disabled={!canImport || saving}
                className={`px-7 py-[10px] rounded font-display font-semibold text-[0.88rem] transition-colors ${canImport ? 'bg-violet-500/15 border border-violet-500/50 text-[#b87aff] cursor-pointer' : 'bg-white/4 border border-[#3e325e] text-[#3e325e] cursor-not-allowed'} ${saving ? 'opacity-60' : ''}`}
              >
                {saving ? 'Importing…' : `Import ${parsed.cards.length} cards + ${parsed.milestones.length} milestones${parsed.cardEffects.length > 0 ? ` + ${parsed.cardEffects.length} card effects` : ''}`}
              </button>
            </div>
          </div>

          {/* Right column — cards per player */}
          <div>
            <div className={sectionLabelClass}>Cards played ({parsed.cards.length} total)</div>
            <div className="flex flex-col gap-2.5">
              {Object.entries(cardsByPlayer).map(([player, cards]) => {
                const expanded = expandedPlayers.has(player)
                return (
                  <div key={player} className="bg-[#282042] border border-[#3e325e] rounded-[6px] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleExpand(player)}
                      className="w-full flex justify-between items-center px-3.5 py-[10px] bg-transparent border-none cursor-pointer text-left"
                    >
                      <span className="font-display font-semibold text-[0.85rem] text-[#ece6ff]">
                        {playerMap[player] || player}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-[0.72rem] text-[#b87aff]">{cards.length} cards</span>
                        <span className="text-[#504270] text-[0.65rem]">{expanded ? '▲' : '▼'}</span>
                      </span>
                    </button>
                    {expanded && (
                      <div className="border-t border-[#3e325e] max-h-[320px] overflow-y-auto py-2">
                        {cards.map((c, i) => (
                          <div key={i} className="flex justify-between items-center px-3.5 py-1 gap-2">
                            <span className="font-body text-[0.78rem] text-[#bbb4d0]">{c.card_name}</span>
                            <span className="font-mono text-[0.65rem] text-[#504270] whitespace-nowrap">gen {c.generation}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    )
  }

  // ── Input ────────────────────────────────────────────────────────────────────
  return (
    <div className="page-enter py-8 px-9 min-h-full bg-[#0c0e12]">
      <div className="mb-6">
        <Link to="/admin" className="font-body text-[0.78rem] text-[#625c7c] no-underline">← Admin</Link>
      </div>
      <PageHeader title="Parse game log" subtitle="Paste the game log from the Terraforming Mars app" />

      <div className="max-w-[720px] bg-[#282042] border border-[#3e325e] rounded-[6px] px-5 py-4 mb-6">
        <div className={sectionLabelClass}>Sync all games</div>
        <p className="font-body text-[0.78rem] text-[#8e87a8] mt-0 mb-3">
          Re-parses every game with a saved log using its stored player/milestone mapping — for
          bringing already-imported games up to date after a parser fix, without re-parsing each
          one by hand. A game whose mapping can't be auto-resolved is skipped, not guessed at.
        </p>

        {bulkResults && (
          <div className="mb-3 flex flex-col gap-1.5 max-h-[240px] overflow-y-auto">
            {bulkResults.map(r => (
              <div
                key={r.gameId}
                className={`flex justify-between gap-3 px-3 py-[7px] rounded border font-body text-[0.78rem] ${
                  r.status === 'success' ? 'bg-win-500/8 border-win-500/25 text-win-500'
                  : r.status === 'skipped' ? 'bg-[#d4a820]/8 border-[#d4a820]/25 text-[#d4a820]'
                  : 'bg-mars-500/8 border-mars-500/25 text-mars-500'
                }`}
              >
                <span className="font-mono">#{r.gameNumber ?? '?'}</span>
                <span className="text-right">{r.detail}</span>
              </div>
            ))}
          </div>
        )}

        {bulkConfirming && !bulkSyncing && (
          <div className="mb-3">
            <div className="font-body text-[0.78rem] text-[#ece6ff] mb-2">
              This will re-parse and overwrite the stored cards/milestones/card-effects for these {gamesWithLog.length} games:
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {gamesWithLog.map(g => (
                <span key={g.id} className="font-mono text-[0.72rem] px-2 py-[2px] rounded-[3px] bg-[#110d1e] text-[#8e87a8] border border-[#3e325e]">
                  #{g.game_number} · {g.date}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2.5 items-center">
          {!bulkConfirming ? (
            <button
              onClick={() => { setBulkConfirming(true); setBulkResults(null) }}
              disabled={gamesWithLog.length === 0}
              className={`px-5 py-[9px] rounded font-body text-[0.82rem] ${gamesWithLog.length > 0 ? 'bg-violet-500/15 border border-violet-500/50 text-[#b87aff] cursor-pointer' : 'bg-white/4 border border-[#3e325e] text-[#3e325e] cursor-not-allowed'}`}
            >
              Sync {gamesWithLog.length} game{gamesWithLog.length !== 1 ? 's' : ''} with a saved log
            </button>
          ) : bulkSyncing ? (
            <span className="font-mono text-[0.78rem] text-[#8e87a8]">
              Syncing… {bulkProgress ? `${bulkProgress.done} / ${bulkProgress.total}` : ''}
            </span>
          ) : (
            <>
              <button
                onClick={handleBulkSync}
                className="px-5 py-[9px] bg-mars-500/15 border border-mars-500/50 rounded text-mars-500 font-body text-[0.82rem] cursor-pointer"
              >
                Confirm sync
              </button>
              <button
                onClick={() => setBulkConfirming(false)}
                className="px-5 py-[9px] bg-transparent border border-[#3e325e] rounded text-[#625c7c] font-body text-[0.82rem] cursor-pointer"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      <div className="max-w-[720px]">
        <div className="mb-4">
          <div className={sectionLabelClass}>Load an existing game's stored log to update it</div>
          <select
            className={`${inputClass} h-[38px]`}
            value={loadedGameId}
            onChange={e => handleLoadGame(e.target.value)}
          >
            <option value="">— start with a blank log —</option>
            {sortedGames.map(g => (
              <option key={g.id} value={g.id}>
                {g.date} · {g.map_name ?? 'No map'}{g.game_number != null ? ` · #${g.game_number}` : ''}{g.raw_log ? '' : ' (no log saved yet)'}
              </option>
            ))}
          </select>
          {loadedGameId && !rawLog && (
            <div className="mt-2 font-body text-[0.72rem] text-[#3e325e]">
              This game has no log saved yet — paste one below.
            </div>
          )}
        </div>
        <textarea
          value={rawLog}
          onChange={e => setRawLog(e.target.value)}
          placeholder={'Paste the full game log here…\n\nGameLog - 57\nFirst player this generation is …\n…'}
          className="w-full min-h-[360px] bg-[#282042] border border-[#3e325e] rounded-[6px] text-[#ece6ff] font-mono text-[0.75rem] p-4 resize-y leading-[1.6] outline-none focus:border-violet-500/60 transition-colors"
        />
        <div className="mt-3 flex gap-2.5 items-center">
          <button
            onClick={handleParse}
            disabled={!rawLog.trim()}
            className={`px-7 py-[10px] rounded font-display font-semibold text-[0.88rem] ${rawLog.trim() ? 'bg-violet-500/15 border border-violet-500/50 text-[#b87aff] cursor-pointer' : 'bg-white/4 border border-[#3e325e] text-[#3e325e] cursor-not-allowed'}`}
          >
            Parse log
          </button>
          <span className="font-body text-[0.72rem] text-[#3e325e]">
            Encoding issues (Ã¶ etc.) are fixed automatically.
          </span>
        </div>
      </div>
    </div>
  )
}
