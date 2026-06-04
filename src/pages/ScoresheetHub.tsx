import { useState, useEffect } from 'react'
import { EXPANSION_ICONS } from '../lib/expansions'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const OFFICIAL_EXPANSIONS = [
  'Prelude', 'Prelude 2', 'Colonies', 'Venus Next', 'Turmoil', 'Promos',
]
const FAN_EXPANSIONS = ['Ares', 'CEO', 'The Moon', 'Pathfinders']

interface Inclusion {
  label: string
  condition: (exps: Set<string>) => boolean
}

const INCLUSIONS: Inclusion[] = [
  { label: 'Base game score tracking',                               condition: () => true },
  { label: 'Corporation row per player',                             condition: () => true },
  { label: 'Milestone rows (up to 6)',                               condition: () => true },
  { label: 'Award rows (up to 6)',                                   condition: () => true },
  { label: 'CEO card row per player',                                condition: e => e.has('CEO') },
  { label: 'Prelude card rows per player',                           condition: e => e.has('Prelude') || e.has('Prelude 2') },
  { label: 'Colony tile checklist',                                  condition: e => e.has('Colonies') },
  { label: 'Moon rates + VP (Habitat / Mining / Logistics)',         condition: e => e.has('The Moon') },
  { label: 'Pathfinders VP row',                                     condition: e => e.has('Pathfinders') },
]

function ExpansionGroup({ title, expansions, selected, toggle }: {
  title: string
  expansions: string[]
  selected: Set<string>
  toggle: (exp: string) => void
}) {
  return (
    <div className="mb-5">
      <div className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-4)] mb-2.5">
        {title}
      </div>
      <div className="flex gap-2 flex-wrap">
        {expansions.map(exp => {
          const active = selected.has(exp)
          return (
            <button
              key={exp}
              onClick={() => toggle(exp)}
              title={exp}
              className={cn(
                'w-[38px] h-[38px] p-[7px] rounded-[5px] border cursor-pointer transition-all flex items-center justify-center shrink-0',
                active
                  ? 'border-score-400/55 bg-score-400/10'
                  : 'border-[var(--bd-secondary)] bg-transparent opacity-50 hover:opacity-75'
              )}
            >
              <img
                src={EXPANSION_ICONS[exp]}
                alt={exp}
                className={cn('w-[22px] h-[22px] object-contain transition-opacity', active ? 'opacity-100' : 'opacity-40')}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

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

  return (
    <div className="page-enter py-8 px-9 max-w-[760px]">
      <div className="mb-7">
        <div className="font-display font-bold text-[1.5rem] text-foreground tracking-[-0.01em] mb-1.5">
          Score Sheets
        </div>
      </div>

      <div className="bg-card border border-border rounded-[8px] px-[22px] py-5 mb-4">
        <p className="font-body text-[0.83rem] text-[var(--text-4)] leading-[1.55] mt-0 mb-5">
          Select the expansions you are playing with. The score sheet adapts based on your selection
          and opens in a new tab ready to print (A4 landscape).
        </p>

        <ExpansionGroup title="Official Expansions" expansions={OFFICIAL_EXPANSIONS} selected={selected} toggle={toggle} />
        <ExpansionGroup title="Fan Expansions"      expansions={FAN_EXPANSIONS}      selected={selected} toggle={toggle} />

        <div className="border-t border-border pt-3.5 mt-1">
          <div className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-4)] mb-2">
            What's included
          </div>
          <div className="flex flex-col gap-1">
            {activeInclusions.map(inc => (
              <div key={inc.label} className="flex items-center gap-2 font-body text-[0.8rem] text-muted-foreground">
                <span className="text-win-500 text-[0.7rem] shrink-0">✓</span>
                {inc.label}
              </div>
            ))}
          </div>
        </div>

        <p className="font-body text-[0.78rem] text-[var(--text-4)] mt-3.5 mb-0 leading-[1.5]">
          Base game rows are always included. Expand the selection to add expansion-specific rows.
        </p>

        <div className="flex justify-end mt-4">
          <Button
            variant="outline"
            onClick={openSheet}
            className="text-score-400 border-score-400/40 bg-score-400/10 hover:bg-score-400/20 font-body font-semibold tracking-[0.04em]"
          >
            Open Sheet
          </Button>
        </div>
      </div>
    </div>
  )
}
