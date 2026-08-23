import { Link } from 'react-router-dom'
import terraformingMarsLogo from '../assets/terraforming-mars-logo.png'
import scoringStatisticsLogo from '../assets/scoring-statistics-logo.png'

// The landing page — kept deliberately sparse.
export default function Home() {
  return (
    // 62px is the footer's own rendered height (border + padding + one line of text) — subtracting
    // it keeps hero + footer together at exactly one viewport, so the footer is visible without
    // scrolling instead of sitting just past the fold.
    <div className="page-enter min-h-[calc(100vh-62px)] flex items-center justify-center px-9">
      <div className="text-center">
        <img
          src={terraformingMarsLogo}
          alt="Terraforming Mars"
          className="mx-auto w-full max-w-[640px] sm:max-w-[1080px] h-auto"
        />
        <img
          src={scoringStatisticsLogo}
          alt="Scoring Statistics"
          className="mx-auto w-full max-w-[480px] sm:max-w-[810px] h-auto mt-2"
        />
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
