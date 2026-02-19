'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  AlertTriangle,
  History,
  ArrowRight,
  BarChart3
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

  async function fetchDashboardData() {
    try {
      setLoading(true)
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(today.getDate() - 6)

      // 1. Fetch Transaksi Hari Ini
      const { data: txData } = await supabase
        .from('Transactions')
        .select('total, items_count')
        .eq('status', 'SUCCESS')
        .gte('created_at', today.toISOString())

      // 2. Fetch Stok Tipis (< 3)
      const { count: lowStockCount } = await supabase
        .from('ProductSizeStock')
        .select('*', { count: 'exact', head: true })
        .lt('stock', 3)
        .gt('stock', 0)

      // 3. Fetch History Terbaru dari StockLog
      const { data: logs } = await supabase
        .from('StockLog')
        .select('*, Profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(5)

      // 4. Fetch Penjualan 7 Hari Terakhir untuk Grafik
      const { data: last7Days } = await supabase
        .from('Transactions')
        .select('total, created_at')
        .eq('status', 'SUCCESS')
        .gte('created_at', sevenDaysAgo.toISOString())

      // Proses Data Grafik biar batangnya naik
      const chartData = processWeeklyChart(last7Days || [])
      setWeeklyData(chartData)

      const totalOmzet = txData?.reduce((sum, tx) => sum + tx.total, 0) || 0
      const totalSold = txData?.reduce((sum, tx) => sum + tx.items_count, 0) || 0

      setStats({
        omzet: totalOmzet,
        orders: txData?.length || 0,
        soldItems: totalSold,
        lowStock: lowStockCount || 0
      })
      setRecentLogs(logs || [])
    } catch (err) {
      console.error(err)
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
        .reduce((sum, tx) => sum + tx.total, 0)
      result.push({ label: dayName, value: dayTotal })
    }
    return result
  }

  // LOGIC FIX: Cari nilai tertinggi buat pembanding grafik (height)
  const currentMax = Math.max(...weeklyData.map(d => d.value), 0)
  const maxOmzet = currentMax === 0 ? 1 : currentMax

  return (
    <div className="space-y-6 text-black">
      
      {/* 1. STATS GRID RESPONSIVE */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="Omzet Hari Ini" value={`Rp ${stats.omzet.toLocaleString()}`} icon={<TrendingUp size={20} className="text-green-500" />} color="bg-green-50" />
        <StatCard label="Order Berhasil" value={`${stats.orders} Order`} icon={<ShoppingCart size={20} className="text-blue-500" />} color="bg-blue-50" />
        <StatCard label="Sepatu Terjual" value={`${stats.soldItems} Psg`} icon={<Package size={20} className="text-purple-500" />} color="bg-purple-50" />
        <StatCard label="Stok Tipis" value={`${stats.lowStock} Item`} icon={<AlertTriangle size={20} className="text-red-500" />} color="bg-red-50" />
      </div>

      {/* 2. CHART - SEKARANG BATANGNYA NAIK */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 lg:p-6">
        <h2 className="text-[14px] font-black uppercase tracking-tight flex items-center gap-2 mb-10">
          <BarChart3 size={18} /> Tren Penjualan 7 Hari Terakhir
        </h2>
        
        <div className="h-40 md:h-56 flex items-end justify-between gap-1 md:gap-4 px-1">
          {weeklyData.map((day, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-3 group relative">
              {/* Tooltip Label pas di-hover */}
              <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] font-black py-1 px-2 rounded whitespace-nowrap z-10 hidden md:block uppercase">
                Rp {day.value.toLocaleString()}
              </div>
              
              {/* Batang Grafik */}
              <div 
                className={`w-full max-w-12 rounded-t-md transition-all duration-700 ease-out shadow-sm ${idx === 6 ? 'bg-black' : 'bg-gray-100 group-hover:bg-gray-200'}`}
                style={{ height: `${(day.value / maxOmzet) * 100}%`, minHeight: '4px' }}
              />
              
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{day.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. LOWER SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-50 flex justify-between items-center">
            <h2 className="text-[14px] font-black uppercase tracking-tight flex items-center gap-2">
              <History size={18} /> Aktivitas Stok Terbaru
            </h2>
            <Link href="/admin/stok/history" className="text-[11px] font-bold text-gray-400 hover:text-black uppercase transition-colors">Lihat Semua</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentLogs.length === 0 ? (
              <div className="p-10 text-center text-[12px] font-bold text-gray-300 uppercase tracking-widest italic">Belum Ada Aktivitas</div>
            ) : recentLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${log.type === 'MASUK' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                    {log.type === 'MASUK' ? <Package size={16} /> : <ShoppingCart size={16} />}
                  </div>
                  <div>
                    <p className="text-[12px] font-black uppercase leading-tight truncate max-w-37 md:max-w-none">{log.product_name}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Size {log.size_value} • {log.type} oleh {log.Profiles?.full_name || 'Admin'}</p>
                  </div>
                </div>
                <div className={`text-right font-black text-[12px] ${log.new_stock > log.old_stock ? 'text-green-600' : 'text-red-600'}`}>
                  {log.new_stock > log.old_stock ? `+${log.new_stock - log.old_stock}` : log.new_stock - log.old_stock}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="bg-black text-white p-6 rounded-2xl shadow-xl h-fit">
          <h2 className="text-[14px] font-black uppercase mb-4 tracking-widest">Aksi Cepat</h2>
          <div className="grid grid-cols-1 gap-2 text-black">
            <Link href="/admin/pos" className="flex items-center justify-between p-4 bg-white hover:bg-gray-100 rounded-xl transition-all group">
              <span className="text-[11px] font-black uppercase tracking-tight">Buka Kasir</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/admin/produk/tambah" className="flex items-center justify-between p-4 bg-white hover:bg-gray-100 rounded-xl transition-all group">
              <span className="text-[11px] font-black uppercase tracking-tight">Tambah Barang</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }: any) {
  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 transition-all hover:border-gray-200">
      <div className={`p-2 md:p-3 rounded-xl ${color}`}>{icon}</div>
      <div>
        <p className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-tight leading-none mb-1">{label}</p>
        <p className="text-[14px] md:text-xl font-black text-gray-900 tracking-tighter truncate leading-none">{value}</p>
      </div>
    </div>
  )
}