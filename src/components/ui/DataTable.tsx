import type { ReactNode, CSSProperties } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

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

const ALIGN_CLASS: Record<string, string> = {
  left:   'text-left',
  center: 'text-center',
  right:  'text-right',
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
  return (
    <div
      className={cn('bg-card border border-border rounded-[6px] overflow-hidden', className)}
      style={wrapperStyle}
    >
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            {columns.map(col => (
              <TableHead
                key={col.key}
                onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                className={cn(
                  'font-mono tracking-[0.08em] uppercase whitespace-nowrap select-none border-border',
                  compact ? 'text-[0.72rem] font-medium py-2 px-4' : 'text-[0.75rem] font-semibold py-[11px] px-[18px]',
                  col.sortable && onSort ? 'cursor-pointer' : 'cursor-default',
                  sortKey === col.key ? 'text-muted-foreground' : 'text-[var(--text-4)]',
                  ALIGN_CLASS[col.align ?? 'left'],
                )}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && onSort && (
                    sortKey === col.key
                      ? (sortDir === 'asc'
                          ? <ArrowUp className="size-3 text-foreground" />
                          : <ArrowDown className="size-3 text-foreground" />)
                      : <ArrowUpDown className="size-3 text-[var(--bd-secondary)]" />
                  )}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => (
            <TableRow
              key={rowKey(row)}
              className="border-border bg-secondary hover:bg-accent transition-colors duration-100"
            >
              {columns.map(col => (
                <TableCell
                  key={col.key}
                  className={cn(
                    'font-mono text-[0.85rem] text-secondary-foreground',
                    compact ? 'py-[9px] px-4' : 'py-[13px] px-[18px]',
                    ALIGN_CLASS[col.align ?? 'left'],
                  )}
                  style={col.tdStyle}
                >
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? '')}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
