import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: 'mars' | 'atmo' | 'score' | 'neutral' | 'win'
  valueSuffix?: string
  suffixColor?: string
  badge?: boolean
}

const ACCENT_CLASSES: Record<NonNullable<StatCardProps['accent']>, string> = {
  mars:    'text-mars-500',
  atmo:    'text-atmo-500',
  score:   'text-score-400',
  neutral: 'text-muted-foreground',
  win:     'text-win-500',
}

const BADGE_CLASSES: Record<NonNullable<StatCardProps['accent']>, string> = {
  mars:    'bg-mars-500/10 border-mars-500/40 text-mars-500 hover:bg-mars-500/10',
  atmo:    'bg-atmo-500/10 border-atmo-500/40 text-atmo-500 hover:bg-atmo-500/10',
  score:   'bg-score-400/10 border-score-400/40 text-score-400 hover:bg-score-400/10',
  neutral: 'bg-muted border-border text-muted-foreground hover:bg-muted',
  win:     'bg-win-500/10 border-win-500/40 text-win-500 hover:bg-win-500/10',
}

export default function StatCard({ label, value, sub, accent = 'neutral', valueSuffix, suffixColor, badge }: StatCardProps) {
  const textClass = ACCENT_CLASSES[accent]
  const badgeClass = BADGE_CLASSES[accent]

  return (
    <Card className="panel-hover flex flex-row items-center justify-between gap-3 px-5 py-3.5">
      <CardContent className="p-0 flex flex-row items-center justify-between gap-3 w-full">
        <span className="font-body text-[0.72rem] font-medium text-[var(--text-4)] tracking-[0.06em] uppercase whitespace-nowrap">
          {label}
        </span>
        <span className="flex flex-row items-baseline gap-1.5 shrink-0">
          {badge ? (
            <Badge variant="outline" className={cn('font-mono text-[0.9rem] font-bold px-2.5 py-[3px]', badgeClass)}>
              {value}
              {valueSuffix && (
                <span className="ml-1" style={suffixColor ? { color: suffixColor } : undefined}>
                  {valueSuffix}
                </span>
              )}
            </Badge>
          ) : (
            <span className={cn('font-mono text-[0.9rem] font-bold', textClass)}>
              {value}
              {valueSuffix && (
                <span className="ml-1 font-mono text-[0.9rem] font-bold" style={suffixColor ? { color: suffixColor } : undefined}>
                  {valueSuffix}
                </span>
              )}
            </span>
          )}
          {sub && (
            <span className="font-body text-[0.72rem] text-[var(--text-4)]">{sub}</span>
          )}
        </span>
      </CardContent>
    </Card>
  )
}
