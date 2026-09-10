import {
  PLAY_SUBSCRIPTIONS,
  GOOGLE_PLAY_PACKAGE_NAME,
  PlaySubscriptionProduct,
  PlayPurchaseVerificationResponse
} from '@/lib/play-billing-config'

export class PlayBillingService {
  /**
   * Checks if running inside a native Android Google Play Billing container or web preview
   */
  public static isNativeAndroidBillingAvailable(): boolean {
    if (typeof window === 'undefined') return false
    // Check for Capacitor Native Android bridge or Google Play Billing Web API
    return (
      (window as any).Capacitor?.isNativePlatform() ||
      (window as any).AndroidBillingBridge !== undefined
    )
  }

  /**
   * Queries available subscription products from Google Play
   */
  public static async getAvailableSubscriptions(): Promise<PlaySubscriptionProduct[]> {
    return Object.values(PLAY_SUBSCRIPTIONS)
  }

  /**
   * Initiates the Google Play Billing subscription purchase flow
   */
  public static async purchaseSubscription(
    productId: string,
    restaurantId: string
  ): Promise<PlayPurchaseVerificationResponse> {
    const product = PLAY_SUBSCRIPTIONS[productId]
    if (!product) {
      throw new Error(`Produto de assinatura inválido: ${productId}`)
    }

    let purchaseToken = ''

    if (this.isNativeAndroidBillingAvailable()) {
      // Execute native Google Play Billing sheet
      const nativeResponse = await (window as any).AndroidBillingBridge?.launchBillingFlow({
        sku: productId,
        type: 'subs'
      })

      if (nativeResponse?.status === 'USER_CANCELED') {
        throw new Error('CANCELED_BY_USER')
      }

      if (nativeResponse?.status !== 'OK' || !nativeResponse?.purchaseToken) {
        throw new Error(nativeResponse?.errorMessage || 'Falha ao processar pagamento na Google Play')
      }

      purchaseToken = nativeResponse.purchaseToken
    } else {
      // Simulated Google Play Billing token for Web / PWA preview mode
      purchaseToken = `gplay_token_${productId}_${restaurantId}_${Date.now()}`
    }

    // Verify token with backend Cloud Function / API
    const response = await fetch('/api/billing/verify-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        packageName: GOOGLE_PLAY_PACKAGE_NAME,
        subscriptionId: productId,
        purchaseToken: purchaseToken,
        restaurantId: restaurantId
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || 'Erro ao validar assinatura na Google Play Developer API')
    }

    const data: PlayPurchaseVerificationResponse = await response.json()
    return data
  }
}
