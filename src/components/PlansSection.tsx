'use client'

import { useState } from 'react'
import { CheckCircle2, Sparkles, Check, Building2, Users2, ShieldCheck, ArrowRight, MessageSquare, Smartphone, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { usePlayBilling } from '@/hooks/usePlayBilling'

interface PlanProps {
  id: string
  googlePlayId: 'rolls_in_starter' | 'rolls_in_pro' | 'rolls_in_enterprise'
  tag: string
  name: string
  priceUSD: number
  priceFormatted: string
  description: string
  manager: string
  team: string
  accessNote: string
  features: string[]
  buttonText: string
  isPopular?: boolean
  popularLabel?: string
}

export const PLANS_DATA: PlanProps[] = [
  {
    id: 'starter',
    googlePlayId: 'rolls_in_starter',
    tag: 'EQUIPE ENXUTA',
    name: 'Plano Starter',
    priceUSD: 9.90,
    priceFormatted: 'US$ 9,90',
    description: 'Ideal para bistrôs, pequenos bares e operações focadas com equipe reduzida.',
    manager: 'Gerente',
    team: '+ 2 Funcionários',
    accessNote: 'Acesso simultâneo PWA e App',
    features: [
      'Fichas técnicas dinâmicas & CMV em tempo real',
      'Leitor de notas fiscais via IA Gemini (BYOK)',
      'Controle de estoque & ponto de reposição',
      'Processado via Google Play Billing API (30 dias grátis)'
    ],
    buttonText: 'Assinar Plano Starter',
    isPopular: false
  },
  {
    id: 'pro',
    googlePlayId: 'rolls_in_pro',
    popularLabel: 'MAIS POPULAR',
    tag: 'MÉDIA OPERAÇÃO',
    name: 'Plano Pro',
    priceUSD: 29.90,
    priceFormatted: 'US$ 29,90',
    description: 'A escolha perfeita para restaurantes, hamburguerias e cozinhas em expansão.',
    manager: 'Gerente',
    team: '+ 9 Funcionários',
    accessNote: 'Acesso completo para salão e cozinha',
    features: [
      'Tudo do Plano Starter incluso',
      'Ordens de produção & baixa em cadeia',
      'Escalas de trabalho Drag & Drop & Ponto',
      'Conferência de estoque offline (CSV)',
      '30 dias de teste grátis (Google Play Console ID: rolls_in_pro)'
    ],
    buttonText: 'Assinar Plano Pro',
    isPopular: true
  },
  {
    id: 'enterprise',
    googlePlayId: 'rolls_in_enterprise',
    tag: 'GRANDE OPERAÇÃO',
    name: 'Plano Enterprise',
    priceUSD: 49.90,
    priceFormatted: 'US$ 49,90',
    description: 'Desenvolvido para operações de grande porte, múltiplos setores e grandes equipes.',
    manager: 'Gerente',
    team: '+ 19 Funcionários',
    accessNote: 'Gestão multisetor e múltiplos usuários',
    features: [
      'Tudo do Plano Pro incluso',
      'Suporte a múltiplos setores (Cozinha, Bar, Salão)',
      'Auditoria completa de logs & alterações',
      'Onboarding dedicado & Suporte Google Play'
    ],
    buttonText: 'Assinar Enterprise',
    isPopular: false
  }
]

export function PlansSection({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { toast } = useToast()
  const { subscribeToPlan, isPurchasing } = usePlayBilling()
  const [selectedPlan, setSelectedPlan] = useState<PlanProps | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [restaurantName, setRestaurantName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSelectPlan = (plan: PlanProps) => {
    setSelectedPlan(plan)
    setIsModalOpen(true)
  }

  const handleGooglePlayPurchase = async (plan: PlanProps) => {
    const targetRestaurantId = restaurantName ? restaurantName.toLowerCase().replace(/\s+/g, '-') : 'gp-restaurante-demo'
    await subscribeToPlan(plan.googlePlayId, targetRestaurantId)
    setIsModalOpen(false)
  }

  const handleConfirmInterest = (e: React.FormEvent) => {
    e.preventDefault()
    if (!restaurantName || !phone) {
      toast({
        variant: 'destructive',
        title: 'Preencha os campos obrigatórios',
        description: 'Por favor, informe o nome do seu estabelecimento e telefone.'
      })
      return
    }

    setIsSubmitting(true)

    setTimeout(() => {
      setIsSubmitting(false)
      if (selectedPlan) {
        handleGooglePlayPurchase(selectedPlan)
      }
    }, 400)
  }

  return (
    <section className="py-16 md:py-24 px-4 bg-slate-50/50 dark:bg-slate-950/50 relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <Badge className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 font-bold px-4 py-1.5 rounded-full text-xs uppercase tracking-widest mb-4 inline-flex items-center gap-1.5 shadow-sm border border-emerald-200/50 dark:border-emerald-800/50">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Planos & Assinaturas
          </Badge>
          <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight font-serif mb-4">
            {title || 'Escolha o plano ideal para a sua cozinha'}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-base md:text-lg leading-relaxed">
            {subtitle || 'Padronize processos, controle custos em tempo real e escalone sua equipe com máxima eficiência.'}
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch pt-4">
          {PLANS_DATA.map((plan) => {
            const isPro = plan.isPopular

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-3xl transition-all duration-300 ${
                  isPro
                    ? 'bg-[#0B132B] text-white border-2 border-emerald-500 shadow-2xl shadow-emerald-500/15 lg:-translate-y-3 z-20'
                    : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none hover:border-emerald-500/40'
                }`}
              >
                {/* Popular Top Badge */}
                {isPro && plan.popularLabel && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30">
                    <span className="bg-emerald-500 text-slate-950 font-black text-[11px] px-4 py-1 rounded-full uppercase tracking-widest shadow-md inline-block">
                      {plan.popularLabel}
                    </span>
                  </div>
                )}

                <div className="p-6 sm:p-8 flex flex-col flex-1">
                  {/* Category Badge */}
                  <div className="mb-4">
                    <span
                      className={`inline-block text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                        isPro
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : 'bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                      }`}
                    >
                      {plan.tag}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3
                    className={`text-3xl font-serif font-bold mb-2 ${
                      isPro ? 'text-white' : 'text-slate-900 dark:text-slate-50'
                    }`}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className={`text-sm leading-relaxed mb-4 ${
                      isPro ? 'text-slate-300' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {plan.description}
                  </p>

                  {/* Price Box */}
                  <div className="mb-6 pb-4 border-b border-slate-200/50 dark:border-slate-800/80">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className={`text-4xl font-extrabold font-serif ${isPro ? 'text-white' : 'text-slate-900 dark:text-slate-50'}`}>
                        {plan.priceFormatted}
                      </span>
                      <span className={`text-xs font-semibold uppercase tracking-wider ${isPro ? 'text-emerald-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        / mês
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        1º Mês Teste Grátis (US$ 0,00)
                      </span>
                    </div>
                  </div>

                  {/* Highlight Feature Box */}
                  <div
                    className={`rounded-2xl p-4 text-center mb-8 border ${
                      isPro
                        ? 'bg-[#16223B]/90 border-slate-700/60'
                        : 'bg-slate-50/90 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/60'
                    }`}
                  >
                    <div
                      className={`font-bold text-base mb-0.5 ${
                        isPro ? 'text-white' : 'text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {plan.manager}
                    </div>
                    <div
                      className={`font-extrabold text-xl mb-1 ${
                        isPro ? 'text-emerald-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {plan.team}
                    </div>
                    <div
                      className={`text-xs ${
                        isPro ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {plan.accessNote}
                    </div>
                  </div>

                  {/* Checklist */}
                  <ul className="space-y-3.5 mb-8 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <CheckCircle2
                          className={`w-5 h-5 shrink-0 mt-0.5 ${
                            isPro ? 'text-emerald-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        />
                        <span
                          className={
                            isPro
                              ? 'text-slate-200 font-medium'
                              : 'text-slate-700 dark:text-slate-300 font-medium'
                          }
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Google Play Product Badge */}
                  <div className="mb-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-slate-800 text-emerald-400 border border-slate-700">
                      <Play className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400" />
                      ID Google Play: {plan.googlePlayId}
                    </span>
                  </div>

                  {/* Button */}
                  <div className="pt-2 mt-auto space-y-2">
                    <Button
                      disabled={isPurchasing}
                      onClick={() => handleGooglePlayPurchase(plan)}
                      className={`w-full py-6 rounded-full font-bold text-sm transition-all duration-200 gap-2 ${
                        isPro
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 active:scale-[0.98]'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-[0.98]'
                      }`}
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Assinar com Google Play (30 Dias Grátis)
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSelectPlan(plan)}
                      className="w-full text-xs text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      Preencher Formulário Comercial
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Plan Interest Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Garantir {selectedPlan?.name}
            </DialogTitle>
            <DialogDescription>
              Preencha seus dados para reservar sua vaga no lançamento e receber atendimento prioritário.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmInterest} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="restaurant">Nome do Estabelecimento *</Label>
              <Input
                id="restaurant"
                placeholder="Ex: Bistro Rolls-In / Hamburgueria Artesanal"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone / WhatsApp *</Label>
              <Input
                id="phone"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail Comercial (opcional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="contato@restaurante.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                Incluso no {selectedPlan?.name}:
              </div>
              <p>{selectedPlan?.manager} {selectedPlan?.team} • {selectedPlan?.accessNote}</p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {isSubmitting ? 'Confirmando...' : 'Confirmar Reserva'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}
