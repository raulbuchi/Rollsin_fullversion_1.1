
"use client"

import { useState, useMemo } from 'react'
import { Recipe } from '@/lib/models'
import Image from 'next/image'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { 
  Users, 
  Clock, 
  Plus, 
  ChefHat,
  MonitorPlay,
  ShoppingBag,
  Timer,
  Utensils,
  CheckCircle2,
  Trash2,
  ListPlus,
  ArrowRight,
  Save,
  Calculator,
  Coffee,
  Pizza,
  Cake,
  MoreHorizontal,
  House
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from '@/lib/store'
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase'
import { collection, doc, query, orderBy } from 'firebase/firestore'
import { updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { format } from 'date-fns'

interface OrderItem {
  name: string
  price: number
  quantity: number
  course: 'Entrada' | 'Prato Principal' | 'Sobremesa' | 'Bebida'
  status: 'Pending' | 'Preparing' | 'Ready' | 'Served'
}

interface TableData {
  id: string
  tableNumber: string
  status: 'Livre' | 'Ocupada' | 'Aguardando Conta'
  capacity: number
  totalAmount: number
  occupants?: number
}

interface Customer {
  name: string
  contact: string
}

interface OrderData {
  id: string
  restaurantId: string
  tableId?: string
  customerName?: string
  customers?: Customer[]
  orderType: 'Dine-in' | 'Take-away'
  status: 'Pending' | 'Preparing' | 'Ready' | 'Served' | 'Completed'
  activeCourse?: 'Entradas' | 'Pratos Principais' | 'Sobremesas' | 'Finalizado'
  items?: OrderItem[]
  totalAmount: number
  orderDateTime: string
}

export default function OrdersPage() {
  const { user: localUser } = useAuth()
  const db = useFirestore()
  const { user } = useUser()
  const restaurantId = localUser?.restaurantId || 'gp-001'

  // Consultas memorizadas para evitar loops
  const tablesQuery = useMemoFirebase(() => {
    if (!db || !user?.uid || !restaurantId) return null
    return query(collection(db, 'restaurants', restaurantId, 'tables'), orderBy('tableNumber', 'asc'))
  }, [db, user?.uid, restaurantId])

  const recipesQuery = useMemoFirebase(() => {
    if (!db || !restaurantId) return null
    return query(collection(db, 'restaurants', restaurantId, 'recipes'))
  }, [db, restaurantId])

  const ordersQuery = useMemoFirebase(() => {
    if (!db || !user?.uid || !restaurantId) return null
    return query(
      collection(db, 'restaurants', restaurantId, 'orders'),
      orderBy('orderDateTime', 'asc')
    )
  }, [db, user?.uid, restaurantId])

  const { data: tables } = useCollection<TableData>(tablesQuery)
  const { data: recipes } = useCollection<Recipe>(recipesQuery)
  const { data: allOrders } = useCollection<OrderData>(ordersQuery)
  
  const activeOrders = allOrders?.filter(o => ['Pending', 'Preparing', 'Ready'].includes(o.status)) || []
  const takeawayOrders = activeOrders.filter(o => o.orderType === 'Take-away')

  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false)
  const [isTakeawayDialogOpen, setIsTakeawayDialogOpen] = useState(false)
  const [isEditItemsDialogOpen, setIsEditItemsDialogOpen] = useState(false)
  const [isSplitBillDialogOpen, setIsSplitBillDialogOpen] = useState(false)
  
  const [selectedTableId, setSelectedTableId] = useState<string>('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [newCustomerManual, setNewCustomerManual] = useState<Customer>({ name: '', contact: '' })
  const [activeOrderToEdit, setActiveOrderToEdit] = useState<OrderData | null>(null)
  const [activeTableToSplit, setActiveTableToSplit] = useState<TableData | null>(null)
  
  const [occupantsCount, setOccupantsCount] = useState<number>(1)

  // Item Addition State
  const [selectedCategory, setSelectedCategory] = useState<string>('Pratos Principais')
  const [currentItems, setCurrentItems] = useState<OrderItem[]>([])
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [newItemQty, setNewItemQty] = useState('1')
  const [newItemCourse, setNewItemCourse] = useState<'Entrada' | 'Prato Principal' | 'Sobremesa' | 'Bebida'>('Prato Principal')

  const filteredRecipes = useMemo(() => {
    if (!recipes) return []
    if (selectedCategory === 'Outros') return recipes.filter(r => !['Bebidas', 'Pratos Principais', 'Entradas', 'Sobremesas'].includes(r.category || ''))
    return recipes.filter(r => r.category === selectedCategory)
  }, [recipes, selectedCategory])

  const handleAddItem = () => {
    if (!newItemName || !newItemPrice) return
    const item: OrderItem = {
      name: newItemName,
      price: parseFloat(newItemPrice) || 0,
      quantity: parseInt(newItemQty) || 1,
      course: newItemCourse,
      status: 'Pending'
    }
    setCurrentItems([...currentItems, item])
    setNewItemName('')
    setNewItemPrice('')
    setNewItemQty('1')
  }

  const handleRemoveItem = (index: number) => {
    setCurrentItems(currentItems.filter((_, i) => i !== index))
  }

  const totalCurrentAmount = useMemo(() => {
    return currentItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  }, [currentItems])

  const handleCreateOrder = () => {
    if (!db || currentItems.length === 0) return
    const total = totalCurrentAmount

    if (selectedTableId) {
      const tableRef = doc(db, 'restaurants', restaurantId, 'tables', selectedTableId)
      const table = tables?.find(t => t.id === selectedTableId)
      updateDocumentNonBlocking(tableRef, {
        status: 'Ocupada',
        totalAmount: (table?.totalAmount || 0) + total
      })
      addDocumentNonBlocking(collection(db, 'restaurants', restaurantId, 'orders'), {
        tableId: selectedTableId,
        restaurantId,
        orderDateTime: new Date().toISOString(),
        status: 'Pending',
        activeCourse: 'Entradas',
        items: currentItems,
        totalAmount: total,
        orderType: 'Dine-in'
      })
    } else {
      addDocumentNonBlocking(collection(db, 'restaurants', restaurantId, 'orders'), {
        customers: customers.length > 0 ? customers : [{ name: 'Cliente Balcão', contact: '' }],
        customerName: customers[0]?.name || 'Cliente Balcão',
        restaurantId,
        orderDateTime: new Date().toISOString(),
        status: 'Pending',
        activeCourse: 'Entradas',
        items: currentItems,
        totalAmount: total,
        orderType: 'Take-away'
      })
    }
    resetForm()
  }

  const handleUpdateItems = () => {
    if (!db || !activeOrderToEdit || currentItems.length === 0) return
    const total = totalCurrentAmount
    const orderRef = doc(db, 'restaurants', restaurantId, 'orders', activeOrderToEdit.id)
    
    // Se for mesa, atualizar o total da mesa também
    if (activeOrderToEdit.tableId) {
      const tableRef = doc(db, 'restaurants', restaurantId, 'tables', activeOrderToEdit.tableId)
      const table = tables?.find(t => t.id === activeOrderToEdit.tableId)
      if (table) {
        // Ajustamos o total da mesa: subtraímos o antigo total do pedido e somamos o novo
        updateDocumentNonBlocking(tableRef, {
          totalAmount: table.totalAmount - activeOrderToEdit.totalAmount + total
        })
      }
    }

    updateDocumentNonBlocking(orderRef, {
      items: currentItems,
      totalAmount: total
    })
    
    resetForm()
  }

  const handleUpdateStatus = (id: string, status: OrderData['status']) => {
    if (!db) return
    updateDocumentNonBlocking(doc(db, 'restaurants', restaurantId, 'orders', id), { status })
  }

  const handleUpdateCourse = (id: string, newCourse: OrderData['activeCourse']) => {
    if (!db) return
    let newStatus = 'Preparing'
    if (newCourse === 'Finalizado') newStatus = 'Completed'
    
    updateDocumentNonBlocking(doc(db, 'restaurants', restaurantId, 'orders', id), { 
      activeCourse: newCourse,
      status: newStatus
    })
  }

  const handleItemStatusChange = (order: OrderData, itemIndex: number, newStatus: OrderItem['status']) => {
    if (!db || !order.items) return
    const updatedItems = [...order.items]
    updatedItems[itemIndex].status = newStatus
    
    updateDocumentNonBlocking(doc(db, 'restaurants', restaurantId, 'orders', order.id), {
      items: updatedItems
    })
  }

  const resetForm = () => {
    setIsOrderDialogOpen(false)
    setIsTakeawayDialogOpen(false)
    setIsEditItemsDialogOpen(false)
    setIsSplitBillDialogOpen(false)
    setSelectedTableId('')
    setCustomers([])
    setNewCustomerManual({ name: '', contact: '' })
    setCurrentItems([])
    setActiveOrderToEdit(null)
    setActiveTableToSplit(null)
  }

  const openEditItems = (order: OrderData) => {
    setActiveOrderToEdit(order)
    setCurrentItems(order.items || [])
    setCustomers(order.customers || (order.customerName ? [{ name: order.customerName, contact: '' }] : []))
    setIsEditItemsDialogOpen(true)
  }

  const openSplitBill = (e: React.MouseEvent, table: TableData) => {
    e.stopPropagation()
    setActiveTableToSplit(table)
    setOccupantsCount(table.occupants || 2)
    setIsSplitBillDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-headline text-primary">Operação de Serviço</h1>
          <p className="text-xs text-muted-foreground">Gestão de mesas e cozinha em tempo real.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsTakeawayDialogOpen(true)} className="border-secondary text-secondary hover:bg-secondary/10">
            <ShoppingBag className="w-4 h-4 mr-2" /> Novo Take-away
          </Button>
          <Button onClick={() => setIsOrderDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Novo Pedido Mesa
          </Button>
        </div>
      </div>

      <Tabs defaultValue="salao" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-muted/20">
          <TabsTrigger value="salao"><MonitorPlay className="w-4 h-4 mr-2" /> Salão</TabsTrigger>
          <TabsTrigger value="cozinha"><ChefHat className="w-4 h-4 mr-2" /> Cozinha</TabsTrigger>
        </TabsList>

        <TabsContent value="salao" className="space-y-12">
          {/* DIVISÃO HORIZONTAL: MESAS NO TOPO */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2 border-primary/20">
              <Utensils className="w-5 h-5 text-primary" />
              <h2 className="font-bold uppercase tracking-tight text-primary">Status das Mesas</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {tables?.map(table => {
                const tableOrder = allOrders?.find(o => o.tableId === table.id && o.status !== 'Completed');
                return (
                  <Card 
                    key={table.id}
                    className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary ${table.status === 'Livre' ? 'opacity-40 grayscale border-dashed' : 'border-primary bg-primary/5 shadow-lg shadow-primary/5'}`}
                    onClick={() => {
                      if (tableOrder) {
                        openEditItems(tableOrder);
                      } else {
                        setSelectedTableId(table.id);
                        setIsOrderDialogOpen(true);
                      }
                    }}
                  >
                    <CardHeader className="p-3">
                      <div className="flex justify-between">
                        <span className="text-[10px] font-bold">MESA {table.tableNumber}</span>
                        <Badge variant={table.status === 'Livre' ? 'outline' : 'default'} className="text-[8px] h-4">
                          {table.status}
                        </Badge>
                      </div>
                      <p className="text-lg font-black text-primary mt-1">R$ {(table.totalAmount || 0).toFixed(2)}</p>
                      {tableOrder && (
                      <div className="flex flex-col gap-2 items-start mt-2 border-t border-primary/10 pt-2 w-full">
                        <Badge variant="outline" className="text-[8px] h-4 w-fit">
                          {tableOrder.activeCourse || 'Preparo'}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-auto py-1.5 px-2 text-[9px] border w-full justify-start text-left whitespace-normal"
                          onClick={(e) => openSplitBill(e, table)}
                        >
                          <Calculator className="w-3 h-3 mr-1 shrink-0" /> <span className="truncate">Dividir Conta</span>
                        </Button>
                      </div>
                      )}
                      {tableOrder && (
                        <p className="text-[8px] text-primary/70 font-bold uppercase mt-2 flex items-center gap-1">
                          <Plus className="w-2 h-2" /> Adicionar Itens
                        </p>
                      )}
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* DIVISÃO HORIZONTAL: TAKE-AWAY NA BASE */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2 border-secondary/20">
              <ShoppingBag className="w-5 h-5 text-secondary" />
              <h2 className="font-bold uppercase tracking-tight text-secondary">Pedidos de Retirada (Take-away)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {takeawayOrders.map(order => (
                <Card 
                  key={order.id} 
                  className="border-secondary/30 bg-secondary/5 border-l-4 border-l-secondary shadow-md cursor-pointer hover:bg-secondary/10 transition-colors"
                  onClick={() => openEditItems(order)}
                >
                  <CardHeader className="p-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                         <span className="text-xs font-bold truncate block">
                           {order.customers && order.customers.length > 0 
                            ? order.customers.map(c => c.name).join(', ') 
                            : order.customerName || 'Sem nome'}
                         </span>
                         <Badge variant="outline" className="text-secondary border-secondary text-[8px] uppercase h-4">{order.status}</Badge>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                        <Clock className="w-3 h-3" />
                        {order.orderDateTime && format(new Date(order.orderDateTime), 'HH:mm')}
                      </div>
                    </div>
                    <p className="text-lg font-black text-secondary mt-1">R$ {order.totalAmount.toFixed(2)}</p>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="cozinha">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeOrders.map(order => {
              const isTable = order.orderType === 'Dine-in';
              const tableName = tables?.find(t => t.id === order.tableId)?.tableNumber;
              
              return (
                <Card key={order.id} className={`border-l-4 shadow-md overflow-hidden ${isTable ? 'border-l-primary bg-primary/5' : 'border-l-secondary bg-secondary/5'}`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <Badge variant={isTable ? 'default' : 'secondary'} className="text-[9px] font-bold">
                          {isTable ? 'MESA' : 'TAKE-AWAY'}
                        </Badge>
                        <CardTitle className={`text-xl font-black ${isTable ? 'text-primary' : 'text-secondary'}`}>
                          {isTable 
                            ? `MESA ${tableName || '??'}` 
                            : (order.customers && order.customers.length > 0 
                               ? order.customers[0].name + (order.customers.length > 1 ? ` +${order.customers.length - 1}` : '')
                               : order.customerName || 'Sem nome')}
                        </CardTitle>
                      </div>
                      <div className="bg-background/80 px-2 py-1 rounded text-xs font-mono font-bold flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        {order.orderDateTime && format(new Date(order.orderDateTime), 'HH:mm')}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="bg-background/40 p-3 rounded-lg border-2 border-dashed text-sm">
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-bold text-muted-foreground uppercase text-[10px]">Momento Atual:</p>
                        <Badge variant="secondary" className="h-4 text-[9px] uppercase">{order.activeCourse || 'Preparo'}</Badge>
                      </div>
                      <div className="space-y-2 mb-3">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-1.5 bg-card rounded shadow-sm border text-xs font-bold gap-2">
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="truncate">{item.quantity}x {item.name}</span>
                              <span className="text-[9px] text-muted-foreground font-normal truncate">{item.course}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {item.status === 'Pending' && (
                                <Badge variant="outline" className="text-[9px] cursor-pointer hover:bg-muted" onClick={() => handleItemStatusChange(order, idx, 'Preparing')}>Pendente</Badge>
                              )}
                              {item.status === 'Preparing' && (
                                <Badge className="text-[9px] bg-orange-500 hover:bg-orange-600 cursor-pointer" onClick={() => handleItemStatusChange(order, idx, 'Ready')}>Fazendo</Badge>
                              )}
                              {item.status === 'Ready' && (
                                <Badge className="text-[9px] bg-green-500 hover:bg-green-600 cursor-pointer" onClick={() => handleItemStatusChange(order, idx, 'Served')}>Pronto</Badge>
                              )}
                              {item.status === 'Served' && (
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <Separator className="mb-2" />
                      <p className={`font-black text-right ${isTable ? 'text-primary' : 'text-secondary'}`}>Total R$ {order.totalAmount.toFixed(2)}</p>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2 gap-2 flex-col">
                    {order.activeCourse === 'Entradas' && (
                      <Button className={`w-full font-bold h-auto py-2 whitespace-normal leading-tight text-[10px] ${isTable ? 'bg-primary/90 hover:bg-primary/80' : 'bg-secondary/90 hover:bg-secondary/80'}`} onClick={() => handleUpdateCourse(order.id, 'Pratos Principais')}>ENTRADAS SERVIDAS <ArrowRight className="w-3 h-3 ml-1 shrink-0" /></Button>
                    )}
                    {order.activeCourse === 'Pratos Principais' && (
                      <Button className={`w-full font-bold h-auto py-2 whitespace-normal leading-tight text-[10px] ${isTable ? 'bg-primary/90 hover:bg-primary/80' : 'bg-secondary/90 hover:bg-secondary/80'}`} onClick={() => handleUpdateCourse(order.id, 'Sobremesas')}>PRATOS SERVIDOS <ArrowRight className="w-3 h-3 ml-1 shrink-0" /></Button>
                    )}
                    {order.activeCourse === 'Sobremesas' && (
                      <Button className={`w-full font-bold h-auto py-2 whitespace-normal leading-tight text-[10px] bg-green-600 hover:bg-green-700`} onClick={() => handleUpdateCourse(order.id, 'Finalizado')}>SOBREMESAS SERVIDAS <ArrowRight className="w-3 h-3 ml-1 shrink-0" /></Button>
                    )}
                    {(order.status === 'Pending' || order.status === 'Preparing' || order.status === 'Ready') && (
                      <Button variant="outline" className="w-full font-bold h-auto py-2 whitespace-normal leading-tight text-[10px] mt-1" onClick={() => handleUpdateStatus(order.id, 'Completed')}>MARCAR FINALIZADO</Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* DIALOGS DE LANÇAMENTO E EDIÇÃO */}
      <Dialog open={isOrderDialogOpen || isTakeawayDialogOpen || isEditItemsDialogOpen} onOpenChange={(open) => {
        if (!open) resetForm()
      }}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-[#1f2937] text-white">
          <DialogHeader className="p-4 border-b border-gray-700">
            <DialogTitle className="text-blue-400">
                {isEditItemsDialogOpen ? "Editar Itens do Pedido" : isTakeawayDialogOpen ? "Novo Take-away (Balcão)" : "Lançar Pedido (Mesa)"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {!isEditItemsDialogOpen && !isTakeawayDialogOpen && (
              <div className="space-y-2">
                <Label className="text-gray-400 text-sm">Selecione a Mesa</Label>
                <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue placeholder="Escolha a mesa..." /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    {tables?.map(t => <SelectItem key={t.id} value={t.id}>Mesa {t.tableNumber}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Categorias */}
            <div className="space-y-2">
              <Label className="text-gray-400 text-sm">Categorias de Menu</Label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {[
                  { name: 'Bebidas', icon: Coffee },
                  { name: 'Pratos Principais', icon: Utensils },
                  { name: 'Entradas', icon: Pizza },
                  { name: 'Sobremesas', icon: Cake },
                  { name: 'Outros', icon: MoreHorizontal },
                ].map((cat) => (
                  <Button 
                    key={cat.name}
                    variant={selectedCategory === cat.name ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`flex flex-col h-20 w-20 ${selectedCategory === cat.name ? 'bg-blue-600 border-blue-400' : 'bg-gray-800 border-gray-700'}`}
                  >
                    <cat.icon className="w-6 h-6 mb-1" />
                    <span className="text-[10px]">{cat.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Grid de Produtos */}
            <div className="grid grid-cols-3 gap-3 h-[300px] overflow-y-auto pr-2">
              {filteredRecipes && filteredRecipes.length > 0 ? (
                filteredRecipes.map((p) => (
                  <Card key={p.id} className="bg-gray-800 border-gray-700 p-2">
                    <div className="rounded-md h-20 w-full bg-gray-700 mb-2 flex items-center justify-center text-gray-500 text-xs">Foto</div>
                    <p className="font-bold text-xs truncate text-white">{p.name}</p>
                    <p className="text-[10px] text-gray-400 mb-2 truncate">R$ {p.totalCost.toFixed(2)}</p>
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-blue-400">R$ {p.totalCost.toFixed(2)}</span>
                        <Button size="icon" className="h-6 w-6 bg-blue-600 text-white">+</Button>
                    </div>
                  </Card>
                ))
              ) : (
                <p className="text-center text-sm text-gray-400 col-span-3 py-10">Nenhuma ficha técnica nesta categoria.</p>
              )}
            </div>

            {/* Resumo */}
            <div className="border-t border-gray-700 pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                      <Label className="text-xs text-gray-400">QUANTIDADE</Label>
                      <Input defaultValue="1" className="bg-gray-800 border-gray-700 text-white"/>
                  </div>
                  <div className="space-y-1">
                      <Label className="text-xs text-gray-400">ETAPA DO PEDIDO</Label>
                      <Select defaultValue="Prato Principal">
                          <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue/></SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700 text-white"><SelectItem value="Prato Principal">Prato Principal</SelectItem></SelectContent>
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

          <DialogFooter className="p-6 pt-2">
            {isEditItemsDialogOpen ? (
              <Button onClick={handleUpdateItems} className="w-full font-bold h-11 bg-primary gap-2">
                <Save className="w-4 h-4" /> SALVAR ALTERAÇÕES
              </Button>
            ) : (
              <Button onClick={handleCreateOrder} disabled={currentItems.length === 0} className={`w-full font-bold h-11 gap-2 ${isTakeawayDialogOpen ? 'bg-secondary hover:bg-secondary/90' : 'bg-primary'}`}>
                {isTakeawayDialogOpen ? <ShoppingBag className="w-4 h-4" /> : <ChefHat className="w-4 h-4" />}
                CONFIRMAR E ENVIAR
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isSplitBillDialogOpen} onOpenChange={setIsSplitBillDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" /> Dividir Conta (Mesa {activeTableToSplit?.tableNumber})
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest">Total da Mesa</p>
              <p className="text-4xl font-black text-primary">R$ {(activeTableToSplit?.totalAmount || 0).toFixed(2)}</p>
            </div>
            
            <div className="space-y-4 bg-muted/20 p-4 rounded-xl border">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Número de Pessoas</Label>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => setOccupantsCount(Math.max(1, occupantsCount - 1))}>-</Button>
                <div className="flex-1 text-center font-black text-2xl">{occupantsCount}</div>
                <Button variant="outline" size="icon" onClick={() => setOccupantsCount(occupantsCount + 1)}>+</Button>
              </div>
            </div>

            <div className="border-t pt-4 flex justify-between items-center bg-primary/10 p-4 rounded-xl">
              <span className="font-bold text-sm">Valor por Pessoa:</span>
              <span className="text-2xl font-black text-primary">
                R$ {((activeTableToSplit?.totalAmount || 0) / Math.max(1, occupantsCount)).toFixed(2)}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="w-full" onClick={() => setIsSplitBillDialogOpen(false)}>FECHAR</Button>
            <Button className="w-full font-bold" onClick={() => {
              if (activeTableToSplit && db) {
                updateDocumentNonBlocking(doc(db, 'restaurants', restaurantId, 'tables', activeTableToSplit.id), { status: 'Aguardando Conta', occupants: occupantsCount })
                setIsSplitBillDialogOpen(false)
              }
            }}>SOLICITAR PAGAMENTO</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
