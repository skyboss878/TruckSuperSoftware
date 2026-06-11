'use client'
import { useEffect } from 'react'

export default function ServiceWorkerManager() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        const check = () => {
          if (reg.active) reg.active.postMessage('CHECK_VERSION')
        }
        check()
        setInterval(check, 2 * 60 * 1000)
      })
    navigator.serviceWorker.addEventListener('message', e => {
      if (e.data === 'RELOAD') window.location.reload()
    })
  }, [])
  return null
}
