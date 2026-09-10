'use client'

import { useState, useEffect } from 'react'
import {
  Sparkles,
  Building2,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Plus,
  RefreshCw,
  PhoneCall,
  Edit2,
  CreditCard,
  TrendingUp,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  Send,
  Bell,
  Mail,
  Check,
  Copy,
  ExternalLink,
  Smartphone,
  Play,
  Server,
  Radio
} from 'lucide-react'
import { usePlayBilling } from '@/hooks/usePlayBilling'
import { PLAY_SUBSCRIPTIONS } from '@/lib/play-billing-config'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { PlansSection } from '@/components/PlansSection'
import {
  PLAN_PRICING,
  PlanId,
  MOCK_REGISTERED_RESTAURANTS,
  RegisteredRestaurant,
  calculateSubscriptionDetails
} from '@/lib/subscription'
import {
  PaymentNotification,
  createOverduePaymentNotification
} from '@/lib/payment-notifications'

const USD_TO_BRL_RATE = 5.50 // Cotação de referência para conversão R$

export default function DashboardPlansPage() {
  const { toast } = useToast()
  const [restaurants, setRestaurants] = useState<RegisteredRestaurant[]>(MOCK_REGISTERED_RESTAURANTS)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>('all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all')

  // Notification Trigger System State
  const [notifications, setNotifications] = useState<PaymentNotification[]>([])
  const [activeEmailModalNotif, setActiveEmailModalNotif] = useState<PaymentNotification | null>(null)
  const [copiedEmail, setCopiedEmail] = useState(false)

  // Modal State for New Restaurant
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newRestName, setNewRestName] = useState('')
  const [newOwnerName, setNewOwnerName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newPlanId, setNewPlanId] = useState<PlanId>('pro')

  // Modal State for Edit Subscription
  const [editingRest, setEditingRest] = useState<RegisteredRestaurant | null>(null)
  const [editPlanId, setEditPlanId] = useState<PlanId>('pro')

  // Automated trigger generator function
  const triggerOverdueAlert = (rest: RegisteredRestaurant) => {
    const plan = PLAN_PRICING[rest.planId]
    const notif = createOverduePaymentNotification(
      rest.id,
      rest.name,
      rest.ownerName,
      rest.email,
      rest.phone,
      plan.name,
      plan.monthlyFeeUSD
    )

    setNotifications(prev => [notif, ...prev])

    toast({
      variant: 'destructive',
      title: '🚨 ALERTA AUTOMÁTICO DE COBRANÇA',
      description: `O status de ${rest.name} mudou para ATRASADO. Notificação enviada ao painel.`
    })
  }

  // Filtered Restaurants
  const filteredRestaurants = restaurants.filter(rest => {
    const details = calculateSubscriptionDetails(rest.createdAt, rest.planId, rest.paymentStatus)
    const matchesSearch =
      rest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rest.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rest.email.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesPlan = selectedPlanFilter === 'all' || rest.planId === selectedPlanFilter

    let matchesStatus = true
    if (selectedStatusFilter === 'trial') matchesStatus = details.isTrialActive
    if (selectedStatusFilter === 'active') matchesStatus = !details.isTrialActive && rest.paymentStatus !== 'atrasado'
    if (selectedStatusFilter === 'overdue') matchesStatus = rest.paymentStatus === 'atrasado'

    return matchesSearch && matchesPlan && matchesStatus
  })

  // Financial Metrics Calculations
  const totalRestaurants = restaurants.length
  let totalTrialCount = 0
  let totalActivePaidCount = 0
  let totalOverdueCount = 0
  let totalMRRUSD = 0

  restaurants.forEach(rest => {
    const details = calculateSubscriptionDetails(rest.createdAt, rest.planId, rest.paymentStatus)
    if (rest.paymentStatus === 'atrasado') {
      totalOverdueCount++
    } else if (details.isTrialActive) {
      totalTrialCount++
    } else {
      totalActivePaidCount++
      totalMRRUSD += details.monthlyFeeUSD
    }
  })

  const totalMRRBRL = totalMRRUSD * USD_TO_BRL_RATE

  // Projected MRR once all trial restaurants convert
  let projectedTotalMRRUSD = 0
  restaurants.forEach(rest => {
    projectedTotalMRRUSD += PLAN_PRICING[rest.planId].monthlyFeeUSD
  })
  const projectedTotalMRRBRL = projectedTotalMRRUSD * USD_TO_BRL_RATE

  const handleCreateRestaurant = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRestName || !newOwnerName) {
      toast({
        variant: 'destructive',
        title: 'Preencha os campos obrigatórios',
        description: 'Informe o nome do estabelecimento e o responsável.'
      })
      return
    }

    const newRestaurantItem: RegisteredRestaurant = {
      id: `rest-${Date.now()}`,
      name: newRestName,
      ownerName: newOwnerName,
      email: newEmail || 'contato@restaurante.com.br',
      phone: newPhone || '(11) 99999-9999',
      planId: newPlanId,
      createdAt: new Date().toISOString()
    }

    setRestaurants([newRestaurantItem, ...restaurants])
    setIsAddModalOpen(false)

    setNewRestName('')
    setNewOwnerName('')
    setNewEmail('')
    setNewPhone('')

    toast({
      title: 'Restaurante Cadastrado!',
      description: `${newRestName} foi adicionado com 30 dias de teste grátis (1º mês US$ 0,00).`
    })
  }

  const handleUpdatePaymentStatus = (rest: RegisteredRestaurant, newStatus: 'pago' | 'atrasado' | 'em_degustacao') => {
    setRestaurants(prev =>
      prev.map(item => (item.id === rest.id ? { ...item, paymentStatus: newStatus } : item))
    )

    if (newStatus === 'atrasado') {
      triggerOverdueAlert(rest)
    } else {
      toast({
        title: 'Status de Pagamento Atualizado',
        description: `O status de ${rest.name} foi alterado para ${newStatus.toUpperCase()}.`
      })
    }
  }

  const handleUpdatePlan = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRest) return

    setRestaurants(prev =>
      prev.map(item => (item.id === editingRest.id ? { ...item, planId: editPlanId } : item))
    )

    setEditingRest(null)
    toast({
      title: 'Plano Atualizado!',
      description: `O plano de ${editingRest.name} foi alterado para ${PLAN_PRICING[editPlanId].name}.`
    })
  }

  const handleExtendTrial = (rest: RegisteredRestaurant) => {
    const currentCreated = new Date(rest.createdAt)
    currentCreated.setDate(currentCreated.getDate() + 15)

    setRestaurants(prev =>
      prev.map(item => (item.id === rest.id ? { ...item, createdAt: currentCreated.toISOString(), paymentStatus: undefined } : item))
    )

    toast({
      title: 'Período de Teste Prorrogado!',
      description: `Foram adicionados +15 dias de degustação gratuita para ${rest.name}.`
    })
  }

  const handleSendWhatsAppNotification = (rest: RegisteredRestaurant) => {
    const details = calculateSubscriptionDetails(rest.createdAt, rest.planId, rest.paymentStatus)
    const plan = PLAN_PRICING[rest.planId]

    let text = ''
    if (rest.paymentStatus === 'atrasado') {
      text = `🚨 URGENTE: Prezado(a) ${rest.ownerName}, identificamos um atraso no pagamento da assinatura do ${plan.name} para o ${rest.name} (US$ ${plan.monthlyFeeUSD.toFixed(2)} / R$ ${(plan.monthlyFeeUSD * USD_TO_BRL_RATE).toFixed(2)}). Por favor, entre em contato para regularizar.`
    } else if (details.isTrialActive) {
      text = `Olá ${rest.ownerName}! Seu restaurante ${rest.name} está aproveitando o 1º mês grátis do Rolls-In (${plan.name}). Faltam ${details.daysRemainingInTrial} dias de teste.`
    } else {
      text = `Olá ${rest.ownerName}! A mensalidade do ${plan.name} para o ${rest.name} é de US$ ${plan.monthlyFeeUSD.toFixed(2)} (Aproximadamente R$ ${(plan.monthlyFeeUSD * USD_TO_BRL_RATE).toFixed(2)}). Próximo vencimento: ${details.nextBillingDate.toLocaleDateString('pt-BR')}.`
    }

    const cleanPhone = rest.phone.replace(/\D/g, '')
    const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(text)}`
    window.open(whatsappUrl, '_blank')
  }

  const copyEmailToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedEmail(true)
    setTimeout(() => setCopiedEmail(false), 2000)
    toast({
      title: 'Conteúdo do E-mail Copiado!',
      description: 'Você pode colar o e-mail no seu cliente de correio preferido.'
    })
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-bold px-3 py-0.5">
              <DollarSign className="w-3.5 h-3.5 mr-1" />
              Gestão de Cobrança & Notificações Automáticas
            </Badge>

            {notifications.length > 0 && (
              <Badge variant="destructive" className="font-bold px-2.5 py-0.5 animate-pulse flex items-center gap-1">
                <Bell className="w-3 h-3" />
                {notifications.length} {notifications.length === 1 ? 'Alerta de Atraso' : 'Alertas de Atraso'}
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-extrabold font-headline text-slate-900 dark:text-slate-50 tracking-tight">
            Planos & Sistema de Alertas de Pagamento
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base">
            Alertas automáticos via E-mail e WhatsApp disparados imediatamente ao identificar o status <strong>'atrasado'</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 rounded-xl shadow-md"
          >
            <Plus className="w-4 h-4" />
            Novo Restaurante
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="control" className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-4 max-w-3xl bg-slate-100 dark:bg-slate-900 p-1 rounded-xl mb-6">
          <TabsTrigger value="control" className="font-bold gap-2">
            <Building2 className="w-4 h-4" />
            Pagamentos ({totalRestaurants})
          </TabsTrigger>

          <TabsTrigger value="notifications" className="font-bold gap-2 relative">
            <Bell className="w-4 h-4 text-red-500" />
            Alertas Disparados
            {notifications.length > 0 && (
              <span className="ml-1 bg-red-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {notifications.length}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="public_plans" className="font-bold gap-2">
            <CreditCard className="w-4 h-4" />
            Planos de Assinatura
          </TabsTrigger>

          <TabsTrigger value="google_play" className="font-bold gap-2 text-emerald-600 dark:text-emerald-400">
            <Smartphone className="w-4 h-4" />
            Google Play Billing & RTDN
          </TabsTrigger>

          <TabsTrigger value="simulator" className="font-bold gap-2">
            <TrendingUp className="w-4 h-4" />
            Calculadora
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CONTROL PANEL */}
        <TabsContent value="control" className="space-y-6">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-emerald-200/60 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-slate-900 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                    Faturamento Atual (MRR)
                  </span>
                  <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-2xl font-black font-serif text-slate-900 dark:text-slate-50">
                  US$ {totalMRRUSD.toFixed(2)} <span className="text-xs text-muted-foreground font-sans font-normal">/ mês</span>
                </div>
                <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mt-1">
                  Aproximadamente R$ {totalMRRBRL.toFixed(2)} (cotação US$ 1 = R$ {USD_TO_BRL_RATE.toFixed(2)})
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200/60 dark:border-blue-900/40 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-slate-900 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400">
                    1º Mês Teste Grátis
                  </span>
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-2xl font-black font-serif text-slate-900 dark:text-slate-50">
                  {totalTrialCount} <span className="text-xs text-muted-foreground font-sans font-normal">restaurantes</span>
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                  Degustando a plataforma (US$ 0,00 no 1º mês)
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200/60 dark:border-red-900/40 bg-gradient-to-br from-red-50/50 to-white dark:from-red-950/20 dark:to-slate-900 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-red-800 dark:text-red-400">
                    Pagamentos Atrasados
                  </span>
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="text-2xl font-black font-serif text-red-600 dark:text-red-400">
                  {totalOverdueCount} <span className="text-xs text-muted-foreground font-sans font-normal">restaurantes</span>
                </div>
                <div className="text-xs text-red-700 dark:text-red-400 mt-1">
                  Alerta automático ativado para cobrança
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200/60 dark:border-amber-900/40 bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/20 dark:to-slate-900 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                    Projeção Pós-Conversão
                  </span>
                  <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-2xl font-black font-serif text-slate-900 dark:text-slate-50">
                  US$ {projectedTotalMRRUSD.toFixed(2)} <span className="text-xs text-muted-foreground font-sans font-normal">/ mês</span>
                </div>
                <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Estimado R$ {projectedTotalMRRBRL.toFixed(2)} (todos convertidos)
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters & Table Card */}
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold font-serif flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                    Restaurantes Cadastrados & Gestão de Pagamentos
                  </CardTitle>
                  <CardDescription>
                    Altere o status para <strong>'atrasado'</strong> para testar o disparo do alerta automático em tempo real.
                  </CardDescription>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Buscar restaurante..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-9 text-sm rounded-xl"
                    />
                  </div>

                  <Select value={selectedPlanFilter} onValueChange={setSelectedPlanFilter}>
                    <SelectTrigger className="w-40 text-xs font-medium rounded-xl">
                      <SelectValue placeholder="Plano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Planos</SelectItem>
                      <SelectItem value="starter">Starter (US$ 9,90)</SelectItem>
                      <SelectItem value="pro">Pro (US$ 29,90)</SelectItem>
                      <SelectItem value="enterprise">Enterprise (US$ 49,90)</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                    <SelectTrigger className="w-44 text-xs font-medium rounded-xl">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="trial">1º Mês Teste Grátis</SelectItem>
                      <SelectItem value="active">Ativo (Pago)</SelectItem>
                      <SelectItem value="overdue">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="rounded-xl border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
                    <TableRow>
                      <TableHead className="font-bold">Restaurante / Responsável</TableHead>
                      <TableHead className="font-bold">Plano Escolhido</TableHead>
                      <TableHead className="font-bold">Data do Cadastro</TableHead>
                      <TableHead className="font-bold">Status Atual</TableHead>
                      <TableHead className="font-bold text-right">Valor do Pagamento</TableHead>
                      <TableHead className="font-bold">Próximo Vencimento</TableHead>
                      <TableHead className="font-bold text-center">Ações / Disparador</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredRestaurants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                          Nenhum restaurante encontrado com os filtros selecionados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRestaurants.map(rest => {
                        const details = calculateSubscriptionDetails(
                          rest.createdAt,
                          rest.planId,
                          rest.paymentStatus
                        )
                        const plan = PLAN_PRICING[rest.planId]

                        return (
                          <TableRow key={rest.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                            {/* Name & Owner */}
                            <TableCell>
                              <div className="font-bold text-slate-900 dark:text-slate-100">{rest.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {rest.ownerName} • {rest.phone}
                              </div>
                            </TableCell>

                            {/* Plan */}
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`font-bold text-xs ${
                                  rest.planId === 'enterprise'
                                    ? 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300'
                                    : rest.planId === 'pro'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                              >
                                {plan.name}
                              </Badge>
                            </TableCell>

                            {/* Registration Date */}
                            <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-300">
                              {new Date(rest.createdAt).toLocaleDateString('pt-BR')}
                            </TableCell>

                            {/* Status Selector */}
                            <TableCell>
                              <Select
                                value={rest.paymentStatus || (details.isTrialActive ? 'em_degustacao' : 'pago')}
                                onValueChange={(val: 'pago' | 'atrasado' | 'em_degustacao') =>
                                  handleUpdatePaymentStatus(rest, val)
                                }
                              >
                                <SelectTrigger className="w-36 h-8 text-xs font-bold rounded-lg">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="em_degustacao" className="text-blue-600 font-bold">
                                    1º Mês Grátis
                                  </SelectItem>
                                  <SelectItem value="pago" className="text-emerald-600 font-bold">
                                    Ativo / Pago
                                  </SelectItem>
                                  <SelectItem value="atrasado" className="text-red-600 font-bold">
                                    🚨 Atrasado
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>

                            {/* Current Payment Due */}
                            <TableCell className="text-right">
                              {details.isTrialActive && rest.paymentStatus !== 'atrasado' ? (
                                <div>
                                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-base">
                                    US$ 0,00
                                  </span>
                                  <div className="text-[10px] text-muted-foreground">
                                    depois US$ {plan.monthlyFeeUSD.toFixed(2)}/mês
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <span
                                    className={`font-extrabold text-base ${
                                      rest.paymentStatus === 'atrasado' ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'
                                    }`}
                                  >
                                    US$ {plan.monthlyFeeUSD.toFixed(2)}
                                  </span>
                                  <div className="text-[10px] text-muted-foreground">
                                    ~R$ {(plan.monthlyFeeUSD * USD_TO_BRL_RATE).toFixed(2)}
                                  </div>
                                </div>
                              )}
                            </TableCell>

                            {/* Next Billing Date */}
                            <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {details.nextBillingDate.toLocaleDateString('pt-BR')}
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Disparar Alerta Manual (WhatsApp / E-mail)"
                                  onClick={() => triggerOverdueAlert(rest)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg"
                                >
                                  <Bell className="w-4 h-4" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Enviar Cobrança no WhatsApp"
                                  onClick={() => handleSendWhatsAppNotification(rest)}
                                  className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg"
                                >
                                  <Send className="w-4 h-4" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Prorrogar Teste Grátis (+15 dias)"
                                  onClick={() => handleExtendTrial(rest)}
                                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg"
                                >
                                  <Clock className="w-4 h-4" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Alterar Plano"
                                  onClick={() => {
                                    setEditingRest(rest)
                                    setEditPlanId(rest.planId)
                                  }}
                                  className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: AUTOMATED NOTIFICATIONS DISPATCH LOG */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold font-serif flex items-center gap-2 text-red-600">
                    <Bell className="w-5 h-5" />
                    Central de Alertas Disparados (Pagamentos Atrasados)
                  </CardTitle>
                  <CardDescription>
                    Histórico de notificações enviadas automaticamente e ferramentas de cobrança ativa.
                  </CardDescription>
                </div>

                {notifications.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNotifications([])}
                    className="text-xs font-bold"
                  >
                    Limpar Histórico
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {notifications.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-slate-50 dark:bg-slate-900/50">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                    Nenhum alerta de inadimplência pendente
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                    Quando o status de um restaurante for alterado para 'atrasado', os alertas de e-mail e WhatsApp serão registrados aqui automaticamente.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map(notif => (
                    <div
                      key={notif.id}
                      className="p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="font-bold text-[10px]">
                            ALERTA AUTOMÁTICO
                          </Badge>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {notif.restaurantName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({notif.ownerName})
                          </span>
                        </div>
                        <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                          {notif.message}
                        </p>
                        <div className="text-xs text-slate-500">
                          Disparado em: {new Date(notif.triggeredAt).toLocaleString('pt-BR')} • E-mail: {notif.email}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => setActiveEmailModalNotif(notif)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 text-xs"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          Ver E-mail Formatado
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => window.open(notif.whatsappLink, '_blank')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 text-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Enviar WhatsApp
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: PUBLIC PLANS & CARDS */}
        <TabsContent value="public_plans">
          <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
            <PlansSection
              title="Compare os planos de assinatura do Rolls-In"
              subtitle="Todos os planos incluem 1º Mês de Teste Grátis (US$ 0,00). Cancele ou mude de plano a qualquer momento."
            />
          </div>
        </TabsContent>

        {/* TAB 4: GOOGLE PLAY BILLING & RTDN */}
        <TabsContent value="google_play" className="space-y-6">
          {/* Header Card */}
          <Card className="border-emerald-200/80 dark:border-emerald-900/40 bg-slate-900 text-white">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold px-2.5 py-0.5 text-[11px]">
                      <Play className="w-3 h-3 mr-1 fill-emerald-400" />
                      Google Play Console Package: com.rollsin.app
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl font-bold font-headline flex items-center gap-2 text-white">
                    <Smartphone className="w-6 h-6 text-emerald-400" />
                    Integração Google Play Billing API & Firestore RTDN
                  </CardTitle>
                  <CardDescription className="text-slate-300 text-sm mt-1">
                    Gestão de In-App Subscriptions, validação no back-end com Android Publisher API v3 e sincronização automática de status via Google Cloud Pub/Sub RTDN.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Subscription Products Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.values(PLAY_SUBSCRIPTIONS).map((prod) => (
              <Card key={prod.productId} className="border-slate-200 dark:border-slate-800 shadow-sm relative flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 font-bold">
                      ID: {prod.productId}
                    </Badge>
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                      {prod.trialPeriodDays} Dias Grátis
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-bold font-serif">{prod.name}</CardTitle>
                  <CardDescription className="text-xs">{prod.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-1">
                    <div className="text-xs text-muted-foreground font-semibold">Valor da Mensalidade:</div>
                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-serif">
                      {prod.formattedPrice}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Capacidade: Gerente + {prod.maxEmployees} Funcionários
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <div className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      1º Mês: US$ 0,00 (Degustação 30 dias)
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Validação Back-end: Android Publisher v3
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Renovação Automática via Pub/Sub RTDN
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Interactive RTDN & Verification Testing Sandbox */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold font-serif flex items-center gap-2">
                <Radio className="w-5 h-5 text-emerald-600 animate-pulse" />
                Simulador de Notificações em Tempo Real (Google Cloud Pub/Sub RTDN)
              </CardTitle>
              <CardDescription>
                Teste o envio de webhooks RTDN para <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">/api/billing/rtdn-webhook</code> e veja a atualização automática de status no Firestore.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  onClick={async () => {
                    const testPayload = {
                      message: {
                        data: btoa(
                          JSON.stringify({
                            version: '1.0',
                            packageName: 'com.rollsin.app',
                            eventTimeMillis: String(Date.now()),
                            subscriptionNotification: {
                              version: '1.0',
                              notificationType: 4, // SUBSCRIPTION_PURCHASED
                              purchaseToken: 'gplay_token_pro_gp-001',
                              subscriptionId: 'rolls_in_pro'
                            }
                          })
                        )
                      }
                    }

                    const res = await fetch('/api/billing/rtdn-webhook', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(testPayload)
                    })
                    const data = await res.json()
                    toast({
                      title: 'RTDN Webhook Disparado! (Tipo 4: Compras)',
                      description: `Status retornado: ${data.mappedSubscriptionStatus?.toUpperCase()} (${data.description})`
                    })
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 rounded-xl"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Simular Compra (Tipo 4)
                </Button>

                <Button
                  onClick={async () => {
                    const testPayload = {
                      message: {
                        data: btoa(
                          JSON.stringify({
                            version: '1.0',
                            packageName: 'com.rollsin.app',
                            eventTimeMillis: String(Date.now()),
                            subscriptionNotification: {
                              version: '1.0',
                              notificationType: 2, // SUBSCRIPTION_RENEWED
                              purchaseToken: 'gplay_token_pro_gp-001',
                              subscriptionId: 'rolls_in_pro'
                            }
                          })
                        )
                      }
                    }

                    const res = await fetch('/api/billing/rtdn-webhook', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(testPayload)
                    })
                    const data = await res.json()
                    toast({
                      title: 'RTDN Webhook Disparado! (Tipo 2: Renovado)',
                      description: `Status Firestore: ${data.mappedSubscriptionStatus?.toUpperCase()} (${data.description})`
                    })
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 rounded-xl"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Simular Renovação (Tipo 2)
                </Button>

                <Button
                  onClick={async () => {
                    const testPayload = {
                      message: {
                        data: btoa(
                          JSON.stringify({
                            version: '1.0',
                            packageName: 'com.rollsin.app',
                            eventTimeMillis: String(Date.now()),
                            subscriptionNotification: {
                              version: '1.0',
                              notificationType: 5, // SUBSCRIPTION_ON_HOLD
                              purchaseToken: 'gplay_token_pro_gp-001',
                              subscriptionId: 'rolls_in_pro'
                            }
                          })
                        )
                      }
                    }

                    const res = await fetch('/api/billing/rtdn-webhook', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(testPayload)
                    })
                    const data = await res.json()
                    toast({
                      variant: 'destructive',
                      title: 'RTDN Webhook Disparado! (Tipo 5: Pagamento Recusado)',
                      description: `Status Firestore: ${data.mappedSubscriptionStatus?.toUpperCase()} (${data.description})`
                    })
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 rounded-xl"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Simular Recusa (Tipo 5)
                </Button>

                <Button
                  onClick={async () => {
                    const testPayload = {
                      message: {
                        data: btoa(
                          JSON.stringify({
                            version: '1.0',
                            packageName: 'com.rollsin.app',
                            eventTimeMillis: String(Date.now()),
                            subscriptionNotification: {
                              version: '1.0',
                              notificationType: 3, // SUBSCRIPTION_CANCELED
                              purchaseToken: 'gplay_token_pro_gp-001',
                              subscriptionId: 'rolls_in_pro'
                            }
                          })
                        )
                      }
                    }

                    const res = await fetch('/api/billing/rtdn-webhook', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(testPayload)
                    })
                    const data = await res.json()
                    toast({
                      variant: 'destructive',
                      title: 'RTDN Webhook Disparado! (Tipo 3: Cancelamento)',
                      description: `Status Firestore: ${data.mappedSubscriptionStatus?.toUpperCase()} (${data.description})`
                    })
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs gap-1.5 rounded-xl"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Simular Cancelar (Tipo 3)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: REVENUE CALCULATOR */}
        <TabsContent value="simulator" className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-2xl font-bold font-serif flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
                Regras Comerciais & Calculadora de Mensalidades
              </CardTitle>
              <CardDescription>
                Entenda a fórmula de faturamento do Rolls-In por plano e simule o crescimento da sua base.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Rules Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                  <div className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-1">
                    1º Mês (30 Dias)
                  </div>
                  <div className="text-2xl font-extrabold text-blue-900 dark:text-blue-100 font-serif">
                    US$ 0,00
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Degustação gratuita para todos os novos restaurantes cadastrados.
                  </p>
                </div>

                <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Plano Starter
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-serif">
                    US$ 9,90 <span className="text-xs font-sans font-normal text-muted-foreground">/ mês</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cobrado a partir do 2º mês (Gerente + 2 Funcionários).
                  </p>
                </div>

                <div className="p-4 rounded-xl border bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800">
                  <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-1">
                    Plano Pro (Mais Popular)
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-100 font-serif">
                    US$ 29,90 <span className="text-xs font-sans font-normal text-muted-foreground">/ mês</span>
                  </div>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
                    Cobrado a partir do 2º mês (Gerente + 9 Funcionários).
                  </p>
                </div>

                <div className="p-4 rounded-xl border bg-purple-50/80 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800">
                  <div className="text-xs font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider mb-1">
                    Plano Enterprise
                  </div>
                  <div className="text-2xl font-extrabold text-purple-900 dark:text-purple-100 font-serif">
                    US$ 49,90 <span className="text-xs font-sans font-normal text-muted-foreground">/ mês</span>
                  </div>
                  <p className="text-xs text-purple-800 dark:text-purple-300 mt-1">
                    Cobrado a partir do 2º mês (Gerente + 19 Funcionários).
                  </p>
                </div>
              </div>

              {/* Simulation Table */}
              <div className="p-5 rounded-2xl border bg-slate-900 text-white space-y-4">
                <div className="font-bold text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  Simulação de Receita Mensal Recorrente (MRR Pós-Conversão)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
                    <div className="text-xs text-slate-400 font-semibold mb-1">Cenário 10 Restaurantes Pro</div>
                    <div className="text-xl font-bold text-emerald-400 font-serif">US$ 299,00 / mês</div>
                    <div className="text-xs text-slate-400 mt-1">~R$ 1.644,50 / mês</div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
                    <div className="text-xs text-slate-400 font-semibold mb-1">Cenário 50 Restaurantes Pro</div>
                    <div className="text-xl font-bold text-emerald-400 font-serif">US$ 1.495,00 / mês</div>
                    <div className="text-xs text-slate-400 mt-1">~R$ 8.222,50 / mês</div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
                    <div className="text-xs text-slate-400 font-semibold mb-1">Cenário 100 Restaurantes Mix</div>
                    <div className="text-xl font-bold text-emerald-400 font-serif">US$ 3.290,00 / mês</div>
                    <div className="text-xs text-slate-400 mt-1">~R$ 18.095,00 / mês</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL: ADD RESTAURANT */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              Cadastrar Novo Restaurante
            </DialogTitle>
            <DialogDescription>
              O novo restaurante terá <strong>1º Mês de Teste Grátis (US$ 0,00)</strong>. A cobrança iniciará automaticamente após 30 dias.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRestaurant} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="restName">Nome do Estabelecimento *</Label>
              <Input
                id="restName"
                placeholder="Ex: Trattoria Bella Vista"
                value={newRestName}
                onChange={e => setNewRestName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerName">Nome do Responsável *</Label>
              <Input
                id="ownerName"
                placeholder="Ex: Roberto Silva"
                value={newOwnerName}
                onChange={e => setNewOwnerName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="newPhone">Telefone / WhatsApp</Label>
                <Input
                  id="newPhone"
                  placeholder="(11) 99999-8888"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newEmail">E-mail</Label>
                <Input
                  id="newEmail"
                  type="email"
                  placeholder="contato@rest.com.br"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="planSelect">Plano Escolhido</Label>
              <Select value={newPlanId} onValueChange={(val: PlanId) => setNewPlanId(val)}>
                <SelectTrigger id="planSelect">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter — US$ 9,90/mês (1º Mês US$ 0,00)</SelectItem>
                  <SelectItem value="pro">Pro — US$ 29,90/mês (1º Mês US$ 0,00)</SelectItem>
                  <SelectItem value="enterprise">Enterprise — US$ 49,90/mês (1º Mês US$ 0,00)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
              <strong>Regra de Cobrança:</strong> Primeiros 30 dias = US$ 0,00. A partir do 31º dia, valor de US$ {PLAN_PRICING[newPlanId].monthlyFeeUSD.toFixed(2)}/mês.
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                Cadastrar Restaurante
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: EDIT PLAN */}
      <Dialog open={!!editingRest} onOpenChange={open => !open && setEditingRest(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-emerald-600" />
              Alterar Plano de Assinatura
            </DialogTitle>
            <DialogDescription>
              Ajuste o plano do restaurante <strong>{editingRest?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdatePlan} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="editPlanSelect">Novo Plano</Label>
              <Select value={editPlanId} onValueChange={(val: PlanId) => setEditPlanId(val)}>
                <SelectTrigger id="editPlanSelect">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Plano Starter (US$ 9,90/mês)</SelectItem>
                  <SelectItem value="pro">Plano Pro (US$ 29,90/mês)</SelectItem>
                  <SelectItem value="enterprise">Plano Enterprise (US$ 49,90/mês)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingRest(null)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: VIEW FORMATTED EMAIL */}
      <Dialog open={!!activeEmailModalNotif} onOpenChange={open => !open && setActiveEmailModalNotif(null)}>
        <DialogContent className="sm:max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-blue-600">
              <Mail className="w-5 h-5" />
              E-mail de Cobrança Automático
            </DialogTitle>
            <DialogDescription>
              Disparado automaticamente para <strong>{activeEmailModalNotif?.email}</strong>
            </DialogDescription>
          </DialogHeader>

          {activeEmailModalNotif && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl space-y-1 text-xs">
                <div><strong>Para:</strong> {activeEmailModalNotif.email} ({activeEmailModalNotif.ownerName})</div>
                <div><strong>Assunto:</strong> {activeEmailModalNotif.emailSubject}</div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border text-xs whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto">
                {activeEmailModalNotif.emailBody}
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setActiveEmailModalNotif(null)}>
                  Fechar
                </Button>

                <Button
                  onClick={() => copyEmailToClipboard(activeEmailModalNotif.emailBody)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5"
                >
                  {copiedEmail ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedEmail ? 'Copiado!' : 'Copiar Texto do E-mail'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
