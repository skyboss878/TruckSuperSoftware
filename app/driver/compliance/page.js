'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const RECORD_TYPES = [
  { key: 'cdl',               label: 'CDL License',       icon: '🪪' },
  { key: 'medical',           label: 'Medical Cert',       icon: '🏥' },
  { key: 'drug_test',         label: 'Drug Test',          icon: '🧪' },
  { key: 'annual_inspection', label: 'Annual Inspection',  icon: '🔍' },
  { key: 'mvr',               label: 'MVR Check',          icon: '📋' },
  { key: 'hazmat',            label: 'HazMat Cert',        icon: '☢️' },
]

export default function DriverCompliance() {
  const router  = useRouter()
  const [driver,  setDriver]  = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDriver() }, [])

  async function loadDriver() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }
    const { data } = await supabase
      .from('drivers').select('*').eq('auth_id', user.id).single()
    if (!data || data.status === 'inactive') { router.replace('/login'); return }
    setDriver(data)
    const { data: recs } = await supabase
      .from('dot_compliance').select('*')
      .eq('driver_id', data.id).order('expiry_date', { ascending: true })
    setRecords(recs || [])
    setLoading(false)
  }

  function daysUntil(expiry_date) {
    if (!expiry_date) return null
    return Math.floor((new Date(expiry_date) - new Date()) / 86400000)
  }

  function expiryStyle(days, status) {
    if (status === 'failed')  return { badge: 'bg-red-100 text-red-700',      label: 'Failed',        bar: 'bg-red-400'    }
    if (status === 'pending') return { badge: 'bg-yellow-100 text-yellow-700', label: 'Pending',       bar: 'bg-yellow-400' }
    if (days === null)        return { badge: 'bg-gray-100 text-gray-400',     label: 'No expiry',     bar: 'bg-gray-300'   }
    if (days < 0)             return { badge: 'bg-red-100 text-red-700',       label: 'Expired',       bar: 'bg-red-400'    }
    if (days <= 30)           return { badge: 'bg-orange-100 text-orange-700', label: `${days}d left`, bar: 'bg-orange-400' }
    if (days <= 90)           return { badge: 'bg-yellow-100 text-yellow-700', label: `${days}d left`, bar: 'bg-yellow-400' }
    return                           { badge: 'bg-green-100 text-green-700',   label: 'Valid',         bar: 'bg-green-400'  }
  }

  const urgentCount = records.filter(r => { const d = daysUntil(r.expiry_date); return (d !== null && d < 0) || r.status === 'failed' }).length
  const soonCount   = records.filter(r => { const d = daysUntil(r.expiry_date); return d !== null && d >= 0 && d <= 30 }).length
  const allClear    = records.length > 0 && urgentCount === 0 && soonCount === 0

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800">DOT Compliance</h1>
        <div className="w-10" />
      </div>

      {urgentCount > 0 && (
        <div className="bg-red-50 px-4 py-3 flex items-center gap-2">
          <span>🚨</span>
          <p className="text-sm font-medium text-red-700">{urgentCount} record{urgentCount > 1 ? 's' : ''} expired or failed — contact your admin immediately</p>
        </div>
      )}
      {urgentCount === 0 && soonCount > 0 && (
        <div className="bg-orange-50 px-4 py-3 flex items-center gap-2">
          <span>⚠️</span>
          <p className="text-sm font-medium text-orange-700">{soonCount} record{soonCount > 1 ? 's' : ''} expiring within 30 days — contact your admin</p>
        </div>
      )}
      {allClear && (
        <div className="bg-green-50 px-4 py-3 flex items-center gap-2">
          <span>✅</span>
          <p className="text-sm font-medium text-green-700">All compliance records are up to date</p>
        </div>
      )}

      <div className="p-4 pb-10 space-y-3">
        {records.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-medium">No compliance records yet</p>
            <p className="text-sm mt-1">Your admin will add your records here</p>
          </div>
        ) : (
          records.map(r => {
            const days  = daysUntil(r.expiry_date)
            const style = expiryStyle(days, r.status)
            const type  = RECORD_TYPES.find(t => t.key === r.record_type)
            return (
              <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-gray-800">{type?.icon} {type?.label}</p>
                    {r.expiry_date && (
                      <p className="text-xs text-gray-400 mt-0.5">Expires {new Date(r.expiry_date).toLocaleDateString()}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${style.badge}`}>{style.label}</span>
                </div>
                {r.expiry_date && days !== null && days >= 0 && (
                  <div className="mt-3">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${Math.min(100, Math.max(2, (days / 365) * 100))}%` }} />
                    </div>
                  </div>
                )}
                <div className="mt-2 space-y-1">
                  {r.issue_date && <p className="text-sm text-gray-400">📅 Issued: {new Date(r.issue_date).toLocaleDateString()}</p>}
                  {r.result     && <p className="text-sm text-gray-400">🧪 Result: <span className="capitalize">{r.result}</span></p>}
                  {r.notes      && <p className="text-sm text-gray-400">📝 {r.notes}</p>}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
