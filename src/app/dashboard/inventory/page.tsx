
"use client"

import { useState, Fragment } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Pencil, Trash2, Image as ImageIcon, Upload, AlertTriangle, ShoppingBag, Sparkles, CheckCircle2, Circle } from 'lucide-react'
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase'
import { collection, query, doc } from 'firebase/firestore'
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { ReceiptScanner } from './components/ReceiptScanner'
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
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface Supplier {
  name: string
  cost: number
  unit: string
  lastPurchaseDate?: string
}

interface InventoryItem {
  id: string
  name: string
  quantity: number
  unit: string
  cost: number
  suppliers?: Supplier[]
  status: string
  imageUrl?: string
  minStock?: number
  category?: string
  expirationDate?: string
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
const STANDARD_UNITS = ['kg', 'un', 'L', 'g', 'ml']

const SupplierManager = ({ 
  suppliers, 
  onUpdate, 
  currentUnit,
  onSelectBest 
}: { 
  suppliers: Supplier[] | undefined, 
  onUpdate: (suppliers: Supplier[]) => void,
  currentUnit: string,
  onSelectBest?: (cost: number) => void
}) => {
  const [newS, setNewS] = useState<Supplier>({ name: '', cost: 0, unit: currentUnit })

  const addSupplier = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!newS.name || newS.cost <= 0) return
    onUpdate([...(suppliers || []), { ...newS, unit: newS.unit || currentUnit }])
    setNewS({ name: '', cost: 0, unit: currentUnit })
  }

  const removeSupplier = (index: number) => {
    const updated = [...(suppliers || [])]
    updated.splice(index, 1)
    onUpdate(updated)
  }

  return (
    <div className="space-y-3 border-t pt-4 mt-2">
      <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Fornecedores & Custos</Label>
      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <Label className="text-[10px]">Nome Fornecedor</Label>
          <Input value={newS.name} onChange={(e) => setNewS({...newS, name: e.target.value})} placeholder="Ex: Mercado Local" className="h-8 text-xs" />
        </div>
        <div className="w-20 space-y-1">
          <Label className="text-[10px]">Custo</Label>
          <Input type="number" value={newS.cost || ''} onChange={(e) => setNewS({...newS, cost: parseFloat(e.target.value)})} className="h-8 text-xs" />
        </div>
        <Button size="sm" variant="secondary" className="h-8 w-8 p-0" onClick={addSupplier}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
        {suppliers?.map((s, idx) => (
          <div key={idx} className="flex justify-between items-center bg-accent/50 p-2 rounded-md text-xs border">
            <div className="flex flex-col">
              <span className="font-bold">{s.name}</span>
              <span className="text-muted-foreground">R$ {s.cost.toFixed(2)} / {s.unit}</span>
            </div>
            <div className="flex gap-1">
              {onSelectBest && (
                <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-primary hover:bg-primary/10" onClick={() => onSelectBest(s.cost)}>
                  Usar Este Custo
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10" onClick={() => removeSupplier(idx)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
        {(!suppliers || suppliers.length === 0) && (
          <p className="text-[10px] text-muted-foreground italic text-center py-2">Nenhum fornecedor cadastrado.</p>
        )}
      </div>
    </div>
  )
}

export default function InventoryPage() {
  const { t, i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const restaurantId = 'gp-001'
  
  const [searchTerm, setSearchTerm] = useState('')
  const [shoppingSearchTerm, setShoppingSearchTerm] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddShoppingItemDialogOpen, setIsAddShoppingItemDialogOpen] = useState(false)
  
  const [newItem, setNewItem] = useState({ 
    name: '', 
    quantity: '', 
    unit: 'kg', 
    cost: '', 
    imageUrl: '', 
    minStock: '', 
    category: 'Outros', 
    expirationDate: '',
    suppliers: [] as Supplier[]
  })
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [newShoppingItem, setNewShoppingItem] = useState({ inventoryItemId: '', name: '', quantityToBuy: '', unit: 'kg', category: 'Outros' })

  const [newSupplier, setNewSupplier] = useState<Supplier>({ name: '', cost: 0, unit: 'kg' })

  const inventoryQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, 'restaurants', restaurantId, 'ingredients'))
  }, [db, user])

  const { data: inventory, isLoading } = useCollection<InventoryItem>(inventoryQuery)

  const shoppingListQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, 'restaurants', restaurantId, 'shoppingListItems'))
  }, [db, user])
  const { data: shoppingList, isLoading: isLoadingShopping } = useCollection<ShoppingListItem>(shoppingListQuery)

  const getExpirationStatus = (expDateStr?: string) => {
    if (!expDateStr) return null;
    const today = new Date();
    today.setHours(0,0,0,0);
    const [year, month, day] = expDateStr.split('-').map(Number);
    const expDate = new Date(year, month - 1, day);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { status: 'expired', label: t('inventory.expirationStatus.expired'), color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' };
    if (diffDays <= 7) return { status: 'warning', label: t('inventory.expirationStatus.expiresIn', { days: diffDays }), color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/20 border-orange-200' };
    return { status: 'ok', label: t('inventory.expirationStatus.ok'), color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20 border-green-200' };
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 400
        const MAX_HEIGHT = 400
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height
            height = MAX_HEIGHT
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
        callback(dataUrl)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleAddItem = () => {
    if (!newItem.name || !newItem.quantity || !db) return

    const colRef = collection(db, 'restaurants', restaurantId, 'ingredients')
    addDocumentNonBlocking(colRef, {
      name: newItem.name,
      quantity: parseFloat(newItem.quantity),
      unit: newItem.unit,
      cost: parseFloat(newItem.cost) || 0,
      suppliers: newItem.suppliers,
      status: 'Normal',
      restaurantId,
      imageUrl: newItem.imageUrl || null,
      minStock: parseFloat(newItem.minStock) || 0,
      category: newItem.category || 'Outros',
      expirationDate: newItem.expirationDate || null
    })

    setNewItem({ name: '', quantity: '', unit: 'kg', cost: '', imageUrl: '', minStock: '', category: 'Outros', expirationDate: '', suppliers: [] })
    setIsAddDialogOpen(false)
    toast({ title: t('inventory.toasts.success'), description: t('inventory.toasts.added') })
  }

  const handleUpdateItem = () => {
    if (!editingItem || !db) return
    const docRef = doc(db, 'restaurants', restaurantId, 'ingredients', editingItem.id)
    
    updateDocumentNonBlocking(docRef, {
      name: editingItem.name,
      quantity: editingItem.quantity,
      unit: editingItem.unit,
      cost: editingItem.cost,
      suppliers: editingItem.suppliers || [],
      imageUrl: editingItem.imageUrl || null,
      minStock: editingItem.minStock || 0,
      category: editingItem.category || 'Outros',
      expirationDate: editingItem.expirationDate || null
    })

    setIsEditDialogOpen(false)
    setEditingItem(null)
    toast({ title: t('inventory.toasts.success'), description: t('inventory.toasts.updated') })
  }

  const handleDeleteItem = (id: string) => {
    if (!db) return
    const docRef = doc(db, 'restaurants', restaurantId, 'ingredients', id)
    deleteDocumentNonBlocking(docRef)
    toast({ variant: "destructive", title: t('inventory.toasts.removed'), description: t('inventory.toasts.deleted') })
  }

  const filteredInventory = inventory?.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const filteredShoppingList = shoppingList?.filter(item => 
    item.name.toLowerCase().includes(shoppingSearchTerm.toLowerCase())
  ).sort((a, b) => Number(a.purchased) - Number(b.purchased)) || []

  const groupedShoppingList = CATEGORIES.map(cat => ({
    category: cat,
    items: filteredShoppingList.filter(item => (item.category || 'Outros') === cat)
  })).filter(group => group.items.length > 0)

  const handleAddShoppingItem = () => {
    if (!newShoppingItem.name || !newShoppingItem.quantityToBuy || !db) return

    const colRef = collection(db, 'restaurants', restaurantId, 'shoppingListItems')
    addDocumentNonBlocking(colRef, {
      inventoryItemId: newShoppingItem.inventoryItemId || null,
      name: newShoppingItem.name,
      quantityToBuy: parseFloat(newShoppingItem.quantityToBuy),
      unit: newShoppingItem.unit,
      purchased: false,
      restaurantId,
      category: newShoppingItem.category || 'Outros'
    })

    setNewShoppingItem({ inventoryItemId: '', name: '', quantityToBuy: '', unit: 'kg', category: 'Outros' })
    setIsAddShoppingItemDialogOpen(false)
    toast({ title: "Sucesso", description: "Item adicionado à lista de compras." })
  }

  const handleTogglePurchased = (item: ShoppingListItem) => {
    if (!db) return
    const docRef = doc(db, 'restaurants', restaurantId, 'shoppingListItems', item.id)
    updateDocumentNonBlocking(docRef, {
      purchased: !item.purchased
    })
  }

  const handleDeleteShoppingItem = (id: string) => {
    if (!db) return
    const docRef = doc(db, 'restaurants', restaurantId, 'shoppingListItems', id)
    deleteDocumentNonBlocking(docRef)
    toast({ variant: "destructive", title: "Removido", description: "O item foi removido da lista." })
  }

  const handleGenerateSuggestion = () => {
    if (!inventory || !db || !shoppingList) return

    let addedCount = 0
    inventory.forEach(invItem => {
      const minStock = invItem.minStock || 0
      if (invItem.quantity <= minStock) {
        const alreadyInList = shoppingList.some(slItem => slItem.inventoryItemId === invItem.id && !slItem.purchased)
        
        if (!alreadyInList) {
          const quantityNeeded = Math.max(1, minStock - invItem.quantity + (minStock > 0 ? minStock * 0.5 : 1))
          
          const colRef = collection(db, 'restaurants', restaurantId, 'shoppingListItems')
          addDocumentNonBlocking(colRef, {
            inventoryItemId: invItem.id,
            name: invItem.name,
            quantityToBuy: Number(quantityNeeded.toFixed(2)),
            unit: invItem.unit,
            purchased: false,
            restaurantId,
            category: invItem.category || 'Outros'
          })
          addedCount++
        }
      }
    })

    if (addedCount > 0) {
      toast({ title: "Sugestão Gerada", description: `${addedCount} itens com estoque baixo foram adicionados.` })
    } else {
      toast({ title: "Tudo Certo", description: "Nenhum item com estoque baixo encontrado que já não esteja na lista." })
    }
  }

  const handleInventorySelect = (invId: string) => {
    const selected = inventory?.find(i => i.id === invId)
    if (selected) {
      setNewShoppingItem({
        ...newShoppingItem,
        inventoryItemId: selected.id,
        name: selected.name,
        unit: selected.unit,
        category: selected.category || 'Outros'
      })
    } else {
      setNewShoppingItem({
        ...newShoppingItem,
        inventoryItemId: '',
        name: '',
      })
    }
  }

  if (!mounted) return null

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary">{t('inventory.title')}</h1>
          <p className="text-muted-foreground">{t('inventory.description')}</p>
        </div>
        <LanguageSwitcher />
      </div>

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="inventory">{t('inventory.tabs.inventory')}</TabsTrigger>
          <TabsTrigger value="shopping-list">{t('inventory.tabs.shoppingList')}</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder={t('inventory.search')} 
                  className="pl-8" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <ReceiptScanner restaurantId={restaurantId} />
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" /> {t('inventory.newIngredient')}
                  </Button>
                </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('inventory.dialogs.add.title')}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex justify-center mb-2">
                  <div className="relative w-24 h-24 rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/10">
                    {newItem.imageUrl ? (
                      <img src={newItem.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                    )}
                    <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer text-white">
                      <Upload className="w-4 h-4 mb-1" />
                      <span className="text-[10px] font-medium">{t('inventory.fields.upload')}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleImageUpload(e, (base64) => setNewItem({...newItem, imageUrl: base64}))}
                      />
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('inventory.fields.name')}</Label>
                    <Input value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} placeholder="Ex: Carne Moída" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('inventory.fields.category')}</Label>
                    <Select value={newItem.category} onValueChange={(val) => setNewItem({...newItem, category: val})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{t(`inventory.categories.${cat}`)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('inventory.fields.quantity')}</Label>
                    <Input type="number" placeholder="0.00" value={newItem.quantity} onChange={(e) => setNewItem({...newItem, quantity: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('inventory.fields.unit')}</Label>
                    <div className="flex gap-2">
                      <Select 
                        value={STANDARD_UNITS.includes(newItem.unit) ? newItem.unit : 'custom'} 
                        onValueChange={(val) => {
                          if (val === 'custom') {
                            setNewItem({...newItem, unit: ''})
                          } else {
                            setNewItem({...newItem, unit: val})
                          }
                        }}
                      >
                        <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STANDARD_UNITS.map(u => (
                            <SelectItem key={u} value={u}>{u.toUpperCase()}</SelectItem>
                          ))}
                          <SelectItem value="custom">{t('inventory.units.custom')}</SelectItem>
                        </SelectContent>
                      </Select>
                      {!STANDARD_UNITS.includes(newItem.unit) && (
                        <Input 
                          placeholder={t('inventory.units.placeholder')}
                          value={newItem.unit}
                          onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                          className="flex-1"
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{t('inventory.fields.cost')}</Label>
                    <Input type="number" placeholder="0.00" value={newItem.cost} onChange={(e) => setNewItem({...newItem, cost: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('inventory.fields.minStock')}</Label>
                    <Input type="number" placeholder="0.00" value={newItem.minStock} onChange={(e) => setNewItem({...newItem, minStock: e.target.value})} />
                  </div>
                  <div className="space-y-2 col-span-2 lg:col-span-1">
                    <Label>{t('inventory.fields.expirationDate')}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !newItem.expirationDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newItem.expirationDate ? (
                            format(parseISO(newItem.expirationDate), "PPP")
                          ) : (
                            <span>{t('inventory.fields.selectDate')}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={newItem.expirationDate ? parseISO(newItem.expirationDate) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setNewItem({ ...newItem, expirationDate: format(date, 'yyyy-MM-dd') })
                            } else {
                              setNewItem({ ...newItem, expirationDate: '' })
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <SupplierManager 
                  suppliers={newItem.suppliers} 
                  onUpdate={(suppliers) => setNewItem({...newItem, suppliers})}
                  currentUnit={newItem.unit}
                  onSelectBest={(cost) => setNewItem({...newItem, cost: cost.toString()})}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>{t('common.cancel')}</Button>
                <Button onClick={handleAddItem}>{t('inventory.dialogs.add.save')}</Button>
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
                <TableHead className="w-16">{t('inventory.table.image')}</TableHead>
                <TableHead>{t('inventory.table.ingredient')}</TableHead>
                <TableHead>{t('inventory.table.quantity')}</TableHead>
                <TableHead>{t('inventory.table.unit')}</TableHead>
                <TableHead>{t('inventory.table.cost')}</TableHead>
                <TableHead>{t('inventory.table.expiration')}</TableHead>
                <TableHead>{t('inventory.table.status')}</TableHead>
                <TableHead className="text-right">{t('inventory.table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map(item => {
                const isLowStock = item.quantity <= (item.minStock || 0);
                const expStatus = getExpirationStatus(item.expirationDate);
                const isWarningRow = isLowStock || expStatus?.status === 'expired' || expStatus?.status === 'warning';
                
                return (
                <TableRow key={item.id} className={`hover:bg-muted/10 transition-colors ${isWarningRow ? 'bg-destructive/5' : ''}`}>
                  <TableCell>
                    <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center overflow-hidden border">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-bold">
                    <div className="flex items-center gap-2">
                      {item.name}
                      {isLowStock && <AlertTriangle className="w-4 h-4 text-destructive" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={isLowStock ? "text-destructive font-bold" : ""}>
                      {item.quantity}
                    </span>
                  </TableCell>
                  <TableCell className="uppercase text-xs font-medium text-muted-foreground">{item.unit}</TableCell>
                  <TableCell>{i18n.language.startsWith('pt') ? 'R$' : i18n.language.startsWith('en') ? '$' : '€'} {item.cost.toFixed(2)}</TableCell>
                  <TableCell>
                    {item.expirationDate ? (
                      <span className={`text-xs font-bold px-2 py-1 rounded-md border ${expStatus?.bg} ${expStatus?.color}`}>
                        {new Date(item.expirationDate + 'T00:00:00').toLocaleDateString(i18n.language)} 
                        {expStatus && expStatus.status !== 'ok' && ` (${expStatus.label})`}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={isLowStock ? "destructive" : "secondary"} className="text-[10px]">
                      {isLowStock ? t('inventory.status.critical') : t(`inventory.status.${item.status.toLowerCase()}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-primary"
                        onClick={() => {
                          setEditingItem(item)
                          setIsEditDialogOpen(true)
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('inventory.dialogs.delete.title')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('inventory.dialogs.delete.description', { name: item.name })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteItem(item.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {t('inventory.dialogs.delete.confirm')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
                )
              })}
              {!isLoading && filteredInventory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-20 text-muted-foreground italic">
                    {t('inventory.empty')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="shopping-list" className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder={t('shoppingList.search')} 
                className="pl-8" 
                value={shoppingSearchTerm}
                onChange={(e) => setShoppingSearchTerm(e.target.value)}
              />
            </div>
            
            <Button variant="secondary" className="gap-2" onClick={handleGenerateSuggestion}>
              <Sparkles className="w-4 h-4" /> {t('shoppingList.smartSuggestion')}
            </Button>

            <Dialog open={isAddShoppingItemDialogOpen} onOpenChange={setIsAddShoppingItemDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" /> {t('shoppingList.newItem')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('shoppingList.dialogs.add.title')}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>{t('shoppingList.dialogs.add.inventorySelect')}</Label>
                    <Select value={newShoppingItem.inventoryItemId} onValueChange={handleInventorySelect}>
                      <SelectTrigger><SelectValue placeholder={t('shoppingList.dialogs.add.placeholder')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('shoppingList.dialogs.add.standaloneItem')}</SelectItem>
                        {inventory?.map(inv => (
                          <SelectItem key={inv.id} value={inv.id}>{inv.name} ({inv.quantity} {inv.unit} {t('inventory.table.status')})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('inventory.fields.name')}</Label>
                      <Input 
                        value={newShoppingItem.name} 
                        onChange={(e) => setNewShoppingItem({...newShoppingItem, name: e.target.value})} 
                        placeholder="Ex: Tomate" 
                        disabled={newShoppingItem.inventoryItemId !== 'none' && newShoppingItem.inventoryItemId !== ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('inventory.fields.category')}</Label>
                      <Select 
                        value={newShoppingItem.category} 
                        onValueChange={(val) => setNewShoppingItem({...newShoppingItem, category: val})}
                        disabled={newShoppingItem.inventoryItemId !== 'none' && newShoppingItem.inventoryItemId !== ''}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{t(`inventory.categories.${cat}`)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('shoppingList.fields.quantityToBuy')}</Label>
                      <Input type="number" placeholder="0.00" value={newShoppingItem.quantityToBuy} onChange={(e) => setNewShoppingItem({...newShoppingItem, quantityToBuy: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('inventory.fields.unit')}</Label>
                      <div className="flex gap-2">
                        <Select 
                          value={STANDARD_UNITS.includes(newShoppingItem.unit) ? newShoppingItem.unit : 'custom'} 
                          onValueChange={(val) => {
                            if (val === 'custom') {
                              setNewShoppingItem({...newShoppingItem, unit: ''})
                            } else {
                              setNewShoppingItem({...newShoppingItem, unit: val})
                            }
                          }}
                          disabled={newShoppingItem.inventoryItemId !== 'none' && newShoppingItem.inventoryItemId !== ''}
                        >
                          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STANDARD_UNITS.map(u => (
                              <SelectItem key={u} value={u}>{u.toUpperCase()}</SelectItem>
                            ))}
                            <SelectItem value="custom">{t('inventory.units.custom')}</SelectItem>
                          </SelectContent>
                        </Select>
                        {(!STANDARD_UNITS.includes(newShoppingItem.unit) || newShoppingItem.unit === '') && (
                          <Input 
                            placeholder={t('inventory.units.placeholder')}
                            value={newShoppingItem.unit}
                            onChange={(e) => setNewShoppingItem({...newShoppingItem, unit: e.target.value})}
                            className="flex-1"
                            disabled={newShoppingItem.inventoryItemId !== 'none' && newShoppingItem.inventoryItemId !== ''}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddShoppingItemDialogOpen(false)}>{t('common.cancel')}</Button>
                  <Button onClick={handleAddShoppingItem}>{t('shoppingList.dialogs.add.save')}</Button>
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
                  <TableHead className="w-12 text-center">{t('shoppingList.table.status')}</TableHead>
                  <TableHead>{t('shoppingList.table.item')}</TableHead>
                  <TableHead>{t('shoppingList.table.quantity')}</TableHead>
                  <TableHead>{t('shoppingList.table.origin')}</TableHead>
                  <TableHead className="text-right">{t('inventory.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedShoppingList.map(group => (
                  <Fragment key={group.category}>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={5} className="font-bold text-primary py-2 text-xs uppercase tracking-wider">
                        {t(`inventory.categories.${group.category}`)}
                      </TableCell>
                    </TableRow>
                    {group.items.map(item => (
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
                            <Badge variant="outline" className="text-[10px]">{t('shoppingList.badges.inventory')}</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">{t('shoppingList.badges.standalone')}</Badge>
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
                                <AlertDialogTitle>{t('shoppingList.dialogs.delete.title')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('shoppingList.dialogs.delete.description', { name: item.name })}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteShoppingItem(item.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {t('shoppingList.dialogs.delete.confirm')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
                {!isLoadingShopping && filteredShoppingList.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">
                      {t('shoppingList.empty')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
      </Tabs>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('inventory.dialogs.edit.title')}</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="grid gap-4 py-4">
              <div className="flex justify-center mb-2">
                <div className="relative w-24 h-24 rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/10">
                  {editingItem.imageUrl ? (
                    <img src={editingItem.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                  )}
                  <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer text-white">
                    <Upload className="w-4 h-4 mb-1" />
                    <span className="text-[10px] font-medium">{t('inventory.fields.upload')}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleImageUpload(e, (base64) => setEditingItem({...editingItem, imageUrl: base64}))}
                    />
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('inventory.fields.name')}</Label>
                  <Input 
                    value={editingItem.name} 
                    onChange={(e) => setEditingItem({...editingItem, name: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('inventory.fields.category')}</Label>
                  <Select 
                    value={editingItem.category || 'Outros'} 
                    onValueChange={(val) => setEditingItem({...editingItem, category: val})}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{t(`inventory.categories.${cat}`)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('inventory.fields.quantity')}</Label>
                  <Input 
                    type="number" 
                    value={editingItem.quantity} 
                    onChange={(e) => setEditingItem({...editingItem, quantity: parseFloat(e.target.value)})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('inventory.fields.unit')}</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={STANDARD_UNITS.includes(editingItem.unit) ? editingItem.unit : 'custom'} 
                      onValueChange={(val) => {
                        if (val === 'custom') {
                          setEditingItem({...editingItem, unit: ''})
                        } else {
                          setEditingItem({...editingItem, unit: val})
                        }
                      }}
                    >
                      <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STANDARD_UNITS.map(u => (
                          <SelectItem key={u} value={u}>{u.toUpperCase()}</SelectItem>
                        ))}
                        <SelectItem value="custom">{t('inventory.units.custom')}</SelectItem>
                      </SelectContent>
                    </Select>
                    {!STANDARD_UNITS.includes(editingItem.unit) && (
                      <Input 
                        placeholder={t('inventory.units.placeholder')}
                        value={editingItem.unit}
                        onChange={(e) => setEditingItem({...editingItem, unit: e.target.value})}
                        className="flex-1"
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t('inventory.fields.cost')}</Label>
                  <Input 
                    type="number" 
                    value={editingItem.cost} 
                    onChange={(e) => setEditingItem({...editingItem, cost: parseFloat(e.target.value)})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('inventory.fields.minStock')}</Label>
                  <Input 
                    type="number" 
                    value={editingItem.minStock || ''} 
                    onChange={(e) => setEditingItem({...editingItem, minStock: parseFloat(e.target.value)})} 
                  />
                </div>
                <div className="space-y-2 col-span-2 lg:col-span-1">
                  <Label>{t('inventory.fields.expirationDate')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !editingItem.expirationDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editingItem.expirationDate ? (
                          format(parseISO(editingItem.expirationDate), "PPP")
                        ) : (
                          <span>{t('inventory.fields.selectDate')}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={editingItem.expirationDate ? parseISO(editingItem.expirationDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setEditingItem({ ...editingItem, expirationDate: format(date, 'yyyy-MM-dd') })
                          } else {
                            setEditingItem({ ...editingItem, expirationDate: '' })
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <SupplierManager 
                suppliers={editingItem.suppliers} 
                onUpdate={(suppliers) => setEditingItem({...editingItem, suppliers})}
                currentUnit={editingItem.unit}
                onSelectBest={(cost) => setEditingItem({...editingItem, cost})}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleUpdateItem}>{t('inventory.dialogs.edit.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
