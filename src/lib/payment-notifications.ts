export interface PaymentNotification {
  id: string
  restaurantId: string
  restaurantName: string
  ownerName: string
  email: string
  phone: string
  planName: string
  amountUSD: number
  amountBRL: number
  triggeredAt: string
  status: 'unread' | 'read' | 'notified_email' | 'notified_whatsapp'
  type: 'payment_overdue' | 'trial_expiring_soon'
  message: string
  whatsappLink: string
  emailSubject: string
  emailBody: string
}

const USD_TO_BRL_RATE = 5.50

/**
 * Generates automated notification details for an overdue restaurant payment.
 */
export function createOverduePaymentNotification(
  restaurantId: string,
  restaurantName: string,
  ownerName: string,
  email: string,
  phone: string,
  planName: string,
  amountUSD: number
): PaymentNotification {
  const amountBRL = amountUSD * USD_TO_BRL_RATE
  const cleanPhone = phone.replace(/\D/g, '')

  const message = `🚨 ALERTA DE COBRANÇA: O pagamento da mensalidade de ${planName} do restaurante ${restaurantName} consta como 'atrasado' (US$ ${amountUSD.toFixed(2)} / R$ ${amountBRL.toFixed(2)}).`

  const whatsappText = `Olá ${ownerName}! Verificamos que a mensalidade do ${planName} para o ${restaurantName} (US$ ${amountUSD.toFixed(2)} / aprox. R$ ${amountBRL.toFixed(2)}) encontra-se com o status de pagamento pendente/atrasado no Rolls-In. Para manter todos os seus recursos ativos, entre em contato ou confirme a quitação. Atenciosamente, Equipe Rolls-In.`

  const whatsappLink = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(whatsappText)}`

  const emailSubject = `[Rolls-In] Aviso Importante: Pagamento da Assinatura - ${restaurantName}`

  const emailBody = `Prezado(a) ${ownerName},

Espero que este e-mail o encontre bem.

Identificamos que a mensalidade do plano ${planName} referente ao estabelecimento ${restaurantName} consta como pendente de pagamento em nosso sistema.

Resumo dos Dados da Assinatura:
• Estabelecimento: ${restaurantName}
• Plano: ${planName}
• Valor em Dólares: US$ ${amountUSD.toFixed(2)}
• Valor Estimado em Reais: R$ ${amountBRL.toFixed(2)}
• Status Atual: Atrasado / Pendente

Para regularizar e evitar interrupções nos serviços de fichas técnicas, controle de estoque e ordens de produção, por favor acesse o portal ou entre em contato com nossa equipe financeira via WhatsApp.

Atenciosamente,
Equipe Financeira & Suporte Rolls-In
contato@rollsin.com.br
`

  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    restaurantId,
    restaurantName,
    ownerName,
    email,
    phone,
    planName,
    amountUSD,
    amountBRL,
    triggeredAt: new Date().toISOString(),
    status: 'unread',
    type: 'payment_overdue',
    message,
    whatsappLink,
    emailSubject,
    emailBody
  }
}
