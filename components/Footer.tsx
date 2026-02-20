'use client'

import Link from 'next/link'
import { Instagram, ExternalLink } from 'lucide-react'

const TikTokIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
)

export default function Footer() {
  return (
    <footer className="bg-zinc-950 text-white border-t border-white/5 pt-24 pb-12 px-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-16 mb-24">
          
          {/* 1. BRAND BOX */}
          <div className="lg:col-span-2 space-y-8">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-white">
              HnM<span className="text-zinc-500">Store</span>
            </h2>
            <p className="text-zinc-400 text-sm font-medium leading-relaxed max-w-sm">
              Authentic sneakers curator based in Jepara, Indonesia. Built for the bold, styled for the streets.
            </p>
            <div className="flex gap-4">
              <a href="https://www.instagram.com/hnm_store_id?igsh=bXRrYWJtbDdwY3cx" target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-zinc-400 hover:bg-white hover:text-black hover:border-white transition-all duration-500">
                <Instagram size={20} />
              </a>
              <a href="https://www.tiktok.com/@hnm_store12?_r=1&_t=ZS-93YkEWx2j9F" target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-zinc-400 hover:bg-white hover:text-black hover:border-white transition-all duration-500">
                <TikTokIcon size={20} />
              </a>
            </div>
          </div>

          {/* 2. NAVIGASI - UPDATE: DITAMBAHKAN KEBIJAKAN RETUR */}
          <div className="space-y-8">
            <h4 className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-600">Navigasi</h4>
            <ul className="space-y-4">
              {[
                { name: 'Home', href: '/' },
                { name: 'Katalog', href: '/produk' },
                { name: 'New Arrival', href: '/new-arrival' },
                { name: 'Kebijakan Retur', href: '/kebijakan-retur' }, // Link baru
              ].map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 3. KATEGORI */}
          <div className="space-y-8">
            <h4 className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-600">Kategori</h4>
            <ul className="space-y-4">
              {[
                { name: 'Casual', id: 'casual' }, 
                { name: 'Running', id: 'running' }
              ].map((item) => (
                <li key={item.name}>
                  <Link href={`/produk?model=${item.id}`} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 4. BRANDS */}
          <div className="space-y-8">
            <h4 className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-600">Top Brands</h4>
            <ul className="space-y-4">
              {['Nike','Asics', 'Adidas', 'Puma', 'New Balance'].map((item) => (
                <li key={item}>
                  <Link href={`/produk?brand=${item.toLowerCase()}`} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* BOTTOM BAR */}
        <div className="border-t border-white/5 pt-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-xs font-medium text-zinc-500 tracking-wider">
            © 2026 HnM Store. All Rights Reserved.
          </p>
          
          <a href="https://dicoment.com" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-white transition-all">
            Developed by <span className="text-white underline underline-offset-8 decoration-zinc-800 group-hover:decoration-white transition-all">Dicoment Agency</span>
            <ExternalLink size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </footer>
  )
}