import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import PageHeader from '../../components/ui/PageHeader'
import { supabase } from '../../lib/supabase'
import { usePlayerStats, useCardReference, useGame, useGameMilestones, useGameAwards } from '../../lib/hooks'
import { EXPANSION_ICONS } from '../../lib/expansions'

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

function Combobox({ value, onChange, options, placeholder, strict }: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  strict?: boolean
}) {
  const [open, setOpen] = useState(false)
  const q = value.toLowerCase()
  const filtered = (q ? options.filter(o => o.toLowerCase().includes(q)) : options).slice(0, 12)
  const isValid = !strict || !value || options.some(o => o.toLowerCase() === value.toLowerCase())

  function handleBlur() {
    setTimeout(() => {
      setOpen(false)
      if (strict && value && !options.some(o => o.toLowerCase() === value.toLowerCase())) {
        onChange('')
      }
    }, 150)
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoComplete="off"
        style={{ ...inputStyle, borderColor: isValid ? '#3e325e' : '#e05535' }}
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
  tr:                z.coerce.number().int().min(0).max(200),
  milestone_vp:      z.coerce.number().int().min(0),
  award_vp:          z.coerce.number().int().min(0),
  greenery_vp:       z.coerce.number().int().min(0),
  city_vp:           z.coerce.number().int().min(0),
  card_vp:           z.coerce.number().int(),
  habitat_vp:        z.preprocess(v => (v === '' || v == null ? null : v), z.coerce.number().int().min(0).nullable()),
  logistics_vp:      z.preprocess(v => (v === '' || v == null ? null : v), z.coerce.number().int().min(0).nullable()),
  mining_vp:         z.preprocess(v => (v === '' || v == null ? null : v), z.coerce.number().int().min(0).nullable()),
  plantery_vp:       z.preprocess(v => (v === '' || v == null ? null : v), z.coerce.number().int().min(0).nullable()),
  mc:                z.preprocess(v => (v === '' || v == null ? null : v), z.coerce.number().int().min(0).nullable()),
  habitat_steps:     z.coerce.number().int().min(0).default(0),
  mining_steps:      z.coerce.number().int().min(0).default(0),
  logistics_steps:   z.coerce.number().int().min(0).default(0),
  total_vp:          z.coerce.number().int().min(0),
  position:          z.coerce.number().int().min(1).max(5),
  key_notes:         z.string(),
  oxygen_steps:      z.coerce.number().int().min(0).default(0),
  temperature_steps: z.coerce.number().int().min(0).default(0),
  ocean_steps:       z.coerce.number().int().min(0).default(0),
  venus_steps:       z.coerce.number().int().min(0).default(0),
})

const gameSchema = z.object({
  date:        z.string().min(1, 'Required'),
  generations: z.preprocess(v => (v === '' || v == null ? null : v), z.coerce.number().min(1).nullable()),
  map_name:    z.string(),
  format:      z.enum(['Physical', 'Digital']),
  notes:       z.string(),
  players:     z.array(playerSchema).min(1),
})

type GameFormValues = z.infer<typeof gameSchema>

// ─── Constants ────────────────────────────────────────────────────────────────

const MAPS = [
  'Tharsis', 'Hellas', 'Elysium', 'Arabia Terra',
  'Amazonis Planitia', 'Terra Cimmeria', 'Vastitas Borealis', 'Utopia Planitia',
  'Vastitas Borealis Nova', 'Hollandia',
]
const EXPANSIONS = ['Prelude', 'Prelude 2', 'Venus Next', 'Colonies', 'Turmoil', 'Ares', 'Moon', 'Pathfinders', 'CEO', 'Promos']
const COLONY_TILES = [
  'Callisto', 'Ceres', 'Enceladus', 'Europa', 'Ganymede',
  'Io', 'Luna', 'Miranda', 'Pluto', 'Titan', 'Triton',
]
const PATHFINDERS_COLONY_TILES = ['Iapetus II']

const MAP_MILESTONES: Record<string, string[]> = {
  'Tharsis':           ['Terraformer29', 'Mayor', 'Gardener', 'Builder7', 'Planner'],
  'Hellas':            ['Diversifier', 'Tactician4', 'Polar Explorer', 'Energizer', 'Rim Settler'],
  'Elysium':           ['Generalist', 'Specialist', 'Ecologist', 'Tycoon10', 'Legend4'],
  'Utopia Planitia':   ['Manager', 'Pioneer3', 'Trader', 'Metallurgist', 'Researcher'],
  'Terra Cimmeria':    ['Planetologist', 'Architect', 'Coast Guard', 'Forester3', 'Fundraiser'],
  'Vastitas Borealis': ['Agronomist', 'Spacefarer4', 'Geologist', 'Engineer', 'Farmer'],
}

const MAP_AWARDS: Record<string, string[]> = {
  'Tharsis':           ['Landlord', 'Scientist', 'Banker', 'Thermalist', 'Miner'],
  'Hellas':            ['Cultivator', 'Magnate', 'Space Baron', 'Excentric', 'Contractor'],
  'Elysium':           ['Celebrity', 'Industrialist', 'Desert Settler', 'Estate Dealer', 'Benefactor'],
  'Utopia Planitia':   ['Suburbian', 'Investor', 'Botanist', 'Incorporator', 'Metropolist'],
  'Terra Cimmeria':    ['Electrician', 'Founder', 'Mogul', 'Zoologist', 'Forecaster'],
  'Vastitas Borealis': ['Traveller', 'Landscaper', 'Highlander', 'Promoter', 'Blacksmith'],
}

const RANDOM_MILESTONES = [
  'Briber', 'Builder7', 'Builder8', 'Coastguard', 'Diversifier', 'Ecologist', 'Economizer',
  'Energizer', 'Engineer', 'Farmer', 'Forester3', 'Forester4', 'Fundraiser', 'Gardener',
  'Generalist', 'Hoverlord', 'Hydrologist', 'Land Specialist', 'Landshaper', 'Legend4', 'Legend5',
  'Lobbyist', 'Manager', 'Martian', 'Mayor', 'Merchant', 'Metallurgist', 'Philanthropist', 'Pioneer3',
  'Pioneer4', 'Planetologist', 'Planner', 'Polar Explorer', 'Producer', 'Researcher', 'Rim Settler',
  'One Giant Step', 'Spacefarer4', 'Spacefarer6', 'Specialist', 'Sponsor', 'Tactician4', 'Tactician5', 'Terraformer29',
  'Terraformer35', 'Terran5', 'Terran6', 'Thawer', 'Trader', 'Tycoon10', 'Tycoon15',
].sort()

const RANDOM_AWARDS = [
  'Administrator', 'Banker', 'Benefactor', 'Biologist', 'Botanist', 'Celebrity', 'Collector',
  'Constructor', 'Contractor', 'Cosmic Settler', 'Cultivator', 'Desert Settler', 'Electrician',
  'Estate Dealer', 'Excentric', 'Forecaster', 'Founder', 'Highlander', 'Incorporator', 'Industrialist',
  'Investor', 'Landlord', 'Landscaper', 'Lunar Magnate', 'Magnate', 'Manufacturer', 'Metropolist', 'Miner', 'Mogul',
  'Politician', 'Promoter', 'Scientist', 'Space Baron', 'Suburbian', 'Thermalist', 'Traveller',
  'Venuphile', 'Visionary', 'Zoologist',
].sort()

const SCORE_FIELDS: { key: keyof GameFormValues['players'][0]; label: string; min?: number }[] = [
  { key: 'tr',           label: 'TR',          min: 0 },
  { key: 'milestone_vp', label: 'Milestones',  min: 0 },
  { key: 'award_vp',     label: 'Awards',      min: 0 },
  { key: 'greenery_vp',  label: 'Greeneries',  min: 0 },
  { key: 'city_vp',      label: 'Cities',      min: 0 },
  { key: 'card_vp',      label: 'Card VP'             },
  { key: 'total_vp',     label: 'Total VP',    min: 0 },
  { key: 'mc',           label: 'MC'                  },
]

const PARAM_FIELDS: { key: 'oxygen_steps' | 'temperature_steps' | 'ocean_steps' | 'venus_steps'; label: string; color: string }[] = [
  { key: 'temperature_steps', label: 'Temperature', color: '#e05535' },
  { key: 'oxygen_steps',      label: 'Oxygen',      color: '#4a9e6b' },
  { key: 'ocean_steps',       label: 'Oceans',      color: '#2e8b8b' },
  { key: 'venus_steps',       label: 'Venus',       color: '#b87aff' },
]

const DEFAULT_PLAYER = {
  player_name: '', corporation: '',
  tr: 20, milestone_vp: 0, award_vp: 0, greenery_vp: 0, city_vp: 0, card_vp: 0,
  habitat_vp: null, logistics_vp: null, mining_vp: null, plantery_vp: null, mc: null,
  total_vp: 0, position: 1, key_notes: '',
  oxygen_steps: 0, temperature_steps: 0, ocean_steps: 0, venus_steps: 0,
  habitat_steps: 0, mining_steps: 0, logistics_steps: 0,
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddGame() {
  const navigate = useNavigate()
  const { id: editId } = useParams<{ id?: string }>()
  const isEdit = !!editId
  const queryClient = useQueryClient()

  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [hasParams, setHasParams] = useState(false)
  const [expansions, setExpansions] = useState<string[]>([])
  const [colonies, setColonies]     = useState<string[]>([])

  const hasMoon        = expansions.includes('Moon')
  const hasPathfinders = expansions.includes('Pathfinders')
  const hasVenusNext   = expansions.includes('Venus Next')
  const hasCEO         = expansions.includes('CEO')
  const maSlots   = hasVenusNext ? 6 : 5

  const [useRandomMA, setUseRandomMA]     = useState(false)
  const [milestones, setMilestones]       = useState<string[]>(Array(6).fill(''))
  const [awards, setAwards]                   = useState<string[]>(Array(6).fill(''))
  const [awardFunders, setAwardFunders]       = useState<string[]>(Array(6).fill(''))
  const [awardFundOrders, setAwardFundOrders] = useState<string[]>(Array(6).fill(''))
  const [awardWinners, setAwardWinners]       = useState<string[]>(Array(6).fill(''))
  const [awardWinners2, setAwardWinners2]     = useState<string[]>(Array(6).fill(''))
  const [awardWinnerTied, setAwardWinnerTied] = useState<boolean[]>(Array(6).fill(false))
  const [awardSecond, setAwardSecond]         = useState<string[]>(Array(6).fill(''))
  const [awardSecond2, setAwardSecond2]       = useState<string[]>(Array(6).fill(''))
  const [awardSecondTied, setAwardSecondTied] = useState<boolean[]>(Array(6).fill(false))
  const [awardExpanded, setAwardExpanded]     = useState<boolean[]>(Array(6).fill(false))
  const [startOrders, setStartOrders] = useState<number[]>([0, 0])

  // Per-player merger state: how many corps each player has (1, 2, or 3)
  const [mergerCounts, setMergerCounts] = useState<number[]>([1, 1])
  const [extraCorp2, setExtraCorp2]     = useState<string[]>(['', ''])
  const [extraCorp3, setExtraCorp3]     = useState<string[]>(['', ''])
  const [ceos, setCeos]                 = useState<string[]>(Array(5).fill(''))

  const { data: playerStats } = usePlayerStats()
  const { data: cardRef }     = useCardReference()
  const { data: existingGame } = useGame(editId ?? '', { enabled: isEdit })
  const { data: existingMilestones } = useGameMilestones(isEdit ? (editId ?? '') : '')
  const { data: existingAwards }     = useGameAwards(isEdit ? (editId ?? '') : '')

  const existingPlayers = (playerStats ?? []).map(p => p.player_name).sort()
  const corporations = (cardRef ?? [])
    .filter(c => c.card_type === 'Corporation')
    .map(c => c.card_name)
    .sort()
  const ceoOptions = (cardRef ?? [])
    .filter(c => c.card_type === 'CEO')
    .map(c => c.card_name)
    .sort()

  const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<GameFormValues>({
    resolver: zodResolver(gameSchema) as Resolver<GameFormValues>,
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      generations: null,
      map_name: '',
      format: 'Digital' as const,
      notes: '',
      players: [
        { ...DEFAULT_PLAYER, position: 1 },
        { ...DEFAULT_PLAYER, position: 2 },
      ],
    },
  })

  const watchedMap = watch('map_name')

  const populateFromMap = useCallback((mapName: string) => {
    const ms = MAP_MILESTONES[mapName] ?? []
    const as = MAP_AWARDS[mapName] ?? []
    setMilestones(Array(6).fill('').map((_, i) => ms[i] ?? ''))
    setAwards(Array(6).fill('').map((_, i) => as[i] ?? ''))
    setAwardFunders(Array(6).fill(''))
    setAwardFundOrders(Array(6).fill(''))
    setAwardWinners(Array(6).fill(''))
    setAwardWinners2(Array(6).fill(''))
    setAwardWinnerTied(Array(6).fill(false))
    setAwardSecond(Array(6).fill(''))
    setAwardSecond2(Array(6).fill(''))
    setAwardSecondTied(Array(6).fill(false))
    setAwardExpanded(Array(6).fill(false))
  }, [])

  useEffect(() => {
    if (watchedMap && !isEdit) {
      setUseRandomMA(false)
      populateFromMap(watchedMap)
    }
  }, [watchedMap, populateFromMap, isEdit])

  // ── Pre-populate milestones/awards from DB when editing ──────────────────────

  useEffect(() => {
    if (!isEdit || !existingMilestones || existingMilestones.length === 0) return
    setMilestones(Array(6).fill('').map((_, i) => existingMilestones[i]?.milestone_name ?? ''))
    const mapMs = MAP_MILESTONES[existingGame?.map_name ?? ''] ?? []
    const saved = existingMilestones.map(m => m.milestone_name).filter(Boolean)
    if (saved.some(m => !mapMs.includes(m))) setUseRandomMA(true)
  }, [existingMilestones, existingGame, isEdit])

  useEffect(() => {
    if (!isEdit || !existingAwards || existingAwards.length === 0) return
    setAwards(Array(6).fill('').map((_, i) => existingAwards[i]?.award_name ?? ''))
    setAwardFunders(Array(6).fill('').map((_, i) => existingAwards[i]?.funder_name ?? ''))
    setAwardFundOrders(Array(6).fill('').map((_, i) => existingAwards[i]?.funded_order?.toString() ?? ''))
    setAwardWinners(Array(6).fill('').map((_, i) => existingAwards[i]?.winner_name ?? ''))
    setAwardWinners2(Array(6).fill('').map((_, i) => existingAwards[i]?.winner_name_2 ?? ''))
    setAwardWinnerTied(Array(6).fill(false).map((_, i) => !!(existingAwards[i]?.winner_name_2)))
    setAwardSecond(Array(6).fill('').map((_, i) => existingAwards[i]?.second_name ?? ''))
    setAwardSecond2(Array(6).fill('').map((_, i) => existingAwards[i]?.second_name_2 ?? ''))
    setAwardSecondTied(Array(6).fill(false).map((_, i) => !!(existingAwards[i]?.second_name_2)))
    setAwardExpanded(Array(6).fill(false).map((_, i) =>
      !!(existingAwards[i]?.funder_name || existingAwards[i]?.winner_name)
    ))
  }, [existingAwards, isEdit])

  // ── Pre-populate form when editing ───────────────────────────────────────────

  useEffect(() => {
    if (!existingGame || !isEdit) return
    const sorted = [...existingGame.player_results].sort((a, b) => a.position - b.position)

    reset({
      date: existingGame.date,
      generations: existingGame.generations,
      map_name: existingGame.map_name ?? '',
      format: (existingGame.format === 'Digital' ? 'Digital' : 'Physical') as 'Physical' | 'Digital',
      notes: existingGame.notes ?? '',
      players: sorted.map(r => {
        const parts = r.corporation.split(', ')
        const params = existingGame.parameter_contributions.find(p => p.player_name === r.player_name)
        return {
          player_name: r.player_name,
          corporation: parts[0],
          tr: r.tr,
          milestone_vp: r.milestone_vp,
          award_vp: r.award_vp,
          greenery_vp: r.greenery_vp,
          city_vp: r.city_vp,
          card_vp: r.card_vp,
          habitat_vp: r.habitat_vp,
          logistics_vp: r.logistics_vp,
          mining_vp: r.mining_vp,
          plantery_vp: r.plantery_vp,
          mc: r.mc,
          total_vp: r.total_vp,
          position: r.position,
          key_notes: r.key_notes ?? '',
          oxygen_steps: params?.oxygen_steps ?? 0,
          temperature_steps: params?.temperature_steps ?? 0,
          ocean_steps: params?.ocean_steps ?? 0,
          venus_steps: params?.venus_steps ?? 0,
          habitat_steps: (params as any)?.habitat_steps ?? 0,
          mining_steps: (params as any)?.mining_steps ?? 0,
          logistics_steps: (params as any)?.logistics_steps ?? 0,
        }
      }),
    })

    setMergerCounts(sorted.map(r => r.corporation.split(', ').length))
    setExtraCorp2(sorted.map(r => r.corporation.split(', ')[1] ?? ''))
    setExtraCorp3(sorted.map(r => r.corporation.split(', ')[2] ?? ''))
    setCeos(sorted.map(r => r.ceo ?? ''))
    setExpansions(existingGame.expansions)
    setColonies(existingGame.colonies)
    setHasParams(existingGame.parameter_contributions.length > 0)
    const savedOrder = existingGame.turn_order ?? []
    setStartOrders(sorted.map(r => {
      const idx = savedOrder.indexOf(r.player_name)
      return idx >= 0 ? idx + 1 : 0
    }))
  }, [existingGame, isEdit, reset])

  const { fields, append, remove } = useFieldArray({ control, name: 'players' })

  // ── Helper array sync ────────────────────────────────────────────────────────

  function addHelperRows(count: number) {
    setMergerCounts(prev => [...prev, ...Array(count).fill(1)])
    setExtraCorp2(prev => [...prev, ...Array(count).fill('')])
    setExtraCorp3(prev => [...prev, ...Array(count).fill('')])
    setStartOrders(prev => [...prev, ...Array(count).fill(0)])
  }

  function removeHelperRows(indices: number[]) {
    const set = new Set(indices)
    setMergerCounts(prev => prev.filter((_, i) => !set.has(i)))
    setExtraCorp2(prev => prev.filter((_, i) => !set.has(i)))
    setExtraCorp3(prev => prev.filter((_, i) => !set.has(i)))
    setStartOrders(prev => prev.filter((_, i) => !set.has(i)))
  }

  // ── Player count selector ────────────────────────────────────────────────────

  function setPlayerCount(target: number) {
    const current = fields.length
    if (target > current) {
      const toAdd = Array.from({ length: target - current }, (_, i) => ({
        ...DEFAULT_PLAYER, position: current + i + 1,
      }))
      toAdd.forEach(p => append(p, { shouldFocus: false }))
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
    if (name === 'Venus Next') {
      if (!removing) {
        setMilestones(prev => { const n = [...prev]; if (!n[5]) n[5] = 'Hoverlord'; return n })
        setAwards(prev => { const n = [...prev]; if (!n[5]) n[5] = 'Venuphile'; return n })
      } else {
        setMilestones(prev => { const n = [...prev]; if (n[5] === 'Hoverlord') n[5] = ''; return n })
        setAwards(prev => { const n = [...prev]; if (n[5] === 'Venuphile') n[5] = ''; return n })
      }
    }
  }

  function toggleColony(name: string) {
    setColonies(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name])
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function onSubmit(data: GameFormValues) {
    // Validate milestones & awards against allowed lists
    const validMs = (!useRandomMA && MAP_MILESTONES[data.map_name])
      ? [...MAP_MILESTONES[data.map_name], ...(hasVenusNext ? ['Hoverlord'] : [])]
      : RANDOM_MILESTONES
    const validAs = (!useRandomMA && MAP_AWARDS[data.map_name])
      ? [...MAP_AWARDS[data.map_name], ...(hasVenusNext ? ['Venuphile'] : [])]
      : RANDOM_AWARDS
    const invalidMs = milestones.slice(0, maSlots).filter(m => m && !validMs.includes(m))
    const invalidAs = awards.slice(0, maSlots).filter(a => a && !validAs.includes(a))
    if (invalidMs.length > 0 || invalidAs.length > 0) {
      const parts = [
        ...invalidMs.map(m => `"${m}" is not a valid milestone`),
        ...invalidAs.map(a => `"${a}" is not a valid award`),
      ]
      setSaveError(`Invalid values: ${parts.join(', ')}. Select from the dropdown list only.`)
      return
    }

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

      const sessionPayload = {
        date: data.date,
        player_count: data.players.length,
        generations: data.generations || null,
        map_name: data.map_name || null,
        format: data.format,
        notes: data.notes || null,
        turn_order: (() => {
          const ordered = playersWithCorps
            .map((p, i) => ({ name: p.player_name, order: startOrders[i] ?? 0 }))
            .filter(x => x.order > 0)
            .sort((a, b) => a.order - b.order)
            .map(x => x.name)
          return ordered.length > 0 ? ordered : null
        })(),
      }

      let gameId: string

      if (isEdit && editId) {
        // ── Edit mode: update session, replace children ──────────────────────
        const { error: sessionError } = await supabase
          .from('game_sessions').update(sessionPayload).eq('id', editId)
        if (sessionError) throw sessionError
        gameId = editId

        // Delete and re-insert all related rows
        await supabase.from('parameter_contributions').delete().eq('game_id', gameId)
        await supabase.from('game_colonies').delete().eq('game_id', gameId)
        await supabase.from('game_expansions').delete().eq('game_id', gameId)
        await supabase.from('player_results').delete().eq('game_id', gameId)
      } else {
        // ── Add mode: insert new session ─────────────────────────────────────
        const { data: session, error: sessionError } = await supabase
          .from('game_sessions').insert(sessionPayload).select('id').single()
        if (sessionError) throw sessionError
        gameId = session.id
      }

      const { error: resultsError } = await supabase
        .from('player_results')
        .insert(playersWithCorps.map((p, i) => ({
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
          plantery_vp: hasPathfinders ? p.plantery_vp : null,
          mc: p.mc ?? null,
          total_vp: p.total_vp,
          position: p.position,
          key_notes: p.key_notes || null,
          ceo: hasCEO ? (ceos[i] || null) : null,
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
            ...(hasMoon ? {
              habitat_steps: p.habitat_steps ?? 0,
              mining_steps: p.mining_steps ?? 0,
              logistics_steps: p.logistics_steps ?? 0,
            } : {}),
          }))
          .filter(p => p.oxygen_steps > 0 || p.temperature_steps > 0 || p.ocean_steps > 0 || p.venus_steps > 0 || (p as any).habitat_steps > 0 || (p as any).mining_steps > 0 || (p as any).logistics_steps > 0)
        if (params.length > 0) {
          const { error } = await supabase.from('parameter_contributions').insert(params)
          if (error) throw error
        }
      }

      // Save milestones & awards (null player_name = game config, not log-imported)
      await supabase.from('game_milestones').delete().eq('game_id', gameId).is('player_name', null)
      await supabase.from('game_awards').delete().eq('game_id', gameId)

      const msToSave = milestones.slice(0, maSlots).filter(m => m.trim())
      const awardEntries = awards.slice(0, maSlots)
        .map((a, i) => ({
          award_name: a.trim(),
          funded_order: awardFundOrders[i] ? parseInt(awardFundOrders[i]) : null,
          funder_name: awardFunders[i]?.trim() || null,
          winner_name: awardWinners[i]?.trim() || null,
          winner_name_2: awardWinners2[i]?.trim() || null,
          second_name: awardSecond[i]?.trim() || null,
          second_name_2: awardSecond2[i]?.trim() || null,
        }))
        .filter(e => e.award_name)

      if (msToSave.length > 0) {
        const { error } = await supabase.from('game_milestones').insert(
          msToSave.map(m => ({ game_id: gameId, milestone_name: m, player_name: null }))
        )
        if (error) throw error
      }
      if (awardEntries.length > 0) {
        const { error } = await supabase.from('game_awards').insert(
          awardEntries.map(e => ({
            game_id: gameId,
            award_name: e.award_name,
            funded_order: e.funded_order,
            player_name: e.funder_name,
            winner_name: e.winner_name,
            winner_name_2: e.winner_name_2,
            second_name: e.second_name,
            second_name_2: e.second_name_2,
          }))
        )
        if (error) throw error
      }

      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ['games', editId] })
        queryClient.invalidateQueries({ queryKey: ['games'] })
        queryClient.invalidateQueries({ queryKey: ['player-stats'] })
        queryClient.invalidateQueries({ queryKey: ['corp-stats'] })
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
        <Link
          to={isEdit ? `/games/${editId}` : '/admin'}
          style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#625c7c', textDecoration: 'none' }}
        >
          {isEdit ? `← Game` : '← Admin'}
        </Link>
      </div>
      <PageHeader title={isEdit ? 'Edit game session' : 'Log game session'} />

      <form onSubmit={handleSubmit(onSubmit, (errs) => {
        const players = (errs.players as any) ?? []
        players.forEach((p: any, i: number) => {
          if (!p) return
          Object.entries(p).forEach(([field, err]: any) => {
            console.error(`Player ${i} → ${field}: ${err?.message} (value: ${err?.ref?.value})`)
          })
        })
      })}>

        {/* ── SESSION ──────────────────────────────────────────────────────── */}
        <div style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', padding: '24px', marginBottom: '24px' }}>
          <div style={sectionLabel}>Session</div>

          {/* Date / Map / Generations / Format */}
          <div className="addgame-session-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle}>Date *</label>
              <input type="date" {...register('date')} style={{ ...inputStyle, width: '100%' }} />
              {errors.date && <span style={errStyle}>{errors.date.message}</span>}
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle}>Map</label>
              <select {...register('map_name')} style={inputStyle}>
                <option value="">Select map…</option>
                {MAPS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle}>Generations</label>
              <select {...register('generations')} style={inputStyle}>
                <option value="">—</option>
                {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle}>Format</label>
              <select {...register('format')} style={inputStyle}>
                <option value="Digital">Digital</option>
                <option value="Physical">Physical</option>
              </select>
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
                const icon = EXPANSION_ICONS[e]
                return (
                  <button
                    key={e}
                    type="button"
                    onClick={() => toggleExpansion(e)}
                    style={{
                      padding: '4px 10px',
                      background: on ? 'rgba(155, 80, 240, 0.12)' : 'transparent',
                      border: `1px solid ${on ? '#9b50f0' : '#3e325e'}`,
                      borderRadius: '12px',
                      color: on ? '#b87aff' : '#625c7c',
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      transition: 'all 0.12s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    {icon && <img src={icon} alt={e} style={{ width: '14px', height: '14px', objectFit: 'contain', opacity: on ? 1 : 0.5 }} />}
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
                {[...COLONY_TILES, ...(expansions.includes('Pathfinders') ? PATHFINDERS_COLONY_TILES : [])].map(c => {
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
          <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', flexWrap: 'wrap' }}>
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

        {/* ── MILESTONES & AWARDS ──────────────────────────────────────────── */}
        <div style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={sectionLabel}>Milestones &amp; Awards{hasVenusNext ? ' · Venus Next adds 6th slot' : ''}</div>
            {MAP_MILESTONES[watchedMap] && (
              <button
                type="button"
                onClick={() => {
                  const next = !useRandomMA
                  setUseRandomMA(next)
                  if (!next) populateFromMap(watchedMap)
                }}
                style={{
                  padding: '3px 10px', borderRadius: '4px', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 600,
                  background: useRandomMA ? 'rgba(91,141,217,0.15)' : 'transparent',
                  border: `1px solid ${useRandomMA ? '#5b8dd9' : '#3e325e'}`,
                  color: useRandomMA ? '#5b8dd9' : '#625c7c',
                  transition: 'all 0.12s',
                }}
              >
                {useRandomMA ? '✓ Random M&A' : 'Random M&A'}
              </button>
            )}
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: MAP_MILESTONES[watchedMap] && !useRandomMA ? '#2e8b8b' : '#504270', marginBottom: '14px' }}>
            {MAP_MILESTONES[watchedMap] && !useRandomMA
              ? `Pre-filled from ${watchedMap} — edit any field to override.`
              : watchedMap ? 'No preset for this map — search below.' : 'Select a map above for auto-fill, or search manually.'
            }
          </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Milestones */}
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#625c7c', marginBottom: '10px' }}>
                  Milestones
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Array.from({ length: maSlots }).map((_, i) => (
                    <Combobox
                      key={i}
                      value={milestones[i] ?? ''}
                      onChange={v => setMilestones(prev => { const n = [...prev]; n[i] = v; return n })}
                      options={(!useRandomMA && MAP_MILESTONES[watchedMap]) ? [...MAP_MILESTONES[watchedMap], ...(hasVenusNext ? ['Hoverlord'] : [])] : RANDOM_MILESTONES}
                      placeholder={`Milestone ${i + 1}${i === 5 ? ' (Venus Next)' : ''}`}
                      strict
                    />
                  ))}
                </div>
              </div>
              {/* Awards */}
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#625c7c', marginBottom: '10px' }}>
                  Awards
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Array.from({ length: maSlots }).map((_, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <Combobox
                            value={awards[i] ?? ''}
                            onChange={v => setAwards(prev => { const n = [...prev]; n[i] = v; return n })}
                            options={(!useRandomMA && MAP_AWARDS[watchedMap]) ? [...MAP_AWARDS[watchedMap], ...(hasVenusNext ? ['Venuphile'] : [])] : RANDOM_AWARDS}
                            placeholder={`Award ${i + 1}${i === 5 ? ' (Venus Next)' : ''}`}
                            strict
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setAwardExpanded(prev => {
                            const n = [...prev]
                            const closing = n[i]
                            n[i] = !n[i]
                            if (closing) {
                              setAwardFunders(pf => { const nf = [...pf]; nf[i] = ''; return nf })
                              setAwardFundOrders(po => { const no = [...po]; no[i] = ''; return no })
                              setAwardWinners(pw => { const nw = [...pw]; nw[i] = ''; return nw })
                              setAwardWinners2(pw => { const nw = [...pw]; nw[i] = ''; return nw })
                              setAwardWinnerTied(pt => { const nt = [...pt]; nt[i] = false; return nt })
                              setAwardSecond(ps => { const ns = [...ps]; ns[i] = ''; return ns })
                              setAwardSecond2(ps => { const ns = [...ps]; ns[i] = ''; return ns })
                              setAwardSecondTied(pt => { const nt = [...pt]; nt[i] = false; return nt })
                            }
                            return n
                          })}
                          style={{
                            width: '28px', height: '34px', flexShrink: 0,
                            background: awardExpanded[i] ? 'rgba(201,160,48,0.1)' : 'transparent',
                            border: `1px solid ${awardExpanded[i] ? 'rgba(201,160,48,0.35)' : '#3e325e'}`,
                            borderRadius: '4px',
                            color: awardExpanded[i] ? '#c9a030' : '#625c7c',
                            fontFamily: 'var(--font-mono)', fontSize: '1rem', lineHeight: 1,
                            cursor: 'pointer',
                          }}
                        >
                          {awardExpanded[i] ? '−' : '+'}
                        </button>
                      </div>
                      {awardExpanded[i] && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', paddingLeft: '2px' }}>
                          {/* Row 1: Fund order + Funded by */}
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                            <div style={{ flexShrink: 0 }}>
                              <label style={{ ...labelStyle, color: '#8e87a8' }}>Order</label>
                              <select
                                value={awardFundOrders[i] ?? ''}
                                onChange={e => setAwardFundOrders(prev => { const n = [...prev]; n[i] = e.target.value; return n })}
                                style={{ width: '52px', height: '34px', background: '#110d1e', border: '1px solid #3e325e', borderRadius: '4px', color: '#ece6ff', fontFamily: 'var(--font-body)', fontSize: '0.82rem', padding: '0 6px' }}
                              >
                                <option value="">—</option>
                                <option value="1">#1</option>
                                <option value="2">#2</option>
                                <option value="3">#3</option>
                              </select>
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ ...labelStyle, color: '#8e87a8' }}>Funded by</label>
                              <Combobox
                                value={awardFunders[i] ?? ''}
                                onChange={v => setAwardFunders(prev => { const n = [...prev]; n[i] = v; return n })}
                                options={existingPlayers}
                                placeholder="Who funded…"
                              />
                            </div>
                          </div>
                          {/* Row 2: Winner + Tied toggle */}
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ ...labelStyle, color: '#c9a030' }}>Winner</label>
                              <Combobox
                                value={awardWinners[i] ?? ''}
                                onChange={v => setAwardWinners(prev => { const n = [...prev]; n[i] = v; return n })}
                                options={existingPlayers}
                                placeholder="Who won…"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setAwardWinnerTied(prev => {
                                const n = [...prev]; n[i] = !n[i]
                                if (!n[i]) setAwardWinners2(pw => { const nw = [...pw]; nw[i] = ''; return nw })
                                return n
                              })}
                              style={{ height: '34px', padding: '0 10px', flexShrink: 0, background: awardWinnerTied[i] ? 'rgba(201,160,48,0.12)' : 'transparent', border: `1px solid ${awardWinnerTied[i] ? 'rgba(201,160,48,0.5)' : '#3e325e'}`, borderRadius: '4px', color: awardWinnerTied[i] ? '#c9a030' : '#625c7c', fontFamily: 'var(--font-body)', fontSize: '0.68rem', letterSpacing: '0.05em', cursor: 'pointer' }}
                            >
                              Tied
                            </button>
                            {awardWinnerTied[i] && (
                              <div style={{ flex: 1 }}>
                                <label style={{ ...labelStyle, color: '#c9a030' }}>Also won</label>
                                <Combobox
                                  value={awardWinners2[i] ?? ''}
                                  onChange={v => setAwardWinners2(prev => { const n = [...prev]; n[i] = v; return n })}
                                  options={existingPlayers}
                                  placeholder="Tied winner…"
                                />
                              </div>
                            )}
                          </div>
                          {/* Row 3: Second place + Tied toggle (hidden in 2-player games) */}
                          {fields.length > 2 && <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ ...labelStyle, color: '#625c7c' }}>2nd place</label>
                              <Combobox
                                value={awardSecond[i] ?? ''}
                                onChange={v => setAwardSecond(prev => { const n = [...prev]; n[i] = v; return n })}
                                options={existingPlayers}
                                placeholder="Second place…"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setAwardSecondTied(prev => {
                                const n = [...prev]; n[i] = !n[i]
                                if (!n[i]) setAwardSecond2(ps => { const ns = [...ps]; ns[i] = ''; return ns })
                                return n
                              })}
                              style={{ height: '34px', padding: '0 10px', flexShrink: 0, background: awardSecondTied[i] ? 'rgba(201,160,48,0.12)' : 'transparent', border: `1px solid ${awardSecondTied[i] ? 'rgba(201,160,48,0.5)' : '#3e325e'}`, borderRadius: '4px', color: awardSecondTied[i] ? '#c9a030' : '#625c7c', fontFamily: 'var(--font-body)', fontSize: '0.68rem', letterSpacing: '0.05em', cursor: 'pointer' }}
                            >
                              Tied
                            </button>
                            {awardSecondTied[i] && (
                              <div style={{ flex: 1 }}>
                                <label style={{ ...labelStyle, color: '#625c7c' }}>Also 2nd</label>
                                <Combobox
                                  value={awardSecond2[i] ?? ''}
                                  onChange={v => setAwardSecond2(prev => { const n = [...prev]; n[i] = v; return n })}
                                  options={existingPlayers}
                                  placeholder="Tied 2nd…"
                                />
                              </div>
                            )}
                          </div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
        </div>

        {/* ── PLAYER RESULTS ───────────────────────────────────────────────── */}
        <div style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', padding: '24px', marginBottom: '24px' }}>
          <div style={sectionLabel}>Player results</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {fields.map((field, index) => (
              <div key={field.id} style={{ border: '1px solid #322850', borderRadius: '5px', padding: '16px' }}>

                {/* Row 1: Player + Start + Corporation(s) */}
                <div className="addgame-player-row1" style={{ display: 'flex', gap: '10px', marginBottom: '12px', alignItems: 'flex-end' }}>

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

                  {/* Start order */}
                  <div style={{ flex: '0 0 68px' }}>
                    <label style={labelStyle}>Start</label>
                    <select
                      value={startOrders[index] ?? 0}
                      onChange={e => setStartOrders(prev => { const n = [...prev]; n[index] = Number(e.target.value); return n })}
                      style={{ ...inputStyle, height: '34px', width: '68px' }}
                    >
                      <option value={0}>—</option>
                      {Array.from({ length: fields.length }).map((_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                  </div>

                  {/* Corporation combobox(es) + Merger controls */}
                  <div className="addgame-corp-row" style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'flex-end', minWidth: 0 }}>
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

                {/* CEO field — only when CEO expansion is active */}
                {hasCEO && (
                  <div style={{ marginBottom: '12px', maxWidth: '220px' }}>
                    <label style={{ ...labelStyle, color: '#d07832' }}>CEO</label>
                    <Combobox
                      value={ceos[index] ?? ''}
                      onChange={v => setCeos(prev => { const n = [...prev]; n[index] = v; return n })}
                      options={ceoOptions}
                      placeholder="Select CEO…"
                      strict
                    />
                  </div>
                )}

                {/* Row 2: Score fields + Place */}
                <div className="addgame-score-row" style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'flex-end' }}>
                  {SCORE_FIELDS.map(f => (
                    <div key={f.key} style={{ flex: '1 1 0', minWidth: '48px' }}>
                      <label style={labelStyle}>{f.label}</label>
                      <input
                        type="number"
                        step="1"
                        min={f.min}
                        {...register(`players.${index}.${f.key}`)}
                        style={inputStyle}
                      />
                    </div>
                  ))}
                  <div style={{ flex: '0 0 72px' }}>
                    <label style={labelStyle}>Place</label>
                    <select {...register(`players.${index}.position`)} style={inputStyle}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 3: Strategy notes + Moon VP */}
                <div className="addgame-notes-row" style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: hasParams ? '12px' : 0 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Strategy notes</label>
                    <input
                      {...register(`players.${index}.key_notes`)}
                      placeholder="e.g. Jovian engine, plant strategy…"
                      style={inputStyle}
                    />
                  </div>
                  {hasMoon && (
                    <div className="addgame-moon-row" style={{ display: 'contents' }}>
                      {(['habitat_vp', 'logistics_vp', 'mining_vp'] as const).map(f => (
                        <div key={f} style={{ flex: '0 0 75px' }}>
                          <label style={labelStyle}>
                            {f === 'habitat_vp' ? 'Habitat' : f === 'logistics_vp' ? 'Logistics' : 'Mining'}
                          </label>
                          <input type="number" min={0} step="1" {...register(`players.${index}.${f}`)} style={inputStyle} />
                        </div>
                      ))}
                    </div>
                  )}
                  {hasPathfinders && (
                    <div style={{ flex: '0 0 75px' }}>
                      <label style={labelStyle}>P-Track</label>
                      <input type="number" min={0} step="1" {...register(`players.${index}.plantery_vp`)} style={inputStyle} />
                    </div>
                  )}
                </div>

                {/* Row 4: Parameter contributions */}
                {hasParams && (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', paddingTop: '12px', borderTop: '1px solid #322850', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.67rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#504270', alignSelf: 'center', whiteSpace: 'nowrap', minWidth: '58px' }}>
                      Steps raised
                    </span>
                    {PARAM_FIELDS.map(f => (
                      <div key={f.key} style={{ flex: '0 0 80px' }}>
                        <label style={{ ...labelStyle, color: f.color }}>{f.label}</label>
                        <input type="number" min={0} {...register(`players.${index}.${f.key}`)} style={inputStyle} />
                      </div>
                    ))}
                    {hasMoon && ([
                      { key: 'habitat_steps',  label: 'Habitat',   color: '#2e8b8b' },
                      { key: 'mining_steps',   label: 'Mining',    color: '#a0724a' },
                      { key: 'logistics_steps',label: 'Logistics', color: '#8e87a8' },
                    ] as const).map(f => (
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
            {saved ? '✓ Saved' : saving ? 'Saving…' : isEdit ? 'Update game' : 'Save game'}
          </button>
          <Link
            to={isEdit ? `/games/${editId}` : '/admin'}
            style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: '#625c7c', textDecoration: 'none' }}
          >
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
  padding: '6px 16px', background: 'rgba(224, 85, 53, 0.08)',
  border: '1px solid rgba(224, 85, 53, 0.4)', borderRadius: '4px',
  color: '#e05535', fontFamily: 'var(--font-body)',
  fontSize: '0.72rem', cursor: 'pointer',
}
