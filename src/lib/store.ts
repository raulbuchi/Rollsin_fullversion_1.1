
"use client"

import { useState, useEffect } from 'react'

export type UserRole = 'Admin' | 'Chefe' | 'Apoio' | 'Serviço' | 'Caixa' | 'Barman' | 'Horista' | 'Passe'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  restaurantId: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('rms_user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const login = (role: UserRole, firebaseUid: string, email: string = 'user@rollsin.com.br') => {
    const newUser: User = {
      id: firebaseUid,
      name: email.split('@')[0],
      email: email,
      role: role,
      restaurantId: 'gp-001'
    }
    setUser(newUser)
    localStorage.setItem('rms_user', JSON.stringify(newUser))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('rms_user')
  }

  return { user, isLoading, login, logout }
}
