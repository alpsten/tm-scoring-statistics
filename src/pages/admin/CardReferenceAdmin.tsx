import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import PageHeader from '../../components/ui/PageHeader'
import Tag from '../../components/ui/Tag'
import { parseTags } from '../../components/ui/tagUtils'
import { useCardReference } from '../../lib/hooks'
import { supabase } from '../../lib/supabase'
import { EXPANSION_ICONS, TAG_ICONS, NO_TAG_ICON, NO_TAG } from '../../lib/expansions'
import type { CardReference } from '../../types/database'

type CardType = CardReference['card_type']
type EditableCardType = CardType | ''

const CARD_TYPES: CardType[] = ['Automated', 'Active', 'Event', 'Corporation', 'Prelude', 'CEO', 'Global Event']

const EXPANSIONS_LIST = [
  'Base', 'Corporate Era', 'Prelude', 'Prelude 2',
  'Venus Next', 'Colonies', 'Turmoil', 'Ares', 'CEO', 'Moon', 'Pathfinders', 'Promos',
]

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  Automated:   { bg: 'rgba(74, 158, 107, 0.1)',  color: '#4a9e6b' },
  Active:      { bg: 'rgba(91, 141, 217, 0.1)',  color: '#5b8dd9' },
  Event:       { bg: 'rgba(224, 85, 53, 0.1)',   color: '#e05535' },
  Corporation: { bg: 'rgba(201, 160, 48, 0.1)',  color: '#c9a030' },
  Prelude:     { bg: 'rgba(220, 100, 150, 0.1)', color: '#d46496' },
  CEO:         { bg: 'rgba(210, 120, 50, 0.1)',  color: '#d07832' },
  'Global Event': { bg: 'rgba(160, 110, 190, 0.1)', color: '#a870c8' },
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
  'Jovian', 'Mars', 'Microbe', 'Moon', 'Plant', 'Planet', 'Power', 'Science', 'Space', 'Venus', 'Wild',
]

const RESOURCE_TYPES = [
  'Animal', 'Asteroid', 'Camp', 'Cube', 'Data', 'Delegates', 'Fighter',
  'Floater', 'Hydroelectric', 'Microbe', 'Orbitals', 'Preservation',
  'Robot', 'Science', 'Seeds', 'Syndicate Fleets', 'Venusian Habitat',
]

const BASE_VP_OPTIONS = [-2, -1, 0, 1, 2, 3, 4]

type EditValues = {
  card_name: string
  card_type: EditableCardType
  tags: string
  noTagExplicit: boolean
  expansions: string[]
  card_text: string
  resources: string
  effect_text: string
  effect_text_2: string
  action_text: string
  action_text_2: string
  flavour_text: string
  mc_cost: string
  base_vp: string
  resource_vp_type: string
  resource_vp_per: string
}

function emptyEditValues(): EditValues {
  return {
    card_name: '',
    card_type: '',
    tags: '',
    noTagExplicit: false,
    expansions: [],
    card_text: '',
    resources: '',
    effect_text: '',
    effect_text_2: '',
    action_text: '',
    action_text_2: '',
    flavour_text: '',
    mc_cost: '',
    base_vp: '',
    resource_vp_type: '',
    resource_vp_per: '',
  }
}

function extractSection(text: string, label: 'Effect' | 'Action' | 'Flavour') {
  const pattern = new RegExp(`(?:^|\\n)${label}:\\s*([\\s\\S]*?)(?=\\n(?:Effect|Action|Flavour):|$)`, 'i')
  return text.match(pattern)?.[1]?.trim() ?? ''
}

function cardTextToEditSections(card: CardReference) {
  const text = card.card_text ?? ''

  if (card.card_type === 'Active') {
    const [effect1, effect2 = ''] = (card.effect_text ?? '').split('\n\n')
    return {
      card_text: text,
      resources: card.resources ?? '',
      effect_text: effect1 ?? '',
      effect_text_2: effect2,
      action_text: card.action_text ?? '',
      action_text_2: card.action_text_2 ?? '',
      flavour_text: card.flavour_text ?? '',
    }
  }

  const flavour = extractSection(text, 'Flavour')
  if (flavour) {
    const cardText = text.replace(/\n?Flavour:\s*[\s\S]*$/i, '').trim()
    return { card_text: cardText, resources: card.resources ?? '', effect_text: card.effect_text ?? '', effect_text_2: '', action_text: card.action_text ?? '', action_text_2: card.action_text_2 ?? '', flavour_text: card.flavour_text ?? flavour }
  }

  return {
    card_text: text,
    resources: card.resources ?? '',
    effect_text: card.effect_text ?? '',
    effect_text_2: '',
    action_text: card.action_text ?? '',
    action_text_2: card.action_text_2 ?? '',
    flavour_text: card.flavour_text ?? '',
  }
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
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      onChange({ ...values, [k]: e.target.value })
  const isSimple = values.card_type === 'Automated' || values.card_type === 'Event' || values.card_type === 'CEO'
  const isActive = values.card_type === 'Active'
  const isComplexOptional = values.card_type === 'Corporation' || values.card_type === 'Prelude'
  const isGlobalEvent = values.card_type === 'Global Event'
  const [showEffect, setShowEffect] = useState(() => !!values.effect_text)
  const [showEffect2, setShowEffect2] = useState(() => !!values.effect_text_2)
  const [showAction, setShowAction] = useState(() => !!values.action_text)
  const [showAction2, setShowAction2] = useState(() => !!values.action_text_2)

  const textArea = (
    key: keyof Pick<EditValues, 'card_text' | 'resources' | 'effect_text' | 'effect_text_2' | 'action_text' | 'action_text_2' | 'flavour_text'>,
    label: string,
    placeholder: string,
    rows = 3,
  ) => (
    <div style={{ flex: '1 1 260px' }}>
      <label style={labelStyle}>{label}</label>
      <textarea
        value={values[key]}
        onChange={set(key)}
        placeholder={placeholder}
        rows={rows}
        style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' } as React.CSSProperties}
      />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Row 1: Card name, Type, MC Cost, Expansions */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '2 1 200px' }}>
          <label style={labelStyle}>Card name *</label>
          <input value={values.card_name} onChange={set('card_name')} placeholder="Card name" style={inputStyle} />
        </div>
        <div style={{ flex: '1 1 130px' }}>
          <label style={labelStyle}>Type</label>
          <select value={values.card_type} onChange={set('card_type')} style={inputStyle}>
            <option value="">—</option>
            {CARD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ flex: '0 0 80px' }}>
          <label style={labelStyle}>MC Cost</label>
          <input type="number" min={0} max={50} value={values.mc_cost} onChange={set('mc_cost')} placeholder="—" style={inputStyle} />
        </div>
        <div style={{ flex: '2 1 220px' }}>
          <label style={labelStyle}>Expansions</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 31px)', gap: '5px' }}>
            {EXPANSIONS_LIST.map(e => {
              const active = values.expansions.includes(e)
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => onChange({ ...values, expansions: active ? values.expansions.filter(x => x !== e) : [...values.expansions, e] })}
                  title={e}
                  style={{ width: '31px', height: '31px', padding: '4px', background: active ? 'rgba(46,139,139,0.12)' : 'transparent', border: `1px solid ${active ? '#2e8b8b' : '#3e325e'}`, borderRadius: '6px', cursor: 'pointer', transition: 'all 0.12s', opacity: active ? 1 : 0.45, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
                >
                  {EXPANSION_ICONS[e]
                    ? <img src={EXPANSION_ICONS[e]} alt={e} style={{ width: '21px', height: '21px', objectFit: 'contain', display: 'block' }} />
                    : <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: active ? '#3bbfbf' : '#625c7c', lineHeight: 1 }}>{e.slice(0, 2).toUpperCase()}</span>
                  }
                  {active && <span style={selectedDotStyle} />}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Row 2: Resource VP type, Resources per VP (conditional), Base VP */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 150px' }}>
          <label style={labelStyle}>
            Resource VP type{' '}
            <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#504270' }}>(e.g. Floater, Animal)</span>
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
        {!values.resource_vp_type && (
          <div style={{ flex: '0 0 90px' }}>
            <label style={labelStyle}>Base VP</label>
            <select value={values.base_vp} onChange={set('base_vp')} style={inputStyle}>
              <option value="">—</option>
              {BASE_VP_OPTIONS.map(n => <option key={n} value={n}>{n} VP</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Tags */}
      <div>
        <label style={labelStyle}>Tags</label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {ALL_TAGS.map(tag => {
            const current = parseTags(values.tags)
            const count = current.filter(t => t === tag).length
            const colors = TAG_COLORS[tag] ?? { bg: 'rgba(100,100,100,0.12)', color: '#8e87a8' }
            return (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  const next = count === 0 ? [...current, tag] : count === 1 ? [...current, tag] : current.filter(t => t !== tag)
                  onChange({ ...values, tags: next.join(', '), noTagExplicit: false })
                }}
                title={tag}
                style={{ width: '31px', height: '31px', padding: '4px', background: count > 0 ? colors.bg : 'transparent', border: `1px solid ${count > 0 ? colors.color : '#3e325e'}`, borderRadius: '6px', cursor: 'pointer', transition: 'all 0.12s', opacity: count > 0 ? 1 : 0.45, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
              >
                {TAG_ICONS[tag]
                  ? <img src={TAG_ICONS[tag]} alt={tag} style={{ width: '21px', height: '21px', objectFit: 'contain', display: 'block' }} />
                  : <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', color: count > 0 ? colors.color : '#625c7c', lineHeight: 1 }}>{tag.slice(0, 2).toUpperCase()}</span>
                }
                {count === 1 && <span style={selectedDotStyle} />}
                {count === 2 && <span style={countBadgeStyle}>2</span>}
              </button>
            )
          })}
          <button
            type="button"
            title="No tag"
            onClick={() => onChange({ ...values, tags: '', noTagExplicit: true })}
            style={{ width: '31px', height: '31px', padding: '4px', background: values.noTagExplicit ? 'rgba(100,100,100,0.12)' : 'transparent', border: `1px solid ${values.noTagExplicit ? '#8e87a8' : '#3e325e'}`, borderRadius: '6px', cursor: 'pointer', transition: 'all 0.12s', opacity: values.noTagExplicit ? 1 : 0.45, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <img src={NO_TAG_ICON} alt="No tag" style={{ width: '21px', height: '21px', objectFit: 'contain', display: 'block' }} />
          </button>
        </div>
      </div>

      {/* Card type-specific fields */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {isSimple && (
          <>
            {textArea('card_text', 'Gain resources', 'Resources gained…')}
            {textArea('resources', 'Resource icons', '1:megacredit, 2:steel, 3:titanium, 4:plant, 5:energy, 6:heat')}
            {textArea('flavour_text', 'Flavour text', 'Flavour text…')}
          </>
        )}
        {isActive && (
          <>
            {textArea('card_text', 'Gain resources', 'Resources gained…')}
            {textArea('resources', 'Resource icons', '1:megacredit, 2:steel, 3:titanium, 4:plant, 5:energy, 6:heat')}

            {/* Effect */}
            <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!showEffect && (
                  <button type="button" onClick={() => setShowEffect(true)} style={addBtnStyle}>+ Add effect</button>
                )}
                {showEffect && !showEffect2 && (
                  <button type="button" onClick={() => setShowEffect2(true)} style={addBtnStyle}>+ Add another effect</button>
                )}
              </div>
              {showEffect && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: '#625c7c' }}>Effect</span>
                    <button type="button" onClick={() => { setShowEffect(false); setShowEffect2(false); onChange({ ...values, effect_text: '', effect_text_2: '' }) }} style={removeBtnStyle}>× Remove</button>
                  </div>
                  <textarea value={values.effect_text} onChange={set('effect_text')} placeholder="Effect text…" rows={3} style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' } as React.CSSProperties} />
                </>
              )}
              {showEffect2 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: '#625c7c' }}>Effect 2</span>
                    <button type="button" onClick={() => { setShowEffect2(false); onChange({ ...values, effect_text_2: '' }) }} style={removeBtnStyle}>× Remove</button>
                  </div>
                  <textarea value={values.effect_text_2} onChange={set('effect_text_2')} placeholder="Second effect text…" rows={3} style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' } as React.CSSProperties} />
                </>
              )}
            </div>

            {/* Action */}
            <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!showAction && (
                  <button type="button" onClick={() => setShowAction(true)} style={addBtnStyle}>+ Add action</button>
                )}
                {showAction && !showAction2 && (
                  <button type="button" onClick={() => setShowAction2(true)} style={addBtnStyle}>+ Add another action</button>
                )}
              </div>
              {showAction && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: '#625c7c' }}>Action</span>
                    <button type="button" onClick={() => { setShowAction(false); setShowAction2(false); onChange({ ...values, action_text: '', action_text_2: '' }) }} style={removeBtnStyle}>× Remove</button>
                  </div>
                  <textarea value={values.action_text} onChange={set('action_text')} placeholder="Action text…" rows={3} style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' } as React.CSSProperties} />
                </>
              )}
              {showAction2 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: '#625c7c' }}>Action 2 (OR)</span>
                    <button type="button" onClick={() => { setShowAction2(false); onChange({ ...values, action_text_2: '' }) }} style={removeBtnStyle}>× Remove</button>
                  </div>
                  <textarea value={values.action_text_2} onChange={set('action_text_2')} placeholder="Second action text (shown with OR)…" rows={3} style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' } as React.CSSProperties} />
                </>
              )}
            </div>

            {textArea('flavour_text', 'Flavour text', 'Flavour text…')}
          </>
        )}
        {isComplexOptional && (
          <>
            {textArea('card_text', 'Gain resources', 'Resources gained…')}
            {textArea('resources', 'Resource icons', '1:megacredit, 2:steel, 3:titanium, 4:plant, 5:energy, 6:heat')}

            {/* Effect */}
            <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!showEffect && (
                  <button type="button" onClick={() => setShowEffect(true)} style={addBtnStyle}>+ Add effect</button>
                )}
                {showEffect && !showEffect2 && (
                  <button type="button" onClick={() => setShowEffect2(true)} style={addBtnStyle}>+ Add another effect</button>
                )}
              </div>
              {showEffect && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: '#625c7c' }}>Effect</span>
                    <button type="button" onClick={() => { setShowEffect(false); setShowEffect2(false); onChange({ ...values, effect_text: '', effect_text_2: '' }) }} style={removeBtnStyle}>× Remove</button>
                  </div>
                  <textarea value={values.effect_text} onChange={set('effect_text')} placeholder="Effect text…" rows={3} style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' } as React.CSSProperties} />
                </>
              )}
              {showEffect2 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: '#625c7c' }}>Effect 2</span>
                    <button type="button" onClick={() => { setShowEffect2(false); onChange({ ...values, effect_text_2: '' }) }} style={removeBtnStyle}>× Remove</button>
                  </div>
                  <textarea value={values.effect_text_2} onChange={set('effect_text_2')} placeholder="Second effect text…" rows={3} style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' } as React.CSSProperties} />
                </>
              )}
            </div>

            {/* Action */}
            <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!showAction && (
                  <button type="button" onClick={() => setShowAction(true)} style={addBtnStyle}>+ Add action</button>
                )}
                {showAction && !showAction2 && (
                  <button type="button" onClick={() => setShowAction2(true)} style={addBtnStyle}>+ Add another action</button>
                )}
              </div>
              {showAction && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: '#625c7c' }}>Action</span>
                    <button type="button" onClick={() => { setShowAction(false); setShowAction2(false); onChange({ ...values, action_text: '', action_text_2: '' }) }} style={removeBtnStyle}>× Remove</button>
                  </div>
                  <textarea value={values.action_text} onChange={set('action_text')} placeholder="Action text…" rows={3} style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' } as React.CSSProperties} />
                </>
              )}
              {showAction2 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: '#625c7c' }}>Action 2 (OR)</span>
                    <button type="button" onClick={() => { setShowAction2(false); onChange({ ...values, action_text_2: '' }) }} style={removeBtnStyle}>× Remove</button>
                  </div>
                  <textarea value={values.action_text_2} onChange={set('action_text_2')} placeholder="Second action text (shown with OR)…" rows={3} style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' } as React.CSSProperties} />
                </>
              )}
            </div>

            {textArea('flavour_text', 'Flavour text', 'Flavour text…')}
          </>
        )}
        {isGlobalEvent && (
          <>
            {textArea('card_text', 'Text', 'Card text…')}
            {textArea('flavour_text', 'Flavour text', 'Flavour text…')}
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button onClick={onSave} disabled={saving} style={{ padding: '6px 18px', background: '#9b50f0', border: 'none', borderRadius: '4px', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Saving…' : isNew ? 'Add card' : 'Save'}
        </button>
        <button onClick={onCancel} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid #3e325e', borderRadius: '4px', color: '#625c7c', fontFamily: 'var(--font-body)', fontSize: '0.82rem', cursor: 'pointer' }}>
          Cancel
        </button>
        {error && <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#e05535' }}>Error: {error}</span>}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CardReferenceAdmin() {
  const queryClient = useQueryClient()
  const { data: cards, isLoading } = useCardReference()

  const [search, setSearch]               = useState('')
  const [typeFilters, setTypeFilters]     = useState<CardType[]>([])
  const [tagFilters, setTagFilters]       = useState<string[]>([])
  const [expansionFilters, setExpansionFilters] = useState<string[]>([])
  const [editingId, setEditingId]         = useState<string | null>(null) // 'new' = add mode
  const [editValues, setEditValues]       = useState<EditValues>(emptyEditValues())
  const [saving, setSaving]               = useState(false)
  const [saveError, setSaveError]         = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  if (isLoading) return <div style={loadingStyle}>Loading…</div>

  const allTags = [...new Set((cards ?? []).flatMap(c => parseTags(c.tags)))].sort()
  const allExpansions = [...new Set((cards ?? []).flatMap(c => c.expansions))].sort()

  const filtered = (cards ?? []).filter(c => {
    if (search && !c.card_name.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilters.length > 0 && !typeFilters.includes(c.card_type)) return false
    if (tagFilters.length > 0) {
      const cardTags = parseTags(c.tags)
      const wantsNoTag = tagFilters.includes(NO_TAG)
      const otherFilters = tagFilters.filter(t => t !== NO_TAG)
      const matchesNoTag = wantsNoTag && cardTags.length === 0
      const matchesTag = otherFilters.length > 0 && otherFilters.some(t => cardTags.includes(t))
      if (!matchesNoTag && !matchesTag) return false
    }
    if (expansionFilters.length > 0 && !expansionFilters.some(e => c.expansions.includes(e))) return false
    return true
  })

  function toggleType(t: CardType) {
    setTypeFilters(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }
  function toggleTag(t: string) {
    setTagFilters(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }
  function toggleExpansion(e: string) {
    setExpansionFilters(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e])
  }

  function startEdit(card: CardReference) {
    const textSections = cardTextToEditSections(card)
    setEditingId(card.id)
    setEditValues({
      card_name: card.card_name,
      card_type: card.card_type,
      tags: card.tags ?? '',
      noTagExplicit: !card.tags || parseTags(card.tags).length === 0,
      expansions: card.expansions ?? [],
      ...textSections,
      mc_cost: card.mc_cost != null ? String(card.mc_cost) : '',
      base_vp: card.base_vp != null ? String(card.base_vp) : '',
      resource_vp_type: card.resource_vp_type ?? '',
      resource_vp_per: card.resource_vp_per != null ? String(card.resource_vp_per) : '',
    })
    setSaveError(null)
  }

  function startAdd() {
    setEditingId('new')
    setEditValues(emptyEditValues())
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
        card_text: editValues.card_text.trim() || null,
        resources: editValues.resources.trim() || null,
        effect_text: [editValues.effect_text, editValues.effect_text_2].map(s => s.trim()).filter(Boolean).join('\n\n') || null,
        action_text: editValues.action_text.trim() || null,
        action_text_2: editValues.action_text_2.trim() || null,
        flavour_text: editValues.flavour_text.trim() || null,
        mc_cost: editValues.mc_cost !== '' ? Number(editValues.mc_cost) : null,
        base_vp: editValues.base_vp !== '' ? Number(editValues.base_vp) : null,
        resource_vp_type: editValues.resource_vp_type || null,
        resource_vp_per: editValues.resource_vp_per !== '' ? Number(editValues.resource_vp_per) : null,
      }
      if (!payload.card_name) {
        setSaveError('Card name is required')
        setSaving(false)
        return
      }
      if (!payload.card_type) {
        setSaveError('Card type is required')
        setSaving(false)
        return
      }
      let cardId: string
      if (editingId === 'new') {
        const { data: inserted, error } = await supabase.from('card_reference').insert(payload).select('id').single()
        if (error) throw error
        cardId = inserted.id
      } else {
        const { error } = await supabase.from('card_reference').update(payload).eq('id', editingId!)
        if (error) throw error
        cardId = editingId!
      }
      // Sync card_expansions junction table
      await supabase.from('card_expansions').delete().eq('card_id', cardId)
      if (editValues.expansions.length > 0) {
        const { error } = await supabase.from('card_expansions').insert(
          editValues.expansions.map(exp => ({ card_id: cardId, expansion: exp }))
        )
        if (error) throw error
      }
      await queryClient.invalidateQueries({ queryKey: ['card-reference'] })
      setEditingId(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as any)?.message ?? JSON.stringify(err)
      setSaveError(msg)
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
              const icon = TAG_ICONS[tag]
              const colors = TAG_COLORS[tag] ?? { bg: 'rgba(100,100,100,0.12)', color: '#8e87a8' }
              return (
                <button key={tag} onClick={() => toggleTag(tag)} title={tag} style={{ padding: '4px', background: active ? colors.bg : 'transparent', border: `1px solid ${active ? colors.color : '#3e325e'}`, borderRadius: '6px', cursor: 'pointer', transition: 'all 0.12s', opacity: active ? 1 : 0.45, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {icon
                    ? <img src={icon} alt={tag} style={{ width: '20px', height: '20px', objectFit: 'contain', display: 'block' }} />
                    : <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: active ? colors.color : '#625c7c', padding: '0 7px' }}>{tag}</span>
                  }
                </button>
              )
            })}
            <button onClick={() => toggleTag(NO_TAG)} title="No tag" style={{ padding: '4px', background: tagFilters.includes(NO_TAG) ? 'rgba(100,100,100,0.12)' : 'transparent', border: `1px solid ${tagFilters.includes(NO_TAG) ? '#8e87a8' : '#3e325e'}`, borderRadius: '6px', cursor: 'pointer', transition: 'all 0.12s', opacity: tagFilters.includes(NO_TAG) ? 1 : 0.45, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={NO_TAG_ICON} alt="No tag" style={{ width: '20px', height: '20px', objectFit: 'contain', display: 'block' }} />
            </button>
          </div>
        )}

        {/* Expansion pills */}
        {allExpansions.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#504270', marginRight: '2px' }}>Expansion</span>
            {allExpansions.map(exp => {
              const active = expansionFilters.includes(exp)
              const icon = EXPANSION_ICONS[exp]
              return (
                <button key={exp} onClick={() => toggleExpansion(exp)} title={exp} style={{ width: '31px', height: '31px', padding: '4px', background: active ? 'rgba(46,139,139,0.12)' : 'transparent', border: `1px solid ${active ? '#2e8b8b' : '#3e325e'}`, borderRadius: '6px', cursor: 'pointer', transition: 'all 0.12s', opacity: active ? 1 : 0.45, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                  {icon
                    ? <img src={icon} alt={exp} style={{ width: '20px', height: '20px', objectFit: 'contain', display: 'block' }} />
                    : <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: active ? '#3bbfbf' : '#625c7c', padding: '0 7px' }}>{exp}</span>
                  }
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
                        {parseTags(card.tags).map((tag, i) => <Tag key={`${tag}-${i}`} name={tag} />)}
                      </div>
                    </td>
                    <td style={{ padding: '11px 16px', fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: '#8e87a8' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {card.expansions.length > 0
                          ? card.expansions.map(exp => EXPANSION_ICONS[exp]
                              ? <img key={exp} src={EXPANSION_ICONS[exp]} alt={exp} title={exp} style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                              : <span key={exp} style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#8e87a8' }}>{exp}</span>
                            )
                          : <span style={{ color: '#504270' }}>—</span>
                        }
                      </div>
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
const selectedDotStyle: React.CSSProperties = { position: 'absolute', right: '3px', bottom: '3px', width: '6px', height: '6px', borderRadius: '50%', background: '#3bbfbf', boxShadow: '0 0 0 1px #171228' }
const countBadgeStyle: React.CSSProperties = { position: 'absolute', right: '2px', bottom: '2px', minWidth: '12px', height: '12px', padding: '0 2px', borderRadius: '6px', background: '#3bbfbf', color: '#111', fontFamily: 'var(--font-mono)', fontSize: '0.52rem', fontWeight: 700, lineHeight: '12px', textAlign: 'center' }
const editBtnStyle: React.CSSProperties = { padding: '4px 12px', background: 'rgba(155,80,240,0.08)', border: '1px solid rgba(155,80,240,0.3)', borderRadius: '4px', color: '#b87aff', fontFamily: 'var(--font-body)', fontSize: '0.75rem', cursor: 'pointer' }
const deleteBtnStyle: React.CSSProperties = { padding: '4px 10px', background: 'transparent', border: '1px solid #3e325e', borderRadius: '4px', color: '#625c7c', fontFamily: 'var(--font-body)', fontSize: '0.75rem', cursor: 'pointer' }
const addBtnStyle: React.CSSProperties = { padding: '2px 8px', background: 'transparent', border: '1px solid #3e325e', borderRadius: '3px', color: '#625c7c', fontFamily: 'var(--font-body)', fontSize: '0.68rem', cursor: 'pointer' }
const removeBtnStyle: React.CSSProperties = { padding: '1px 7px', background: 'transparent', border: '1px solid #3e325e', borderRadius: '3px', color: '#625c7c', fontFamily: 'var(--font-body)', fontSize: '0.68rem', cursor: 'pointer' }
