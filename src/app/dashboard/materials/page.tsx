"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search, Pencil, Trash2, Drill, Utensils, CalendarDays, DollarSign } from 'lucide-react'
import { useAuth } from '@/lib/store'
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase'
import { collection, query, doc, orderBy } from 'firebase/firestore'
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
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MaterialItem {
  id: string
  name: string
  category: 'Cozinha' | 'Salão'
  subCategory: string
  quantity: number
  status: 'Novo' | 'Bom' | 'Manutenção' | 'Substituir'
  purchaseDate?: string
  purchaseValue?: number
}

export default function MaterialsPage() {
  const { user: localUser } = useAuth()
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const restaurantId = localUser?.restaurantId || 'gp-001'
  
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  
  const [newItem, setNewItem] = useState({ 
    name: '', 
    category: 'Cozinha' as 'Cozinha' | 'Salão', 
    subCategory: 'Utensílio', 
    quantity: '1', 
    status: 'Bom' as const,
    purchaseDate: '',
    purchaseValue: ''
  })
  const [editingItem, setEditingItem] = useState<MaterialItem | null>(null)

  const materialsQuery = useMemoFirebase(() => {
    if (!db || !user || !restaurantId) return null
    return query(collection(db, 'restaurants', restaurantId, 'materials'), orderBy('name', 'asc'))
  }, [db, user, restaurantId])

  const { data: materials, isLoading } = useCollection<MaterialItem>(materialsQuery)

  const handleAddItem = () => {
    if (!newItem.name || !db) return

    const colRef = collection(db, 'restaurants', restaurantId, 'materials')
    addDocumentNonBlocking(colRef, {
      name: newItem.name,
      category: newItem.category,
      subCategory: newItem.subCategory,
      quantity: parseInt(newItem.quantity) || 0,
      status: newItem.status,
      purchaseDate: newItem.purchaseDate || null,
      purchaseValue: parseFloat(newItem.purchaseValue) || 0,
      restaurantId
    })

    setNewItem({ 
      name: '', 
      category: newItem.category, 
      subCategory: 'Utensílio', 
      quantity: '1', 
      status: 'Bom',
      purchaseDate: '',
      purchaseValue: ''
    })
    setIsAddDialogOpen(false)
    toast({ title: "Sucesso", description: "Material adicionado ao inventário." })
  }

  const handleUpdateItem = () => {
    if (!editingItem || !db) return
    const docRef = doc(db, 'restaurants', restaurantId, 'materials', editingItem.id)
    
    updateDocumentNonBlocking(docRef, {
      name: editingItem.name,
      category: editingItem.category,
      subCategory: editingItem.subCategory,
      quantity: editingItem.quantity,
      status: editingItem.status,
      purchaseDate: editingItem.purchaseDate || null,
      purchaseValue: editingItem.purchaseValue || 0
    })

    setIsEditDialogOpen(false)
    setEditingItem(null)
    toast({ title: "Sucesso", description: "Material atualizado com sucesso." })
  }

  const handleDeleteItem = (id: string) => {
    if (!db) return
    const docRef = doc(db, 'restaurants', restaurantId, 'materials', id)
    deleteDocumentNonBlocking(docRef)
    toast({ variant: "destructive", title: "Removido", description: "O item foi removido do inventário." })
  }

  const filteredMaterials = (cat: string) => materials?.filter(item => 
    item.category === cat && 
    (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     item.subCategory.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || []

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary">Equipamentos & Materiais</h1>
          <p className="text-muted-foreground">Gestão de ativos da cozinha e do salão.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar material..." 
              className="pl-8" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Novo Ativo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Ativo</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Nome do Item</Label>
                  <Input value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} placeholder="Ex: Forno Industrial, Prato Raso..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoria Principal</Label>
                    <Select value={newItem.category} onValueChange={(val: any) => setNewItem({...newItem, category: val})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cozinha">Cozinha</SelectItem>
                        <SelectItem value="Salão">Salão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sub-categoria</Label>
                    <Input value={newItem.subCategory} onChange={(e) => setNewItem({...newItem, subCategory: e.target.value})} placeholder="Maquinário, Louça, etc" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input type="number" value={newItem.quantity} onChange={(e) => setNewItem({...newItem, quantity: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado de Conservação</Label>
                    <Select value={newItem.status} onValueChange={(val: any) => setNewItem({...newItem, status: val})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Novo">Novo</SelectItem>
                        <SelectItem value="Bom">Bom</SelectItem>
                        <SelectItem value="Manutenção">Em Manutenção</SelectItem>
                        <SelectItem value="Substituir">Substituir</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data da Compra</Label>
                    <Input type="date" value={newItem.purchaseDate} onChange={(e) => setNewItem({...newItem, purchaseDate: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor da Compra (R$)</Label>
                    <Input type="number" step="0.01" value={newItem.purchaseValue} onChange={(e) => setNewItem({...newItem, purchaseValue: e.target.value})} placeholder="0.00" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddItem}>Salvar no Inventário</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="cozinha" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8">
          <TabsTrigger value="cozinha" className="gap-2"><Drill className="w-4 h-4" /> Cozinha</TabsTrigger>
          <TabsTrigger value="salao" className="gap-2"><Utensils className="w-4 h-4" /> Salão</TabsTrigger>
        </TabsList>

        <TabsContent value="cozinha">
          <MaterialTable 
            data={filteredMaterials('Cozinha')} 
            onEdit={(item) => { setEditingItem(item); setIsEditDialogOpen(true); }}
            onDelete={handleDeleteItem}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="salao">
          <MaterialTable 
            data={filteredMaterials('Salão')} 
            onEdit={(item) => { setEditingItem(item); setIsEditDialogOpen(true); }}
            onDelete={handleDeleteItem}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Ativo</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Item</Label>
                <Input 
                  value={editingItem.name} 
                  onChange={(e) => setEditingItem({...editingItem, name: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sub-categoria</Label>
                  <Input 
                    value={editingItem.subCategory} 
                    onChange={(e) => setEditingItem({...editingItem, subCategory: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input 
                    type="number" 
                    value={editingItem.quantity} 
                    onChange={(e) => setEditingItem({...editingItem, quantity: parseInt(e.target.value)})} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estado de Conservação</Label>
                  <Select value={editingItem.status} onValueChange={(val: any) => setEditingItem({...editingItem, status: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Novo">Novo</SelectItem>
                      <SelectItem value="Bom">Bom</SelectItem>
                      <SelectItem value="Manutenção">Em Manutenção</SelectItem>
                      <SelectItem value="Substituir">Substituir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor da Compra (R$)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={editingItem.purchaseValue} 
                    onChange={(e) => setEditingItem({...editingItem, purchaseValue: parseFloat(e.target.value)})} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Data da Compra</Label>
                <Input 
                  type="date" 
                  value={editingItem.purchaseDate || ''} 
                  onChange={(e) => setEditingItem({...editingItem, purchaseDate: e.target.value})} 
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateItem}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MaterialTable({ data, onEdit, onDelete, isLoading }: { data: MaterialItem[], onEdit: (i: MaterialItem) => void, onDelete: (id: string) => void, isLoading: boolean }) {
  return (
    <Card className="border-none shadow-md overflow-hidden">
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Sub-categoria</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>Compra</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(item => (
              <TableRow key={item.id} className="hover:bg-muted/10 transition-colors">
                <TableCell className="font-bold">{item.name}</TableCell>
                <TableCell className="text-muted-foreground text-xs uppercase font-medium">{item.subCategory}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="w-3 h-3" />
                    {item.purchaseDate ? format(parseISO(item.purchaseDate), 'dd/MM/yy', { locale: ptBR }) : '-'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 font-mono text-xs">
                    <span className="text-muted-foreground">R$</span>
                    {item.purchaseValue ? item.purchaseValue.toFixed(2) : '0.00'}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={item.status === 'Substituir' ? 'destructive' : item.status === 'Manutenção' ? 'secondary' : 'default'} className="text-[10px]">
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => onEdit(item)}>
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
                          <AlertDialogTitle>Excluir Ativo?</AlertDialogTitle>
                          <AlertDialogDescription>Deseja remover este item do inventário de materiais permanentemente?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirmar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && data.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-20 text-muted-foreground italic">
                  Nenhum material cadastrado nesta categoria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}