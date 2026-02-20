'use client'

import { useState, useEffect } from "react"
import {
  LayoutDashboard, Tags, Shapes, PanelLeft, PlusCircle, Package, 
  ShoppingCart, Settings, LogOut, User, ImageIcon, Users, 
  MessageSquare, ChevronRight, Boxes, FileBarChart, Menu, 
  X as CloseIcon, RefreshCcw, History
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false) 
  const [adminName, setAdminName] = useState('Admin')
  const [adminEmail, setAdminEmail] = useState('')
  const pathname = usePathname()
  const router = useRouter()

  // Inisialisasi Auth Client (Hanya untuk Session)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const getAdminData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        window.location.href = '/login'
        return
      }

      setAdminEmail(user.email || '')
      
      // Ambil Nama Admin dari Database Eksternal (Full VPS)
      try {
        const res = await fetch('/api/vps-db', {
          method: 'POST',
          body: JSON.stringify({ 
            sql: 'SELECT full_name FROM public."Profiles" WHERE id = $1 LIMIT 1',
            params: [user.id]
          })
        })
        const result = await res.json()
        if (result.data?.[0]) {
          setAdminName(result.data[0].full_name)
        }
      } catch (err) {
        console.error("Gagal load profil admin:", err)
      }
    }
    getAdminData()
  }, [supabase])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    window.location.href = '/login'
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

      {/* Sidebar */}
      <aside
        className={`
          bg-white border-r border-gray-200 shadow-xl lg:shadow-sm
          transition-all duration-300 ease-in-out
          fixed h-full z-70 flex flex-col
          ${collapsed ? "w-20" : "w-72 lg:w-64"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="p-6 flex items-center justify-between border-b border-gray-50 shrink-0">
          {(!collapsed || mobileOpen) && (
            <div className="flex items-center gap-2 animate-in fade-in duration-500">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shrink-0 text-white font-black text-xs uppercase">
                HnM
              </div>
              <span className="font-black   tracking-tighter text-gray-900 uppercase truncate">Store</span>
            </div>
          )}
          <button
            onClick={() => mobileOpen ? setMobileOpen(false) : setCollapsed(!collapsed)}
            className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl active:scale-90 transition-all"
          >
            {mobileOpen ? <CloseIcon size={20} className="text-black" /> : <PanelLeft size={20} className="hidden lg:block" />}
          </button>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
          <SidebarItem href="/admin" icon={<LayoutDashboard size={18} />} label="Dashboard" collapsed={collapsed} mobileOpen={mobileOpen} active={pathname === '/admin'} />

          <SidebarLabel label="Transaksi" collapsed={collapsed} mobileOpen={mobileOpen} />
          <SidebarItem href="/admin/pos" icon={<ShoppingCart size={18} />} label="POS (Kasir)" collapsed={collapsed} mobileOpen={mobileOpen} active={pathname === '/admin/pos'} />
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

        {/* Profile Footer */}
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
        <header className="h-16 lg:h-20 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4 overflow-hidden">
            <button 
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2.5 bg-gray-100 rounded-xl text-black active:scale-90 shrink-0"
            >
              <Menu size={20} />
            </button>
            <h1 className="font-black text-gray-900 text-sm lg:text-xl uppercase tracking-tighter truncate  ">
              {pathname === '/admin' ? 'Overview' : pathname?.split('/').pop()?.replace('-', ' ')}
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-right">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</p>
              <p className="text-xs font-black text-green-500 uppercase flex items-center justify-end gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Terhubung
              </p>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6 flex-1 text-black bg-white">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

function SidebarLabel({ label, collapsed, mobileOpen }: { label: string, collapsed: boolean, mobileOpen: boolean }) {
  if (collapsed && !mobileOpen) return <div className="border-t border-gray-100 my-4 mx-auto w-10" />
  return <p className="pt-6 pb-2 px-3 text-xs font-black uppercase tracking-[2px] text-gray-400  ">{label}</p>
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
      {(!collapsed || mobileOpen) && <span className="text-[13px] font-black uppercase tracking-tight truncate">{label}</span>}
      {(!collapsed || mobileOpen) && active && <ChevronRight size={14} className="ml-auto opacity-50 shrink-0" />}
    </Link>
  )
}