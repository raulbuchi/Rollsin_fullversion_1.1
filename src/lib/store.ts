
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

  const login = (role: UserRole, firebaseUid: string, restaurantIdOrEmail: string = 'gp-001', emailParam?: string) => {
    let restaurantId = 'gp-001'
    let email = 'user@rollsin.com.br'

    if (restaurantIdOrEmail.includes('@')) {
      email = restaurantIdOrEmail
    } else {
      restaurantId = restaurantIdOrEmail || 'gp-001'
      if (emailParam) {
        email = emailParam
      }
    }

    const newUser: User = {
      id: firebaseUid,
      name: email.split('@')[0] || 'Usuário',
      email: email,
      role: role,
      restaurantId: restaurantId
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
