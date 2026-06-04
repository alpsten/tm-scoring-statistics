import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function AdminLogin() {
  const { signIn, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) navigate('/admin')
  }, [user, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError(error)
    } else {
      navigate('/admin')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-[360px]">
        <div className="text-center mb-9">
          <div className="font-display font-bold text-[1.2rem] text-[#ece6ff] mb-1.5">
            Terraforming Mars
          </div>
          <div className="font-mono text-[0.65rem] tracking-[0.15em] text-[#504270] uppercase">
            Admin access
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#282042] border border-[#3e325e] rounded-lg px-7 py-7"
        >
          <div className="mb-[18px]">
            <label className="block font-body text-[0.72rem] font-medium tracking-[0.06em] uppercase text-[#625c7c] mb-1.5">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="bg-[#171228] border-[#3e325e] text-[#ece6ff] text-[0.87rem]"
            />
          </div>
          <div className="mb-6">
            <label className="block font-body text-[0.72rem] font-medium tracking-[0.06em] uppercase text-[#625c7c] mb-1.5">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="bg-[#171228] border-[#3e325e] text-[#ece6ff] text-[0.87rem]"
            />
          </div>

          {error && (
            <div className="mb-4 px-3.5 py-2.5 bg-mars-500/8 border border-mars-500/20 rounded font-body text-[0.78rem] text-mars-500">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full font-body font-semibold text-[0.88rem] tracking-[0.03em]"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
