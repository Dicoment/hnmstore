'use client'

import { useState, useEffect } from 'react'
import { 
  History, ArrowLeft, Search, 
  Loader2, ArrowRight, User, Package
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
    <div className="p-4 md:p-10 bg-[#FBFBFB] min-h-screen font-sans text-black overflow-x-hidden">
      
      {/* HEADER SECTION */}
      <div className="mb-6 md:mb-10 max-w-7xl mx-auto">
        <Link href="/admin/stok" className="flex items-center gap-2 text-gray-400 hover:text-black text-[10px] md:text-xs font-black uppercase transition-all mb-4 md:mb-6 tracking-widest">
          <ArrowLeft size={14} strokeWidth={3} /> KEMBALI KE INVENTORI
        </Link>
        
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 md:gap-8">
          <div className="space-y-2 md:space-y-4">
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none flex items-center gap-3 md:gap-4">
              <History className="size-8 md:size-12" strokeWidth={3} /> MUTASI <span className="text-zinc-300">STOK.</span>
            </h1>
            <p className="text-[9px] md:text-xs text-gray-400 font-bold uppercase tracking-[0.2em] md:tracking-[0.3em]">
              HnM Store <span className="mx-2 text-zinc-200">|</span> LOGS RECORD
            </p>
          </div>

          <div className="relative group w-full lg:max-w-md">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="CARI NAMA PRODUK..." 
              className="w-full pl-14 pr-6 py-4 md:py-5 bg-white border-2 border-gray-50 rounded-2xl text-[10px] md:text-xs font-black outline-none uppercase shadow-sm focus:ring-2 focus:ring-black transition-all"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="py-40 flex flex-col items-center justify-center bg-white border-2 border-gray-100 rounded-3xl">
            <Loader2 className="animate-spin text-black mb-4" size={40} />
            <p className="font-black text-gray-400 uppercase tracking-widest text-[10px]">Syncing logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-40 text-center bg-white border-2 border-gray-100 rounded-3xl">
             <p className="font-black text-gray-200 uppercase tracking-widest text-xl">History Empty</p>
          </div>
        ) : (
          <>
            {/* --- DESKTOP TABLE VIEW --- */}
            <div className="hidden md:block bg-white border-2 border-gray-50 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 text-black">
                      <th className="p-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Waktu</th>
                      <th className="p-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Produk</th>
                      <th className="p-6 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Tipe</th>
                      <th className="p-6 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Mutasi</th>
                      <th className="p-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Operator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 transition-all group">
                        <td className="p-6">
                          <div className="font-black text-[11px] text-black uppercase tracking-tight">
                            {new Date(log.created_at).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}
                          </div>
                          <div className="text-[9px] text-gray-400 font-bold uppercase mt-1">
                            {new Date(log.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})} WIB
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="font-black tracking-tighter text-xs uppercase group-hover:translate-x-1 transition-transform duration-300">
                            {log.product_name || 'System Update'}
                          </div>
                          <div className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mt-1">
                            Size: <span className="text-black">{log.size_value}</span>
                          </div>
                        </td>
                        <td className="p-6 text-center">
                          <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase border-2 ${
                            log.type === 'MASUK' ? 'bg-green-50 text-green-700 border-green-100' :
                            log.type === 'TERJUAL' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            log.type === 'RETUR' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                            'bg-gray-50 text-gray-500 border-gray-100'
                          }`}>
                            {log.type}
                          </span>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center justify-center gap-3">
                            <span className="text-gray-300 font-bold text-[10px]">{log.old_stock}</span>
                            <ArrowRight size={10} className="text-gray-200" />
                            <span className="font-black text-sm text-black">{log.new_stock}</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${
                              log.new_stock > log.old_stock ? 'text-green-600 bg-green-50 border border-green-100' : 'text-red-600 bg-red-50 border border-red-100'
                            }`}>
                              {log.new_stock > log.old_stock ? `+${log.new_stock - log.old_stock}` : `${log.new_stock - log.old_stock}`}
                            </span>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="text-[10px] font-black text-zinc-500 uppercase tracking-tight flex items-center gap-2">
                            <User size={12} className="text-zinc-300" /> {log.admin_name || 'System'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* --- MOBILE CARD VIEW --- */}
            <div className="md:hidden space-y-4">
              {filteredLogs.map((log) => (
                <div key={log.id} className="bg-white border-2 border-gray-50 p-5 rounded-xl shadow-sm relative overflow-hidden">
                  <div className={`absolute top-0 right-0 px-4 py-1 text-[8px] font-black rounded-bl-2xl ${
                    log.type === 'MASUK' ? 'bg-green-500 text-white' :
                    log.type === 'TERJUAL' ? 'bg-blue-500 text-white' :
                    'bg-orange-500 text-white'
                  }`}>
                    {log.type}
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-start pr-12">
                      <div className="space-y-1">
                        <p className="text-[11px] font-black uppercase tracking-tight leading-tight">{log.product_name}</p>
                        <div className="flex items-center gap-2">
                           <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded">SZ {log.size_value}</span>
                           <span className="text-[8px] font-bold text-zinc-300 italic">{new Date(log.created_at).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})} WIB</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-dashed border-gray-100 pt-4">
                       <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                             <span className="text-[7px] font-black text-gray-300 uppercase">Awal</span>
                             <span className="text-sm font-bold text-gray-400 leading-none">{log.old_stock}</span>
                          </div>
                          <ArrowRight size={12} className="text-gray-200" />
                          <div className="flex flex-col">
                             <span className="text-[7px] font-black text-gray-300 uppercase">Akhir</span>
                             <span className="text-lg font-black text-black leading-none">{log.new_stock}</span>
                          </div>
                          <span className={`ml-2 text-[9px] font-black px-2 py-0.5 rounded-lg ${
                            log.new_stock > log.old_stock ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                          }`}>
                            {log.new_stock > log.old_stock ? `+${log.new_stock - log.old_stock}` : `${log.new_stock - log.old_stock}`}
                          </span>
                       </div>
                       <div className="flex items-center gap-2">
                          <User size={12} className="text-zinc-300" />
                          <span className="text-[9px] font-black text-zinc-500 uppercase">{log.admin_name?.split(' ')[0] || 'System'}</span>
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #000; }
      `}</style>
    </div>
  )
}