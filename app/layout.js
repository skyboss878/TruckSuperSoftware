'use client'
import './globals.css'
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

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <LanguageProvider>
          <DynamicHtml>
            {children}
          </DynamicHtml>
        </LanguageProvider>
      </body>
    </html>
  )
}
