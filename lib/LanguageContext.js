'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { useTranslations } from './translations'

const LanguageContext = createContext({ lang: 'en', setLang: () => {}, tr: {} })

export function LanguageProvider({ children, initialLang = 'en' }) {
  const [lang, setLangState] = useState(initialLang)

  function setLang(newLang) {
    setLangState(newLang)
    localStorage.setItem('lang', newLang)
  }

  useEffect(() => {
    const saved = localStorage.getItem('lang')
    if (saved) setLangState(saved)
  }, [])

  const tr = useTranslations(lang)

  return (
    <LanguageContext.Provider value={{ lang, setLang, tr }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  return useContext(LanguageContext)
}
