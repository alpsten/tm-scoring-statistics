interface PositionBadgeProps {
  position: number
}

const PLACE_LABELS = ['', '', '2ND', '3RD', '4TH', '5TH']

export default function PositionBadge({ position }: PositionBadgeProps) {
  if (position === 1) {
    return (
      <span className="inline-block font-mono text-[0.68rem] font-bold tracking-[0.05em] uppercase text-win-500 bg-win-500/10 border border-win-500/30 rounded px-[7px] py-[2px]">
        WINNER
      </span>
    )
  }

  const label = PLACE_LABELS[position] ?? `${position}TH`

  return (
    <span className="inline-block font-mono text-[0.68rem] font-semibold tracking-[0.04em] text-mars-500 bg-mars-500/10 border border-mars-500/30 rounded px-[7px] py-[2px]">
      {label} PLACE
    </span>
  )
}
