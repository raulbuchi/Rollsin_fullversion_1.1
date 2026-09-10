
"use client"

import { useAuth } from '@/lib/store'
import { DashboardSidebar, SidebarContent } from '@/components/dashboard-sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useUser } from '@/firebase'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import Image from 'next/image'
import { PlaceHolderImages } from '@/lib/placeholder-images'
import { cn } from '@/lib/utils'
import { PWAInstallButton } from '@/components/PWAInstallButton'

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user: localUser, isLoading: isLocalLoading } = useAuth()
  const { user: firebaseUser, isUserLoading: isFirebaseLoading } = useUser()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const logoImg = PlaceHolderImages.find(img => img.id === 'gp-logo')

  const isLoading = isLocalLoading && isFirebaseLoading
  const activeUser = localUser || (firebaseUser ? { id: firebaseUser.uid, name: firebaseUser.email?.split('@')[0] || 'Usuário', email: firebaseUser.email || '', role: 'Admin' as const, restaurantId: 'gp-001' } : null)

  useEffect(() => {
    if (!isLoading && !activeUser) {
      router.push('/login')
    }
  }, [activeUser, isLoading, router])

  if (isLoading || !activeUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className={cn("h-full hidden md:block transition-all duration-300", isCollapsed ? "w-20" : "w-64")} />
        <div className="flex-1 p-8 space-y-4">
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar for Desktop */}
      <DashboardSidebar role={activeUser.role} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b bg-card sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-primary">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <SidebarContent role={activeUser.role} onItemClick={() => setIsMobileMenuOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="w-8 h-8 relative">
              <Image
                src={logoImg?.imageUrl || 'https://picsum.photos/seed/rollsin-logo/400/400'}
                alt="Rolls-In"
                fill
                className="object-contain"
              />
            </div>
          </div>
          <span className="font-bold text-xs text-primary font-headline tracking-tight uppercase">ROLLS-IN</span>
          <div className="flex items-center gap-2">
            <PWAInstallButton className="text-[11px] h-7 px-2" />
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-secondary-foreground">
              {activeUser.role[0]}
            </div>
          </div>
        </header>

        <main className={cn("flex-1 p-4 md:p-8 overflow-y-auto mb-16 md:mb-0 transition-all duration-300", isCollapsed ? "md:ml-20" : "md:ml-64")}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardContent>{children}</DashboardContent>
}
