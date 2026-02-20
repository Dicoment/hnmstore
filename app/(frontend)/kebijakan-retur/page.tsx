'use client'

import { useState } from 'react'
import { 
  ShieldCheck, ArrowLeft, ChevronDown, 
  AlertCircle, Truck, RefreshCcw, Camera, Package 
} from 'lucide-react'
import Link from 'next/link'

export default function ReturnPolicyPage() {
  const [openSection, setOpenSection] = useState<number | null>(0)

  const sections = [
    {
      title: "Jangka Waktu Pengembalian",
      icon: <RefreshCcw size={20} />,
      content: "Permintaan pengembalian atau penukaran barang maksimal dilakukan 2 x 24 jam setelah status pesanan dinyatakan 'Diterima' oleh pihak ekspedisi. Laporan di luar batas waktu tersebut tidak akan diproses."
    },
    {
      title: "Syarat Wajib: Video Unboxing",
      icon: <Camera size={20} />,
      content: "Pelanggan WAJIB melampirkan video unboxing tanpa terputus (tanpa edit/sensor) yang memperlihatkan label pengiriman, proses buka paket, dan detail fisik barang. Tanpa video unboxing, komplain ditolak."
    },
    {
      title: "Kondisi Barang & Tag",
      icon: <Package size={20} />,
      content: "Sepatu harus dalam kondisi baru (BNIB), belum pernah dipakai jalan, tag masih terpasang, dan kotak original utuh. Kami menolak retur jika outsole kotor atau ada indikasi sepatu sudah dipakai."
    },
    {
      title: "Biaya Pengiriman (Ongkir)",
      icon: <Truck size={20} />,
      content: "Jika kesalahan dari HnM Store (salah kirim/cacat), ongkir ditanggung kami. Jika ingin tukar size atas keinginan sendiri, ongkir pulang-pergi ditanggung pembeli."
    }
  ]

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      
      {/* NAVBAR SIMPLE */}
      <nav className="p-6 border-b-2 border-zinc-50 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <Link href="/" className="flex items-center gap-2 font-black text-xs uppercase tracking-widest hover:opacity-60 transition-all">
          <ArrowLeft size={16} /> Kembali
        </Link>
        <div className="text-sm font-black italic tracking-tighter uppercase">HnM Store <span className="text-zinc-300">Policy.</span></div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        
        {/* HERO SECTION */}
        <div className="mb-16 md:mb-24 space-y-6">
          <div className="inline-flex items-center gap-2 bg-zinc-100 px-4 py-1.5 rounded-xl">
            <ShieldCheck size={14} className="text-black" />
            <span className="text-[10px] font-black uppercase tracking-widest">Guaranteed Authentic</span>
          </div>
          <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none italic">
            Return <br />
            <span className="text-zinc-200">Policy.</span>
          </h1>
          <p className="max-w-xl text-zinc-400 text-xs md:text-sm font-bold uppercase tracking-[0.2em] leading-relaxed">
            Komitmen kami adalah kepuasan Anda. Jika barang tidak sesuai, kami siap membantu proses penukaran dengan prosedur yang transparan.
          </p>
        </div>

        {/* POLICY ACCORDION */}
        <div className="space-y-4">
          {sections.map((sec, idx) => (
            <div 
              key={idx} 
              className={`border-2 transition-all duration-300 rounded-xl overflow-hidden ${openSection === idx ? 'border-black bg-zinc-50 shadow-[10px_10px_0px_0px_rgba(0,0,0,0.05)]' : 'border-zinc-100 bg-white hover:border-zinc-200'}`}
            >
              <button 
                onClick={() => setOpenSection(openSection === idx ? null : idx)}
                className="w-full p-6 md:p-8 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl transition-colors ${openSection === idx ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                    {sec.icon}
                  </div>
                  <h3 className="font-black uppercase tracking-tight text-sm md:text-base">{sec.title}</h3>
                </div>
                <ChevronDown className={`transition-transform duration-500 ${openSection === idx ? 'rotate-180' : ''}`} />
              </button>
              
              <div className={`transition-all duration-500 ease-in-out ${openSection === idx ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-6 md:px-8 pb-8 pt-2">
                  <p className="text-zinc-500 font-bold text-xs md:text-sm leading-relaxed uppercase tracking-wider">
                    {sec.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* IMPORTANT NOTES */}
        <div className="mt-16 p-8 md:p-12 bg-zinc-900 rounded-xl text-white space-y-6 shadow-2xl">
          <div className="flex items-center gap-4 border-b border-white/10 pb-6">
            <AlertCircle size={32} className="text-red-500" />
            <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">Catatan Penting</h2>
          </div>
          <ul className="space-y-4 text-[11px] md:text-xs font-black uppercase tracking-widest text-zinc-400">
            <li className="flex gap-4"><span className="text-white">01.</span> Pengembalian dana (Refund) hanya berlaku jika stok pengganti habis.</li>
            <li className="flex gap-4"><span className="text-white">02.</span> Proses QC barang retur memakan waktu 1-3 hari kerja setelah barang kami terima.</li>
            <li className="flex gap-4"><span className="text-white">03.</span> Pastikan box sepatu dilapisi plastik saat pengiriman balik agar box tidak rusak terkena lakban.</li>
          </ul>
          
          <div className="pt-8">
            <a 
              href="https://wa.me/6282138241048" 
              className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all active:scale-95 shadow-xl"
            >
              Hubungi Admin WA
            </a>
          </div>
        </div>

        {/* FOOTER TEXT */}
        <div className="mt-20 text-center space-y-2 opacity-20">
          <p className="text-[10px] font-black uppercase tracking-[0.5em]">HnM Store Jepara &copy; 2026</p>
          <p className="text-[8px] font-bold uppercase tracking-widest">Managed by Dicoment Agency</p>
        </div>

      </div>

      <style jsx global>{`
        body { background-color: white; }
      `}</style>
    </div>
  )
}