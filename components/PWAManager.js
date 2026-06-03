'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function PWAManager() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('SW registered')
          // Subscribe to push after SW is ready
          subscribeToPush(reg)
        })
        .catch(err => console.error('SW failed:', err))
    }
  }, [])

  async function subscribeToPush(reg) {
    try {
      // Only subscribe if user is a logged-in driver
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('auth_id', user.id)
        .single()
      if (!driver) return

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      const existing = await reg.pushManager.getSubscription()
      const sub = existing || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })

      // Save subscription to server
      await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: driver.id, subscription: sub }),
      })
    } catch (err) {
      console.error('Push subscribe error:', err)
    }
  }

  return null
}
