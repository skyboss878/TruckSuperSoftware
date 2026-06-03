'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminTicketDetail() {
  const router = useRouter()
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [driver, setDriver] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showActions, setShowActions] = useState(false)

  useEffect(() => { loadTicket() }, [])

  async function loadTicket() {
    const res = await fetch(`/api/tickets/${id}`)
    const data = await res.json()
    setTicket(data?.id ? data : null)
    setDriver(data?.drivers)
    setLoading(false)
  }

  async function updateStatus(status) {
    setUpdating(true)
    await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await loadTicket()
    setShowActions(false)
    setUpdating(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  )

  if (!ticket) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Ticket not found</p>
    </div>
  )

  const statusColor = {
    started: 'bg-yellow-100 text-yellow-700',
    submitted: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800 truncate mx-4">{ticket.customer_name}</h1>
        <button onClick={() => setShowActions(true)} className="text-gray-400 text-xl">⋯</button>
      </div>

      <div className="p-4 space-y-4 pb-10">
        {/* Status */}
        <div className="flex justify-between items-center">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${statusColor[ticket.status]}`}>
            {ticket.status}
          </span>
          <div className="flex items-center gap-2">
            {ticket.signature_data && (
              <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-1 rounded-full">✅ POD</span>
            )}
            <span className="text-xs text-gray-400">
              {new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        {ticket.signature_data && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <p className="text-sm font-bold text-green-800 mb-1">✅ Proof of Delivery</p>
            <p className="text-xs text-green-600 mb-3">
              Signed by: <span className="font-semibold">{ticket.signature_name}</span>
              {ticket.delivered_at && ` · ${new Date(ticket.delivered_at).toLocaleString('en-US', {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'})}`}
            </p>
            <img src={ticket.signature_data} alt="Customer signature"
              className="w-full rounded-xl bg-white border border-green-200 p-2"
              style={{maxHeight:'130px', objectFit:'contain'}} />
          </div>
        )}

        {/* Driver info */}
        {driver && (
          <div className="bg-[#E8F5F0] rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#2D7A5F] flex items-center justify-center text-white font-bold">
              {driver.name?.[0]}
            </div>
            <div>
              <p className="font-bold text-gray-800">{driver.name}</p>
              <p className="text-sm text-gray-500">{driver.email}</p>
            </div>
          </div>
        )}

        {/* Load info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-4">Load Information</h2>
          {[
            ['Customer', ticket.customer_name],
            ['Load ID', ticket.load_id],
            ['BOL Number', ticket.bol_number],
            ['Date', ticket.date ? new Date(ticket.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'],
            ['Truck Number', ticket.truck_number],
            ['Trailer Number', ticket.trailer_number],
            ['Location Loaded', ticket.location_loaded],
            ['PO Number', ticket.po_number],
            ['Sand Type', ticket.sand_type],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
              <span className="text-gray-400 text-sm">{label}</span>
              <span className="text-gray-800 text-sm font-medium text-right max-w-[55%]">{value || '—'}</span>
            </div>
          ))}
        </div>

        {/* Loading details */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-4">Loading Details</h2>
          {[
            ['Arrival Time', ticket.arrival_time ? new Date(ticket.arrival_time).toLocaleString() : '—'],
            ['Departed Time', ticket.departed_time ? new Date(ticket.departed_time).toLocaleString() : '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-2.5 border-b border-gray-50">
              <span className="text-gray-400 text-sm">{label}</span>
              <span className="text-gray-800 text-sm font-medium">{value}</span>
            </div>
          ))}
          {ticket.boxes?.map((box, i) => (
            <div key={i}>
              <div className="flex justify-between py-2.5 border-b border-gray-50">
                <span className="text-gray-400 text-sm">Box</span>
                <span className="text-gray-800 text-sm font-medium">{box.box}</span>
              </div>
              <div className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-gray-400 text-sm">Weight</span>
                <span className="text-gray-800 text-sm font-medium">{box.weight} ton</span>
              </div>
            </div>
          ))}
        </div>

        {/* Notes */}
        {ticket.notes && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-2">Notes</h2>
            <p className="text-gray-600 text-sm">{ticket.notes}</p>
          </div>
        )}

        {/* Quick approve/reject if submitted */}
        {ticket.status === 'submitted' && (
          <div className="flex gap-3">
            <button onClick={() => updateStatus('rejected')} disabled={updating}
              className="flex-1 border-2 border-red-300 text-red-500 py-4 rounded-2xl font-semibold disabled:opacity-40">
              ✕ Reject
            </button>
            <button onClick={() => updateStatus('approved')} disabled={updating}
              className="flex-1 bg-[#2D7A5F] text-white py-4 rounded-2xl font-semibold disabled:opacity-40">
              ✓ Approve
            </button>
          </div>
        )}
      </div>

      {/* Actions sheet */}
      {showActions && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowActions(false)} />
          <div className="relative bg-white w-full rounded-t-3xl p-6 space-y-3">
            <h3 className="text-center font-bold text-gray-800 mb-2">Update Status</h3>
            {[
              { status: 'approved', label: '✅ Approve', style: 'bg-green-50 text-green-700' },
              { status: 'rejected', label: '❌ Reject', style: 'bg-red-50 text-red-500' },
              { status: 'submitted', label: '📤 Mark Submitted', style: 'bg-blue-50 text-blue-700' },
              { status: 'started', label: '🔄 Reset to Started', style: 'bg-gray-50 text-gray-700' },
            ].map(a => (
              <button key={a.status}
                onClick={() => updateStatus(a.status)}
                disabled={updating || ticket.status === a.status}
                className={`w-full py-4 rounded-2xl font-semibold disabled:opacity-30 ${a.style}`}>
                {a.label}
              </button>
            ))}
            <button onClick={() => setShowActions(false)} className="w-full py-3 text-gray-400 font-medium">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
