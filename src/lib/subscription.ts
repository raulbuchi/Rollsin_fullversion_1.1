export type PlanId = 'starter' | 'pro' | 'enterprise'
export type SubscriptionStatus = 'trial' | 'active' | 'overdue' | 'canceled'

export interface PlanPricing {
  id: PlanId
  name: string
  monthlyFeeUSD: number
  trialDays: number
}

export const PLAN_PRICING: Record<PlanId, PlanPricing> = {
  starter: {
    id: 'starter',
    name: 'Plano Starter',
    monthlyFeeUSD: 9.90,
    trialDays: 30
  },
  pro: {
    id: 'pro',
    name: 'Plano Pro',
    monthlyFeeUSD: 29.90,
    trialDays: 30
  },
  enterprise: {
    id: 'enterprise',
    name: 'Plano Enterprise',
    monthlyFeeUSD: 49.90,
    trialDays: 30
  }
}

export interface RegisteredRestaurant {
  id: string
  name: string
  ownerName: string
  email: string
  phone: string
  planId: PlanId
  createdAt: string // ISO date string e.g. "2026-08-15"
  paymentStatus?: 'pago' | 'pendente' | 'em_degustacao' | 'atrasado'
}

export interface SubscriptionCalculation {
  planName: string
  registeredAt: Date
  trialEndDate: Date
  isTrialActive: boolean
  daysRemainingInTrial: number
  monthlyFeeUSD: number
  currentPaymentDueUSD: number
  nextBillingDate: Date
  statusLabel: string
  statusBadgeVariant: 'trial' | 'active' | 'pending' | 'overdue'
}

/**
  Calculates exact subscription status, payment amount due, trial expiration, and billing dates.
 */
export function calculateSubscriptionDetails(
  createdAtStr: string,
  planId: PlanId,
  overrideStatus?: string
): SubscriptionCalculation {
  const plan = PLAN_PRICING[planId] || PLAN_PRICING.pro
  const registeredAt = new Date(createdAtStr)
  const now = new Date()

  // 1st month (30 days) free trial
  const trialEndDate = new Date(registeredAt)
  trialEndDate.setDate(trialEndDate.getDate() + 30)

  const diffTime = trialEndDate.getTime() - now.getTime()
  const daysRemainingInTrial = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  const isTrialActive = daysRemainingInTrial > 0 && overrideStatus !== 'active'

  // If in trial period, current payment due is $0.00
  // After trial ends, payment due is plan.monthlyFeeUSD ($9.90, $29.90, or $49.90)
  const currentPaymentDueUSD = isTrialActive ? 0 : plan.monthlyFeeUSD

  // Calculate next billing date
  const nextBillingDate = isTrialActive
    ? new Date(trialEndDate)
    : new Date(now.getFullYear(), now.getMonth() + 1, registeredAt.getDate())

  let statusLabel = ''
  let statusBadgeVariant: 'trial' | 'active' | 'pending' | 'overdue' = 'trial'

  if (overrideStatus === 'canceled') {
    statusLabel = 'Cancelado'
    statusBadgeVariant = 'overdue'
  } else if (isTrialActive) {
    statusLabel = `Teste Grátis 1º Mês (${daysRemainingInTrial} ${daysRemainingInTrial === 1 ? 'dia restante' : 'dias restantes'})`
    statusBadgeVariant = 'trial'
  } else if (overrideStatus === 'atrasado') {
    statusLabel = 'Pagamento Atrasado'
    statusBadgeVariant = 'overdue'
  } else {
    statusLabel = 'Assinatura Ativa'
    statusBadgeVariant = 'active'
  }

  return {
    planName: plan.name,
    registeredAt,
    trialEndDate,
    isTrialActive,
    daysRemainingInTrial: Math.max(0, daysRemainingInTrial),
    monthlyFeeUSD: plan.monthlyFeeUSD,
    currentPaymentDueUSD,
    nextBillingDate,
    statusLabel,
    statusBadgeVariant
  }
}

// Sample Initial Registered Restaurants for Management & Monitoring
export const MOCK_REGISTERED_RESTAURANTS: RegisteredRestaurant[] = [
  {
    id: 'rest-001',
    name: 'Rolls-In Bistro & Bar',
    ownerName: 'Ricardo Buchi',
    email: 'contato@rollsinbistro.com.br',
    phone: '(11) 98877-6655',
    planId: 'pro',
    createdAt: '2026-08-25T10:00:00.000Z' // Joined 15 days ago -> in trial
  },
  {
    id: 'rest-002',
    name: 'Hamburgueria Artesanal Smash',
    ownerName: 'Carlos Oliveira',
    email: 'carlos@smashburger.com.br',
    phone: '(11) 97766-5544',
    planId: 'starter',
    createdAt: '2026-07-10T14:30:00.000Z' // Joined 2 months ago -> trial ended, active paid $9.90
  },
  {
    id: 'rest-003',
    name: 'Sushi Prime Gourmet',
    ownerName: 'Fernanda Tanaka',
    email: 'financeiro@sushiprime.com.br',
    phone: '(11) 96655-4433',
    planId: 'enterprise',
    createdAt: '2026-06-01T09:15:00.000Z' // Joined 3 months ago -> trial ended, active paid $49.90
  },
  {
    id: 'rest-004',
    name: 'Pizzeria Bella Napoli',
    ownerName: 'Marco Rossi',
    email: 'marco@bellanapoli.com.br',
    phone: '(21) 99887-1122',
    planId: 'pro',
    createdAt: '2026-09-02T16:00:00.000Z' // Joined 7 days ago -> in trial
  },
  {
    id: 'rest-005',
    name: 'Cozinha Central Dark Kitchen',
    ownerName: 'Juliana Mendes',
    email: 'ju@darkkitchens.com.br',
    phone: '(31) 98765-4321',
    planId: 'enterprise',
    createdAt: '2026-07-20T11:00:00.000Z' // Joined 50 days ago -> trial ended, active paid $49.90
  }
]
