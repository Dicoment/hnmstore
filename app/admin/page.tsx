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
  Loader2,
  Wallet,
  Plus
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    omzet: 0,
    orders: 0,
    soldItems: 0,
    lowStock: 0,
    piutang: 0
  })
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

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
          (SELECT sum(total) FROM public."Transactions" 
           WHERE payment_status = 'HUTANG' AND status = 'SUCCESS') as total_piutang,
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
        lowStock: Number(db.low_stock_count || 0),
        piutang: Number(db.total_piutang || 0)
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
      <Loader2 className="animate-spin text-gray-700" size={40} />
      <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">Loading Terminal...</p>
    </div>
  )

  return (
    <div className="space-y-6 text-gray-700 font-sans w-full p-2 lg:p-0">
      
      {/* 1. STATS GRID - LENGKAP 5 KARTU */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Omzet Hari Ini" value={`Rp ${stats.omzet.toLocaleString()}`} icon={<TrendingUp size={20} />} color="bg-green-500" textColor="text-green-600" />
        <StatCard label="Order Berhasil" value={`${stats.orders} TRX`} icon={<ShoppingCart size={20} />} color="bg-blue-500" textColor="text-blue-600" />
        <StatCard label="Total Piutang" value={`Rp ${stats.piutang.toLocaleString()}`} icon={<Wallet size={20} />} color="bg-red-600" textColor="text-red-600" />
        <StatCard label="Barang Terjual" value={`${stats.soldItems} Psg`} icon={<Package size={20} />} color="bg-zinc-900" textColor="text-zinc-900" />
        <StatCard label="Stok Kritis" value={`${stats.lowStock} Item`} icon={<AlertTriangle size={20} />} color="bg-orange-500" textColor="text-orange-600" />
      </div>

      {/* 2. CHART SECTION */}
      <div className="bg-white border border-zinc-100 rounded-xl p-6 lg:p-8 shadow-sm">
        <h2 className="text-xs font-medium uppercase tracking-widest flex items-center gap-3 mb-10 text-zinc-400">
          <BarChart3 size={18} /> Penjualan 7 Hari Terakhir
        </h2>
        <div className="h-56 flex items-end justify-between gap-2 lg:gap-4 px-2">
          {weeklyData.map((day, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-4 group relative h-full justify-end">
              <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all bg-black text-white text-xs font-medium py-2 px-3 rounded-lg z-10 whitespace-nowrap">
                Rp {day.value.toLocaleString()}
              </div>
              <div 
                className={`w-full max-w-10 rounded-t-lg transition-all duration-700 ${idx === 6 ? 'bg-black shadow-lg shadow-black/20' : 'bg-zinc-100 group-hover:bg-zinc-200'}`}
                style={{ height: `${(day.value / maxOmzet) * 100}%`, minHeight: '8px' }}
              />
              <span className="text-xs font-medium text-zinc-400 uppercase">{day.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3. LOG AKTIVITAS */}
        <div className="lg:col-span-2 bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-50 flex justify-between items-center bg-zinc-50/50">
            <h2 className="text-xs font-medium uppercase tracking-widest flex items-center gap-3">
              <History size={18} /> Mutasi Stok Terbaru
            </h2>
            <Link href="/admin/stok/history" className="text-xs font-medium bg-black text-white px-4 py-2 rounded-xl uppercase">Lihat Semua</Link>
          </div>
          <div className="divide-y divide-zinc-50">
            {recentLogs.map((log) => (
              <div key={log.id} className="p-5 flex items-center justify-between hover:bg-zinc-50 transition-all">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`p-2.5 rounded-xl border ${log.type === 'MASUK' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                    {log.type === 'MASUK' ? <Package size={18} /> : <ShoppingCart size={18} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase truncate text-gray-700 leading-none mb-1.5">{log.product_name}</p>
                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-tight">SZ {log.size_value} • {log.type} • {log.admin_name || 'Admin'}</p>
                  </div>
                </div>
                <div className={`font-medium text-sm ${log.new_stock > log.old_stock ? 'text-green-600' : 'text-red-600'}`}>
                  {log.new_stock > log.old_stock ? `+${log.new_stock - log.old_stock}` : log.new_stock - log.old_stock}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. AKSI CEPAT - LENGKAP */}
        <div className="bg-zinc-900 p-8 rounded-xl shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10 space-y-8">
            <h2 className="text-xs font-medium uppercase tracking-widest text-white/50 border-l-2 border-white/50 pl-3">Aksi Cepat</h2>
            <div className="space-y-4">
              <Link href="/admin/pos" className="flex items-center justify-between p-5 bg-white text-gray-700 rounded-xl font-medium text-xs uppercase hover:scale-[1.02] transition-all group">
                POS Kasir <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
              </Link>
              <Link href="/admin/produk/tambah" className="flex items-center justify-between p-5 bg-zinc-800 text-white rounded-xl font-medium text-xs uppercase hover:bg-zinc-700 transition-all group">
                Inventory Baru <Plus size={18} className="group-hover:rotate-90 transition-transform" />
              </Link>
              <Link href="/admin/pos/hutang" className="flex items-center justify-between p-5 bg-red-600 text-white rounded-xl font-medium text-xs uppercase hover:bg-red-500 transition-all">
                Tagih Seller <Wallet size={18} />
              </Link>
            </div>
          </div>
          <p className="relative z-10 text-xs font-medium text-zinc-500 uppercase tracking-widest mt-10">Dashboard HNM Store</p>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color, textColor }: any) {
  return (
    <div className="bg-white p-5 lg:p-6 rounded-xl border border-zinc-100 shadow-sm flex flex-col gap-5 hover:border-black transition-all group h-full">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-1 leading-none">{label}</p>
        <p className={`text-lg lg:text-xl font-medium ${textColor} tracking-tight leading-none`}>{value}</p>
      </div>
    </div>
  )
}