import { useState, useEffect } from 'react'
import { EXPANSION_ICONS } from '../lib/expansions'

const OFFICIAL_EXPANSIONS = [
  'Prelude', 'Prelude 2', 'Colonies', 'Venus Next', 'Turmoil', 'Promos',
]
const FAN_EXPANSIONS = ['Ares', 'CEO', 'The Moon', 'Pathfinders']

interface Inclusion {
  label: string
  condition: (exps: Set<string>) => boolean
}

const INCLUSIONS: Inclusion[] = [
  { label: 'Base game score tracking',              condition: () => true },
  { label: 'Corporation row per player',            condition: () => true },
  { label: 'Milestone rows (up to 6)',              condition: () => true },
  { label: 'Award rows (up to 6)',                  condition: () => true },
  { label: 'CEO card row per player',               condition: e => e.has('CEO') },
  { label: 'Prelude card rows per player',          condition: e => e.has('Prelude') || e.has('Prelude 2') },
  { label: 'Colony tile checklist',                 condition: e => e.has('Colonies') },
  { label: 'Moon rates + VP (Habitat / Mining / Logistics)', condition: e => e.has('The Moon') },
  { label: 'Pathfinders VP row',                    condition: e => e.has('Pathfinders') },
]

export default function ScoresheetHub() {
  const [selected, setSelected] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('tm_scoresheet_exp')
      return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>()
    } catch {
      return new Set<string>()
    }
  })

  useEffect(() => {
    localStorage.setItem('tm_scoresheet_exp', JSON.stringify([...selected]))
  }, [selected])

  function toggle(exp: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(exp)) next.delete(exp)
      else next.add(exp)
      return next
    })
  }

  function openSheet() {
    const base = `${import.meta.env.BASE_URL}scoresheet/print`
    const expParam = [...selected].join(',')
    const url = expParam ? `${base}?exp=${encodeURIComponent(expParam)}` : base
    window.open(url, '_blank')
  }

  const activeInclusions = INCLUSIONS.filter(i => i.condition(selected))

  function ExpansionGroup({ title, expansions }: { title: string; expansions: string[] }) {
    return (
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-4)', marginBottom: '10px' }}>
          {title}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {expansions.map(exp => {
            const active = selected.has(exp)
            return (
              <button
                key={exp}
                onClick={() => toggle(exp)}
                title={exp}
                style={{
                  width: '38px', height: '38px',
                  padding: '7px',
                  borderRadius: '5px',
                  border: `1px solid ${active ? 'rgba(201,160,48,0.55)' : 'var(--bd-secondary)'}`,
                  background: active ? 'rgba(201,160,48,0.12)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <img
                  src={EXPANSION_ICONS[exp]}
                  alt={exp}
                  style={{ width: '22px', height: '22px', objectFit: 'contain', opacity: active ? 1 : 0.4, transition: 'opacity 0.12s' }}
                />
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: '760px' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', color: 'var(--text-1)', letterSpacing: '-0.01em', marginBottom: '6px' }}>
          Score Sheets
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-4)', lineHeight: 1.55 }}>
          Select the expansions you are playing with. The score sheet adapts based on your selection and opens in a new tab ready to print (A4 landscape).
        </div>
      </div>

      {/* Expansion selector */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '8px', padding: '20px 22px', marginBottom: '16px' }}>
        <ExpansionGroup title="Official Expansions" expansions={OFFICIAL_EXPANSIONS} />
        <ExpansionGroup title="Fan Expansions" expansions={FAN_EXPANSIONS} />

        {/* What's included */}
        <div style={{ borderTop: '1px solid var(--bd-panel)', paddingTop: '14px', marginTop: '4px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-4)', marginBottom: '8px' }}>
            What's included
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {activeInclusions.map(inc => (
              <div key={inc.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--text-3)' }}>
                <span style={{ color: '#4a9e6b', fontSize: '0.7rem', flexShrink: 0 }}>✓</span>
                {inc.label}
              </div>
            ))}
          </div>
        </div>

        {/* Open button — bottom right */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button
            onClick={openSheet}
            style={{
              padding: '9px 22px',
              background: 'rgba(201,160,48,0.12)',
              border: '1px solid rgba(201,160,48,0.4)',
              borderRadius: '4px',
              color: '#c9a030',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: '0.85rem',
              letterSpacing: '0.04em',
              cursor: 'pointer',
            }}
          >
            Open Sheet
          </button>
        </div>
      </div>

      <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--text-5)', fontStyle: 'italic' }}>
        Base game rows are always included. Expand the selection to add expansion-specific rows.
      </div>
    </div>
  )
}
