'use client'

import Link from 'next/link'
import { Instagram, Facebook, Twitter, ExternalLink } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-zinc-950 text-white border-t border-white/5 pt-20 pb-10 px-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-20">
          
          {/* BRAND BOX */}
          <div className="max-w-xs space-y-6">
            <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
              HnM<span className="text-zinc-500">Store</span>
            </h2>
            <p className="text-zinc-500 text-[10px] font-black leading-relaxed tracking-[0.2em] uppercase">
              Authentic sneakers curator based in Jepara, Indonesia. Built for the bold, styled for the streets.
            </p>
            <div className="flex gap-3">
              <SocialIcon icon={<Instagram size={16}/>} />
              <SocialIcon icon={<Twitter size={16}/>} />
              <SocialIcon icon={<Facebook size={16}/>} />
            </div>
          </div>

          {/* QUICK LINKS */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 border-l-4 border-white pl-3">Navigasi</h4>
            <ul className="grid grid-cols-2 gap-x-12 gap-y-4">
              {['Katalog', 'Brands', 'New Arrival', 'Admin'].map((l) => (
                <li key={l}>
                  <Link 
                    href={l === 'Katalog' ? '/produk' : `/${l.toLowerCase().replace(' ', '-')}`} 
                    className="text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all"
                  >
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="border-t border-white/5 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.5em]">
            © 2026 HnM Store. All Rights Reserved.
          </p>
          
          {/* DICOMENT BRANDING */}
          <a 
            href="https://dicoment.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all"
          >
            Developed by <span className="text-white underline underline-offset-4 decoration-zinc-700 group-hover:decoration-white">Dicoment Agency</span>
            <ExternalLink size={10} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </footer>
  )
}

function SocialIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <button className="w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center text-zinc-500 hover:bg-white hover:text-black hover:border-white transition-all">
      {icon}
    </button>
  )
}