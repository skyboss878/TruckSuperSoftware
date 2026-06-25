'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export function useDriverSessionGuard() {
  const router = useRouter()
  const checking = useRef(false)

  useEffect(() => {
    async function checkSession() {
      if (checking.current) return
      checking.current = true
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error || !session) {
          sessionStorage.setItem('redirect_after_login', window.location.pathname)
          router.replace('/login')
          return
        }
        // Refresh if expiring within 10 minutes
        const expiresAt = session.expires_at * 1000
        const tenMin = 10 * 60 * 1000
        if (expiresAt - Date.now() < tenMin) {
          await supabase.auth.refreshSession()
        }
      } catch {}
      checking.current = false
    }

    checkSession()
    const interval = setInterval(checkSession, 4 * 60 * 1000) // every 4 min
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') checkSession()
    })

    return () => { clearInterval(interval); subscription?.unsubscribe() }
  }, [])
}

export function useAdminSessionGuard() {
  const router = useRouter()

  useEffect(() => {
    async function checkAdminSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error || !session) {
          sessionStorage.setItem('redirect_after_login', window.location.pathname)
          router.replace('/login')
          return
        }
        const expiresAt = session.expires_at * 1000
        const tenMin = 10 * 60 * 1000
        if (expiresAt - Date.now() < tenMin) {
          await supabase.auth.refreshSession()
        }
      } catch {}
    }

    checkAdminSession()
    const interval = setInterval(checkAdminSession, 4 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])
}
