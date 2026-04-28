import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { usePlayerProfiles, useCardReference } from '../../lib/hooks'
import PageHeader from '../../components/ui/PageHeader'
import type { PlayerProfile } from '../../types/database'

const PLAYER_COLORS = [
  { name: 'Red',    hex: '#c62828' },
  { name: 'Green',  hex: '#2e7d32' },
  { name: 'Blue',   hex: '#1565c0' },
  { name: 'Yellow', hex: '#f9a825' },
  { name: 'Black',  hex: '#37474f' },
  { name: 'White',  hex: '#e0e0e0' },
  { name: 'Orange', hex: '#d84315' },
  { name: 'Pink',   hex: '#ad1457' },
  { name: 'Purple', hex: '#6a1b9a' },
  { name: 'Silver', hex: '#78909c' },
]

async function fetchAllPlayerNames(): Promise<string[]> {
  const { data, error } = await supabase.from('player_results').select('player_name')
  if (error) throw error
  return [...new Set((data as { player_name: string }[]).map(r => r.player_name))].sort()
}


type EditValues = {
  preferred_color: string
  preferred_color_2: string
  preferred_color_3: string
  trivia: string
  favorite_card: string
  favorite_card_2: string
  favorite_card_3: string
  most_tilting_card: string
  most_tilting_card_2: string
  most_tilting_card_3: string
  favorite_corporation: string
  favorite_corporation_2: string
  favorite_corporation_3: string
  playing_style: string
  rival: string
}

function emptyEdit(): EditValues {
  return { preferred_color: '', preferred_color_2: '', preferred_color_3: '', trivia: '', favorite_card: '', favorite_card_2: '', favorite_card_3: '', most_tilting_card: '', most_tilting_card_2: '', most_tilting_card_3: '', favorite_corporation: '', favorite_corporation_2: '', favorite_corporation_3: '', playing_style: '', rival: '' }
}

function toEdit(p?: PlayerProfile): EditValues {
  if (!p) return emptyEdit()
  return {
    preferred_color: p.preferred_color ?? '',
    preferred_color_2: p.preferred_color_2 ?? '',
    preferred_color_3: p.preferred_color_3 ?? '',
    trivia: p.trivia ?? '',
    favorite_card: p.favorite_card ?? '',
    favorite_card_2: p.favorite_card_2 ?? '',
    favorite_card_3: p.favorite_card_3 ?? '',
    most_tilting_card: p.most_tilting_card ?? '',
    most_tilting_card_2: p.most_tilting_card_2 ?? '',
    most_tilting_card_3: p.most_tilting_card_3 ?? '',
    favorite_corporation: p.favorite_corporation ?? '',
    favorite_corporation_2: p.favorite_corporation_2 ?? '',
    favorite_corporation_3: p.favorite_corporation_3 ?? '',
    playing_style: p.playing_style ?? '',
    rival: p.rival ?? '',
  }
}

function SearchInput({ value, onChange, placeholder, names }: { value: string; onChange: (v: string) => void; placeholder?: string; names: string[] }) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(value) }, [value])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const matches = query.length > 0
    ? names.filter(n => n.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : []

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        style={inputStyle}
        value={query}
        placeholder={placeholder}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
      />
      {open && matches.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#1e1835', border: '1px solid #3e325e', borderRadius: '4px', marginTop: '2px', maxHeight: '220px', overflowY: 'auto' }}>
          {matches.map(name => (
            <div
              key={name}
              onMouseDown={() => { onChange(name); setQuery(name); setOpen(false) }}
              style={{ padding: '7px 10px', fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: name === value ? '#b87aff' : '#bbb4d0', cursor: 'pointer', background: name === value ? 'rgba(155,80,240,0.08)' : 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#282042')}
              onMouseLeave={e => (e.currentTarget.style.background = name === value ? 'rgba(155,80,240,0.08)' : 'transparent')}
            >
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CardSearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const { data: cardRef = [] } = useCardReference()
  const names = cardRef.filter(c => c.card_type !== 'Corporation' && c.card_type !== 'CEO').map(c => c.card_name).sort()
  return <SearchInput value={value} onChange={onChange} placeholder={placeholder} names={names} />
}

function CorpSearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const { data: cardRef = [] } = useCardReference()
  const names = cardRef.filter(c => c.card_type === 'Corporation').map(c => c.card_name).sort()
  return <SearchInput value={value} onChange={onChange} placeholder={placeholder} names={names} />
}

function ColorSwatch({ hex, selected, onClick }: { hex: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={PLAYER_COLORS.find(c => c.hex === hex)?.name ?? hex}
      style={{
        width: 26, height: 26, borderRadius: '50%',
        background: hex,
        border: selected ? '2px solid #ece6ff' : '2px solid rgba(255,255,255,0.08)',
        outline: selected ? '2px solid rgba(155,80,240,0.7)' : 'none',
        outlineOffset: '2px',
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
      }}
    />
  )
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

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.65rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#504270',
  marginBottom: '4px',
}

export default function PlayerProfileAdmin() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<string | null>(null)
  const [vals, setVals] = useState<EditValues>(emptyEdit())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const { data: allNames = [], isLoading: loadingNames } = useQuery({
    queryKey: ['all-player-names'],
    queryFn: fetchAllPlayerNames,
  })

  const { data: profiles = [], isLoading: loadingProfiles } = usePlayerProfiles()

  const profileMap: Record<string, PlayerProfile> = Object.fromEntries(
    profiles.map(p => [p.player_name, p])
  )

  function startEdit(name: string) {
    setEditing(name)
    setVals(toEdit(profileMap[name]))
    setSaveError(null)
  }

  function cancelEdit() {
    setEditing(null)
    setSaveError(null)
  }

  async function save(playerName: string) {
    setSaving(true)
    setSaveError(null)
    try {
      const { error } = await supabase.from('player_profiles').upsert({
        player_name: playerName,
        preferred_color: vals.preferred_color || null,
        preferred_color_2: vals.preferred_color_2 || null,
        preferred_color_3: vals.preferred_color_3 || null,
        trivia: vals.trivia || null,
        favorite_card: vals.favorite_card || null,
        favorite_card_2: vals.favorite_card_2 || null,
        favorite_card_3: vals.favorite_card_3 || null,
        most_tilting_card: vals.most_tilting_card || null,
        most_tilting_card_2: vals.most_tilting_card_2 || null,
        most_tilting_card_3: vals.most_tilting_card_3 || null,
        favorite_corporation: vals.favorite_corporation || null,
        favorite_corporation_2: vals.favorite_corporation_2 || null,
        favorite_corporation_3: vals.favorite_corporation_3 || null,
        playing_style: vals.playing_style || null,
        rival: vals.rival || null,
      }, { onConflict: 'player_name' })
      if (error) throw error
      await qc.invalidateQueries({ queryKey: ['player-profiles'] })
      setEditing(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message
      setSaveError(msg ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const loading = loadingNames || loadingProfiles

  const thStyle: React.CSSProperties = {
    padding: '8px 12px',
    textAlign: 'left',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.65rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#504270',
    fontWeight: 400,
    borderBottom: '1px solid #282042',
  }

  const tdStyle: React.CSSProperties = {
    padding: '9px 12px',
    fontSize: '0.82rem',
    color: '#bbb4d0',
    verticalAlign: 'middle',
    borderBottom: '1px solid #1e1835',
  }

  const dash = <span style={{ color: '#3e325e' }}>—</span>

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <PageHeader title="Player Profiles" subtitle="Player bios and preferences" />

      {loading ? (
        <div style={{ color: '#504270', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>Loading…</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
            <thead>
              <tr>
                {['Player', 'Colors', 'Playing Style', 'Rival', 'Favorite Card', 'Most Frustrating Card', ''].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allNames.map((name: string) => {
                const p = profileMap[name]

                if (editing === name) {
                  return (
                    <tr key={name} style={{ background: '#1e1835', borderBottom: '1px solid #282042' }}>
                      <td colSpan={7} style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.95rem', color: '#ece6ff' }}>
                            {name}
                          </div>

                          {/* Color swatches — top 3 */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={labelStyle}>Preferred Colors (ranked)</div>
                            {([
                              { key: 'preferred_color',   rank: '1st choice' },
                              { key: 'preferred_color_2', rank: '2nd choice' },
                              { key: 'preferred_color_3', rank: '3rd choice' },
                            ] as { key: keyof EditValues; rank: string }[]).map(({ key, rank }) => (
                              <div key={key}>
                                <div style={{ ...labelStyle, marginBottom: '6px', color: '#625c7c' }}>{rank}</div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                  {PLAYER_COLORS.map(c => (
                                    <ColorSwatch
                                      key={c.hex}
                                      hex={c.hex}
                                      selected={vals[key] === c.hex}
                                      onClick={() => setVals(v => ({ ...v, [key]: v[key] === c.hex ? '' : c.hex }))}
                                    />
                                  ))}
                                  {vals[key] && (
                                    <button
                                      type="button"
                                      onClick={() => setVals(v => ({ ...v, [key]: '' }))}
                                      style={{ background: 'none', border: 'none', color: '#504270', cursor: 'pointer', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', padding: '0 4px' }}
                                    >
                                      clear
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Text fields grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                            <div>
                              <label style={labelStyle}>Playing Style</label>
                              <input
                                style={inputStyle}
                                value={vals.playing_style}
                                onChange={e => setVals(v => ({ ...v, playing_style: e.target.value }))}
                                placeholder="e.g. engine builder, milestones rusher"
                              />
                            </div>
                            <div>
                              <label style={labelStyle}>Rival</label>
                              <SearchInput
                                value={vals.rival}
                                onChange={v => setVals(vals => ({ ...vals, rival: v }))}
                                placeholder="Search players…"
                                names={allNames.filter((n: string) => n !== name)}
                              />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={labelStyle}>Favorite Cards (top 3)</label>
                              {(['favorite_card', 'favorite_card_2', 'favorite_card_3'] as const).map((key, i) => (
                                <CardSearchInput key={key} value={vals[key]} onChange={v => setVals(vals => ({ ...vals, [key]: v }))} placeholder={`${i + 1}. Search cards…`} />
                              ))}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={labelStyle}>Most Frustrating Cards (top 3)</label>
                              {(['most_tilting_card', 'most_tilting_card_2', 'most_tilting_card_3'] as const).map((key, i) => (
                                <CardSearchInput key={key} value={vals[key]} onChange={v => setVals(vals => ({ ...vals, [key]: v }))} placeholder={`${i + 1}. Search cards…`} />
                              ))}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={labelStyle}>Favorite Corporations (top 3)</label>
                              {(['favorite_corporation', 'favorite_corporation_2', 'favorite_corporation_3'] as const).map((key, i) => (
                                <CorpSearchInput key={key} value={vals[key]} onChange={v => setVals(vals => ({ ...vals, [key]: v }))} placeholder={`${i + 1}. Search corporations…`} />
                              ))}
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                              <label style={labelStyle}>Trivia</label>
                              <textarea
                                style={{ ...inputStyle, resize: 'vertical', minHeight: '70px' } as React.CSSProperties}
                                value={vals.trivia}
                                onChange={e => setVals(v => ({ ...v, trivia: e.target.value }))}
                                placeholder="Fun facts, notes about this player…"
                              />
                            </div>
                          </div>

                          {saveError && (
                            <div style={{ color: '#e05535', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{saveError}</div>
                          )}

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => save(name)}
                              disabled={saving}
                              style={{
                                padding: '7px 20px',
                                background: 'rgba(155,80,240,0.12)',
                                border: '1px solid rgba(155,80,240,0.4)',
                                borderRadius: '4px',
                                color: '#b87aff',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.72rem',
                                letterSpacing: '0.06em',
                                cursor: saving ? 'not-allowed' : 'pointer',
                                opacity: saving ? 0.6 : 1,
                              }}
                            >
                              {saving ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              style={{
                                padding: '7px 16px',
                                background: 'transparent',
                                border: '1px solid #282042',
                                borderRadius: '4px',
                                color: '#504270',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.72rem',
                                letterSpacing: '0.06em',
                                cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr
                    key={name}
                    style={{ borderBottom: '1px solid #1e1835' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#171228')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...tdStyle, color: '#ece6ff', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{name}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        {[p?.preferred_color, p?.preferred_color_2, p?.preferred_color_3].map((col, i) =>
                          col
                            ? <div key={i} style={{ width: 16, height: 16, borderRadius: '50%', background: col, border: '1px solid rgba(255,255,255,0.12)' }} title={`${i + 1}. ${PLAYER_COLORS.find(c => c.hex === col)?.name ?? col}`} />
                            : null
                        )}
                        {!p?.preferred_color && dash}
                      </div>
                    </td>
                    <td style={tdStyle}>{p?.playing_style || dash}</td>
                    <td style={tdStyle}>{p?.rival || dash}</td>
                    <td style={tdStyle}>{p?.favorite_card || dash}</td>
                    <td style={tdStyle}>{p?.most_tilting_card || dash}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => startEdit(name)}
                        style={{
                          padding: '4px 12px',
                          background: 'transparent',
                          border: '1px solid #282042',
                          borderRadius: '4px',
                          color: '#504270',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.65rem',
                          letterSpacing: '0.06em',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = '#3e325e'
                          e.currentTarget.style.color = '#8e87a8'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = '#282042'
                          e.currentTarget.style.color = '#504270'
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
