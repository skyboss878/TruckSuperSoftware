'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SignatureCanvas from '@/components/SignatureCanvas'

export default function TicketDetail() {
  const router = useRouter()
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showPOD, setShowPOD] = useState(false)

  useEffect(() => { loadTicket() }, [])

  async function loadTicket() {
    const data = await fetch(`/api/tickets/${id}`).then(r=>r.json())
    setTicket(data)
    setLoading(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/tickets/${id}`, { method: 'DELETE' })
    router.replace('/driver')
  }

  async function handlePOD({ signatureData, customerName }) {
    await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signature_data: signatureData,
        signature_name: customerName,
        delivered_at: new Date().toISOString(),
        status: 'submitted',
      }),
    })
    await loadTicket()
    setShowPOD(false)
  }

  async function handleSubmit() {
    await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'submitted' }),
    })
    await loadTicket()
    setShowMenu(false)
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
    <>
    {showPOD && (
      <SignatureCanvas
        onConfirm={handlePOD}
        onCancel={() => setShowPOD(false)}
      />
    )}
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800 truncate mx-4">{ticket.customer_name}</h1>
        {ticket.status === 'started' && (
          <button onClick={() => setShowMenu(true)} className="text-gray-400 text-xl">⋯</button>
        )}
        {ticket.status !== 'started' && <div className="w-6" />}
      </div>

      <div className="p-4 space-y-4 pb-10">
        {/* Status + POD */}
        <div className="flex justify-between items-center">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${statusColor[ticket.status]}`}>
            {ticket.status}
          </span>
          {ticket.signature_data ? (
            <span className="text-xs bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full">✅ POD Captured</span>
          ) : (
            <button onClick={() => setShowPOD(true)}
              className="text-xs bg-[#2D7A5F] text-white font-bold px-3 py-1.5 rounded-full active:opacity-70">
              ✍️ Get Signature
            </button>
          )}
        </div>

        {ticket.signature_data && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <p className="text-xs font-semibold text-green-700 mb-2">✅ POD — {ticket.signature_name}</p>
            <img src={ticket.signature_data} alt="Signature"
              className="w-full rounded-xl bg-white border border-green-100"
              style={{maxHeight:'120px', objectFit:'contain'}} />
            {ticket.delivered_at && (
              <p className="text-xs text-green-600 mt-2">
                Signed {new Date(ticket.delivered_at).toLocaleString('en-US', {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'})}
              </p>
            )}
          </div>
        )}

        {/* Loaded section */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-4 text-base">Loaded</h2>
          {[
            ['Customer', ticket.customer_name],
            ['Load ID', ticket.load_id],
            ['BOL Number', ticket.bol_number],
            ['Date', ticket.date ? new Date(ticket.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'],
            ['Driver', ticket.driver_name || '—'],
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

        {/* Loading section */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-800 mb-4 text-base">Loading</h2>
          {[
            ['Arrival Time', ticket.arrival_time ? new Date(ticket.arrival_time).toLocaleString() : '—'],
            ['Departed Time', ticket.departed_time ? new Date(ticket.departed_time).toLocaleString() : '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-2.5 border-b border-gray-50">
              <span className="text-gray-400 text-sm">{label}</span>
              <span className="text-gray-800 text-sm font-medium">{value}</span>
            </div>
          ))}
          {ticket.boxes && ticket.boxes.map((box, i) => (
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
            <h2 className="font-bold text-gray-800 mb-2 text-base">Notes</h2>
            <p className="text-gray-600 text-sm">{ticket.notes}</p>
          </div>
        )}

        {/* Offline badge */}
        {!ticket.synced && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3 flex items-center gap-2">
            <span>⚠️</span>
            <span className="text-yellow-700 text-sm font-medium">Saved offline — will sync when connected</span>
          </div>
        )}
      </div>

      {/* Action menu */}
      {showMenu && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowMenu(false)} />
          <div className="relative bg-white w-full rounded-t-3xl p-6 space-y-3">
            <h3 className="text-center font-bold text-gray-800 mb-4">Ticket Actions</h3>
            <button
              onClick={() => { setShowMenu(false); router.push(`/driver/ticket/${id}/edit`) }}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-gray-50 text-gray-700 font-medium"
            >
              <span>✏️</span> Edit Ticket
            </button>
            <button
              onClick={handleSubmit}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-[#E8F5F0] text-[#2D7A5F] font-medium"
            >
              <span>✅</span> Submit Ticket
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-red-50 text-red-500 font-medium"
            >
              <span>🗑️</span> {deleting ? 'Deleting...' : 'Delete Ticket'}
            </button>
            <button onClick={() => setShowMenu(false)}
              className="w-full py-4 text-gray-400 font-medium">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  )
}