
"use client"

import { useState, useMemo } from 'react'
import { useAuth } from '@/lib/store'
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase'
import { collection, query, where, doc } from 'firebase/firestore'
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { format, startOfMonth, endOfMonth, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useTranslation } from 'react-i18next'
import {
  Trash2,
  AlertTriangle,
  TrendingUp,
  UtensilsCrossed,
  Zap,
  ChefHat,
  ListTodo,
  Clock,
  CalendarCheck,
  ClipboardCheck,
  Sun,
  Moon
} from 'lucide-react'

interface WorkShift {
  id: string
  userId: string
  userName: string
  date: string
  startTime: string
  endTime: string
  breakMinutes: number
  totalHours: number
  restaurantId: string
}

interface WasteRecord {
  id: string;
  type: string;
  description: string;
  date: string;
  weight: number;
}

interface ProductionTask {
  id: string
  taskName: string
  description: string
  assignedUserId: string
  date: string
  completed: boolean
  completedAt?: string
}

interface Ingredient {
  id: string
  name: string
  expirationDate?: string
}

interface OrderData {
  id: string
  restaurantId: string
  status: string
  totalAmount: number
  orderDateTime: string
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation()
  const { user: localUser } = useAuth()
  const { user: firebaseUser } = useUser()
  const db = useFirestore()
  const restaurantId = localUser?.restaurantId || 'gp-001'

  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('17:00')
  const [breakMin, setBreakMin] = useState('60')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  // Queries
  const myShiftsQuery = useMemoFirebase(() => {
    if (!db || !firebaseUser?.uid) return null
    return query(
      collection(db, 'restaurants', restaurantId, 'workShifts'),
      where('userId', '==', firebaseUser.uid)
    )
  }, [db, firebaseUser?.uid])

  const wasteQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, 'restaurants', restaurantId, 'wasteRecords'))
  }, [db])

  const myTasksQuery = useMemoFirebase(() => {
    if (!db || !firebaseUser?.uid) return null
    return query(
      collection(db, 'restaurants', restaurantId, 'productionTasks'),
      where('assignedUserId', '==', firebaseUser.uid)
    )
  }, [db, firebaseUser?.uid])

  const ingredientsQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, 'restaurants', restaurantId, 'ingredients'))
  }, [db])

  const ordersQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, 'restaurants', restaurantId, 'orders'))
  }, [db])

  const recipesQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, 'restaurants', restaurantId, 'recipes'))
  }, [db])

  const { data: rawShifts } = useCollection<WorkShift>(myShiftsQuery)
  const { data: rawWaste } = useCollection<WasteRecord>(wasteQuery)
  const { data: rawTasks } = useCollection<ProductionTask>(myTasksQuery)
  const { data: rawIngredients } = useCollection<Ingredient>(ingredientsQuery)
  const { data: rawOrders } = useCollection<OrderData>(ordersQuery)
  const { data: rawRecipes } = useCollection<any>(recipesQuery)

  const yesterdayStr = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')

  // Dynamic Metrics Calculation
  const todaySales = useMemo(() => {
    if (!rawOrders) return 0
    return rawOrders
      .filter(o => o.orderDateTime && o.orderDateTime.startsWith(todayStr))
      .reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0)
  }, [rawOrders, todayStr])

  const yesterdaySales = useMemo(() => {
    if (!rawOrders) return 0
    return rawOrders
      .filter(o => o.orderDateTime && o.orderDateTime.startsWith(yesterdayStr))
      .reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0)
  }, [rawOrders, yesterdayStr])

  const salesChangeText = useMemo(() => {
    if (yesterdaySales === 0) {
      if (todaySales === 0) return `0.0% ${t('dashboard.stats.vsYesterday')}`
      return `+100% ${t('dashboard.stats.vsYesterday')}`
    }
    const diff = ((todaySales - yesterdaySales) / yesterdaySales) * 100
    const sign = diff >= 0 ? '+' : ''
    return `${sign}${diff.toFixed(1)}% ${t('dashboard.stats.vsYesterday')}`
  }, [todaySales, yesterdaySales, t])

  const activeOrdersCount = useMemo(() => {
    if (!rawOrders) return 0
    return rawOrders.filter(o => o.status !== 'Completed' && o.status !== 'Finalizado').length
  }, [rawOrders])

  const waitingOrdersCount = useMemo(() => {
    if (!rawOrders) return 0
    return rawOrders.filter(o => o.status === 'Pending' || o.status === 'Aguardando').length
  }, [rawOrders])

  const cmvValue = useMemo(() => {
    if (!rawRecipes || rawRecipes.length === 0 || todaySales === 0) return '0.0%'
    const totalCost = rawRecipes.reduce((acc: number, r: any) => acc + (Number(r.totalCost) || Number(r.cost) || 0), 0)
    const totalSalePrice = rawRecipes.reduce((acc: number, r: any) => acc + (Number(r.suggestedPrice) || Number(r.price) || 0), 0)
    if (totalSalePrice > 0) {
      const pct = (totalCost / totalSalePrice) * 100
      return `${pct.toFixed(1)}%`
    }
    return '0.0%'
  }, [rawRecipes, todaySales])

  // Filtros client-side para evitar índices compostos
  const myTasks = useMemo(() => {
    return rawTasks?.filter(t => t.date === todayStr) || []
  }, [rawTasks, todayStr])

  const currentMonthStart = startOfMonth(new Date())
  const currentMonthEnd = endOfMonth(new Date())

  const dailyHours = useMemo(() => {
    return rawShifts
      ?.filter(s => s.date === todayStr)
      .reduce((acc, s) => acc + (s.totalHours || 0), 0) || 0
  }, [rawShifts, todayStr])

  const monthlyHours = useMemo(() => {
    return rawShifts
      ?.filter(s => {
        const d = parseISO(s.date)
        return d >= currentMonthStart && d <= currentMonthEnd
      })
      .reduce((acc, s) => acc + (s.totalHours || 0), 0) || 0
  }, [rawShifts, currentMonthStart, currentMonthEnd])

  const totalWasteToday = useMemo(() => {
    return rawWaste
      ?.filter(w => format(new Date(w.date), 'yyyy-MM-dd') === todayStr)
      .reduce((acc, w) => acc + (w.weight || 0), 0) || 0
  }, [rawWaste, todayStr])

  const wasteStatus = useMemo(() => {
    if (totalWasteToday === 0) return { color: 'bg-emerald-500', label: t('inventory.status.normal'), message: t('dashboard.stats.wasteHealthy') }
    if (totalWasteToday <= 2) return { color: 'bg-emerald-500', label: t('inventory.status.normal'), message: t('dashboard.stats.wasteHealthy') }
    if (totalWasteToday <= 5) return { color: 'bg-amber-500', label: 'Alerta', message: 'Volume de perdas aumentando.' }
    return { color: 'bg-rose-500', label: t('inventory.status.critical'), message: 'Desperdício excessivo! Revisar processos.' }
  }, [totalWasteToday, t])

  const expirationAlerts = useMemo(() => {
    if (!rawIngredients) return []
    const alerts: { name: string; daysLeft: number }[] = []
    
    const today = new Date()
    today.setHours(0,0,0,0)

    rawIngredients.forEach((item) => {
      if (item.expirationDate) {
        const [year, month, day] = item.expirationDate.split('-').map(Number)
        const expDate = new Date(year, month - 1, day)
        
        const daysLeft = differenceInDays(expDate, today)
        if (daysLeft <= 7) {
          alerts.push({ name: item.name, daysLeft })
        }
      }
    })
    
    return alerts.sort((a, b) => a.daysLeft - b.daysLeft)
  }, [rawIngredients])

  const handleRegisterShift = () => {
    if (!db || !firebaseUser || !localUser) return
    setIsSubmitting(true)

    const [h1, m1] = startTime.split(':').map(Number)
    const [h2, m2] = endTime.split(':').map(Number)
    const totalMin = (h2 * 60 + m2) - (h1 * 60 + m1) - parseInt(breakMin)
    const total = Math.max(0, totalMin / 60)

    addDocumentNonBlocking(collection(db, 'restaurants', restaurantId, 'workShifts'), {
      userId: firebaseUser.uid,
      userName: localUser.name,
      date: todayStr,
      startTime,
      endTime,
      breakMinutes: parseInt(breakMin),
      totalHours: total,
      restaurantId
    })

    setTimeout(() => setIsSubmitting(false), 1000)
  }

  const toggleTask = (taskId: string, currentStatus: boolean) => {
    if (!db) return
    updateDocumentNonBlocking(doc(db, 'restaurants', restaurantId, 'productionTasks', taskId), {
      completed: !currentStatus,
      completedAt: !currentStatus ? new Date().toISOString() : null
    })
  }

  const formattedSales = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(todaySales)

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold font-headline mb-1 text-primary tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('dashboard.welcome', { name: localUser?.name })}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-card px-4 py-2.5 rounded-xl border flex items-center gap-3 shadow-sm">
            <div className={`w-3 h-3 rounded-full ${wasteStatus.color} animate-pulse`} />
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('dashboard.stats.wasteHealth')}</p>
              <p className="text-xs font-black uppercase tracking-tight">{wasteStatus.label}</p>
            </div>
          </div>

          <div className="bg-primary/5 px-4 py-2.5 rounded-xl border border-primary/20 flex items-center gap-5 shadow-sm">
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('dashboard.stats.today') || 'Hoje'}</p>
              <p className="text-lg font-black text-primary">{dailyHours.toFixed(1)}h</p>
            </div>
            <div className="w-px h-8 bg-primary/20" />
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                {t('dashboard.stats.month', { month: format(new Date(), 'MMM', { locale: i18n.language === 'pt' ? ptBR : undefined }) }) || `Mês`}
              </p>
              <p className="text-lg font-black text-primary">{monthlyHours.toFixed(1)}h</p>
            </div>
          </div>
        </div>
      </div>

      {expirationAlerts.length > 0 && (
        <Alert variant="destructive" className="bg-destructive/10 border border-destructive/20 text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-bold">{t('dashboard.alerts.expiration.title')}</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 text-sm max-h-32 overflow-auto space-y-1">
              {expirationAlerts.map((alert, idx) => (
                <li key={idx} className="flex justify-between items-center bg-white/50 dark:bg-black/10 px-3 py-1.5 rounded">
                  <span>{alert.name}</span>
                  <Badge variant="outline" className={alert.daysLeft < 0 ? 'text-destructive border-destructive font-black' : 'text-orange-600 border-orange-600 font-bold'}>
                    {alert.daysLeft < 0 ? t('dashboard.alerts.expiration.expired', { days: Math.abs(alert.daysLeft) }) : alert.daysLeft === 0 ? t('dashboard.alerts.expiration.today') : t('dashboard.alerts.expiration.inDays', { days: alert.daysLeft })}
                  </Badge>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
          title={t('dashboard.stats.sales')} 
          value={formattedSales} 
          icon={<TrendingUp className="w-5 h-5 text-primary" />} 
          change={salesChangeText} 
        />
        <StatCard 
          title={t('dashboard.stats.orders')} 
          value={String(activeOrdersCount)} 
          icon={<UtensilsCrossed className="w-5 h-5 text-primary" />} 
          change={`${waitingOrdersCount} ${t('dashboard.stats.waiting')}`} 
        />
        <StatCard 
          title={t('dashboard.stats.cmv')} 
          value={cmvValue} 
          icon={<Zap className="w-5 h-5 text-primary" />} 
          change="Ideal: <30%" 
        />
        <StatCard 
          title={t('dashboard.stats.waste')} 
          value={`${totalWasteToday.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`} 
          icon={<Trash2 className="w-5 h-5 text-primary" />} 
          change={wasteStatus.message} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <Card className="lg:col-span-2 shadow-sm border-secondary/20 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <ChefHat className="text-secondary w-5 h-5" />
                {t('dashboard.production.title')}
              </CardTitle>
              <CardDescription>{t('dashboard.production.description')}</CardDescription>
            </div>
            <Badge variant="secondary" className="font-bold text-xs">
              {myTasks?.filter(t => t.completed).length || 0}/{myTasks?.length || 0}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {myTasks?.map(task => (
              <div 
                key={task.id} 
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${task.completed ? 'bg-muted/40 border-border/50 opacity-75' : 'bg-background border-border shadow-2xs hover:border-primary/30'}`}
                onClick={() => toggleTask(task.id, task.completed)}
              >
                <Checkbox checked={task.completed} onCheckedChange={() => toggleTask(task.id, task.completed)} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {task.taskName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                  {task.completedAt && (
                    <span className="text-[10px] font-bold text-secondary uppercase mt-1.5 block">
                      {t('dashboard.production.completedAt', { time: format(new Date(task.completedAt), 'HH:mm') })}
                    </span>
                  )}
                </div>
                {!task.completed && <Badge variant="outline" className="text-[10px] animate-pulse">{t('checklists.pdf.table.pending')}</Badge>}
              </div>
            ))}
            {myTasks?.length === 0 && (
              <div className="text-center py-10 text-muted-foreground space-y-2">
                <ListTodo className="w-12 h-12 mx-auto opacity-20" />
                <p className="text-xs italic">{t('dashboard.production.empty')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 shadow-sm border border-primary/20 bg-card">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center gap-2">
              <Clock className="text-primary w-5 h-5" />
              <CardTitle className="text-lg font-bold">{t('dashboard.punchClock.title')}</CardTitle>
            </div>
            <CardDescription>{t('dashboard.punchClock.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t('dashboard.punchClock.in')}</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t('dashboard.punchClock.out')}</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="bg-background" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{t('dashboard.punchClock.break')}</Label>
              <Input type="number" value={breakMin} onChange={(e) => setBreakMin(e.target.value)} className="bg-background" />
            </div>
            <Button onClick={handleRegisterShift} disabled={isSubmitting} className="w-full font-bold gap-2">
              {isSubmitting ? t('dashboard.punchClock.registering') : <><CalendarCheck className="w-4 h-4" /> {t('dashboard.punchClock.register')}</>}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 shadow-sm border bg-card">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="text-primary w-5 h-5" />
              <CardTitle className="text-lg font-bold">{t('dashboard.fixedChecklists.title')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <ChecklistGroup title={t('dashboard.fixedChecklists.groups.opening')} icon={<Sun className="w-4 h-4 text-amber-500" />} tasks={[t('dashboard.fixedChecklists.tasks.ac'), t('dashboard.fixedChecklists.tasks.tables'), t('dashboard.fixedChecklists.tasks.cashier')]} />
            <ChecklistGroup title={t('dashboard.fixedChecklists.groups.closing')} icon={<Moon className="w-4 h-4 text-indigo-500" />} tasks={[t('dashboard.fixedChecklists.tasks.closingCashier'), t('dashboard.fixedChecklists.tasks.cleaning'), t('dashboard.fixedChecklists.tasks.trash')]} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, change }: { title: string; value: string; icon: React.ReactNode; change: string }) {
  return (
    <Card className="border shadow-sm bg-card hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="p-2.5 bg-primary/10 rounded-xl shrink-0">{icon}</div>
          <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0.5 truncate max-w-[150px]">{change}</Badge>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
        <p className="text-2xl font-black text-foreground font-headline tracking-tight">{value}</p>
      </CardContent>
    </Card>
  )
}

function ChecklistGroup({ title, icon, tasks }: { title: string; icon: React.ReactNode; tasks: string[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 border-b pb-2">
        {icon}
        <h4 className="font-bold text-[10px] uppercase tracking-wider">{title}</h4>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {tasks.map((task, i) => (
          <div key={i} className="flex items-center space-x-2">
            <Checkbox id={`task-${title}-${i}`} />
            <label htmlFor={`task-${title}-${i}`} className="text-xs leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {task}
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}
