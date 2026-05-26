
"use client"

import { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CalendarDays, 
  FileDown, 
  Plus, 
  Clock, 
  User, 
  Users,
  Trash2,
  ChevronLeft, 
  Search,
  ChevronRight,
  TrendingUp,
  History,
  LayoutGrid,
  List
} from 'lucide-react'
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase'
import { collection, query, where, doc } from 'firebase/firestore'
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  parseISO, 
  addMonths, 
  subMonths, 
  getDay, 
  isSameDay, 
  startOfWeek, 
  endOfWeek 
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { cn } from '@/lib/utils'

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

interface Employee {
  id: string
  name: string
  role: string
}

const getEmployeeColor = (id: string) => {
  const colors = [
    'bg-red-500/10 text-red-600 border-red-200 hover:bg-red-500/20',
    'bg-orange-500/10 text-orange-600 border-orange-200 hover:bg-orange-500/20',
    'bg-amber-500/10 text-amber-600 border-amber-200 hover:bg-amber-500/20',
    'bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/20',
    'bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500/20',
    'bg-indigo-500/10 text-indigo-600 border-indigo-200 hover:bg-indigo-500/20',
    'bg-purple-500/10 text-purple-600 border-purple-200 hover:bg-purple-500/20',
    'bg-pink-500/10 text-pink-600 border-pink-200 hover:bg-pink-500/20',
  ]
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % colors.length
  return colors[index]
}

export default function SchedulesPage() {
  const { toast } = useToast()
  const { user: localUser } = useAuth()
  const db = useFirestore()
  const { user } = useUser()
  const restaurantId = localUser?.restaurantId || 'gp-001'

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all')
  const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false)
  const [activeAllocationEmployeeId, setActiveAllocationEmployeeId] = useState<string | null>(null)
  const [draggedOverDate, setDraggedOverDate] = useState<string | null>(null)
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('')

  // Form State
  const [newShiftUserId, setNewShiftUserId] = useState('')
  const [newShiftDate, setNewShiftDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('17:00')
  const [breakMin, setBreakMin] = useState('60')

  // Queries simplificadas para evitar erros de índice composto no Firebase
  const shiftsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid || !restaurantId) return null
    return query(collection(db, 'restaurants', restaurantId, 'workShifts'))
  }, [db, user?.uid, restaurantId])

  const employeesQuery = useMemoFirebase(() => {
    if (!db || !user?.uid || !restaurantId) return null
    return query(collection(db, 'users'), where('restaurantId', '==', restaurantId))
  }, [db, user?.uid, restaurantId])

  const { data: shifts } = useCollection<WorkShift>(shiftsQuery)
  const { data: employees } = useCollection<Employee>(employeesQuery)

  const monthInterval = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth))
    const end = endOfWeek(endOfMonth(currentMonth))
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  // Filtragem e ordenação client-side
  const filteredShifts = useMemo(() => {
    if (!shifts) return []
    let result = shifts.filter(s => {
      const shiftDate = parseISO(s.date)
      return shiftDate >= startOfMonth(currentMonth) && shiftDate <= endOfMonth(currentMonth)
    })
    if (selectedEmployeeId !== 'all') {
      result = result.filter(s => s.userId === selectedEmployeeId)
    }
    // Ordenação por data decrescente feita no cliente
    return [...result].sort((a, b) => b.date.localeCompare(a.date))
  }, [shifts, currentMonth, selectedEmployeeId])

  const calculateHours = (start: string, end: string, breakM: number) => {
    const [h1, m1] = start.split(':').map(Number)
    const [h2, m2] = end.split(':').map(Number)
    const totalMin = (h2 * 60 + m2) - (h1 * 60 + m1) - breakM
    return Math.max(0, totalMin / 60)
  }

  const handleAddShift = () => {
    if (!db || !newShiftUserId || !newShiftDate) return
    const emp = employees?.find(e => e.id === newShiftUserId)
    const total = calculateHours(startTime, endTime, parseInt(breakMin))

    addDocumentNonBlocking(collection(db, 'restaurants', restaurantId, 'workShifts'), {
      userId: newShiftUserId,
      userName: emp?.name || 'Funcionário',
      date: newShiftDate,
      startTime,
      endTime,
      breakMinutes: parseInt(breakMin),
      totalHours: total,
      restaurantId
    })

    setIsShiftDialogOpen(false)
  }

  const handleDropEmployee = (employeeId: string, dateStr: string) => {
    if (!db || !employeeId || !dateStr) return
    const emp = employees?.find(e => e.id === employeeId)
    const total = calculateHours(startTime, endTime, parseInt(breakMin))

    addDocumentNonBlocking(collection(db, 'restaurants', restaurantId, 'workShifts'), {
      userId: employeeId,
      userName: emp?.name || 'Funcionário',
      date: dateStr,
      startTime,
      endTime,
      breakMinutes: parseInt(breakMin),
      totalHours: total,
      restaurantId
    })
  }

  const handleDeleteShift = (id: string) => {
    if (!db) return
    deleteDocumentNonBlocking(doc(db, 'restaurants', restaurantId, 'workShifts', id))
  }

  const handleExportPDF = () => {
    if (selectedEmployeeId === 'all') return
    const emp = employees?.find(e => e.id === selectedEmployeeId)
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text(`Espelho de Ponto - ${emp?.name}`, 14, 22)
    doc.setFontSize(11)
    doc.text(`Mês: ${format(currentMonth, 'MMMM yyyy', { locale: ptBR })}`, 14, 30)
    doc.text(`Empresa: Rolls-In - Management Suite`, 14, 36)

    const tableData = monthInterval.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd')
      const shift = filteredShifts.find(s => s.date === dayStr)
      return [
        format(day, 'dd/MM (EEE)', { locale: ptBR }),
        shift?.startTime || '-',
        shift?.endTime || '-',
        shift?.breakMinutes ? `${shift.breakMinutes}m` : '-',
        shift?.totalHours ? `${shift.totalHours.toFixed(2)}h` : '0.00h'
      ]
    })

    const totalMonthHours = filteredShifts.reduce((acc, s) => acc + s.totalHours, 0)

    autoTable(doc, {
      startY: 45,
      head: [['Data', 'Entrada', 'Saída', 'Intervalo', 'Total']],
      body: tableData,
    })

    const finalY = (doc as any).lastAutoTable.finalY || 150
    doc.setFontSize(12)
    doc.text(`Total de Horas no Mês: ${totalMonthHours.toFixed(2)}h`, 14, finalY + 10)
    doc.text(`Saldo Banco de Horas (Base 176h): ${(totalMonthHours - 176).toFixed(2)}h`, 14, finalY + 17)

    doc.save(`espelho-ponto-${emp?.name}-${format(currentMonth, 'MM-yyyy')}.pdf`)
  }

  const totalHours = filteredShifts.reduce((acc, s) => acc + s.totalHours, 0)

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary">Escalas & Banco de Horas</h1>
          <p className="text-muted-foreground">Gestão visual do plano de trabalho e controle de jornada.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={handleExportPDF} disabled={selectedEmployeeId === 'all'} className="gap-2">
            <FileDown className="w-4 h-4" /> Exportar PDF
          </Button>
          <Dialog open={isShiftDialogOpen} onOpenChange={setIsShiftDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Novo Turno
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Lançar Turno de Trabalho</DialogTitle>
                <DialogDescription>Registre a jornada de um funcionário para o banco de horas.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Funcionário</Label>
                  <Select value={newShiftUserId} onValueChange={setNewShiftUserId}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {employees?.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.name} ({e.role})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Data</Label>
                  <Input type="date" value={newShiftDate} onChange={(e) => setNewShiftDate(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Entrada</Label>
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Saída</Label>
                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Intervalo (minutos)</Label>
                  <Input type="number" value={breakMin} onChange={(e) => setBreakMin(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddShift}>Salvar Registro</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-none shadow-sm">
          <CardContent className="pt-6 text-center md:text-left">
            <div className="flex justify-between items-center mb-2">
              <Clock className="text-primary w-5 h-5" />
              <Badge variant="outline" className="text-[10px]">MENSAL</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Total de Horas</p>
            <p className="text-3xl font-bold font-headline text-primary">{totalHours.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card className="bg-secondary/10 border-none shadow-sm">
          <CardContent className="pt-6 text-center md:text-left">
            <div className="flex justify-between items-center mb-2">
              <TrendingUp className="text-secondary w-5 h-5" />
              <Badge variant="outline" className="text-[10px]">BANCO</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Saldo Estimado</p>
            <p className="text-3xl font-bold font-headline text-secondary">{(totalHours - (selectedEmployeeId === 'all' ? 0 : 176)).toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30 border-none shadow-sm">
          <CardContent className="pt-6 text-center md:text-left">
            <div className="flex justify-between items-center mb-2">
              <User className="text-muted-foreground w-5 h-5" />
              <Badge variant="outline" className="text-[10px]">EQUIPE</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Colaboradores Ativos</p>
            <p className="text-3xl font-bold font-headline">{employees?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-primary/10 shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="font-bold text-lg uppercase tracking-tight w-[180px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Label className="shrink-0 text-xs">Filtro:</Label>
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className="w-full md:w-[200px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Funcionários</SelectItem>
              {employees?.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="agenda" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-6">
          <TabsTrigger value="agenda" className="gap-2">
            <LayoutGrid className="w-4 h-4" /> Vista Agenda
          </TabsTrigger>
          <TabsTrigger value="lista" className="gap-2">
            <List className="w-4 h-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agenda">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* Quick Scale Panel (Sidebar) */}
            <Card className="lg:col-span-1 p-5 space-y-4 border border-primary/10 bg-card shadow-sm sticky top-[80px]">
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Painel de Escala Rápida
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                  Arraste o colaborador para o calendário ou clique em seu perfil e depois clique na data desejada para escalar de forma rápida.
                </p>
              </div>

              {/* Default Schedule Settings */}
              <div className="p-3 bg-muted/30 rounded-lg space-y-3 border text-xs">
                <span className="font-semibold text-[10px] uppercase text-muted-foreground block tracking-wider">
                  Horário Padrão do Turno:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Entrada</Label>
                    <Input 
                      type="time" 
                      className="h-7 text-xs px-2" 
                      value={startTime} 
                      onChange={(e) => setStartTime(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Saída</Label>
                    <Input 
                      type="time" 
                      className="h-7 text-xs px-2" 
                      value={endTime} 
                      onChange={(e) => setEndTime(e.target.value)} 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Pausa (minutos)</Label>
                  <Input 
                    type="number" 
                    className="h-7 text-xs px-2" 
                    value={breakMin} 
                    onChange={(e) => setBreakMin(e.target.value)} 
                  />
                </div>
              </div>

              {/* Employee Draggable Badges */}
              <div className="space-y-2 flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-[10px] uppercase text-muted-foreground block tracking-wider">
                    Colaboradores:
                  </span>
                  <Badge variant="outline" className="text-[9px]">{employees?.length || 0}</Badge>
                </div>

                <div className="relative mb-2">
                  <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Buscar funcionário..."
                    className="pl-7 h-7 text-[10px]"
                    value={employeeSearchTerm}
                    onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                  />
                </div>

                <div className="space-y-2 overflow-y-auto pr-1 flex-1 max-h-[400px] lg:max-h-none custom-scrollbar">
                  {employees?.filter(e => e.name.toLowerCase().includes(employeeSearchTerm.toLowerCase())).map((emp) => {
                    const initials = emp.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                    const isSelected = activeAllocationEmployeeId === emp.id;
                    const themeClasses = getEmployeeColor(emp.id);

                    return (
                      <div
                        key={emp.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('employeeId', emp.id);
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        onClick={() => {
                          if (isSelected) {
                            setActiveAllocationEmployeeId(null);
                          } else {
                            setActiveAllocationEmployeeId(emp.id);
                            toast({
                              title: "Modo de Alocação Ativo",
                              description: `Agora clique em uma data no calendário para escalar ${emp.name}.`,
                            });
                          }
                        }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing hover:shadow-md select-none",
                          isSelected
                            ? "border-primary bg-primary/10 shadow-lg scale-[1.02] ring-2 ring-primary/20"
                            : "border-border bg-background hover:border-primary/40 hover:bg-muted/5"
                        )}
                      >
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 border", themeClasses)}>
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs truncate text-foreground">{emp.name}</p>
                          <p className="text-[9px] text-muted-foreground truncate font-medium">{emp.role}</p>
                        </div>
                        <div className="flex flex-col gap-0.5 opacity-40 hover:opacity-80 shrink-0 px-1">
                          <span className="w-1 h-0.5 bg-foreground rounded-full" />
                          <span className="w-1 h-0.5 bg-foreground rounded-full" />
                          <span className="w-1 h-0.5 bg-foreground rounded-full" />
                        </div>
                      </div>
                    )
                  })}
                  {employees?.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-4">Nenhum funcionário cadastrado.</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Calendar Agenda Grid */}
            <Card className="lg:col-span-3 overflow-hidden border border-primary/10 shadow-lg">
              <div className="grid grid-cols-7 bg-muted/50 border-b">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="p-3 text-center text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 auto-rows-[120px] bg-border gap-px">
                {calendarDays.map((day, idx) => {
                  const dayStr = format(day, 'yyyy-MM-dd')
                  const isCurrentMonth = getDay(day) >= 0 && day >= startOfMonth(currentMonth) && day <= endOfMonth(currentMonth)
                  const dayShifts = filteredShifts.filter(s => s.date === dayStr)

                  return (
                    <div 
                      key={idx} 
                      className={cn(
                        "bg-background p-2 group transition-all hover:bg-muted/30 cursor-pointer overflow-hidden relative border-r border-b",
                        !isCurrentMonth && "opacity-30 bg-muted/20",
                        activeAllocationEmployeeId && isCurrentMonth && "ring-2 ring-dashed ring-primary/40 bg-accent/10",
                        draggedOverDate === dayStr && "bg-primary/20 ring-2 ring-inset ring-primary z-10"
                      )}
                      onDragOver={(e) => {
                        if (isCurrentMonth) {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'copy';
                        }
                      }}
                      onDragEnter={() => {
                        if (isCurrentMonth) setDraggedOverDate(dayStr);
                      }}
                      onDragLeave={() => {
                        setDraggedOverDate(null);
                      }}
                      onDrop={(e) => {
                        setDraggedOverDate(null);
                        if (isCurrentMonth) {
                          e.preventDefault();
                          const employeeId = e.dataTransfer.getData('employeeId');
                          if (employeeId) {
                            handleDropEmployee(employeeId, dayStr);
                          }
                        }
                      }}
                      onClick={() => {
                        if (isCurrentMonth) {
                          if (activeAllocationEmployeeId) {
                            handleDropEmployee(activeAllocationEmployeeId, dayStr);
                            setActiveAllocationEmployeeId(null);
                          } else {
                            setNewShiftDate(dayStr)
                            setIsShiftDialogOpen(true)
                          }
                        }
                      }}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={cn(
                          "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full",
                          isSameDay(day, new Date()) ? "bg-primary text-primary-foreground" : "text-foreground"
                        )}>
                          {format(day, 'd')}
                        </span>
                        {dayShifts.length > 5 && (
                          <Badge className="bg-primary/20 text-primary border-none text-[8px] h-4">
                            {dayShifts.length} alocações
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1 overflow-y-auto max-h-[82px] scrollbar-hide">
                        {dayShifts.length > 8 ? (
                          <div className="flex flex-col items-center justify-center h-[70px] text-center p-1 bg-primary/5 rounded-lg border border-dashed border-primary/20">
                            <Users className="w-5 h-5 text-primary/40 mb-1" />
                            <p className="text-[9px] font-black text-primary leading-tight">
                              {dayShifts.length} FUNCIONÁRIOS
                            </p>
                            <p className="text-[7px] text-muted-foreground uppercase">Clique para ver lista</p>
                          </div>
                        ) : (
                          dayShifts.map(s => (
                            <div
                              key={s.id}
                              onClick={(e) => {
                                // Prevent click through to the day div which would allocate or open shift dialog
                                e.stopPropagation();
                              }}
                              className="text-[9px] bg-primary/10 border-l-2 border-primary p-1.5 rounded-sm leading-tight flex flex-col relative group/shift"
                            >
                              <span className="font-bold truncate text-primary pr-3.5">{s.userName}</span>
                              <span className="text-muted-foreground">{s.startTime} - {s.endTime}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteShift(s.id);
                                }}
                                className="absolute top-1 right-1 opacity-0 group-hover/shift:opacity-100 bg-destructive/90 hover:bg-destructive text-white rounded-full w-3.5 h-3.5 flex items-center justify-center transition-all text-[8px] font-bold"
                                title="Remover turno"
                              >
                                ×
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="lista">
          <Card className="shadow-md border-primary/10">
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <CardTitle>Histórico de Jornada</CardTitle>
              </div>
              <CardDescription>Detalhamento diário para o período selecionado.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="p-4 font-bold">Data</th>
                      <th className="p-4 font-bold">Funcionário</th>
                      <th className="p-4 font-bold">Entrada</th>
                      <th className="p-4 font-bold">Saída</th>
                      <th className="p-4 font-bold text-center">Intervalo</th>
                      <th className="p-4 font-bold text-center">Total</th>
                      <th className="p-4 font-bold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredShifts.map(shift => (
                      <tr key={shift.id} className="border-b hover:bg-muted/10 transition-colors">
                        <td className="p-4 font-medium">{format(parseISO(shift.date), 'dd/MM/yyyy')}</td>
                        <td className="p-4">{shift.userName}</td>
                        <td className="p-4">{shift.startTime}</td>
                        <td className="p-4">{shift.endTime}</td>
                        <td className="p-4 text-center">{shift.breakMinutes} min</td>
                        <td className="p-4 text-center font-bold text-primary">{shift.totalHours.toFixed(2)}h</td>
                        <td className="p-4 text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()} className="text-destructive h-8 w-8 hover:bg-destructive/10">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Turno?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir este turno?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteShift(shift.id)
                                  }}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Confirmar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
