'use client'
import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
const WARNING_MS = 5 * 60 * 1000  // warn at 5 minutes remaining

export function useSessionTimeout({ onLogout, onWarning } = {}) {
  const router = useRouter()
  const timerRef = useRef(null)
  const warningRef = useRef(null)

  const logout = useCallback(async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' })
    } catch {}
    onLogout?.()
    router.push('/login?reason=timeout')
  }, [router, onLogout])

  const resetTimer = useCallback(() => {
    clearTimeout(timerRef.current)
    clearTimeout(warningRef.current)

    // Warning at 25 minutes
    warningRef.current = setTimeout(() => {
      onWarning?.()
    }, TIMEOUT_MS - WARNING_MS)

    // Auto-logout at 30 minutes
    timerRef.current = setTimeout(logout, TIMEOUT_MS)
  }, [logout, onWarning])

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer() // start timer on mount

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      clearTimeout(timerRef.current)
      clearTimeout(warningRef.current)
    }
  }, [resetTimer])
}
