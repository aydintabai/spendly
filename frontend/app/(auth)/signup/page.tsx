'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
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
    const { data, error: authError } = await supabase.auth.signUp({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (!data.user) {
      setError('Sign up succeeded but no user was returned. Please try again.')
      setLoading(false)
      return
    }

    try {
      await api.auth.createProfile({
        id: data.user.id,
        email: data.user.email ?? email,
        full_name: fullName.trim() || undefined,
      })
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 409)) {
        setError('Account created but profile setup failed. Please contact support.')
        setLoading(false)
        return
      }
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
        <h1 className="text-xl font-semibold text-[#1c1c1e]">Create your account</h1>
        <p className="mt-1 text-sm text-[#6b6560]">Start tracking your finances with AI</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="full-name" className="text-[11px] font-semibold tracking-[0.06em] text-[#6b6560] uppercase">
            Full name <span className="normal-case font-normal tracking-normal">(optional)</span>
          </label>
          <Input
            id="full-name"
            type="text"
            autoComplete="name"
            placeholder="Jane Smith"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={loading}
            className="focus-visible:ring-[#65a380]"
          />
        </div>

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
            autoComplete="new-password"
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
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-[#6b6560]">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-[#65a380] underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
