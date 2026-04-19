interface PositionBadgeProps {
  position: number
}

const PLACE_LABELS = ['', '', '2ND', '3RD', '4TH', '5TH']

export default function PositionBadge({ position }: PositionBadgeProps) {
  if (position === 1) {
    return (
      <span className="inline-block font-mono text-[0.68rem] font-bold tracking-[0.05em] uppercase text-[#4a9e6b] bg-[rgba(74,158,107,0.12)] border border-[rgba(74,158,107,0.35)] rounded px-[7px] py-[2px]">
        WINNER
      </span>
    )
  }

  const label = PLACE_LABELS[position] ?? `${position}TH`

  return (
    <span className="inline-block font-mono text-[0.68rem] font-semibold tracking-[0.04em] text-[#e05535] bg-[rgba(224,85,53,0.1)] border border-[rgba(224,85,53,0.3)] rounded px-[7px] py-[2px]">
      {label} PLACE
    </span>
  )
}
