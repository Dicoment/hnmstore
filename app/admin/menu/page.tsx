'use client'

import Link from 'next/link'
import { 
  ShoppingCart, History, Users, FileBarChart, RefreshCw, 
  Package, Tag, LayoutGrid, Box, ArrowRightLeft, PlusCircle 
} from 'lucide-react'

export default function MenuGrid() {
  const menuTransaksi = [
    { title: 'POS (Kasir)', icon: <ShoppingCart size={24} />, href: '/admin/pos' },
    { title: 'Riwayat Transaksi', icon: <History size={24} />, href: '/admin/pos/riwayat' },
    { title: 'Hutang Seller', icon: <Users size={24} />, href: '/admin/pos/hutang' },
    { title: 'Laporan Penjualan', icon: <FileBarChart size={24} />, href: '/admin/pos/laporan-penjualan' },
    { title: 'Laporan Shift', icon: <RefreshCw size={24} />, href: '/admin/pos/laporan-shift' },
  ]

  const menuKatalog = [
    { title: 'Semua Produk', icon: <Package size={24} />, href: '/admin/produk' },
    { title: 'Brand', icon: <Tag size={24} />, href: '/admin/brand' },
    { title: 'Model', icon: <LayoutGrid size={24} />, href: '/admin/model' },
    { title: 'Stok Produk', icon: <Box size={24} />, href: '/admin/stok' },
    { title: 'Mutasi Barang', icon: <ArrowRightLeft size={24} />, href: '/admin/stok/history' },
    { title: 'Tambah Produk', icon: <PlusCircle size={24} />, href: '/admin/tambah-produk' },
  ]

  return (
    <div className="p-2 min-h-screen space-y-10">
      
      {/* SECTION TRANSAKSI */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-800 mb-4 px-2">Transaksi</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {menuTransaksi.map((item, idx) => (
            <Link key={idx} href={item.href} className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors shadow-sm text-center">
              <div className="text-gray-700 mb-3">{item.icon}</div>
              <span className="text-sm font-normal text-gray-700">{item.title}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* SECTION KATALOG PRODUK */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-800 mb-4 px-2">Katalog Produk</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {menuKatalog.map((item, idx) => (
            <Link key={idx} href={item.href} className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors shadow-sm text-center">
              <div className="text-gray-700 mb-3">{item.icon}</div>
              <span className="text-sm font-normal text-gray-700">{item.title}</span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}