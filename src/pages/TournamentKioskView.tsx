import { useParams } from 'react-router-dom'
import { TournamentDetailBody } from './TournamentDetail'

// Rendered outside the normal sidebar Layout (see App.tsx) — a link to hand
// out to players that shows only Standings and Rounds, nothing else on the
// site to navigate to.
export default function TournamentKioskView() {
  const { id = '' } = useParams<{ id: string }>()
  return <TournamentDetailBody tournamentId={id} showBackLink={false} />
}
