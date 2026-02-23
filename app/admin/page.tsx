'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  AlertTriangle,
  History,
  ArrowRight,
  BarChart3,
  Loader2
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    omzet: 0,
    orders: 0,
    soldItems: 0,
    lowStock: 0
  })
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // --- LOGIC ASLI LU (TIDAK DISENTUH) ---
  async function fetchDashboardData() {
    try {
      setLoading(true)
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(today.getDate() - 6)

      const sql = `
        SELECT 
          (SELECT json_agg(t.*) FROM public."Transactions" t 
           WHERE t.status = 'SUCCESS' AND t.created_at >= $1) as daily_tx,
          (SELECT count(*) FROM public."ProductSizeStock" WHERE stock < 3 AND stock > 0) as low_stock_count,
          (SELECT json_agg(logs.*) FROM (
             SELECT sl.*, p.full_name as admin_name 
             FROM public."StockLog" sl 
             LEFT JOIN public."Profiles" p ON sl.created_by = p.id 
             ORDER BY sl.created_at DESC LIMIT 5
          ) logs) as recent_logs,
          (SELECT json_agg(tx_week.*) FROM (
             SELECT total, created_at FROM public."Transactions" 
             WHERE status = 'SUCCESS' AND created_at >= $2
          ) tx_week) as weekly_tx
      `
      
      const res = await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({ 
          sql, 
          params: [today.toISOString(), sevenDaysAgo.toISOString()] 
        })
      })
      
      const { data } = await res.json()
      const db = data[0]

      const dailyTransactions = db.daily_tx || []
      const totalOmzet = dailyTransactions.reduce((sum: number, tx: any) => sum + Number(tx.total || 0), 0)
      const totalSold = dailyTransactions.reduce((sum: number, tx: any) => sum + Number(tx.items_count || 0), 0)

      setStats({
        omzet: totalOmzet,
        orders: dailyTransactions.length,
        soldItems: totalSold,
        lowStock: Number(db.low_stock_count || 0)
      })

      setRecentLogs(db.recent_logs || [])
      const chartData = processWeeklyChart(db.weekly_tx || [])
      setWeeklyData(chartData)

    } catch (err) {
      console.error("Gagal load dashboard:", err)
    } finally {
      setLoading(false)
    }
  }

  function processWeeklyChart(data: any[]) {
    const days = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB']
    const result = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dayName = days[date.getDay()]
      const dayTotal = data
        .filter(tx => new Date(tx.created_at).toDateString() === date.toDateString())
        .reduce((sum, tx) => sum + Number(tx.total || 0), 0)
      result.push({ label: dayName, value: dayTotal })
    }
    return result
  }

  const currentMax = Math.max(...weeklyData.map(d => d.value), 0)
  const maxOmzet = currentMax === 0 ? 1 : currentMax

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="animate-spin text-black" size={40} />
      <p className="text-[12px] font-bold uppercase tracking-widest text-zinc-400">Loading Terminal...</p>
    </div>
  )

  return (
    <div className="space-y-8 text-black font-sans w-full overflow-x-hidden p-4 lg:p-0">
      
      {/* 1. STATS GRID - RESPONSIVE 1 COL MOBILE / 4 COLS DESKTOP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard label="Omzet Hari Ini" value={`Rp ${stats.omzet.toLocaleString()}`} icon={<TrendingUp size={20} />} color="bg-green-500" textColor="text-green-600" />
        <StatCard label="Order Berhasil" value={`${stats.orders} TRX`} icon={<ShoppingCart size={20} />} color="bg-blue-500" textColor="text-blue-600" />
        <StatCard label="Barang Terjual" value={`${stats.soldItems} Unit`} icon={<Package size={20} />} color="bg-zinc-900" textColor="text-zinc-900" />
        <StatCard label="Stok Kritis" value={`${stats.lowStock} Item`} icon={<AlertTriangle size={20} />} color="bg-red-500" textColor="text-red-600" />
      </div>

      {/* 2. CHART SECTION - RATA & CANONICAL CLASSES */}
      <div className="bg-white border border-zinc-100 rounded-2xl p-6 lg:p-8 shadow-sm">
        <h2 className="text-[12px] font-bold uppercase tracking-widest flex items-center gap-3 mb-10">
          <BarChart3 size={18} /> Penjualan 7 Hari Terakhir
        </h2>
        
        <div className="h-64 flex items-end justify-between gap-3 md:gap-6 px-2">
          {weeklyData.map((day, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-4 group relative h-full justify-end">
              <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all bg-black text-white text-[10px] font-bold py-1.5 px-3 rounded-lg whitespace-nowrap z-10 uppercase tracking-widest">
                Rp {day.value.toLocaleString()}
              </div>
              
              <div 
                className={`w-full max-w-10 lg:max-w-12 rounded-t-xl transition-all duration-700 ease-out ${idx === 6 ? 'bg-black shadow-lg shadow-black/20' : 'bg-zinc-100 group-hover:bg-zinc-200'}`}
                style={{ height: `${(day.value / maxOmzet) * 100}%`, minHeight: '8px' }}
              />
              
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{day.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. LOWER SECTION - GRID 1 COL MOBILE / 3 COLS DESKTOP */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* LOG AKTIVITAS - LEBAR DI DESKTOP */}
        <div className="lg:col-span-2 bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-zinc-50 flex justify-between items-center bg-zinc-50/50">
            <h2 className="text-[12px] font-bold uppercase tracking-widest flex items-center gap-3">
              <History size={18} /> Log Mutasi Terbaru
            </h2>
            <Link href="/admin/stok/history" className="text-[10px] font-bold bg-black text-white px-4 py-2 rounded-xl uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-md">Lihat Semua</Link>
          </div>
          <div className="divide-y divide-zinc-50 flex-1 font-bold">
            {recentLogs.length === 0 ? (
              <div className="p-20 text-center text-[12px] font-bold text-zinc-300 uppercase tracking-widest">Belum Ada Aktivitas</div>
            ) : recentLogs.map((log) => (
              <div key={log.id} className="p-6 flex items-center justify-between hover:bg-zinc-50 transition-all group">
                <div className="flex items-center gap-5 min-w-0">
                  <div className={`p-3 rounded-xl border shrink-0 ${log.type === 'MASUK' ? 'bg-green-50 border-green-100 text-green-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                    {log.type === 'MASUK' ? <Package size={20} /> : <ShoppingCart size={20} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-tight group-hover:translate-x-1 transition-transform truncate text-black">{log.product_name}</p>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase mt-1 tracking-wider">
                      SZ {log.size_value} • {log.type} • {log.admin_name || 'Admin'}
                    </p>
                  </div>
                </div>
                <div className={`text-right font-bold text-sm shrink-0 ml-4 ${log.new_stock > log.old_stock ? 'text-green-600' : 'text-red-600'}`}>
                  {log.new_stock > log.old_stock ? `+${log.new_stock - log.old_stock}` : log.new_stock - log.old_stock}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* QUICK ACTIONS - RATA KIRI KANAN */}
        <div className="h-full">
          <div className="bg-zinc-900 text-white p-8 rounded-2xl shadow-xl relative overflow-hidden h-full flex flex-col">
            <div className="relative z-10 flex-1">
              <h2 className="text-sm font-bold uppercase mb-10 tracking-[0.2em] text-white border-l-4 border-white pl-4">Aksi Cepat</h2>
              <div className="space-y-4">
                <Link href="/admin/pos" className="flex items-center justify-between p-5 bg-white text-black hover:scale-[1.02] rounded-2xl transition-all group shadow-xl">
                  <span className="text-xs font-bold uppercase tracking-widest">POS Kasir</span>
                  <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                </Link>
                <Link href="/admin/produk/tambah" className="flex items-center justify-between p-5 bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700 rounded-2xl transition-all group">
                  <span className="text-xs font-bold uppercase tracking-widest">Inventory Baru</span>
                  <PlusIcon size={18} />
                </Link>
              </div>
            </div>
            <div className="relative z-10 pt-10 border-t border-zinc-800 mt-10">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.4em]">HnM Store Control v2.0</p>
            </div>
            {/* DECORATION */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color, textColor }: any) {
  return (
    <div className="bg-white p-6 lg:p-8 rounded-2xl border border-zinc-100 shadow-sm flex flex-col gap-6 transition-all hover:border-black group h-full">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
        <p className={`text-xl lg:text-2xl font-bold ${textColor} tracking-tight truncate`}>{value}</p>
      </div>
    </div>
  )
}

function PlusIcon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-90 transition-transform"><path d="M12 5v14M5 12h14"/></svg>
}