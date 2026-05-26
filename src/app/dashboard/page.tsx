
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

  // Queries simplificadas para evitar erros de índice
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

  const { data: rawShifts } = useCollection<WorkShift>(myShiftsQuery)
  const { data: rawWaste } = useCollection<WasteRecord>(wasteQuery)
  const { data: rawTasks } = useCollection<ProductionTask>(myTasksQuery)
  const { data: rawIngredients } = useCollection<Ingredient>(ingredientsQuery)

  // Filtros client-side para evitar índices compostos
  const myTasks = useMemo(() => {
    return rawTasks?.filter(t => t.date === todayStr) || []
  }, [rawTasks, todayStr])

  const currentMonthStart = startOfMonth(new Date())
  const currentMonthEnd = endOfMonth(new Date())

  const dailyHours = useMemo(() => {
    return rawShifts
      ?.filter(s => s.date === todayStr)
      .reduce((acc, s) => acc + s.totalHours, 0) || 0
  }, [rawShifts, todayStr])

  const monthlyHours = useMemo(() => {
    return rawShifts
      ?.filter(s => {
        const d = parseISO(s.date)
        return d >= currentMonthStart && d <= currentMonthEnd
      })
      .reduce((acc, s) => acc + s.totalHours, 0) || 0
  }, [rawShifts, currentMonthStart, currentMonthEnd])

  const totalWasteToday = useMemo(() => {
    return rawWaste
      ?.filter(w => format(new Date(w.date), 'yyyy-MM-dd') === todayStr)
      .reduce((acc, w) => acc + (w.weight || 0), 0) || 0
  }, [rawWaste, todayStr])

  const wasteStatus = useMemo(() => {
    if (totalWasteToday === 0) return { color: 'bg-green-500', label: t('inventory.status.normal'), message: t('dashboard.stats.wasteHealthy') }
    if (totalWasteToday <= 2) return { color: 'bg-green-500', label: t('inventory.status.normal'), message: t('dashboard.stats.wasteHealthy') }
    if (totalWasteToday <= 5) return { color: 'bg-yellow-500', label: 'Alerta', message: 'Volume de perdas aumentando.' }
    return { color: 'bg-red-500', label: t('inventory.status.critical'), message: 'Desperdício excessivo! Revisar processos.' }
  }, [totalWasteToday, t])

  const expirationAlerts = useMemo(() => {
    if (!rawIngredients) return []
    const alerts: { name: string; daysLeft: number }[] = []
    
    const today = new Date()
    today.setHours(0,0,0,0)

    rawIngredients.forEach((item) => {
      if (item.expirationDate) {
        // Assume expirationDate is "YYYY-MM-DD"
        // parseISO will handle the correct offset if we're careful, but to avoid timezone issues:
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline mb-2 text-primary">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">{t('dashboard.welcome', { name: localUser?.name })}</p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-card p-3 rounded-2xl border flex items-center gap-3 shadow-sm">
            <div className={`w-8 h-8 rounded-full ${wasteStatus.color} animate-pulse flex items-center justify-center`}>
              <Trash2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[8px] uppercase font-bold text-muted-foreground">Waste Health</p>
              <p className="text-xs font-black uppercase tracking-tight">{wasteStatus.label}</p>
            </div>
          </div>

          <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 flex gap-6">
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">{t('dashboard.stats.today') || 'Hoje'}</p>
              <p className="text-xl font-black text-primary">{dailyHours.toFixed(1)}h</p>
            </div>
            <div className="w-px bg-primary/20" />
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">{t('dashboard.stats.month', { month: format(new Date(), 'MMM', { locale: i18n.language === 'pt' ? ptBR : undefined }) }) || `Mês (${format(new Date(), 'MMM', { locale: i18n.language === 'pt' ? ptBR : undefined })})`}</p>
              <p className="text-xl font-black text-primary">{monthlyHours.toFixed(1)}h</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title={t('dashboard.stats.sales')} value="R$ 4.250,00" icon={<TrendingUp className="text-primary" />} change={`+12.5% ${t('dashboard.stats.vsYesterday')}`} />
        <StatCard title={t('dashboard.stats.orders')} value="42" icon={<UtensilsCrossed className="text-primary" />} change={`8 ${t('dashboard.stats.waiting')}`} />
        <StatCard title={t('dashboard.stats.cmv')} value="28.4%" icon={<Zap className="text-primary" />} change="Ideal: <30%" />
        <StatCard title={t('dashboard.stats.waste')} value={`${totalWasteToday.toFixed(1)} kg`} icon={<Trash2 className="text-primary" />} change={wasteStatus.message} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <Card className="lg:col-span-2 shadow-md border-secondary/20 bg-secondary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <ChefHat className="text-secondary w-5 h-5" />
                {t('dashboard.production.title')}
              </CardTitle>
              <CardDescription>{t('dashboard.production.description')}</CardDescription>
            </div>
            <Badge variant="secondary" className="font-bold">
              {myTasks?.filter(t => t.completed).length || 0}/{myTasks?.length || 0}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {myTasks?.map(task => (
              <div 
                key={task.id} 
                className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${task.completed ? 'bg-secondary/10 border-secondary/20 opacity-70' : 'bg-background border-border shadow-sm hover:shadow-md'}`}
                onClick={() => toggleTask(task.id, task.completed)}
              >
                <Checkbox checked={task.completed} onCheckedChange={() => toggleTask(task.id, task.completed)} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {task.taskName}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{task.description}</p>
                  {task.completedAt && (
                    <span className="text-[8px] font-bold text-secondary uppercase mt-2 block">
                      {t('dashboard.production.completedAt', { time: format(new Date(task.completedAt), 'HH:mm') })}
                    </span>
                  )}
                </div>
                {!task.completed && <Badge variant="outline" className="text-[8px] animate-pulse">{t('checklists.pdf.table.pending')}</Badge>}
              </div>
            ))}
            {myTasks?.length === 0 && (
              <div className="text-center py-10 text-muted-foreground space-y-2">
                <ListTodo className="w-12 h-12 mx-auto opacity-10" />
                <p className="text-xs italic">{t('dashboard.production.empty')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 shadow-md border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="text-primary w-5 h-5" />
              <CardTitle className="text-lg">{t('dashboard.punchClock.title')}</CardTitle>
            </div>
            <CardDescription>{t('dashboard.punchClock.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">{t('dashboard.punchClock.in')}</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t('dashboard.punchClock.out')}</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="bg-background" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{t('dashboard.punchClock.break')}</Label>
              <Input type="number" value={breakMin} onChange={(e) => setBreakMin(e.target.value)} className="bg-background" />
            </div>
            <Button onClick={handleRegisterShift} disabled={isSubmitting} className="w-full font-bold gap-2">
              {isSubmitting ? t('dashboard.punchClock.registering') : <><CalendarCheck className="w-4 h-4" /> {t('dashboard.punchClock.register')}</>}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="text-primary w-5 h-5" />
              <CardTitle className="text-lg">{t('dashboard.fixedChecklists.title')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <ChecklistGroup title={t('dashboard.fixedChecklists.groups.opening')} icon={<Sun className="w-4 h-4 text-orange-500" />} tasks={[t('dashboard.fixedChecklists.tasks.ac'), t('dashboard.fixedChecklists.tasks.tables'), t('dashboard.fixedChecklists.tasks.cashier')]} />
            <ChecklistGroup title={t('dashboard.fixedChecklists.groups.closing')} icon={<Moon className="w-4 h-4 text-indigo-500" />} tasks={[t('dashboard.fixedChecklists.tasks.closingCashier'), t('dashboard.fixedChecklists.tasks.cleaning'), t('dashboard.fixedChecklists.tasks.trash')]} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, change }: { title: string; value: string; icon: React.ReactNode; change: string }) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">{icon}</div>
          <Badge variant="secondary" className="text-[10px] font-bold">{change}</Badge>
        </div>
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <p className="text-2xl font-bold text-foreground font-headline">{value}</p>
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
