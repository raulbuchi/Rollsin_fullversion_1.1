
'use client'

import { useState } from 'react'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Utensils, Coffee, Pizza, Cake, MoreHorizontal, Plus, House } from 'lucide-react'
import Image from 'next/image'

export function OrderEntryModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [selectedCategory, setSelectedCategory] = useState('Pratos Principais')
  
  const categories = [
    { name: 'Bebidas', icon: Coffee },
    { name: 'Pratos Principais', icon: Utensils },
    { name: 'Entradas', icon: Pizza },
    { name: 'Sobremesas', icon: Cake },
    { name: 'Outros', icon: MoreHorizontal },
  ]

  const products = [
    { name: 'Temaki Philadelphia', price: 'R$ 3,00' },
    { name: 'Hot Roll', price: 'R$ 5,00' },
    { name: 'Combinado 20 Unid', price: 'R$ 3,00' },
    { name: 'Combinado 10 Unid', price: 'R$ 3,00' },
    { name: 'Combinado 20 Unid', price: 'R$ 3,00' },
    { name: 'Combinado 10 Unid', price: 'R$ 3,00' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-[#1f2937] text-white">
        <DialogHeader className="p-4 border-b border-gray-700">
          <DialogTitle className="text-blue-400">Lançar Pedido (Mesa)</DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-6">
          {/* Mesa */}
          <div className="space-y-2">
            <Label className="text-gray-400 text-sm">Selecione a Mesa</Label>
            <Select defaultValue="Mesa 12">
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                <SelectItem value="Mesa 12">Mesa 12</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Categorias */}
          <div className="space-y-2">
            <Label className="text-gray-400 text-sm">Categorias de Menu</Label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((cat) => (
                <Button 
                  key={cat.name}
                  variant={selectedCategory === cat.name ? 'default' : 'outline'}
                  className={`flex flex-col h-20 w-20 ${selectedCategory === cat.name ? 'bg-blue-600 border-blue-400' : 'bg-gray-800 border-gray-700'}`}
                  onClick={() => setSelectedCategory(cat.name)}
                >
                  <cat.icon className="w-6 h-6 mb-1" />
                  <span className="text-[10px]">{cat.name}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Grid de Produtos */}
          <div className="grid grid-cols-3 gap-3 h-[300px] overflow-y-auto pr-2">
            {products.map((p, i) => (
              <Card key={i} className="bg-gray-800 border-gray-700 p-2">
                <Image src={`https://picsum.photos/seed/${i}/200/200`} alt={p.name} width={200} height={200} className="rounded-md h-20 w-full object-cover mb-2" referrerPolicy="no-referrer" />
                <p className="font-bold text-xs truncate">{p.name}</p>
                <p className="text-[10px] text-gray-400 mb-2">curta descrição aqui...</p>
                <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-blue-400">{p.price}</span>
                    <Button size="icon" className="h-6 w-6 bg-blue-600">+</Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Resumo */}
          <div className="border-t border-gray-700 pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label className="text-xs text-gray-400">QUANTIDADE</Label>
                    <Input defaultValue="1" className="bg-gray-800 border-gray-700"/>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs text-gray-400">ETAPA DO PEDIDO</Label>
                    <Select defaultValue="Prato Principal">
                        <SelectTrigger className="bg-gray-800 border-gray-700"><SelectValue/></SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700"><SelectItem value="Prato Principal">Prato Principal</SelectItem></SelectContent>
                    </Select>
                </div>
            </div>
            
            <Button className="w-full bg-gray-700 hover:bg-gray-600 text-white gap-2">
                <Plus className="w-4 h-4"/> + Incluir no Pedido
            </Button>
            
            <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white gap-2 h-12 text-lg">
                <House className="w-5 h-5"/> CONFIRMAR E ENVIAR
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
