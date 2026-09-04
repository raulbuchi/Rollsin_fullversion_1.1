"use client"

import React, { useState } from 'react'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { Download, Smartphone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall()
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <Button
        onClick={install}
        size="sm"
        className={`bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm gap-1.5 transition ${className}`}
      >
        <Download className="w-4 h-4" />
        <span>Instalar App</span>
      </Button>
    )
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <Button
          onClick={() => setShowIOSGuide(true)}
          variant="outline"
          size="sm"
          className={`border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 font-semibold gap-1.5 ${className}`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Instalar no iOS</span>
        </Button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-xl bg-card border p-6 shadow-2xl relative space-y-4">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <Smartphone className="w-6 h-6 text-emerald-600" />
                <h3 className="text-base font-bold">Instalar Rolls-In no iPhone / iPad</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                1. Toque no botão de <strong>Compartilhar</strong> na barra do Safari.<br />
                2. Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.<br />
                3. Confirme em <strong>Adicionar</strong> no canto superior direito.
              </p>
              <Button
                onClick={() => setShowIOSGuide(false)}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs"
              >
                Entendi
              </Button>
            </div>
          </div>
        )}
      </>
    )
  }

  return null
}
