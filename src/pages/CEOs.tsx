import PageHeader from '../components/ui/PageHeader'
import { useCEOStats } from '../lib/hooks'

export default function CEOs() {
  const { data: ceos = [], isLoading } = useCEOStats()

  const thStyle: React.CSSProperties = {
    padding: '8px 14px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.62rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#504270',
    fontWeight: 400,
    borderBottom: '1px solid #282042',
  }

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <PageHeader title="CEOs" subtitle={ceos.length > 0 ? `${ceos.length} CEOs played` : 'CEO expansion statistics'} />

      {/* TODO notice */}
      <div style={{
        marginBottom: '28px',
        padding: '10px 14px',
        background: 'rgba(201,160,48,0.06)',
        border: '1px solid rgba(201,160,48,0.2)',
        borderRadius: '4px',
        fontFamily: 'var(--font-body)',
        fontSize: '0.78rem',
        color: '#c9a030',
      }}>
        TODO — More CEO stats planned: win rate per CEO, pick rate by expansion.
      </div>

      {isLoading ? (
        <div style={{ color: '#625c7c', fontFamily: 'var(--font-body)' }}>Loading…</div>
      ) : ceos.length === 0 ? (
        <div style={{ color: '#504270', fontFamily: 'var(--font-body)', fontSize: '0.83rem' }}>No CEO data logged yet.</div>
      ) : (
        <div style={{ background: '#1e1835', border: '1px solid #282042', borderRadius: '6px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'center', width: '36px' }}>#</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>CEO</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Played</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Wins</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {ceos.map((c, i) => {
                const winColor = c.win_rate >= 50 ? '#4a9e6b' : c.win_rate > 0 ? '#c9a030' : '#625c7c'
                return (
                  <tr
                    key={c.ceo_name}
                    style={{ borderBottom: '1px solid #1e1835' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#171228')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#504270', textAlign: 'center' }}>
                      {i + 1}
                    </td>
                    <td style={{ padding: '9px 14px', fontFamily: 'var(--font-body)', fontSize: '0.87rem', color: '#ece6ff' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: '#d07832', background: 'rgba(210,120,50,0.1)', border: '1px solid rgba(210,120,50,0.3)', borderRadius: '4px', padding: '1px 7px', marginRight: '8px' }}>
                        CEO
                      </span>
                      {c.ceo_name}
                    </td>
                    <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.87rem', color: '#bbb4d0', textAlign: 'center' }}>
                      {c.times_played}
                    </td>
                    <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.87rem', color: '#4a9e6b', textAlign: 'center' }}>
                      {c.wins}
                    </td>
                    <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.87rem', color: winColor, textAlign: 'center' }}>
                      {c.win_rate.toFixed(0)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
