'use client'
import './globals.css'
import PWAManager from '@/components/PWAManager'
import { LanguageProvider } from '@/lib/LanguageContext'
import { useEffect, useState } from 'react'

function DynamicHtml({ children }) {
  const [lang, setLang] = useState('en')

  useEffect(() => {
    const saved = localStorage.getItem('lang') || 'en'
    setLang(saved)
    document.documentElement.lang = saved

    // Watch for language changes
    const interval = setInterval(() => {
      const current = localStorage.getItem('lang') || 'en'
      if (current !== lang) {
        setLang(current)
        document.documentElement.lang = current
      }
    }, 500)
    return () => clearInterval(interval)
  }, [lang])

  return children
}

import ErrorBoundary from '@/components/ErrorBoundary'
'use client'
import { useEffect } from 'react'

function ServiceWorkerManager() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          // Check for new version every 2 minutes
          const check = () => {
            if (reg.active) reg.active.postMessage('CHECK_VERSION')
          }
          check()
          setInterval(check, 2 * 60 * 1000)
        })
      // Listen for reload signal from SW
      navigator.serviceWorker.addEventListener('message', e => {
        if (e.data === 'RELOAD') window.location.reload()
      })
    }
  }, [])
  return null
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <LanguageProvider>
        <PWAManager />
          <DynamicHtml>
            <ServiceWorkerManager />
        <ErrorBoundary>{children}</ErrorBoundary>
          </DynamicHtml>
        </LanguageProvider>
      </body>
    </html>
  )
}
