'use client'
import { useLang } from '@/lib/LanguageContext'
import { supabase } from '@/lib/supabase'

export default function LanguageSwitcher({ driverId }) {
  const { lang, setLang } = useLang()

  async function switchLang(newLang) {
    setLang(newLang)
    document.documentElement.lang = newLang
    if (driverId) {
      await supabase.from('drivers').update({ language: newLang }).eq('id', driverId)
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <span className="text-gray-400 text-sm">🌐</span>
      <button
        onClick={() => switchLang('en')}
        className={`text-sm font-medium px-2 py-1 rounded-lg transition-colors ${
          lang === 'en' ? 'bg-[#2D7A5F] text-white' : 'text-gray-400'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => switchLang('es')}
        className={`text-sm font-medium px-2 py-1 rounded-lg transition-colors ${
          lang === 'es' ? 'bg-[#2D7A5F] text-white' : 'text-gray-400'
        }`}
      >
        ES
      </button>
    </div>
  )
}
