'use client'

import { useState, useEffect } from "react"
import {
  LayoutDashboard,
  Tags,
  Shapes,
  PanelLeft,
  PlusCircle,
  Package,
  ShoppingCart,
  Settings,
  LogOut,
  User,
  Image as ImageIcon,
  Users,
  MessageSquare,
  ChevronRight,
  Boxes // Icon tambahan untuk stok
} from "lucide-react"
import Link from "next/link"
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [adminName, setAdminName] = useState('Admin')
  const [adminEmail, setAdminEmail] = useState('')
  const pathname = usePathname()

  // AMBIL DATA ADMIN YANG SEDANG LOGIN
  useEffect(() => {
    const getAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const name = user.user_metadata?.username || user.email?.split('@')[0]
        setAdminName(name)
        setAdminEmail(user.email || '')
      }
    }
    getAdmin()
  }, [])

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) window.location.href = '/login'
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans">

      {/* Sidebar */}
      <aside
        className={`
          bg-white border-r border-gray-200 shadow-sm
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-20" : "w-64"}
          flex flex-col fixed h-full z-50
        `}
      >
        {/* Header Logo */}
        <div className="p-6 flex items-center justify-between border-b border-gray-50">
          {!collapsed && (
            <div className="flex items-center gap-2 animate-in fade-in duration-500">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-xs">HnM</span>
              </div>
              <span className="font-black italic tracking-tighter text-gray-900 uppercase">Store</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-400 hover:bg-gray-100 p-2 rounded-xl transition-all active:scale-90"
          >
            <PanelLeft size={20} />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
          
          <SidebarItem 
            href="/admin" 
            icon={<LayoutDashboard size={18} />} 
            label="Dashboard" 
            collapsed={collapsed} 
            active={pathname === '/admin'}
          />

          {/* Group: Sales */}
          <SidebarLabel label="Transaksi" collapsed={collapsed} />
          <SidebarItem 
            href="/admin/pos" 
            icon={<ShoppingCart size={18} />} 
            label="POS (Kasir)" 
            collapsed={collapsed} 
            active={pathname === '/admin/pos'}
          />

          {/* Group: Catalog */}
          <SidebarLabel label="Katalog Produk" collapsed={collapsed} />
          <SidebarItem href="/admin/produk" icon={<Package size={18} />} label="Semua Produk" collapsed={collapsed} active={pathname === '/admin/produk'} />
          <SidebarItem href="/admin/brand" icon={<Tags size={18} />} label="Brand" collapsed={collapsed} active={pathname === '/admin/brand'} />
          <SidebarItem href="/admin/model" icon={<Shapes size={18} />} label="Model" collapsed={collapsed} active={pathname === '/admin/model'} />
          {/* FIX: Mengganti duplikat model menjadi Stok */}
          <SidebarItem href="/admin/stok" icon={<Boxes size={18} />} label="Stok Produk" collapsed={collapsed} active={pathname === '/admin/stok'} />
          <SidebarItem href="/admin/produk/tambah" icon={<PlusCircle size={18} />} label="Tambah Produk" collapsed={collapsed} active={pathname === '/admin/produk/tambah'} />

          {/* Group: Assets & Settings */}
          <SidebarLabel label="Sistem" collapsed={collapsed} />
          <SidebarItem href="/admin/media" icon={<ImageIcon size={18} />} label="Media Manager" collapsed={collapsed} active={pathname === '/admin/media'} />
          <SidebarItem href="/admin/users" icon={<Users size={18} />} label="Kelola Tim" collapsed={collapsed} active={pathname === '/admin/users'} />
          <SidebarItem href="/admin/wa-settings" icon={<MessageSquare size={18} />} label="WhatsApp Admin" collapsed={collapsed} active={pathname === '/admin/wa-settings'} />
        </nav>

        {/* User Profile (Bottom) */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white shadow-lg shadow-black/20 shrink-0">
              <User size={20} />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0 animate-in slide-in-from-left-2">
                <p className="text-xs font-black text-gray-900 truncate uppercase">{adminName}</p>
                <p className="text-[9px] font-bold text-gray-400 truncate">{adminEmail}</p>
              </div>
            )}
          </div>
          
          {!collapsed && (
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Link 
                href="/admin/profile" 
                className="flex items-center justify-center gap-1.5 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-gray-600 hover:bg-gray-50 transition-all"
              >
                <Settings size={12} /> Profil
              </Link>
              <button 
                onClick={handleLogout}
                className="flex items-center justify-center gap-1.5 py-2 bg-red-50 border border-red-100 rounded-lg text-[10px] font-bold text-red-600 hover:bg-red-100 transition-all"
              >
                <LogOut size={12} /> Keluar
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div 
        className={`flex-1 flex flex-col transition-all duration-300 ${collapsed ? "ml-20" : "ml-64"}`}
      >
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-8 py-6 flex items-center justify-between sticky top-0 z-40">
          <div>
            <h1 className="font-black text-gray-900 text-xl uppercase tracking-tighter italic">
              {pathname === '/admin' ? 'Overview' : pathname?.split('/').pop()?.replace('-', ' ')}
            </h1>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Status Sistem</p>
              <p className="text-xs font-black text-green-500 uppercase flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Online
              </p>
            </div>
          </div>
        </header>

        <main className="p-6 flex-1">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

// SUB-COMPONENTS
function SidebarLabel({ label, collapsed }: { label: string, collapsed: boolean }) {
  if (collapsed) return <div className="border-t border-gray-100 my-4 mx-auto w-10" />
  return <p className="pt-6 pb-2 px-3 text-[10px] font-black uppercase tracking-[2px] text-gray-400">{label}</p>
}

function SidebarItem({
  href,
  icon,
  label,
  collapsed,
  active
}: {
  href: string
  icon: React.ReactNode
  label: string
  collapsed: boolean
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 px-3 py-3 rounded-xl transition-all group
        ${active 
          ? "bg-black text-white shadow-lg shadow-black/10" 
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}
        ${collapsed ? "justify-center" : ""}
      `}
    >
      <span className={`${active ? "text-white" : "text-gray-400 group-hover:text-gray-900"} transition-colors`}>
        {icon}
      </span>
      {!collapsed && (
        <span className="text-[13px] font-bold uppercase tracking-tight">
          {label}
        </span>
      )}
      {!collapsed && active && (
        <ChevronRight size={14} className="ml-auto opacity-50" />
      )}
    </Link>
  )
}