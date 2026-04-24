import { parseTags } from './tagUtils'
import { EXPANSION_ICONS, TAG_ICONS } from '../../lib/expansions'
import type { CardReference } from '../../types/database'

const TYPE_COLORS: Record<string, { bg: string; color: string; light: string; dark: string }> = {
  Automated:   { bg: 'rgba(74,158,107,0.1)',  color: '#4a9e6b', light: '#76bf90', dark: '#2a7048' },
  Active:      { bg: 'rgba(91,141,217,0.1)',  color: '#5b8dd9', light: '#80aff5', dark: '#3568b5' },
  Event:       { bg: 'rgba(224,85,53,0.1)',   color: '#e05535', light: '#ff7755', dark: '#b83018' },
  Corporation: { bg: 'rgba(201,160,48,0.1)',  color: '#c9a030', light: '#e8c050', dark: '#9a7818' },
  Prelude:     { bg: 'rgba(220,100,150,0.1)', color: '#d46496', light: '#f084b8', dark: '#a84070' },
  CEO:         { bg: 'rgba(210,120,50,0.1)',  color: '#d07832', light: '#f09852', dark: '#a85820' },
  'Global Event': { bg: 'rgba(160,110,190,0.1)', color: '#a870c8', light: '#c898e0', dark: '#76508f' },
}

type TextZone = { top: number; left: number; right: number; bottom: number; fontSize: string; lineHeight: number }
type TextZoneWithVp = { top: number; left: number; rightWithVp: number; rightWithoutVp: number; bottom: number; fontSize: string; lineHeight: number }

type ImageCardLayout = {
  cost: { top: number; left: number; width: number; height: number }
  tag: { top: number; right: number; maxWidth: number; justifyContent: 'flex-start' | 'flex-end' }
  title: { top: number; left: number; right: number; height: number; fontSize: string; letterSpacing: string }
  text: TextZoneWithVp
  effectText: TextZone | null
  actionText: TextZoneWithVp | null
  vp: { top: number; left: number; size: number }
}

type ImageCardFrame = {
  name: string
  template: string
  cardWidth: number
  cardHeight: number
  baseLayout: ImageCardLayout
  getTagSize: (tagCount: number) => number
  applyLayoutRules: (layout: ImageCardLayout, card: CardReference, tagCount: number) => void
}

type CardTextSection = {
  label?: 'Effect' | 'Action'
  text: string
  flavour?: boolean
}

function parseResources(resources: string | null): { count: number; name: string }[] {
  if (!resources) return []
  return resources.split(',').flatMap(s => {
    const match = s.trim().match(/^(\d+):(\S+)$/)
    if (!match) return []
    return [{ count: parseInt(match[1]), name: match[2] }]
  })
}

function ResourceIconRow({ resources, size = 18 }: { resources: string | null; size?: number }) {
  const items = parseResources(resources)
  if (items.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: size * 0.78, color: '#1a1a1a', lineHeight: 1 }}>
            {item.count}
          </span>
          <img
            src={`/tm-scoring-statistics/resources/${item.name}.png`}
            alt={item.name}
            title={item.name}
            style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
          />
        </div>
      ))}
    </div>
  )
}

const LONG_TITLE_LENGTH = 'ADVANCED POWER GRID'.length
const VERY_LONG_TITLE_LENGTH = 'BEAM FROM A THORIUM ASTEROID'.length
const EXTRA_LONG_TITLE_LENGTH = 'GREAT ESCARPMENT CONSORTIUM'.length

function extractCardTextSection(text: string, label: 'Effect' | 'Action' | 'Flavour') {
  const pattern = new RegExp(`(?:^|\\n)${label}:\\s*([\\s\\S]*?)(?=\\n(?:Effect|Action|Flavour):|$)`, 'i')
  return text.match(pattern)?.[1]?.trim() ?? ''
}

function getCardTextSections(card: CardReference): CardTextSection[] {
  const storedText = card.card_text ?? ''

  if (card.card_type === 'Active') {
    // If at least one new column is set, the card has been migrated — use columns directly.
    // This prevents card_text fallback from bleeding into zones that were intentionally left empty.
    if (card.effect_text !== null || card.action_text !== null) {
      return [
        card.effect_text && { label: 'Effect' as const, text: card.effect_text },
        card.action_text && { label: 'Action' as const, text: card.action_text },
        card.flavour_text && { text: card.flavour_text, flavour: true },
      ].filter(Boolean) as CardTextSection[]
    }

    // Legacy: card_text has not been split yet — parse it.
    const fallbackEffect = extractCardTextSection(storedText, 'Effect')
    const fallbackAction = extractCardTextSection(storedText, 'Action')
    const fallbackFlavour = extractCardTextSection(storedText, 'Flavour')
    const hasFallbackSections = fallbackEffect || fallbackAction || fallbackFlavour
    const effectText = hasFallbackSections ? fallbackEffect : storedText
    return [
      effectText && { label: 'Effect' as const, text: effectText },
      fallbackAction && { label: 'Action' as const, text: fallbackAction },
      fallbackFlavour && { text: fallbackFlavour, flavour: true },
    ].filter(Boolean) as CardTextSection[]
  }

  const fallbackFlavour = extractCardTextSection(storedText, 'Flavour')
  const textWithoutFlavour = fallbackFlavour
    ? storedText.replace(/\n?Flavour:\s*[\s\S]*$/i, '').trim()
    : storedText
  const mainText = textWithoutFlavour
  const flavourText = card.flavour_text ?? fallbackFlavour

  return [
    mainText && { text: mainText },
    flavourText && { text: flavourText, flavour: true },
  ].filter(Boolean) as CardTextSection[]
}


const TAG_SIZE = 24

function getGreenCardTagSize(_tagCount: number) { return TAG_SIZE }
function getBlueCardTagSize(_tagCount: number) { return TAG_SIZE }

function applyGreenCardLayoutRules(layout: ImageCardLayout, card: CardReference, tagCount: number) {
  const textLength = card.card_text?.length ?? 0

  if (tagCount === 2) {
    layout.tag = { ...layout.tag, maxWidth: 58 }
    layout.title = { ...layout.title, right: layout.title.right + 8 }
  } else if (tagCount === 3) {
    layout.tag = {
      ...layout.tag,
      top: layout.tag.top + 1,
      right: layout.tag.right + 2,
      maxWidth: 80,
      justifyContent: 'flex-start',
    }
    layout.title = { ...layout.title, left: layout.title.left, right: layout.title.right, fontSize: '0.72rem', letterSpacing: '0.02em' }
  } else if (tagCount >= 4) {
    layout.tag = { ...layout.tag, maxWidth: tagCount * (TAG_SIZE + 2) }
  }

  if (card.card_name.length >= EXTRA_LONG_TITLE_LENGTH) {
    layout.title = { ...layout.title, fontSize: '0.5rem', letterSpacing: '0' }
  } else if (card.card_name.length >= VERY_LONG_TITLE_LENGTH) {
    layout.title = { ...layout.title, fontSize: '0.54rem', letterSpacing: '0' }
  } else if (card.card_name.length >= 22) {
    layout.title = { ...layout.title, fontSize: '0.64rem', letterSpacing: '0' }
  } else if (card.card_name.length >= LONG_TITLE_LENGTH) {
    layout.title = { ...layout.title, fontSize: '0.72rem', letterSpacing: '0.01em' }
  } else if (card.card_name.length > 16) {
    layout.title = { ...layout.title, fontSize: '0.74rem', letterSpacing: '0.02em' }
  }

  if (textLength > 170) {
    layout.text = { ...layout.text, top: layout.text.top - 5, bottom: layout.text.bottom - 10, fontSize: '0.46rem', lineHeight: 1.14 }
  } else if (textLength > 110) {
    layout.text = { ...layout.text, top: layout.text.top - 3, bottom: layout.text.bottom - 6, fontSize: '0.5rem', lineHeight: 1.2 }
  }
}

function applyBlueCardLayoutRules(layout: ImageCardLayout, card: CardReference, tagCount: number) {
  if (tagCount === 2) {
    layout.tag = { ...layout.tag, maxWidth: 58 }
    layout.title = { ...layout.title, right: layout.title.right + 8 }
  } else if (tagCount === 3) {
    layout.tag = {
      ...layout.tag,
      top: layout.tag.top + 1,
      right: layout.tag.right + 2,
      maxWidth: 80,
      justifyContent: 'flex-start',
    }
    layout.title = { ...layout.title, left: layout.title.left, right: layout.title.right, fontSize: '0.72rem', letterSpacing: '0.02em' }
  } else if (tagCount >= 4) {
    layout.tag = { ...layout.tag, maxWidth: tagCount * (TAG_SIZE + 2) }
  }

  if (card.card_name.length >= EXTRA_LONG_TITLE_LENGTH) {
    layout.title = { ...layout.title, fontSize: '0.5rem', letterSpacing: '0' }
  } else if (card.card_name.length >= VERY_LONG_TITLE_LENGTH) {
    layout.title = { ...layout.title, fontSize: '0.54rem', letterSpacing: '0' }
  } else if (card.card_name.length >= 22) {
    layout.title = { ...layout.title, fontSize: '0.64rem', letterSpacing: '0' }
  } else if (card.card_name.length >= LONG_TITLE_LENGTH) {
    layout.title = { ...layout.title, fontSize: '0.72rem', letterSpacing: '0.01em' }
  } else if (card.card_name.length > 16) {
    layout.title = { ...layout.title, fontSize: '0.74rem', letterSpacing: '0.02em' }
  }

  // Effect zone — smaller panel, shrinks sooner
  // For legacy cards where effect_text/action_text haven't been split yet, fall back to card_text length
  if (layout.effectText) {
    const isLegacy = card.effect_text === null && card.action_text === null
    const effectLength = isLegacy ? (card.card_text?.length ?? 0) : (card.effect_text?.length ?? 0)
    if (effectLength > 120) {
      layout.effectText = { ...layout.effectText, fontSize: '0.40rem', lineHeight: 1.14 }
    } else if (effectLength > 80) {
      layout.effectText = { ...layout.effectText, fontSize: '0.44rem', lineHeight: 1.2 }
    }
  }

  // Action zone — larger panel, more room before shrinking
  if (layout.actionText) {
    const actionLength = (card.action_text?.length ?? 0) + (card.action_text_2?.length ?? 0)
    if (actionLength > 160) {
      layout.actionText = { ...layout.actionText, fontSize: '0.40rem', lineHeight: 1.14 }
    } else if (actionLength > 110) {
      layout.actionText = { ...layout.actionText, fontSize: '0.44rem', lineHeight: 1.2 }
    }
  }
}

const GREEN_CARD_FRAME: ImageCardFrame = {
  name: 'Green Card Frame',
  template: '/tm-scoring-statistics/cards/automated-green-card.png',
  cardWidth: 240,
  cardHeight: 336,
  baseLayout: {
    cost: { top: 18, left: 17, width: 35, height: 35 },
    tag: { top: 23, right: 20, maxWidth: 40, justifyContent: 'flex-end' },
    title: { top: 47, left: 40, right: 33, height: 20, fontSize: '0.79rem', letterSpacing: '0.04em' },
    text: { top: 230, left: 33, rightWithVp: 61, rightWithoutVp: 18, bottom: 61, fontSize: '0.55rem', lineHeight: 1.28 },
    effectText: null,
    actionText: null,
    vp: { top: 259, left: 160, size: 52 },
  },
  getTagSize: getGreenCardTagSize,
  applyLayoutRules: applyGreenCardLayoutRules,
}

// Blue card zone map (blue_normal.png at 240×336):
//   Silver header bar  : y=7–44
//   Blue crystal band  : y=44–57
//   Effect panel       : y=57–111  ← effectText zone
//   Art area           : y=111–218
//   Blue pill divider  : y=218–239
//   Action panel       : y=239–306  ← actionText zone
//   Bottom border      : y=306–336
const BLUE_CARD_FRAME: ImageCardFrame = {
  name: 'Blue Card Frame',
  template: '/tm-scoring-statistics/cards/active-blue-card.png',
  cardWidth: 240,
  cardHeight: 336,
  baseLayout: {
    cost: { top: 19, left: 17, width: 35, height: 35 },
    tag: { top: 23, right: 21, maxWidth: 50, justifyContent: 'flex-end' },
    title: { top: 49, left: 40, right: 33, height: 20, fontSize: '0.79rem', letterSpacing: '0.04em' },
    text: { top: 90, left: 33, rightWithVp: 30, rightWithoutVp: 18, bottom: 61, fontSize: '0.48rem', lineHeight: 1.28 },
    effectText: { top: 140, left: 33, right: 18, bottom: 61, fontSize: '0.48rem', lineHeight: 1.28 },
    actionText: { top: 78, left: 33, rightWithVp: 50, rightWithoutVp: 14, bottom: 34, fontSize: '0.45rem', lineHeight: 1.28 },
    vp: { top: 259, left: 160, size: 52 },
  },
  getTagSize: getBlueCardTagSize,
  applyLayoutRules: applyBlueCardLayoutRules,
}

// Event card zone map (event-red-card.png at 240×336):
//   Silver header bar  : y=5–40
//   Fire/orange band   : y=40–100  ← title lives here
//   Black art area     : y=100–168
//   Orange separator   : y=168–192
//   Silver text panel  : y=192–305  ← card text lives here
function applyEventCardLayoutRules(layout: ImageCardLayout, card: CardReference, tagCount: number) {
  if (tagCount === 2) {
    layout.tag = { ...layout.tag, maxWidth: 58 }
    layout.title = { ...layout.title, right: layout.title.right + 8 }
  } else if (tagCount === 3) {
    layout.tag = {
      ...layout.tag,
      top: layout.tag.top + 1,
      right: layout.tag.right + 2,
      maxWidth: 80,
      justifyContent: 'flex-start',
    }
    layout.title = { ...layout.title, fontSize: '0.72rem', letterSpacing: '0.02em' }
  } else if (tagCount > 3) {
    layout.tag = { ...layout.tag, maxWidth: 66, top: layout.tag.top - 2 }
    layout.title = { ...layout.title, right: layout.title.right + 20, fontSize: '0.7rem', letterSpacing: '0.01em' }
  }

  if (card.card_name.length >= EXTRA_LONG_TITLE_LENGTH) {
    layout.title = { ...layout.title, fontSize: '0.5rem', letterSpacing: '0' }
  } else if (card.card_name.length >= VERY_LONG_TITLE_LENGTH) {
    layout.title = { ...layout.title, fontSize: '0.54rem', letterSpacing: '0' }
  } else if (card.card_name.length >= 22) {
    layout.title = { ...layout.title, fontSize: '0.64rem', letterSpacing: '0' }
  } else if (card.card_name.length >= LONG_TITLE_LENGTH) {
    layout.title = { ...layout.title, fontSize: '0.72rem', letterSpacing: '0.01em' }
  } else if (card.card_name.length > 16) {
    layout.title = { ...layout.title, fontSize: '0.74rem', letterSpacing: '0.02em' }
  }

  const textLength = card.card_text?.length ?? 0
  if (textLength > 200) {
    layout.text = { ...layout.text, fontSize: '0.46rem', lineHeight: 1.14 }
  } else if (textLength > 130) {
    layout.text = { ...layout.text, fontSize: '0.5rem', lineHeight: 1.2 }
  }
}

const EVENT_CARD_FRAME: ImageCardFrame = {
  name: 'Event Card Frame',
  template: '/tm-scoring-statistics/cards/event-red-card.png',
  cardWidth: 240,
  cardHeight: 336,
  baseLayout: {
    cost:  { top: 21, left: 18, width: 35, height: 35 },
    tag:   { top: 25, right: 20, maxWidth: 40, justifyContent: 'flex-end' },
    title: { top: 34, left: 2, right: 0, height: 55, fontSize: '0.79rem', letterSpacing: '0.04em' },
    text:  { top: 140, left: 29, rightWithVp: 61, rightWithoutVp: 14, bottom: 32, fontSize: '0.55rem', lineHeight: 1.28 },
    effectText: null,
    actionText: null,
    vp:    { top: 260, left: 160, size: 52 },
  },
  getTagSize: getGreenCardTagSize,
  applyLayoutRules: applyEventCardLayoutRules,
}

// CEO card zone map (ceo-orange-card.png at 240×336):
//   Same structure as Event, gold/amber accents
//   Silver header bar  : y=5–40
//   Gold/amber band    : y=40–100  ← title lives here
//   Black art area     : y=100–160
//   Gold pill divider  : y=160–183
//   Silver text panel  : y=183–305  ← card text lives here
const CEO_CARD_FRAME: ImageCardFrame = {
  name: 'CEO Card Frame',
  template: '/tm-scoring-statistics/cards/ceo-orange-card.png',
  cardWidth: 240,
  cardHeight: 336,
  baseLayout: {
    cost:  { top: 14, left: 10, width: 35, height: 35 },
    tag:   { top: 14, right: 12, maxWidth: 48, justifyContent: 'flex-end' },
    title: { top: 28, left: 20, right: 12, height: 55, fontSize: '0.79rem', letterSpacing: '0.04em' },
    text:  { top: 160, left: 30, rightWithVp: 50, rightWithoutVp: 25, bottom: 32, fontSize: '0.55rem', lineHeight: 1.28 },
    effectText: null,
    actionText: null,
    vp:    { top: 260, left: 160, size: 52 },
  },
  getTagSize: getGreenCardTagSize,
  applyLayoutRules: applyEventCardLayoutRules,
}

// Corporation card zone map (corporation-yellow-card.png at 336×240 landscape):
//   Mostly a large silver panel with gold accent tabs
//   Title area    : top of card spanning most of the width
//   Text panel    : bulk of the card body below title
function applyCorporationLayoutRules(layout: ImageCardLayout, card: CardReference, _tagCount: number) {
  if (card.card_name.length >= EXTRA_LONG_TITLE_LENGTH) {
    layout.title = { ...layout.title, fontSize: '0.6rem', letterSpacing: '0' }
  } else if (card.card_name.length >= VERY_LONG_TITLE_LENGTH) {
    layout.title = { ...layout.title, fontSize: '0.68rem', letterSpacing: '0' }
  } else if (card.card_name.length > 16) {
    layout.title = { ...layout.title, fontSize: '0.76rem', letterSpacing: '0.01em' }
  }
  const textLength = card.card_text?.length ?? 0
  if (textLength > 260) {
    layout.text = { ...layout.text, fontSize: '0.46rem', lineHeight: 1.14 }
  } else if (textLength > 170) {
    layout.text = { ...layout.text, fontSize: '0.5rem', lineHeight: 1.2 }
  }
}

const CORPORATION_CARD_FRAME: ImageCardFrame = {
  name: 'Corporation Card Frame',
  template: '/tm-scoring-statistics/cards/corporation-yellow-card.png',
  cardWidth: 336,
  cardHeight: 240,
  baseLayout: {
    cost:  { top: 14, left: 14, width: 30, height: 30 },
    tag:   { top: 28, right: 30, maxWidth: 80, justifyContent: 'flex-end' },
    title: { top: 55, left: 0, right: 0, height: 26, fontSize: '0.82rem', letterSpacing: '0.04em' },
    text:  { top: 100, left: 38, rightWithVp: 55, rightWithoutVp: 40, bottom: 28, fontSize: '0.55rem', lineHeight: 1.38 },
    effectText: null,
    actionText: null,
    vp:    { top: 172, left: 270, size: 46 },
  },
  getTagSize: getGreenCardTagSize,
  applyLayoutRules: applyCorporationLayoutRules,
}

// Prelude card zone map (prelude-pink-card.png at 336×240 landscape):
//   Pink band     : y=0–55   ← title lives here
//   Black art     : y=55–138
//   Pink pill     : y=138–158
//   Silver panel  : y=158–216  ← card text lives here
function applyPreludeLayoutRules(layout: ImageCardLayout, card: CardReference, tagCount: number) {
  applyCorporationLayoutRules(layout, card, 0)
  if (tagCount === 3) {
    layout.tag = { ...layout.tag, right: layout.tag.right + 3, maxWidth: 80, justifyContent: 'flex-start' }
  } else if (tagCount >= 4) {
    layout.tag = { ...layout.tag, maxWidth: tagCount * (TAG_SIZE + 2) }
  }
}

const PRELUDE_CARD_FRAME: ImageCardFrame = {
  name: 'Prelude Card Frame',
  template: '/tm-scoring-statistics/cards/prelude-pink-card.png',
  cardWidth: 336,
  cardHeight: 240,
  baseLayout: {
    cost:  { top: 12, left: 12, width: 30, height: 30 },
    tag:   { top: 22, right: 25, maxWidth: 56, justifyContent: 'flex-end' },
    title: { top: 36, left: 70, right: 60, height: 38, fontSize: '0.79rem', letterSpacing: '0.04em' },
    text:  { top: 135, left: 35, rightWithVp: 55, rightWithoutVp: 14, bottom: 22, fontSize: '0.55rem', lineHeight: 1.32 },
    effectText: null,
    actionText: null,
    vp:    { top: 168, left: 278, size: 44 },
  },
  getTagSize: getGreenCardTagSize,
  applyLayoutRules: applyPreludeLayoutRules,
}

const IMAGE_CARD_FRAMES: Partial<Record<CardReference['card_type'], ImageCardFrame>> = {
  Automated:   GREEN_CARD_FRAME,
  Active:      BLUE_CARD_FRAME,
  Event:       EVENT_CARD_FRAME,
  CEO:         CEO_CARD_FRAME,
  Corporation: CORPORATION_CARD_FRAME,
  Prelude:     PRELUDE_CARD_FRAME,
}

function cloneImageCardLayout(layout: ImageCardLayout): ImageCardLayout {
  return {
    cost: { ...layout.cost },
    tag: { ...layout.tag },
    title: { ...layout.title },
    text: { ...layout.text },
    effectText: layout.effectText ? { ...layout.effectText } : null,
    actionText: layout.actionText ? { ...layout.actionText } : null,
    vp: { ...layout.vp },
  }
}

function getImageCardFrame(card: CardReference): ImageCardFrame {
  return IMAGE_CARD_FRAMES[card.card_type] ?? GREEN_CARD_FRAME
}

function getImageCardLayout(card: CardReference, tagCount: number): ImageCardLayout {
  const frame = getImageCardFrame(card)
  const layout = cloneImageCardLayout(frame.baseLayout)

  frame.applyLayoutRules(layout, card, tagCount)

  return layout
}

interface CardFrameProps {
  card: CardReference
}

function CardTagIcon({ name, size }: { name: string; size: number }) {
  const icon = TAG_ICONS[name]

  if (icon) {
    return (
      <img
        src={icon}
        alt={name}
        title={name}
        style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
      />
    )
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: size,
      height: size,
      padding: '0 4px',
      borderRadius: size / 2,
      background: 'rgba(235,235,235,0.86)',
      border: '1px solid rgba(0,0,0,0.35)',
      color: '#1a1a1a',
      fontFamily: 'var(--font-body)',
      fontSize: '0.5rem',
      fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      {name}
    </span>
  )
}

// ─── Image-based card (Automated / Active) ───────────────────────────────────
// Zones measured against the 1703×2319 source image, expressed as percentages
// so they scale correctly at any display size.
//
//  Yellow badge  : top 2.4%  left 3.2%  w 12%   h 8.5%
//  Name bar      : top 2.5%  left 19%   right 4% h 6%
//  Tags          : top 2%    right 2%
//  Lower text    : top 57.5% left 6%    right 6% bottom 10%
//  VP badge      : bottom 10% right 4%  width 12%

// All positions are in px against a fixed 240×336 canvas.
// Using explicit px (not % of aspect-ratio container) to avoid Safari positioning bugs.
//
// Zone map (green_normal.png template at 240×336):
//   Silver header bar  : y=7–46
//   Top green band     : y=47–81   ← name lives here, centered
//   Art area (black)   : y=81–185
//   Bottom green band  : y=185–222
//   Lower silver panel : y=222–309  ← card text lives here
//   Bottom border      : y=309–336
//
//   Badge (yellow cost square) : IMAGE_CARD_LAYOUT.cost
//   Card name (green band)     : IMAGE_CARD_LAYOUT.title
//   Tags                       : IMAGE_CARD_LAYOUT.tag
//   Lower text panel           : IMAGE_CARD_LAYOUT.text
//   VP badge                   : IMAGE_CARD_LAYOUT.vp

function ImageCard({ card }: { card: CardReference }) {
  const tags = parseTags(card.tags ?? null)
  const frame = getImageCardFrame(card)
  const template = frame.template
  const layout = getImageCardLayout(card, tags.length)
  const tagSize = frame.getTagSize(tags.length)
  const vpImg = card.base_vp != null && card.base_vp >= 1 && card.base_vp <= 2
    ? `/tm-scoring-statistics/cards/VP${card.base_vp}.png`
    : null
  const sections = getCardTextSections(card)
  const effectSection = sections.find(s => s.label === 'Effect')
  const actionSection = sections.find(s => s.label === 'Action')

  const W = frame.cardWidth
  const H = frame.cardHeight

  return (
    <div style={{
      position: 'relative',
      width: `${W}px`,
      height: `${H}px`,
      marginBottom: '28px',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 8px 36px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.2)',
    }}>
      {/* Template image */}
      <img src={template} alt="" aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />

      {/* MC cost — yellow badge, top-left */}
      {card.mc_cost != null && (
        <div style={{
          position: 'absolute',
          top: layout.cost.top,
          left: layout.cost.left,
          width: layout.cost.width,
          height: layout.cost.height,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: card.mc_cost >= 10 ? '1.05rem' : '1.16rem',
          lineHeight: 1,
          letterSpacing: 0,
          color: '#1a1000',
        }}>
          {card.mc_cost}
        </div>
      )}

      {/* Tags — top-right (same row as badge) */}
      {tags.length > 0 && (
        <div style={{
          position: 'absolute',
          top: layout.tag.top,
          right: layout.tag.right,
          maxWidth: layout.tag.maxWidth,
          display: 'flex', gap: '2px', alignItems: 'center', justifyContent: layout.tag.justifyContent, flexWrap: 'wrap',
        }}>
          {tags.map((tag, i) => <CardTagIcon key={`${tag}-${i}`} name={tag} size={tagSize} />)}
        </div>
      )}

      {/* Card name — centered in green accent band */}
      <div style={{
        position: 'absolute',
        top: layout.title.top,
        left: layout.title.left,
        right: layout.title.right,
        height: layout.title.height,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: layout.title.fontSize,
        letterSpacing: layout.title.letterSpacing, textTransform: 'uppercase', color: '#151515',
        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        textAlign: 'center',
      }}>
        {card.card_name}
      </div>

      {/* Effect text — upper panel (Active cards only) */}
      {layout.effectText && (
        <div style={{
          position: 'absolute',
          top: layout.effectText.top,
          left: layout.effectText.left,
          right: layout.effectText.right,
          bottom: layout.effectText.bottom,
          fontFamily: 'var(--font-body)', fontSize: layout.effectText.fontSize,
          color: '#1a1a1a', lineHeight: layout.effectText.lineHeight,
          overflow: 'hidden', whiteSpace: 'pre-wrap',
        }}>
          {effectSection?.text ?? ''}
        </div>
      )}

      {/* Action text — lower panel (Active cards only), vertically centered */}
      {layout.actionText && (
        <div style={{
          position: 'absolute',
          top: layout.actionText.top,
          left: layout.actionText.left,
          width: W - layout.actionText.left - (card.base_vp != null ? layout.actionText.rightWithVp : layout.actionText.rightWithoutVp),
          height: H - layout.actionText.top - layout.actionText.bottom,
          fontFamily: 'var(--font-body)', fontSize: layout.actionText.fontSize,
          color: '#1a1a1a', lineHeight: layout.actionText.lineHeight,
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          textAlign: 'center',
        }}>
          {actionSection && <span style={{ whiteSpace: 'pre-wrap' }}>{actionSection.text}</span>}
          {actionSection && card.action_text_2 && <span style={{ fontWeight: 700, fontSize: '0.9em', margin: '3px 0' }}>OR</span>}
          {card.action_text_2 && <span style={{ whiteSpace: 'pre-wrap' }}>{card.action_text_2}</span>}
        </div>
      )}

      {/* Card text — single zone (Automated / non-Active cards) */}
      {!layout.effectText && (
        <div style={{
          position: 'absolute',
          top: layout.text.top,
          left: layout.text.left,
          right: card.base_vp != null ? layout.text.rightWithVp : layout.text.rightWithoutVp,
          bottom: layout.text.bottom,
          fontFamily: 'var(--font-body)', fontSize: layout.text.fontSize,
          color: '#1a1a1a', lineHeight: layout.text.lineHeight,
          overflow: 'hidden', whiteSpace: 'pre-wrap',
        }}>
          {(card.card_text || card.action_text) ? (
            <>
              {card.card_text && <span>{card.card_text}</span>}
              {card.action_text && (
                <span style={{ display: 'block', marginTop: card.card_text ? '6px' : 0 }}>
                  <span style={{ fontWeight: 700 }}>Action: </span>{card.action_text}
                </span>
              )}
              {card.action_text_2 && (
                <span style={{ display: 'block', marginTop: '3px' }}>
                  <span style={{ fontWeight: 700 }}>OR Action: </span>{card.action_text_2}
                </span>
              )}
            </>
          ) : (
            <span style={{ color: '#999', fontStyle: 'italic' }}>No card text recorded.</span>
          )}
        </div>
      )}

      {/* Resource icons — below card text, left-aligned */}
      {card.resources && (
        <div style={{
          position: 'absolute',
          top: H - layout.text.bottom + 4,
          left: layout.text.left,
          right: card.base_vp != null ? layout.vp.size + 8 : 14,
        }}>
          <ResourceIconRow resources={card.resources} size={16} />
        </div>
      )}

      {/* CEO expansion icon — bottom-left of the CEO card frame */}
      {card.card_type === 'CEO' && EXPANSION_ICONS['CEO'] && (
        <div style={{ position: 'absolute', top: 25, left: 24}}>
          <img src={EXPANSION_ICONS['CEO']} alt="CEO" title="CEO" style={{ width: 20, height: 20, objectFit: 'contain', opacity: 0.9 }} />
        </div>
      )}

      {/* VP badge — bottom-right, positioned with top/left (avoids Safari right/bottom % bugs) */}
      {card.base_vp != null && (
        <div style={{
          position: 'absolute',
          top: layout.vp.top,
          left: layout.vp.left,
          width: layout.vp.size,
          height: layout.vp.size,
        }}>
          {vpImg ? (
            <img src={vpImg} alt={`${card.base_vp} VP`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%, #e8b840, #b8860b)', border: '1px solid #c9a030', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.35rem', color: '#1a1428' }}>
              {card.base_vp}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Public component ────────────────────────────────────────────────────────

export default function CardFrame({ card }: CardFrameProps) {
  return <ImageCard card={card} />
}

export { TYPE_COLORS }
