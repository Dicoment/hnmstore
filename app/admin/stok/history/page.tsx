'use client'

import { useState, useEffect } from 'react'
import { 
  History, ArrowLeft, Search, 
  Loader2, ArrowRight
} from 'lucide-react'
import Link from 'next/link'

export default function HistoryStokPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchLogs()
  }, [])

  async function fetchLogs() {
    try {
      setLoading(true)
      // QUERY SQL: Ambil log mutasi dan gabung dengan profil admin via VPS API
      const sql = `
        SELECT 
          sl.*,
          p.full_name as "admin_name"
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
      console.error("Gagal sinkronisasi history:", err)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => 
    log.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-4 md:p-10 bg-white min-h-screen font-sans text-black">
      
      {/* HEADER SECTION */}
      <div className="mb-10 max-w-7xl mx-auto">
        <Link href="/admin/stok" className="flex items-center gap-2 text-gray-400 hover:text-black text-xs font-black uppercase transition-all mb-6 tracking-widest">
          <ArrowLeft size={16} strokeWidth={3} /> KEMBALI KE INVENTORI
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none flex items-center gap-4">
              <History size={44} strokeWidth={3} /> MUTASI BARANG
            </h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.3em] mt-4">
              HnM Store <span className="mx-2 text-zinc-200">|</span> Real-Time VPS Database Logs
            </p>
          </div>

          <div className="relative group flex-1 md:max-w-md">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="CARI NAMA PRODUK..." 
              className="w-full pl-14 pr-6 py-5 bg-gray-50 border-none rounded-xl text-xs font-black outline-none uppercase shadow-sm focus:ring-2 focus:ring-black transition-all"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* TABLE WRAPPER */}
      <div className="max-w-7xl mx-auto bg-white border-2 border-gray-100 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-100 text-black">
                <th className="p-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Waktu</th>
                <th className="p-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Produk & Size</th>
                <th className="p-6 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Tipe</th>
                <th className="p-6 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Pergerakan Stok</th>
                <th className="p-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-32 text-center text-black">
                    <Loader2 className="animate-spin mx-auto mb-4" size={40} />
                    <p className="font-black text-gray-400 uppercase tracking-widest text-xs">Syncing Data...</p>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-32 text-center text-black">
                    <p className="font-black text-gray-300 uppercase tracking-widest text-xl opacity-30">Tidak Ada Aktivitas</p>
                  </td>
                </tr>
              ) : filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-all border-l-4 border-transparent hover:border-black group">
                  <td className="p-6">
                    <div className="font-black text-xs text-black uppercase tracking-tight">
                      {new Date(log.created_at).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                      {new Date(log.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})} WIB
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="font-black tracking-tighter text-sm uppercase group-hover:translate-x-1 transition-transform duration-300">
                      {log.product_name || 'Tanpa Nama'}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-1">
                      Size: <span className="text-black">{log.size_value}</span>
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase border-2 ${
                      log.type === 'MASUK' ? 'bg-green-50 text-green-700 border-green-100' :
                      log.type === 'TERJUAL' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      log.type === 'RETUR' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                      'bg-gray-50 text-gray-500 border-gray-100'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-2 inline-block ${
                        log.type === 'MASUK' ? 'bg-green-500' : 
                        log.type === 'TERJUAL' ? 'bg-blue-500' : 
                        'bg-orange-500'
                      }`}></span>
                      {log.type}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center justify-center gap-4">
                      <span className="text-gray-300 font-bold text-xs">{log.old_stock}</span>
                      <ArrowRight size={12} className="text-gray-200" />
                      <span className="font-black text-base text-black">{log.new_stock}</span>
                      <span className={`min-w-12 text-center text-[10px] font-black px-2 py-1 rounded-md ${
                        log.new_stock > log.old_stock ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                      }`}>
                        {log.new_stock > log.old_stock ? `+${log.new_stock - log.old_stock}` : `${log.new_stock - log.old_stock}`}
                      </span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="text-[11px] font-black text-zinc-500 uppercase tracking-tight">
                      {log.admin_name || log.notes || 'System / Admin'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; border-radius: 10px; }
      `}</style>
    </div>
  )
}