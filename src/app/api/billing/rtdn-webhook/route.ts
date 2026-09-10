import { NextRequest, NextResponse } from 'next/server'
import { firebaseConfig } from '@/firebase/config'

export interface RTDNSubscriptionNotification {
  version: string
  notificationType: number
  purchaseToken: string
  subscriptionId: string
}

export interface RTDNPayload {
  version: string
  packageName: string
  eventTimeMillis: string
  subscriptionNotification?: RTDNSubscriptionNotification
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body?.message?.data) {
      return NextResponse.json(
        {
          received: true,
          status: 'ignored',
          message: 'Payload do Google Cloud Pub/Sub sem dados de mensagem validos.'
        },
        { status: 200 }
      )
    }

    // Decode base64 Pub/Sub payload
    const decodedString = Buffer.from(body.message.data, 'base64').toString('utf-8')
    const rtdnData: RTDNPayload = JSON.parse(decodedString)

    const subNotif = rtdnData.subscriptionNotification
    if (!subNotif) {
      return NextResponse.json({
        received: true,
        status: 'ignored',
        message: 'Mensagem Pub/Sub recebida mas não contém subscriptionNotification.'
      })
    }

    const { notificationType, purchaseToken, subscriptionId } = subNotif

    let newStatus: 'active' | 'trialing' | 'canceled' | 'past_due' = 'active'
    let statusDescription = ''

    // Map Google Play RTDN Notification Types
    switch (notificationType) {
      case 1: // SUBSCRIPTION_RECOVERED
        newStatus = 'active'
        statusDescription = 'Pagamento recuperado com sucesso'
        break
      case 2: // SUBSCRIPTION_RENEWED
        newStatus = 'active'
        statusDescription = 'Renovado automaticamente'
        break
      case 3: // SUBSCRIPTION_CANCELED
        newStatus = 'canceled'
        statusDescription = 'Cancelado pelo usuário na Google Play'
        break
      case 4: // SUBSCRIPTION_PURCHASED
        newStatus = 'trialing'
        statusDescription = 'Nova assinatura iniciada com 30 dias grátis'
        break
      case 5: // SUBSCRIPTION_ON_HOLD
      case 6: // SUBSCRIPTION_IN_GRACE_PERIOD
        newStatus = 'past_due'
        statusDescription = 'Pagamento recusado / em período de carência'
        break
      case 7: // SUBSCRIPTION_RESTARTED
        newStatus = 'active'
        statusDescription = 'Assinatura reiniciada pelo usuário'
        break
      case 12: // SUBSCRIPTION_REVOKED
      case 13: // SUBSCRIPTION_EXPIRED
        newStatus = 'canceled'
        statusDescription = 'Assinatura expirada ou estornada'
        break
      default:
        newStatus = 'active'
        statusDescription = `Tipo de notificação Google Play: ${notificationType}`
    }

    // Compute updated expiration date (+30 days for renewals)
    const newExpiresAt = new Date()
    newExpiresAt.setDate(newExpiresAt.getDate() + 30)

    // Update Firestore via REST
    const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId || '(default)'
    const projectId = firebaseConfig.projectId

    // In production, locate restaurant document matching purchaseToken
    const firestoreRestUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${firestoreDatabaseId}/documents/restaurants/gp-001?updateMask.fieldPaths=subscriptionStatus&updateMask.fieldPaths=expiresAt&updateMask.fieldPaths=updatedAt`

    const updatePayload = {
      fields: {
        subscriptionStatus: { stringValue: newStatus },
        expiresAt: { stringValue: newExpiresAt.toISOString() },
        updatedAt: { stringValue: new Date().toISOString() }
      }
    }

    try {
      await fetch(firestoreRestUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      })
    } catch (err) {
      console.warn('RTDN Firestore update notice:', err)
    }

    return NextResponse.json({
      received: true,
      status: 'processed',
      googlePlayNotificationType: notificationType,
      subscriptionId,
      purchaseToken,
      mappedSubscriptionStatus: newStatus,
      description: statusDescription,
      processedAt: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error processing RTDN Pub/Sub webhook:', error)
    return NextResponse.json(
      {
        received: false,
        error: error?.message || 'Erro ao processar webhook RTDN da Google Play'
      },
      { status: 500 }
    )
  }
}
