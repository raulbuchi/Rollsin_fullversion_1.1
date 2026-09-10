export interface PlaySubscriptionProduct {
  productId: string
  planId: 'starter' | 'pro' | 'enterprise'
  name: string
  description: string
  priceUSD: number
  formattedPrice: string
  maxEmployees: number
  trialPeriodDays: number
  billingPeriod: string
  googlePlayConsoleTag: string
}

export const GOOGLE_PLAY_PACKAGE_NAME = 'com.rollsin.app'

export const PLAY_SUBSCRIPTIONS: Record<string, PlaySubscriptionProduct> = {
  rolls_in_starter: {
    productId: 'rolls_in_starter',
    planId: 'starter',
    name: 'Plano Starter',
    description: 'Gestão essencial para pequenas equipes e bistrôs.',
    priceUSD: 9.90,
    formattedPrice: 'US$ 9,90 / mês',
    maxEmployees: 2,
    trialPeriodDays: 30,
    billingPeriod: 'P1M',
    googlePlayConsoleTag: 'rolls_in_starter'
  },
  rolls_in_pro: {
    productId: 'rolls_in_pro',
    planId: 'pro',
    name: 'Plano Pro',
    description: 'A escolha mais popular para restaurantes e hamburguerias em expansão.',
    priceUSD: 29.90,
    formattedPrice: 'US$ 29,90 / mês',
    maxEmployees: 9,
    trialPeriodDays: 30,
    billingPeriod: 'P1M',
    googlePlayConsoleTag: 'rolls_in_pro'
  },
  rolls_in_enterprise: {
    productId: 'rolls_in_enterprise',
    planId: 'enterprise',
    name: 'Plano Enterprise',
    description: 'Para grandes operações gastronômicas e equipes multisetor.',
    priceUSD: 49.90,
    formattedPrice: 'US$ 49,90 / mês',
    maxEmployees: 19,
    trialPeriodDays: 30,
    billingPeriod: 'P1M',
    googlePlayConsoleTag: 'rolls_in_enterprise'
  }
}

export type PlayPurchaseResultStatus =
  | 'SUCCESS'
  | 'USER_CANCELED'
  | 'ITEM_ALREADY_OWNED'
  | 'PENDING_PURCHASE'
  | 'ERROR'

export interface PlayPurchaseVerificationRequest {
  packageName: string
  subscriptionId: string
  purchaseToken: string
  restaurantId: string
}

export interface PlayPurchaseVerificationResponse {
  success: boolean
  message: string
  restaurantId: string
  plan: 'starter' | 'pro' | 'enterprise'
  maxEmployees: number
  subscriptionStatus: 'active' | 'trialing' | 'canceled' | 'past_due'
  expiresAt: string
  purchaseToken: string
}
