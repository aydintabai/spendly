interface AuthLayoutProps {
  children: React.ReactNode
}

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 mt-0.5">
    <circle cx="7" cy="7" r="7" fill="rgba(101,163,128,0.15)" />
    <path d="M4 7l2 2 4-4" stroke="#65a380" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const FEATURES = [
  'Connect your bank accounts securely via Plaid',
  'Chat with your spending data in plain English',
  'Get AI-powered insights on your finances',
]

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Branded left panel — desktop only */}
      <div
        className="hidden md:flex flex-col justify-between flex-shrink-0 p-10"
        style={{ width: 420, background: '#f2ede6', borderRight: '1px solid rgba(28,28,30,0.08)' }}
      >
        <div>
          {/* Logo */}
          <div className="flex items-center gap-[10px] mb-12">
            <div
              className="flex items-center justify-center rounded-[9px] text-white font-bold text-base shrink-0"
              style={{
                width: 36,
                height: 36,
                background: '#65a380',
                boxShadow: '0 2px 12px rgba(101,163,128,0.3)',
              }}
            >
              S
            </div>
            <span className="font-bold text-[19px] text-[#1c1c1e]">Spendly</span>
          </div>

          {/* Headline */}
          <h2 className="text-[28px] font-bold text-[#1c1c1e] leading-tight mb-3">
            Your finances,<br />finally clear.
          </h2>
          <p className="text-sm text-[#6b6560] mb-10 leading-relaxed">
            Connect your accounts and let AI make sense of your money.
          </p>

          {/* Features */}
          <ul className="flex flex-col gap-4">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm text-[#1c1c1e]">
                <CheckIcon />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom footnote */}
        <p className="text-[11px] text-[#a09890]">
          Bank-level encryption · Read-only access · No credentials stored
        </p>
      </div>

      {/* Right panel — form area */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background p-6">
        {/* Mobile logo — shown only when left panel is hidden */}
        <div className="flex md:hidden flex-col items-center gap-3 mb-8">
          <div
            className="flex items-center justify-center rounded-[9px] text-white font-bold text-base"
            style={{
              width: 36,
              height: 36,
              background: '#65a380',
              boxShadow: '0 2px 12px rgba(101,163,128,0.3)',
            }}
          >
            S
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-[#1c1c1e]">Spendly</h1>
            <p className="text-sm text-[#6b6560]">Your AI-powered finance dashboard</p>
          </div>
        </div>

        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
