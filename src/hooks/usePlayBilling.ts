'use client'

import { useState, useEffect } from 'react'
import {
  PLAY_SUBSCRIPTIONS,
  PlaySubscriptionProduct,
  PlayPurchaseVerificationResponse
} from '@/lib/play-billing-config'
import { PlayBillingService } from '@/services/playBillingService'
import { useToast } from '@/hooks/use-toast'

export function usePlayBilling() {
  const { toast } = useToast()
  const [products, setProducts] = useState<PlaySubscriptionProduct[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [activeSubscription, setActiveSubscription] = useState<PlayPurchaseVerificationResponse | null>(null)

  useEffect(() => {
    async function loadSubscriptions() {
      try {
        const subs = await PlayBillingService.getAvailableSubscriptions()
        setProducts(subs)
      } catch (err) {
        console.error('Erro ao carregar assinaturas da Google Play:', err)
      } finally {
        setIsLoadingProducts(false)
      }
    }

    loadSubscriptions()
  }, [])

  const subscribeToPlan = async (
    productId: string,
    restaurantId: string
  ): Promise<PlayPurchaseVerificationResponse | null> => {
    setIsPurchasing(true)
    const product = PLAY_SUBSCRIPTIONS[productId]

    try {
      toast({
        title: '🤖 Conectando à Google Play Billing API...',
        description: `Iniciando assinatura do ${product?.name || 'Plano'}. Aguarde a confirmação.`
      })

      const result = await PlayBillingService.purchaseSubscription(productId, restaurantId)

      setActiveSubscription(result)

      toast({
        title: '🎉 Assinatura Ativada na Google Play!',
        description: `Seu restaurante foi atualizado para o ${result.plan.toUpperCase()} com limite de ${result.maxEmployees} funcionários. 30 dias de teste grátis iniciados!`
      })

      return result
    } catch (error: any) {
      if (error?.message === 'CANCELED_BY_USER') {
        toast({
          title: 'Fluxo de Compra Cancelado',
          description: 'Você cancelou o fluxo de assinatura da Google Play.'
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro na Google Play Billing API',
          description: error?.message || 'Não foi possível concluir a validação da assinatura.'
        })
      }
      return null
    } finally {
      setIsPurchasing(false)
    }
  }

  return {
    products,
    isLoadingProducts,
    isPurchasing,
    activeSubscription,
    isNativeAndroid: PlayBillingService.isNativeAndroidBillingAvailable(),
    subscribeToPlan
  }
}
