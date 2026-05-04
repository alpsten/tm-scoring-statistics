import { useSearchParams } from 'react-router-dom'
import type { CSSProperties } from 'react'
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
  width: '160px',
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
  height: '16px',
  padding: '0',
  verticalAlign: 'middle',
}

const ROW_H = 21
const DATA_COLS = [0, 1, 2, 3, 4]

function Row({ label, h = ROW_H, total }: { label: string; h?: number; total?: boolean }) {
  return (
    <tr>
      <td style={{ ...labelBase, height: `${h}px`, ...(total ? { background: '#2a2a2a', color: '#eee', fontWeight: 800, fontSize: '9.5pt', borderRight: '2px solid #555', letterSpacing: '0.06em', borderTop: '2px solid #888' } : {}) }}>
        {label}
      </td>
      {DATA_COLS.map(i => (
        <td key={i} style={{ ...cellBase, height: `${h}px`, textAlign: 'center', ...(total ? { background: '#f5f5f5', fontWeight: 700, fontSize: '11pt', borderTop: '2px solid #999' } : {}) }} />
      ))}
    </tr>
  )
}

function NameRow({ n }: { n: number }) {
  return (
    <tr>
      <td style={{ ...labelBase, fontWeight: 400, textTransform: 'none', letterSpacing: 0, height: `${ROW_H}px` }}>
        <span style={{ fontWeight: 700, color: '#666', marginRight: '4px', fontSize: '8.5pt' }}>{n}.</span>
        <span style={{ display: 'inline-block', borderBottom: '1px solid #c0c0c0', width: '122px', height: '13px', verticalAlign: 'middle' }} />
      </td>
      {DATA_COLS.map(i => <td key={i} style={{ ...cellBase, height: `${ROW_H}px`, textAlign: 'center', fontSize: '10pt' }} />)}
    </tr>
  )
}

function SubSection({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={6} style={{ ...sectionRow, background: '#e8e8e8', borderTop: '1px solid #bbb', fontSize: '6.5pt', letterSpacing: '0.1em' }}>
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

export default function PrintScoresheet() {
  const [params] = useSearchParams()
  const urlExp = parseListParam(params.get('exp'))

  // Fall back to localStorage if URL params are lost (e.g. after window.print() in some browsers)
  const expansions = new Set(urlExp.length > 0 ? urlExp : (() => {
    try { return JSON.parse(localStorage.getItem('tm_scoresheet_exp') ?? '[]') as string[] }
    catch { return [] }
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
          {expLabel} · A4 landscape
        </span>
      </div>

      {/* Sheet */}
      <div className="print-sheet" style={{ background: 'white', padding: '7mm 8mm', fontFamily: '"Exo 2", "Arial", sans-serif', minHeight: '100vh' }}>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
          <div style={{ fontWeight: 800, fontSize: '14pt', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#bf3418', lineHeight: 1 }}>
            Terraforming Mars
          </div>
          <div style={{ fontWeight: 500, fontSize: '7pt', textTransform: 'uppercase', letterSpacing: '0.32em', color: '#888', marginTop: '1px' }}>
            Score Sheet
          </div>
        </div>

        {/* Game info — row 1: fixed fields */}
        <div style={{ display: 'flex', gap: '5mm', alignItems: 'center', marginBottom: '1.5mm', flexWrap: 'nowrap' }}>
          {[['Date', '30mm'], ['Map', '38mm'], ['Gen', '10mm']].map(([lbl, w]) => (
            <span key={lbl} style={{ display: 'inline-flex', alignItems: 'center', gap: '1.5mm' }}>
              <strong style={{ textTransform: 'uppercase', fontSize: '7.5pt', letterSpacing: '0.06em', color: '#555' }}>{lbl}</strong>
              <span style={{ display: 'inline-block', borderBottom: '1px solid #999', width: w, height: '13px' }} />
            </span>
          ))}
        </div>

        {/* Game info — row 2: expansions, full width, small font */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2mm', marginBottom: '3mm', whiteSpace: 'nowrap', overflow: 'hidden' }}>
          <strong style={{ textTransform: 'uppercase', fontSize: '7.5pt', letterSpacing: '0.06em', color: '#555', flexShrink: 0 }}>Expansions</strong>
          {activeExpansions.length > 0
            ? <span style={{ fontSize: '6.5pt', color: '#444', fontStyle: 'italic', letterSpacing: '0.01em' }}>{activeExpansions.join(' · ')}</span>
            : <span style={{ display: 'inline-block', borderBottom: '1px solid #999', width: '80mm', height: '12px' }} />
          }
        </div>

        {/* Main table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '160px' }} />
            <col /><col /><col /><col /><col />
          </colgroup>
          <thead>
            <tr>
              <th style={{ ...labelBase, height: '18px', background: '#2a2a2a', color: '#aaa', fontSize: '6.5pt', fontStyle: 'italic', fontWeight: 400, textTransform: 'none', letterSpacing: 0, borderRight: '2px solid #555' }}>
                turn order →
              </th>
              {[1, 2, 3, 4, 5].map(n => (
                <th key={n} style={{ border: bd, background: '#3a3a3a', color: '#ccc', fontWeight: 600, fontSize: '8pt', textAlign: 'center', letterSpacing: '0.1em', height: '18px', verticalAlign: 'middle' }}>
                  {n}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Player info */}
            <Row label="Player" />
            <Row label="Color" />
            <Row label="Corporation" />
            <Row label="Corp + Merger" />
            {hasCEO     && <Row label="CEO Card" />}
            {hasPrelude && <Row label="Prelude" />}
            {hasPrelude && <Row label="Prelude" />}
            {hasPrelude && <Row label="Prelude Extra" />}

            {/* Milestones */}
            <tr><td colSpan={6} style={sectionRow}>Milestones — claim 3 · 5 VP each · mark player initial</td></tr>
            {[1, 2, 3, 4, 5, 6].map(n => <NameRow key={`m${n}`} n={n} />)}

            {/* Awards */}
            <tr><td colSpan={6} style={sectionRow}>Awards — fund 3 · mark ① 1st place  ② 2nd place  (F) funded by</td></tr>
            {[1, 2, 3, 4, 5, 6].map(n => <NameRow key={`a${n}`} n={n} />)}

            {/* Colonies — two rows */}
            {hasColonies && (() => {
              const all = hasPathfinders ? COLONIES_WITH_PATHFINDERS : COLONIES_BASE
              const row1 = all.slice(0, 6)
              const row2 = all.slice(6)
              const ColonyRow = ({ colonies, label }: { colonies: string[]; label: string }) => (
                <tr>
                  <td style={{ ...labelBase, height: '22px', fontSize: label ? '8pt' : '7pt', color: label ? '#333' : '#aaa' }}>
                    {label}
                  </td>
                  <td colSpan={5} style={{ ...cellBase, height: '22px', padding: '0 8px' }}>
                    <div style={{ display: 'flex', gap: '5mm', alignItems: 'center', height: '100%' }}>
                      {colonies.map(c => (
                        <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '7.5pt', color: '#333', whiteSpace: 'nowrap' }}>
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
            <tr><td colSpan={6} style={sectionRow}>Score</td></tr>
            {scoreRows.map(row => <Row key={row} label={row} />)}

            {/* Moon rates — sub-section inside score */}
            {hasMoon && (
              <>
                <SubSection label="The Moon" />
                <Row label="Habitat VP" />
                <Row label="Mine VP" />
                <Row label="Road VP" />
              </>
            )}

            <Row label="Total" total h={26} />
          </tbody>
        </table>

        <div style={{ marginTop: '2mm', fontSize: '6pt', color: '#ccc', textAlign: 'right', fontFamily: 'Arial, sans-serif', letterSpacing: '0.04em' }}>
          Fan-made · not affiliated with FryxGames
        </div>
      </div>
    </>
  )
}
