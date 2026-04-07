import { Link } from 'react-router-dom'
import PageHeader from '../../components/ui/PageHeader'
import { useAuth } from '../../context/useAuth'

export default function AdminDashboard() {
  const { user } = useAuth()

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <PageHeader
        title="Admin"
        subtitle={`Signed in as ${user?.email}`}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', maxWidth: '600px' }}>
        <Link
          to="/admin/games/new"
          style={{
            display: 'block',
            padding: '24px',
            background: '#1e1835',
            border: '1px solid rgba(224, 85, 53, 0.2)',
            borderRadius: '6px',
            textDecoration: 'none',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(224, 85, 53, 0.4)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(224, 85, 53, 0.2)')}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.4rem', color: '#e05535', marginBottom: '8px' }}>＋</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.92rem', color: '#ece6ff', marginBottom: '4px' }}>Add game</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#625c7c' }}>Log a new game session with players, scores, and cards</div>
        </Link>

        <Link
          to="/admin/cards/reference"
          style={{
            display: 'block',
            padding: '24px',
            background: '#1e1835',
            border: '1px solid #282042',
            borderRadius: '6px',
            textDecoration: 'none',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(46, 139, 139, 0.3)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = '#282042')}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.4rem', color: '#2e8b8b', marginBottom: '8px' }}>▣</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.92rem', color: '#ece6ff', marginBottom: '4px' }}>Card reference</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: '#625c7c' }}>Manage the card database — tags, types, expansions</div>
        </Link>
      </div>

      {!import.meta.env.VITE_SUPABASE_URL && (
        <div style={{ marginTop: '32px', padding: '18px 20px', background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', maxWidth: '600px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.08em', color: '#504270', marginBottom: '10px', textTransform: 'uppercase' }}>
            Setup required
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: '#625c7c', margin: 0, lineHeight: 1.6 }}>
            Add <code style={{ background: '#171228', padding: '2px 6px', borderRadius: '3px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#ece6ff' }}>VITE_SUPABASE_URL</code> and{' '}
            <code style={{ background: '#171228', padding: '2px 6px', borderRadius: '3px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#ece6ff' }}>VITE_SUPABASE_ANON_KEY</code> to{' '}
            <code style={{ background: '#171228', padding: '2px 6px', borderRadius: '3px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#ece6ff' }}>.env.local</code> to connect to Supabase.
            Until then, the public site shows mock data.
          </p>
        </div>
      )}
    </div>
  )
}
