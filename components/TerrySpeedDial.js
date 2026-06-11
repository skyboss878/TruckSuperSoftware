'use client'
import { useState, useEffect } from 'react'

export default function TerrySpeedDial() {
  const [phone, setPhone] = useState(null)
  const [name, setName] = useState('Terry')

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d?.dispatch_phone) setPhone(d.dispatch_phone)
      if (d?.dispatch_name) setName(d.dispatch_name)
    }).catch(() => {})
  }, [])

  if (!phone) return null

  return (
    <a href={`tel:${phone}`}
      style={{
        position: 'fixed', bottom: '80px', right: '16px', zIndex: 50,
        width: '56px', height: '56px', borderRadius: '50%',
        background: 'linear-gradient(135deg, #2D7A5F, #1a5c44)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '24px', boxShadow: '0 4px 20px rgba(45,122,95,0.5)',
        textDecoration: 'none',
        animation: 'pulse-btn 2s ease-in-out infinite',
      }}>
      📞
      <style>{`@keyframes pulse-btn{0%,100%{box-shadow:0 4px 20px rgba(45,122,95,0.5)}50%{box-shadow:0 4px 30px rgba(45,122,95,0.8)}}`}</style>
    </a>
  )
}
