'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  ClipboardList, ArrowLeft, Printer, 
  Calendar, Banknote, ShoppingBag, Loader2,
  AlertCircle, Camera, User, TrendingUp
} from 'lucide-react'
import Link from 'next/link'

export default function LaporanShiftPage() {
  const [report, setReport] = useState<any>(null)
  const [returns, setReturns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [adminName, setAdminName] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      
      // 1. Ambil Session User yang sedang login
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 2. Ambil Nama Admin dari Profiles
      const { data: profile } = await supabase
        .from('Profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      
      setAdminName(profile?.full_name || user.email?.split('@')[0] || 'Admin')

      // 3. Set Waktu (Awal hari ini jam 00:00:00)
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)

      // 4. Fetch DATA REAL Transaksi Sukses
      const { data: salesData, error: salesError } = await supabase
        .from('Transactions')
        .select('total')
        .eq('created_by', user.id)
        .eq('status', 'SUCCESS')
        .gte('created_at', startOfDay.toISOString())

      if (salesError) throw salesError

      // 5. Fetch DATA REAL Transaksi Retur
      const { data: returnData, error: returnError } = await supabase
        .from('Transactions')
        .select('*')
        .eq('created_by', user.id)
        .eq('status', 'RETURNED')
        .gte('created_at', startOfDay.toISOString())

      if (returnError) throw returnError

      // Perhitungan Matematis
      const totalGross = salesData?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0
      const totalReturnAmount = returnData?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0

      setReport({
        totalGross,
        totalReturnAmount,
        netSales: totalGross - totalReturnAmount,
        orderCount: salesData?.length || 0,
        returnCount: returnData?.length || 0
      })
      setReturns(returnData || [])

    } catch (err: any) {
      console.error("Error fetching shift data:", err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-10 bg-[#F9FAFB] min-h-screen text-black font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* BREADCRUMB */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/admin/pos" className="text-[10px] font-black uppercase text-gray-400 hover:text-black flex items-center gap-2 tracking-[2px] transition-all group">
            <div className="p-2 bg-white rounded-lg shadow-sm group-hover:bg-black group-hover:text-white transition-all">
              <ArrowLeft size={14}/>
            </div>
            Kembali ke POS Kasir
          </Link>
          
          <div className="hidden md:flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">System Live Monitoring</span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="animate-spin text-black" size={40} />
            <p className="text-[10px] font-black uppercase tracking-[4px] text-gray-400 animate-pulse">Menghitung Data Transaksi...</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* HEADER SECTION */}
            <div className="bg-white rounded-[32px] p-8 md:p-12 shadow-xl shadow-black/5 border border-gray-50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
                <TrendingUp size={200} />
              </div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-gray-100 pb-10 mb-10">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-black/20">
                    <ClipboardList size={32} />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none">Laporan Shift</h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[3px] mt-2">HnM Store POS Analytics</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 min-w-[200px]">
                  <div className="flex items-center gap-3 mb-2">
                    <User size={14} className="text-gray-400" />
                    <p className="text-[11px] font-black uppercase italic text-black">{adminName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar size={14} className="text-gray-400" />
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* MAIN STATS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-white p-8 rounded-[24px] border border-gray-100 shadow-sm relative group overflow-hidden">
                  <div className="absolute top-0 right-0 w-1 h-full bg-blue-500" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-3">Penjualan (Gross)</p>
                  <p className="text-2xl font-black italic tracking-tighter">Rp {report?.totalGross.toLocaleString('id-ID')}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-md uppercase">{report?.orderCount} TRX</span>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[24px] border border-gray-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1 h-full bg-red-500" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-3 text-red-400">Total Retur (-)</p>
                  <p className="text-2xl font-black italic tracking-tighter text-red-600">Rp {report?.totalReturnAmount.toLocaleString('id-ID')}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-[9px] font-black bg-red-50 text-red-600 px-2 py-1 rounded-md uppercase">{report?.returnCount} TRX</span>
                  </div>
                </div>

                <div className="bg-black p-8 rounded-[24px] shadow-2xl shadow-black/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1 h-full bg-green-500" />
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-[2px] mb-3">Net Cash (Di Laci)</p>
                  <p className="text-3xl font-black italic text-white tracking-tighter">Rp {report?.netSales.toLocaleString('id-ID')}</p>
                  <p className="text-[9px] font-bold text-green-500 uppercase mt-4 tracking-[2px] flex items-center gap-1">
                    <Banknote size={10} /> Wajib Setoran
                  </p>
                </div>
              </div>

              {/* LIST RETUR SECTION */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                   <h3 className="text-[11px] font-black uppercase text-black tracking-[3px] flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-500" /> Bukti Fisik Retur
                  </h3>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">{returns.length} Data Terlampir</span>
                </div>
                
                {returns.length === 0 ? (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-100 rounded-[24px] p-12 text-center">
                    <ShoppingBag size={32} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Alhamdulillah, Tidak ada retur shift ini</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {returns.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-[20px] hover:shadow-lg hover:border-black transition-all group cursor-default">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden border border-gray-50 relative">
                            <img 
  src={
    item.return_proof_url?.startsWith('http') 
    ? item.return_proof_url 
    : supabase.storage.from('ReturnImage').getPublicUrl(item.return_proof_url).data.publicUrl
  } 
  alt="Bukti Retur" 
  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
  onError={(e) => {
    (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=No+Image'
  }}
/>
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                <Camera size={14} className="text-white" />
                            </div>
                          </div>
                          <div>
                            <p className="text-[12px] font-black uppercase italic tracking-tighter">#{item.id.slice(0,10)}</p>
                            <p className="text-[9px] font-bold text-red-500 uppercase mt-1 leading-tight max-w-[150px]">{item.return_reason || 'Retur Manual'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[14px] font-black italic text-red-600">-Rp {item.total.toLocaleString('id-ID')}</p>
                            <p className="text-[8px] font-bold text-gray-300 uppercase mt-1">Verified Proof</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ACTION FOOTER */}
              <div className="mt-12 pt-10 border-t border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                <p className="text-[9px] font-bold text-gray-400 uppercase italic max-w-xs text-center md:text-left">
                  * Laporan ini dihasilkan secara otomatis. Silakan cetak sebagai bukti serah terima shift.
                </p>
                <button 
                  onClick={() => window.print()}
                  className="w-full md:w-auto bg-black text-white px-12 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[3px] flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all active:scale-95 shadow-2xl shadow-black/20"
                >
                  <Printer size={18} /> Cetak Laporan Shift
                </button>
              </div>
            </div>

            {/* AGENCY BRANDING */}
            <div className="flex flex-col items-center gap-4 pb-10">
                <div className="h-px w-20 bg-gray-200" />
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-[6px]">
                  Dicoment Agency <span className="text-black">X</span> HnM Store
                </p>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; p: 0 !important; }
          .bg-gray-50, .bg-[#F9FAFB] { background: white !important; }
          button, Link, .breadcrumb { display: none !important; }
          .rounded-[32px] { border-radius: 0 !important; border: none !important; shadow: none !important; }
          .shadow-xl, .shadow-2xl { box-shadow: none !important; }
          .max-w-4xl { max-width: 100% !important; }
        }
      `}</style>
    </div>
  )
}