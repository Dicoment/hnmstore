'use client'

import { useState, useEffect } from "react"
import {
  LayoutDashboard, Tags, Shapes, PanelLeft, PlusCircle, Package, 
  ShoppingCart, Settings, LogOut, User, ImageIcon, Users, 
  MessageSquare, ChevronRight, Boxes, FileBarChart, Menu, 
  X as CloseIcon, RefreshCcw, History, Globe, ArrowLeft
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from 'next/navigation'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false) 
  const [adminName, setAdminName] = useState('Admin')
  const [adminEmail, setAdminEmail] = useState('')
  const [isDataLoaded, setIsDataLoaded] = useState(false) 
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const getAdminData = async () => {
      try {
        const userEmail = localStorage.getItem('user_email')
        if (!userEmail) {
          setIsDataLoaded(true)
          return
        }
        setAdminEmail(userEmail)
        const res = await fetch('/api/vps-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            sql: 'SELECT full_name FROM public."Profiles" WHERE email = $1 LIMIT 1',
            params: [userEmail]
          })
        })
        const result = await res.json()
        if (result.data && result.data.length > 0) {
          setAdminName(result.data[0].full_name || 'Admin')
        }
      } catch (err) {
        console.error("Gagal load profil admin:", err)
      } finally {
        setIsDataLoaded(true)
      }
    }
    getAdminData()
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      localStorage.clear()
      window.location.replace('/login')
    } catch (err) {
      localStorage.clear()
      window.location.replace('/login')
    }
  }

  if (!isDataLoaded) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-white text-black">
        <RefreshCcw className="animate-spin mb-4" size={32} />
        <p className="text-[10px] font-bold uppercase tracking-[0.4em]">Dashboard Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans text-black">
      {/* Overlay Mobile */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-60 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - SEMUA LOGIC ASLI AMAN */}
      <aside
        className={`
          bg-white border-r border-gray-200 shadow-xl lg:shadow-sm
          transition-all duration-300 ease-in-out
          fixed h-full z-70 flex flex-col
          ${collapsed ? "w-20" : "w-72 lg:w-64"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="p-6 flex flex-col gap-4 border-b border-gray-50 shrink-0">
          <div className="flex items-center justify-between">
             {(!collapsed || mobileOpen) && (
              <div className="flex items-center gap-2 animate-in fade-in duration-500">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-xs uppercase">
                  HnM
                </div>
                <span className="font-black tracking-tighter text-gray-900 uppercase truncate">Store</span>
              </div>
            )}
            <button
              onClick={() => mobileOpen ? setMobileOpen(false) : setCollapsed(!collapsed)}
              className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl active:scale-90 transition-all"
            >
              {mobileOpen ? <CloseIcon size={20} className="text-black" /> : <PanelLeft size={20} className="hidden lg:block" />}
            </button>
          </div>

          {(!collapsed || mobileOpen) ? (
             <Link 
              href="/" 
              target="_blank"
              className="flex items-center gap-3 px-3 py-2.5 bg-zinc-50 hover:bg-zinc-900 hover:text-white rounded-xl transition-all group border border-zinc-100"
            >
              <Globe size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
              <span className="text-[10px] font-bold uppercase tracking-widest truncate">Visit Website</span>
            </Link>
          ) : (
             <Link 
              href="/" 
              target="_blank"
              className="mx-auto w-10 h-10 bg-zinc-50 hover:bg-black hover:text-white rounded-xl flex items-center justify-center transition-all border border-zinc-100"
              title="Visit Website"
            >
              <Globe size={16} />
            </Link>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
          <SidebarItem href="/admin" icon={<LayoutDashboard size={18} />} label="Dashboard" collapsed={collapsed} mobileOpen={mobileOpen} active={pathname === '/admin'} />

          <SidebarLabel label="Transaksi" collapsed={collapsed} mobileOpen={mobileOpen} />
          <SidebarItem href="/admin/pos" icon={<ShoppingCart size={18} />} label="POS (Kasir)" collapsed={collapsed} mobileOpen={mobileOpen} active={pathname === '/admin/pos'} />
          <SidebarItem href="/admin/pos/riwayat" icon={<History size={18} />} label="Riwayat Transaksi" collapsed={collapsed} mobileOpen={mobileOpen} active={pathname === '/admin/pos/riwayat'} />
          <SidebarItem href="/admin/pos/hutang" icon={<Users size={18} />} label="Hutang Seller" collapsed={collapsed} mobileOpen={mobileOpen} active={pathname === '/admin/pos/hutang'} />
          <SidebarItem href="/admin/pos/laporan-penjualan" icon={<FileBarChart size={18} />} label="Laporan Penjualan" collapsed={collapsed} mobileOpen={mobileOpen} active={pathname === '/admin/pos/laporan-penjualan'} />
          <SidebarItem href="/admin/pos/laporan-shift" icon={<RefreshCcw size={18} />} label="Laporan Shift" collapsed={collapsed} mobileOpen={mobileOpen} active={pathname === '/admin/pos/laporan-shift'} />

          <SidebarLabel label="Katalog Produk" collapsed={collapsed} mobileOpen={mobileOpen} />
          <SidebarItem href="/admin/produk" icon={<Package size={18} />} label="Semua Produk" collapsed={collapsed} mobileOpen={mobileOpen} active={pathname === '/admin/produk'} />
          <SidebarItem href="/admin/brand" icon={<Tags size={18} />} label="Brand" collapsed={collapsed} mobileOpen={mobileOpen} active={pathname === '/admin/brand'} />
          <SidebarItem href="/admin/model" icon={<Shapes size={18} />} label="Model" collapsed={collapsed} mobileOpen={mobileOpen} active={pathname === '/admin/model'} />
          <SidebarItem href="/admin/stok" icon={<Boxes size={18} />} label="Stok Produk" collapsed={collapsed} mobileOpen={mobileOpen} active={pathname === '/admin/stok'} />
          <SidebarItem href="/admin/stok/history" icon={<History size={18} />} label="Mutasi Barang" collapsed={collapsed} mobileOpen={mobileOpen} active={pathname === '/admin/stok/history'} />
          <SidebarItem href="/admin/produk/tambah" icon={<PlusCircle size={18} />} label="Tambah Produk" collapsed={collapsed} mobileOpen={mobileOpen} active={pathname === '/admin/produk/tambah'} />

          <SidebarLabel label="Sistem" collapsed={collapsed} mobileOpen={mobileOpen} />
          <SidebarItem href="/admin/media" icon={<ImageIcon size={18} />} label="Media Manager" collapsed={collapsed} mobileOpen={mobileOpen} active={pathname === '/admin/media'} />
          <SidebarItem href="/admin/tim" icon={<Users size={18} />} label="Kelola Tim" collapsed={collapsed} mobileOpen={mobileOpen} active={pathname === '/admin/tim'} />
          <SidebarItem href="/admin/wa-settings" icon={<MessageSquare size={18} />} label="WhatsApp Admin" collapsed={collapsed} mobileOpen={mobileOpen} active={pathname === '/admin/wa-settings'} />
        </nav>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div className={`flex items-center gap-3 ${(collapsed && !mobileOpen) ? "justify-center" : ""}`}>
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white shadow-lg shrink-0">
              <User size={20} />
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-gray-900 truncate uppercase tracking-tighter">{adminName}</p>
                <p className="text-[11px] font-bold text-gray-400 truncate tracking-tight">{adminEmail}</p>
              </div>
            )}
          </div>
          {(!collapsed || mobileOpen) && (
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Link href="/admin/profile" className="flex items-center justify-center gap-1.5 py-2.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 active:bg-gray-50">
                <Settings size={12} /> Profil
              </Link>
              <button onClick={handleLogout} className="flex items-center justify-center gap-1.5 py-2.5 bg-red-50 border border-red-100 rounded-lg text-xs font-bold text-red-600 active:bg-red-100 transition-all">
                <LogOut size={12} /> Keluar
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${collapsed ? "lg:ml-20" : "lg:ml-64"} ml-0 min-w-0`}>
        {/* HEADER: BACK (Kiri) - JUDUL (Tengah) - HAMBURGER (Kanan) */}
        <header className="h-16 lg:h-20 bg-white border-b border-gray-200 px-4 flex items-center sticky top-0 z-40">
          <div className="flex-none w-10">
            <button onClick={() => router.back()} className="text-black active:scale-90 p-1">
              <ArrowLeft size={24} />
            </button>
          </div>

          <div className="flex-1 flex justify-center overflow-hidden">
            <h1 className="font-bold text-gray-900 text-sm lg:text-xl uppercase tracking-widest truncate">
              {pathname === '/admin' ? 'Overview' : pathname?.split('/').pop()?.replace('-', ' ')}
            </h1>
          </div>

          <div className="flex-none w-10 flex justify-end">
            <button 
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-black active:scale-90 p-1"
            >
              <Menu size={24} />
            </button>
          </div>
        </header>

        <main className="p-4 lg:p-6 flex-1 text-black bg-white pb-28 lg:pb-6">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
            {children}
          </div>
        </main>

        {/* BOTTOM NAV MOBILE: PUTIH & CLEAN */}
        <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 px-6 flex justify-between items-center z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <BottomNavItem href="/admin" icon={<LayoutDashboard size={22} />} label="DASH" active={pathname === '/admin'} />
          <BottomNavItem href="/admin/pos" icon={<ShoppingCart size={22} />} label="KASIR" active={pathname === '/admin/pos'} />
          
          <div className="relative -top-5">
             <Link href="/admin/produk/tambah" className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center shadow-2xl transition-all">
                <PlusCircle size={32} />
             </Link>
          </div>

          <BottomNavItem href="/admin/pos/laporan-shift" icon={<RefreshCcw size={22} />} label="SHIFT" active={pathname === '/admin/pos/laporan-shift'} />
          <BottomNavItem href="/admin/profile" icon={<Settings size={22} />} label="Setting" active={pathname === '/admin/profile'} />
        </nav>
      </div>
    </div>
  )
}

function BottomNavItem({ href, icon, label, active }: any) {
  return (
    <Link href={href} className={`flex flex-col items-center gap-1 transition-all ${active ? "text-black" : "text-gray-400"}`}>
      {icon}
      <span className="text-[8px] font-bold tracking-widest">{label}</span>
      {active && <div className="w-1 h-1 bg-black rounded-full" />}
    </Link>
  )
}

function SidebarLabel({ label, collapsed, mobileOpen }: { label: string, collapsed: boolean, mobileOpen: boolean }) {
  if (collapsed && !mobileOpen) return <div className="border-t border-gray-100 my-4 mx-auto w-10" />
  return <p className="pt-6 pb-2 px-3 text-xs font-bold uppercase tracking-[2px] text-gray-400">{label}</p>
}

function SidebarItem({ href, icon, label, collapsed, mobileOpen, active }: any) {
  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 px-3 py-3 rounded-xl transition-all group active:scale-[0.98]
        ${active ? "bg-black text-white shadow-lg" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}
        ${(collapsed && !mobileOpen) ? "justify-center" : ""}
      `}
    >
      <span className={`${active ? "text-white" : "text-gray-400 group-hover:text-gray-900"} shrink-0`}>{icon}</span>
      {(!collapsed || mobileOpen) && <span className="text-[13px] font-bold uppercase tracking-tight truncate">{label}</span>}
      {(!collapsed || mobileOpen) && active && <ChevronRight size={14} className="ml-auto opacity-50 shrink-0" />}
    </Link>
  )
}