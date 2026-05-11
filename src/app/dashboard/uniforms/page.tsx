
"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search, Pencil, Trash2, Shirt } from 'lucide-react'
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

interface UniformItem {
  id: string
  name: string
  size: string
  quantity: number
  category: 'Doma' | 'Calça' | 'Sapato' | 'Acessório'
  reorderDate?: string
}

export default function UniformsPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const restaurantId = 'gp-001'
  
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('Todos')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  
  const [newItem, setNewItem] = useState({ name: '', size: 'M', quantity: '1', category: 'Doma', reorderDate: '' })
  const [editingItem, setEditingItem] = useState<UniformItem | null>(null)

  const [suggestions, setSuggestions] = useState([
    { id: 's1', text: <span><strong>Domas:</strong> P, M, G e GG (mín. 2 de cada)</span> },
    { id: 's2', text: <span><strong>Calças:</strong> 38 ao 44 (especial para cozinha)</span> },
    { id: 's3', text: <span><strong>Sapatos:</strong> 37 ao 42 (EPI antiderrapante)</span> }
  ])

  const handleDeleteTask = (id: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== id))
  }

  const uniformsQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, 'restaurants', restaurantId, 'uniforms'))
  }, [db, user])

  const { data: uniforms, isLoading } = useCollection<UniformItem>(uniformsQuery)

  const handleAddItem = () => {
    if (!newItem.name || !db) return

    const colRef = collection(db, 'restaurants', restaurantId, 'uniforms')
    addDocumentNonBlocking(colRef, {
      name: newItem.name,
      size: newItem.size,
      quantity: parseInt(newItem.quantity) || 0,
      category: newItem.category,
      reorderDate: newItem.reorderDate || null,
      restaurantId
    })

    setNewItem({ name: '', size: 'M', quantity: '1', category: 'Doma', reorderDate: '' })
    setIsAddDialogOpen(false)
    toast({ title: "Sucesso", description: "Item de uniforme adicionado." })
  }

  const handleUpdateItem = () => {
    if (!editingItem || !db) return
    const docRef = doc(db, 'restaurants', restaurantId, 'uniforms', editingItem.id)
    
    updateDocumentNonBlocking(docRef, {
      name: editingItem.name,
      size: editingItem.size,
      quantity: editingItem.quantity,
      category: editingItem.category,
      reorderDate: editingItem.reorderDate || null
    })

    setIsEditDialogOpen(false)
    setEditingItem(null)
    toast({ title: "Sucesso", description: "Uniforme atualizado com sucesso." })
  }

  const handleDeleteItem = (id: string) => {
    if (!db) return
    const docRef = doc(db, 'restaurants', restaurantId, 'uniforms', id)
    deleteDocumentNonBlocking(docRef)
    toast({ variant: "destructive", title: "Removido", description: "O item foi removido do enxoval." })
  }

  const filteredUniforms = uniforms?.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTab = activeTab === 'Todos' || item.category === activeTab
    return matchesSearch && matchesTab
  }) || []

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary">Gestão de Uniformes</h1>
          <p className="text-muted-foreground">Controle de enxoval e EPIs da Rolls-In.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar (Doma, Calça...)" 
              className="pl-8" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Novo Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Uniforme ao Enxoval</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Nome/Modelo</Label>
                  <Input value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} placeholder="Ex: Doma Chef Premium" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={newItem.category} onValueChange={(val: any) => setNewItem({...newItem, category: val})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Doma">Doma</SelectItem>
                        <SelectItem value="Calça">Calça</SelectItem>
                        <SelectItem value="Sapato">Sapato</SelectItem>
                        <SelectItem value="Acessório">Acessório</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tamanho</Label>
                    <Input value={newItem.size} onChange={(e) => setNewItem({...newItem, size: e.target.value})} placeholder="P, M, G, 42..." />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantidade em Estoque</Label>
                    <Input type="number" value={newItem.quantity} onChange={(e) => setNewItem({...newItem, quantity: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Reposição (Opcional)</Label>
                    <Input type="date" value={newItem.reorderDate} onChange={(e) => setNewItem({...newItem, reorderDate: e.target.value})} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddItem}>Salvar no Enxoval</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="md:col-span-2 space-y-4">
            <Tabs defaultValue="Todos" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full flex overflow-x-auto justify-start bg-muted/30 p-1 rounded-xl scrollbar-hide">
                <TabsTrigger value="Todos" className="flex-1 min-w-[80px]">Todos</TabsTrigger>
                <TabsTrigger value="Doma" className="flex-1 min-w-[80px]">Doma</TabsTrigger>
                <TabsTrigger value="Calça" className="flex-1 min-w-[80px]">Calça</TabsTrigger>
                <TabsTrigger value="Sapato" className="flex-1 min-w-[80px]">Sapato</TabsTrigger>
                <TabsTrigger value="Acessório" className="flex-1 min-w-[80px]">Acessório</TabsTrigger>
              </TabsList>

              {['Todos', 'Doma', 'Calça', 'Sapato', 'Acessório'].map(tab => (
                <TabsContent key={tab} value={tab} className="mt-4">
                  <Card className="border-none shadow-md overflow-hidden">
                      <CardContent className="p-0">
                      <Table>
                          <TableHeader className="bg-muted/30">
                          <TableRow>
                              <TableHead>Item</TableHead>
                              <TableHead>Categoria</TableHead>
                              <TableHead>Tam</TableHead>
                              <TableHead>Qtd</TableHead>
                              <TableHead>Reposição</TableHead>
                              <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                          </TableHeader>
                          <TableBody>
                          {filteredUniforms.map(item => {
                              const isLowQuantity = item.quantity < 3;
                              return (
                              <TableRow key={item.id} className={`transition-colors ${isLowQuantity ? 'bg-destructive/10 hover:bg-destructive/20' : 'hover:bg-muted/10'}`}>
                              <TableCell className="font-bold">
                                {item.name}
                                {isLowQuantity && (
                                  <Badge variant="destructive" className="ml-2 text-[10px]">Baixo Estoque</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                  <Badge variant="secondary" className="text-[10px] uppercase">
                                      {item.category}
                                  </Badge>
                              </TableCell>
                              <TableCell className="font-mono">{item.size}</TableCell>
                              <TableCell className={isLowQuantity ? 'text-destructive font-bold' : ''}>{item.quantity}</TableCell>
                              <TableCell className="text-muted-foreground text-xs">{item.reorderDate ? item.reorderDate.split('-').reverse().join('/') : '-'}</TableCell>
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
                                          <AlertDialogTitle>Excluir Uniforme?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                          Deseja remover este item do controle de enxoval?
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
                                  </div>
                              </TableCell>
                              </TableRow>
                              )
                          })}
                          {!isLoading && filteredUniforms.length === 0 && (
                              <TableRow>
                              <TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic">
                                  Nenhum item encontrado nesta categoria.
                              </TableCell>
                              </TableRow>
                          )}
                          </TableBody>
                      </Table>
                      </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
         </div>
         
         <div className="space-y-6">
            <Card className="bg-primary/5 border-none shadow-sm">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Shirt className="text-primary w-5 h-5" />
                        <CardTitle className="text-sm uppercase font-bold">Sugestão de Enxoval</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 text-xs text-muted-foreground">
                    <p>Para uma operação eficiente da Rolls-In, sugerimos manter:</p>
                    <ul className="space-y-2">
                        {suggestions.map(suggestion => (
                          <li key={suggestion.id} className="flex items-center justify-between group">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary/50"></span>
                              {suggestion.text}
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir Sugestão?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja remover esta sugestão da lista?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteTask(suggestion.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Confirmar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </li>
                        ))}
                    </ul>
                    <div className="pt-4">
                        <Badge variant="outline" className="text-[9px]">DICA</Badge>
                        <p className="mt-1">Mantenha sempre 2 kits extras para novos funcionários ou trocas emergenciais.</p>
                    </div>
                </CardContent>
            </Card>
         </div>
      </div>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Item de Uniforme</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nome/Modelo</Label>
                <Input 
                  value={editingItem.name} 
                  onChange={(e) => setEditingItem({...editingItem, name: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={editingItem.category} onValueChange={(val: any) => setEditingItem({...editingItem, category: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Doma">Doma</SelectItem>
                      <SelectItem value="Calça">Calça</SelectItem>
                      <SelectItem value="Sapato">Sapato</SelectItem>
                      <SelectItem value="Acessório">Acessório</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tamanho</Label>
                  <Input 
                    value={editingItem.size} 
                    onChange={(e) => setEditingItem({...editingItem, size: e.target.value})} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input 
                    type="number" 
                    value={editingItem.quantity} 
                    onChange={(e) => setEditingItem({...editingItem, quantity: parseInt(e.target.value)})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Reposição (Opcional)</Label>
                  <Input 
                    type="date" 
                    value={editingItem.reorderDate || ''} 
                    onChange={(e) => setEditingItem({...editingItem, reorderDate: e.target.value})} 
                  />
                </div>
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
