import Tag from './Tag'
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
}

// Card types that have a real template image in /public/cards/
const TEMPLATE_IMAGES: Partial<Record<string, string>> = {
  Automated: '/tm-scoring-statistics/cards/green_normal.png',
  Active:    '/tm-scoring-statistics/cards/blue_normal.png',
}

type ImageCardLayout = {
  cost: { top: number; left: number; width: number; height: number }
  tag: { top: number; right: number; maxWidth: number; justifyContent: 'flex-start' | 'flex-end' }
  title: { top: number; left: number; right: number; height: number; fontSize: string; letterSpacing: string }
  text: { top: number; left: number; rightWithVp: number; rightWithoutVp: number; bottom: number; fontSize: string; lineHeight: number }
  vp: { top: number; left: number; size: number }
}

const LONG_TITLE_LENGTH = 'ADVANCED POWER GRID'.length
const VERY_LONG_TITLE_LENGTH = 'BEAM FROM A THORIUM ASTEROID'.length
const EXTRA_LONG_TITLE_LENGTH = 'GREAT ESCARPMENT CONSORTIUM'.length

const IMAGE_CARD_BASE_LAYOUTS: Record<string, ImageCardLayout> = {
  Automated: {
    cost: { top: 19, left: 17, width: 35, height: 35 },
    tag: { top: 24, right: 20, maxWidth: 50, justifyContent: 'flex-end' },
    title: { top: 49, left: 40, right: 33, height: 20, fontSize: '0.79rem', letterSpacing: '0.04em' },
    text: { top: 230, left: 33, rightWithVp: 61, rightWithoutVp: 18, bottom: 61, fontSize: '0.55rem', lineHeight: 1.28 },
    vp: { top: 259, left: 160, size: 52 },
  },
  Active: {
    cost: { top: 19, left: 17, width: 35, height: 35 },
    tag: { top: 24, right: 20, maxWidth: 50, justifyContent: 'flex-end' },
    title: { top: 49, left: 40, right: 33, height: 20, fontSize: '0.79rem', letterSpacing: '0.04em' },
    text: { top: 230, left: 33, rightWithVp: 61, rightWithoutVp: 18, bottom: 61, fontSize: '0.55rem', lineHeight: 1.28 },
    vp: { top: 259, left: 160, size: 52 },
  },
}

function getTagSize(tagCount: number) {
  if (tagCount <= 1) return 24
  if (tagCount === 2) return 25
  if (tagCount === 3) return 24
  return 16
}

function getImageCardLayout(card: CardReference, tagCount: number): ImageCardLayout {
  const base = IMAGE_CARD_BASE_LAYOUTS[card.card_type] ?? IMAGE_CARD_BASE_LAYOUTS.Automated
  const textLength = card.card_text?.length ?? 0
  const layout: ImageCardLayout = {
    cost: { ...base.cost },
    tag: { ...base.tag },
    title: { ...base.title },
    text: { ...base.text },
    vp: { ...base.vp },
  }

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
  } else if (tagCount > 3) {
    layout.tag = { ...layout.tag, maxWidth: 66, top: layout.tag.top - 2 }
    layout.title = { ...layout.title, right: layout.title.right + 20, fontSize: '0.7rem', letterSpacing: '0.01em' }
  }

  if (card.card_name.length >= EXTRA_LONG_TITLE_LENGTH) {
    layout.title = { ...layout.title, fontSize: '0.5rem', letterSpacing: '0' }
  } else if (card.card_name.length >= VERY_LONG_TITLE_LENGTH) {
    layout.title = { ...layout.title, fontSize: '0.54rem', letterSpacing: '0' }
  } else if (card.card_name.length > 22) {
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
  const template = TEMPLATE_IMAGES[card.card_type]!
  const layout = getImageCardLayout(card, tags.length)
  const tagSize = getTagSize(tags.length)
  const vpImg = card.base_vp != null && card.base_vp >= 1 && card.base_vp <= 2
    ? `/tm-scoring-statistics/cards/VP${card.base_vp}.png`
    : null

  return (
    <div style={{
      position: 'relative',
      width: '240px',
      height: '336px',
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

      {/* Card text — lower silver/grey panel */}
      <div style={{
        position: 'absolute',
        top: layout.text.top,
        left: layout.text.left,
        right: card.base_vp != null ? layout.text.rightWithVp : layout.text.rightWithoutVp,
        bottom: layout.text.bottom,
        fontFamily: 'var(--font-body)', fontSize: layout.text.fontSize,
        color: '#1a1a1a', lineHeight: layout.text.lineHeight,
        overflow: 'hidden',
      }}>
        {card.card_text
          ? card.card_text
          : <span style={{ color: '#999', fontStyle: 'italic' }}>No card text recorded.</span>}
      </div>

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

// ─── Synthetic card frame (all other card types) ──────────────────────────────

function SyntheticCard({ card }: { card: CardReference }) {
  const isLandscape = card.card_type === 'Corporation' || card.card_type === 'Prelude'
  const typeColors = TYPE_COLORS[card.card_type] ?? null
  const tags = parseTags(card.tags ?? null)

  const accentGradient = typeColors
    ? `linear-gradient(180deg, ${typeColors.light} 0%, ${typeColors.color} 50%, ${typeColors.dark} 100%)`
    : 'linear-gradient(180deg, #cccccc 0%, #aaaaaa 50%, #888888 100%)'

  return (
    <div style={{
      width: isLandscape ? '336px' : '240px',
      aspectRatio: isLandscape ? '7 / 5' : '5 / 7',
      marginBottom: '28px',
      borderRadius: '12px',
      overflow: 'hidden',
      border: `3px solid ${typeColors?.color ?? '#aaaaaa'}`,
      background: '#ffffff',
      boxShadow: '0 8px 36px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.2)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header — silver metallic gradient */}
      <div style={{
        background: 'linear-gradient(180deg, #b0b0b0 0%, #c8c8c8 35%, #dedede 80%, #d2d2d2 100%)',
        padding: '8px 10px 7px',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {!isLandscape && card.card_type !== 'CEO' && (
            <div style={{
              width: '28px', height: '28px', flexShrink: 0,
              background: card.mc_cost != null ? 'linear-gradient(135deg, #f0d040, #c9a030)' : 'rgba(255,255,255,0.45)',
              border: `1px solid ${card.mc_cost != null ? '#c9a030aa' : 'rgba(0,0,0,0.15)'}`,
              borderRadius: '4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.88rem',
              color: card.mc_cost != null ? '#1a1428' : 'transparent',
            }}>
              {card.mc_cost ?? ''}
            </div>
          )}
          {tags.length > 0 && (
            <div style={{ display: 'flex', gap: '3px', marginLeft: 'auto' }}>
              {tags.map((tag, i) => <Tag key={`${tag}-${i}`} name={tag} />)}
            </div>
          )}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#1c1c1c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {card.card_name}
        </div>
      </div>

      {/* Top accent stripe */}
      <div style={{ height: '16px', background: accentGradient, flexShrink: 0 }} />

      {/* Body */}
      <div style={{ padding: '12px 14px', flex: 1, overflow: 'auto', background: '#ffffff' }}>
        {card.card_text ? (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.76rem', color: '#1a1a1a', margin: 0, lineHeight: 1.55 }}>
            {card.card_text}
          </p>
        ) : (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.73rem', color: '#cccccc', margin: 0, fontStyle: 'italic' }}>
            No card text recorded.
          </p>
        )}
      </div>

      {/* Bottom accent stripe — portrait cards only */}
      {!isLandscape && (
        <div style={{ height: '12px', background: accentGradient, flexShrink: 0 }} />
      )}

      {/* Footer — silver metallic gradient */}
      <div style={{ background: 'linear-gradient(180deg, #bcbcbc 0%, #d4d4d4 40%, #e8e8e8 100%)', padding: '7px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {card.expansions.map(exp => EXPANSION_ICONS[exp]
            ? <img key={exp} src={EXPANSION_ICONS[exp]} alt={exp} title={exp} style={{ width: '16px', height: '16px', objectFit: 'contain', opacity: 0.75 }} />
            : <span key={exp} style={{ fontFamily: 'var(--font-body)', fontSize: '0.62rem', color: '#666' }}>{exp}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {card.resource_vp_type && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: '#8a7020' }}>
              {card.resource_vp_per && card.resource_vp_per > 1 ? `1/${card.resource_vp_per}` : '1'}VP/{card.resource_vp_type}
            </span>
          )}
          {card.base_vp != null && (
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%, #e8b840, #b8860b)', border: '1px solid #c9a030', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.82rem', color: '#1a1428', flexShrink: 0 }}>
              {card.base_vp}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Public component ────────────────────────────────────────────────────────

export default function CardFrame({ card }: CardFrameProps) {
  if (TEMPLATE_IMAGES[card.card_type]) {
    return <ImageCard card={card} />
  }
  return <SyntheticCard card={card} />
}

export { TYPE_COLORS }
