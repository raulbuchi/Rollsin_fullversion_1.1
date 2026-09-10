'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LayoutDashboard, Users, Calculator, UtensilsCrossed } from 'lucide-react'
import { PlaceHolderImages } from '@/lib/placeholder-images'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

export default function LandingPage() {
  const { t } = useTranslation()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  const logoImg = PlaceHolderImages.find(img => img.id === 'gp-logo')

  if (!mounted) return null

  return (
    <div className="min-h-screen flex flex-col">
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>
      
      {/* Hero Section */}
      <header className="relative h-[600px] flex items-center justify-center overflow-hidden bg-muted/20">
        <Image
          src="https://picsum.photos/seed/restaurant-hero/1920/1080"
          alt="Restaurant Background"
          fill
          className="object-cover opacity-10"
          priority
          data-ai-hint="restaurant kitchen"
        />
        <div className="container relative z-10 text-center px-4">
          <div className="mx-auto w-32 h-32 relative mb-6">
            <Image
              src={logoImg?.imageUrl || 'https://picsum.photos/seed/rollsin-logo/400/400'}
              alt="Rolls-In Logo"
              fill
              className="object-contain"
              data-ai-hint="company logo"
            />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-primary mb-4 font-headline tracking-tight">
            {t('landing.title')}
          </h1>
          <p className="text-2xl text-secondary font-bold mb-8 tracking-widest uppercase">
            {t('landing.subtitle')}
          </p>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            {t('landing.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 py-6 font-bold" asChild>
              <Link href="/login">{t('landing.buttons.login')}</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 font-bold" asChild>
              <Link href="/register">{t('landing.buttons.register')}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section className="py-20 bg-background">
        <div className="container px-4 mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Calculator className="w-10 h-10 text-primary" />}
              title={t('landing.features.financial.title')}
              description={t('landing.features.financial.description')}
            />
            <FeatureCard
              icon={<LayoutDashboard className="w-10 h-10 text-primary" />}
              title={t('landing.features.dashboard.title')}
              description={t('landing.features.dashboard.description')}
            />
            <FeatureCard
              icon={<UtensilsCrossed className="w-10 h-10 text-primary" />}
              title={t('landing.features.inventory.title')}
              description={t('landing.features.inventory.description')}
            />
            <FeatureCard
              icon={<Users className="w-10 h-10 text-primary" />}
              title={t('landing.features.team.title')}
              description={t('landing.features.team.description')}
            />
          </div>
        </div>
      </section>

      <footer className="py-10 border-t mt-auto text-center text-muted-foreground text-sm bg-card">
        <div className="container mx-auto px-4">
          <p className="mb-2 font-bold text-primary">{t('landing.title')}</p>
          <p className="mb-4 text-[10px] tracking-widest uppercase">{t('landing.subtitle')}</p>
          <p>&copy; {new Date().getFullYear()} {t('landing.title')}. {t('landing.footer.rights')}</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="hover:shadow-lg transition-shadow border-none bg-muted/30">
      <CardContent className="pt-6 text-center">
        <div className="mb-4 flex justify-center">{icon}</div>
        <h3 className="text-xl font-bold mb-2 font-headline">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  )
}
