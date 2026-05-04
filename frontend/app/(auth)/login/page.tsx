'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div
      className="rounded-2xl bg-white p-8"
      style={{
        border: '1px solid rgba(28,28,30,0.08)',
        boxShadow: '0 1px 4px rgba(28,28,30,0.06), 0 2px 12px rgba(28,28,30,0.04)',
      }}
    >
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#1c1c1e]">Welcome back</h1>
        <p className="mt-1 text-sm text-[#6b6560]">Sign in to your Spendly account</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-[11px] font-semibold tracking-[0.06em] text-[#6b6560] uppercase">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="focus-visible:ring-[#65a380]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-[11px] font-semibold tracking-[0.06em] text-[#6b6560] uppercase">
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            className="focus-visible:ring-[#65a380]"
          />
        </div>

        <Button
          type="submit"
          className="w-full mt-1 text-white font-medium"
          disabled={loading}
          style={{ background: '#65a380' }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-[#6b6560]">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-medium text-[#65a380] underline-offset-4 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  )
}
