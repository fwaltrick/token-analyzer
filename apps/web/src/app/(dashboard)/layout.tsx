import { Sidebar } from '@/components/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar className="hidden md:flex" />
      <main className="flex-1 overflow-auto">
        <div className="md:hidden p-4 border-b">
          <Sidebar className="md:hidden" />
        </div>
        {children}
      </main>
    </div>
  )
}
