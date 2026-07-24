'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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
  Utensils,
  Upload,
  Pencil,
  Download,
  Image as ImageIcon,
  Wine,
  GlassWater,
  Beer,
  Filter,
  Folder
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
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/store'
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase'
import { collection, query, doc } from 'firebase/firestore'
import { deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

export const CATEGORY_OPTIONS = [
  'Bebidas Alcoólicas',
  'Bebidas Não Alcoólicas',
  'Pratos Principais',
  'Entradas',
  'Sobremesas',
  'Acompanhamentos',
  'Outros'
]

interface Recipe {
  id: string
  name: string
  category?: string
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
    category: 'Pratos Principais',
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
  },
  {
    id: '2',
    name: 'Caipirinha Tradicional de Limão',
    category: 'Bebidas Alcoólicas',
    photoUrl: 'https://picsum.photos/seed/caipirinha/600/400',
    ingredients: [
      { id: 'c1', name: 'Cachaça Artesanal', qty: '50ml', cost: 2.50 },
      { id: 'c2', name: 'Limão Taiti', qty: '1 un', cost: 0.60 },
      { id: 'c3', name: 'Açúcar Refinado', qty: '20g', cost: 0.15 },
      { id: 'c4', name: 'Gelo Cubos', qty: '150g', cost: 0.20 }
    ],
    profitMargin: 60,
    tax: 4,
    cardFee: 2.5,
    deliveryFee: 0
  },
  {
    id: '3',
    name: 'Suco Natural de Laranja 500ml',
    category: 'Bebidas Não Alcoólicas',
    photoUrl: 'https://picsum.photos/seed/orangejuice/600/400',
    ingredients: [
      { id: 's1', name: 'Laranja Pera', qty: '400g', cost: 1.80 },
      { id: 's2', name: 'Gelo Cubos', qty: '100g', cost: 0.15 }
    ],
    profitMargin: 50,
    tax: 4,
    cardFee: 2.5,
    deliveryFee: 0
  }
]

const calculateProportionalCost = (recipeQtyStr: string, invUnitStr: string, invUnitCost: number): number | null => {
  if (!recipeQtyStr || !invUnitStr) return null;

  const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

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

  const getConversion = (u: string) => {
    if (/^(kg|quilo|kilo|quilograma)/.test(u)) return { type: 'mass', factor: 1000 };
    if (/^(g|grama)/.test(u)) return { type: 'mass', factor: 1 };
    if (/^(mg|miligrama)/.test(u)) return { type: 'mass', factor: 0.001 };
    
    if (/^(l|litro)/.test(u)) return { type: 'volume', factor: 1000 };
    if (/^(ml|mililitro)/.test(u)) return { type: 'volume', factor: 1 };
    
    if (/^(xicara|cup)/.test(u)) return { type: 'volume', factor: 240 };
    if (/^(colher\s*sopa|tbsp)/.test(u)) return { type: 'volume', factor: 15 };
    if (/^(colher\s*cha|tsp)/.test(u)) return { type: 'volume', factor: 5 };

    if (/^(un|unid|peca|fardo|pct|pacote|cx|caixa)/.test(u)) return { type: 'count', factor: 1 };
    
    return { type: 'other', factor: 1 };
  };

  const recConv = getConversion(rec.unit);
  const invConv = getConversion(inv.unit);

  const recTotalBaseValue = rec.val * recConv.factor;
  const invTotalBaseValue = inv.val * invConv.factor;

  if (invTotalBaseValue === 0) return 0;

  const costPerBaseUnit = invUnitCost / invTotalBaseValue;
  
  return costPerBaseUnit * recTotalBaseValue;
}

export default function RecipesPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { user: localUser } = useAuth()
  const db = useFirestore()
  const { user } = useUser()
  const restaurantId = localUser?.restaurantId || 'gp-001'

  const newRecipeFileInputRef = useRef<HTMLInputElement>(null)

  const aiConfigRef = useMemo(() => doc(db, 'restaurants', restaurantId, 'config', 'ai'), [db, restaurantId])
  const { data: aiConfig } = useDoc(aiConfigRef)

  const inventoryQuery = useMemoFirebase(() => {
    if (!db || !user || !restaurantId) return null
    return query(collection(db, 'restaurants', restaurantId, 'ingredients'))
  }, [db, user, restaurantId])

  const { data: inventory } = useCollection<InventoryItem>(inventoryQuery)

  const recipesQuery = useMemoFirebase(() => {
    if (!db || !user || !restaurantId) return null
    return query(collection(db, 'restaurants', restaurantId, 'recipes'))
  }, [db, user, restaurantId])

  const { data: firestoreRecipes } = useCollection<Recipe>(recipesQuery)

  const [hasClearedDemo, setHasClearedDemo] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chefmind_demo_recipes_cleared') === 'true' || localStorage.getItem(`demo_recipes_cleared_${restaurantId}`) === 'true'
    }
    return false
  })

  useEffect(() => {
    if (typeof window !== 'undefined' && restaurantId) {
      if (localStorage.getItem(`demo_recipes_cleared_${restaurantId}`) === 'true' || localStorage.getItem('chefmind_demo_recipes_cleared') === 'true') {
        setHasClearedDemo(true)
      }
    }
  }, [restaurantId])

  const [localRecipes, setLocalRecipes] = useState<Recipe[]>(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('chefmind_demo_recipes_cleared') === 'true' || localStorage.getItem(`demo_recipes_cleared_${restaurantId}`) === 'true') {
        return []
      }
    }
    return INITIAL_RECIPES
  })

  const recipes = useMemo(() => {
    if (hasClearedDemo) {
      if (firestoreRecipes && firestoreRecipes.length > 0) {
        return firestoreRecipes
      }
      return localRecipes.filter(r => !INITIAL_RECIPES.some(init => init.id === r.id))
    }
    if (firestoreRecipes && firestoreRecipes.length > 0) {
      return firestoreRecipes
    }
    return localRecipes
  }, [firestoreRecipes, localRecipes, hasClearedDemo])

  const [activeRecipeId, setActiveRecipeId] = useState<string | null>(recipes[0]?.id || null)
  
  // Current Editing State
  const [editingName, setEditingName] = useState(recipes[0]?.name || '')
  const [editingCategory, setEditingCategory] = useState<string>(recipes[0]?.category || 'Pratos Principais')
  const [editingPhoto, setEditingPhoto] = useState<string | undefined>(recipes[0]?.photoUrl)
  const [editingIngredients, setEditingIngredients] = useState<Ingredient[]>(recipes[0]?.ingredients || [])
  const [profitMargin, setProfitMargin] = useState(recipes[0]?.profitMargin || 30)
  const [tax, setTax] = useState(recipes[0]?.tax || 4)
  const [cardFee, setCardFee] = useState(recipes[0]?.cardFee || 2.5)
  const [deliveryFee, setDeliveryFee] = useState(recipes[0]?.deliveryFee || 12)

  // Category Filtering State
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL')

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: recipes.length }
    CATEGORY_OPTIONS.forEach(cat => { counts[cat] = 0 })
    recipes.forEach(r => {
      const cat = r.category || 'Pratos Principais'
      counts[cat] = (counts[cat] || 0) + 1
    })
    return counts
  }, [recipes])

  const filteredRecipes = useMemo(() => {
    if (selectedCategoryFilter === 'ALL') return recipes
    return recipes.filter(r => (r.category || 'Pratos Principais') === selectedCategoryFilter)
  }, [recipes, selectedCategoryFilter])

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

  const handleClearDemoRecipes = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chefmind_demo_recipes_cleared', 'true')
      if (restaurantId) {
        localStorage.setItem(`demo_recipes_cleared_${restaurantId}`, 'true')
      }
    }
    setHasClearedDemo(true)
    setLocalRecipes([])

    if (db && firestoreRecipes && firestoreRecipes.length > 0) {
      firestoreRecipes.forEach(item => {
        deleteDocumentNonBlocking(doc(db, 'restaurants', restaurantId, 'recipes', item.id))
      })
    }

    setActiveRecipeId(null)
    setEditingName('')
    setEditingCategory('Pratos Principais')
    setEditingPhoto(undefined)
    setEditingIngredients([])
    setProfitMargin(30)
    setTax(4)
    setCardFee(2.5)
    setDeliveryFee(12)

    toast({
      title: t('recipes.clearDemoDialog.success'),
      description: t('recipes.clearDemoDialog.successDesc')
    })
  }

  const createNewRecipeWithPhoto = (photoBase64?: string, targetCategory?: string) => {
    const cat = targetCategory || (selectedCategoryFilter !== 'ALL' ? selectedCategoryFilter : 'Pratos Principais')
    const newRecipe: Recipe = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'Nova Ficha Técnica',
      category: cat,
      ...(photoBase64 ? { photoUrl: photoBase64 } : {}),
      ingredients: [],
      profitMargin: 30,
      tax: 4,
      cardFee: 2.5,
      deliveryFee: 12
    }
    setLocalRecipes(prev => [...prev, newRecipe])
    loadRecipe(newRecipe)

    if (db && user) {
      setDocumentNonBlocking(doc(db, 'restaurants', restaurantId, 'recipes', newRecipe.id), newRecipe)
    }

    toast({
      title: "Nova Ficha Técnica Criada",
      description: `Categoria: ${cat}. ${photoBase64 ? "Imagem da galeria carregada com sucesso." : "Você pode carregar a imagem da galeria e adicionar os insumos."}`
    })
  }

  const handleAddRecipeWithGallery = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      createNewRecipeWithPhoto()
      return
    }

    handleImageUpload(e, (base64) => {
      createNewRecipeWithPhoto(base64)
    })
  }

  const loadRecipe = (recipe: Recipe) => {
    setActiveRecipeId(recipe.id)
    setEditingName(recipe.name)
    setEditingCategory(recipe.category || 'Pratos Principais')
    setEditingPhoto(recipe.photoUrl)
    setEditingIngredients(recipe.ingredients)
    setProfitMargin(recipe.profitMargin)
    setTax(recipe.tax)
    setCardFee(recipe.cardFee)
    setDeliveryFee(recipe.deliveryFee)
    setAiResult(null)
  }

  const handleSaveRecipe = () => {
    if (!activeRecipeId) return
    const updatedRecipe: Recipe = {
      id: activeRecipeId,
      name: editingName || 'Ficha Técnica',
      category: editingCategory || 'Pratos Principais',
      ...(editingPhoto ? { photoUrl: editingPhoto } : {}),
      ingredients: editingIngredients.map(ing => {
        const cleanIng: Ingredient = {
          id: ing.id,
          name: ing.name,
          qty: ing.qty,
          cost: getIngredientCost(ing)
        }
        if (ing.manualCostOverride !== undefined) {
          cleanIng.manualCostOverride = ing.manualCostOverride
        }
        return cleanIng
      }),
      profitMargin,
      tax,
      cardFee,
      deliveryFee
    }

    const updatedRecipes = recipes.map(r => r.id === activeRecipeId ? updatedRecipe : r)
    if (!recipes.some(r => r.id === activeRecipeId)) {
      updatedRecipes.push(updatedRecipe)
    }
    setLocalRecipes(updatedRecipes)

    if (db && user) {
      setDocumentNonBlocking(doc(db, 'restaurants', restaurantId, 'recipes', activeRecipeId), updatedRecipe)
    }

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
        const MAX_WIDTH = 600
        const MAX_HEIGHT = 600
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
      }, aiConfig?.geminiApiKey)
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
    
    doc.setFontSize(22)
    doc.setTextColor(74, 108, 93)
    doc.text(title, 14, 22)
    
    doc.setFontSize(10)
    doc.setTextColor(120)
    doc.text(`Ficha Técnica Gerada em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 14, 30)

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary">Fichas Técnicas & Precificação</h1>
          <p className="text-muted-foreground">Calcule o CMV real, fotografe seus pratos e defina preços via IA.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {recipes && recipes.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="gap-2 text-destructive hover:bg-destructive/10 border-destructive/30">
                  <Trash2 className="w-4 h-4" />
                  {t('recipes.clearDemo')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('recipes.clearDemoDialog.title')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('recipes.clearDemoDialog.description')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleClearDemoRecipes}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t('common.confirm')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <input 
            type="file" 
            accept="image/*" 
            ref={newRecipeFileInputRef} 
            className="hidden" 
            onChange={handleAddRecipeWithGallery}
          />

          <Button onClick={() => newRecipeFileInputRef.current?.click()} variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/5">
            <Upload className="w-4 h-4" /> {t('recipes.chooseFromGallery')}
          </Button>

          <Button onClick={() => createNewRecipeWithPhoto()} className="gap-2 font-bold">
            <Plus className="w-4 h-4" /> {t('recipes.newRecipe')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: List of Recipes */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="p-4 flex flex-col gap-3 space-y-0 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-primary" /> Suas Fichas
                </CardTitle>
                <Badge variant="secondary" className="text-[10px] font-bold">{filteredRecipes.length} de {recipes.length}</Badge>
              </div>

              {/* Filtro de Categorias */}
              <div className="flex flex-wrap gap-1 pt-1">
                <Button 
                  variant={selectedCategoryFilter === 'ALL' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setSelectedCategoryFilter('ALL')}
                  className="h-7 text-[11px] px-2.5 rounded-full font-bold"
                >
                  Todas ({categoryCounts.ALL})
                </Button>
                <Button 
                  variant={selectedCategoryFilter === 'Bebidas Alcoólicas' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setSelectedCategoryFilter('Bebidas Alcoólicas')}
                  className={`h-7 text-[11px] px-2.5 rounded-full font-bold gap-1 border-amber-500/30 ${selectedCategoryFilter === 'Bebidas Alcoólicas' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'text-amber-700 hover:bg-amber-50 dark:text-amber-400'}`}
                >
                  <Wine className="w-3 h-3" />
                  Alcoólicas ({categoryCounts['Bebidas Alcoólicas'] || 0})
                </Button>
                <Button 
                  variant={selectedCategoryFilter === 'Bebidas Não Alcoólicas' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setSelectedCategoryFilter('Bebidas Não Alcoólicas')}
                  className={`h-7 text-[11px] px-2.5 rounded-full font-bold gap-1 border-blue-500/30 ${selectedCategoryFilter === 'Bebidas Não Alcoólicas' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-blue-700 hover:bg-blue-50 dark:text-blue-400'}`}
                >
                  <GlassWater className="w-3 h-3" />
                  Não Alcoólicas ({categoryCounts['Bebidas Não Alcoólicas'] || 0})
                </Button>
                <Button 
                  variant={selectedCategoryFilter === 'Pratos Principais' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setSelectedCategoryFilter('Pratos Principais')}
                  className="h-7 text-[11px] px-2.5 rounded-full font-bold"
                >
                  Pratos ({categoryCounts['Pratos Principais'] || 0})
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col">
                {filteredRecipes.map(recipe => (
                  <button
                    key={recipe.id}
                    onClick={() => loadRecipe(recipe)}
                    className={`flex items-center justify-between p-3.5 text-left hover:bg-muted/50 transition-all border-b last:border-0 ${activeRecipeId === recipe.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden relative border">
                        {recipe.photoUrl ? (
                          <Image src={recipe.photoUrl} alt={recipe.name} fill className="object-cover" />
                        ) : (
                          <FileText className="w-4 h-4 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className={`text-xs font-bold truncate ${activeRecipeId === recipe.id ? 'text-primary' : 'text-foreground'}`}>
                          {recipe.name}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                          {recipe.category === 'Bebidas Alcoólicas' ? (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold border border-amber-500/20">
                              <Wine className="w-2.5 h-2.5 mr-0.5 inline" />
                              Alcoólica
                            </Badge>
                          ) : recipe.category === 'Bebidas Não Alcoólicas' ? (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-blue-500/10 text-blue-700 dark:text-blue-400 font-semibold border border-blue-500/20">
                              <GlassWater className="w-2.5 h-2.5 mr-0.5 inline" />
                              Não Alcoólica
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground font-medium truncate">
                              {recipe.category || 'Pratos Principais'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${activeRecipeId === recipe.id ? 'translate-x-1 text-primary' : 'text-muted-foreground/30'}`} />
                  </button>
                ))}
                {filteredRecipes.length === 0 && (
                  <div className="p-6 text-center text-xs text-muted-foreground space-y-3">
                    <p>Nenhuma ficha nesta categoria.</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => createNewRecipeWithPhoto(undefined, selectedCategoryFilter !== 'ALL' ? selectedCategoryFilter : 'Bebidas Alcoólicas')} 
                      className="w-full text-xs gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Criar Ficha Nesta Categoria
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-6">
          {!activeRecipeId && recipes.length === 0 ? (
            <Card className="shadow-md p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                <ChefHat className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold font-headline">Crie sua Ficha Técnica</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Cadastre novas fichas técnicas, busque a foto do prato finalizado diretamente na sua galeria e calcule custos e precificação inteligente com IA.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <Button onClick={() => newRecipeFileInputRef.current?.click()} variant="outline" className="gap-2">
                  <Upload className="w-4 h-4" /> Buscar Foto na Galeria
                </Button>
                <Button onClick={() => createNewRecipeWithPhoto()} className="gap-2 font-bold">
                  <Plus className="w-4 h-4" /> Nova Ficha Técnica
                </Button>
              </div>
            </Card>
          ) : (
            <>
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
                    <div className="flex justify-between items-center">
                      <Label className="text-xs uppercase font-black text-muted-foreground tracking-widest">
                        Apresentação do Prato
                      </Label>
                      <label className="cursor-pointer">
                        <Button variant="outline" size="sm" asChild className="gap-2 text-xs h-8 border-primary/30 text-primary hover:bg-primary/5">
                          <span>
                            <Upload className="w-3.5 h-3.5" />
                            {t('recipes.chooseFromGallery')}
                          </span>
                        </Button>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleImageUpload(e, (base64) => setEditingPhoto(base64))}
                        />
                      </label>
                    </div>

                    <div className="relative aspect-video bg-muted rounded-2xl overflow-hidden border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center group">
                      {editingPhoto ? (
                        <>
                          <Image src={editingPhoto} alt="Prato" fill className="object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <label className="cursor-pointer">
                              <Button variant="secondary" size="sm" asChild className="gap-2 pointer-events-none">
                                <span>
                                  <Upload className="w-4 h-4" /> Trocar Foto
                                </span>
                              </Button>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handleImageUpload(e, (base64) => setEditingPhoto(base64))}
                              />
                            </label>
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
                      ) : (
                        <div className="flex flex-col items-center gap-4 py-8">
                          <div className="p-4 bg-background rounded-full shadow-sm">
                            <Utensils className="w-8 h-8 text-muted-foreground/40" />
                          </div>
                          <div className="text-center px-4">
                            <p className="font-semibold text-sm mb-1 text-foreground">
                              Nenhuma foto anexada
                            </p>
                            <p className="text-xs text-muted-foreground mb-4">
                              {t('recipes.uploadPhotoDesc')}
                            </p>
                            <label className="cursor-pointer">
                              <Button variant="outline" asChild className="gap-2 border-primary/20 hover:bg-primary/5 pointer-events-none">
                                <span>
                                  <Upload className="w-4 h-4 text-primary" /> {t('recipes.chooseFromGallery')}
                                </span>
                              </Button>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handleImageUpload(e, (base64) => setEditingPhoto(base64))}
                              />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="dish-name" className="text-xs uppercase font-black text-muted-foreground tracking-widest">Nome do Prato/Item</Label>
                      <Input 
                        id="dish-name" 
                        value={editingName} 
                        onChange={(e) => setEditingName(e.target.value)} 
                        className="text-lg font-bold h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dish-category" className="text-xs uppercase font-black text-muted-foreground tracking-widest">Categoria</Label>
                      <Select value={editingCategory} onValueChange={setEditingCategory}>
                        <SelectTrigger id="dish-category" className="h-12 font-bold text-sm bg-card">
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map(cat => (
                            <SelectItem key={cat} value={cat} className="font-medium text-sm">
                              <div className="flex items-center gap-2">
                                {cat === 'Bebidas Alcoólicas' && <Wine className="w-4 h-4 text-amber-600" />}
                                {cat === 'Bebidas Não Alcoólicas' && <GlassWater className="w-4 h-4 text-blue-500" />}
                                {cat === 'Pratos Principais' && <ChefHat className="w-4 h-4 text-primary" />}
                                <span>{cat}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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
                                    title={ing.manualCostOverride ? "Custo editado manualmente. Apague para voltar ao cálculo automático." : "Custo calculated automaticamente"}
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
            </>
          )}
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
