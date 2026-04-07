import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm, useFieldArray, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import PageHeader from '../../components/ui/PageHeader'

// ─── Validation schema ────────────────────────────────────────────────────────

const playerSchema = z.object({
  player_name:  z.string().min(1, 'Required'),
  corporation:  z.string().min(1, 'Required'),
  tr:           z.coerce.number().min(0).max(63),
  milestone_vp: z.coerce.number().min(0),
  award_vp:     z.coerce.number().min(0),
  greenery_vp:  z.coerce.number().min(0),
  city_vp:      z.coerce.number().min(0),
  card_vp:      z.coerce.number().min(0),
  habitat_vp:   z.coerce.number().min(0).nullable(),
  logistics_vp: z.coerce.number().min(0).nullable(),
  mining_vp:    z.coerce.number().min(0).nullable(),
  total_vp:     z.coerce.number().min(0),
  position:     z.coerce.number().min(1),
  key_notes:    z.string(),
})

const gameSchema = z.object({
  date:         z.string().min(1, 'Required'),
  player_count: z.coerce.number().min(1).max(6),
  generations:  z.coerce.number().min(1).nullable(),
  map_name:     z.string().min(1, 'Required'),
  notes:        z.string(),
  game_code:    z.string(),
  expansions:   z.string(), // comma-separated for simplicity in the form
  colonies:     z.string(), // comma-separated
  players:      z.array(playerSchema).min(1, 'Add at least one player'),
})

type GameFormValues = z.infer<typeof gameSchema>

// ─── Reference data ────────────────────────────────────────────────────────────
// TODO: these will be fetched from Supabase reference tables once connected

const MAPS = ['Tharsis', 'Elysium', 'Hellas', 'Amazonis', 'Arabia Terra', 'Terra Cimmeria', 'Vastitas Borealis', 'Utopia Planitia']
const EXPANSIONS = ['Prelude', 'Prelude 2', 'Venus Next', 'Colonies', 'Turmoil', 'Moon', 'Pathfinders']

const SCORE_FIELDS: { key: keyof GameFormValues['players'][0]; label: string; width?: number }[] = [
  { key: 'tr',          label: 'TR',        width: 60 },
  { key: 'milestone_vp', label: 'Milestones', width: 80 },
  { key: 'award_vp',    label: 'Awards',    width: 60 },
  { key: 'greenery_vp', label: 'Greeneries', width: 80 },
  { key: 'city_vp',     label: 'Cities',    width: 60 },
  { key: 'card_vp',     label: 'Cards',     width: 60 },
  { key: 'total_vp',    label: 'Total VP',  width: 70 },
  { key: 'position',    label: 'Position',  width: 70 },
]

const DEFAULT_PLAYER = {
  player_name: '', corporation: '',
  tr: 0, milestone_vp: 0, award_vp: 0, greenery_vp: 0, city_vp: 0, card_vp: 0,
  habitat_vp: null, logistics_vp: null, mining_vp: null,
  total_vp: 0, position: 1, key_notes: '',
}

export default function AddGame() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasMoon, setHasMoon] = useState(false)

  const { register, control, handleSubmit, formState: { errors } } = useForm<GameFormValues>({
    resolver: zodResolver(gameSchema) as Resolver<GameFormValues>,
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      player_count: 3,
      generations: null,
      map_name: '',
      notes: '',
      game_code: '',
      expansions: '',
      colonies: '',
      players: [{ ...DEFAULT_PLAYER }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'players' })

  async function onSubmit(data: GameFormValues) {
    setSaving(true)
    // TODO: Replace with Supabase insert once credentials are configured
    console.log('Game data to save:', data)
    await new Promise(r => setTimeout(r, 600)) // Simulated delay
    setSaving(false)
    setSaved(true)
    setTimeout(() => navigate('/games'), 1200)
  }

  return (
    <div className="page-enter" style={{ padding: '32px 36px', maxWidth: '1100px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/admin" style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#5e5b57', textDecoration: 'none' }}>← Admin</Link>
      </div>
      <PageHeader title="Log game session" />

      <form onSubmit={handleSubmit(onSubmit)}>

        {/* Game session fields */}
        <div style={{ background: '#141820', border: '1px solid #1a1f2a', borderRadius: '6px', padding: '24px', marginBottom: '24px' }}>
          <div style={sectionLabel}>Session</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Date *</label>
              <input type="date" {...register('date')} style={inputStyle} />
              {errors.date && <span style={errStyle}>{errors.date.message}</span>}
            </div>
            <div>
              <label style={labelStyle}>Map *</label>
              <select {...register('map_name')} style={inputStyle}>
                <option value="">Select map…</option>
                {MAPS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              {errors.map_name && <span style={errStyle}>{errors.map_name.message}</span>}
            </div>
            <div>
              <label style={labelStyle}>Players</label>
              <input type="number" min={1} max={6} {...register('player_count')} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Generations</label>
              <input type="number" min={1} {...register('generations')} placeholder="—" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Expansions (comma-separated)</label>
              <input {...register('expansions')} placeholder="Prelude, Colonies…" style={inputStyle}
                list="expansions-list"
              />
              <datalist id="expansions-list">
                {EXPANSIONS.map(e => <option key={e} value={e} />)}
              </datalist>
            </div>
            <div>
              <label style={labelStyle}>Colonies available (comma-separated)</label>
              <input {...register('colonies')} placeholder="Ceres, Europa…" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Game code</label>
              <input {...register('game_code')} placeholder="TM-2026-XXX" style={inputStyle} />
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <label style={labelStyle}>Notes</label>
            <textarea {...register('notes')} placeholder="Optional session notes…" rows={2}
              style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }}
            />
          </div>
          <div style={{ marginTop: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#8a8680' }}>
              <input type="checkbox" checked={hasMoon} onChange={e => setHasMoon(e.target.checked)} />
              Moon expansion active (shows Moon VP fields)
            </label>
          </div>
        </div>

        {/* Player result rows */}
        <div style={{ background: '#141820', border: '1px solid #1a1f2a', borderRadius: '6px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={sectionLabel}>Player results</div>
            <button
              type="button"
              onClick={() => append({ ...DEFAULT_PLAYER, position: fields.length + 1 })}
              style={{ padding: '6px 14px', background: 'rgba(224, 85, 53, 0.08)', border: '1px solid rgba(224, 85, 53, 0.2)', borderRadius: '4px', color: '#e05535', fontFamily: 'var(--font-body)', fontSize: '0.78rem', cursor: 'pointer' }}
            >
              + Add player
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {fields.map((field, index) => (
              <div key={field.id} style={{ border: '1px solid #232834', borderRadius: '5px', padding: '16px', position: 'relative' }}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'flex-end' }}>
                  <div style={{ flex: '0 0 130px' }}>
                    <label style={labelStyle}>Player *</label>
                    <input {...register(`players.${index}.player_name`)} placeholder="Name" style={inputStyle} />
                  </div>
                  <div style={{ flex: '0 0 200px' }}>
                    <label style={labelStyle}>Corporation *</label>
                    <input {...register(`players.${index}.corporation`)} placeholder="Corporation" style={inputStyle} />
                  </div>
                  {SCORE_FIELDS.map(f => (
                    <div key={f.key} style={{ flex: `0 0 ${f.width ?? 65}px` }}>
                      <label style={labelStyle}>{f.label}</label>
                      <input
                        type="number"
                        min={0}
                        {...register(`players.${index}.${f.key}`)}
                        style={inputStyle}
                      />
                    </div>
                  ))}
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(index)}
                      style={{ padding: '6px 10px', background: 'transparent', border: '1px solid #2e3340', borderRadius: '4px', color: '#5e5b57', cursor: 'pointer', fontSize: '0.8rem', marginBottom: '1px' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Strategy notes</label>
                    <input {...register(`players.${index}.key_notes`)} placeholder="e.g. Jovian engine, plant strategy…" style={inputStyle} />
                  </div>
                  {hasMoon && (
                    <>
                      {(['habitat_vp', 'logistics_vp', 'mining_vp'] as const).map(f => (
                        <div key={f} style={{ flex: '0 0 80px' }}>
                          <label style={labelStyle}>{f.replace('_vp', '').charAt(0).toUpperCase() + f.replace('_vp', '').slice(1)} VP</label>
                          <input type="number" min={0} {...register(`players.${index}.${f}`)} style={inputStyle} />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            type="submit"
            disabled={saving || saved}
            style={{
              padding: '10px 28px',
              background: saved ? '#4a9e6b' : saving ? '#1a1f2a' : '#e05535',
              border: 'none',
              borderRadius: '4px',
              color: saved || saving ? '#ddd9d0' : '#fff',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: saving || saved ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save game'}
          </button>
          <Link to="/admin" style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: '#5e5b57', textDecoration: 'none' }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

const sectionLabel: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: '0.8rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#5e5b57',
  marginBottom: '16px',
}
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-body)',
  fontSize: '0.68rem',
  fontWeight: 500,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#5e5b57',
  marginBottom: '5px',
}
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  background: '#0f1117',
  border: '1px solid #2e3340',
  borderRadius: '4px',
  color: '#ddd9d0',
  fontFamily: 'var(--font-body)',
  fontSize: '0.83rem',
  outline: 'none',
}
const errStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: '0.68rem',
  color: '#e05535',
  marginTop: '3px',
  display: 'block',
}
