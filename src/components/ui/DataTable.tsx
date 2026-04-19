import type { ReactNode, CSSProperties } from 'react'

export interface DataTableColumn<T> {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  /** Override td styles (merged on top of defaults) */
  tdStyle?: CSSProperties
  /** Custom cell renderer — receives the full row */
  render?: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  /** Controlled sort — caller owns sort state */
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string) => void
  /** Compact mode: smaller header, tighter padding (detail-page tables) */
  compact?: boolean
  /** Optional class on the outer wrapper div */
  className?: string
  /** Optional extra styles on the outer wrapper div */
  wrapperStyle?: CSSProperties
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  sortKey,
  sortDir,
  onSort,
  compact = false,
  className,
  wrapperStyle,
}: DataTableProps<T>) {
  const hPad = compact ? '8px 16px' : '11px 18px'
  const rPad = compact ? '9px 16px' : '13px 18px'
  const hSize = compact ? '0.66rem' : '0.68rem'
  const hWeight = compact ? 500 : 600

  return (
    <div className={className} style={{ background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '6px', overflow: 'hidden', ...wrapperStyle }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--bd-panel)' }}>
            {columns.map(col => (
              <th
                key={col.key}
                onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                style={{
                  padding: hPad,
                  textAlign: col.align ?? 'left',
                  fontFamily: 'var(--font-mono)',
                  fontSize: hSize,
                  fontWeight: hWeight,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: sortKey === col.key ? 'var(--text-3)' : 'var(--text-4)',
                  cursor: col.sortable ? 'pointer' : 'default',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {col.label}
                {col.sortable && (
                  sortKey === col.key
                    ? <span style={{ color: 'var(--sort-active)', marginLeft: '3px' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                    : <span style={{ color: 'var(--bd-secondary)', marginLeft: '3px' }}>⇅</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey(row)}
              style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--bd-panel)' : 'none', transition: 'background 0.1s', background: 'var(--bg-row)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-row-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-row)')}
            >
              {columns.map(col => (
                <td
                  key={col.key}
                  style={{
                    padding: rPad,
                    textAlign: col.align ?? 'left',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.85rem',
                    color: 'var(--text-2)',
                    ...col.tdStyle,
                  }}
                >
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
