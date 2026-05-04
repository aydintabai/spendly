'use client'

import { useAuth } from '@/hooks/useAuth'
import { useProfile, useAccounts } from '@/hooks/useSettings'
import { ProfileForm } from '@/components/settings/ProfileForm'
import { ConnectedAccounts } from '@/components/settings/ConnectedAccounts'
import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsPage() {
  const { user } = useAuth()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const { data: accounts, isLoading: accountsLoading } = useAccounts()

  return (
    <div className="py-7">
      <div className="px-8 mb-6">
        <h1
          className="text-[#1c1c1e]"
          style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px' }}
        >
          Settings
        </h1>
        <p className="text-[13px] text-[#6b6560] mt-0.5">Manage your profile and connected accounts.</p>
      </div>

      <div className="px-8" style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {profileLoading ? (
          <ProfileFormSkeleton />
        ) : (
          <ProfileForm profile={profile ?? null} userEmail={user?.email ?? ''} />
        )}
        <ConnectedAccounts accounts={accounts ?? []} isLoading={accountsLoading} />
      </div>
    </div>
  )
}

function ProfileFormSkeleton() {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid rgba(28,28,30,0.08)',
        borderRadius: 12,
        boxShadow: '0 1px 4px rgba(28,28,30,0.06), 0 2px 12px rgba(28,28,30,0.04)',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <Skeleton style={{ height: 20, width: 80 }} />
      <Skeleton style={{ height: 13, width: 200 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Skeleton style={{ height: 11, width: 64 }} />
        <Skeleton style={{ height: 36, width: '100%' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Skeleton style={{ height: 11, width: 48 }} />
        <Skeleton style={{ height: 36, width: '100%' }} />
      </div>
      <Skeleton style={{ height: 36, width: 120 }} />
    </div>
  )
}
