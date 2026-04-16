import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import PageHeader from '../../components/ui/PageHeader'
import Tag from '../../components/ui/Tag'
import { parseTags } from '../../components/ui/tagUtils'
import { useCardReference } from '../../lib/hooks'
import { supabase } from '../../lib/supabase'
import type { CardReference } from '../../types/database'

const CARD_TYPES: CardReference['card_type'][] = ['Automated', 'Active', 'Event', 'Corporation', 'Prelude']

const EXPANSIONS_LIST = [
  'Base', 'Corporate Era', 'Prelude', 'Prelude 2',
  'Venus Next', 'Colonies', 'Turmoil', 'Moon', 'Pathfinders', 'Promos',
]

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  Automated:   { bg: 'rgba(59, 191, 191, 0.1)',  color: '#3bbfbf' },
  Active:      { bg: 'rgba(155, 80, 240, 0.1)',  color: '#b87aff' },
  Event:       { bg: 'rgba(224, 85, 53, 0.1)',   color: '#e05535' },
  Corporation: { bg: 'rgba(212, 168, 32, 0.1)',  color: '#d4a820' },
  Prelude:     { bg: 'rgba(74, 158, 107, 0.1)',  color: '#4a9e6b' },
}

const TAG_COLORS: Record<string, { bg: string; color: string }> = {
  'Animal':   { bg: 'rgba(74, 158, 107, 0.12)',  color: '#4a9e6b' },
  'Building': { bg: 'rgba(180, 120, 60, 0.12)',  color: '#c97b3a' },
  'City':     { bg: 'rgba(100, 140, 200, 0.12)', color: '#7aa0d0' },
  'Earth':    { bg: 'rgba(100, 140, 200, 0.12)', color: '#7aa0d0' },
  'Event':    { bg: 'rgba(200, 80, 60, 0.12)',   color: '#d06050' },
  'Jovian':   { bg: 'rgba(180, 100, 40, 0.12)',  color: '#c07030' },
  'Microbe':  { bg: 'rgba(90, 160, 80, 0.12)',   color: '#5aa050' },
  'Plant':    { bg: 'rgba(60, 160, 80, 0.12)',   color: '#40a060' },
  'Power':    { bg: 'rgba(180, 90, 200, 0.12)',  color: '#c070d0' },
  'Science':  { bg: 'rgba(200, 200, 60, 0.12)',  color: '#d0c030' },
  'Space':    { bg: 'rgba(60, 100, 200, 0.12)',  color: '#5080c0' },
  'Venus':    { bg: 'rgba(220, 160, 60, 0.12)',  color: '#d0a040' },
  'Moon':     { bg: 'rgba(140, 148, 176, 0.12)', color: '#8c94b0' },
  'Mars':     { bg: 'rgba(196, 88, 52, 0.12)',   color: '#c45834' },
  'Planet':   { bg: 'rgba(92, 172, 110, 0.12)',  color: '#5cac6e' },
}

const ALL_TAGS = [
  'Animal', 'Building', 'City', 'Earth', 'Event',
  'Jovian', 'Mars', 'Microbe', 'Moon', 'Plant', 'Planet', 'Power', 'Science', 'Space', 'Venus',
]

const RESOURCE_TYPES = [
  'Animal', 'Asteroid', 'Camp', 'Cube', 'Data', 'Delegates', 'Fighter',
  'Floater', 'Hydroelectric', 'Microbe', 'Orbitals', 'Preservation',
  'Robot', 'Science', 'Seeds', 'Syndicate Fleets', 'Venusian Habitat',
]

const BASE_VP_OPTIONS = [-2, -1, 0, 1, 2, 3, 4]

type EditValues = {
  card_name: string
  card_type: CardReference['card_type']
  tags: string
  expansion: string
  base_vp: string
  resource_vp_type: string
  resource_vp_per: string
}

// ─── Inline edit form ─────────────────────────────────────────────────────────

function EditRow({ values, onChange, saving, error, onSave, onCancel, isNew }: {
  values: EditValues
  onChange: (v: EditValues) => void
  saving: boolean
  error: string | null
  onSave: () => void
  onCancel: () => void
  isNew?: boolean
}) {
  const set = (k: keyof EditValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange({ ...values, [k]: e.target.value })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '2 1 200px' }}>
          <label style={labelStyle}>Card name *</label>
          <input value={values.card_name} onChange={set('card_name')} placeholder="Card name" style={inputStyle} />
        </div>
        <div style={{ flex: '1 1 130px' }}>
          <label style={labelStyle}>Type</label>
          <select value={values.card_type} onChange={set('card_type')} style={inputStyle}>
            {CARD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 130px' }}>
          <label style={labelStyle}>Expansion</label>
          <select value={values.expansion} onChange={set('expansion')} style={inputStyle}>
            <option value="">—</option>
            {EXPANSIONS_LIST.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div style={{ flex: '0 0 90px' }}>
          <label style={labelStyle}>Base VP</label>
          <select value={values.base_vp} onChange={set('base_vp')} style={inputStyle}>
            <option value="">—</option>
            {BASE_VP_OPTIONS.map(n => <option key={n} value={n}>{n} VP</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 150px' }}>
          <label style={labelStyle}>
            Resource VP type{' '}
            <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#504270' }}>
              (e.g. Floater, Animal)
            </span>
          </label>
          <select value={values.resource_vp_type} onChange={set('resource_vp_type')} style={inputStyle}>
            <option value="">— none —</option>
            {RESOURCE_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        {values.resource_vp_type && (
          <div style={{ flex: '0 0 160px' }}>
            <label style={labelStyle}>Resources per VP</label>
            <select value={values.resource_vp_per} onChange={set('resource_vp_per')} style={inputStyle}>
              <option value="">—</option>
              {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n === 1 ? '1/1' : `1/${n}`}</option>)}
            </select>
          </div>
        )}
      </div>
      <div>
        <label style={labelStyle}>Tags</label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {ALL_TAGS.map(tag => {
            const active = parseTags(values.tags).includes(tag)
            const colors = TAG_COLORS[tag] ?? { bg: 'rgba(100,100,100,0.12)', color: '#8e87a8' }
            return (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  const current = parseTags(values.tags)
                  const next = active ? current.filter(t => t !== tag) : [...current, tag]
                  onChange({ ...values, tags: next.join(', ') })
                }}
                style={{ padding: '3px 11px', background: active ? colors.bg : 'transparent', border: `1px solid ${active ? colors.color : '#3e325e'}`, borderRadius: '12px', cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: active ? colors.color : '#625c7c' }}
              >
                {active ? '✓ ' : ''}{tag}
              </button>
            )
          })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={onSave}
          disabled={saving}
          style={{ padding: '6px 18px', background: '#9b50f0', border: 'none', borderRadius: '4px', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}
        >
          {saving ? 'Saving…' : isNew ? 'Add card' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          style={{ padding: '6px 14px', background: 'transparent', border: '1px solid #3e325e', borderRadius: '4px', color: '#625c7c', fontFamily: 'var(--font-body)', fontSize: '0.82rem', cursor: 'pointer' }}
        >
          Cancel
        </button>
        {error && (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#e05535' }}>
            Error: {error}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CardReferenceAdmin() {
  const queryClient = useQueryClient()
  const { data: cards, isLoading } = useCardReference()

  const [search, setSearch]               = useState('')
  const [typeFilters, setTypeFilters]     = useState<CardReference['card_type'][]>([])
  const [tagFilters, setTagFilters]       = useState<string[]>([])
  const [expansionFilters, setExpansionFilters] = useState<string[]>([])
  const [editingId, setEditingId]         = useState<string | null>(null) // 'new' = add mode
  const [editValues, setEditValues]       = useState<EditValues>({ card_name: '', card_type: 'Automated', tags: '', expansion: '', base_vp: '', resource_vp_type: '', resource_vp_per: '' })
  const [saving, setSaving]               = useState(false)
  const [saveError, setSaveError]         = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  if (isLoading) return <div style={loadingStyle}>Loading…</div>

  const allTags = [...new Set((cards ?? []).flatMap(c => parseTags(c.tags)))].sort()
  const allExpansions = [...new Set((cards ?? []).map(c => c.expansion).filter(Boolean) as string[])].sort()

  const filtered = (cards ?? []).filter(c => {
    if (search && !c.card_name.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilters.length > 0 && !typeFilters.includes(c.card_type)) return false
    if (tagFilters.length > 0 && !tagFilters.some(t => parseTags(c.tags).includes(t))) return false
    if (expansionFilters.length > 0 && !expansionFilters.includes(c.expansion ?? '')) return false
    return true
  })

  function toggleType(t: CardReference['card_type']) {
    setTypeFilters(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }
  function toggleTag(t: string) {
    setTagFilters(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }
  function toggleExpansion(e: string) {
    setExpansionFilters(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e])
  }

  function startEdit(card: CardReference) {
    setEditingId(card.id)
    setEditValues({
      card_name: card.card_name,
      card_type: card.card_type,
      tags: card.tags ?? '',
      expansion: card.expansion ?? '',
      base_vp: card.base_vp != null ? String(card.base_vp) : '',
      resource_vp_type: card.resource_vp_type ?? '',
      resource_vp_per: card.resource_vp_per != null ? String(card.resource_vp_per) : '',
    })
    setSaveError(null)
  }

  function startAdd() {
    setEditingId('new')
    setEditValues({ card_name: '', card_type: 'Automated', tags: '', expansion: 'Base', base_vp: '', resource_vp_type: '', resource_vp_per: '' })
    setSaveError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setSaveError(null)
  }

  async function saveEdit() {
    setSaving(true)
    setSaveError(null)
    try {
      const payload = {
        card_name: editValues.card_name.trim(),
        card_type: editValues.card_type,
        tags: editValues.tags.trim() || null,
        expansion: editValues.expansion || null,
        base_vp: editValues.base_vp !== '' ? Number(editValues.base_vp) : null,
        resource_vp_type: editValues.resource_vp_type || null,
        resource_vp_per: editValues.resource_vp_per !== '' ? Number(editValues.resource_vp_per) : null,
      }
      if (!payload.card_name) {
        setSaveError('Card name is required')
        setSaving(false)
        return
      }
      if (editingId === 'new') {
        const { error } = await supabase.from('card_reference').insert(payload)
        if (error) throw error
      } else {
        const { error } = await supabase.from('card_reference').update(payload).eq('id', editingId!)
        if (error) throw error
      }
      await queryClient.invalidateQueries({ queryKey: ['card-reference'] })
      setEditingId(null)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  async function deleteCard(id: string) {
    try {
      const { error } = await supabase.from('card_reference').delete().eq('id', id)
      if (error) throw error
      await queryClient.invalidateQueries({ queryKey: ['card-reference'] })
      setDeleteConfirmId(null)
    } catch (err) {
      console.error(err)
    }
  }

  const hasFilters = !!search || typeFilters.length > 0 || tagFilters.length > 0 || expansionFilters.length > 0

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/admin" style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#625c7c', textDecoration: 'none' }}>← Admin</Link>
      </div>
      <PageHeader
        title="Card reference"
        subtitle={hasFilters ? `${filtered.length} of ${cards?.length ?? 0} cards` : `${cards?.length ?? 0} cards`}
      />

      {/* Filter bar */}
      <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Search + Add + Clear */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search cards…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '220px', height: '34px', padding: '0 12px', background: '#1e1835', border: '1px solid #3e325e', borderRadius: '4px', color: '#ece6ff', fontFamily: 'var(--font-body)', fontSize: '0.83rem', outline: 'none' }}
          />
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setTypeFilters([]); setTagFilters([]); setExpansionFilters([]) }}
              style={{ height: '34px', padding: '0 12px', background: 'transparent', border: '1px solid #3e325e', borderRadius: '4px', color: '#625c7c', fontFamily: 'var(--font-body)', fontSize: '0.78rem', cursor: 'pointer' }}
            >
              Clear all
            </button>
          )}
          <button
            onClick={startAdd}
            disabled={editingId === 'new'}
            style={{ height: '34px', padding: '0 16px', background: 'rgba(155,80,240,0.12)', border: '1px solid rgba(155,80,240,0.4)', borderRadius: '4px', color: '#b87aff', fontFamily: 'var(--font-body)', fontSize: '0.83rem', cursor: editingId === 'new' ? 'not-allowed' : 'pointer', marginLeft: 'auto' }}
          >
            + Add card
          </button>
        </div>

        {/* Type pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#504270', marginRight: '2px' }}>Type</span>
          {CARD_TYPES.map(type => {
            const active = typeFilters.includes(type)
            const colors = TYPE_COLORS[type]
            return (
              <button key={type} onClick={() => toggleType(type)} style={{ padding: '3px 11px', background: active ? colors.bg : 'transparent', border: `1px solid ${active ? colors.color : '#3e325e'}`, borderRadius: '12px', cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: active ? colors.color : '#625c7c' }}>
                {active ? '✓ ' : ''}{type}
              </button>
            )
          })}
        </div>

        {/* Tag pills */}
        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#504270', marginRight: '2px' }}>Tag</span>
            {allTags.map(tag => {
              const active = tagFilters.includes(tag)
              const colors = TAG_COLORS[tag] ?? { bg: 'rgba(100,100,100,0.12)', color: '#8e87a8' }
              return (
                <button key={tag} onClick={() => toggleTag(tag)} style={{ padding: '3px 11px', background: active ? colors.bg : 'transparent', border: `1px solid ${active ? colors.color : '#3e325e'}`, borderRadius: '12px', cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: active ? colors.color : '#625c7c' }}>
                  {active ? '✓ ' : ''}{tag}
                </button>
              )
            })}
          </div>
        )}

        {/* Expansion pills */}
        {allExpansions.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#504270', marginRight: '2px' }}>Expansion</span>
            {allExpansions.map(exp => {
              const active = expansionFilters.includes(exp)
              return (
                <button key={exp} onClick={() => toggleExpansion(exp)} style={{ padding: '3px 11px', background: active ? 'rgba(46,139,139,0.12)' : 'transparent', border: `1px solid ${active ? '#2e8b8b' : '#3e325e'}`, borderRadius: '12px', cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: active ? '#3bbfbf' : '#625c7c' }}>
                  {active ? '✓ ' : ''}{exp}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* New card form */}
      {editingId === 'new' && (
        <div style={{ background: '#1e1835', border: '1px solid rgba(155,80,240,0.3)', borderRadius: '6px', padding: '20px', marginBottom: '16px' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#b87aff', marginBottom: '14px' }}>
            New card
          </div>
          <EditRow
            values={editValues}
            onChange={setEditValues}
            saving={saving}
            error={saveError}
            onSave={saveEdit}
            onCancel={cancelEdit}
            isNew
          />
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #282042' }}>
              {['Card', 'Type', 'Tags', 'Expansion', 'Base VP', 'Resource VP', ''].map((h, i) => (
                <th key={i} style={{ padding: '10px 16px', textAlign: i === 6 ? 'right' : 'left', fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#504270' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((card, i) => (
              <tr
                key={card.id}
                style={{ borderBottom: i < filtered.length - 1 ? '1px solid #282042' : 'none', background: editingId === card.id ? 'rgba(155,80,240,0.04)' : 'transparent' }}
              >
                {editingId === card.id ? (
                  <td colSpan={7} style={{ padding: '16px' }}>
                    <EditRow
                      values={editValues}
                      onChange={setEditValues}
                      saving={saving}
                      error={saveError}
                      onSave={saveEdit}
                      onCancel={cancelEdit}
                    />
                  </td>
                ) : (
                  <>
                    <td style={{ padding: '11px 16px', fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: '#ece6ff', fontWeight: 500 }}>
                      {card.card_name}
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 500, padding: '2px 7px', borderRadius: '3px', background: TYPE_COLORS[card.card_type]?.bg, color: TYPE_COLORS[card.card_type]?.color, whiteSpace: 'nowrap' }}>
                        {card.card_type}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {[...new Set(parseTags(card.tags))].map(tag => <Tag key={tag} name={tag} />)}
                      </div>
                    </td>
                    <td style={{ padding: '11px 16px', fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: '#8e87a8' }}>
                      {card.expansion ?? '—'}
                    </td>
                    <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#c9a030' }}>
                      {card.base_vp != null ? `${card.base_vp} VP` : '—'}
                    </td>
                    <td style={{ padding: '11px 16px', fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#8e87a8' }}>
                      {card.resource_vp_type
                        ? card.resource_vp_per
                          ? `1/${card.resource_vp_per} ${card.resource_vp_type}`
                          : card.resource_vp_type
                        : '—'}
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {deleteConfirmId === card.id ? (
                          <>
                            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#e05535' }}>Delete?</span>
                            <button onClick={() => deleteCard(card.id)} style={{ padding: '4px 12px', background: 'rgba(224,85,53,0.12)', border: '1px solid rgba(224,85,53,0.4)', borderRadius: '4px', color: '#e05535', fontFamily: 'var(--font-body)', fontSize: '0.75rem', cursor: 'pointer' }}>Yes</button>
                            <button onClick={() => setDeleteConfirmId(null)} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid #3e325e', borderRadius: '4px', color: '#625c7c', fontFamily: 'var(--font-body)', fontSize: '0.75rem', cursor: 'pointer' }}>No</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(card)} style={editBtnStyle}>Edit</button>
                            <button onClick={() => setDeleteConfirmId(card.id)} style={deleteBtnStyle}>Delete</button>
                          </>
                        )}
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const loadingStyle: React.CSSProperties = { padding: '32px 36px', color: '#625c7c', fontFamily: 'var(--font-body)' }
const labelStyle: React.CSSProperties = { display: 'block', fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#625c7c', marginBottom: '5px' }
const inputStyle: React.CSSProperties = { width: '100%', height: '34px', padding: '0 10px', background: '#171228', border: '1px solid #3e325e', borderRadius: '4px', color: '#ece6ff', fontFamily: 'var(--font-body)', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box' }
const editBtnStyle: React.CSSProperties = { padding: '4px 12px', background: 'rgba(155,80,240,0.08)', border: '1px solid rgba(155,80,240,0.3)', borderRadius: '4px', color: '#b87aff', fontFamily: 'var(--font-body)', fontSize: '0.75rem', cursor: 'pointer' }
const deleteBtnStyle: React.CSSProperties = { padding: '4px 10px', background: 'transparent', border: '1px solid #3e325e', borderRadius: '4px', color: '#625c7c', fontFamily: 'var(--font-body)', fontSize: '0.75rem', cursor: 'pointer' }
