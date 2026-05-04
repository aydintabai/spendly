interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden w-64 flex-col border-r bg-sidebar md:flex">
        <div className="flex h-16 items-center border-b px-6">
          <span className="text-lg font-semibold text-sidebar-foreground">Spendly</span>
        </div>
        <nav className="flex-1 p-4">
          <p className="text-sm text-sidebar-foreground/60">Sidebar — Step 6.</p>
        </nav>
      </aside>
      <main className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  )
}
