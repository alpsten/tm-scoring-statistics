interface EmptyStateProps {
  message: string
}

export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="bg-[var(--bg-panel)] border border-[var(--bd-panel)] rounded-[6px] p-8 text-center font-body text-[0.83rem] text-[var(--text-4)]">
      {message}
    </div>
  )
}
