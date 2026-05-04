'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usePlaidLink } from 'react-plaid-link'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'

export const settingsKeys = {
  profile: ['profile'] as const,
  accounts: ['accounts'] as const,
}

export function useProfile() {
  return useQuery({
    queryKey: settingsKeys.profile,
    queryFn: api.auth.me,
    staleTime: 60_000,
  })
}

export function useAccounts() {
  return useQuery({
    queryKey: settingsKeys.accounts,
    queryFn: api.accounts.list,
    staleTime: 60_000,
  })
}

interface UpdateProfileVars {
  fullName: string
  email: string
  currentEmail: string
}

type PlaidLinkStatus = 'idle' | 'loading' | 'ready' | 'connecting' | 'success' | 'error'

export function usePlaidConnect() {
  const queryClient = useQueryClient()
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [status, setStatus] = useState<PlaidLinkStatus>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (public_token, metadata) => {
      setStatus('connecting')
      try {
        await api.plaid.exchangeToken({
          public_token,
          institution_id: metadata.institution?.institution_id ?? null,
          institution_name: metadata.institution?.name ?? null,
        })
        await api.plaid.sync()
        queryClient.invalidateQueries({ queryKey: settingsKeys.accounts })
        setStatus('success')
        setStatusMessage('Bank account connected successfully.')
        resetTimerRef.current = setTimeout(() => {
          setStatus('idle')
          setLinkToken(null)
        }, 3000)
      } catch (err) {
        setStatus('error')
        setStatusMessage(err instanceof Error ? err.message : 'Failed to connect account.')
      }
    },
    onExit: (err) => {
      if (err) {
        setStatus('error')
        setStatusMessage(err.display_message ?? 'Connection cancelled.')
      } else {
        // User dismissed intentionally — reset so they can try again
        setStatus('idle')
        setLinkToken(null)
      }
    },
  })

  // Auto-open once token is set and Link iframe has loaded
  useEffect(() => {
    if (status === 'ready' && ready && linkToken) open()
  }, [status, ready, linkToken, open])

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    }
  }, [])

  const handleConnect = useCallback(async () => {
    if (status === 'ready' && ready) {
      open()
      return
    }
    setStatus('loading')
    try {
      const { link_token } = await api.plaid.createLinkToken()
      setLinkToken(link_token)
      setStatus('ready')
    } catch (err) {
      setStatus('error')
      setStatusMessage(err instanceof Error ? err.message : 'Failed to initialize bank connection.')
    }
  }, [status, ready, open])

  return {
    handleConnect,
    status,
    statusMessage,
    isLoading: status === 'loading' || status === 'connecting',
  }
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ fullName, email, currentEmail }: UpdateProfileVars) => {
      const emailChanged = email.trim() !== currentEmail.trim()
      const supabase = createClient()

      if (emailChanged) {
        const { error } = await supabase.auth.updateUser({ email: email.trim() })
        if (error) throw new Error(error.message)
      }

      const trimmedName = fullName.trim() || undefined
      await Promise.all([
        api.auth.updateProfile({ full_name: trimmedName }),
        supabase.auth.updateUser({ data: { full_name: trimmedName ?? null } }),
      ])

      return { emailChanged }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.profile })
    },
  })
}
