
"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { useAuth, UserRole } from '@/lib/store'
import { PlaceHolderImages } from '@/lib/placeholder-images'
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase'
import { signInWithEmailAndPassword, signInAnonymously } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { Sparkles } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const auth = useFirebaseAuth()
  const db = useFirestore()
  const { toast } = useToast()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    
    setIsLoggingIn(true)
    const cleanEmail = email.trim().toLowerCase()
    const cleanPass = password.trim()
    
    try {
      // Real Login via Firebase Auth
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass)
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        login(userData.role as UserRole, firebaseUser.uid, userData.restaurantId || 'gp-001', firebaseUser.email || '')
        router.push('/dashboard')
      } else {
        // Fallback profile for authenticated users without firestore record
        const fallbackData = {
          id: firebaseUser.uid,
          name: firebaseUser.email?.split('@')[0] || 'Usuário',
          email: firebaseUser.email,
          role: 'Admin',
          restaurantId: 'gp-001'
        }
        await setDoc(doc(db, 'users', firebaseUser.uid), fallbackData)
        login('Admin', firebaseUser.uid, 'gp-001', firebaseUser.email || '')
        router.push('/dashboard')
      }

    } catch (error: any) {
      console.error("Login Error:", error)
      let message = "E-mail ou senha inválidos."
      
      if (error.code === 'auth/invalid-credential') {
        message = "Credenciais inválidas. Verifique os dados inseridos."
      } else if (error.code === 'auth/user-not-found') {
        message = "Usuário não encontrado."
      } else if (error.code === 'auth/wrong-password') {
        message = "Senha incorreta."
      } else if (error.code === 'auth/too-many-requests') {
        message = "Muitas tentativas. Tente novamente mais tarde."
      }
      
      toast({
        variant: "destructive",
        title: "Erro de Autenticação",
        description: message
      })
    } finally {
      setIsLoggingIn(false)
    }
  }

  const logoImg = PlaceHolderImages.find(img => img.id === 'gp-logo')

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-2xl border-primary/20 bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto w-48 h-48 relative mb-4">
            <Image
              src="/logo.png"
              alt="Rolls-In Logo"
              fill
              className="object-contain drop-shadow-xl"
              priority
              data-ai-hint="company logo"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-primary font-headline uppercase tracking-tighter">ROLLS-IN</CardTitle>
          <CardDescription className="text-muted-foreground uppercase tracking-widest text-[10px] font-bold">Excelência em Gestão</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail de Acesso</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="exemplo@rollsin.com.br" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Senha</Label>
              </div>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 text-lg font-bold bg-primary hover:bg-primary/90 text-white transition-all shadow-lg shadow-primary/20"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? "Autenticando..." : "Entrar no Sistema"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 text-center border-t pt-6 mt-2">
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Primeiro Acesso?</p>
            <p className="text-xs text-muted-foreground italic">
              Use o e-mail cadastrado e a senha padrão <span className="font-bold text-primary">1234</span>.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Esqueceu sua senha? <Link href="#" className="text-primary font-bold hover:underline">Recuperar Acesso</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
