
"use client"

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  ListTodo,
  UserPlus,
  Pencil,
  CalendarDays,
  Loader2
} from 'lucide-react'
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase'
import { collection, query, where, orderBy, doc } from 'firebase/firestore'
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { format, parseISO } from 'date-fns'
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
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

interface ProductionTask {
  id: string
  taskName: string
  description: string
  assignedUserId: string
  assignedUserName: string
  date: string
  completed: boolean
  completedAt?: string
  restaurantId: string
}

interface Employee {
  id: string
  name: string
  role: string
  restaurantId: string
}

export default function ProductionManagementPage() {
  const { t, i18n } = useTranslation()
  const { user: localUser } = useAuth()
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const restaurantId = localUser?.restaurantId || 'gp-001'

  // Modal States
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  
  // Create Form State
  const [taskName, setTaskName] = useState('')
  const [description, setDescription] = useState('')
  const [assignedUserId, setAssignedUserId] = useState('')
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  // Edit Form State
  const [editingTask, setEditingTask] = useState<ProductionTask | null>(null)

  // Queries
  const employeesQuery = useMemoFirebase(() => {
    if (!db || !restaurantId) return null
    // Busca todos os usuários vinculados a este restaurante
    return query(collection(db, 'users'), where('restaurantId', '==', restaurantId))
  }, [db, restaurantId])

  const tasksQuery = useMemoFirebase(() => {
    if (!db || !restaurantId) return null
    // Simplificado para apenas um orderBy para evitar necessidade de índices compostos manuais no protótipo
    return query(
      collection(db, 'restaurants', restaurantId, 'productionTasks'),
      orderBy('date', 'desc')
    )
  }, [db, restaurantId])

  const { data: employees, isLoading: isEmployeesLoading } = useCollection<Employee>(employeesQuery)
  const { data: allTasks, isLoading: isTasksLoading } = useCollection<ProductionTask>(tasksQuery)

  const handleCreateTask = () => {
    if (!db || !taskName || !assignedUserId || !user) {
      toast({ 
        variant: "destructive", 
        title: t('common.error'),
        description: t('production.newDialog.none')
      })
      return
    }
    
    const emp = employees?.find(e => e.id === assignedUserId)
    
    addDocumentNonBlocking(collection(db, 'restaurants', restaurantId, 'productionTasks'), {
      taskName,
      description,
      assignedUserId,
      assignedUserName: emp?.name || 'Funcionário',
      date: selectedDate,
      completed: false,
      createdBy: user.uid,
      restaurantId
    })

    setTaskName('')
    setDescription('')
    setAssignedUserId('')
    setIsTaskDialogOpen(false)
    toast({ title: t('production.newDialog.success'), description: t('production.newDialog.successDesc', { name: emp?.name || '...' }) })
  }

  const handleEditClick = (task: ProductionTask) => {
    setEditingTask(task)
    setIsEditDialogOpen(true)
  }

  const handleUpdateTask = () => {
    if (!db || !editingTask) return
    
    const emp = employees?.find(e => e.id === editingTask.assignedUserId)
    const docRef = doc(db, 'restaurants', restaurantId, 'productionTasks', editingTask.id)
    
    updateDocumentNonBlocking(docRef, {
      taskName: editingTask.taskName,
      description: editingTask.description,
      assignedUserId: editingTask.assignedUserId,
      assignedUserName: emp?.name || editingTask.assignedUserName,
      date: editingTask.date
    })

    setIsEditDialogOpen(false)
    setEditingTask(null)
    toast({ title: t('production.editDialog.success'), description: t('production.editDialog.successDesc') })
  }

  const handleDeleteTask = (id: string) => {
    if (!db) return
    deleteDocumentNonBlocking(doc(db, 'restaurants', restaurantId, 'productionTasks', id))
    toast({ variant: "destructive", title: t('inventory.toasts.removed') })
  }

  const handleClearDemoTasks = () => {
    if (!db || !allTasks || allTasks.length === 0) return
    
    allTasks.forEach(task => {
      deleteDocumentNonBlocking(doc(db, 'restaurants', restaurantId, 'productionTasks', task.id))
    })

    toast({
      title: t('production.clearDemoDialog.success'),
      description: t('production.clearDemoDialog.successDesc')
    })
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary tracking-tight">{t('production.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('production.description')}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <LanguageSwitcher />

          {allTasks && allTasks.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="gap-2 text-destructive hover:bg-destructive/10 border-destructive/30">
                  <Trash2 className="w-4 h-4" />
                  {t('production.clearDemo')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('production.clearDemoDialog.title')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('production.clearDemoDialog.description')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleClearDemoTasks}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t('common.confirm')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 font-bold shadow-sm">
                <UserPlus className="w-4 h-4" /> {t('production.delegate')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t('production.newDialog.title')}</DialogTitle>
                <DialogDescription>{t('production.newDialog.description')}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold">{t('production.newDialog.responsible')}</Label>
                  <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder={isEmployeesLoading ? t('production.newDialog.loading') : t('production.newDialog.select')} />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.name} ({e.role})</SelectItem>
                      ))}
                      {employees?.length === 0 && !isEmployeesLoading && (
                        <SelectItem value="none" disabled>{t('production.newDialog.none')}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold">{t('production.newDialog.taskName')}</Label>
                  <Input value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder={t('production.newDialog.placeholderName')} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold">{t('production.newDialog.taskDesc')}</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('production.newDialog.placeholderDesc')} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold">{t('production.newDialog.date')}</Label>
                  <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>{t('common.cancel')}</Button>
                <Button onClick={handleCreateTask} className="font-bold">{t('production.delegate')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/30 border-b py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg font-bold">{t('production.table.title')}</CardTitle>
            </div>
            <Badge variant="secondary" className="font-bold text-xs">
              {allTasks?.filter(t => t.completed).length || 0} / {allTasks?.length || 0} {t('production.table.completed')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground uppercase text-[11px] font-bold tracking-wider">
                  <th className="p-4">{t('production.table.date')}</th>
                  <th className="p-4">{t('production.table.employee')}</th>
                  <th className="p-4">{t('production.table.task')}</th>
                  <th className="p-4 text-center">{t('production.table.status')}</th>
                  <th className="p-4 text-right">{t('production.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {isTasksLoading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('production.table.loading')}
                      </div>
                    </td>
                  </tr>
                ) : (
                  allTasks?.map(task => (
                    <tr key={task.id} className="border-b hover:bg-muted/10 transition-colors">
                      <td className="p-4 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3 text-muted-foreground" />
                          {task.date ? format(parseISO(task.date + 'T00:00:00'), 'dd/MM/yyyy') : '-'}
                        </div>
                      </td>
                      <td className="p-4 font-medium">{task.assignedUserName}</td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold">{task.taskName}</span>
                          <span className="text-[10px] text-muted-foreground">{task.description}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <Badge variant={task.completed ? "secondary" : "outline"} className="text-[10px] uppercase font-bold">
                          {task.completed ? t('production.table.completed') : t('production.table.pending')}
                        </Badge>
                        {task.completedAt && (
                          <div className="text-[8px] text-muted-foreground mt-1">
                            {format(new Date(task.completedAt), 'HH:mm')}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                            onClick={() => handleEditClick(task)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('production.deleteDialog.title')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('production.deleteDialog.description', { name: task.taskName })}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {t('common.confirm')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                {!isTasksLoading && (!allTasks || allTasks.length === 0) && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-muted-foreground italic">
                      {t('production.table.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('production.editDialog.title')}</DialogTitle>
            <DialogDescription>{t('production.editDialog.description')}</DialogDescription>
          </DialogHeader>
          {editingTask && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>{t('production.newDialog.responsible')}</Label>
                <Select 
                  value={editingTask.assignedUserId} 
                  onValueChange={(val) => setEditingTask({...editingTask, assignedUserId: val})}
                >
                  <SelectTrigger><SelectValue placeholder={t('production.newDialog.select')} /></SelectTrigger>
                  <SelectContent>
                    {employees?.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name} ({e.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t('production.newDialog.taskName')}</Label>
                <Input 
                  value={editingTask.taskName} 
                  onChange={(e) => setEditingTask({...editingTask, taskName: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('production.newDialog.taskDesc')}</Label>
                <Input 
                  value={editingTask.description} 
                  onChange={(e) => setEditingTask({...editingTask, description: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('production.newDialog.date')}</Label>
                <Input 
                  type="date" 
                  value={editingTask.date} 
                  onChange={(e) => setEditingTask({...editingTask, date: e.target.value})} 
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingTask(null); }}>{t('common.cancel')}</Button>
            <Button onClick={handleUpdateTask}>{t('production.editDialog.success')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
