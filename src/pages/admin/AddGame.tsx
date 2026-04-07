import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm, useFieldArray, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import PageHeader from '../../components/ui/PageHeader'
import { supabase } from '../../lib/supabase'
import { usePlayerStats, useCardReference } from '../../lib/hooks'

// ─── Shared styles (defined before Combobox so it can reference them) ─────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '34px',
  padding: '0 10px',
  background: '#171228',
  border: '1px solid #3e325e',
  borderRadius: '4px',
  color: '#ece6ff',
  fontFamily: 'var(--font-body)',
  fontSize: '0.83rem',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-body)',
  fontSize: '0.68rem',
  fontWeight: 500,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#625c7c',
  marginBottom: '5px',
}

// ─── Combobox ─────────────────────────────────────────────────────────────────

function Combobox({ value, onChange, options, placeholder }: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const q = value.toLowerCase()
  const filtered = (q ? options.filter(o => o.toLowerCase().includes(q)) : options).slice(0, 12)

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
        style={inputStyle}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0,
          background: '#1e1835', border: '1px solid #3e325e', borderRadius: '4px',
          zIndex: 200, maxHeight: '200px', overflowY: 'auto',
          boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
        }}>
          {filtered.map(opt => (
            <div
              key={opt}
              onMouseDown={() => { onChange(opt); setOpen(false) }}
              style={{ padding: '8px 12px', fontFamily: 'var(--font-body)', fontSize: '0.83rem', color: '#ece6ff', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#282042')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const playerSchema = z.object({
  player_name:       z.string().min(1, 'Required'),
  corporation:       z.string().min(1, 'Required'),
  tr:                z.coerce.number().min(0).max(63),
  milestone_vp:      z.coerce.number().min(0),
  award_vp:          z.coerce.number().min(0),
  greenery_vp:       z.coerce.number().min(0),
  city_vp:           z.coerce.number().min(0),
  card_vp:           z.coerce.number().min(0),
  habitat_vp:        z.coerce.number().min(0).nullable(),
  logistics_vp:      z.coerce.number().min(0).nullable(),
  mining_vp:         z.coerce.number().min(0).nullable(),
  total_vp:          z.coerce.number().min(0),
  position:          z.coerce.number().min(1),
  key_notes:         z.string(),
  oxygen_steps:      z.coerce.number().min(0).default(0),
  temperature_steps: z.coerce.number().min(0).default(0),
  ocean_steps:       z.coerce.number().min(0).default(0),
  venus_steps:       z.coerce.number().min(0).default(0),
})

const gameSchema = z.object({
  date:        z.string().min(1, 'Required'),
  generations: z.coerce.number().min(1).nullable(),
  map_name:    z.string(),
  notes:       z.string(),
  game_code:   z.string(),
  players:     z.array(playerSchema).min(1),
})

type GameFormValues = z.infer<typeof gameSchema>

// ─── Constants ────────────────────────────────────────────────────────────────

const MAPS = [
  'Tharsis', 'Hellas', 'Elysium', 'Arabia Terra',
  'Amazonis Planitia', 'Terra Cimmeria', 'Vastitas Borealis', 'Utopia Planitia',
  'Vastitas Borealis Nova', 'Hollandia',
]
const EXPANSIONS = ['Prelude', 'Prelude 2', 'Venus Next', 'Colonies', 'Turmoil', 'Moon', 'Pathfinders']
const COLONY_TILES = [
  'Callisto', 'Ceres', 'Enceladus', 'Europa', 'Ganymede',
  'Io', 'Luna', 'Miranda', 'Pluto', 'Titan', 'Triton',
]

const SCORE_FIELDS: { key: keyof GameFormValues['players'][0]; label: string }[] = [
  { key: 'tr',           label: 'TR'     },
  { key: 'milestone_vp', label: 'MS'     },
  { key: 'award_vp',     label: 'Awards' },
  { key: 'greenery_vp',  label: 'Greens' },
  { key: 'city_vp',      label: 'Cities' },
  { key: 'card_vp',      label: 'Cards'  },
  { key: 'total_vp',     label: 'Total'  },
  { key: 'position',     label: 'Pos'    },
]

const PARAM_FIELDS: { key: 'oxygen_steps' | 'temperature_steps' | 'ocean_steps' | 'venus_steps'; label: string; color: string }[] = [
  { key: 'oxygen_steps',      label: 'Oxygen',      color: '#4a9e6b' },
  { key: 'temperature_steps', label: 'Temperature', color: '#e05535' },
  { key: 'ocean_steps',       label: 'Oceans',      color: '#2e8b8b' },
  { key: 'venus_steps',       label: 'Venus',       color: '#b87aff' },
]

const DEFAULT_PLAYER = {
  player_name: '', corporation: '',
  tr: 20, milestone_vp: 0, award_vp: 0, greenery_vp: 0, city_vp: 0, card_vp: 0,
  habitat_vp: null, logistics_vp: null, mining_vp: null,
  total_vp: 0, position: 1, key_notes: '',
  oxygen_steps: 0, temperature_steps: 0, ocean_steps: 0, venus_steps: 0,
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddGame() {
  const navigate = useNavigate()
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [hasMoon, setHasMoon]     = useState(false)
  const [hasParams, setHasParams] = useState(false)
  const [expansions, setExpansions] = useState<string[]>([])
  const [colonies, setColonies]     = useState<string[]>([])

  // Per-player merger state: how many corps each player has (1, 2, or 3)
  const [mergerCounts, setMergerCounts] = useState<number[]>([1, 1])
  const [extraCorp2, setExtraCorp2]     = useState<string[]>(['', ''])
  const [extraCorp3, setExtraCorp3]     = useState<string[]>(['', ''])

  const { data: playerStats } = usePlayerStats()
  const { data: cardRef }     = useCardReference()

  const existingPlayers = (playerStats ?? []).map(p => p.player_name).sort()
  const corporations = (cardRef ?? [])
    .filter(c => c.card_type === 'Corporation')
    .map(c => c.card_name)
    .sort()

  const { register, control, handleSubmit, formState: { errors } } = useForm<GameFormValues>({
    resolver: zodResolver(gameSchema) as Resolver<GameFormValues>,
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      generations: null,
      map_name: '',
      notes: '',
      game_code: '',
      players: [
        { ...DEFAULT_PLAYER, position: 1 },
        { ...DEFAULT_PLAYER, position: 2 },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'players' })

  // ── Helper array sync ────────────────────────────────────────────────────────

  function addHelperRows(count: number) {
    setMergerCounts(prev => [...prev, ...Array(count).fill(1)])
    setExtraCorp2(prev => [...prev, ...Array(count).fill('')])
    setExtraCorp3(prev => [...prev, ...Array(count).fill('')])
  }

  function removeHelperRows(indices: number[]) {
    const set = new Set(indices)
    setMergerCounts(prev => prev.filter((_, i) => !set.has(i)))
    setExtraCorp2(prev => prev.filter((_, i) => !set.has(i)))
    setExtraCorp3(prev => prev.filter((_, i) => !set.has(i)))
  }

  // ── Player count selector ────────────────────────────────────────────────────

  function setPlayerCount(target: number) {
    const current = fields.length
    if (target > current) {
      const toAdd = Array.from({ length: target - current }, (_, i) => ({
        ...DEFAULT_PLAYER, position: current + i + 1,
      }))
      toAdd.forEach(p => append(p))
      addHelperRows(toAdd.length)
    } else if (target < current) {
      const toRemove = Array.from({ length: current - target }, (_, i) => current - 1 - i)
      remove(toRemove)
      removeHelperRows(toRemove)
    }
  }

  function removePlayer(index: number) {
    remove(index)
    removeHelperRows([index])
  }

  // ── Merger ───────────────────────────────────────────────────────────────────

  function addMerger(playerIndex: number) {
    setMergerCounts(prev => {
      const n = [...prev]
      n[playerIndex] = Math.min(3, (n[playerIndex] ?? 1) + 1)
      return n
    })
  }

  function removeMerger(playerIndex: number) {
    const current = mergerCounts[playerIndex] ?? 1
    if (current === 3) {
      setExtraCorp3(prev => { const n = [...prev]; n[playerIndex] = ''; return n })
    } else if (current === 2) {
      setExtraCorp2(prev => { const n = [...prev]; n[playerIndex] = ''; return n })
    }
    setMergerCounts(prev => { const n = [...prev]; n[playerIndex] = Math.max(1, current - 1); return n })
  }

  // ── Expansions / Colonies toggles ────────────────────────────────────────────

  function toggleExpansion(name: string) {
    const removing = expansions.includes(name)
    setExpansions(prev => removing ? prev.filter(e => e !== name) : [...prev, name])
    if (name === 'Colonies' && removing) setColonies([])
  }

  function toggleColony(name: string) {
    setColonies(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name])
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function onSubmit(data: GameFormValues) {
    setSaving(true)
    setSaveError(null)
    try {
      // Merge extra corp names into corporation string for Merger plays
      const playersWithCorps = data.players.map((p, i) => {
        let corp = p.corporation
        if ((mergerCounts[i] ?? 1) >= 2 && extraCorp2[i]) corp += ', ' + extraCorp2[i]
        if ((mergerCounts[i] ?? 1) >= 3 && extraCorp3[i]) corp += ', ' + extraCorp3[i]
        return { ...p, corporation: corp }
      })

      const { data: session, error: sessionError } = await supabase
        .from('game_sessions')
        .insert({
          date: data.date,
          player_count: data.players.length,
          generations: data.generations || null,
          map_name: data.map_name || null,
          notes: data.notes || null,
          game_code: data.game_code || null,
        })
        .select('id')
        .single()
      if (sessionError) throw sessionError
      const gameId = session.id

      const { error: resultsError } = await supabase
        .from('player_results')
        .insert(playersWithCorps.map(p => ({
          game_id: gameId,
          player_name: p.player_name,
          corporation: p.corporation,
          tr: p.tr,
          milestone_vp: p.milestone_vp,
          award_vp: p.award_vp,
          greenery_vp: p.greenery_vp,
          city_vp: p.city_vp,
          card_vp: p.card_vp,
          habitat_vp: hasMoon ? p.habitat_vp : null,
          logistics_vp: hasMoon ? p.logistics_vp : null,
          mining_vp: hasMoon ? p.mining_vp : null,
          total_vp: p.total_vp,
          position: p.position,
          key_notes: p.key_notes || null,
        })))
      if (resultsError) throw resultsError

      if (expansions.length > 0) {
        const { error } = await supabase.from('game_expansions')
          .insert(expansions.map(e => ({ game_id: gameId, expansion_name: e })))
        if (error) throw error
      }

      if (colonies.length > 0) {
        const { error } = await supabase.from('game_colonies')
          .insert(colonies.map(c => ({ game_id: gameId, colony_name: c })))
        if (error) throw error
      }

      if (hasParams) {
        const params = playersWithCorps
          .map(p => ({
            game_id: gameId,
            player_name: p.player_name,
            oxygen_steps: p.oxygen_steps ?? 0,
            temperature_steps: p.temperature_steps ?? 0,
            ocean_steps: p.ocean_steps ?? 0,
            venus_steps: p.venus_steps ?? 0,
          }))
          .filter(p => p.oxygen_steps > 0 || p.temperature_steps > 0 || p.ocean_steps > 0 || p.venus_steps > 0)
        if (params.length > 0) {
          const { error } = await supabase.from('parameter_contributions').insert(params)
          if (error) throw error
        }
      }

      setSaved(true)
      setTimeout(() => navigate(`/games/${gameId}`), 1200)
    } catch (err) {
      console.error(err)
      setSaveError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="page-enter" style={{ padding: '32px 36px', maxWidth: '1100px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/admin" style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#625c7c', textDecoration: 'none' }}>← Admin</Link>
      </div>
      <PageHeader title="Log game session" />

      <form onSubmit={handleSubmit(onSubmit)}>

        {/* ── SESSION ──────────────────────────────────────────────────────── */}
        <div style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', padding: '24px', marginBottom: '24px' }}>
          <div style={sectionLabel}>Session</div>

          {/* Date / Map / Generations / Game code */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>Date *</label>
              <input type="date" {...register('date')} style={inputStyle} />
              {errors.date && <span style={errStyle}>{errors.date.message}</span>}
            </div>
            <div>
              <label style={labelStyle}>Map</label>
              <select {...register('map_name')} style={inputStyle}>
                <option value="">Select map…</option>
                {MAPS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Generations</label>
              <input type="number" min={1} {...register('generations')} placeholder="—" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Game code</label>
              <input {...register('game_code')} placeholder="gc…" style={inputStyle} />
            </div>
          </div>

          {/* Player count */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Players</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPlayerCount(n)}
                  style={{
                    width: '38px', height: '34px',
                    background: fields.length === n ? '#9b50f0' : '#171228',
                    border: `1px solid ${fields.length === n ? '#9b50f0' : '#3e325e'}`,
                    borderRadius: '4px',
                    color: fields.length === n ? '#fff' : '#8e87a8',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.88rem',
                    fontWeight: fields.length === n ? 700 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Expansions */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Expansions</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {EXPANSIONS.map(e => {
                const on = expansions.includes(e)
                return (
                  <button
                    key={e}
                    type="button"
                    onClick={() => toggleExpansion(e)}
                    style={{
                      padding: '4px 12px',
                      background: on ? 'rgba(155, 80, 240, 0.12)' : 'transparent',
                      border: `1px solid ${on ? '#9b50f0' : '#3e325e'}`,
                      borderRadius: '12px',
                      color: on ? '#b87aff' : '#625c7c',
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      transition: 'all 0.12s',
                    }}
                  >
                    {on ? '✓ ' : ''}{e}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Colony tiles — only visible when Colonies expansion selected */}
          {expansions.includes('Colonies') && (
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Colony tiles in play</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {COLONY_TILES.map(c => {
                  const on = colonies.includes(c)
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleColony(c)}
                      style={{
                        padding: '3px 10px',
                        background: on ? 'rgba(46, 139, 139, 0.12)' : 'transparent',
                        border: `1px solid ${on ? '#2e8b8b' : '#3e325e'}`,
                        borderRadius: '12px',
                        color: on ? '#2e8b8b' : '#625c7c',
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.73rem',
                        cursor: 'pointer',
                        transition: 'all 0.12s',
                      }}
                    >
                      {c}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Options */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#8e87a8' }}>
              <input type="checkbox" checked={hasMoon} onChange={e => setHasMoon(e.target.checked)} style={{ accentColor: '#9b50f0' }} />
              Moon expansion (shows Moon VP fields)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#8e87a8' }}>
              <input type="checkbox" checked={hasParams} onChange={e => setHasParams(e.target.checked)} style={{ accentColor: '#9b50f0' }} />
              Track parameter contributions
            </label>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              {...register('notes')}
              placeholder="Optional session notes…"
              rows={2}
              style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical', minHeight: '60px' }}
            />
          </div>
        </div>

        {/* ── PLAYER RESULTS ───────────────────────────────────────────────── */}
        <div style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', padding: '24px', marginBottom: '24px' }}>
          <div style={sectionLabel}>Player results</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {fields.map((field, index) => (
              <div key={field.id} style={{ border: '1px solid #322850', borderRadius: '5px', padding: '16px' }}>

                {/* Row 1: Player + Corporation(s) */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', alignItems: 'flex-end' }}>

                  {/* Player name combobox */}
                  <div style={{ flex: '0 0 160px' }}>
                    <label style={labelStyle}>Player *</label>
                    <Controller
                      name={`players.${index}.player_name`}
                      control={control}
                      render={({ field: f }) => (
                        <Combobox
                          value={f.value}
                          onChange={f.onChange}
                          options={existingPlayers}
                          placeholder="Name"
                        />
                      )}
                    />
                    {errors.players?.[index]?.player_name && (
                      <span style={errStyle}>{errors.players[index]!.player_name!.message}</span>
                    )}
                  </div>

                  {/* Corporation combobox(es) + Merger controls */}
                  <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'flex-end', minWidth: 0 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <label style={labelStyle}>Corporation *</label>
                      <Controller
                        name={`players.${index}.corporation`}
                        control={control}
                        render={({ field: f }) => (
                          <Combobox
                            value={f.value}
                            onChange={f.onChange}
                            options={corporations}
                            placeholder="Corporation"
                          />
                        )}
                      />
                      {errors.players?.[index]?.corporation && (
                        <span style={errStyle}>{errors.players[index]!.corporation!.message}</span>
                      )}
                    </div>

                    {(mergerCounts[index] ?? 1) >= 2 && (
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <label style={{ ...labelStyle, color: '#d4a820' }}>Merger corp</label>
                        <Combobox
                          value={extraCorp2[index] ?? ''}
                          onChange={v => setExtraCorp2(prev => { const n = [...prev]; n[index] = v; return n })}
                          options={corporations}
                          placeholder="2nd corporation"
                        />
                      </div>
                    )}

                    {(mergerCounts[index] ?? 1) >= 3 && (
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <label style={{ ...labelStyle, color: '#d4a820' }}>3rd corp</label>
                        <Combobox
                          value={extraCorp3[index] ?? ''}
                          onChange={v => setExtraCorp3(prev => { const n = [...prev]; n[index] = v; return n })}
                          options={corporations}
                          placeholder="3rd corporation"
                        />
                      </div>
                    )}

                    {/* Merger + remove buttons */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {(mergerCounts[index] ?? 1) < 3 && (
                        <button
                          type="button"
                          onClick={() => addMerger(index)}
                          title="Player used the Merger Prelude card"
                          style={mergerBtnStyle}
                        >
                          Merger +
                        </button>
                      )}
                      {(mergerCounts[index] ?? 1) > 1 && (
                        <button type="button" onClick={() => removeMerger(index)} style={removeMergerBtnStyle}>−</button>
                      )}
                    </div>

                    {/* Remove player */}
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePlayer(index)}
                        style={{ padding: '7px 10px', background: 'transparent', border: '1px solid #3e325e', borderRadius: '4px', color: '#625c7c', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Row 2: Score fields */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'flex-end' }}>
                  {SCORE_FIELDS.map(f => (
                    <div key={f.key} style={{ flex: '1 1 0', minWidth: '48px' }}>
                      <label style={labelStyle}>{f.label}</label>
                      <input
                        type="number"
                        min={0}
                        {...register(`players.${index}.${f.key}`)}
                        style={inputStyle}
                      />
                    </div>
                  ))}
                </div>

                {/* Row 3: Strategy notes + Moon VP */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: hasParams ? '12px' : 0 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Strategy notes</label>
                    <input
                      {...register(`players.${index}.key_notes`)}
                      placeholder="e.g. Jovian engine, plant strategy…"
                      style={inputStyle}
                    />
                  </div>
                  {hasMoon && (
                    <>
                      {(['habitat_vp', 'logistics_vp', 'mining_vp'] as const).map(f => (
                        <div key={f} style={{ flex: '0 0 75px' }}>
                          <label style={labelStyle}>
                            {f === 'habitat_vp' ? 'Habitat' : f === 'logistics_vp' ? 'Logistics' : 'Mining'} VP
                          </label>
                          <input type="number" min={0} {...register(`players.${index}.${f}`)} style={inputStyle} />
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Row 4: Parameter contributions */}
                {hasParams && (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', paddingTop: '12px', borderTop: '1px solid #322850' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.67rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#504270', alignSelf: 'center', whiteSpace: 'nowrap', minWidth: '58px' }}>
                      Steps raised
                    </span>
                    {PARAM_FIELDS.map(f => (
                      <div key={f.key} style={{ flex: '0 0 80px' }}>
                        <label style={{ ...labelStyle, color: f.color }}>{f.label}</label>
                        <input type="number" min={0} {...register(`players.${index}.${f.key}`)} style={inputStyle} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── SUBMIT ───────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            type="submit"
            disabled={saving || saved}
            style={{
              padding: '10px 28px',
              background: saved ? '#4a9e6b' : saving ? '#282042' : '#9b50f0',
              border: 'none', borderRadius: '4px', color: '#fff',
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.9rem',
              cursor: saving || saved ? 'not-allowed' : 'pointer', transition: 'background 0.15s',
            }}
          >
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save game'}
          </button>
          <Link to="/admin" style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: '#625c7c', textDecoration: 'none' }}>
            Cancel
          </Link>
          {saveError && (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#e05535' }}>
              Error: {saveError}
            </span>
          )}
        </div>

      </form>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sectionLabel: React.CSSProperties = {
  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.8rem',
  letterSpacing: '0.1em', textTransform: 'uppercase', color: '#625c7c', marginBottom: '16px',
}
const errStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: '#e05535', marginTop: '3px', display: 'block',
}
const mergerBtnStyle: React.CSSProperties = {
  padding: '6px 9px', background: 'rgba(212, 168, 32, 0.08)',
  border: '1px solid rgba(212, 168, 32, 0.3)', borderRadius: '4px',
  color: '#d4a820', fontFamily: 'var(--font-body)', fontSize: '0.72rem',
  cursor: 'pointer', whiteSpace: 'nowrap',
}
const removeMergerBtnStyle: React.CSSProperties = {
  padding: '6px 9px', background: 'transparent', border: '1px solid #3e325e',
  borderRadius: '4px', color: '#625c7c', fontFamily: 'var(--font-body)',
  fontSize: '0.72rem', cursor: 'pointer',
}
