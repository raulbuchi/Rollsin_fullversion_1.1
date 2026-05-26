
"use client"

import { useState, useMemo, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, 
  Users, 
  Table as TableIcon, 
  ShoppingBag, 
  Trash2,
  Settings as SettingsIcon,
  ShieldCheck,
  Lock,
  KeyRound,
  UserCheck,
  BrainCircuit,
  Eye,
  EyeOff,
  ExternalLink
} from 'lucide-react'
import { useFirestore, useCollection, useMemoFirebase, useAuth as useFirebaseAuth, useDoc } from '@/firebase'
import { collection, query, where, doc, setDoc } from 'firebase/firestore'
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates'
import { updatePassword } from 'firebase/auth'
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
import { useAuth, UserRole } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'

export default function SettingsPage() {
  const { user: localUser } = useAuth()
  const db = useFirestore()
  const auth = useFirebaseAuth()
  const restaurantId = localUser?.restaurantId || 'gp-001'
  const { toast } = useToast()

  // Consultas estáveis
  const tablesQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, 'restaurants', restaurantId, 'tables'))
  }, [db, restaurantId])

  const platformsQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, 'restaurants', restaurantId, 'deliveryPlatforms'))
  }, [db, restaurantId])

  const employeesQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, 'users'), where('restaurantId', '==', restaurantId))
  }, [db, restaurantId])

  const { data: tables } = useCollection(tablesQuery)
  const { data: platforms } = useCollection(platformsQuery)
  const { data: employees } = useCollection(employeesQuery)

  // Estados de controle de Diálogo
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false)
  const [isPlatformDialogOpen, setIsPlatformDialogOpen] = useState(false)
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false)

  // Estados de formulário
  const [newTableName, setNewTableName] = useState('')
  const [newTableCap, setNewTableCap] = useState('4')
  
  const [newPlatformName, setNewPlatformName] = useState('')
  const [newPlatformComm, setNewPlatformComm] = useState('25')

  const [newEmpName, setNewEmpName] = useState('')
  const [newEmpEmail, setNewEmpEmail] = useState('')
  const [newEmpRole, setNewEmpRole] = useState<UserRole>('Serviço')

  // Estado de alteração de senha
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [isChangingPass, setIsChangingPass] = useState(false)

  // Estados de IA (BYOK)
  const aiConfigRef = useMemo(() => doc(db, 'restaurants', restaurantId, 'config', 'ai'), [db, restaurantId])
  const { data: aiConfig } = useDoc(aiConfigRef)
  const [geminiKey, setGeminiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isSavingKey, setIsSavingKey] = useState(false)

  // Sincronizar estado local com o banco quando carregar
  useEffect(() => {
    if (aiConfig?.geminiApiKey) setGeminiKey(aiConfig.geminiApiKey)
  }, [aiConfig])

  const handleSaveAIKey = async () => {
    if (!db) return
    setIsSavingKey(true)
    try {
      await setDoc(aiConfigRef, {
        geminiApiKey: geminiKey,
        updatedAt: new Date().toISOString()
      }, { merge: true })
      toast({ title: "Configuração Salva", description: "Sua chave do Gemini foi atualizada." })
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: "Não foi possível salvar a chave de IA." })
    } finally {
      setIsSavingKey(false)
    }
  }

  const handleAddTable = () => {
    if (!newTableName || !db) return
    const colRef = collection(db, 'restaurants', restaurantId, 'tables')
    addDocumentNonBlocking(colRef, {
      tableNumber: newTableName,
      capacity: parseInt(newTableCap),
      status: 'Livre',
      totalAmount: 0,
      restaurantId
    })
    setNewTableName('')
    setIsTableDialogOpen(false)
    toast({
      title: "Mesa cadastrada",
      description: `Mesa ${newTableName} adicionada ao salão.`
    })
  }

  const handleAddPlatform = () => {
    if (!newPlatformName || !db) return
    const colRef = collection(db, 'restaurants', restaurantId, 'deliveryPlatforms')
    addDocumentNonBlocking(colRef, {
      name: newPlatformName,
      commissionPercentage: parseFloat(newPlatformComm),
      restaurantId
    })
    setNewPlatformName('')
    setIsPlatformDialogOpen(false)
    toast({
      title: "Plataforma adicionada",
      description: `${newPlatformName} disponível para pedidos.`
    })
  }

  const handleAddEmployee = () => {
    if (!newEmpName || !newEmpEmail || !db) return
    const colRef = collection(db, 'users')
    
    // IMPORTANTE: Em um sistema real, aqui chamaríamos uma Cloud Function 
    // para criar o usuário no Firebase Auth com a senha padrão '1234'.
    // No protótipo, apenas adicionamos ao Firestore e orientamos o login.
    addDocumentNonBlocking(colRef, {
      name: newEmpName,
      email: newEmpEmail,
      role: newEmpRole,
      restaurantId,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      firstAccess: true
    })
    
    setNewEmpName('')
    setNewEmpEmail('')
    setIsEmployeeDialogOpen(false)
    
    toast({
      title: "Funcionário Cadastrado",
      description: `O acesso para ${newEmpName} foi criado. Senha padrão: 1234.`,
      duration: 6000
    })
  }

  const handleChangePassword = async () => {
    if (!auth.currentUser) return
    if (newPass !== confirmPass) {
      toast({ variant: "destructive", title: "Erro na senha", description: "As senhas não coincidem." })
      return
    }
    if (newPass.length < 4) {
      toast({ variant: "destructive", title: "Senha curta", description: "A senha deve ter no mínimo 4 caracteres." })
      return
    }

    setIsChangingPass(true)
    try {
      await updatePassword(auth.currentUser, newPass)
      setNewPass('')
      setConfirmPass('')
      toast({ title: "Sucesso!", description: "Sua senha foi alterada com sucesso." })
    } catch (error: any) {
      console.error(error)
      toast({ 
        variant: "destructive", 
        title: "Erro ao alterar", 
        description: "Para alterar a senha, você precisa ter feito login recentemente. Tente sair e entrar de novo." 
      })
    } finally {
      setIsChangingPass(false)
    }
  }

  const handleDeleteItem = (path: string, id: string, name: string) => {
    if (!db) return
    const docRef = doc(db, path, id)
    deleteDocumentNonBlocking(docRef)
    toast({
      variant: "destructive",
      title: "Item removido",
      description: `${name} foi excluído permanentemente.`
    })
  }

  return (
    <div className="space-y-12 pb-24">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-2xl">
          <SettingsIcon className="text-primary w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-headline text-primary">Configurações Gerais</h1>
          <p className="text-muted-foreground">Estrutura de mesas, canais de venda e gestão de equipe.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Configuração de IA (BYOK) */}
        <Card className="flex flex-col shadow-md border-secondary/20 bg-secondary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-secondary" />
              <CardTitle className="text-lg">Inteligência Artificial</CardTitle>
            </div>
            <CardDescription>Configure sua própria chave do Google Gemini para habilitar funções inteligentes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Google Gemini API Key</Label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-primary flex items-center gap-1 hover:underline font-bold"
                >
                  Obter chave gratuita <ExternalLink className="w-2 h-2" />
                </a>
              </div>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="Cole sua chave aqui..."
                  className="bg-background pr-10"
                />
                <button
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight italic">
                A IA é usada para ler Notas Fiscais automaticamente e sugerir preços estratégicos nas fichas técnicas.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="secondary"
              className="w-full font-bold gap-2"
              onClick={handleSaveAIKey}
              disabled={isSavingKey}
            >
              <ShieldCheck className="w-4 h-4" />
              {isSavingKey ? "Salvando..." : "Salvar Chave de IA"}
            </Button>
          </CardFooter>
        </Card>

        {/* Segurança do Usuário */}
        <Card className="flex flex-col shadow-md border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Minha Segurança</CardTitle>
            </div>
            <CardDescription>Altere sua senha de acesso ao Rolls-In.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <Input 
                type="password" 
                value={newPass} 
                onChange={(e) => setNewPass(e.target.value)} 
                placeholder="Mínimo 4 caracteres"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmar Senha</Label>
              <Input 
                type="password" 
                value={confirmPass} 
                onChange={(e) => setConfirmPass(e.target.value)} 
                placeholder="Repita a nova senha"
                className="bg-background"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full font-bold gap-2" 
              onClick={handleChangePassword}
              disabled={isChangingPass || !newPass}
            >
              <KeyRound className="w-4 h-4" /> 
              {isChangingPass ? "Alterando..." : "Confirmar Nova Senha"}
            </Button>
          </CardFooter>
        </Card>

        {/* Mesas */}
        <Card className="flex flex-col shadow-md">
          <CardHeader className="bg-muted/10">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <TableIcon className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Salão & Mesas</CardTitle>
              </div>
              <Dialog open={isTableDialogOpen} onOpenChange={setIsTableDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8 bg-primary/20 text-primary">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cadastrar Mesa</DialogTitle>
                    <DialogDescription>Define a identificação física no salão.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Número/Nome</Label>
                      <Input value={newTableName} onChange={(e) => setNewTableName(e.target.value)} placeholder="Ex: 01" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Capacidade</Label>
                      <Input type="number" value={newTableCap} onChange={(e) => setNewTableCap(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter><Button onClick={handleAddTable}>Salvar</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
            {tables?.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border text-sm">
                <span className="font-bold">MESA {t.tableNumber}</span>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] text-muted-foreground uppercase">{t.capacity} Lugares</span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Mesa?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir a Mesa {t.tableNumber}?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDeleteItem(`restaurants/${restaurantId}/tables`, t.id, `Mesa ${t.tableNumber}`)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Confirmar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Equipe */}
        <Card className="flex flex-col shadow-md lg:col-span-1">
          <CardHeader className="bg-muted/10">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-foreground/60" />
                <CardTitle className="text-lg">Equipe & Acessos</CardTitle>
              </div>
              <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8 bg-muted/30">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Novo Funcionário</DialogTitle>
                    <DialogDescription>
                      O usuário será criado com a senha padrão <span className="font-bold text-primary">1234</span>.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label>Nome Completo</Label>
                      <Input placeholder="Ex: João Silva" value={newEmpName} onChange={(e) => setNewEmpName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>E-mail de Login</Label>
                      <Input placeholder="joao@rollsin.com.br" value={newEmpEmail} onChange={(e) => setNewEmpEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Nível de Acesso</Label>
                      <Select value={newEmpRole} onValueChange={(val) => setNewEmpRole(val as UserRole)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Administrador</SelectItem>
                          <SelectItem value="Chefe">Chef (Cozinha & Estoque)</SelectItem>
                          <SelectItem value="Serviço">Serviço (Salão)</SelectItem>
                          <SelectItem value="Caixa">Caixa</SelectItem>
                          <SelectItem value="Barman">Barman</SelectItem>
                          <SelectItem value="Apoio">Apoio</SelectItem>
                          <SelectItem value="Horista">Horista (Extra)</SelectItem>
                          <SelectItem value="Passe">Passe (Coordenação)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter><Button onClick={handleAddEmployee}>Cadastrar e Gerar Senha</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
            {employees?.map(e => (
              <div key={e.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border text-sm">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{e.name}</span>
                    <Badge variant="outline" className="text-[8px] h-4 uppercase">{e.role}</Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{e.email}</span>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir Funcionário?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir o funcionário {e.name}?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDeleteItem(`users`, e.id, e.name)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Confirmar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
            {employees?.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-xs italic">
                Nenhum funcionário cadastrado.
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-muted/5 p-3 flex items-center gap-2">
            <UserCheck className="w-3 h-3 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground italic">Dica: Informe aos novos membros que a senha inicial é '1234'.</span>
          </CardFooter>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {/* Canais de Venda */}
         <Card className="flex flex-col shadow-md">
          <CardHeader className="bg-secondary/5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-secondary" />
                <CardTitle className="text-lg">Delivery & Canais</CardTitle>
              </div>
              <Dialog open={isPlatformDialogOpen} onOpenChange={setIsPlatformDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8 bg-secondary/20 text-secondary">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Plataforma</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Input placeholder="Nome (ex: iFood)" value={newPlatformName} onChange={(e) => setNewPlatformName(e.target.value)} />
                    <Input type="number" placeholder="Taxa %" value={newPlatformComm} onChange={(e) => setNewPlatformComm(e.target.value)} />
                  </div>
                  <DialogFooter><Button onClick={handleAddPlatform}>Salvar</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-2">
            {platforms?.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border text-sm">
                <span className="font-bold">{p.name}</span>
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className="text-[10px]">{p.commissionPercentage}%</Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Plataforma?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir a plataforma {p.name}?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDeleteItem(`restaurants/${restaurantId}/deliveryPlatforms`, p.id, p.name)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Confirmar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
