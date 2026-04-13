import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useGames, usePlayerStats } from '../../lib/hooks'
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

const sectionLabel: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.62rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#504270',
  marginBottom: '8px',
}


const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#110d1e',
  border: '1px solid #3e325e',
  borderRadius: '4px',
  color: '#ece6ff',
  padding: '7px 10px',
  fontFamily: 'var(--font-body)',
  fontSize: '0.82rem',
}

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
      <div className="page-enter" style={{ padding: '32px 36px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link to="/admin" style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#625c7c', textDecoration: 'none' }}>← Admin</Link>
        </div>
        <PageHeader title="Import complete" subtitle="Log data saved successfully" />
        <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
          <div style={{ background: '#1e1835', border: '1px solid rgba(155,80,240,0.25)', borderRadius: '6px', padding: '20px 28px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 700, color: '#b87aff' }}>{importResult.cards}</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#504270', marginTop: '4px' }}>cards imported</div>
          </div>
          <div style={{ background: '#1e1835', border: '1px solid rgba(46,139,139,0.25)', borderRadius: '6px', padding: '20px 28px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 700, color: '#3bbfbf' }}>{importResult.milestones}</div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#504270', marginTop: '4px' }}>milestones imported</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => { setStep('input'); setRawLog(''); setParsed(null); setImportResult(null) }}
            style={{ padding: '9px 20px', background: 'rgba(155,80,240,0.12)', border: '1px solid rgba(155,80,240,0.4)', borderRadius: '4px', color: '#b87aff', fontFamily: 'var(--font-body)', fontSize: '0.83rem', cursor: 'pointer' }}
          >
            Parse another log
          </button>
          <Link
            to="/admin"
            style={{ padding: '9px 20px', background: 'transparent', border: '1px solid #282042', borderRadius: '4px', color: '#625c7c', fontFamily: 'var(--font-body)', fontSize: '0.83rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
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

    return (
      <div className="page-enter" style={{ padding: '32px 36px' }}>
        <div style={{ marginBottom: '24px' }}>
          <button onClick={() => setStep('input')} style={{ background: 'none', border: 'none', color: '#625c7c', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.78rem', padding: 0 }}>← Edit log</button>
        </div>

        <PageHeader
          title="Log preview"
          subtitle={`${parsed.cards.length} cards · ${parsed.milestones.length} milestones · ${parsed.total_generations} generations`}
        />

        {/* Summary row */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '28px' }}>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Game session selector */}
            <div>
              <div style={sectionLabel}>Attach to game session *</div>
              <select
                style={{ ...inputStyle, height: '38px' }}
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
              <div style={sectionLabel}>Player name mapping</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {parsed.players.map(logName => (
                  <div key={logName} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#8e87a8', minWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {logName}
                    </div>
                    <div style={{ color: '#504270', fontSize: '0.7rem' }}>→</div>
                    <select
                      style={{ ...inputStyle, flex: 1, height: '34px' }}
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
                <div style={{ marginTop: '8px', fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: '#e05535' }}>
                  All players must be mapped before importing.
                </div>
              )}
            </div>

            {/* Milestone disambiguation */}
            {milestoneAmbiguities.length > 0 && (
              <div>
                <div style={{ ...sectionLabel, color: '#d4a820' }}>Milestone disambiguation</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {milestoneAmbiguities.map(({ logName, options }) => (
                    <div key={logName} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#d4a820', minWidth: '120px' }}>
                        "{logName}"
                      </div>
                      <div style={{ color: '#504270', fontSize: '0.7rem' }}>→</div>
                      <select
                        style={{ ...inputStyle, flex: 1, height: '34px', borderColor: milestoneResolutions[logName] ? '#3e325e' : '#d4a820' }}
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
                  <div style={{ marginTop: '8px', fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: '#d4a820' }}>
                    Resolve all milestone versions before importing.
                  </div>
                )}
              </div>
            )}

            {/* Milestones */}
            {parsed.milestones.length > 0 && (
              <div>
                <div style={sectionLabel}>Milestones ({parsed.milestones.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {parsed.milestones.map((m, i) => {
                    const resolved = resolveMilestoneName(m.milestone_name)
                    const wasResolved = resolved !== m.milestone_name
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', background: '#1e1835', borderRadius: '4px', border: '1px solid #282042' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: '#ece6ff' }}>{resolved}</span>
                          {wasResolved && (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#504270' }}>({m.milestone_name})</span>
                          )}
                        </div>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#625c7c' }}>{playerMap[m.player_name] || m.player_name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Import button */}
            <div>
              {saveError && (
                <div style={{ marginBottom: '10px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#e05535' }}>{saveError}</div>
              )}
              <button
                onClick={handleImport}
                disabled={!canImport || saving}
                style={{
                  padding: '10px 28px',
                  background: canImport ? 'rgba(155,80,240,0.15)' : 'rgba(100,100,100,0.08)',
                  border: `1px solid ${canImport ? 'rgba(155,80,240,0.5)' : '#282042'}`,
                  borderRadius: '4px',
                  color: canImport ? '#b87aff' : '#3e325e',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: canImport && !saving ? 'pointer' : 'not-allowed',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Importing…' : `Import ${parsed.cards.length} cards + ${parsed.milestones.length} milestones`}
              </button>
            </div>
          </div>

          {/* Right column — cards per player */}
          <div>
            <div style={sectionLabel}>Cards played ({parsed.cards.length} total)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(cardsByPlayer).map(([player, cards]) => {
                const expanded = expandedPlayers.has(player)
                return (
                  <div key={player} style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => toggleExpand(player)}
                      style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.85rem', color: '#ece6ff' }}>
                        {playerMap[player] || player}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#b87aff' }}>{cards.length} cards</span>
                        <span style={{ color: '#504270', fontSize: '0.65rem' }}>{expanded ? '▲' : '▼'}</span>
                      </span>
                    </button>
                    {expanded && (
                      <div style={{ borderTop: '1px solid #282042', maxHeight: '320px', overflowY: 'auto', padding: '8px 0' }}>
                        {cards.map((c, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 14px', gap: '8px' }}>
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#bbb4d0' }}>{c.card_name}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#504270', whiteSpace: 'nowrap' }}>gen {c.generation}</span>
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
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/admin" style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#625c7c', textDecoration: 'none' }}>← Admin</Link>
      </div>
      <PageHeader title="Parse game log" subtitle="Paste the game log from the Terraforming Mars app" />

      <div style={{ maxWidth: '720px' }}>
        <textarea
          value={rawLog}
          onChange={e => setRawLog(e.target.value)}
          placeholder={'Paste the full game log here…\n\nGameLog - 57\nFirst player this generation is …\n…'}
          style={{
            width: '100%',
            minHeight: '360px',
            background: '#1e1835',
            border: '1px solid #3e325e',
            borderRadius: '6px',
            color: '#ece6ff',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            padding: '16px',
            resize: 'vertical',
            lineHeight: 1.6,
            outline: 'none',
          }}
        />
        <div style={{ marginTop: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={handleParse}
            disabled={!rawLog.trim()}
            style={{
              padding: '10px 28px',
              background: rawLog.trim() ? 'rgba(155,80,240,0.15)' : 'rgba(100,100,100,0.08)',
              border: `1px solid ${rawLog.trim() ? 'rgba(155,80,240,0.5)' : '#282042'}`,
              borderRadius: '4px',
              color: rawLog.trim() ? '#b87aff' : '#3e325e',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: rawLog.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Parse log
          </button>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: '#3e325e' }}>
            Encoding issues (Ã¶ etc.) are fixed automatically.
          </span>
        </div>
      </div>
    </div>
  )
}
