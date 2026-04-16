import { TAG_ICONS } from '../../lib/expansions'

// Renders a single TM tag name as an icon (if available) or styled text badge

const TAG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Animal':   { bg: 'rgba(74, 158, 107, 0.1)',  text: '#4a9e6b', border: 'rgba(74, 158, 107, 0.25)' },
  'Building': { bg: 'rgba(180, 120, 60, 0.1)',  text: '#c97b3a', border: 'rgba(180, 120, 60, 0.25)' },
  'City':     { bg: 'rgba(100, 140, 200, 0.1)', text: '#7aa0d0', border: 'rgba(100, 140, 200, 0.25)' },
  'Earth':    { bg: 'rgba(100, 140, 200, 0.1)', text: '#7aa0d0', border: 'rgba(100, 140, 200, 0.25)' },
  'Event':    { bg: 'rgba(200, 80, 60, 0.1)',   text: '#d06050', border: 'rgba(200, 80, 60, 0.25)' },
  'Jovian':   { bg: 'rgba(180, 100, 40, 0.1)',  text: '#c07030', border: 'rgba(180, 100, 40, 0.25)' },
  'Microbe':  { bg: 'rgba(90, 160, 80, 0.1)',   text: '#5aa050', border: 'rgba(90, 160, 80, 0.25)' },
  'Plant':    { bg: 'rgba(60, 160, 80, 0.1)',   text: '#40a060', border: 'rgba(60, 160, 80, 0.25)' },
  'Power':    { bg: 'rgba(180, 90, 200, 0.1)',  text: '#c070d0', border: 'rgba(180, 90, 200, 0.25)' },
  'Science':  { bg: 'rgba(200, 200, 60, 0.1)',  text: '#d0c030', border: 'rgba(200, 200, 60, 0.25)' },
  'Space':    { bg: 'rgba(60, 100, 200, 0.1)',  text: '#5080c0', border: 'rgba(60, 100, 200, 0.25)' },
  'Venus':    { bg: 'rgba(220, 160, 60, 0.1)',  text: '#d0a040', border: 'rgba(220, 160, 60, 0.25)' },
  'Moon':     { bg: 'rgba(140, 148, 176, 0.1)', text: '#8c94b0', border: 'rgba(140, 148, 176, 0.25)' },
  'Mars':     { bg: 'rgba(196, 88, 52, 0.1)',   text: '#c45834', border: 'rgba(196, 88, 52, 0.25)' },
  'Planet':   { bg: 'rgba(92, 172, 110, 0.1)',  text: '#5cac6e', border: 'rgba(92, 172, 110, 0.25)' },
}

const DEFAULT_TAG_COLOR = { bg: 'rgba(100, 100, 100, 0.1)', text: '#8e87a8', border: 'rgba(100, 100, 100, 0.2)' }

interface TagProps {
  name: string
}

export default function Tag({ name }: TagProps) {
  const icon = TAG_ICONS[name]

  if (icon) {
    return (
      <img
        src={icon}
        alt={name}
        title={name}
        style={{ width: '18px', height: '18px', objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle' }}
      />
    )
  }

  const colors = TAG_COLORS[name] ?? DEFAULT_TAG_COLOR
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: 'var(--font-body)',
      fontSize: '0.68rem',
      fontWeight: 500,
      letterSpacing: '0.04em',
      padding: '2px 7px',
      borderRadius: '3px',
      background: colors.bg,
      color: colors.text,
      border: `1px solid ${colors.border}`,
      whiteSpace: 'nowrap',
    }}>
      {name}
    </span>
  )
}
