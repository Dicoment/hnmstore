'use client'

import { useState, useEffect } from 'react'
import { 
  ClipboardList, ArrowLeft, Printer, 
  Calendar, Banknote, ShoppingBag, Loader2,
  AlertCircle, Camera, User, TrendingUp, X
} from 'lucide-react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

export default function LaporanShiftPage() {
  const [report, setReport] = useState<any>(null)
  const [returns, setReturns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [adminName, setAdminName] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)

      // QUERY SQL: Pastikan hanya mengambil data hari ini berdasarkan user yang login
      const sql = `
        SELECT 
          (SELECT full_name FROM public."Profiles" WHERE id = $1 LIMIT 1) as admin_name,
          (SELECT json_agg(t.*) FROM public."Transactions" t 
           WHERE t.created_by = $1 AND t.status = 'SUCCESS' AND t.created_at >= $2) as sales,
          (SELECT json_agg(t.*) FROM public."Transactions" t 
           WHERE t.created_by = $1 AND t.status = 'RETURNED' AND t.created_at >= $2) as returned
      `
      
      const res = await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({ sql, params: [user.id, startOfDay.toISOString()] })
      })
      
      const { data } = await res.json()
      const dbResult = data[0]

      setAdminName(dbResult.admin_name || 'Admin')
      const salesData = dbResult.sales || []
      const returnData = dbResult.returned || []

      // KALKULASI: Pastikan tidak ada hasil minus jika data baru dimulai
      const totalGross = salesData.reduce((acc: number, curr: any) => acc + Number(curr.total || 0), 0)
      const totalReturnAmount = returnData.reduce((acc: number, curr: any) => acc + Number(curr.total || 0), 0)

  setReport({
  totalGross,
  totalReturnAmount,
  netSales: totalGross, // Kas di laci adalah uang masuk dari penjualan sukses
  orderCount: salesData.length,
  returnCount: returnData.length
})
      setReturns(returnData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-0 bg-white min-h-screen text-black font-sans overflow-x-hidden">
      {/* HEADER NAV - COMPACT */}
      <div className="border-b-2 border-zinc-100 px-4 py-3 flex items-center justify-between print:hidden">
        <Link href="/admin/pos" className="flex items-center gap-2 text-zinc-400 hover:text-black transition-all">
          <div className="p-1.5 bg-zinc-50 rounded-lg">
            <ArrowLeft size={16} strokeWidth={3}/>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest">Back to POS</span>
        </Link>
        <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-lg">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[8px] font-black uppercase tracking-widest text-white">Live Sync</span>
        </div>
      </div>

      <div className="w-full max-w-350 mx-auto px-4 md:px-8 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="animate-spin text-black" size={40} strokeWidth={3} />
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-400">Processing Analytics...</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            
            {/* HERO SECTION - REDUCED SCALE */}
            <div className="w-full border-[3px] border-black rounded-xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 bg-white shadow-[10px_10px_0px_0px_rgba(0,0,0,0.05)]">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center text-white shadow-xl">
                  <ClipboardList size={32} strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-3xl font-black uppercase tracking-tighter">Laporan Shift</h1>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.3em]">HnM Analytics Terminal</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-zinc-50 px-5 py-4 rounded-xl border-2 border-zinc-100 min-w-45">
                  <div className="flex items-center gap-2 mb-2 border-b border-zinc-200 pb-2">
                    <User size={14} className="text-black" />
                    <p className="text-[10px] font-black uppercase tracking-tight">{adminName}</p>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Calendar size={14} />
                    <p className="text-[9px] font-black uppercase tracking-wider">
                      {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* STATS GRID - COMPACT */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-zinc-50 p-6 rounded-xl border-2 border-zinc-100 group transition-all hover:border-black">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Gross Sales</p>
                <p className="text-2xl font-black tracking-tighter">RP {report?.totalGross.toLocaleString('id-ID')}</p>
                <div className="mt-6 flex items-center gap-2">
                  <ShoppingBag size={12} className="text-zinc-400"/>
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{report?.orderCount} Transaksi</span>
                </div>
              </div>

              <div className="bg-red-50 p-6 rounded-xl border-2 border-red-100">
                <p className="text-[9px] font-black text-red-400 uppercase tracking-[0.2em] mb-4">Total Retur</p>
                <p className="text-2xl font-black tracking-tighter text-red-600">RP {report?.totalReturnAmount.toLocaleString('id-ID')}</p>
                <div className="mt-6 flex items-center gap-2">
                  <X size={12} className="text-red-400" strokeWidth={3} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-red-500">{report?.returnCount} Item Balik</span>
                </div>
              </div>

              <div className="bg-black p-6 rounded-xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-green-500" />
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Kas Bersih (Setoran)</p>
                <p className="text-3xl font-black text-white tracking-tighter">RP {report?.netSales.toLocaleString('id-ID')}</p>
                <div className="mt-6 flex items-center gap-2">
                   <Banknote size={16} className="text-green-500" />
                   <span className="text-[9px] font-black text-green-500 uppercase tracking-[0.2em]">Wajib Setoran</span>
                </div>
              </div>
            </div>

            {/* ATTACHMENTS - GRID 3 COLUMNS */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-l-4 border-black pl-4">
                 <h3 className="text-sm font-black uppercase tracking-[0.3em] flex items-center gap-3 text-black">
                  <AlertCircle size={18} /> Bukti Lampiran Retur
                </h3>
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{returns.length} Verifikasi</span>
              </div>
              
              {returns.length === 0 ? (
                <div className="bg-zinc-50 border-2 border-dashed border-zinc-100 rounded-xl p-16 text-center">
                  <ShoppingBag size={40} className="mx-auto text-zinc-200 mb-4" strokeWidth={1} />
                  <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.4em]">Tidak Ada Mutasi Retur Shift Ini</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {returns.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-5 bg-white border-2 border-zinc-100 rounded-xl hover:border-black transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-zinc-100 rounded-lg overflow-hidden relative border border-zinc-100">
                          <img src={item.return_proof_url || 'https://placehold.co/150x150?text=NO+IMAGE'} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-300" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-tight text-zinc-400">#{item.id.slice(0,8)}</p>
                          <p className="text-[10px] font-bold text-red-600 uppercase leading-tight max-w-30 truncate">{item.return_reason || 'Retur'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                          <p className="text-sm font-black text-red-600">-RP {Number(item.total).toLocaleString('id-ID')}</p>
                          <p className="text-[7px] font-black text-zinc-300 uppercase mt-1">Verified</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PRINT FOOTER - REDUCED SIZE */}
            <div className="mt-12 pt-8 border-t-2 border-zinc-100 flex flex-col md:flex-row gap-6 items-center justify-between print:hidden pb-10">
              <div className="flex items-center gap-3 bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                 <AlertCircle size={18} className="text-zinc-400" />
                 <p className="text-[9px] font-bold text-zinc-400 uppercase leading-relaxed max-w-xs">
                  Cek fisik uang di laci sebelum serah terima shift.
                </p>
              </div>
              <button 
                onClick={() => window.print()}
                className="w-full md:w-auto bg-black text-white px-10 py-5 rounded-xl font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-zinc-800 transition-all active:scale-95 shadow-xl"
              >
                <Printer size={20} strokeWidth={3} /> Print Report
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          @page { margin: 15mm; }
          body { background: white !important; }
          .print\:hidden, button, .border-b-2 { display: none !important; }
          .rounded-xl { border-radius: 0 !important; border: 1px solid #000 !important; }
          .shadow-xl, .shadow-10px { box-shadow: none !important; }
          .border-[3px], .border-4 { border-width: 1px !important; }
          .p-6, .p-8 { padding: 10px !important; }
        }
      `}</style>
    </div>
  )
}