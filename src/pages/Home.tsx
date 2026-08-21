import { Link } from 'react-router-dom'

// The landing page — kept deliberately sparse. The sidebar logo already
// establishes the "Terraforming" (small) / "Mars" (large) stacked title
// treatment in mars-500; this just reuses that same language at hero scale
// instead of inventing a new one.
export default function Home() {
  return (
    // 62px is the footer's own rendered height (border + padding + one line of text) — subtracting
    // it keeps hero + footer together at exactly one viewport, so the footer is visible without
    // scrolling instead of sitting just past the fold.
    <div className="page-enter min-h-[calc(100vh-62px)] flex items-center justify-center px-9">
      <div className="text-center">
        <div className="font-display text-[0.75rem] tracking-[0.35em] text-[var(--text-4)] uppercase mb-5">
          Mission Log
        </div>
        <h1 className="font-display font-bold uppercase text-mars-500 m-0">
          <span className="block text-[1.9rem] sm:text-[2.6rem] tracking-[0.1em] leading-none">
            Terraforming
          </span>
          <span className="block text-[5.5rem] sm:text-[7.5rem] leading-[0.92]">
            Mars
          </span>
        </h1>
        <div className="font-display font-semibold uppercase tracking-[0.18em] text-[1.15rem] sm:text-[1.4rem] text-foreground mt-3">
          Scoring Statistics
        </div>
        <p className="font-body text-[0.95rem] text-[var(--text-4)] max-w-[440px] mx-auto mt-6 leading-relaxed">
          Match records, player and corporation stats, and tournament results, all tracked in one place.
        </p>
        <Link
          to="/overview"
          className="inline-block mt-9 font-display font-bold uppercase tracking-[0.08em] text-[0.9rem] text-[#1a0a00] bg-mars-500 hover:bg-mars-400 transition-colors rounded px-7 py-3 no-underline"
        >
          Welcome
        </Link>
      </div>
    </div>
  )
}
