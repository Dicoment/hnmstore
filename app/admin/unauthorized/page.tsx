'use client'

import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react'
import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="relative flex justify-center">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center animate-pulse">
            <ShieldAlert size={48} className="text-red-600" />
          </div>
          <div className="absolute bottom-0 right-1/3 bg-black rounded-lg p-2 shadow-xl">
            <Lock size={16} className="text-white" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black italic tracking-tighter uppercase text-black">
            Akses Ditolak
          </h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
            Maaf, area ini terbatas untuk <span className="text-black">Owner / Super Admin</span> saja. 
            Identitas kamu tercatat sebagai Karyawan.
          </p>
        </div>

        <div className="pt-4">
          <Link 
            href="/admin" 
            className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all active:scale-95 shadow-xl"
          >
            <ArrowLeft size={14} /> Kembali ke Dashboard
          </Link>
        </div>
        
        <p className="text-[9px] font-bold text-gray-300 uppercase tracking-[3px]">
          HnM Security System
        </p>
      </div>
    </div>
  )
}