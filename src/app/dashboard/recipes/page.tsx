
"use client"

import { useState, useMemo, useRef, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Calculator, 
  ChefHat, 
  Sparkles, 
  Plus, 
  Trash2, 
  Info, 
  Save, 
  FileText,
  ChevronRight,
  Camera,
  CameraOff,
  XCircle,
  Utensils,
  Upload,
  Pencil,
  Download
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { suggestMenuItemPricing, type SuggestMenuItemPricingOutput } from '@/ai/flows/suggest-menu-item-pricing'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import Image from 'next/image'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from '@/hooks/use-toast'
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase'
import { collection, query } from 'firebase/firestore'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Image as ImageIcon } from 'lucide-react'

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
}

interface Ingredient {
  id: string
  name: string
  qty: string
  cost: number
  imageUrl?: string
  inventoryId?: string
  manualCostOverride?: boolean
}

interface Recipe {
  id: string
  name: string
  photoUrl?: string
  ingredients: Ingredient[]
  profitMargin: number
  tax: number
  cardFee: number
  deliveryFee: number
}

const INITIAL_RECIPES: Recipe[] = [
  {
    id: '1',
    name: 'Hambúrguer Gourmet Especial',
    photoUrl: 'https://picsum.photos/seed/burger/600/400',
    ingredients: [
      { id: '1', name: 'Pão Brioche', qty: '1 un', cost: 1.50 },
      { id: '2', name: 'Blend Bovino 180g', qty: '180g', cost: 7.80 },
      { id: '3', name: 'Queijo Cheddar', qty: '30g', cost: 1.20 },
      { id: '4', name: 'Bacon Fatiado', qty: '20g', cost: 0.80 },
      { id: '5', name: 'Molho Especial', qty: '20ml', cost: 1.20 },
    ],
    profitMargin: 25,
    tax: 4,
    cardFee: 2.5,
    deliveryFee: 12
  }
]

const calculateProportionalCost = (recipeQtyStr: string, invUnitStr: string, invUnitCost: number): number | null => {
  if (!recipeQtyStr || !invUnitStr) return null;

  // Normalizador de strings para lidar com acentos e espaços
  const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // Função para extrair valor numérico e unidade de uma string (ex: "500g", "1.5 kg", "12 unidades")
  const parse = (str: string) => {
    const match = str.trim().match(/^([\d.,]+)\s*(.*)$/);
    if (!match) return null;
    const val = parseFloat(match[1].replace(',', '.'));
    const unit = normalize(match[2]);
    return { val, unit };
  };

  const rec = parse(recipeQtyStr);
  const inv = parse(invUnitStr) || { val: 1, unit: normalize(invUnitStr) };

  if (!rec) return null;

  // Mapeamento de fatores de conversão para unidades base
  // Massa: grama (g), Volume: mililitro (ml), Contagem: unidade (un)
  const getConversion = (u: string) => {
    // Massa
    if (/^(kg|quilo|kilo|quilograma)/.test(u)) return { type: 'mass', factor: 1000 };
    if (/^(g|grama)/.test(u)) return { type: 'mass', factor: 1 };
    if (/^(mg|miligrama)/.test(u)) return { type: 'mass', factor: 0.001 };
    
    // Volume
    if (/^(l|litro)/.test(u)) return { type: 'volume', factor: 1000 };
    if (/^(ml|mililitro)/.test(u)) return { type: 'volume', factor: 1 };
    
    // Unidades de medida de cozinha (aproximadas para volume)
    if (/^(xicara|cup)/.test(u)) return { type: 'volume', factor: 240 };
    if (/^(colher\s*sopa|tbsp)/.test(u)) return { type: 'volume', factor: 15 };
    if (/^(colher\s*cha|tsp)/.test(u)) return { type: 'volume', factor: 5 };

    // Contagem / Outros
    if (/^(un|unid|peca|fardo|pct|pacote|cx|caixa)/.test(u)) return { type: 'count', factor: 1 };
    
    return { type: 'other', factor: 1 };
  };

  const recConv = getConversion(rec.unit);
  const invConv = getConversion(inv.unit);

  // Se as unidades forem do mesmo tipo físico (ex: kg e g), a conversão é direta.
  // Se forem tipos diferentes (ex: xícara e kg), fazemos a conversão baseada nos fatores, 
  // assumindo a densidade padrão da água (1g = 1ml) para simplificação quando houver mistura de massa/volume.
  
  const recTotalBaseValue = rec.val * recConv.factor;
  const invTotalBaseValue = inv.val * invConv.factor;

  if (invTotalBaseValue === 0) return 0;

  // Custo por unidade base (ex: custo por 1g ou 1ml)
  const costPerBaseUnit = invUnitCost / invTotalBaseValue;
  
  return costPerBaseUnit * recTotalBaseValue;
}

export default function RecipesPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  const restaurantId = 'gp-001'

  const inventoryQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(collection(db, 'restaurants', restaurantId, 'ingredients'))
  }, [db, user])

  const { data: inventory } = useCollection<InventoryItem>(inventoryQuery)

  const [recipes, setRecipes] = useState<Recipe[]>(INITIAL_RECIPES)
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>(INITIAL_RECIPES[0].id)
  
  // Current Editing State
  const [editingName, setEditingName] = useState(INITIAL_RECIPES[0].name)
  const [editingPhoto, setEditingPhoto] = useState<string | undefined>(INITIAL_RECIPES[0].photoUrl)
  const [editingIngredients, setEditingIngredients] = useState<Ingredient[]>(INITIAL_RECIPES[0].ingredients)
  const [profitMargin, setProfitMargin] = useState(INITIAL_RECIPES[0].profitMargin)
  const [tax, setTax] = useState(INITIAL_RECIPES[0].tax)
  const [cardFee, setCardFee] = useState(INITIAL_RECIPES[0].cardFee)
  const [deliveryFee, setDeliveryFee] = useState(INITIAL_RECIPES[0].deliveryFee)

  // Camera States
  const [isCapturing, setIsCapturing] = useState(false)
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Add Ingredient State
  const [newIngId, setNewIngId] = useState('')
  const [newIngName, setNewIngName] = useState('')
  const [newIngQty, setNewIngQty] = useState('')
  const [newIngCost, setNewIngCost] = useState('')
  const [newIngImageUrl, setNewIngImageUrl] = useState('')
  const [isIngDialogOpen, setIsIngDialogOpen] = useState(false)

  // Edit Ingredient State
  const [editingIngId, setEditingIngId] = useState('')
  const [editIngInventoryId, setEditIngInventoryId] = useState('')
  const [editIngName, setEditIngName] = useState('')
  const [editIngQty, setEditIngQty] = useState('')
  const [editIngCost, setEditIngCost] = useState('')
  const [editIngImageUrl, setEditIngImageUrl] = useState('')
  const [isEditIngDialogOpen, setIsEditIngDialogOpen] = useState(false)

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiResult, setAiResult] = useState<SuggestMenuItemPricingOutput | null>(null)

  const getIngredientCost = (ing: Ingredient) => {
    if (ing.manualCostOverride) {
      return ing.cost
    }
    if (ing.inventoryId && inventory) {
      const item = inventory.find(i => i.id === ing.inventoryId)
      if (item) {
        const calculated = calculateProportionalCost(ing.qty, item.unit, item.cost)
        if (calculated !== null) return calculated
      }
    }
    return ing.cost
  }

  const currentCmv = useMemo(() => {
    return editingIngredients.reduce((sum, ing) => sum + getIngredientCost(ing), 0)
  }, [editingIngredients, inventory])

  useEffect(() => {
    if (newIngId && newIngQty && inventory) {
      const item = inventory.find(i => i.id === newIngId)
      if (item) {
        const cost = calculateProportionalCost(newIngQty, item.unit, item.cost)
        if (cost !== null) {
          setNewIngCost(cost.toFixed(2))
        }
      }
    }
  }, [newIngId, newIngQty, inventory])

  useEffect(() => {
    if (editIngInventoryId && editIngQty && inventory) {
      const item = inventory.find(i => i.id === editIngInventoryId)
      if (item) {
        const cost = calculateProportionalCost(editIngQty, item.unit, item.cost)
        if (cost !== null) {
          setEditIngCost(cost.toFixed(2))
        }
      }
    }
  }, [editIngInventoryId, editIngQty, inventory])

  useEffect(() => {
    if (isCapturing) {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Erro na Câmera',
            description: 'Por favor, habilite as permissões de câmera no seu navegador.',
          });
        }
      };
      getCameraPermission();
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    }
  }, [isCapturing, toast]);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setEditingPhoto(dataUrl);
        setIsCapturing(false);
      }
    }
  };

  const handleAddRecipe = () => {
    const newRecipe: Recipe = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'Nova Ficha Técnica',
      ingredients: [],
      profitMargin: 30,
      tax: 4,
      cardFee: 2.5,
      deliveryFee: 12
    }
    setRecipes([...recipes, newRecipe])
    loadRecipe(newRecipe)
  }

  const loadRecipe = (recipe: Recipe) => {
    setActiveRecipeId(recipe.id)
    setEditingName(recipe.name)
    setEditingPhoto(recipe.photoUrl)
    setEditingIngredients(recipe.ingredients)
    setProfitMargin(recipe.profitMargin)
    setTax(recipe.tax)
    setCardFee(recipe.cardFee)
    setDeliveryFee(recipe.deliveryFee)
    setAiResult(null)
    setIsCapturing(false)
  }

  const handleSaveRecipe = () => {
    if (!activeRecipeId) return
    const updatedRecipes = recipes.map(r => {
      if (r.id === activeRecipeId) {
        return {
          ...r,
          name: editingName,
          photoUrl: editingPhoto,
          ingredients: editingIngredients.map(ing => ({
            ...ing,
            cost: getIngredientCost(ing)
          })),
          profitMargin,
          tax,
          cardFee,
          deliveryFee
        }
      }
      return r
    })
    setRecipes(updatedRecipes)
    toast({
      title: "Ficha Salva",
      description: `Os dados de "${editingName}" foram atualizados.`
    })
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new window.Image()
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
        callback(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleAddIngredient = () => {
    if (!newIngName || !newIngCost) return
    const selectedInvItem = inventory?.find(i => i.id === newIngId)
    
    let isManual = true
    if (selectedInvItem) {
      const calculated = calculateProportionalCost(newIngQty || 'un', selectedInvItem.unit, selectedInvItem.cost)
      if (calculated !== null && Math.abs(calculated - parseFloat(newIngCost)) < 0.01) {
        isManual = false
      }
    } else if (!newIngId) {
      isManual = false
    }

    const newIng: Ingredient = {
      id: Math.random().toString(36).substr(2, 9),
      name: newIngName,
      qty: newIngQty || 'un',
      cost: parseFloat(newIngCost),
      imageUrl: newIngImageUrl || selectedInvItem?.imageUrl,
      inventoryId: newIngId || undefined,
      manualCostOverride: isManual
    }
    setEditingIngredients([...editingIngredients, newIng])
    setNewIngId('')
    setNewIngName('')
    setNewIngQty('')
    setNewIngCost('')
    setNewIngImageUrl('')
    setIsIngDialogOpen(false)
  }

  const handleEditIngredient = (ing: Ingredient) => {
    setEditingIngId(ing.id)
    setEditIngInventoryId(ing.inventoryId || '')
    setEditIngName(ing.name)
    setEditIngQty(ing.qty)
    setEditIngCost(getIngredientCost(ing).toFixed(2))
    setEditIngImageUrl(ing.imageUrl || '')
    setIsEditIngDialogOpen(true)
  }

  const handleUpdateIngredient = () => {
    if (!editIngName || !editIngCost) return
    const updatedIngredients = editingIngredients.map(ing => {
      if (ing.id === editingIngId) {
        let isManual = true
        if (editIngInventoryId && inventory) {
          const item = inventory.find(i => i.id === editIngInventoryId)
          if (item) {
            const calculated = calculateProportionalCost(editIngQty || 'un', item.unit, item.cost)
            if (calculated !== null && Math.abs(calculated - parseFloat(editIngCost)) < 0.01) {
              isManual = false
            }
          }
        } else if (!editIngInventoryId && !ing.inventoryId) {
          // If it was never linked to inventory, it's not a manual override of a linked item
          isManual = false
        }

        return {
          ...ing,
          name: editIngName,
          qty: editIngQty || 'un',
          cost: parseFloat(editIngCost),
          imageUrl: editIngImageUrl || undefined,
          inventoryId: editIngInventoryId || undefined,
          manualCostOverride: isManual
        }
      }
      return ing
    })
    setEditingIngredients(updatedIngredients)
    setIsEditIngDialogOpen(false)
  }

  const handleInlineCostUpdate = (id: string, newCostStr: string) => {
    setEditingIngredients(editingIngredients.map(ing => {
      if (ing.id === id) {
        if (newCostStr.trim() === '') {
          // Revert to calculated cost
          return {
            ...ing,
            manualCostOverride: false
          }
        }
        
        const newCost = parseFloat(newCostStr)
        if (!isNaN(newCost)) {
          return {
            ...ing,
            cost: newCost,
            manualCostOverride: true
          }
        }
      }
      return ing
    }))
  }

  const removeIngredient = (id: string) => {
    setEditingIngredients(editingIngredients.filter(ing => ing.id !== id))
  }

  const handleSuggestPrice = async () => {
    setIsAnalyzing(true)
    try {
      const result = await suggestMenuItemPricing({
        itemName: editingName,
        cmv: currentCmv,
        desiredProfitMarginPercentage: profitMargin,
        simplesNacionalTaxPercentage: tax,
        creditCardFeePercentage: cardFee,
        deliveryAppCommissionPercentage: deliveryFee
      })
      setAiResult(result)
    } catch (error) {
      console.error("AI Analysis failed", error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const generatePDF = () => {
    const doc = new jsPDF()
    const title = editingName || 'Ficha Técnica'
    
    // Header
    doc.setFontSize(22)
    doc.setTextColor(74, 108, 93) // Theme Green
    doc.text(title, 14, 22)
    
    doc.setFontSize(10)
    doc.setTextColor(120)
    doc.text(`Ficha Técnica Gerada em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 14, 30)

    // Ingredients Table
    const tableData = editingIngredients.map(ing => [
      ing.name,
      ing.qty,
      `R$ ${getIngredientCost(ing).toFixed(2)}`
    ])

    autoTable(doc, {
      startY: 40,
      head: [['Ingrediente', 'Quantidade', 'Custo (Proporcional)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [74, 108, 93], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 30, halign: 'right' },
        2: { cellWidth: 40, halign: 'right' },
      },
      styles: { fontSize: 9 }
    })

    const finalY = (doc as any).lastAutoTable.finalY + 15

    // Financial Summary
    doc.setFontSize(14)
    doc.setTextColor(0)
    doc.text('Resumo Financeiro', 14, finalY)
    
    doc.setDrawColor(200)
    doc.line(14, finalY + 2, 60, finalY + 2)

    doc.setFontSize(11)
    doc.text(`CMV Total: R$ ${currentCmv.toFixed(2)}`, 14, finalY + 10)

    if (aiResult) {
      doc.setFont('helvetica', 'bold')
      doc.text(`Preço de Venda Sugerido (IA): R$ ${aiResult.suggestedSellingPrice.toFixed(2)}`, 14, finalY + 18)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Lucro Líquido Previsto: R$ ${(aiResult.suggestedSellingPrice - currentCmv).toFixed(2)} (${aiResult.profitMarginAchieved.toFixed(1)}%)`, 14, finalY + 25)
      
      const breakdownLines = doc.splitTextToSize(`Base de cálculo: Margem desejada de ${profitMargin}%, Impostos ${tax}%, Taxas ${cardFee}% e Delivery ${deliveryFee}%.`, 180)
      doc.text(breakdownLines, 14, finalY + 34)
    } else {
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Margem de Lucro Alvo: ${profitMargin}%`, 14, finalY + 18)
      doc.text(`Configurações: Impostos ${tax}%, Taxas ${cardFee}%, Delivery ${deliveryFee}%`, 14, finalY + 24)
    }

    // Disclaimer
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text('Documento gerado automaticamente pelo sistema de gestão ChefMind AI.', 14, 285)

    doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}_ficha_tecnica.pdf`)
    
    toast({
      title: "PDF Gerado",
      description: "O download da ficha técnica começará em instantes."
    })
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary">Fichas Técnicas & Precificação</h1>
          <p className="text-muted-foreground">Calcule o CMV real, fotografe seus pratos e defina preços via IA.</p>
        </div>
        <Button onClick={handleAddRecipe} className="gap-2">
          <Plus className="w-4 h-4" /> Nova Ficha
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: List of Recipes */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="p-4">
              <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Suas Fichas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col">
                {recipes.map(recipe => (
                  <button
                    key={recipe.id}
                    onClick={() => loadRecipe(recipe)}
                    className={`flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-all border-b last:border-0 ${activeRecipeId === recipe.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden relative">
                        {recipe.photoUrl ? (
                          <Image src={recipe.photoUrl} alt={recipe.name} fill className="object-cover" />
                        ) : (
                          <FileText className="w-4 h-4 text-muted-foreground/40" />
                        )}
                      </div>
                      <span className={`text-sm font-bold truncate ${activeRecipeId === recipe.id ? 'text-primary' : 'text-foreground'}`}>
                        {recipe.name}
                      </span>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform ${activeRecipeId === recipe.id ? 'translate-x-1 text-primary' : 'text-muted-foreground/30'}`} />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-md border-primary/10">
            <CardHeader className="bg-primary/5 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <ChefHat className="text-primary w-5 h-5" />
                <CardTitle className="text-lg">Detalhes da Ficha</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={generatePDF} className="gap-2 font-bold border-primary text-primary hover:bg-primary/5">
                  <Download className="w-4 h-4" /> Exportar PDF
                </Button>
                <Button size="sm" variant="default" onClick={handleSaveRecipe} className="gap-2 font-bold">
                  <Save className="w-4 h-4" /> Salvar Ficha
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Foto do Prato */}
              <div className="space-y-3">
                <Label className="text-xs uppercase font-black text-muted-foreground tracking-widest">Apresentação do Prato</Label>
                <div className="relative aspect-video bg-muted rounded-2xl overflow-hidden border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center group">
                  {editingPhoto && !isCapturing ? (
                    <>
                      <Image src={editingPhoto} alt="Prato" fill className="object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setIsCapturing(true)} className="gap-2">
                          <Camera className="w-4 h-4" /> Trocar Foto
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" className="h-8 w-8">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover Foto?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover a foto deste prato?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => setEditingPhoto(undefined)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Confirmar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </>
                  ) : isCapturing ? (
                    <div className="w-full h-full relative bg-black">
                      <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                        <Button onClick={takePhoto} className="rounded-full h-12 w-12 bg-primary hover:scale-110 transition-transform">
                          <Camera className="w-6 h-6" />
                        </Button>
                        <Button variant="secondary" onClick={() => setIsCapturing(false)} className="rounded-full h-12 w-12">
                          <XCircle className="w-6 h-6" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 py-8">
                      <div className="p-4 bg-background rounded-full shadow-sm">
                        <Utensils className="w-8 h-8 text-muted-foreground/40" />
                      </div>
                      <div className="text-center px-4">
                        <p className="text-xs text-muted-foreground mb-4">Adicione uma foto do prato finalizado para padronização visual.</p>
                        <Button variant="outline" onClick={() => setIsCapturing(true)} className="gap-2 border-primary/20 hover:bg-primary/5">
                          <Camera className="w-4 h-4 text-primary" /> Capturar Foto agora
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
                {!hasCameraPermission && isCapturing && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTitle>Câmera Bloqueada</AlertTitle>
                    <AlertDescription>Habilite o acesso à câmera para fotografar o prato.</AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dish-name" className="text-xs uppercase font-black text-muted-foreground tracking-widest">Nome do Prato/Item</Label>
                <Input 
                  id="dish-name" 
                  value={editingName} 
                  onChange={(e) => setEditingName(e.target.value)} 
                  className="text-lg font-bold h-12"
                />
              </div>
              
              <div className="border rounded-xl p-5 bg-muted/10 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Insumos & Quantidades</h4>
                  <Dialog open={isIngDialogOpen} onOpenChange={setIsIngDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 border-primary text-primary hover:bg-primary/5">
                        <Plus className="w-3 h-3 mr-1" /> Adicionar Insumo
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Novo Insumo na Ficha</DialogTitle>
                        <DialogDescription>Insira o custo proporcional utilizado nesta receita.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="flex justify-center mb-2">
                          <div className="relative w-24 h-24 rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/10">
                            {newIngImageUrl || (inventory?.find(i => i.id === newIngId)?.imageUrl) ? (
                              <img src={newIngImageUrl || inventory?.find(i => i.id === newIngId)?.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                            )}
                            <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer text-white">
                              <Upload className="w-4 h-4 mb-1" />
                              <span className="text-[10px] font-medium">Upload</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handleImageUpload(e, (base64) => setNewIngImageUrl(base64))}
                              />
                            </label>
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label>Selecionar do Estoque (Opcional)</Label>
                          <Select 
                            value={newIngId} 
                            onValueChange={(val) => {
                              setNewIngId(val)
                              const item = inventory?.find(i => i.id === val)
                              if (item) {
                                setNewIngName(item.name)
                              }
                            }}
                          >
                            <SelectTrigger><SelectValue placeholder="Selecione um insumo..." /></SelectTrigger>
                            <SelectContent>
                              {inventory?.map(item => (
                                <SelectItem key={item.id} value={item.id}>
                                  <div className="flex items-center gap-2">
                                    {item.imageUrl && <img src={item.imageUrl} alt="" className="w-4 h-4 rounded-sm object-cover" />}
                                    {item.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>Nome do Insumo</Label>
                          <Input value={newIngName} onChange={(e) => setNewIngName(e.target.value)} placeholder="Ex: Carne Moída" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label>Quantidade/Un</Label>
                            <Input value={newIngQty} onChange={(e) => setNewIngQty(e.target.value)} placeholder="Ex: 200g" />
                          </div>
                          <div className="grid gap-2">
                            <Label>Custo (R$)</Label>
                            <Input type="number" value={newIngCost} onChange={(e) => setNewIngCost(e.target.value)} placeholder="0.00" />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleAddIngredient} className="w-full font-bold">Adicionar à Ficha</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2 min-h-[100px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ingrediente</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                        <TableHead className="text-right w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editingIngredients.map(ing => (
                        <TableRow key={ing.id} className="group hover:bg-muted/10 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {ing.imageUrl ? (
                                <img src={ing.imageUrl} alt={ing.name} className="w-8 h-8 rounded-md object-cover border" />
                              ) : (
                                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center border">
                                  <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
                                </div>
                              )}
                              <span className="text-sm font-bold">{ing.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-[10px] text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">{ing.qty}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-sm font-black text-foreground/80">R$</span>
                              <Input 
                                key={`${ing.id}-${ing.manualCostOverride ? ing.cost : getIngredientCost(ing)}`}
                                type="number" 
                                className={`w-20 h-7 text-right text-sm font-black p-1 ${ing.manualCostOverride ? 'text-orange-500 border-orange-200 bg-orange-50/50' : ''}`}
                                defaultValue={ing.manualCostOverride ? ing.cost : getIngredientCost(ing).toFixed(2)}
                                onBlur={(e) => handleInlineCostUpdate(ing.id, e.target.value)}
                                step="0.01"
                                title={ing.manualCostOverride ? "Custo editado manualmente. Apague para voltar ao cálculo automático." : "Custo calculado automaticamente"}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-primary"
                                onClick={() => handleEditIngredient(ing)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-destructive"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remover Insumo?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja remover "{ing.name}" desta ficha técnica?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => removeIngredient(ing.id)}
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
                      ))}
                      {editingIngredients.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-10 text-muted-foreground text-xs italic border-2 border-dashed rounded-xl">
                            Nenhum insumo adicionado ainda.
                          </TableCell>
                        </TableRow>
                      )}
                      {editingIngredients.length > 0 && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={2} className="text-right font-bold text-xs uppercase tracking-widest text-muted-foreground">
                            CMV Total
                          </TableCell>
                          <TableCell className="text-right font-black text-primary">
                            R$ {currentCmv.toFixed(2)}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                <Dialog open={isEditIngDialogOpen} onOpenChange={setIsEditIngDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Editar Insumo</DialogTitle>
                      <DialogDescription>Altere os detalhes do insumo nesta receita.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="flex justify-center mb-2">
                        <div className="relative w-24 h-24 rounded-xl border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted/10">
                          {editIngImageUrl ? (
                            <img src={editIngImageUrl} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                          )}
                          <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity cursor-pointer text-white">
                            <Upload className="w-4 h-4 mb-1" />
                            <span className="text-[10px] font-medium">Upload</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handleImageUpload(e, (base64) => setEditIngImageUrl(base64))}
                            />
                          </label>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label>Vincular ao Estoque (Opcional)</Label>
                        <Select 
                          value={editIngInventoryId} 
                          onValueChange={(val) => {
                            setEditIngInventoryId(val)
                            const item = inventory?.find(i => i.id === val)
                            if (item) {
                              setEditIngName(item.name)
                            }
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="Selecione um insumo..." /></SelectTrigger>
                          <SelectContent>
                            {inventory?.map(item => (
                              <SelectItem key={item.id} value={item.id}>
                                <div className="flex items-center gap-2">
                                  {item.imageUrl && <img src={item.imageUrl} alt="" className="w-4 h-4 rounded-sm object-cover" />}
                                  {item.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Nome do Insumo</Label>
                        <Input value={editIngName} onChange={(e) => setEditIngName(e.target.value)} placeholder="Ex: Carne Moída" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Quantidade/Un</Label>
                          <Input value={editIngQty} onChange={(e) => setEditIngQty(e.target.value)} placeholder="Ex: 200g" />
                        </div>
                        <div className="grid gap-2">
                          <Label>Custo (R$)</Label>
                          <Input type="number" value={editIngCost} onChange={(e) => setEditIngCost(e.target.value)} placeholder="0.00" />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleUpdateIngredient} className="w-full font-bold">Salvar Alterações</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex justify-between items-center p-5 bg-primary/10 rounded-2xl border-2 border-primary/20">
                <div>
                  <span className="text-[10px] font-black uppercase text-primary tracking-widest block mb-1">CMV Total (Custo Direto)</span>
                  <span className="text-xs text-muted-foreground">Soma dos insumos proporcionais</span>
                </div>
                <span className="text-3xl font-black text-primary font-headline">R$ {currentCmv.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="bg-muted/5">
              <CardTitle className="text-lg">Taxas & Lucratividade</CardTitle>
              <CardDescription>Configure os percentuais que incidem sobre a venda</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Simples Nacional (%)</Label>
                <Input type="number" value={tax} onChange={(e) => setTax(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Taxa Cartão Média (%)</Label>
                <Input type="number" value={cardFee} onChange={(e) => setCardFee(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Comissão Apps (Delivery) (%)</Label>
                <Input type="number" value={deliveryFee} onChange={(e) => setDeliveryFee(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Margem de Lucro Desejada (%)</Label>
                <Input type="number" value={profitMargin} onChange={(e) => setProfitMargin(Number(e.target.value))} />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t flex justify-center py-8">
              <Button size="lg" className="w-full md:w-auto px-12 h-14 text-lg font-black gap-3 shadow-xl shadow-primary/20" onClick={handleSuggestPrice} disabled={isAnalyzing || editingIngredients.length === 0}>
                {isAnalyzing ? "Analisando..." : <><Sparkles className="w-6 h-6 animate-pulse" /> SUGERIR PREÇO VIA IA</>}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* AI Result View */}
        <div className="lg:col-span-1 space-y-6">
          <Card className={`shadow-xl transition-all duration-500 border-2 sticky top-8 h-fit ${aiResult ? 'border-primary' : 'border-dashed border-muted'}`}>
            <CardHeader className="text-center border-b bg-card">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <Calculator className="text-primary w-6 h-6" />
              </div>
              <CardTitle className="text-xl font-headline">Resultado IA</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold tracking-tighter">Análise Baseada no CMV</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {!aiResult ? (
                <div className="text-center py-12 text-muted-foreground space-y-4">
                  <Sparkles className="w-12 h-12 mx-auto opacity-10" />
                  <p className="text-xs px-4">Preencha a ficha e clique em Sugerir Preço para receber a análise estratégica.</p>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                  <div className="text-center bg-primary/5 p-8 rounded-3xl border border-primary/10">
                    <p className="text-[10px] text-muted-foreground mb-2 uppercase font-black tracking-widest">Preço Sugerido</p>
                    <p className="text-4xl font-black text-primary font-headline">R$ {aiResult.suggestedSellingPrice.toFixed(2)}</p>
                    <Badge variant="secondary" className="mt-4 px-4 py-1 text-primary font-bold">LUCRO: {aiResult.profitMarginAchieved.toFixed(1)}%</Badge>
                  </div>

                  <div className="space-y-3">
                    <h5 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground border-b pb-2">Estratégia de Cálculo</h5>
                    <div className="text-[11px] text-muted-foreground leading-relaxed bg-muted/30 p-5 rounded-2xl whitespace-pre-wrap font-medium">
                      {aiResult.breakdown}
                    </div>
                  </div>

                  <Button className="w-full h-12 font-bold" onClick={() => {
                    toast({ title: "Preço Aplicado", description: `O item "${editingName}" agora custa R$ ${aiResult.suggestedSellingPrice.toFixed(2)}` })
                  }}>Aplicar Preço no Menu</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-secondary/5 border-none shadow-sm">
            <CardHeader className="p-5 flex flex-row items-center gap-3">
              <div className="bg-secondary/20 p-2 rounded-lg">
                <Info className="w-4 h-4 text-secondary" />
              </div>
              <CardTitle className="text-xs uppercase font-black text-secondary tracking-widest">Dica Estratégica</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 text-xs text-muted-foreground leading-relaxed">
              Fotografar o prato garante que sua equipe de cozinha mantenha o **padrão de empratamento**, essencial para a experiência do cliente e controle de desperdício por porcionamento excessivo.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
