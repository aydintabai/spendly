import { Sidebar } from '@/components/layout/Sidebar'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
