interface AuthLayoutProps {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Spendly</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your AI-powered finance dashboard
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
