import Link from 'next/link'
import { MoveLeft, Ghost } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-black font-sans p-4 sm:p-6 md:p-10 text-center selection:bg-black selection:text-white">
      {/* IKON GHOST DENGAN UKURAN DINAMIS */}
      <div className="mb-6 sm:mb-8 animate-bounce text-black/80">
        <Ghost className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24" strokeWidth={1.5} />
      </div>

      {/* TEXT ERROR RESPONSIVE */}
      <h1 className="text-7xl sm:text-8xl md:text-9xl font-black italic tracking-tighter leading-none mb-4 drop-shadow-sm">
        404
      </h1>
      
      <div className="max-w-xs sm:max-w-sm md:max-w-md space-y-2 mb-10 sm:mb-12">
        <h2 className="text-lg sm:text-xl md:text-2xl font-black uppercase italic tracking-tight">
          Halaman Hilang dari Katalog
        </h2>
        <p className="text-gray-400 font-bold text-[9px] sm:text-[10px] md:text-xs uppercase tracking-[0.2em] leading-relaxed">
          Link yang lu cari gak ada atau udah dihapus dari server HnM Store.
        </p>
      </div>

      {/* TOMBOL BALIK DENGAN HOVER EFFECT */}
      <Link 
        href="/"
        className="group relative flex items-center gap-3 bg-black text-white px-6 py-3 sm:px-8 sm:py-4 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all hover:bg-zinc-800 active:scale-95 shadow-[0_10px_20px_rgba(0,0,0,0.15)]"
      >
        <MoveLeft size={18} className="transition-transform group-hover:-translate-x-1.5" />
        Balik ke Beranda
      </Link>
    </div>
  )
}