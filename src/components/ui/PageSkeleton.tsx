import { Skeleton } from '@/components/ui/skeleton'

export function SkeletonHeader() {
  return (
    <div className="mb-8">
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-4 w-32" />
    </div>
  )
}

export function SkeletonStatGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-8">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-[6px] px-5 py-3.5 flex items-center justify-between">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-5 w-14" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-card border border-border rounded-[6px] overflow-hidden">
      <div className="border-b border-border px-4 py-3 flex gap-6">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3" style={{ width: `${60 + (i % 3) * 20}px` }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`px-4 py-3 flex gap-6 items-center ${i < rows - 1 ? 'border-b border-border' : ''}`}>
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-3" style={{ width: `${50 + ((i + j) % 4) * 15}px` }} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-[6px] p-5">
      {children}
    </div>
  )
}

export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-[6px] overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <Skeleton className="h-3 w-36" />
          </div>
          <div className="py-1">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className={`px-4 py-2.5 flex items-center gap-3 ${j < 3 ? 'border-b border-border' : ''}`}>
                <Skeleton className="h-3 w-5" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
