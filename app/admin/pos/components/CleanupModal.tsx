'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Trash2, X, Loader2, AlertTriangle } from 'lucide-react'

type Target = 'stocklog' | 'transactions'

interface Props {
  target: Target
  onDone?: () => void
}

const CONFIG: Record<Target, { title: string; label: string; warnings: string[] }> = {
  stocklog: {
    title: 'Bersihkan Mutasi Stok',
    label: 'Mutasi stok',
    warnings: [
      'Hanya catatan mutasi (log) yang dihapus.',
      'Jumlah stok asli di inventori TIDAK berubah.'
    ]
  },
  transactions: {
    title: 'Bersihkan Riwayat & Laporan',
    label: 'Transaksi penjualan',
    warnings: [
      'Transaksi yang dihapus juga hilang dari Riwayat dan Laporan Penjualan.',
      'Transaksi HUTANG yang belum lunas tidak ikut dihapus.',
      'Stok tidak dikembalikan atau diubah.'
    ]
  }
}

const PRESETS = [
  { label: '> 1 Bulan', days: 30 },
  { label: '> 3 Bulan', days: 90 },
  { label: '> 6 Bulan', days: 180 },
  { label: '> 1 Tahun', days: 365 }
]

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return fmt(d)
}

export default function CleanupModal({ target, onDone }: Props) {
  const cfg = CONFIG[target]
  const [isOwner, setIsOwner] = useState(false)
  const [open, setOpen] = useState(false)
  const [before, setBefore] = useState('')
  const [count, setCount] = useState<number | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setBefore('')
    setCount(null)
    setConfirmText('')
    setError('')
  }

  const close = () => {
    if (busy) return
    setOpen(false)
    reset()
  }

  // Tombol hanya tampil untuk OWNER (server tetap mengecek ulang)
  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => setIsOwner(String(d?.role ?? '').toUpperCase() === 'OWNER'))
      .catch(() => setIsOwner(false))
  }, [])

  // Tekan Esc untuk menutup + kunci scroll halaman saat modal terbuka
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        setOpen(false)
        reset()
      }
    }
    window.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, busy])

  if (!isOwner) return null

  const maxDate = daysAgo(30)

  const pickDate = (value: string) => {
    setBefore(value)
    setCount(null)
    setConfirmText('')
    setError('')
  }

  const callApi = async (dryRun: boolean) => {
    const res = await fetch('/api/admin/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, before, dryRun })
    })
    const data = await res.json()
    if (!res.ok || data.error) throw new Error(data.error || 'Gagal')
    return data as { count: number }
  }

  const handlePreview = async () => {
    if (!before) return setError('Pilih tanggal dulu.')
    setBusy(true)
    setError('')
    try {
      const data = await callApi(true)
      setCount(data.count)
    } catch (e: any) {
      setError(e?.message || 'Gagal menghitung data.')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (confirmText !== 'HAPUS') return
    setBusy(true)
    setError('')
    try {
      const data = await callApi(false)
      alert(`${data.count} data berhasil dihapus.`)
      setBusy(false)
      setOpen(false)
      reset()
      onDone?.()
    } catch (e: any) {
      setError(e?.message || 'Gagal menghapus data.')
      setBusy(false)
    }
  }

  const modal = (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      style={{ zIndex: 9999 }}
      onClick={close}
    >
      <div
        className="bg-white rounded-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-black font-sans font-bold"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER (selalu terlihat) */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
          <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-3">
            <Trash2 size={18} /> {cfg.title}
          </h2>
          <button
            onClick={close}
            disabled={busy}
            aria-label="Tutup"
            className="p-2 hover:bg-red-500 hover:text-white rounded-xl transition-all disabled:opacity-30"
          >
            <X size={20} />
          </button>
        </div>

        {/* ISI (bisa di-scroll) */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* PERINGATAN */}
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl space-y-2 text-[11px] uppercase text-red-700">
            <div className="flex items-center gap-2 text-xs">
              <AlertTriangle size={16} /> Penghapusan permanen, tidak bisa dibatalkan
            </div>
            <ul className="list-disc pl-5 space-y-1 text-red-600">
              {cfg.warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          </div>

          {/* PILIH TANGGAL */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase text-gray-400 tracking-widest">
              Hapus {cfg.label} sebelum tanggal
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => pickDate(daysAgo(p.days))}
                  className={`py-3 rounded-xl text-[10px] uppercase border transition-all ${
                    before === daysAgo(p.days) ? 'bg-black text-white border-black' : 'bg-white border-gray-100 hover:border-black'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={before}
              max={maxDate}
              onChange={(e) => pickDate(e.target.value)}
              className="w-full px-4 py-3.5 bg-gray-50 rounded-xl text-xs uppercase outline-none border-none shadow-sm font-bold"
            />
            <p className="text-[10px] text-gray-400 uppercase">
              Maksimal sampai 30 hari yang lalu. Data pada tanggal tersebut dan sesudahnya aman.
            </p>
          </div>

          {/* PRATINJAU */}
          {count === null ? (
            <button
              onClick={handlePreview}
              disabled={busy || !before}
              className="w-full py-4 bg-gray-50 text-black rounded-2xl text-xs uppercase tracking-widest border border-gray-100 hover:bg-gray-100 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="animate-spin" size={16} /> : null} Cek Jumlah Data
            </button>
          ) : count === 0 ? (
            <div className="p-4 bg-gray-50 rounded-xl text-center text-xs uppercase text-gray-400">
              Tidak ada data yang cocok untuk dihapus.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl text-center">
                <p className="text-[10px] uppercase text-gray-400 tracking-widest">Akan dihapus</p>
                <p className="text-3xl tracking-tighter text-red-600">{count.toLocaleString('id-ID')} data</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-400 tracking-widest">
                  Ketik <span className="text-black">HAPUS</span> untuk konfirmasi
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="HAPUS"
                  className="w-full px-4 py-3.5 bg-gray-50 rounded-xl text-sm uppercase outline-none border-none shadow-sm font-bold"
                />
              </div>
              <button
                onClick={handleDelete}
                disabled={busy || confirmText !== 'HAPUS'}
                className="w-full py-4 bg-red-600 text-white rounded-2xl text-xs uppercase tracking-widest disabled:opacity-30 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                {busy ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />} Hapus Permanen
              </button>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 uppercase text-center">{error}</p>
          )}
        </div>

        {/* FOOTER: tombol batal (selalu terlihat) */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
          <button
            onClick={close}
            disabled={busy}
            className="w-full py-3.5 bg-white text-black rounded-2xl text-xs uppercase tracking-widest border border-gray-200 hover:bg-gray-100 disabled:opacity-40 transition-all"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 bg-red-50 text-red-600 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest border border-red-100 hover:bg-red-600 hover:text-white active:scale-95 transition-all print:hidden"
      >
        <Trash2 size={16} /> Bersihkan Data
      </button>

      {open && createPortal(modal, document.body)}
    </>
  )
}