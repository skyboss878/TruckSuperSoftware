'use client'
import { useRef, useState, useEffect } from 'react'

export default function SignatureCanvas({ onConfirm, onCancel }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [hasStrokes, setHasStrokes] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [saving, setSaving] = useState(false)
  const lastPos = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function startDraw(e) {
    e.preventDefault()
    const canvas = canvasRef.current
    setDrawing(true)
    lastPos.current = getPos(e, canvas)
  }

  function draw(e) {
    e.preventDefault()
    if (!drawing) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
    setHasStrokes(true)
  }

  function endDraw(e) {
    e.preventDefault()
    setDrawing(false)
    lastPos.current = null
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
  }

  async function confirmSignature() {
    if (!hasStrokes || !customerName.trim()) return
    setSaving(true)
    const canvas = canvasRef.current
    const base64 = canvas.toDataURL('image/png')
    await onConfirm({ signatureData: base64, customerName: customerName.trim() })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-5 space-y-4 max-h-[92vh] overflow-y-auto">

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">✍️ Proof of Delivery</h2>
          <button onClick={onCancel} className="text-gray-400 text-2xl leading-none">×</button>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer Name</label>
          <input
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder="Full name of person receiving delivery"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-[#2D7A5F] text-base"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Signature</label>
            <button onClick={clearCanvas} className="text-xs text-gray-400 font-medium">Clear</button>
          </div>
          <div className="border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              className="w-full touch-none"
              style={{ height: '160px' }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
          </div>
          {!hasStrokes && (
            <p className="text-xs text-gray-400 text-center mt-1">Have the customer sign above</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={onCancel}
            className="py-4 border-2 border-gray-200 rounded-2xl font-semibold text-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={confirmSignature}
            disabled={!hasStrokes || !customerName.trim() || saving}
            className="py-4 bg-[#2D7A5F] text-white rounded-2xl font-semibold disabled:opacity-40"
          >
            {saving ? 'Saving...' : '✅ Confirm POD'}
          </button>
        </div>
      </div>
    </div>
  )
}
