'use client';

import { useEffect } from 'react';
import '@/i18n/config';

export function I18nInitializer() {
  useEffect(() => {
    // This component purely exists to ensure i18n is initialized on the client side
  }, []);

  return null;
}
