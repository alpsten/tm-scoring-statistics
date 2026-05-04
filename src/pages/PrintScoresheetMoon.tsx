import type { CSSProperties } from 'react'

function handlePrint() {
  const sheet = document.querySelector('.print-sheet') as HTMLElement | null
  if (!sheet) return

  const newWin = window.open('', '_blank')
  if (!newWin) { window.print(); return }

  newWin.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Terraforming Mars — Moon Score Supplement</title>
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

const ROW_H = 22
const DATA_COLS = [0, 1, 2, 3, 4]

function Row({ label, h = ROW_H, bold }: { label: string; h?: number; bold?: boolean }) {
  return (
    <tr>
      <td style={{ ...labelBase, height: `${h}px`, ...(bold ? { fontWeight: 800, background: '#2a2a2a', color: '#eee', borderRight: '2px solid #555', fontSize: '9.5pt', letterSpacing: '0.06em' } : {}) }}>
        {label}
      </td>
      {DATA_COLS.map(i => (
        <td key={i} style={{ ...cellBase, height: `${h}px`, textAlign: 'center', ...(bold ? { background: '#f5f5f5', fontWeight: 700, fontSize: '11pt', borderTop: '2px solid #999' } : {}) }} />
      ))}
    </tr>
  )
}

export default function PrintScoresheetMoon() {
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
          A4 landscape · attach alongside the base score sheet
        </span>
      </div>

      {/* Sheet */}
      <div className="print-sheet" style={{ background: 'white', padding: '7mm 8mm', fontFamily: '"Exo 2", "Arial", sans-serif', minHeight: '100vh' }}>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
          <div style={{ fontWeight: 800, fontSize: '14pt', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#bf3418', lineHeight: 1 }}>
            Terraforming Mars
          </div>
          <div style={{ fontWeight: 600, fontSize: '8pt', textTransform: 'uppercase', letterSpacing: '0.28em', color: '#5b8dd9', marginTop: '1px' }}>
            The Moon — Score Supplement
          </div>
          <div style={{ fontWeight: 400, fontSize: '7pt', letterSpacing: '0.08em', color: '#aaa', marginTop: '2px', fontStyle: 'italic' }}>
            Attach alongside the base score sheet
          </div>
        </div>

        {/* Game reference */}
        <div style={{ display: 'flex', gap: '6mm', alignItems: 'center', marginBottom: '3mm', fontSize: '8pt', color: '#222' }}>
          {[['Date', '30mm'], ['Game ref / notes', '60mm']].map(([lbl, w]) => (
            <span key={lbl} style={{ display: 'inline-flex', alignItems: 'center', gap: '1.5mm' }}>
              <strong style={{ textTransform: 'uppercase', fontSize: '7.5pt', letterSpacing: '0.06em', color: '#555' }}>{lbl}</strong>
              <span style={{ display: 'inline-block', borderBottom: '1px solid #999', width: w, height: '13px' }} />
            </span>
          ))}
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '160px' }} />
            <col /><col /><col /><col /><col />
          </colgroup>

          <thead>
            <tr>
              <th style={{ ...labelBase, height: '18px', background: '#2a2a2a', color: '#aaa', fontSize: '6.5pt', fontStyle: 'italic', fontWeight: 400, textTransform: 'none', letterSpacing: 0, borderRight: '2px solid #555', width: '160px' }}>
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
            <Row label="Player" />

            {/* Moon rates */}
            <tr><td colSpan={6} style={sectionRow}>The Moon — each VP point = 1 VP at game end</td></tr>
            <Row label="Habitat VP" />
            <Row label="Mine VP" />
            <Row label="Road VP" />

            {/* Notes */}
            <tr><td colSpan={6} style={{ ...sectionRow, borderTop: '3px double #888' }}>Notes</td></tr>
            {[0, 1, 2, 3, 4].map(i => (
              <tr key={i}>
                <td colSpan={6} style={{ border: bd, height: `${ROW_H}px`, padding: '0 7px', verticalAlign: 'middle' }} />
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '2mm', fontSize: '6pt', color: '#ccc', textAlign: 'right', fontFamily: 'Arial, sans-serif', letterSpacing: '0.04em' }}>
          Fan-made · The Moon expansion supplement · not affiliated with FryxGames
        </div>
      </div>
    </>
  )
}
