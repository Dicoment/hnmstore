'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  History, ArrowLeft, Search, 
  Loader2, ArrowRight, User, RefreshCw, ImageIcon, Printer
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

export default function HistoryStokPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const sql = `
  SELECT 
    sl.*,
    p.full_name as profile_name,
    (
      SELECT images FROM public."Product" 
      WHERE id = sl.product_id -- PAKAI ID, BUKAN NAMA!
      LIMIT 1
    ) as product_images
  FROM public."StockLog" sl
  LEFT JOIN public."Profiles" p ON sl.created_by = p.id
  ORDER BY sl.created_at DESC
`
      const res = await fetch('/api/vps-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      })
      const result = await res.json()
      if (result.data) setLogs(result.data)
    } catch (err) {
      console.error("Gagal sinkron history:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handlePrint = () => {
    window.print()
  }

  const filteredLogs = logs.filter(log => 
    (log.product_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white text-black font-bold uppercase tracking-widest text-xs">
      <Loader2 className="animate-spin mb-4" size={40} /> Syncing Mutasi...
    </div>
  )

  return (
    <div className="min-h-screen bg-white text-black font-sans w-full overflow-x-hidden pb-10">
      {/* HEADER NAV - RESPONSIVE PADDING */}
      <div className="border-b border-gray-100 px-4 lg:px-10 py-6 flex flex-col md:flex-row items-center justify-between sticky top-0 z-40 bg-white/90 backdrop-blur-md w-full gap-4 print:hidden">
        <Link href="/admin/stok" className="flex items-center gap-2 text-gray-400 hover:text-black transition-all">
          <ArrowLeft size={18} />
          <span className="text-xs font-bold uppercase tracking-widest">Kembali ke Stok</span>
        </Link>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button onClick={handlePrint} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gray-50 text-black px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest active:scale-95 transition-all hover:bg-gray-100 border border-gray-100 shadow-sm">
            <Printer size={16} /> Cetak
          </button>
          <button onClick={fetchLogs} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest active:scale-95 transition-all shadow-xl">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="w-full px-4 lg:px-10 py-8 lg:py-10 space-y-8 lg:space-y-10">
        {/* HERO SECTION */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 pb-8 border-b border-gray-100">
          <div className="space-y-2 text-center lg:text-left w-full lg:w-auto">
            <h1 className="text-3xl lg:text-4xl font-bold uppercase tracking-tighter flex items-center justify-center lg:justify-start gap-4 text-black leading-none">
              <History size={32} className="print:hidden" /> Mutasi Stok
            </h1>
            <p className="text-[12px] text-gray-400 font-bold uppercase tracking-widest">HnM Store • Log Record [Cetak: {new Date().toLocaleDateString('id-ID')}]</p>
          </div>
          <div className="relative w-full md:max-w-md print:hidden">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="CARI NAMA SEPATU..." 
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold uppercase outline-none focus:ring-1 focus:ring-black transition-all text-black shadow-sm"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* TABLE VIEW (DESKTOP) / CARD VIEW (MOBILE) */}
        <div className="bg-white lg:border lg:border-gray-100 lg:rounded-2xl overflow-hidden lg:shadow-sm">
          {/* DESKTOP TABLE */}
          <div className="hidden lg:block">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="p-6 text-xs font-bold uppercase tracking-widest text-black">Waktu</th>
                  <th className="p-6 text-xs font-bold uppercase tracking-widest text-black">Produk</th>
                  <th className="p-6 text-xs font-bold uppercase tracking-widest text-center text-black">Tipe</th>
                  <th className="p-6 text-xs font-bold uppercase tracking-widest text-center text-black">Mutasi</th>
                  <th className="p-6 text-xs font-bold uppercase tracking-widest text-black">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-black font-bold">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-32 text-center text-gray-300 font-bold uppercase tracking-widest text-xs">Belum ada catatan mutasi stok</td>
                  </tr>
                ) : filteredLogs.map((log, index) => (
                  <tr key={`${log.id}-${index}`} className="hover:bg-gray-50 transition-all group print:break-inside-avoid">
                    <td className="p-6">
                      <div className="text-xs uppercase text-black font-bold">
                        {new Date(log.created_at).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}
                      </div>
                      <div className="text-[10px] text-gray-400 uppercase mt-1">
                        {new Date(log.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})} WIB
                      </div>
                    </td>
                    <td className="p-6 text-black">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 relative rounded-lg overflow-hidden bg-gray-100 border border-gray-100 shrink-0 print:border-zinc-300">
                          {log.product_images?.[0] ? (
                            <Image src={`/uploads/${log.product_images[0]}`} alt="p" fill className="object-cover" unoptimized />
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-300"><ImageIcon size={16} /></div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs uppercase text-black font-bold truncate max-w-50">{log.product_name || 'System Update'}</div>
                          <div className="text-[10px] text-gray-400 uppercase mt-1 font-bold">Size: <span className="text-black">{log.size_value || '??'}</span></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${
                        log.type === 'MASUK' ? 'bg-green-50 text-green-700 border-green-100' :
                        log.type === 'TERJUAL' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        log.type === 'RETUR' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                        'bg-gray-50 text-gray-600 border-gray-100'
                      }`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center justify-center gap-4">
                        <span className="text-gray-300 font-bold text-xs">{log.old_stock}</span>
                        <ArrowRight size={14} className="text-gray-200" />
                        <span className="font-bold text-sm text-black">{log.new_stock}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${log.new_stock > log.old_stock ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                          {log.new_stock > log.old_stock ? `+${log.new_stock - log.old_stock}` : log.new_stock - log.old_stock}
                        </span>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="text-xs font-bold uppercase flex items-center gap-2 text-black">
                        <span className="truncate max-w-full">{log.profile_name || log.created_by_email || 'HnM Store Owner'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARD VIEW [cite: 2026-02-24] */}
          <div className="lg:hidden space-y-4">
            {filteredLogs.map((log, index) => (
              <div key={`${log.id}-${index}`} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-start border-b border-gray-50 pb-3">
                  <div className="text-[10px] text-gray-400 font-bold uppercase">
                    {new Date(log.created_at).toLocaleDateString('id-ID', {day: '2-digit', month: 'short'})} • {new Date(log.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border ${
                    log.type === 'MASUK' ? 'bg-green-50 text-green-700 border-green-100' :
                    log.type === 'TERJUAL' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                    log.type === 'RETUR' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                    'bg-gray-50 text-gray-600 border-gray-100'
                  }`}>
                    {log.type}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 relative rounded-xl overflow-hidden bg-gray-50 shrink-0">
                    {log.product_images?.[0] ? <Image src={`/uploads/${log.product_images[0]}`} alt="p" fill className="object-cover" unoptimized /> : <div className="flex items-center justify-center h-full text-gray-300"><ImageIcon size={16} /></div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold uppercase text-black truncate">{log.product_name || 'System Update'}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">Size: <span className="text-black">{log.size_value || '??'}</span></div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-gray-300 text-[10px]">{log.old_stock}</span>
                      <ArrowRight size={10} className="text-gray-200" />
                      <span className="font-bold text-xs text-black">{log.new_stock}</span>
                    </div>
                    <div className={`text-[10px] font-bold mt-1 ${log.new_stock > log.old_stock ? 'text-green-600' : 'text-red-600'}`}>
                      {log.new_stock > log.old_stock ? `+${log.new_stock - log.old_stock}` : log.new_stock - log.old_stock}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-2 rounded-xl text-[10px] font-bold uppercase flex items-center gap-2 text-gray-400">
                  <User size={12} /> {log.profile_name || log.created_by_email || 'HnM Store Owner'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          table { width: 100% !important; border: 1px solid #eee !important; }
          th { background-color: #f9f9f9 !important; -webkit-print-color-adjust: exact; }
          .rounded-2xl, .rounded-xl, .rounded-lg { border-radius: 0 !important; }
          @page { margin: 20mm; }
        }
      `}</style>
    </div>
  )
}