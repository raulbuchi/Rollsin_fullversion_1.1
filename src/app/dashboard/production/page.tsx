
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
import { useToast } from '@/hooks/use-toast'

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
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const restaurantId = 'gp-001'

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
    if (!db) return null
    // Busca todos os usuários vinculados a este restaurante
    return query(collection(db, 'users'), where('restaurantId', '==', restaurantId))
  }, [db, restaurantId])

  const tasksQuery = useMemoFirebase(() => {
    if (!db) return null
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
        title: "Erro no formulário", 
        description: "Preencha o nome da tarefa e selecione um funcionário." 
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
    toast({ title: "Tarefa Atribuída", description: `Tarefa enviada para ${emp?.name || 'o funcionário'}.` })
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
    toast({ title: "Tarefa Atualizada", description: "As alterações foram salvas." })
  }

  const handleDeleteTask = (id: string) => {
    if (!db) return
    deleteDocumentNonBlocking(doc(db, 'restaurants', restaurantId, 'productionTasks', id))
    toast({ variant: "destructive", title: "Tarefa Removida" })
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary">Gestão de Produção</h1>
          <p className="text-muted-foreground">Atribua tarefas diretas e acompanhe o progresso da sua equipe.</p>
        </div>
        
        <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" /> Delegar Tarefa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Tarefa de Produção</DialogTitle>
              <DialogDescription>A tarefa aparecerá no checklist do funcionário escolhido.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Funcionário Responsável</Label>
                <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder={isEmployeesLoading ? "Carregando equipe..." : "Selecione..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name} ({e.role})</SelectItem>
                    ))}
                    {employees?.length === 0 && !isEmployeesLoading && (
                      <SelectItem value="none" disabled>Nenhum funcionário encontrado</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Nome da Tarefa</Label>
                <Input value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="Ex: Porcionar 20kg de filé" />
              </div>
              <div className="grid gap-2">
                <Label>Descrição / Instruções</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes específicos..." />
              </div>
              <div className="grid gap-2">
                <Label>Data de Execução</Label>
                <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateTask}>Atribuir Tarefa</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-md">
        <CardHeader className="bg-primary/5">
          <div className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-primary" />
            <CardTitle>Painel de Controle de Tarefas</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="p-4 font-bold">Data</th>
                  <th className="p-4 font-bold">Funcionário</th>
                  <th className="p-4 font-bold">Tarefa</th>
                  <th className="p-4 font-bold text-center">Status</th>
                  <th className="p-4 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isTasksLoading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Carregando tarefas...
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
                          {task.completed ? "Concluído" : "Pendente"}
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
                                <AlertDialogTitle>Excluir Tarefa?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir a tarefa "{task.taskName}"? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Confirmar
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
                      Nenhuma tarefa atribuída ainda. Comece delegando uma tarefa no botão acima.
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
            <DialogTitle>Editar e Reatribuir Tarefa</DialogTitle>
            <DialogDescription>Ajuste os detalhes da tarefa ou mova-a para outro funcionário/data.</DialogDescription>
          </DialogHeader>
          {editingTask && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Funcionário Responsável</Label>
                <Select 
                  value={editingTask.assignedUserId} 
                  onValueChange={(val) => setEditingTask({...editingTask, assignedUserId: val})}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {employees?.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.name} ({e.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Nome da Tarefa</Label>
                <Input 
                  value={editingTask.taskName} 
                  onChange={(e) => setEditingTask({...editingTask, taskName: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label>Descrição / Instruções</Label>
                <Input 
                  value={editingTask.description} 
                  onChange={(e) => setEditingTask({...editingTask, description: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label>Data de Execução</Label>
                <Input 
                  type="date" 
                  value={editingTask.date} 
                  onChange={(e) => setEditingTask({...editingTask, date: e.target.value})} 
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingTask(null); }}>Cancelar</Button>
            <Button onClick={handleUpdateTask}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
