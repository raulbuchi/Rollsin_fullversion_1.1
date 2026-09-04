
"use client"

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  ChefHat, 
  ShoppingCart, 
  BarChart3, 
  LogOut,
  Package,
  Table as TableIcon,
  ClipboardCheck,
  Settings,
  CalendarDays,
  Shirt,
  Box,
  Trash2,
  ListTodo,
  FileText,
  ChevronLeft,
  ChevronRight,
  ShoppingBag
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserRole } from '@/lib/store'
import { PlaceHolderImages } from '@/lib/placeholder-images'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from './LanguageSwitcher'
import { PWAInstallButton } from './PWAInstallButton'

interface NavItem {
  titleKey: string
  href: string
  icon: React.ReactNode
  roles: UserRole[]
}

const navItems: NavItem[] = [
  {
    titleKey: 'sidebar.nav.dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5 shrink-0" />,
    roles: ['Admin', 'Chefe', 'Apoio', 'Serviço', 'Caixa', 'Barman', 'Horista', 'Passe']
  },
  {
    titleKey: 'sidebar.nav.production',
    href: '/dashboard/production',
    icon: <ListTodo className="w-5 h-5 shrink-0" />,
    roles: ['Admin', 'Chefe']
  },
  {
    titleKey: 'sidebar.nav.inventory',
    href: '/dashboard/inventory',
    icon: <Package className="w-5 h-5 shrink-0" />,
    roles: ['Admin', 'Chefe']
  },
  {
    titleKey: 'sidebar.nav.materials',
    href: '/dashboard/materials',
    icon: <Box className="w-5 h-5 shrink-0" />,
    roles: ['Admin', 'Chefe']
  },
  {
    titleKey: 'sidebar.nav.waste',
    href: '/dashboard/waste',
    icon: <Trash2 className="w-5 h-5 shrink-0" />,
    roles: ['Admin', 'Chefe']
  },
  {
    titleKey: 'sidebar.nav.uniforms',
    href: '/dashboard/uniforms',
    icon: <Shirt className="w-5 h-5 shrink-0" />,
    roles: ['Admin', 'Chefe']
  },
  {
    titleKey: 'sidebar.nav.recipes',
    href: '/dashboard/recipes',
    icon: <ChefHat className="w-5 h-5 shrink-0" />,
    roles: ['Admin', 'Chefe']
  },
  {
    titleKey: 'sidebar.nav.schedules',
    href: '/dashboard/schedules',
    icon: <CalendarDays className="w-5 h-5 shrink-0" />,
    roles: ['Admin', 'Chefe']
  },
  {
    titleKey: 'sidebar.nav.checklists',
    href: '/dashboard/checklists',
    icon: <ClipboardCheck className="w-5 h-5 shrink-0" />,
    roles: ['Admin', 'Chefe', 'Apoio']
  },
  {
    titleKey: 'sidebar.nav.orders',
    href: '/dashboard/orders',
    icon: <TableIcon className="w-5 h-5 shrink-0" />,
    roles: ['Admin', 'Serviço', 'Chefe', 'Caixa', 'Barman', 'Horista', 'Passe']
  },
  {
    titleKey: 'sidebar.nav.shoppingList',
    href: '/dashboard/shopping-list',
    icon: <ShoppingBag className="w-5 h-5 shrink-0" />,
    roles: ['Admin', 'Chefe']
  },
  {
    titleKey: 'sidebar.nav.sales',
    href: '/dashboard/sales',
    icon: <ShoppingCart className="w-5 h-5 shrink-0" />,
    roles: ['Admin', 'Serviço', 'Caixa']
  },
  {
    titleKey: 'sidebar.nav.reports',
    href: '/dashboard/reports',
    icon: <FileText className="w-5 h-5 shrink-0" />,
    roles: ['Admin']
  },
  {
    titleKey: 'sidebar.nav.settings',
    href: '/dashboard/settings',
    icon: <Settings className="w-5 h-5 shrink-0" />,
    roles: ['Admin']
  }
]

export function SidebarContent({ role, onItemClick, isCollapsed = false }: { role: UserRole, onItemClick?: () => void, isCollapsed?: boolean }) {
  const pathname = usePathname()
  const { t } = useTranslation()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  const logoImg = PlaceHolderImages.find(img => img.id === 'gp-logo')

  if (!mounted) return <div className="flex flex-col h-full bg-card p-6" />

  return (
    <div className="flex flex-col h-full bg-card">
      <div className={cn("p-6 transition-all duration-300", isCollapsed ? "px-4" : "")}>
        <div className={cn("flex items-center gap-3 mb-8", isCollapsed ? "justify-center" : "")}>
          <div className="w-10 h-10 relative shrink-0">
            <Image
              src={logoImg?.imageUrl || 'https://picsum.photos/seed/rollsin-logo/400/400'}
              alt="Rolls-In"
              fill
              className="object-contain"
              data-ai-hint="tech logo"
              referrerPolicy="no-referrer"
            />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold text-sm tracking-tight font-headline text-primary truncate">ROLLS-IN</span>
              <span className="text-[7px] text-muted-foreground uppercase font-bold tracking-[0.1em] truncate">{t('landing.subtitle')}</span>
            </div>
          )}
        </div>

        <nav className="space-y-1">
          {navItems.filter(item => item.roles.includes(role)).map((item) => {
            const isActive = pathname === item.href
            const translatedTitle = t(item.titleKey)
            const linkContent = (
              <Link
                href={item.href}
                onClick={onItemClick}
                className={cn(
                  "flex items-center gap-3 py-2.5 rounded-md text-sm transition-all font-medium",
                  isCollapsed ? "justify-center px-0" : "px-3",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.icon}
                {!isCollapsed && <span>{translatedTitle}</span>}
              </Link>
            )

            if (isCollapsed) {
              return (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {translatedTitle}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return <div key={item.href}>{linkContent}</div>
          })}
        </nav>
      </div>

      <div className={cn("mt-auto p-6 border-t bg-muted/10 transition-all duration-300", isCollapsed ? "px-4 flex flex-col items-center" : "")}>
        {!isCollapsed && (
          <div className="mb-4 space-y-3">
            <PWAInstallButton className="w-full justify-center" />
            <LanguageSwitcher />
          </div>
        )}
        
        <div className={cn("flex items-center gap-3 mb-4", isCollapsed ? "justify-center" : "")}>
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-secondary-foreground shrink-0 shadow-sm">
            {role[0]}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold text-foreground truncate">
                {role === 'Admin' ? t('sidebar.user.admin') : t('sidebar.user.user', { role })}
              </span>
              <span className="text-[10px] text-primary font-bold uppercase tracking-wider truncate">{role}</span>
            </div>
          )}
        </div>
        
        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link href="/login" className="flex items-center justify-center w-full py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors font-medium">
                <LogOut className="w-5 h-5 shrink-0" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium text-destructive">
              {t('sidebar.logout')}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Link href="/login" className="flex items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors font-medium">
            <LogOut className="w-4 h-4 shrink-0" />
            {t('sidebar.logout')}
          </Link>
        )}
      </div>
    </div>
  )
}

export function DashboardSidebar({ role, isCollapsed, setIsCollapsed }: { role: UserRole, isCollapsed: boolean, setIsCollapsed: (val: boolean) => void }) {
  return (
    <aside 
      className={cn(
        "hidden md:flex bg-card border-r flex-col h-screen fixed left-0 top-0 z-40 transition-all duration-300",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-4 top-6 z-50 rounded-full border bg-background shadow-sm hover:bg-muted"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </Button>
      <SidebarContent role={role} isCollapsed={isCollapsed} />
    </aside>
  )
}
