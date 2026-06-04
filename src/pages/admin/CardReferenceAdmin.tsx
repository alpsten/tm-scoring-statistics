import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import PageHeader from '../../components/ui/PageHeader'
import Tag from '../../components/ui/Tag'
import { parseTags } from '../../components/ui/tagUtils'
import { useCardReference } from '../../lib/hooks'
import { supabase } from '../../lib/supabase'
import { EXPANSION_ICONS, TAG_ICONS, NO_TAG_ICON, NO_TAG, PLACEMENT_VP_TYPES, MULTIPLIER_VP_TYPES, TYPE_COLORS, CARD_EXPANSIONS } from '../../lib/expansions'
import type { CardReference } from '../../types/database'

type CardType = CardReference['card_type']
type EditableCardType = CardType | ''

const CARD_TYPES: CardType[] = ['Automated', 'Active', 'Event', 'Corporation', 'Prelude', 'CEO', 'Global Event']


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
  'Wild':     { bg: 'rgba(150, 130, 200, 0.12)', color: '#9682c8' },
}

const ALL_TAGS = [
  'Animal', 'Building', 'City', 'Earth', 'Event',
  'Jovian', 'Mars', 'Microbe', 'Moon', 'Plant', 'Planet', 'Power', 'Science', 'Space', 'Venus', 'Wild',
]

const DEFAULT_RESOURCE_VP_TYPES = [
  'Animal', 'Asteroid', 'Camp', 'Cube', 'Data', 'Delegates', 'Fighter',
  'Floater', 'Hydroelectric', 'Microbe', 'Orbitals',
  'Preservation', 'Robot', 'Science', 'Seeds', 'Syndicate Fleets', 'Venusian Habitat',
]

// Legacy resource_vp_type values that map to the Multiplier category after renaming
const LEGACY_MULTIPLIER_TYPES = new Set(['Jovian-tag', 'Moon-tag', 'Venus-tag'])

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

const labelClass = 'block font-body text-[0.68rem] font-medium tracking-[0.06em] uppercase text-[#625c7c] mb-[5px]'
const inputClass = 'w-full h-[34px] px-2.5 bg-[#171228] border border-[#3e325e] rounded text-[#ece6ff] font-body text-[0.83rem] outline-none box-border'
const textareaClass = 'w-full px-2.5 py-2 bg-[#171228] border border-[#3e325e] rounded text-[#ece6ff] font-body text-[0.83rem] outline-none resize-y'
const addBtnClass = 'px-2 py-[2px] bg-transparent border border-[#3e325e] rounded-[3px] text-[#625c7c] font-body text-[0.68rem] cursor-pointer hover:border-[#625c7c] transition-colors'
const removeBtnClass = 'px-[7px] py-[1px] bg-transparent border border-[#3e325e] rounded-[3px] text-[#625c7c] font-body text-[0.68rem] cursor-pointer hover:border-[#625c7c] transition-colors'

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
  const [vpMode, setVpModeRaw] = useState<'none' | 'base' | 'resource' | 'placement' | 'multiplier'>(() => {
    if (values.resource_vp_type) {
      if (PLACEMENT_VP_TYPES.includes(values.resource_vp_type)) return 'placement'
      if (MULTIPLIER_VP_TYPES.includes(values.resource_vp_type) || LEGACY_MULTIPLIER_TYPES.has(values.resource_vp_type)) return 'multiplier'
      return 'resource'
    }
    if (values.base_vp) return 'base'
    return 'none'
  })
  const setVpMode = (mode: typeof vpMode) => {
    setVpModeRaw(mode)
    if (mode === 'none') onChange({ ...values, base_vp: '', resource_vp_type: '', resource_vp_per: '' })
    else if (mode === 'base') onChange({ ...values, resource_vp_type: '', resource_vp_per: '' })
    else if (mode === 'resource') onChange({ ...values, base_vp: '', resource_vp_type: DEFAULT_RESOURCE_VP_TYPES.includes(values.resource_vp_type) ? values.resource_vp_type : '' })
    else if (mode === 'multiplier') onChange({ ...values, base_vp: '', resource_vp_type: MULTIPLIER_VP_TYPES.includes(values.resource_vp_type) ? values.resource_vp_type : '' })
    else onChange({ ...values, base_vp: '', resource_vp_type: PLACEMENT_VP_TYPES.includes(values.resource_vp_type) ? values.resource_vp_type : (PLACEMENT_VP_TYPES[0] ?? '') })
  }

  const textArea = (
    key: keyof Pick<EditValues, 'card_text' | 'resources' | 'effect_text' | 'effect_text_2' | 'action_text' | 'action_text_2' | 'flavour_text'>,
    label: string,
    placeholder: string,
    rows = 3,
  ) => (
    <div className="flex-[1_1_260px]">
      <label className={labelClass}>{label}</label>
      <textarea
        value={values[key]}
        onChange={set(key)}
        placeholder={placeholder}
        rows={rows}
        className={textareaClass}
      />
    </div>
  )

  return (
    <div className="flex flex-col gap-2.5 max-w-[780px]">
      {/* Row 1: Card name, Type, MC Cost, Expansions */}
      <div className="flex gap-2.5 flex-wrap items-end">
        <div className="flex-[2_1_200px]">
          <label className={labelClass}>Card name *</label>
          <input value={values.card_name} onChange={set('card_name')} placeholder="Card name" className={inputClass} />
        </div>
        <div className="flex-[1_1_130px]">
          <label className={labelClass}>Type</label>
          <select value={values.card_type} onChange={set('card_type')} className={inputClass}>
            <option value="">—</option>
            {CARD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="w-20 shrink-0">
          <label className={labelClass}>MC Cost</label>
          <input type="number" min={0} max={50} value={values.mc_cost} onChange={set('mc_cost')} placeholder="—" className={inputClass} />
        </div>
        <div className="flex-[2_1_220px]">
          <label className={labelClass}>Expansions</label>
          <div className="grid gap-[5px]" style={{ gridTemplateColumns: 'repeat(6, 31px)' }}>
            {CARD_EXPANSIONS.map(e => {
              const active = values.expansions.includes(e)
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => onChange({ ...values, expansions: active ? values.expansions.filter(x => x !== e) : [...values.expansions, e] })}
                  title={e}
                  className={`w-[31px] h-[31px] p-1 border rounded-[6px] cursor-pointer transition-all inline-flex items-center justify-center relative ${active ? 'bg-[rgba(46,139,139,0.12)] border-[#2e8b8b] opacity-100' : 'bg-transparent border-[#3e325e] opacity-45'}`}
                >
                  {EXPANSION_ICONS[e]
                    ? <img src={EXPANSION_ICONS[e]} alt={e} className="w-[21px] h-[21px] object-contain block" />
                    : <span className={`font-body text-[0.65rem] leading-none ${active ? 'text-[#3bbfbf]' : 'text-[#625c7c]'}`}>{e.slice(0, 2).toUpperCase()}</span>
                  }
                  {active && <span className="absolute right-[3px] bottom-[3px] w-1.5 h-1.5 rounded-full bg-[#3bbfbf] shadow-[0_0_0_1px_#171228]" />}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Row 2: VP category picker */}
      <div className="flex gap-2.5 flex-wrap items-end">
        <div className="w-[140px] shrink-0">
          <label className={labelClass}>VP Category</label>
          <select value={vpMode} onChange={e => setVpMode(e.target.value as typeof vpMode)} className={inputClass}>
            <option value="none">— None</option>
            <option value="base">Base VP</option>
            <option value="resource">Resource VP</option>
            <option value="placement">Placement VP</option>
            <option value="multiplier">Multiplier VP</option>
          </select>
        </div>

        {vpMode === 'base' && (
          <div className="w-[110px] shrink-0">
            <label className={labelClass}>VP Value</label>
            <select value={values.base_vp} onChange={set('base_vp')} className={inputClass}>
              <option value="">—</option>
              {BASE_VP_OPTIONS.map(n => <option key={n} value={n}>{n > 0 ? `+${n}` : n} VP</option>)}
            </select>
          </div>
        )}

        {vpMode === 'resource' && (
          <>
            <div className="flex-[1_1_140px]">
              <label className={labelClass}>Resource Type</label>
              <select value={values.resource_vp_type} onChange={set('resource_vp_type')} className={inputClass}>
                <option value="">—</option>
                {[...new Set([...DEFAULT_RESOURCE_VP_TYPES, ...(values.resource_vp_type && !PLACEMENT_VP_TYPES.includes(values.resource_vp_type) ? [values.resource_vp_type] : [])])].sort().map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="w-[140px] shrink-0">
              <label className={labelClass}>Resources per VP</label>
              <select value={values.resource_vp_per} onChange={set('resource_vp_per')} className={inputClass}>
                <option value="">—</option>
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n === 1 ? '1/1' : `1/${n}`}</option>)}
              </select>
            </div>
          </>
        )}

        {vpMode === 'placement' && (
          <>
            <div className="flex-[1_1_140px]">
              <label className={labelClass}>Placement Type</label>
              <select value={values.resource_vp_type} onChange={set('resource_vp_type')} className={inputClass}>
                <option value="">—</option>
                {PLACEMENT_VP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="w-[140px] shrink-0">
              <label className={labelClass}>Tiles per VP</label>
              <select value={values.resource_vp_per} onChange={set('resource_vp_per')} className={inputClass}>
                <option value="">—</option>
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n === 1 ? '1/1' : `1/${n}`}</option>)}
              </select>
            </div>
          </>
        )}

        {vpMode === 'multiplier' && (
          <>
            <div className="flex-[1_1_140px]">
              <label className={labelClass}>Multiplier</label>
              <select value={values.resource_vp_type} onChange={set('resource_vp_type')} className={inputClass}>
                <option value="">—</option>
                {MULTIPLIER_VP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="w-[140px] shrink-0">
              <label className={labelClass}>Per VP</label>
              <select value={values.resource_vp_per} onChange={set('resource_vp_per')} className={inputClass}>
                <option value="">—</option>
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n === 1 ? '1/1' : `1/${n}`}</option>)}
              </select>
            </div>
          </>
        )}
      </div>

      {/* Tags */}
      <div>
        <label className={labelClass}>Tags</label>
        <div className="flex gap-1.5 flex-wrap">
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
                className="w-[31px] h-[31px] p-1 rounded-[6px] cursor-pointer transition-all inline-flex items-center justify-center relative"
                style={{ background: count > 0 ? colors.bg : 'transparent', border: `1px solid ${count > 0 ? colors.color : '#3e325e'}`, opacity: count > 0 ? 1 : 0.45 }}
              >
                {TAG_ICONS[tag]
                  ? <img src={TAG_ICONS[tag]} alt={tag} className="w-[21px] h-[21px] object-contain block" />
                  : <span className="font-body text-[0.65rem] leading-none" style={{ color: count > 0 ? colors.color : '#625c7c' }}>{tag.slice(0, 2).toUpperCase()}</span>
                }
                {count === 1 && <span className="absolute right-[3px] bottom-[3px] w-1.5 h-1.5 rounded-full bg-[#3bbfbf] shadow-[0_0_0_1px_#171228]" />}
                {count === 2 && <span className="absolute right-0.5 bottom-0.5 min-w-3 h-3 px-[2px] rounded-[6px] bg-[#3bbfbf] text-[#111] font-mono text-[0.52rem] font-bold leading-3 text-center">2</span>}
              </button>
            )
          })}
          <button
            type="button"
            title="No tag"
            onClick={() => onChange({ ...values, tags: '', noTagExplicit: true })}
            className="w-[31px] h-[31px] p-1 rounded-[6px] cursor-pointer transition-all inline-flex items-center justify-center"
            style={{ background: values.noTagExplicit ? 'rgba(100,100,100,0.12)' : 'transparent', border: `1px solid ${values.noTagExplicit ? '#8e87a8' : '#3e325e'}`, opacity: values.noTagExplicit ? 1 : 0.45 }}
          >
            <img src={NO_TAG_ICON} alt="No tag" className="w-[21px] h-[21px] object-contain block" />
          </button>
        </div>
      </div>

      {/* Card type-specific fields */}
      <div className="flex gap-2.5 flex-wrap">
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
            <div className="flex-[1_1_260px] flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                {!showEffect && (
                  <button type="button" onClick={() => setShowEffect(true)} className={addBtnClass}>+ Add effect</button>
                )}
                {showEffect && !showEffect2 && (
                  <button type="button" onClick={() => setShowEffect2(true)} className={addBtnClass}>+ Add another effect</button>
                )}
              </div>
              {showEffect && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="font-body text-[0.68rem] text-[#625c7c]">Effect</span>
                    <button type="button" onClick={() => { setShowEffect(false); setShowEffect2(false); onChange({ ...values, effect_text: '', effect_text_2: '' }) }} className={removeBtnClass}>× Remove</button>
                  </div>
                  <textarea value={values.effect_text} onChange={set('effect_text')} placeholder="Effect text…" rows={3} className={textareaClass} />
                </>
              )}
              {showEffect2 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="font-body text-[0.68rem] text-[#625c7c]">Effect 2</span>
                    <button type="button" onClick={() => { setShowEffect2(false); onChange({ ...values, effect_text_2: '' }) }} className={removeBtnClass}>× Remove</button>
                  </div>
                  <textarea value={values.effect_text_2} onChange={set('effect_text_2')} placeholder="Second effect text…" rows={3} className={textareaClass} />
                </>
              )}
            </div>

            {/* Action */}
            <div className="flex-[1_1_260px] flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                {!showAction && (
                  <button type="button" onClick={() => setShowAction(true)} className={addBtnClass}>+ Add action</button>
                )}
                {showAction && !showAction2 && (
                  <button type="button" onClick={() => setShowAction2(true)} className={addBtnClass}>+ Add another action</button>
                )}
              </div>
              {showAction && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="font-body text-[0.68rem] text-[#625c7c]">Action</span>
                    <button type="button" onClick={() => { setShowAction(false); setShowAction2(false); onChange({ ...values, action_text: '', action_text_2: '' }) }} className={removeBtnClass}>× Remove</button>
                  </div>
                  <textarea value={values.action_text} onChange={set('action_text')} placeholder="Action text…" rows={3} className={textareaClass} />
                </>
              )}
              {showAction2 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="font-body text-[0.68rem] text-[#625c7c]">Action 2 (OR)</span>
                    <button type="button" onClick={() => { setShowAction2(false); onChange({ ...values, action_text_2: '' }) }} className={removeBtnClass}>× Remove</button>
                  </div>
                  <textarea value={values.action_text_2} onChange={set('action_text_2')} placeholder="Second action text (shown with OR)…" rows={3} className={textareaClass} />
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
            <div className="flex-[1_1_260px] flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                {!showEffect && (
                  <button type="button" onClick={() => setShowEffect(true)} className={addBtnClass}>+ Add effect</button>
                )}
                {showEffect && !showEffect2 && (
                  <button type="button" onClick={() => setShowEffect2(true)} className={addBtnClass}>+ Add another effect</button>
                )}
              </div>
              {showEffect && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="font-body text-[0.68rem] text-[#625c7c]">Effect</span>
                    <button type="button" onClick={() => { setShowEffect(false); setShowEffect2(false); onChange({ ...values, effect_text: '', effect_text_2: '' }) }} className={removeBtnClass}>× Remove</button>
                  </div>
                  <textarea value={values.effect_text} onChange={set('effect_text')} placeholder="Effect text…" rows={3} className={textareaClass} />
                </>
              )}
              {showEffect2 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="font-body text-[0.68rem] text-[#625c7c]">Effect 2</span>
                    <button type="button" onClick={() => { setShowEffect2(false); onChange({ ...values, effect_text_2: '' }) }} className={removeBtnClass}>× Remove</button>
                  </div>
                  <textarea value={values.effect_text_2} onChange={set('effect_text_2')} placeholder="Second effect text…" rows={3} className={textareaClass} />
                </>
              )}
            </div>

            {/* Action */}
            <div className="flex-[1_1_260px] flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                {!showAction && (
                  <button type="button" onClick={() => setShowAction(true)} className={addBtnClass}>+ Add action</button>
                )}
                {showAction && !showAction2 && (
                  <button type="button" onClick={() => setShowAction2(true)} className={addBtnClass}>+ Add another action</button>
                )}
              </div>
              {showAction && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="font-body text-[0.68rem] text-[#625c7c]">Action</span>
                    <button type="button" onClick={() => { setShowAction(false); setShowAction2(false); onChange({ ...values, action_text: '', action_text_2: '' }) }} className={removeBtnClass}>× Remove</button>
                  </div>
                  <textarea value={values.action_text} onChange={set('action_text')} placeholder="Action text…" rows={3} className={textareaClass} />
                </>
              )}
              {showAction2 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="font-body text-[0.68rem] text-[#625c7c]">Action 2 (OR)</span>
                    <button type="button" onClick={() => { setShowAction2(false); onChange({ ...values, action_text_2: '' }) }} className={removeBtnClass}>× Remove</button>
                  </div>
                  <textarea value={values.action_text_2} onChange={set('action_text_2')} placeholder="Second action text (shown with OR)…" rows={3} className={textareaClass} />
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

      <div className="flex gap-2 items-center">
        <button onClick={onSave} disabled={saving} className="px-[18px] py-1.5 bg-[#9b50f0] border-none rounded text-white font-body text-[0.82rem] font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60">
          {saving ? 'Saving…' : isNew ? 'Add card' : 'Save'}
        </button>
        <button onClick={onCancel} className="px-3.5 py-1.5 bg-transparent border border-[#3e325e] rounded text-[#625c7c] font-body text-[0.82rem] cursor-pointer hover:border-[#625c7c] transition-colors">
          Cancel
        </button>
        {error && <span className="font-body text-[0.78rem] text-mars-500">Error: {error}</span>}
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

  if (isLoading) return <div className="py-8 px-9 text-[#625c7c] font-body">Loading…</div>

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
    <div className="page-enter py-8 px-9 min-h-full bg-[#0c0e12]">
      <div className="mb-6">
        <Link to="/admin" className="font-body text-[0.78rem] text-[#625c7c] no-underline">← Admin</Link>
      </div>
      <PageHeader
        title="Card reference"
        subtitle={hasFilters ? `${filtered.length} of ${cards?.length ?? 0} cards` : `${cards?.length ?? 0} cards`}
      />

      {/* Filter bar */}
      <div className="mb-5 flex flex-col gap-2.5">
        {/* Search + Add + Clear */}
        <div className="flex gap-2.5 items-center flex-wrap">
          <input
            type="text"
            placeholder="Search cards…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-[220px] h-[34px] px-3 bg-[#282042] border border-[#3e325e] rounded text-[#ece6ff] font-body text-[0.83rem] outline-none"
          />
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setTypeFilters([]); setTagFilters([]); setExpansionFilters([]) }}
              className="h-[34px] px-3 bg-transparent border border-[#3e325e] rounded text-[#625c7c] font-body text-[0.78rem] cursor-pointer hover:border-[#625c7c] transition-colors"
            >
              Clear all
            </button>
          )}
          <button
            onClick={startAdd}
            disabled={editingId === 'new'}
            className="h-[34px] px-4 bg-violet-500/12 border border-violet-500/40 rounded text-[#b87aff] font-body text-[0.83rem] cursor-pointer disabled:cursor-not-allowed ml-auto"
          >
            + Add card
          </button>
        </div>

        {/* Type pills */}
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="font-body text-[0.68rem] font-semibold tracking-[0.08em] uppercase text-[#504270] mr-0.5">Type</span>
          {CARD_TYPES.map(type => {
            const active = typeFilters.includes(type)
            const colors = TYPE_COLORS[type]
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className="px-[11px] py-[3px] rounded-[12px] cursor-pointer transition-all font-body text-[0.75rem]"
                style={{ background: active ? colors.bg : 'transparent', border: `1px solid ${active ? colors.color : '#3e325e'}`, color: active ? colors.color : '#625c7c' }}
              >
                {active ? '✓ ' : ''}{type}
              </button>
            )
          })}
        </div>

        {/* Tag pills */}
        {allTags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="font-body text-[0.68rem] font-semibold tracking-[0.08em] uppercase text-[#504270] mr-0.5">Tag</span>
            {allTags.map(tag => {
              const active = tagFilters.includes(tag)
              const icon = TAG_ICONS[tag]
              const colors = TAG_COLORS[tag] ?? { bg: 'rgba(100,100,100,0.12)', color: '#8e87a8' }
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  title={tag}
                  className="p-1 rounded-[6px] cursor-pointer transition-all inline-flex items-center justify-center"
                  style={{ background: active ? colors.bg : 'transparent', border: `1px solid ${active ? colors.color : '#3e325e'}`, opacity: active ? 1 : 0.45 }}
                >
                  {icon
                    ? <img src={icon} alt={tag} className="w-5 h-5 object-contain block" />
                    : <span className="font-body text-[0.75rem] px-[7px]" style={{ color: active ? colors.color : '#625c7c' }}>{tag}</span>
                  }
                </button>
              )
            })}
            <button
              onClick={() => toggleTag(NO_TAG)}
              title="No tag"
              className="p-1 rounded-[6px] cursor-pointer transition-all inline-flex items-center justify-center"
              style={{ background: tagFilters.includes(NO_TAG) ? 'rgba(100,100,100,0.12)' : 'transparent', border: `1px solid ${tagFilters.includes(NO_TAG) ? '#8e87a8' : '#3e325e'}`, opacity: tagFilters.includes(NO_TAG) ? 1 : 0.45 }}
            >
              <img src={NO_TAG_ICON} alt="No tag" className="w-5 h-5 object-contain block" />
            </button>
          </div>
        )}

        {/* Expansion pills */}
        {allExpansions.length > 0 && (
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="font-body text-[0.68rem] font-semibold tracking-[0.08em] uppercase text-[#504270] mr-0.5">Expansion</span>
            {allExpansions.map(exp => {
              const active = expansionFilters.includes(exp)
              const icon = EXPANSION_ICONS[exp]
              return (
                <button
                  key={exp}
                  onClick={() => toggleExpansion(exp)}
                  title={exp}
                  className={`w-[31px] h-[31px] p-1 border rounded-[6px] cursor-pointer transition-all inline-flex items-center justify-center box-border ${active ? 'bg-[rgba(46,139,139,0.12)] border-[#2e8b8b] opacity-100' : 'bg-transparent border-[#3e325e] opacity-45'}`}
                >
                  {icon
                    ? <img src={icon} alt={exp} className="w-5 h-5 object-contain block" />
                    : <span className={`font-body text-[0.75rem] px-[7px] ${active ? 'text-[#3bbfbf]' : 'text-[#625c7c]'}`}>{exp}</span>
                  }
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* New card form */}
      {editingId === 'new' && (
        <div className="bg-[#282042] border border-violet-500/30 rounded-[6px] p-5 mb-4">
          <div className="font-body text-[0.68rem] font-semibold tracking-[0.08em] uppercase text-[#b87aff] mb-3.5">
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
      <div className="bg-[#282042] border border-[#3e325e] rounded-[6px] overflow-auto">
        <table className="w-full border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-[#3e325e]">
              {['Card', 'Type', 'Tags', 'Expansion', 'MC', 'Base VP', 'VP (Resource / Placement)', ''].map((h, i) => (
                <th key={i} className="px-4 py-2.5 text-left font-body text-[0.68rem] font-semibold tracking-[0.08em] uppercase text-[#504270]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((card, i) => (
              <tr
                key={card.id}
                className={`${i < filtered.length - 1 ? 'border-b border-[#3e325e]' : ''} ${editingId === card.id ? 'bg-violet-500/4' : ''}`}
              >
                {editingId === card.id ? (
                  <td colSpan={8} className="p-4">
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
                    <td className="px-4 py-[11px] font-body text-[0.85rem] text-[#ece6ff] font-medium">
                      {card.card_name}
                    </td>
                    <td className="px-4 py-[11px]">
                      <span className="font-body text-[0.7rem] font-medium px-[7px] py-[2px] rounded-[3px] whitespace-nowrap" style={{ background: TYPE_COLORS[card.card_type]?.bg, color: TYPE_COLORS[card.card_type]?.color }}>
                        {card.card_type}
                      </span>
                    </td>
                    <td className="px-4 py-[11px]">
                      <div className="flex gap-1 flex-wrap">
                        {parseTags(card.tags).map((tag, i) => <Tag key={`${tag}-${i}`} name={tag} />)}
                      </div>
                    </td>
                    <td className="px-4 py-[11px]">
                      <div className="flex gap-1 flex-wrap">
                        {card.expansions.length > 0
                          ? card.expansions.map(exp => EXPANSION_ICONS[exp]
                              ? <img key={exp} src={EXPANSION_ICONS[exp]} alt={exp} title={exp} className="w-[18px] h-[18px] object-contain" />
                              : <span key={exp} className="font-body text-[0.75rem] text-[#8e87a8]">{exp}</span>
                            )
                          : <span className="text-[#504270]">—</span>
                        }
                      </div>
                    </td>
                    <td className={`px-4 py-[11px] font-mono text-[0.8rem] ${card.mc_cost != null ? 'text-[#ece6ff]' : 'text-[#3e325e]'}`}>
                      {card.mc_cost != null ? `${card.mc_cost}` : '/'}
                    </td>
                    <td className="px-4 py-[11px] font-mono text-[0.8rem] text-[#c9a030]">
                      {card.base_vp != null ? `${card.base_vp} VP` : '—'}
                    </td>
                    <td className="px-4 py-[11px] font-body text-[0.78rem]">
                      {card.resource_vp_type
                        ? (() => {
                            const isPlacement = PLACEMENT_VP_TYPES.includes(card.resource_vp_type)
                            const label = card.resource_vp_per ? `1/${card.resource_vp_per} ${card.resource_vp_type}` : card.resource_vp_type
                            return (
                              <span style={{ color: isPlacement ? '#5b8dd9' : '#c9a030' }}>
                                {isPlacement ? '⬡ ' : '◆ '}{label}
                              </span>
                            )
                          })()
                        : <span className="text-[#3e325e]">—</span>}
                    </td>
                    <td className="px-4 py-[11px]">
                      <div className="flex gap-1.5 justify-end items-center">
                        {deleteConfirmId === card.id ? (
                          <>
                            <span className="font-body text-[0.75rem] text-mars-500">Delete?</span>
                            <button onClick={() => deleteCard(card.id)} className="px-3 py-1 bg-mars-500/12 border border-mars-500/40 rounded text-mars-500 font-body text-[0.75rem] cursor-pointer">Yes</button>
                            <button onClick={() => setDeleteConfirmId(null)} className="px-2.5 py-1 bg-transparent border border-[#3e325e] rounded text-[#625c7c] font-body text-[0.75rem] cursor-pointer hover:border-[#625c7c] transition-colors">No</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(card)} className="px-3 py-1 bg-violet-500/8 border border-violet-500/30 rounded text-[#b87aff] font-body text-[0.75rem] cursor-pointer hover:bg-violet-500/12 transition-colors">Edit</button>
                            <button onClick={() => setDeleteConfirmId(card.id)} className="px-2.5 py-1 bg-transparent border border-[#3e325e] rounded text-[#625c7c] font-body text-[0.75rem] cursor-pointer hover:border-[#625c7c] transition-colors">Delete</button>
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
