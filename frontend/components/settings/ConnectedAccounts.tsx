'use client'

import { useState } from 'react'
import type { Account } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'

interface ConnectedAccountsProps {
  accounts: Account[]
  isLoading: boolean
}

const CARD_STYLE: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid rgba(28,28,30,0.08)',
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(28,28,30,0.06), 0 2px 12px rgba(28,28,30,0.04)',
  padding: 24,
}

export function ConnectedAccounts({ accounts, isLoading }: ConnectedAccountsProps) {
  const [showComingSoon, setShowComingSoon] = useState(false)

  return (
    <div style={CARD_STYLE}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#1c1c1e', marginBottom: 4 }}>Connected Accounts</p>
          <p style={{ fontSize: 13, color: '#6b6560' }}>Your linked bank accounts and balances.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <button
            onClick={() => setShowComingSoon(true)}
            style={{
              height: 34,
              padding: '0 14px',
              fontSize: 13,
              fontWeight: 500,
              color: '#1c1c1e',
              background: '#ffffff',
              border: '1px solid rgba(28,28,30,0.14)',
              borderRadius: 8,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f3ee')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
          >
            Connect Bank Account
          </button>
          {showComingSoon && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(234,179,8,0.08)',
                border: '1px solid rgba(234,179,8,0.25)',
                borderRadius: 8,
                padding: '7px 10px',
                fontSize: 12,
                color: '#92710a',
                maxWidth: 260,
              }}
            >
              <span>Plaid bank connection coming soon — available in Step 16.</span>
              <button
                onClick={() => setShowComingSoon(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92710a', padding: 0, lineHeight: 1, flexShrink: 0 }}
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : accounts.length === 0 ? (
        <EmptyState />
      ) : (
        <AccountList accounts={accounts} />
      )}
    </div>
  )
}

function SkeletonRows() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Skeleton style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton style={{ height: 13, width: '40%' }} />
            <Skeleton style={{ height: 11, width: '25%' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <Skeleton style={{ height: 13, width: 64 }} />
            <Skeleton style={{ height: 11, width: 40 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 10 }}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="3" y="9" width="26" height="18" rx="3" stroke="#a09890" strokeWidth="1.5" />
        <path d="M3 14h26" stroke="#a09890" strokeWidth="1.5" />
        <path d="M8 19h4" stroke="#a09890" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="3" y="5" width="26" height="4" rx="1.5" stroke="#a09890" strokeWidth="1.5" />
      </svg>
      <p style={{ fontSize: 14, fontWeight: 500, color: '#6b6560', margin: 0 }}>No accounts connected</p>
      <p style={{ fontSize: 12, color: '#a09890', margin: 0, textAlign: 'center', maxWidth: 220 }}>
        Connect your bank account to start tracking balances.
      </p>
    </div>
  )
}

function AccountList({ accounts }: { accounts: Account[] }) {
  return (
    <div>
      {accounts.map((account, index) => (
        <div key={account.id}>
          <AccountRow account={account} />
          {index < accounts.length - 1 && <Separator style={{ margin: '0' }} />}
        </div>
      ))}
    </div>
  )
}

function AccountRow({ account }: { account: Account }) {
  const initial = (account.institution_name ?? account.name).charAt(0).toUpperCase()
  const balance = account.current_balance
    ? formatCurrency(parseFloat(account.current_balance), account.currency_code)
    : '—'
  const typeLabel = [account.institution_name, account.type]
    .filter(Boolean)
    .join(' · ')

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: 'rgba(101,163,128,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 600,
          color: '#3d7a5c',
          flexShrink: 0,
        }}
      >
        {initial}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: '#1c1c1e', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {account.name}
        </p>
        {typeLabel && (
          <p style={{ fontSize: 11, color: '#a09890', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {typeLabel}
          </p>
        )}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: '#1c1c1e', margin: 0, fontFamily: 'var(--font-mono)' }}>
          {balance}
        </p>
        {account.mask && (
          <p style={{ fontSize: 11, color: '#a09890', margin: '2px 0 0' }}>····{account.mask}</p>
        )}
      </div>
    </div>
  )
}
