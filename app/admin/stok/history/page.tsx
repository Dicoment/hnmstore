'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  History, ArrowLeft, Search, 
  ArrowUpCircle, ArrowDownCircle
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
      // Query ini narik relasi Profiles (pastikan nama tabel & FK sudah benar di Supabase)
      const { data, error } = await supabase
        .from('StockLog')
        .select(`
          *,
          Profiles (
            full_name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLogs(data || [])
    } catch (err: any) {
      console.error("Error fetching logs:", err.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter logic biar pencarian produk lu jalan
  const filteredLogs = logs.filter(log => 
    log.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen font-sans text-black">
      
      {/* HEADER - Style HnM Admin */}
      <div className="mb-8">
        <Link href="/admin/stok" className="flex items-center gap-2 text-gray-400 hover:text-black text-[10px] font-[1000] uppercase transition-all mb-4 tracking-widest">
          <ArrowLeft size={14} strokeWidth={3}/> Kembali ke Stok
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-5xl font-[1000] uppercase italic tracking-tighter leading-none flex items-center gap-4">
              <History size={40} strokeWidth={3.5} /> Mutasi Barang
            </h1>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-3">
              HnM Store <span className="mx-2 text-gray-200">|</span> Log Pergerakan Stok
            </p>
          </div>

          {/* SEARCH BOX */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="CARI NAMA PRODUK..." 
              className="w-full md:w-95 pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-[20px] text-[11px] font-black outline-none uppercase shadow-sm focus:border-black focus:ring-1 focus:ring-black transition-all"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* TABLE WRAPPER - Rounded XL & Border Style */}
      <div className="bg-white border border-gray-100 rounded-4xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="p-6 text-[10px] font-[1000] uppercase text-gray-400 tracking-widest">Waktu</th>
                <th className="p-6 text-[10px] font-[1000] uppercase text-gray-400 tracking-widest">Produk & Size</th>
                <th className="p-6 text-[10px] font-[1000] uppercase text-gray-400 tracking-widest">Tipe</th>
                <th className="p-6 text-[10px] font-[1000] uppercase text-gray-400 tracking-widest">Perubahan</th>
                <th className="p-6 text-[10px] font-[1000] uppercase text-gray-400 tracking-widest">Oleh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-32 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-black mb-4"></div>
                    <p className="font-[1000] text-gray-300 uppercase tracking-[0.5em] text-[10px]">Memuat Data...</p>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-32 text-center">
                    <p className="font-[1000] text-gray-200 uppercase italic tracking-widest text-lg">Tidak Ada Aktivitas</p>
                  </td>
                </tr>
              ) : filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/80 transition-all group">
                  <td className="p-6">
                    <div className="font-[1000] text-xs text-black uppercase tracking-tighter">
                      {new Date(log.created_at).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})}
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                      {new Date(log.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})} WIB
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="font-[1000] tracking-tighter text-sm uppercase group-hover:translate-x-1 transition-transform duration-300">
                      {log.product_name || 'Tanpa Nama'}
                    </div>
                    <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                      Size: <span className="text-black">{log.size_value}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-[1000] tracking-tighter uppercase inline-flex items-center gap-2 border ${
                      log.type === 'MASUK' ? 'bg-green-50 text-green-700 border-green-100' :
                      log.type === 'TERJUAL' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      log.type === 'RETUR' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                      'bg-gray-50 text-gray-600 border-gray-100'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                        log.type === 'MASUK' ? 'bg-green-500' : 
                        log.type === 'TERJUAL' ? 'bg-blue-500' : 
                        'bg-orange-500'
                      }`}></span>
                      {log.type}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-300 font-bold text-xs">{log.old_stock}</span>
                      <span className="text-gray-300 text-[10px]">→</span>
                      <span className="font-[1000] text-sm text-black">{log.new_stock}</span>
                      <span className={`text-[10px] font-[1000] px-1.5 py-0.5 rounded ${
                        log.new_stock > log.old_stock ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                      }`}>
                        {log.new_stock > log.old_stock ? `+${log.new_stock - log.old_stock}` : `${log.new_stock - log.old_stock}`}
                      </span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="text-[10px] font-[1000] text-gray-400 uppercase tracking-tighter">
                      {log.Profiles?.full_name || 'System / Admin'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}