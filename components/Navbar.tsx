'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShoppingBag, Menu, X, Search } from 'lucide-react'

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Lock scroll pas mobile menu kebuka biar gak lari-lari
  useEffect(() => {
    if (mobileMenu) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenu])

  return (
    <nav className={`fixed top-0 w-full z-[100] transition-all duration-500 bg-black ${isScrolled ? 'py-4 border-b border-white/10 shadow-2xl' : 'py-7'}`}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        
        {/* LOGO */}
        <Link href="/" className="text-2xl font-black uppercase tracking-tighter text-white">
          HnM<span className="text-zinc-500">Store</span>
        </Link>

        {/* DESKTOP LINKS (Link Lu Balik Lagi Ke /produk) */}
        <div className="hidden md:flex items-center gap-10 text-[10px] font-black uppercase tracking-[0.3em] text-white/70">
          <Link href="/produk" className="hover:text-white transition-colors">Katalog</Link>
          <Link href="/brands" className="hover:text-white transition-colors">Brands</Link>
          <Link href="/new-arrival" className="hover:text-white transition-colors">New Arrival</Link>
        </div>

        {/* ICONS */}
        <div className="flex items-center gap-6 text-white">
          <button className="hover:scale-110 transition-transform"><Search size={20} /></button>
          
          <Link href="/produk" className="relative hover:scale-110 transition-transform">
            <ShoppingBag size={20} />
            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">0</span>
          </Link>

          {/* Hamburger Button */}
          <button onClick={() => setMobileMenu(true)} className="md:hidden p-2">
            <Menu size={28} />
          </button>
        </div>
      </div>

      {/* MOBILE MENU - FULL RESPONSIVE OVERLAY */}
      <div className={`fixed inset-0 bg-black z-[200] flex flex-col items-center justify-center transition-all duration-500 ease-in-out ${mobileMenu ? 'translate-y-0 opacity-100 visible' : '-translate-y-full opacity-0 invisible'}`}>
        
        {/* Tombol Close */}
        <button onClick={() => setMobileMenu(false)} className="absolute top-8 right-8 text-white p-2">
          <X size={35} />
        </button>
        
        {/* Nav Links (Link Lu Balik Lagi) */}
        <div className="flex flex-col items-center gap-10">
          {['Katalog', 'Brands', 'New Arrival', ].map((item) => (
            <Link 
              key={item} 
              href={item === 'Katalog' ? '/produk' : `/${item.toLowerCase().replace(' ', '-')}`} 
              onClick={() => setMobileMenu(false)}
              className="text-white text-4xl font-black uppercase tracking-tighter hover:text-zinc-500 transition-all"
            >
              {item}
            </Link>
          ))}
        </div>

        {/* Brand Label Bawah */}
        <div className="absolute bottom-10 text-white/20 text-[10px] font-black uppercase tracking-[1em]">
          HNM STORE
        </div>
      </div>
    </nav>
  )
}