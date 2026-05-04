'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ fullName, email, currentEmail }: UpdateProfileVars) => {
      const emailChanged = email.trim() !== currentEmail.trim()

      if (emailChanged) {
        const supabase = createClient()
        const { error } = await supabase.auth.updateUser({ email: email.trim() })
        if (error) throw new Error(error.message)
      }

      await api.auth.updateProfile({ full_name: fullName.trim() || undefined })

      return { emailChanged }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.profile })
    },
  })
}
