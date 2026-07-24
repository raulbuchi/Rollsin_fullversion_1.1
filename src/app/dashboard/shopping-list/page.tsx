"use client"

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Trash2, ShoppingBag, CheckCircle2, Circle, ChevronDown, ChevronRight } from 'lucide-react'
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase'
import { collection, query, doc } from 'firebase/firestore'
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/store'

interface InventoryItem {
  id: string
  name: string
  quantity: number
  unit: string
  cost: number
  status: string
  minStock?: number
  category?: string
}

interface ShoppingListItem {
  id: string
  inventoryItemId?: string
  name: string
  quantityToBuy: number
  unit: string
  purchased: boolean
  restaurantId: string
  category?: string
}

const CATEGORIES = ['Hortifruti', 'Carnes', 'Laticínios', 'Mercearia', 'Bebidas', 'Limpeza', 'Embalagens', 'Outros']

export default function ShoppingListPage() {
  const { user: localUser } = useAuth()
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const restaurantId = localUser?.restaurantId || 'gp-001'
  
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newItem, setNewItem] = useState({ inventoryItemId: '', name: '', quantityToBuy: '', unit: 'kg', category: 'Outros' })
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => ({ ...prev, [category]: !prev[category] }))
  }

  // Fetch Inventory for selection and suggestions
  const inventoryQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, 'restaurants', restaurantId, 'ingredients'))
  }, [db, user])
  const { data: inventory } = useCollection<InventoryItem>(inventoryQuery)

  // Fetch Shopping List
  const shoppingListQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, 'restaurants', restaurantId, 'shoppingListItems'))
  }, [db, user])
  const { data: shoppingList, isLoading } = useCollection<ShoppingListItem>(shoppingListQuery)

  const handleAddItem = () => {
    if (!newItem.name || !newItem.quantityToBuy || !db) return

    const colRef = collection(db, 'restaurants', restaurantId, 'shoppingListItems')
    addDocumentNonBlocking(colRef, {
      inventoryItemId: newItem.inventoryItemId || null,
      name: newItem.name,
      quantityToBuy: parseFloat(newItem.quantityToBuy),
      unit: newItem.unit,
      purchased: false,
      restaurantId,
      category: newItem.category || 'Outros'
    })

    setNewItem({ inventoryItemId: '', name: '', quantityToBuy: '', unit: 'kg', category: 'Outros' })
    setIsAddDialogOpen(false)
    toast({ title: "Sucesso", description: "Item adicionado à lista de compras." })
  }

  const handleTogglePurchased = (item: ShoppingListItem) => {
    if (!db) return
    const docRef = doc(db, 'restaurants', restaurantId, 'shoppingListItems', item.id)
    updateDocumentNonBlocking(docRef, {
      purchased: !item.purchased
    })
  }

  const handleDeleteItem = (id: string) => {
    if (!db) return
    const docRef = doc(db, 'restaurants', restaurantId, 'shoppingListItems', id)
    deleteDocumentNonBlocking(docRef)
    toast({ variant: "destructive", title: "Removido", description: "O item foi removido da lista." })
  }

  const handleClearDemoShoppingList = () => {
    if (!db || !shoppingList || shoppingList.length === 0) return
    shoppingList.forEach(item => {
      deleteDocumentNonBlocking(doc(db, 'restaurants', restaurantId, 'shoppingListItems', item.id))
    })
    toast({
      title: "Lista de Compras Limpa",
      description: "Todos os itens de demonstração da lista de compras foram excluídos com sucesso."
    })
  }

  const handleInventorySelect = (invId: string) => {
    const selected = inventory?.find(i => i.id === invId)
    if (selected) {
      setNewItem({
        ...newItem,
        inventoryItemId: selected.id,
        name: selected.name,
        unit: selected.unit,
        category: selected.category || 'Outros'
      })
    } else {
      setNewItem({
        ...newItem,
        inventoryItemId: '',
        name: '',
      })
    }
  }

  const filteredList = shoppingList?.filter(item => 
    (item.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => Number(a.purchased) - Number(b.purchased)) || []

  const groupedShoppingList = CATEGORIES.map(cat => ({
    category: cat,
    items: filteredList.filter(item => (item.category || 'Outros') === cat)
  })).filter(group => group.items.length > 0)

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary">Lista de Compras</h1>
          <p className="text-muted-foreground">Planeje suas compras e gere sugestões baseadas no estoque.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar na lista..." 
              className="pl-8" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {shoppingList && shoppingList.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="gap-2 text-destructive hover:bg-destructive/10 border-destructive/30">
                  <Trash2 className="w-4 h-4" />
                  Apagar Dados Demo
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Apagar Dados da Versão Demo da Lista de Compras</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá remover permanentemente todos os itens da lista de compras. Deseja continuar?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleClearDemoShoppingList}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Confirmar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Novo Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar à Lista de Compras</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Selecionar do Inventário (Opcional)</Label>
                  <Select value={newItem.inventoryItemId} onValueChange={handleInventorySelect}>
                    <SelectTrigger><SelectValue placeholder="Selecione um insumo..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Item Avulso (Não está no inventário)</SelectItem>
                      {inventory?.map(inv => (
                        <SelectItem key={inv.id} value={inv.id}>{inv.name} ({inv.quantity} {inv.unit} em estoque)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Item</Label>
                    <Input 
                      value={newItem.name} 
                      onChange={(e) => setNewItem({...newItem, name: e.target.value})} 
                      placeholder="Ex: Tomate" 
                      disabled={!!newItem.inventoryItemId && newItem.inventoryItemId !== 'none'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select 
                      value={newItem.category} 
                      onValueChange={(val) => setNewItem({...newItem, category: val})}
                      disabled={!!newItem.inventoryItemId && newItem.inventoryItemId !== 'none'}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantidade a Comprar</Label>
                    <Input type="number" placeholder="0.00" value={newItem.quantityToBuy} onChange={(e) => setNewItem({...newItem, quantityToBuy: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Unidade</Label>
                    <Select 
                      value={newItem.unit} 
                      onValueChange={(val) => setNewItem({...newItem, unit: val})}
                      disabled={!!newItem.inventoryItemId && newItem.inventoryItemId !== 'none'}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">KG</SelectItem>
                        <SelectItem value="un">UN</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                        <SelectItem value="g">G</SelectItem>
                        <SelectItem value="ml">ML</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddItem}>Adicionar à Lista</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-none shadow-md overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-12 text-center">Status</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedShoppingList.map(group => (
                <React.Fragment key={group.category}>
                  <TableRow 
                    className="bg-muted/30 hover:bg-muted/30 cursor-pointer group"
                    onClick={() => toggleCategory(group.category)}
                  >
                    <TableCell colSpan={5} className="py-2">
                      <div className="flex items-center gap-2 font-bold text-primary text-xs uppercase tracking-wider">
                        {collapsedCategories[group.category] ? (
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        )}
                        {group.category}
                        <Badge variant="secondary" className="ml-2 bg-background font-normal">
                          {group.items.length} {group.items.length === 1 ? 'item' : 'itens'}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {!collapsedCategories[group.category] && group.items.map(item => (
                    <TableRow key={item.id} className={`hover:bg-muted/10 transition-colors ${item.purchased ? 'opacity-50 bg-muted/5' : ''}`}>
                      <TableCell className="text-center">
                        <button 
                          onClick={() => handleTogglePurchased(item)}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          {item.purchased ? (
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className={`font-bold ${item.purchased ? 'line-through text-muted-foreground' : ''}`}>
                        {item.name}
                      </TableCell>
                      <TableCell>
                        {item.quantityToBuy} <span className="text-xs text-muted-foreground uppercase">{item.unit}</span>
                      </TableCell>
                      <TableCell>
                        {item.inventoryItemId ? (
                          <Badge variant="outline" className="text-[10px]">Inventário</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Avulso</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover da Lista?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover "{item.name}" da sua lista de compras?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteItem(item.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Confirmar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
              {!isLoading && filteredList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">
                    Sua lista de compras está vazia.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
