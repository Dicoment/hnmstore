'use client'

import { useState, useEffect } from 'react'
import { X, Wallet, Loader2, Check } from 'lucide-react'

interface Props {
  show: boolean
  tx: any
  onClose: () => void
  onDone: () => void
}

export default function ModalBayarHutang({ show, tx, onClose, onDone }: Props) {
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (show) { setAmount(''); setError('') }
  }, [show, tx?.id])

  if (!show || !tx) return null

  const total = Number(tx.total || 0)
  const paid = Number(tx.amount_paid || 0)
  const sisa = Math.max(total - paid, 0)
  const nominal = Number(amount || 0)
  const rp = (n: number) => `RP ${n.toLocaleString('id-ID')}`

  const submit = async (full: boolean) => {
    const pay = full ? sisa : nominal
    if (pay <= 0) return setError('Nominal harus lebih dari 0')
    if (pay > sisa) return setError('Nominal melebihi sisa hutang')

    try {
      setSaving(true)
      setError('')
      const res = await fetch('/api/admin/hutang/bayar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [tx.id], ...(full ? {} : { amount: pay }) })
      })
      let result: any = null
      try { result = await res.json() } catch { /* bukan JSON */ }
      if (!res.ok || result?.error) throw new Error(result?.error || `HTTP ${res.status}`)
      onDone()
    } catch (err: any) {
      setError(err.message || 'Gagal memproses pembayaran')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-md my-auto shadow-2xl overflow-hidden border border-gray-100 text-black">

        <div className="p-8 border-b-2 border-black bg-white flex justify-between items-center">
          <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-3">
            <Wallet size={26} /> BAYAR HUTANG
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black transition-all">
            <X size={28} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-3 font-bold uppercase">
            <p className="text-xs text-black">{tx.customer}</p>
            <div className="flex justify-between text-xs"><span className="text-gray-400">Total</span><span>{rp(total)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-400">Sudah dibayar</span><span>{rp(paid)}</span></div>
            <div className="flex justify-between text-sm border-t border-gray-200 pt-3 text-red-600"><span>Sisa</span><span>{rp(sisa)}</span></div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400">NOMINAL BAYAR (CICIL)</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={amount ? Number(amount).toLocaleString('id-ID') : ''}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full p-5 bg-gray-50 border border-transparent focus:border-black rounded-2xl text-sm font-bold outline-none transition-all"
            />
          </div>

          {error && (
            <p className="text-xs font-bold uppercase text-red-600 bg-red-50 border border-red-100 rounded-2xl p-4">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              disabled={saving || nominal <= 0}
              onClick={() => submit(false)}
              className="py-5 bg-gray-50 text-black border border-gray-100 rounded-2xl font-bold text-[10px] uppercase tracking-widest active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : null} Bayar Sebagian
            </button>
            <button
              disabled={saving || sisa <= 0}
              onClick={() => submit(true)}
              className="py-5 bg-black text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />} Lunasi Sisa
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}