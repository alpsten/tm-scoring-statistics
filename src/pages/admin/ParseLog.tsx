import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useGames, usePlayerStats, useCardReference } from '../../lib/hooks'
import { parseGameLog } from '../../lib/logParser'
import type { ParsedLog } from '../../lib/logParser'
import PageHeader from '../../components/ui/PageHeader'

type Step = 'input' | 'preview' | 'done'

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

export default function ParseLog() {
  const qc = useQueryClient()
  const [step, setStep] = useState<Step>('input')
  const [rawLog, setRawLog] = useState('')
  const [parsed, setParsed] = useState<ParsedLog | null>(null)
  const [playerMap, setPlayerMap] = useState<Record<string, string>>({})
  const [selectedGameId, setSelectedGameId] = useState('')
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{ cards: number; milestones: number } | null>(null)
  const [milestoneResolutions, setMilestoneResolutions] = useState<Record<string, string>>({})

  const { data: games = [] } = useGames()
  const { data: playerStats = [] } = usePlayerStats()
  const { data: cardRef = [] } = useCardReference()
  const allDbPlayers = [...new Set(playerStats.map(p => p.player_name))].sort()

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
    setSelectedGameId('')
    setMilestoneResolutions({})
    setSaveError(null)
    setExpandedPlayers(new Set())
    setStep('preview')
  }

  async function handleImport() {
    if (!selectedGameId || !parsed) return
    setSaving(true)
    setSaveError(null)
    try {
      // Clear existing data so re-imports are safe
      // Only delete log-claimed rows (player_name IS NOT NULL) — preserve config entries (player_name IS NULL)
      await supabase.from('cards_played').delete().eq('game_id', selectedGameId)
      await supabase.from('game_milestones').delete().eq('game_id', selectedGameId).not('player_name', 'is', null)

      const resolvedName = (logName: string) => playerMap[logName] || logName

      if (parsed.cards.length > 0) {
        const { error } = await supabase.from('cards_played').insert(
          parsed.cards.map(c => ({
            game_id: selectedGameId,
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
        const resolveMilestoneName = (logName: string): string =>
          milestoneResolutions[logName] ?? logName
        const { error } = await supabase.from('game_milestones').insert(
          parsed.milestones.map(m => ({
            game_id: selectedGameId,
            player_name: resolvedName(m.player_name),
            milestone_name: resolveMilestoneName(m.milestone_name),
            claimed_order: m.claimed_order,
          }))
        )
        if (error) throw error
      }

      await qc.invalidateQueries({ queryKey: ['card-stats'] })

      setImportResult({ cards: parsed.cards.length, milestones: parsed.milestones.length })
      setStep('done')
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message
      setSaveError(msg ?? 'Import failed')
    } finally {
      setSaving(false)
    }
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
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => { setStep('input'); setRawLog(''); setParsed(null); setImportResult(null) }}
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
                onChange={e => { setSelectedGameId(e.target.value); setMilestoneResolutions({}) }}
              >
                <option value="">— select a game —</option>
                {[...games].sort((a, b) => (b.game_number ?? 0) - (a.game_number ?? 0)).map(g => (
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
                      className={`${inputClass} flex-1 h-[34px]`}
                      value={playerMap[logName] ?? ''}
                      onChange={e => setPlayerMap(prev => ({ ...prev, [logName]: e.target.value }))}
                    >
                      <option value="">— select player —</option>
                      {allDbPlayers.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                      <option value={logName}>Use as-is: {logName}</option>
                    </select>
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
                        className={`${inputClass} flex-1 h-[34px] ${milestoneResolutions[logName] ? '' : 'border-[#d4a820]'}`}
                        value={milestoneResolutions[logName] ?? ''}
                        onChange={e => setMilestoneResolutions(prev => ({ ...prev, [logName]: e.target.value }))}
                      >
                        <option value="">— choose version —</option>
                        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
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
                {saving ? 'Importing…' : `Import ${parsed.cards.length} cards + ${parsed.milestones.length} milestones`}
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

      <div className="max-w-[720px]">
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
