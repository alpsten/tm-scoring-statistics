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

const inputClass = 'w-full bg-[#110d1e] border border-[#3e325e] rounded text-[#ece6ff] px-2.5 py-[7px] font-body text-[0.82rem] outline-none focus:border-violet-500/60 transition-colors'
const labelClass = 'block font-mono text-[0.65rem] tracking-[0.08em] uppercase text-[#504270] mb-1'

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
    <div ref={containerRef} className="relative">
      <input
        className={inputClass}
        value={query}
        placeholder={placeholder}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
      />
      {open && matches.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 bg-[#282042] border border-[#3e325e] rounded mt-[2px] max-h-[220px] overflow-y-auto">
          {matches.map(name => (
            <div
              key={name}
              onMouseDown={() => { onChange(name); setQuery(name); setOpen(false) }}
              className={`px-[10px] py-[7px] font-body text-[0.82rem] cursor-pointer transition-colors hover:bg-[#282042] ${name === value ? 'text-[#b87aff] bg-violet-500/8' : 'text-[#bbb4d0]'}`}
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
      className={`w-[26px] h-[26px] rounded-full cursor-pointer p-0 shrink-0 border-2 transition-all ${selected ? 'border-[#ece6ff] outline outline-2 outline-offset-2 outline-[rgba(155,80,240,0.7)]' : 'border-white/8'}`}
      style={{ background: hex }}
    />
  )
}

const thClass = 'px-3 py-2 text-left font-mono text-[0.65rem] tracking-[0.08em] uppercase text-[#504270] font-normal border-b border-[#3e325e]'
const tdClass = 'px-3 py-[9px] text-[0.82rem] text-[#bbb4d0] align-middle border-b border-[#1e1835]'
const dash = <span className="text-[#3e325e]">—</span>

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

  return (
    <div className="page-enter py-8 px-9 min-h-full bg-[#0c0e12]">
      <PageHeader title="Player Profiles" subtitle="Player bios and preferences" />

      {loading ? (
        <div className="text-[#504270] font-mono text-[0.78rem]">Loading…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[680px]">
            <thead>
              <tr>
                {['Player', 'Colors', 'Playing Style', 'Rival', 'Favorite Card', 'Most Frustrating Card', ''].map(h => (
                  <th key={h} className={thClass}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allNames.map((name: string) => {
                const p = profileMap[name]

                if (editing === name) {
                  return (
                    <tr key={name} className="bg-[#282042] border-b border-[#3e325e]">
                      <td colSpan={7} className="px-6 py-5">
                        <div className="flex flex-col gap-4">

                          <div className="font-display font-semibold text-[0.95rem] text-[#ece6ff]">
                            {name}
                          </div>

                          {/* Color swatches — top 3 */}
                          <div className="flex flex-col gap-[10px]">
                            <div className={labelClass}>Preferred Colors (ranked)</div>
                            {([
                              { key: 'preferred_color',   rank: '1st choice' },
                              { key: 'preferred_color_2', rank: '2nd choice' },
                              { key: 'preferred_color_3', rank: '3rd choice' },
                            ] as { key: keyof EditValues; rank: string }[]).map(({ key, rank }) => (
                              <div key={key}>
                                <div className="block font-mono text-[0.65rem] tracking-[0.08em] uppercase text-[#625c7c] mb-1.5">{rank}</div>
                                <div className="flex gap-2 flex-wrap items-center">
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
                                      className="bg-transparent border-none text-[#504270] cursor-pointer text-[0.7rem] font-mono px-1 hover:text-[#8e87a8] transition-colors"
                                    >
                                      clear
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Text fields grid */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={labelClass}>Playing Style</label>
                              <input
                                className={inputClass}
                                value={vals.playing_style}
                                onChange={e => setVals(v => ({ ...v, playing_style: e.target.value }))}
                                placeholder="e.g. engine builder, milestones rusher"
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Rival</label>
                              <SearchInput
                                value={vals.rival}
                                onChange={v => setVals(vals => ({ ...vals, rival: v }))}
                                placeholder="Search players…"
                                names={allNames.filter((n: string) => n !== name)}
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className={labelClass}>Favorite Cards (top 3)</label>
                              {(['favorite_card', 'favorite_card_2', 'favorite_card_3'] as const).map((key, i) => (
                                <CardSearchInput key={key} value={vals[key]} onChange={v => setVals(vals => ({ ...vals, [key]: v }))} placeholder={`${i + 1}. Search cards…`} />
                              ))}
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className={labelClass}>Most Frustrating Cards (top 3)</label>
                              {(['most_tilting_card', 'most_tilting_card_2', 'most_tilting_card_3'] as const).map((key, i) => (
                                <CardSearchInput key={key} value={vals[key]} onChange={v => setVals(vals => ({ ...vals, [key]: v }))} placeholder={`${i + 1}. Search cards…`} />
                              ))}
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className={labelClass}>Favorite Corporations (top 3)</label>
                              {(['favorite_corporation', 'favorite_corporation_2', 'favorite_corporation_3'] as const).map((key, i) => (
                                <CorpSearchInput key={key} value={vals[key]} onChange={v => setVals(vals => ({ ...vals, [key]: v }))} placeholder={`${i + 1}. Search corporations…`} />
                              ))}
                            </div>
                            <div className="col-span-2">
                              <label className={labelClass}>Trivia</label>
                              <textarea
                                className={`${inputClass} resize-y min-h-[70px]`}
                                value={vals.trivia}
                                onChange={e => setVals(v => ({ ...v, trivia: e.target.value }))}
                                placeholder="Fun facts, notes about this player…"
                              />
                            </div>
                          </div>

                          {saveError && (
                            <div className="text-mars-500 font-mono text-[0.72rem]">{saveError}</div>
                          )}

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => save(name)}
                              disabled={saving}
                              className="px-5 py-[7px] bg-violet-500/12 border border-violet-500/40 rounded text-[#b87aff] font-mono text-[0.72rem] tracking-[0.06em] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {saving ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="px-4 py-[7px] bg-transparent border border-[#3e325e] rounded text-[#504270] font-mono text-[0.72rem] tracking-[0.06em] cursor-pointer hover:border-[#3e325e] hover:text-[#8e87a8] transition-colors"
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
                  <tr key={name} className="border-b border-[#1e1835] hover:bg-[#171228] transition-colors">
                    <td className={`${tdClass} text-[#ece6ff] font-display font-semibold`}>{name}</td>
                    <td className={tdClass}>
                      <div className="flex gap-[5px] items-center">
                        {[p?.preferred_color, p?.preferred_color_2, p?.preferred_color_3].map((col, i) =>
                          col
                            ? <div key={i} className="w-4 h-4 rounded-full border border-white/12" style={{ background: col }} title={`${i + 1}. ${PLAYER_COLORS.find(c => c.hex === col)?.name ?? col}`} />
                            : null
                        )}
                        {!p?.preferred_color && dash}
                      </div>
                    </td>
                    <td className={tdClass}>{p?.playing_style || dash}</td>
                    <td className={tdClass}>{p?.rival || dash}</td>
                    <td className={tdClass}>{p?.favorite_card || dash}</td>
                    <td className={tdClass}>{p?.most_tilting_card || dash}</td>
                    <td className={`${tdClass} text-right`}>
                      <button
                        type="button"
                        onClick={() => startEdit(name)}
                        className="px-3 py-1 bg-transparent border border-[#3e325e] rounded text-[#504270] font-mono text-[0.65rem] tracking-[0.06em] cursor-pointer hover:border-[#3e325e] hover:text-[#8e87a8] transition-colors"
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
