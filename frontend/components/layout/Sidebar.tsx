'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useSettings'

const DashboardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
    <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.4" />
    <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.4" />
    <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.7" />
  </svg>
)

const TransactionsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="3.5" width="14" height="1.5" rx="0.75" fill="currentColor" />
    <rect x="1" y="7.25" width="10" height="1.5" rx="0.75" fill="currentColor" opacity="0.6" />
    <rect x="1" y="11" width="7" height="1.5" rx="0.75" fill="currentColor" opacity="0.35" />
  </svg>
)

const ChatIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H5.5L2 14V3z"
      fill="currentColor"
      opacity="0.85"
    />
  </svg>
)

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2" fill="currentColor" />
    <circle cx="8" cy="2" r="1" fill="currentColor" opacity="0.6" />
    <circle cx="8" cy="14" r="1" fill="currentColor" opacity="0.6" />
    <circle cx="2" cy="8" r="1" fill="currentColor" opacity="0.6" />
    <circle cx="14" cy="8" r="1" fill="currentColor" opacity="0.6" />
    <circle cx="3.757" cy="3.757" r="1" fill="currentColor" opacity="0.6" />
    <circle cx="12.243" cy="12.243" r="1" fill="currentColor" opacity="0.6" />
    <circle cx="12.243" cy="3.757" r="1" fill="currentColor" opacity="0.6" />
    <circle cx="3.757" cy="12.243" r="1" fill="currentColor" opacity="0.6" />
  </svg>
)

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { href: '/transactions', label: 'Transactions', icon: <TransactionsIcon /> },
  { href: '/chat', label: 'AI Chat', icon: <ChatIcon /> },
  { href: '/settings', label: 'Settings', icon: <SettingsIcon /> },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, signOut, loading } = useAuth()
  const { data: profile } = useProfile()

  const initials = user?.email?.slice(0, 1).toUpperCase() ?? 'U'
  const displayName = profile?.full_name ?? user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'User'
  const displayEmail = user?.email ?? ''

  return (
    <aside
      className="hidden md:flex flex-col flex-shrink-0 border-r"
      style={{ width: 224, background: '#f2ede6', borderColor: 'rgba(28,28,30,0.08)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-[10px] px-5 pt-5 pb-4">
        <div
          className="flex items-center justify-center rounded-[9px] text-white font-bold text-base shrink-0"
          style={{
            width: 32,
            height: 32,
            background: '#65a380',
            boxShadow: '0 2px 12px rgba(101,163,128,0.3)',
          }}
        >
          S
        </div>
        <span className="font-bold text-[17px] text-[#1c1c1e]">Spendly</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-3 flex-1">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-[10px] rounded-lg px-[10px] py-2 transition-colors',
                isActive
                  ? 'text-[#65a380]'
                  : 'text-[#6b6560] hover:bg-[#f0ebe3] hover:text-[#1c1c1e]',
              )}
              style={
                isActive
                  ? {
                      background: 'rgba(101,163,128,0.1)',
                      fontSize: 13.5,
                      fontWeight: 500,
                    }
                  : { fontSize: 13.5, fontWeight: 500 }
              }
            >
              {icon}
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User area */}
      <div className="px-3 pb-5 pt-3 border-t" style={{ borderColor: 'rgba(28,28,30,0.08)' }}>
        <div className="flex items-center gap-[10px] px-[10px] py-2">
          <div
            className="flex items-center justify-center rounded-full text-white text-[11px] font-bold shrink-0"
            style={{
              width: 32,
              height: 32,
              background: 'linear-gradient(135deg, #65a380, #86c9a0)',
            }}
          >
            {initials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-medium text-[#1c1c1e] truncate">{displayName}</span>
            <span className="text-[11px] text-[#a09890] truncate">{displayEmail}</span>
          </div>
        </div>
        <button
          onClick={() => void signOut()}
          disabled={loading}
          className="mt-1 w-full flex items-center gap-[10px] px-[10px] py-2 rounded-lg text-[13px] text-[#6b6560] hover:bg-[#f0ebe3] hover:text-[#1c1c1e] transition-colors disabled:opacity-40"
          style={{ fontWeight: 500 }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M5 12H3a1 1 0 01-1-1V3a1 1 0 011-1h2M9.5 9.5L12 7l-2.5-2.5M12 7H5.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  )
}
