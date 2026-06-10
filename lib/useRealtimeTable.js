'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useRealtimeTable(table, initialData = []) {
  const [data, setData] = useState(initialData)

  useEffect(() => {
    setData(initialData)
  }, [initialData.length])

  useEffect(() => {
    const channel = supabase
      .channel(`rt-${table}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, payload => {
        setData(prev => {
          if (payload.eventType === 'INSERT') return [payload.new, ...prev].slice(0, 100)
          if (payload.eventType === 'UPDATE') return prev.map(r => r.id === payload.new.id ? payload.new : r)
          if (payload.eventType === 'DELETE') return prev.filter(r => r.id !== payload.old.id)
          return prev
        })
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [table])

  return [data, setData]
}
