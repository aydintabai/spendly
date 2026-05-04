'use client'

import { useEffect, useRef, useState } from 'react'
import type { Profile } from '@/types'
import { useUpdateProfile } from '@/hooks/useSettings'
import { cn } from '@/lib/utils'

interface ProfileFormProps {
  profile: Profile | null
  userEmail: string
}

type FormStatus = 'idle' | 'saving' | 'success' | 'email-pending' | 'error'

const CARD_STYLE: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid rgba(28,28,30,0.08)',
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(28,28,30,0.06), 0 2px 12px rgba(28,28,30,0.04)',
  padding: 24,
}

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: '#a09890',
  marginBottom: 6,
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  height: 36,
  padding: '0 10px',
  fontSize: 13,
  color: '#1c1c1e',
  background: '#ffffff',
  border: '1px solid rgba(28,28,30,0.12)',
  borderRadius: 7,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

export function ProfileForm({ profile, userEmail }: ProfileFormProps) {
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [email, setEmail] = useState(userEmail)
  const [status, setStatus] = useState<FormStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [focusedField, setFocusedField] = useState<'name' | 'email' | null>(null)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { mutate } = useUpdateProfile()

  useEffect(() => {
    setFullName(profile?.full_name ?? '')
  }, [profile?.full_name])

  useEffect(() => {
    setEmail(userEmail)
  }, [userEmail])

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    }
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    setErrorMessage('')
    mutate(
      { fullName, email, currentEmail: userEmail },
      {
        onSuccess: ({ emailChanged }) => {
          setStatus(emailChanged ? 'email-pending' : 'success')
          resetTimerRef.current = setTimeout(() => setStatus('idle'), 3000)
        },
        onError: (err) => {
          setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
          setStatus('error')
        },
      },
    )
  }

  const inputStyle = (field: 'name' | 'email'): React.CSSProperties => ({
    ...INPUT_STYLE,
    borderColor: focusedField === field ? '#65a380' : 'rgba(28,28,30,0.12)',
    boxShadow: focusedField === field ? '0 0 0 3px rgba(101,163,128,0.12)' : 'none',
  })

  return (
    <div style={CARD_STYLE}>
      <p style={{ fontSize: 15, fontWeight: 600, color: '#1c1c1e', marginBottom: 4 }}>Profile</p>
      <p style={{ fontSize: 13, color: '#6b6560', marginBottom: 20 }}>Update your display name and email address.</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label htmlFor="full-name" style={LABEL_STYLE}>Full Name</label>
          <input
            id="full-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
            placeholder="Your name"
            style={inputStyle('name')}
            disabled={status === 'saving'}
          />
        </div>

        <div>
          <label htmlFor="email" style={LABEL_STYLE}>Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            placeholder="you@example.com"
            style={inputStyle('email')}
            disabled={status === 'saving'}
          />
        </div>

        {(status === 'success' || status === 'email-pending') && (
          <div
            style={{
              background: 'rgba(101,163,128,0.08)',
              border: '1px solid rgba(101,163,128,0.25)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              color: '#3d7a5c',
            }}
          >
            {status === 'email-pending'
              ? 'Confirmation email sent — check your inbox to verify the new address.'
              : 'Profile updated successfully.'}
          </div>
        )}

        {status === 'error' && (
          <div
            style={{
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              color: '#dc2626',
            }}
          >
            {errorMessage}
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={status === 'saving'}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-all',
              status === 'saving'
                ? 'cursor-not-allowed bg-[rgba(101,163,128,0.1)] text-[#65a380]'
                : 'bg-[#65a380] text-white hover:bg-[#5a9271] active:bg-[#4f8264]',
            )}
            style={{
              boxShadow: status === 'saving' ? 'none' : '0 2px 8px rgba(101,163,128,0.25)',
            }}
          >
            {status === 'saving' ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
                  <path d="M7 1.5A5.5 5.5 0 0112.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
