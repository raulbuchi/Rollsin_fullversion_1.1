
"use client"

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Sun, 
  Moon, 
  Flame, 
  ClipboardCheck, 
  AlertCircle,
  CheckCircle2,
  Plus,
  ListPlus,
  Settings2,
  Trash2,
  Wind,
  ShieldCheck,
  Zap,
  Clock,
  FileDown,
  Calendar
} from 'lucide-react'
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
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { motion, AnimatePresence } from 'framer-motion'

interface ChecklistTask {
  id: string
  label: string
  completed: boolean
  scheduledTime?: string
  scheduledDate?: string
  completedTime?: string
  completedDate?: string
}

interface ChecklistGroup {
  id: string
  title: string
  icon: React.ReactNode
  description: string
  tasks: ChecklistTask[]
}

export default function ChecklistsPage() {
  const { t, i18n } = useTranslation()
  const INITIAL_GROUPS: ChecklistGroup[] = [
    {
      id: 'abertura',
      title: t('checklists.defaultGroups.opening.title'),
      description: t('checklists.defaultGroups.opening.desc'),
      icon: <Sun className="w-5 h-5 text-orange-500" />,
      tasks: [
        { id: 'a1', label: t('checklists.defaultGroups.opening.tasks.ac'), completed: false, scheduledTime: '08:00' },
        { id: 'a2', label: t('checklists.defaultGroups.opening.tasks.cleaning'), completed: false, scheduledTime: '08:15' },
        { id: 'a3', label: t('checklists.defaultGroups.opening.tasks.menus'), completed: false, scheduledTime: '08:30' },
        { id: 'a4', label: t('checklists.defaultGroups.opening.tasks.beverages'), completed: false, scheduledTime: '08:45' },
        { id: 'a5', label: t('checklists.defaultGroups.opening.tasks.bathrooms'), completed: false, scheduledTime: '09:00' },
        { id: 'a6', label: t('checklists.defaultGroups.opening.tasks.cashier'), completed: false, scheduledTime: '09:15' },
      ]
    },
    {
      id: 'cozinha',
      title: t('checklists.defaultGroups.kitchen.title'),
      description: t('checklists.defaultGroups.kitchen.desc'),
      icon: <Flame className="w-5 h-5 text-red-500" />,
      tasks: [
        { id: 'c1', label: t('checklists.defaultGroups.kitchen.tasks.wash'), completed: false, scheduledTime: '09:00' },
        { id: 'c2', label: t('checklists.defaultGroups.kitchen.tasks.portions'), completed: false, scheduledTime: '09:30' },
        { id: 'c3', label: t('checklists.defaultGroups.kitchen.tasks.sauces'), completed: false, scheduledTime: '10:00' },
        { id: 'c4', label: t('checklists.defaultGroups.kitchen.tasks.expiration'), completed: false, scheduledTime: '10:30' },
        { id: 'c5', label: t('checklists.defaultGroups.kitchen.tasks.knives'), completed: false, scheduledTime: '11:00' },
        { id: 'c6', label: t('checklists.defaultGroups.kitchen.tasks.fridges'), completed: false, scheduledTime: '11:15' },
      ]
    },
    {
      id: 'limpeza-semanal',
      title: t('checklists.defaultGroups.weekly.title'),
      description: t('checklists.defaultGroups.weekly.desc'),
      icon: <Wind className="w-5 h-5 text-blue-500" />,
      tasks: [
        { id: 'l1', label: t('checklists.defaultGroups.weekly.tasks.fridges'), completed: false, scheduledDate: '2026-04-24' },
        { id: 'l2', label: t('checklists.defaultGroups.weekly.tasks.uniforms'), completed: false, scheduledDate: '2026-04-24' },
        { id: 'l3', label: t('checklists.defaultGroups.weekly.tasks.filters'), completed: false, scheduledDate: '2026-04-25' },
        { id: 'l4', label: t('checklists.defaultGroups.weekly.tasks.grease'), completed: false, scheduledDate: '2026-04-25' },
        { id: 'l5', label: t('checklists.defaultGroups.weekly.tasks.windows'), completed: false, scheduledDate: '2026-04-26' },
        { id: 'l6', label: t('checklists.defaultGroups.weekly.tasks.stock'), completed: false, scheduledDate: '2026-04-26' },
      ]
    },
    {
      id: 'terceirizados',
      title: t('checklists.defaultGroups.outsourced.title'),
      description: t('checklists.defaultGroups.outsourced.desc'),
      icon: <ShieldCheck className="w-5 h-5 text-secondary" />,
      tasks: [
        { id: 't1', label: t('checklists.defaultGroups.outsourced.tasks.pest'), completed: false },
        { id: 't2', label: t('checklists.defaultGroups.outsourced.tasks.ducts'), completed: false },
        { id: 't3', label: t('checklists.defaultGroups.outsourced.tasks.water'), completed: false },
        { id: 't4', label: t('checklists.defaultGroups.outsourced.tasks.ac'), completed: false },
        { id: 't5', label: t('checklists.defaultGroups.outsourced.tasks.waste'), completed: false },
        { id: 't6', label: t('checklists.defaultGroups.outsourced.tasks.facade'), completed: false },
        { id: 't7', label: t('checklists.defaultGroups.outsourced.tasks.uniforms'), completed: false },
      ]
    },
    {
      id: 'fechamento',
      title: t('checklists.defaultGroups.closing.title'),
      description: t('checklists.defaultGroups.closing.desc'),
      icon: <Moon className="w-5 h-5 text-indigo-500" />,
      tasks: [
        { id: 'f1', label: t('checklists.defaultGroups.closing.tasks.cashier'), completed: false, scheduledTime: '22:00' },
        { id: 'f2', label: t('checklists.defaultGroups.closing.tasks.cleaning'), completed: false, scheduledTime: '22:30' },
        { id: 'f3', label: t('checklists.defaultGroups.closing.tasks.trash'), completed: false, scheduledTime: '23:00' },
        { id: 'f4', label: t('checklists.defaultGroups.closing.tasks.gas'), completed: false, scheduledTime: '23:15' },
        { id: 'f5', label: t('checklists.defaultGroups.closing.tasks.alarm'), completed: false, scheduledTime: '23:30' },
      ]
    }
  ]

  const [groups, setGroups] = useState<ChecklistGroup[]>(INITIAL_GROUPS)
  const [activeTab, setActiveTab] = useState<string>(INITIAL_GROUPS[0].id)
  
  // States for new Checklist Group
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false)
  const [newGroupTitle, setNewGroupTitle] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')

  // States for new Task (Topic)
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [newTaskLabel, setNewTaskLabel] = useState('')
  const [newTaskScheduledTime, setNewTaskScheduledTime] = useState('')
  const [newTaskScheduledDate, setNewTaskScheduledDate] = useState('')

  const handleUpdateTaskField = (groupId: string, taskId: string, field: 'completedDate' | 'completedTime', value: string) => {
    setGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          tasks: group.tasks.map(task => {
            if (task.id === taskId) {
              return { ...task, [field]: value };
            }
            return task;
          })
        }
      }
      return group;
    }))
  }

  const toggleTask = (groupId: string, taskId: string) => {
    setGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          tasks: group.tasks.map(task => {
            if (task.id === taskId) {
              const now = new Date();
              const formattedTime = format(now, 'HH:mm');
              const formattedDate = format(now, 'yyyy-MM-dd');
              const isNowCompleted = !task.completed;
              return { 
                ...task, 
                completed: isNowCompleted,
                completedTime: isNowCompleted ? formattedTime : undefined,
                completedDate: isNowCompleted ? formattedDate : undefined
              };
            }
            return task;
          })
        }
      }
      return group
    }))
  }

  const handleAddGroup = () => {
    if (!newGroupTitle) return
    const newGroup: ChecklistGroup = {
      id: Math.random().toString(36).substr(2, 9),
      title: newGroupTitle,
      description: newGroupDesc || 'Checklist personalizado.',
      icon: <Settings2 className="w-5 h-5 text-primary" />,
      tasks: []
    }
    setGroups([...groups, newGroup])
    setNewGroupTitle('')
    setNewGroupDesc('')
    setIsGroupDialogOpen(false)
  }

  const handleDeleteGroup = (groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId))
  }

  const handleAddTask = () => {
    if (!activeGroupId || !newTaskLabel) return
    setGroups(prev => prev.map(group => {
      if (group.id === activeGroupId) {
        return {
          ...group,
          tasks: [
            ...group.tasks,
            { 
              id: Math.random().toString(36).substr(2, 9), 
              label: newTaskLabel, 
              completed: false,
              scheduledTime: newTaskScheduledTime || undefined,
              scheduledDate: newTaskScheduledDate || undefined
            }
          ]
        }
      }
      return group
    }))
    setNewTaskLabel('')
    setNewTaskScheduledTime('')
    setNewTaskScheduledDate('')
    setIsTaskDialogOpen(false)
  }

  const handleDeleteTask = (groupId: string, taskId: string) => {
    setGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          tasks: group.tasks.filter(t => t.id !== taskId)
        }
      }
      return group
    }))
  }

  const calculateProgress = (tasks: ChecklistTask[]) => {
    if (tasks.length === 0) return 0
    const completed = tasks.filter(t => t.completed).length
    return Math.round((completed / tasks.length) * 100)
  }

  const handleExportPDF = () => {
    const activeGroup = groups.find(g => g.id === activeTab)
    if (!activeGroup) return

    const doc = new jsPDF()
    const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: i18n.language === 'pt' ? ptBR : undefined })
    const progress = calculateProgress(activeGroup.tasks)

    // Header
    doc.setFontSize(20)
    doc.setTextColor(45, 133, 90) // Primary Color (Azul Profissional do Rolls-In ajustado)
    doc.text(t('checklists.pdf.title'), 14, 22)
    
    doc.setFontSize(12)
    doc.setTextColor(100)
    doc.text(t('checklists.pdf.checklist', { title: activeGroup.title }), 14, 32)
    doc.text(t('checklists.pdf.date', { date: today }), 14, 38)
    doc.text(t('checklists.pdf.compliance', { progress }), 14, 44)

    const tableData = activeGroup.tasks.map(task => {
      const executeDateDisplay = task.completedDate ? format(new Date(`${task.completedDate}T12:00:00`), 'dd/MM/yyyy') : '';
      return [
        task.label,
        task.completed ? t('checklists.pdf.table.completed') : t('checklists.pdf.table.pending'),
        [
          task.scheduledDate ? format(new Date(`${task.scheduledDate}T12:00:00`), 'dd/MM/yyyy') : '',
          task.scheduledTime || ''
        ].filter(Boolean).join(' ') || '-',
        [
          executeDateDisplay || '',
          task.completedTime || ''
        ].filter(Boolean).join(' ') || '-'
      ];
    })

    autoTable(doc, {
      startY: 55,
      head: [[t('checklists.pdf.table.task'), t('checklists.pdf.table.status'), t('checklists.pdf.table.scheduled'), t('checklists.pdf.table.executed')]],
      body: tableData,
      headStyles: { fillColor: [45, 133, 90] },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      margin: { top: 50 },
      styles: { fontSize: 10 }
    })

    const finalY = (doc as any).lastAutoTable.finalY + 20
    doc.setFontSize(10)
    doc.text('________________________________________________', 14, finalY)
    doc.text(t('checklists.pdf.signature'), 14, finalY + 5)
    
    doc.save(`checklist-${activeGroup.title.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary">{t('checklists.title')}</h1>
          <p className="text-muted-foreground">{t('checklists.description')}</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={handleExportPDF} className="gap-2">
            <FileDown className="w-4 h-4" /> {t('checklists.pdfReport')}
          </Button>
          <LanguageSwitcher />
          <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 flex-1 md:flex-none">
                <ListPlus className="w-4 h-4" /> {t('checklists.create')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('checklists.newDialog.title')}</DialogTitle>
                <DialogDescription>{t('checklists.newDialog.description')}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="group-title">{t('checklists.newDialog.fieldTitle')}</Label>
                  <Input 
                    id="group-title" 
                    placeholder={t('checklists.newDialog.placeholderTitle')}
                    value={newGroupTitle}
                    onChange={(e) => setNewGroupTitle(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="group-desc">{t('checklists.newDialog.fieldDesc')}</Label>
                  <Textarea 
                    id="group-desc" 
                    placeholder={t('checklists.newDialog.placeholderDesc')}
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsGroupDialogOpen(false)}>{t('common.cancel')}</Button>
                <Button onClick={handleAddGroup}>{t('checklists.create')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {groups.map(group => {
          const progress = calculateProgress(group.tasks)
          return (
            <Card key={group.id} className="shadow-sm border-none bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  {group.icon}
                  <h3 className="font-bold text-[10px] uppercase truncate">{group.title}</h3>
                </div>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[10px] text-muted-foreground">{t('checklists.progress', { percent: progress })}</span>
                  <span className="text-[10px] font-bold">{group.tasks.filter(t => t.completed).length}/{group.tasks.length}</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Tabs defaultValue={groups[0]?.id} value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full overflow-x-auto justify-start mb-8 bg-muted/30 p-1 rounded-xl scrollbar-hide">
          {groups.map(group => (
            <TabsTrigger key={group.id} value={group.id} className="min-w-[120px]">
              {group.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {groups.map(group => (
          <TabsContent key={group.id} value={group.id} className="space-y-6">
            <Card className="shadow-md border-primary/10">
              <CardHeader className="bg-primary/5 flex flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-background rounded-lg shadow-sm shrink-0">
                    {group.icon}
                  </div>
                  <div className="overflow-hidden">
                    <CardTitle className="truncate">{group.title}</CardTitle>
                    <CardDescription className="truncate">{group.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog open={isTaskDialogOpen && activeGroupId === group.id} onOpenChange={(open) => {
                    setIsTaskDialogOpen(open)
                    if (open) setActiveGroupId(group.id)
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 whitespace-nowrap">
                        <Plus className="w-4 h-4" /> {t('inventory.newIngredient')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('checklists.taskDialog.title')}</DialogTitle>
                        <DialogDescription>{t('checklists.taskDialog.description')}</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="task-label">{t('checklists.taskDialog.fieldLabel')}</Label>
                          <Input 
                            id="task-label" 
                            placeholder={t('checklists.taskDialog.placeholderLabel')}
                            value={newTaskLabel}
                            onChange={(e) => setNewTaskLabel(e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="task-date">{t('checklists.taskDialog.fieldDate')}</Label>
                            <Input 
                              id="task-date" 
                              type="date"
                              value={newTaskScheduledDate}
                              onChange={(e) => setNewTaskScheduledDate(e.target.value)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="task-time">{t('checklists.taskDialog.fieldTime')}</Label>
                            <Input 
                              id="task-time" 
                              type="time"
                              value={newTaskScheduledTime}
                              onChange={(e) => setNewTaskScheduledTime(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleAddTask}>{t('common.save')}</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('checklists.deleteDialog.title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('checklists.deleteDialog.description', { title: group.title })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteGroup(group.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          {t('inventory.dialogs.delete.confirm')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <AnimatePresence mode="popLayout">
                    {group.tasks.map(task => (
                      <motion.div 
                        key={task.id} 
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`group/task flex items-center space-x-3 p-4 rounded-xl border transition-all cursor-pointer hover:bg-muted/30 ${task.completed ? 'bg-secondary/10 border-secondary/20 opacity-70' : 'bg-background border-border'}`}
                        onClick={() => toggleTask(group.id, task.id)}
                      >
                        <Checkbox 
                          id={task.id} 
                          checked={task.completed} 
                          onCheckedChange={() => toggleTask(group.id, task.id)}
                        />
                        <div className="flex-1 space-y-1">
                          <label 
                            htmlFor={task.id} 
                            className={`text-sm font-medium leading-none cursor-pointer transition-all ${task.completed ? 'line-through text-muted-foreground' : ''}`}
                          >
                            {task.label}
                          </label>
                          <AnimatePresence>
                            {(task.scheduledTime || task.scheduledDate || task.completedTime || task.completedDate) && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex flex-wrap items-center gap-3 text-[10px] overflow-hidden mt-1"
                              >
                                {(task.scheduledDate || task.scheduledTime) && (
                                  <span className="text-muted-foreground flex items-center gap-1 bg-muted/30 px-1.5 py-0.5 rounded">
                                    <Clock className="w-3 h-3" /> {t('checklists.scheduled', {
                                      date: task.scheduledDate ? format(new Date(`${task.scheduledDate}T12:00:00`), 'dd/MM/yyyy') : '-',
                                      time: task.scheduledTime || '-'
                                    })}
                                  </span>
                                )}
                                
                                {task.completed && (task.scheduledTime || task.scheduledDate) ? (
                                  <motion.div 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-2 bg-secondary/10 px-2 py-1.5 rounded w-full mt-1 border border-secondary/20"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-secondary shrink-0" />
                                    <span className="text-[10px] font-bold text-secondary mr-2">{t('checklists.realExecution')}</span>
                                    <Input 
                                      type="date"
                                      className="h-6 text-[10px] w-auto py-0 px-2 bg-background border-secondary/30"
                                      value={task.completedDate || ''}
                                      onChange={(e) => handleUpdateTaskField(group.id, task.id, 'completedDate', e.target.value)}
                                    />
                                    <Input 
                                      type="time"
                                      className="h-6 text-[10px] w-auto py-0 px-2 bg-background border-secondary/30"
                                      value={task.completedTime || ''}
                                      onChange={(e) => handleUpdateTaskField(group.id, task.id, 'completedTime', e.target.value)}
                                    />
                                  </motion.div>
                                ) : (
                                  task.completedTime && (
                                    <motion.span 
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      className="text-secondary font-bold flex items-center gap-1 bg-secondary/10 px-1.5 py-0.5 rounded mt-1"
                                    >
                                      <CheckCircle2 className="w-3 h-3" /> {t('checklists.executed', {
                                        at: `${task.completedDate ? `${format(new Date(`${task.completedDate}T12:00:00`), 'dd/MM/yyyy')} ` : ''}${task.completedTime}`
                                      })}
                                    </motion.span>
                                  )
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <div className="flex items-center gap-2">
                          <AnimatePresence mode="wait">
                            {task.completed ? (
                              <motion.div
                                key="completed"
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0, rotate: 180 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                              >
                                <CheckCircle2 className="w-4 h-4 text-secondary" />
                              </motion.div>
                            ) : (
                              <motion.div
                                key="pending"
                                initial={{ scale: 0, rotate: 180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0, rotate: -180 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                              >
                                <AlertCircle className="w-4 h-4 text-muted-foreground/30" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover/task:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('checklists.deleteTaskDialog.title')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('checklists.deleteTaskDialog.description', { label: task.label })}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteTask(group.id, task.id)
                                  }}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {t('common.confirm')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {group.tasks.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed rounded-xl">
                      <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-2" />
                      <p className="text-muted-foreground text-sm">{t('checklists.empty')}</p>
                      <Button variant="link" onClick={() => {
                        setActiveGroupId(group.id)
                        setIsTaskDialogOpen(true)
                      }}>{t('checklists.addFirst')}</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
