"use client"

import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Camera, Upload, ScanLine, AlertCircle, Plus, Trash2, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { extractReceiptItems } from '../actions'
import { useFirestore } from '@/firebase'
import { collection, query, getDocs, where, doc } from 'firebase/firestore'
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates'

export interface ReceiptScannerProps {
  restaurantId: string;
  onSuccess?: () => void;
}

interface ExtractedItem {
  id: string; // temp id for UI
  name: string;
  quantity: number;
  unit: string;
  cost: number;
  matchedId?: string; // If we found an existing item to update
  category?: string; // So user can categorize
}

const CATEGORIES = ['Hortifruti', 'Carnes', 'Laticínios', 'Mercearia', 'Bebidas', 'Limpeza', 'Embalagens', 'Outros']

export function ReceiptScanner({ restaurantId, onSuccess }: ReceiptScannerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([])
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const db = useFirestore()

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Limit files to 5MB before processing
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Arquivo muito grande", description: "Por favor, envie uma imagem de no máximo 5MB." })
      return
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result as string
      setOriginalImage(base64)
      processImage(base64)
    }
    reader.readAsDataURL(file)
  }

  const processImage = async (base64: string) => {
    setIsScanning(true)
    try {
      const result = await extractReceiptItems(base64)
      
      if (result.success && result.data && result.data.items) {
        // Try to match with existing inventory to populate matchedId or just create new items
        // We will do a simple match in UI or let them be created as new (or add quantity)
        const itemsWithId = result.data.items.map((item: any, index: number) => ({
          ...item,
          id: `temp-${Date.now()}-${index}`,
          category: 'Outros'
        }))
        
        setExtractedItems(itemsWithId)
        
        if (itemsWithId.length === 0) {
          toast({ variant: "destructive", title: "Nenhum item encontrado", description: "A IA não conseguiu identificar itens ou valores." })
        } else {
          toast({ title: "Itens extraídos", description: `Encontramos ${itemsWithId.length} itens. Revise-os antes de salvar.` })
        }
      } else {
        toast({ variant: "destructive", title: "Erro na leitura", description: result.error || "Não foi possível processar a imagem." })
      }
    } catch (error) {
      console.error(error)
      toast({ variant: "destructive", title: "Erro", description: "Ocorreu um erro ao conectar com a IA." })
    } finally {
      setIsScanning(false)
    }
  }

  const handleItemChange = (id: string, field: keyof ExtractedItem, value: any) => {
    setExtractedItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const removeItem = (id: string) => {
    setExtractedItems(prev => prev.filter(item => item.id !== id))
  }

  const addEmptyItem = () => {
    setExtractedItems(prev => [...prev, {
      id: `temp-${Date.now()}`,
      name: '',
      quantity: 1,
      unit: 'un',
      cost: 0,
      category: 'Outros'
    }])
  }

  const handleSave = async () => {
    if (!db) return
    if (extractedItems.length === 0) {
      toast({ variant: "destructive", title: "Nenhum item", description: "Adicione ou escaneie itens primeiro." })
      return
    }

    setIsSaving(true)
    try {
      const colRef = collection(db, 'restaurants', restaurantId, 'ingredients')
      
      // Get all existing items to check for matches
      const existingItemsSnap = await getDocs(query(colRef))
      const existingItems = existingItemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any))

      for (const item of extractedItems) {
        if (!item.name.trim()) continue; // Skip empty names

        // naive match by name (case-insensitive)
        const match = existingItems.find(ex => ex.name.toLowerCase() === item.name.toLowerCase())

        if (match) {
          // Update existing item: sum quantity, update average or last cost
          // We update keeping last known cost here for simplicity
          updateDocumentNonBlocking(doc(colRef, match.id), {
            quantity: match.quantity + Number(item.quantity),
            cost: Number(item.cost), // update to latest cost
          })
        } else {
          // Create new
          addDocumentNonBlocking(colRef, {
            name: item.name,
            quantity: Number(item.quantity),
            unit: item.unit,
            cost: Number(item.cost),
            status: 'Normal',
            restaurantId,
            imageUrl: null,
            minStock: 0,
            category: item.category || 'Outros',
            expirationDate: null
          })
        }
      }

      toast({ title: "Insumos atualizados!", description: "Os dados da nota foram importados com sucesso." })
      if (onSuccess) onSuccess()
      setIsOpen(false)
      // reset state
      setExtractedItems([])
      setOriginalImage(null)
    } catch (err) {
      console.error(err)
      toast({ variant: "destructive", title: "Erro ao salvar", description: "Ocorreu um erro ao atualizar o inventário." })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open)
      if (!open && !isScanning && !isSaving) {
        setExtractedItems([])
        setOriginalImage(null)
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Camera className="w-4 h-4" /> Escanear Nota Fiscal
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Escanear Nota Fiscal</DialogTitle>
        </DialogHeader>

        {originalImage === null && !isScanning && (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-muted-foreground/25 rounded-xl bg-muted/10 gap-4">
            <ScanLine className="w-16 h-16 text-muted-foreground/50" />
            <div className="text-center space-y-1">
              <h3 className="font-semibold text-lg">Atualize via Câmera</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Tire uma foto do seu cupom ou nota fiscal para extrairmos os itens e valores automaticamente usando IA.
              </p>
            </div>
            
            <div className="flex gap-4 mt-4">
              {/* This input uses capture="environment" which usually forces camera on phones */}
              <label className="cursor-pointer">
                <Button asChild className="gap-2 pointer-events-none">
                  <div><Camera className="w-4 h-4" /> Tirar Foto</div>
                </Button>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  className="hidden" 
                  onChange={handleCapture}
                />
              </label>
              
              <label className="cursor-pointer">
                <Button variant="secondary" asChild className="gap-2 pointer-events-none">
                  <div><Upload className="w-4 h-4" /> Fazer Upload</div>
                </Button>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleCapture}
                  ref={fileInputRef}
                />
              </label>
            </div>
          </div>
        )}

        {isScanning && (
          <div className="flex flex-col items-center justify-center p-12 gap-4">
            <div className="w-16 h-16 relative flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <ScanLine className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <h3 className="font-semibold text-lg animate-pulse">Lendo dados da nota...</h3>
            <p className="text-sm text-muted-foreground">Isso pode levar alguns segundos.</p>
          </div>
        )}

        {extractedItems.length > 0 && !isScanning && (
          <div className="space-y-6 py-4">
            <div className="bg-primary/10 text-primary px-4 py-3 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">Confira os itens encontrados</p>
                <p>Revise os nomes, unidades e custos. Se o nome for exatamente igual a um item do estoque, a quantidade será somada. Caso contrário, um novo será criado.</p>
              </div>
            </div>

            <div className="border rounded-md divide-y overflow-hidden max-h-[50vh] overflow-y-auto">
              {extractedItems.map((item, index) => (
                <div key={item.id} className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-card">
                  <div className="md:col-span-4 space-y-2">
                    <Label className="text-xs text-muted-foreground">Nome (Lido da Nota)</Label>
                    <Input 
                      value={item.name} 
                      onChange={(e) => handleItemChange(item.id, 'name', e.target.value)} 
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-xs text-muted-foreground">Categ.</Label>
                    <Select 
                      value={item.category} 
                      onValueChange={(val) => handleItemChange(item.id, 'category', val)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-xs text-muted-foreground">Qtd</Label>
                    <Input 
                      type="number"
                      step="0.01" 
                      value={item.quantity} 
                      onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)} 
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-xs text-muted-foreground">Un</Label>
                    <Select 
                      value={item.unit} 
                      onValueChange={(val) => handleItemChange(item.id, 'unit', val)}
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
                  <div className="md:col-span-2 space-y-2 pb-0.5 flex items-center justify-between">
                    <div>
                      <Label className="text-xs text-muted-foreground">R$/Unid</Label>
                      <Input 
                        type="number" 
                        step="0.01"
                        value={item.cost} 
                        onChange={(e) => handleItemChange(item.id, 'cost', parseFloat(e.target.value) || 0)} 
                      />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive ml-2 h-9 w-9" 
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" className="w-full gap-2 border-dashed" onClick={addEmptyItem}>
              <Plus className="w-4 h-4" /> Adicionar Linha Manualmente
            </Button>
            
            <DialogFooter className="mt-4 border-t pt-4">
              <Button variant="ghost" onClick={() => {
                setExtractedItems([])
                setOriginalImage(null)
              }}>Descartar e Tentar Novamente</Button>
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                <CheckCircle2 className="w-4 h-4" /> {isSaving ? 'Salvando...' : 'Atualizar Insumos'}
              </Button>
            </DialogFooter>
          </div>
        )}

      </DialogContent>
    </Dialog>
  )
}
