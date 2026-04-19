import React from 'react'

interface SectionHeadingProps {
  children: React.ReactNode
}

export default function SectionHeading({ children }: SectionHeadingProps) {
  return (
    <h2 className="font-display font-semibold text-[0.82rem] tracking-[0.1em] uppercase text-[var(--text-4)] mb-[14px]">
      {children}
    </h2>
  )
}
