import { useSearchParams } from 'react-router-dom'
import type { CSSProperties, ReactNode } from 'react'
import { parseListParam } from '../lib/filterUtils'

const COLONIES_BASE = [
  'Ceres', 'Callisto', 'Enceladus', 'Europa', 'Ganymede', 'Io',
  'Luna', 'Miranda', 'Pluto', 'Titan', 'Triton',
]
// Iapetus II (Pathfinders) placed last on row 2
const COLONIES_WITH_PATHFINDERS = [
  'Ceres', 'Callisto', 'Enceladus', 'Europa', 'Ganymede', 'Io',
  'Luna', 'Miranda', 'Pluto', 'Titan', 'Triton', 'Iapetus II',
]

const bd = '1px solid #c0c0c0'

const labelBase: CSSProperties = {
  border: bd,
  borderRight: '2px solid #aaa',
  background: '#f0f0f0',
  fontWeight: 600,
  fontSize: '8pt',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  padding: '0 7px',
  verticalAlign: 'middle',
  color: '#333',
  whiteSpace: 'nowrap',
}

const cellBase: CSSProperties = {
  border: bd,
  padding: '0 4px',
  verticalAlign: 'middle',
  fontSize: '9pt',
  color: '#111',
}

const sectionRow: CSSProperties = {
  border: bd,
  borderTop: '2px solid #999',
  background: '#ddd',
  fontWeight: 700,
  fontSize: '7pt',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  textAlign: 'center',
  color: '#333',
  height: '15px',
  padding: '0',
  verticalAlign: 'middle',
}

const ROW_H = 19
const MIN_PLAYERS = 1
const MAX_PLAYERS = 5
const DUO_THRESHOLD = 2

function clampPlayers(n: number): number {
  if (!Number.isFinite(n)) return MAX_PLAYERS
  return Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Math.round(n)))
}

function Row({ label, h = ROW_H, total, numPlayers }: { label: string; h?: number; total?: boolean; numPlayers: number }) {
  const dataCols = Array.from({ length: numPlayers }, (_, i) => i)
  return (
    <tr>
      <td style={{ ...labelBase, height: `${h}px`, ...(total ? { background: '#2a2a2a', color: '#eee', fontWeight: 800, fontSize: '9.5pt', borderRight: '2px solid #555', letterSpacing: '0.06em', borderTop: '2px solid #888' } : {}) }}>
        {label}
      </td>
      {dataCols.map(i => (
        <td key={i} style={{ ...cellBase, height: `${h}px`, textAlign: 'center', ...(total ? { background: '#f5f5f5', fontWeight: 700, fontSize: '11pt', borderTop: '2px solid #999' } : {}) }} />
      ))}
    </tr>
  )
}

function NameRow({ n, numPlayers }: { n: number; numPlayers: number }) {
  const dataCols = Array.from({ length: numPlayers }, (_, i) => i)
  return (
    <tr>
      <td style={{ ...labelBase, fontWeight: 400, textTransform: 'none', letterSpacing: 0, height: `${ROW_H}px` }}>
        <span style={{ fontWeight: 700, color: '#666', marginRight: '4px', fontSize: '8.5pt' }}>{n}.</span>
      </td>
      {dataCols.map(i => <td key={i} style={{ ...cellBase, height: `${ROW_H}px`, textAlign: 'center', fontSize: '10pt' }} />)}
    </tr>
  )
}

function SubSection({ label, numPlayers }: { label: string; numPlayers: number }) {
  return (
    <tr>
      <td colSpan={numPlayers + 1} style={{ ...sectionRow, background: '#e8e8e8', borderTop: '1px solid #bbb', fontSize: '6.5pt', letterSpacing: '0.1em' }}>
        {label}
      </td>
    </tr>
  )
}

function handlePrint() {
  const sheet = document.querySelector('.print-sheet') as HTMLElement | null
  if (!sheet) return

  const newWin = window.open('', '_blank')
  if (!newWin) { window.print(); return }

  newWin.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Terraforming Mars — Score Sheet</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: white; color: #111; }
    body { font-family: "Exo 2", Arial, sans-serif; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>
</head>
<body>${sheet.outerHTML}</body>
</html>`)
  newWin.document.close()

  const doPrint = () => {
    newWin.focus()
    newWin.onafterprint = () => { try { newWin.close() } catch { /* ignore */ } }
    newWin.print()
  }

  if (newWin.document.fonts?.ready) {
    newWin.document.fonts.ready.then(doPrint)
  } else {
    setTimeout(doPrint, 500)
  }
}

interface SheetProps {
  numPlayers: number
  compact: boolean
  hasPrelude: boolean
  hasColonies: boolean
  hasMoon: boolean
  hasPathfinders: boolean
  hasCEO: boolean
  activeExpansions: string[]
  expLabel: string
  scoreRows: string[]
}

function ScoreSheet({
  numPlayers, compact, hasPrelude, hasColonies, hasMoon, hasPathfinders, hasCEO,
  activeExpansions, expLabel, scoreRows,
}: SheetProps): ReactNode {
  const labelColWidth = compact ? '128px' : '160px'
  const colonyGap = compact ? '3mm' : '5mm'
  const colonyFontSize = compact ? '7pt' : '7.5pt'

  return (
    <>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '8px', marginBottom: '2mm' }}>
        <span style={{ fontWeight: 800, fontSize: '14pt', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#bf3418', lineHeight: 1 }}>
          Terraforming Mars
        </span>
        <span style={{ fontWeight: 500, fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.3em', color: '#888' }}>
          Score Sheet
        </span>
      </div>

      {/* Game info — row 1: fixed fields */}
      <div style={{ display: 'flex', gap: '5mm', alignItems: 'center', marginBottom: '1mm', flexWrap: 'wrap' }}>
        {[['Date', '30mm'], ['Map', '38mm'], ['Gen', '10mm']].map(([lbl, w]) => (
          <span key={lbl} style={{ display: 'inline-flex', alignItems: 'center', gap: '1.5mm' }}>
            <strong style={{ textTransform: 'uppercase', fontSize: '7.5pt', letterSpacing: '0.06em', color: '#555' }}>{lbl}</strong>
            <span style={{ display: 'inline-block', borderBottom: '1px solid #999', width: w, height: '13px' }} />
          </span>
        ))}
      </div>

      {/* Game info — row 2: expansions, full width, small font */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '2mm', marginBottom: '2mm', whiteSpace: 'nowrap', overflow: 'hidden' }}>
        <strong style={{ textTransform: 'uppercase', fontSize: '7.5pt', letterSpacing: '0.06em', color: '#555', flexShrink: 0 }}>Expansions</strong>
        {activeExpansions.length > 0
          ? <span style={{ fontSize: '6.5pt', color: '#444', fontStyle: 'italic', letterSpacing: '0.01em' }}>{activeExpansions.join(' · ')}</span>
          : <span style={{ display: 'inline-block', borderBottom: '1px solid #999', width: '80mm', height: '12px' }} />
        }
      </div>

      {/* Main table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: labelColWidth }} />
          {Array.from({ length: numPlayers }, (_, i) => <col key={i} />)}
        </colgroup>
        <thead>
          <tr>
            <th style={{ ...labelBase, height: '16px', background: '#2a2a2a', color: '#aaa', fontSize: '6.5pt', fontStyle: 'italic', fontWeight: 400, textTransform: 'none', letterSpacing: 0, borderRight: '2px solid #555' }}>
              turn order →
            </th>
            {Array.from({ length: numPlayers }, (_, i) => i + 1).map(n => (
              <th key={n} style={{ border: bd, background: '#3a3a3a', color: '#ccc', fontWeight: 600, fontSize: '8pt', textAlign: 'center', letterSpacing: '0.1em', height: '16px', verticalAlign: 'middle' }}>
                {n}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* Player info */}
          <Row label="Player" numPlayers={numPlayers} />
          <Row label="Color" numPlayers={numPlayers} />
          <Row label="Corporation" numPlayers={numPlayers} />
          <Row label="Corp + Merger" numPlayers={numPlayers} />
          {hasCEO     && <Row label="CEO Card" numPlayers={numPlayers} />}
          {hasPrelude && <Row label="Prelude" numPlayers={numPlayers} />}
          {hasPrelude && <Row label="Prelude" numPlayers={numPlayers} />}
          {hasPrelude && <Row label="Prelude Extra" numPlayers={numPlayers} />}

          {/* Milestones */}
          <tr><td colSpan={numPlayers + 1} style={sectionRow}>Milestones — claim 3 · 5 VP each · mark player initial</td></tr>
          {[1, 2, 3, 4, 5, 6].map(n => <NameRow key={`m${n}`} n={n} numPlayers={numPlayers} />)}

          {/* Awards */}
          <tr><td colSpan={numPlayers + 1} style={sectionRow}>Awards — fund 3 · mark ① 1st place  ② 2nd place  (F) funded by</td></tr>
          {[1, 2, 3, 4, 5, 6].map(n => <NameRow key={`a${n}`} n={n} numPlayers={numPlayers} />)}

          {/* Colonies — two rows */}
          {hasColonies && (() => {
            const all = hasPathfinders ? COLONIES_WITH_PATHFINDERS : COLONIES_BASE
            const row1 = all.slice(0, 6)
            const row2 = all.slice(6)
            const ColonyRow = ({ colonies, label }: { colonies: string[]; label: string }) => (
              <tr>
                <td style={{ ...labelBase, height: '20px', fontSize: label ? '8pt' : '7pt', color: label ? '#333' : '#aaa' }}>
                  {label}
                </td>
                <td colSpan={numPlayers} style={{ ...cellBase, height: '20px', padding: '0 8px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: colonyGap, alignItems: 'center', height: '100%' }}>
                    {colonies.map(c => (
                      <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: colonyFontSize, color: '#333', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-block', width: '9px', height: '9px', border: '1px solid #999', borderRadius: '1px', flexShrink: 0 }} />
                        {c}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            )
            return (
              <>
                <ColonyRow label="Colonies" colonies={row1} />
                <ColonyRow label="" colonies={row2} />
              </>
            )
          })()}

          {/* Score */}
          <tr><td colSpan={numPlayers + 1} style={sectionRow}>Score</td></tr>
          {scoreRows.map(row => <Row key={row} label={row} numPlayers={numPlayers} />)}

          {/* Moon rates — sub-section inside score */}
          {hasMoon && (
            <>
              <SubSection label="The Moon" numPlayers={numPlayers} />
              <Row label="Habitat VP" numPlayers={numPlayers} />
              <Row label="Mine VP" numPlayers={numPlayers} />
              <Row label="Road VP" numPlayers={numPlayers} />
            </>
          )}

          <Row label="Total" total h={23} numPlayers={numPlayers} />
        </tbody>
      </table>

      <div style={{ marginTop: '1mm', fontSize: '6pt', color: '#ccc', textAlign: 'right', fontFamily: 'Arial, sans-serif', letterSpacing: '0.04em' }}>
        {expLabel} · Fan-made · not affiliated with FryxGames
      </div>
    </>
  )
}

export default function PrintScoresheet() {
  const [params] = useSearchParams()
  const urlExp = parseListParam(params.get('exp'))

  // Fall back to localStorage if URL params are lost (e.g. after window.print() in some browsers)
  const expansions = new Set(urlExp.length > 0 ? urlExp : (() => {
    try { return JSON.parse(localStorage.getItem('tm_scoresheet_exp') ?? '[]') as string[] }
    catch { return [] }
  })())

  const urlPlayers = params.get('players')
  const numPlayers = clampPlayers(urlPlayers !== null ? Number(urlPlayers) : (() => {
    const stored = Number(localStorage.getItem('tm_scoresheet_players'))
    return Number.isFinite(stored) && stored > 0 ? stored : MAX_PLAYERS
  })())

  const hasPrelude     = expansions.has('Prelude') || expansions.has('Prelude 2')
  const hasColonies    = expansions.has('Colonies')
  const hasMoon        = expansions.has('The Moon')
  const hasPathfinders = expansions.has('Pathfinders')
  const hasCEO         = expansions.has('CEO')

  const activeExpansions = [...expansions]
  const expLabel = activeExpansions.length > 0
    ? `Base Game + ${activeExpansions.join(' · ')}`
    : 'Base Game'

  const scoreRows = [
    'TR',
    'Milestone VP',
    'Award VP',
    'Greenery VP',
    'City VP',
    'Card VP',
    ...(hasPathfinders ? ['Pathfinders VP'] : []),
  ]

  const isDuo = numPlayers <= DUO_THRESHOLD
  const sheetProps: Omit<SheetProps, 'compact'> = {
    numPlayers, hasPrelude, hasColonies, hasMoon, hasPathfinders, hasCEO,
    activeExpansions, expLabel, scoreRows,
  }

  return (
    <>
      <style>{`
        @page { size: A4 landscape; margin: 8mm; }
        @media print {
          .no-print { display: none !important; }
          body, html { background: white !important; margin: 0 !important; padding: 0 !important; }
          .print-sheet { display: block !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{ background: '#141414', padding: '12px 24px', display: 'flex', gap: '12px', alignItems: 'center', borderBottom: '1px solid #2a2a2a' }}>
        <button
          onClick={handlePrint}
          style={{
            background: '#c9a030', color: '#111', border: 'none',
            padding: '8px 20px', borderRadius: '4px', fontWeight: 700,
            fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
            letterSpacing: '0.04em',
          }}
        >
          Print
        </button>
        <span style={{ color: 'var(--text-4)', fontSize: '0.8rem', fontFamily: 'var(--font-body)' }}>
          {expLabel} · {numPlayers} player{numPlayers === 1 ? '' : 's'}{isDuo ? ' · 2 sheets per page' : ''} · A4 landscape
        </span>
      </div>

      {/* Sheet */}
      <div className="print-sheet" style={{ background: 'white', padding: isDuo ? '5mm 4mm' : '5mm 8mm', fontFamily: '"Exo 2", "Arial", sans-serif', minHeight: '100vh' }}>
        {isDuo ? (
          <div style={{ display: 'flex' }}>
            <div style={{ flex: 1, paddingRight: '4mm', borderRight: '1px dashed #bbb' }}>
              <ScoreSheet {...sheetProps} compact />
            </div>
            <div style={{ flex: 1, paddingLeft: '4mm' }}>
              <ScoreSheet {...sheetProps} compact />
            </div>
          </div>
        ) : (
          <ScoreSheet {...sheetProps} compact={false} />
        )}
      </div>
    </>
  )
}
