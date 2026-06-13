'use client'
import { useEffect } from 'react'

export default function ServiceWorkerManager() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    // Nuclear option: unregister ALL service workers and clear ALL caches
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => reg.unregister())
    })

    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name))
      })
    }
  }, [])
  return null
}
