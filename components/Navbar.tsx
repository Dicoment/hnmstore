'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShoppingBag, Menu, X, Search } from 'lucide-react'

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav className={`fixed top-0 w-full z-[100] transition-all duration-500 ${isScrolled ? 'bg-white/90 backdrop-blur-md py-4 border-b border-zinc-100 shadow-sm' : 'bg-transparent py-8'}`}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        
        {/* LOGO */}
        <Link href="/" className={`text-2xl font-black uppercase tracking-tighter transition-colors duration-500 ${isScrolled ? 'text-black' : 'text-white'}`}>
          HnM<span className={isScrolled ? 'text-zinc-400' : 'text-zinc-500'}>Store</span>
        </Link>

        {/* DESKTOP LINKS */}
        <div className={`hidden md:flex items-center gap-10 text-[10px] font-black uppercase tracking-[0.3em] ${isScrolled ? 'text-black' : 'text-white/80'}`}>
          <Link href="/produk" className="hover:text-zinc-500 transition-colors">Katalog</Link>
          <Link href="/brands" className="hover:text-zinc-500 transition-colors">Brands</Link>
          <Link href="/new-arrival" className="hover:text-zinc-500 transition-colors">New Arrival</Link>
          
        </div>

        {/* ICONS */}
        <div className={`flex items-center gap-6 ${isScrolled ? 'text-black' : 'text-white'}`}>
          <button className="hover:scale-110 transition-transform"><Search size={20} /></button>
          <Link href="/produk" className="relative hover:scale-110 transition-transform">
            <ShoppingBag size={20} />
            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">0</span>
          </Link>
          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden">
            {mobileMenu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU - FIX BIAR GAK NGAMBANG */}
<div className={`fixed inset-0 bg-black z-[200] transition-all duration-500 flex flex-col items-center justify-center gap-8 ${mobileMenu ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
  {/* Tombol Close khusus di Mobile Menu biar user gak bingung */}
  <button onClick={() => setMobileMenu(false)} className="absolute top-8 right-8 text-white">
    <X size={32} />
  </button>
  
  {['Katalog', 'Brands', 'New Arrival', 'Admin'].map((item) => (
    <Link 
      key={item} 
      href={item === 'Katalog' ? '/produk' : `/${item.toLowerCase()}`} 
      onClick={() => setMobileMenu(false)}
      className="text-white text-4xl font-black uppercase tracking-tighter hover:text-zinc-500 transition-colors"
    >
      {item}
    </Link>
  ))}
</div>
    </nav>
  )
}