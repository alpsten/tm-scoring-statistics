import React from 'react'

const AWARD_BANNER  = '/tm-scoring-statistics/misc/award-banner.png'
const EFFECT_BANNER = '/tm-scoring-statistics/misc/effect-banner.png'

interface SectionHeadingProps {
  children: React.ReactNode
  banner?: boolean
  effect?: boolean
  style?: React.CSSProperties
}

export default function SectionHeading({ children, banner, effect, style }: SectionHeadingProps) {
  if (banner) {
    return (
      <h2 className="section-heading-banner" style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: '115px',
        padding: '0 36px 4px',
        backgroundImage: `url('${AWARD_BANNER}')`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: '1.1rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: '#1a0a00',
        whiteSpace: 'nowrap',
        marginLeft: '-13px',
        marginTop: '-20px',
        marginBottom: '-29px',
        ...style,
      }}>
        {children}
      </h2>
    )
  }

  if (effect) {
    return (
      <h2 className="section-heading-effect" style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: '161px',
        padding: '0 25px 9px',
        backgroundImage: `url('${EFFECT_BANNER}')`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: '0.85rem',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: '#1a0a00',
        whiteSpace: 'nowrap',
        alignSelf: 'flex-start',
        margin: 0,
        marginBottom: '-130px',
        ...style,
      }}>
        {children}
      </h2>
    )
  }

  return (
    <h2 className="font-display font-semibold text-[0.82rem] tracking-[0.1em] uppercase text-[var(--text-4)] mb-[14px]" style={style}>
      {children}
    </h2>
  )
}
