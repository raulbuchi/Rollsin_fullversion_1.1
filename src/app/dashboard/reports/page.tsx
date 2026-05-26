
"use client"

import { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Trash2, 
  ClipboardCheck, 
  FileDown,
  Printer,
  ChefHat,
  Timer,
  Eye,
  Calendar
} from 'lucide-react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger
} from '@/components/ui/dialog'
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase'
import { collection, query, limit } from 'firebase/firestore'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { cn } from '@/lib/utils'

import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/store'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useEffect } from 'react'

// Interfaces locais
interface ProductionTask {
  id: string
  taskName: string
  assignedUserName: string
  completed: boolean
  date: string
}

interface WasteRecord {
  id: string
  type: string
  weight: number
  date: string
  description: string
}

interface WorkShift {
  id: string
  userName: string
  totalHours: number
  date: string
  startTime: string
  endTime: string
  breakMinutes?: number
  userId: string
}

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  restaurantId: string
}

const COLORS = ['#2D855A', '#84DB84', '#15803d', '#4ade80', '#065f46']

export default function ReportsPage() {
  const { t, i18n } = useTranslation()
  const { user: localUser } = useAuth()
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const restaurantId = localUser?.restaurantId || 'gp-001'
  const [activeTab, setActiveTab] = useState('financial')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Queries simplificadas para evitar erros de índice composto
  const tasksQuery = useMemoFirebase(() => {
    if (!db || !restaurantId) return null
    return query(collection(db, 'restaurants', restaurantId, 'productionTasks'), limit(200))
  }, [db, restaurantId])

  const wasteQuery = useMemoFirebase(() => {
    if (!db || !restaurantId) return null
    return query(collection(db, 'restaurants', restaurantId, 'wasteRecords'), limit(200))
  }, [db, restaurantId])

  const shiftsQuery = useMemoFirebase(() => {
    if (!db || !restaurantId) return null
    return query(collection(db, 'restaurants', restaurantId, 'workShifts'), limit(500))
  }, [db, restaurantId])

  const usersQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, 'users'), limit(100))
  }, [db])

  const { data: rawTasks } = useCollection<ProductionTask>(tasksQuery)
  const { data: rawWaste } = useCollection<WasteRecord>(wasteQuery)
  const { data: rawShifts } = useCollection<WorkShift>(shiftsQuery)
  const { data: rawUsers } = useCollection<UserProfile>(usersQuery)

  // Filtrar usuários do restaurante atual
  const restaurantUsers = useMemo(() => {
    if (!rawUsers) return []
    return rawUsers.filter(u => u.restaurantId === restaurantId)
  }, [rawUsers])

  // Cálculos de Produtividade com ordenação client-side
  const productivityData = useMemo(() => {
    if (!rawTasks || !Array.isArray(rawTasks)) return []
    const userStats: Record<string, { name: string, completed: number, total: number }> = {}
    
    rawTasks.forEach(t => {
      if (!t || !t.assignedUserName) return
      if (!userStats[t.assignedUserName]) {
        userStats[t.assignedUserName] = { name: t.assignedUserName, completed: 0, total: 0 }
      }
      userStats[t.assignedUserName].total += 1
      if (t.completed) userStats[t.assignedUserName].completed += 1
    })

    return Object.values(userStats).map(s => ({
      name: s.name,
      taxa: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0,
      tarefas: s.completed
    })).sort((a, b) => b.taxa - a.taxa)
  }, [rawTasks])

  // Cálculo de Banco de Horas
  const hoursBankData = useMemo(() => {
    if (!rawShifts || !Array.isArray(rawShifts)) return []
    const bank: Record<string, { userId: string, name: string, totalHours: number, shiftsCount: number }> = {}
    
    // Primeiro populamos com todos os funcionários do restaurante
    if (Array.isArray(restaurantUsers)) {
      restaurantUsers.forEach(u => {
        if (!u || !u.id) return
        bank[u.id] = { userId: u.id, name: u.name, totalHours: 0, shiftsCount: 0 }
      })
    }

    // Depois somamos as horas dos turnos
    rawShifts.forEach(s => {
      if (!s || !s.userId) return
      const uId = s.userId
      if (!bank[uId]) {
        // Fallback caso o usuário não esteja na lista de perfis mas tenha turnos
        bank[uId] = { userId: uId, name: s.userName || 'Usuário Desconhecido', totalHours: 0, shiftsCount: 0 }
      }
      bank[uId].totalHours += s.totalHours || 0
      bank[uId].shiftsCount += 1
    })

    return Object.values(bank).sort((a, b) => b.totalHours - a.totalHours)
  }, [rawShifts, restaurantUsers])

  const selectedEmployeeShifts = useMemo(() => {
    if (!selectedEmployeeId || !rawShifts || !Array.isArray(rawShifts)) return []
    return rawShifts
      .filter(s => s && s.userId === selectedEmployeeId)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [selectedEmployeeId, rawShifts])

  const selectedEmployeeData = useMemo(() => {
    if (!selectedEmployeeId || !hoursBankData) return null
    return hoursBankData.find(h => h.userId === selectedEmployeeId)
  }, [selectedEmployeeId, hoursBankData])

  // Cálculos de Waste
  const wastePieData = useMemo(() => {
    if (!rawWaste || !Array.isArray(rawWaste)) return []
    const types: Record<string, number> = {}
    rawWaste.forEach(w => {
      if (!w || !w.type) return
      types[w.type] = (types[w.type] || 0) + (w.weight || 0)
    })
    return Object.entries(types).map(([name, value]) => ({ name, value }))
  }, [rawWaste])

  const handleExportIndividualPDF = (employee: any, shifts: WorkShift[]) => {
    const doc = new jsPDF()
    const today = format(new Date(), "dd/MM/yyyy HH:mm")
    
    doc.setFontSize(20)
    doc.setTextColor(45, 133, 90)
    doc.text(t('reports.pdf.individualTitle'), 14, 22)
    
    doc.setFontSize(14)
    doc.setTextColor(50)
    doc.text(t('reports.pdf.employee', { name: employee.name }), 14, 32)
    
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(t('reports.pdf.issuedAt', { at: today }), 14, 40)
    doc.text(t('reports.pdf.totalAccumulated', { hours: employee.totalHours.toFixed(1) }), 14, 45)

    const tableData = shifts.map(s => {
      let formattedDate = '-'
      try {
        if (s.date) formattedDate = format(new Date(s.date), 'dd/MM/yyyy')
      } catch (e) { console.error(e) }

      return [
        formattedDate,
        s.startTime || '-',
        s.endTime || '-',
        s.breakMinutes ? `${s.breakMinutes} min` : '0',
        `${(s.totalHours || 0).toFixed(1)}h`
      ]
    })

    autoTable(doc, {
      startY: 55,
      head: [[t('reports.table.date'), t('dashboard.punchClock.in'), t('dashboard.punchClock.out'), t('dashboard.punchClock.break'), 'Total']],
      body: tableData,
      headStyles: { fillColor: [45, 133, 90] }
    })

    doc.save(`extrato-horas-${employee.name.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
  }

  const handleExportPDF = () => {
    toast({
      title: "Gerando Relatório",
      description: "Aguarde enquanto preparamos seu documento PDF..."
    })

    const doc = new jsPDF()
    const today = format(new Date(), "dd/MM/yyyy HH:mm")
    
    doc.setFontSize(20)
    doc.setTextColor(45, 133, 90)
    doc.text(t('reports.pdf.title'), 14, 22)
    
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(t('reports.pdf.issuedAt', { at: today }), 14, 30)
    doc.text(t('reports.pdf.type', { type: t(`reports.tabs.${activeTab}`) }), 14, 35)

    if (activeTab === 'productivity') {
      const tableData = productivityData.map(d => [d.name, `${d.taxa}%`, d.tarefas])
      autoTable(doc, {
        startY: 45,
        head: [[t('reports.hoursBank.thEmployee'), t('reports.productivity.ranking'), t('production.table.task')]],
        body: tableData,
        headStyles: { fillColor: [45, 133, 90] }
      })
    } else if (activeTab === 'hoursBank') {
      const tableData = hoursBankData.map(d => [d.name, d.shiftsCount.toString(), `${d.totalHours.toFixed(1)}h`])
      autoTable(doc, {
        startY: 45,
        head: [[t('reports.hoursBank.thEmployee'), t('reports.hoursBank.thShifts'), t('reports.hoursBank.thAccumulated')]],
        body: tableData,
        headStyles: { fillColor: [45, 133, 90] }
      })
    } else if (activeTab === 'waste') {
      const sortedWaste = rawWaste ? [...rawWaste].sort((a, b) => (b.date || '').localeCompare(a.date || '')) : []
      const tableData = sortedWaste.map(w => {
        let fmtDate = '-'
        try {
          if (w.date) fmtDate = format(new Date(w.date), 'dd/MM')
        } catch (e) {}
        return [fmtDate, w.type || '-', w.description || '-', `${w.weight || 0}kg`]
      })
      autoTable(doc, {
        startY: 45,
        head: [[t('production.table.date'), t('inventory.fields.category'), t('inventory.fields.name'), 'Peso']],
        body: tableData,
        headStyles: { fillColor: [45, 133, 90] }
      })
    } else {
       doc.text('Relatório detalhado indisponível para esta aba no momento.', 14, 50)
       doc.text('Os gráficos financeiros são visualizados melhor na tela do sistema.', 14, 58)
    }

    const fileName = `relatorio-rollsin-${activeTab}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
    doc.save(fileName)
  }

  return (
    <div className="space-y-8 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary">{t('reports.title')}</h1>
          <p className="text-muted-foreground">{t('reports.description')}</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <LanguageSwitcher />
          <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> {t('reports.print')}
          </Button>
          <Button className="gap-2" onClick={handleExportPDF}>
            <FileDown className="w-4 h-4" /> {t('reports.export')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="financial" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full overflow-x-auto justify-start bg-muted/20 p-1 mb-8">
          <TabsTrigger value="financial" className="gap-2"><DollarSign className="w-4 h-4" /> {t('reports.tabs.financial')}</TabsTrigger>
          <TabsTrigger value="productivity" className="gap-2"><Users className="w-4 h-4" /> {t('reports.tabs.productivity')}</TabsTrigger>
          <TabsTrigger value="hoursBank" className="gap-2"><Timer className="w-4 h-4" /> {t('reports.tabs.hoursBank')}</TabsTrigger>
          <TabsTrigger value="waste" className="gap-2"><Trash2 className="w-4 h-4" /> {t('reports.tabs.waste')}</TabsTrigger>
          <TabsTrigger value="cleaning" className="gap-2"><ClipboardCheck className="w-4 h-4" /> {t('reports.tabs.cleaning')}</TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SummaryCard title={t('reports.financial.revenue')} value="R$ 42.150,00" trend="+8.2%" positive />
            <SummaryCard title={t('reports.financial.cogs')} value="28.4%" trend="-1.5%" positive />
            <SummaryCard title={t('reports.financial.margin')} value="R$ 18.200,00" trend="+4.1%" positive />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">{t('reports.financial.weeklyFlow')}</CardTitle>
                <CardDescription>{t('reports.financial.weeklyFlowDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MOCK_REVENUE_DATA}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="revenue" name={t('reports.financial.chartRevenue')} fill="#2D855A" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cost" name={t('reports.financial.chartCost')} fill="#84DB84" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">{t('reports.financial.expenseDist')}</CardTitle>
                <CardDescription>{t('reports.financial.expenseDistDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={MOCK_EXPENSE_DATA}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {MOCK_EXPENSE_DATA.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="productivity" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             <StatMiniCard title={t('reports.productivity.efficiency')} value={`${Math.round(productivityData.reduce((acc, v) => acc + v.taxa, 0) / (productivityData.length || 1))}%`} icon={<Timer className="text-primary" />} />
             <StatMiniCard title={t('reports.productivity.totalTasks')} value={rawTasks?.length?.toString() || '0'} icon={<ChefHat className="text-primary" />} />
             <StatMiniCard title={t('reports.productivity.hoursRegistered')} value={`${(rawShifts || []).reduce((acc, s) => acc + (s.totalHours || 0), 0).toFixed(0)}h`} icon={<Users className="text-primary" />} />
             <StatMiniCard title={t('reports.productivity.employees')} value={productivityData.length.toString()} icon={<Users className="text-primary" />} />
          </div>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">{t('reports.productivity.ranking')}</CardTitle>
              <CardDescription>{t('reports.productivity.rankingDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {productivityData.map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-bold w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px]">{idx + 1}</span>
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">{t('reports.productivity.tasksCompleted', { count: item.tarefas })}</span>
                        <Badge className={item.taxa > 80 ? 'bg-green-500' : 'bg-orange-500'}>{item.taxa}%</Badge>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${item.taxa}%` }} />
                    </div>
                  </div>
                ))}
                {productivityData.length === 0 && (
                  <p className="text-center py-10 text-muted-foreground italic">{t('reports.productivity.empty')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hoursBank" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SummaryCard title={t('reports.hoursBank.totalHours')} value={`${hoursBankData.reduce((acc, v) => acc + v.totalHours, 0).toFixed(0)}h`} trend={t('reports.hoursBank.refMonth')} positive />
            <SummaryCard title={t('reports.hoursBank.average')} value={`${(hoursBankData.reduce((acc, v) => acc + v.totalHours, 0) / (hoursBankData.length || 1)).toFixed(1)}h`} trend={t('reports.hoursBank.ideal')} positive />
            <SummaryCard title={t('reports.hoursBank.active')} value={hoursBankData.filter(h => h.shiftsCount > 0).length.toString()} trend={t('reports.hoursBank.totalRef')} positive />
          </div>

          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">{t('reports.hoursBank.tableTitle')}</CardTitle>
                <CardDescription>{t('reports.hoursBank.tableDesc')}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b text-muted-foreground uppercase text-[10px] font-bold">
                      <th className="pb-4 pt-2">{t('reports.hoursBank.thEmployee')}</th>
                      <th className="pb-4 pt-2 text-center">{t('reports.hoursBank.thShifts')}</th>
                      <th className="pb-4 pt-2 text-center">{t('reports.hoursBank.thAccumulated')}</th>
                      <th className="pb-4 pt-2 text-center">{t('reports.hoursBank.thStatus')}</th>
                      <th className="pb-4 pt-2 text-right">{t('reports.hoursBank.thActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {hoursBankData.map((item, idx) => (
                      <tr key={idx} className="group hover:bg-muted/30 transition-colors">
                        <td className="py-4">
                          <p className="font-bold">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{restaurantUsers.find(u => u.id === item.userId)?.role || 'Apoio'}</p>
                        </td>
                        <td className="py-4 text-center">
                          <Badge variant="outline" className="font-mono">{item.shiftsCount}</Badge>
                        </td>
                        <td className="py-4 text-center">
                          <span className="text-lg font-black text-primary">{item.totalHours.toFixed(1)}h</span>
                        </td>
                        <td className="py-4 text-center">
                          <Badge className={cn(
                            item.totalHours > 180 ? "bg-orange-500" : 
                            item.totalHours < 120 ? "bg-blue-500" : "bg-green-500"
                          )}>
                            {item.totalHours > 180 ? "Extra" : item.totalHours < 120 ? "Folguista" : "Regular"}
                          </Badge>
                        </td>
                        <td className="py-4 text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={() => setSelectedEmployeeId(item.userId)}
                              >
                                <Eye className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-2xl font-black font-headline text-primary">
                                  <Timer className="w-6 h-6" />
                                  {t('reports.hoursBank.dialog.title')}
                                </DialogTitle>
                                <DialogDescription>
                                  {t('reports.hoursBank.dialog.description', { name: item.name })}
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="mt-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                                    <p className="text-[10px] font-bold uppercase text-primary/60 mb-1">{t('reports.hoursBank.dialog.totalHours')}</p>
                                    <p className="text-3xl font-black text-primary">{item.totalHours.toFixed(1)}h</p>
                                  </div>
                                  <div className="bg-muted/30 p-4 rounded-xl border border-muted">
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">{t('reports.hoursBank.dialog.totalShifts')}</p>
                                    <p className="text-3xl font-black text-muted-foreground">{item.shiftsCount}</p>
                                  </div>
                                  <div className="bg-muted/30 p-4 rounded-xl border border-muted">
                                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">{t('reports.hoursBank.dialog.averagePerShift')}</p>
                                    <p className="text-3xl font-black text-muted-foreground">
                                      {item.shiftsCount > 0 ? (item.totalHours / item.shiftsCount).toFixed(1) : '0'}h
                                    </p>
                                  </div>
                                </div>

                                <div className="rounded-lg border overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-muted/50">
                                      <tr className="text-left text-[10px] font-bold uppercase text-muted-foreground">
                                        <th className="px-4 py-3">{t('production.table.date')}</th>
                                        <th className="px-4 py-3">{t('dashboard.punchClock.in')}</th>
                                        <th className="px-4 py-3">{t('dashboard.punchClock.out')}</th>
                                        <th className="px-4 py-3 text-center">{t('dashboard.punchClock.break')}</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                      {selectedEmployeeShifts.map((shift) => {
                                        let fmtDate = '-'
                                        try {
                                          if (shift.date) fmtDate = format(new Date(shift.date), "dd/MM/yyyy", { locale: (i18n.language || 'pt').startsWith('pt') ? ptBR : undefined })
                                        } catch (e) {}

                                        return (
                                        <tr key={shift.id} className="hover:bg-muted/20 transition-colors">
                                          <td className="px-4 py-3 font-medium">
                                            {fmtDate}
                                          </td>
                                          <td className="px-4 py-3">{shift.startTime || '-'}</td>
                                          <td className="px-4 py-3">{shift.endTime || '-'}</td>
                                          <td className="px-4 py-3 text-center text-muted-foreground">
                                            {shift.breakMinutes ? `${shift.breakMinutes}m` : '-'}
                                          </td>
                                          <td className="px-4 py-3 text-right font-bold text-primary">
                                            {(shift.totalHours || 0).toFixed(1)}h
                                          </td>
                                        </tr>
                                      )})}
                                    </tbody>
                                  </table>
                                </div>

                                <div className="flex justify-end pt-4 border-t">
                                  <Button 
                                    className="gap-2"
                                    onClick={() => handleExportIndividualPDF(item, selectedEmployeeShifts)}
                                  >
                                    <FileDown className="w-4 h-4" /> {t('reports.hoursBank.dialog.exportIndividual')}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="waste" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SummaryCard
              title={t('reports.waste.totalWeight')}
              value={`${(rawWaste || []).reduce((acc, w) => acc + (w.weight || 0), 0).toFixed(1)} kg`}
              trend="+2%"
              positive={false}
            />
            <SummaryCard
              title={t('reports.waste.estimatedCost')}
              value={`R$ ${((rawWaste || []).reduce((acc, w) => acc + (w.weight || 0), 0) * 12).toFixed(2)}`}
              trend="+5%"
              positive={false}
            />
            <SummaryCard title={t('reports.waste.reductionGoal')} value="< 2.0%" trend="OK" positive />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">{t('reports.waste.categoryDist')}</CardTitle>
                <CardDescription>{t('reports.waste.categoryDistDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={wastePieData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {wastePieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">{t('reports.waste.trend')}</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={MOCK_WASTE_TREND}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="peso" name="Peso (kg)" stroke="#2D855A" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cleaning" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="shadow-md">
              <CardHeader className="bg-primary/5">
                <CardTitle className="text-lg">{t('reports.cleaning.sanitary')}</CardTitle>
                <CardDescription>{t('reports.cleaning.sanitaryDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <CleaningMetric label="Limpeza de Exaustores" value={100} date="Segunda-feira" />
                <CleaningMetric label="Higienização de Frigoríficos" value={85} date="Terça-feira" />
                <CleaningMetric label="Dedetização (Terceirizado)" value={100} date="Quinzenal" />
                <CleaningMetric label="Caixa de Gordura" value={0} date="Pendente" />
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader className="bg-secondary/5">
                <CardTitle className="text-lg">{t('reports.cleaning.linen')}</CardTitle>
                <CardDescription>{t('reports.cleaning.linenDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-bold">{t('reports.cleaning.totalCleaned')}</p>
                    <p className="text-xs text-muted-foreground">{t('reports.cleaning.last7Days')}</p>
                  </div>
                  <span className="text-2xl font-black text-secondary">142 peças</span>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase text-muted-foreground">{t('reports.cleaning.linenStatus')}</p>
                  <div className="flex justify-between text-xs py-1 border-b">
                    <span>{t('reports.cleaning.inUse')}</span>
                    <span className="font-bold">85%</span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b">
                    <span>{t('reports.cleaning.inLaundry')}</span>
                    <span className="font-bold">12%</span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b text-destructive">
                    <span>{t('reports.cleaning.replacement')}</span>
                    <span className="font-bold">3%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SummaryCard({ title, value, trend, positive }: { title: string; value: string; trend: string; positive: boolean }) {
  return (
    <Card className="shadow-sm border-none bg-card">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-2">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-tight">{title}</p>
          <Badge variant={positive ? 'secondary' : 'destructive'} className="text-[10px] font-bold">
            {trend}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-3xl font-black font-headline text-primary">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function StatMiniCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  return (
    <Card className="bg-muted/10 border-none">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 bg-background rounded-lg shadow-sm">{icon}</div>
        <div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase">{title}</p>
          <p className="text-lg font-black">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function CleaningMetric({ label, value, date }: { label: string, value: number, date: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs font-bold">
        <span>{label}</span>
        <span className={cn(value === 100 ? 'text-primary' : 'text-orange-500')}>{date}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all", value === 100 ? 'bg-primary' : 'bg-orange-400')} 
          style={{ width: `${value}%` }} 
        />
      </div>
    </div>
  )
}

// MOCK DATA PARA GRÁFICOS
const MOCK_REVENUE_DATA = [
  { name: 'Seg', revenue: 4200, cost: 1200 },
  { name: 'Ter', revenue: 3800, cost: 1100 },
  { name: 'Qua', revenue: 8400, cost: 2400 },
  { name: 'Qui', revenue: 6200, cost: 1800 },
  { name: 'Sex', revenue: 9500, cost: 2800 },
  { name: 'Sáb', revenue: 11000, cost: 3200 },
  { name: 'Dom', revenue: 10500, cost: 3000 },
]

const MOCK_EXPENSE_DATA = [
  { name: 'CMV Insumos', value: 12400 },
  { name: 'Operacional', value: 4500 },
  { name: 'Marketing', value: 1200 },
  { name: 'Outros', value: 800 },
]

const MOCK_WASTE_TREND = [
  { name: '01/05', peso: 1.2 },
  { name: '05/05', peso: 2.4 },
  { name: '10/05', peso: 1.8 },
  { name: '15/05', peso: 3.1 },
  { name: '20/05', peso: 1.5 },
  { name: '25/05', peso: 0.8 },
  { name: '30/05', peso: 1.1 },
]
