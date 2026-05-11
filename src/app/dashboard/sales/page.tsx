"use client"

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { ShoppingCart } from 'lucide-react'

export default function SalesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline text-primary">Vendas e Histórico</h1>
        <p className="text-muted-foreground">Consulte o histórico de pedidos e faturamento.</p>
      </div>

      <Card className="bg-primary/5 border-dashed border-2">
        <CardContent className="py-20 text-center space-y-4">
          <ShoppingCart className="w-16 h-16 mx-auto text-primary opacity-30" />
          <h3 className="text-xl font-bold">Módulo de Vendas</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Este módulo permite a consulta detalhada de cupons fiscais e integração com ERPs.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}