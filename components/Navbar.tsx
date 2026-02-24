'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShoppingBag, Menu, X, Search } from 'lucide-react'

export default function Navbar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [keyword, setKeyword] = useState(searchParams.get('q') || '')

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Lock scroll pas mobile menu kebuka
  useEffect(() => {
    if (mobileMenu) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenu])

  // JURUS SEARCH AKTIF: Lari ke /produk dengan query string [cite: 2026-02-24]
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (keyword.trim()) {
      router.push(`/produk?q=${encodeURIComponent(keyword.trim())}`)
      setShowSearch(false)
      setMobileMenu(false)
    } else {
      router.push('/produk')
    }
  }

  return (
    <nav className={`fixed top-0 w-full z-100 transition-all duration-500 bg-black ${isScrolled ? 'py-4 border-b border-white/10 shadow-2xl' : 'py-7'}`}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-white">
        
        {/* LOGO */}
        <Link href="/" className="text-2xl font-bold uppercase tracking-tighter text-white">
          HnM<span className="text-zinc-500">Store</span>
        </Link>

        {/* DESKTOP LINKS */}
        <div className="hidden md:flex items-center gap-10 text-[12px] font-bold uppercase tracking-widest text-white/70">
          <Link href="/produk" className="hover:text-white transition-colors">Katalog</Link>
          <Link href="/brands" className="hover:text-white transition-colors">Brands</Link>
          <Link href="/new-arrival" className="hover:text-white transition-colors">New Arrival</Link>
        </div>

        {/* ICONS */}
        <div className="flex items-center gap-6 text-white">
          {/* SEARCH TRIGGER */}
          <button 
            onClick={() => setShowSearch(!showSearch)} 
            className="hover:scale-110 transition-transform active:scale-90"
          >
            <Search size={20} />
          </button>
          
          <Link href="/produk" className="relative hover:scale-110 transition-transform">
            <ShoppingBag size={20} />
            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">0</span>
          </Link>

          {/* Hamburger Button */}
          <button onClick={() => setMobileMenu(true)} className="md:hidden p-2 active:scale-90 transition-all">
            <Menu size={28} />
          </button>
        </div>
      </div>

      {/* SEARCH OVERLAY - FIX RESPONSIVE & FUNCTIONAL [cite: 2026-02-24] */}
      <div className={`absolute top-0 left-0 w-full bg-black border-b border-white/10 transition-all duration-500 overflow-hidden ${showSearch ? 'h-24 opacity-100 visible' : 'h-0 opacity-0 invisible'}`}>
        <form onSubmit={handleSearch} className="max-w-7xl mx-auto px-6 h-full flex items-center gap-4">
          <Search size={20} className="text-zinc-500" />
          <input 
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Cari sepatu idaman..."
            className="flex-1 bg-transparent border-none outline-none text-white font-bold uppercase tracking-widest text-sm placeholder:text-zinc-700"
            autoFocus={showSearch}
          />
          <button type="button" onClick={() => setShowSearch(false)} className="text-zinc-500 hover:text-white transition-all">
            <X size={24} />
          </button>
        </form>
      </div>

      {/* MOBILE MENU - FULL RESPONSIVE OVERLAY */}
      <div className={`fixed inset-0 bg-black z-200 flex flex-col items-center justify-center transition-all duration-500 ease-in-out ${mobileMenu ? 'translate-y-0 opacity-100 visible' : '-translate-y-full opacity-0 invisible'}`}>
        
        {/* Tombol Close */}
        <button onClick={() => setMobileMenu(false)} className="absolute top-8 right-8 text-white p-2 active:scale-90 transition-all">
          <X size={35} />
        </button>
        
        {/* Nav Links */}
        <div className="flex flex-col items-center gap-10">
          {['Katalog', 'Brands', 'New Arrival'].map((item) => (
            <Link 
              key={item} 
              href={item === 'Katalog' ? '/produk' : `/${item.toLowerCase().replace(' ', '-')}`} 
              onClick={() => setMobileMenu(false)}
              className="text-white text-4xl font-bold uppercase tracking-tighter hover:text-zinc-500 transition-all"
            >
              {item}
            </Link>
          ))}
          
          {/* MOBILE SEARCH INTEGRATION [cite: 2026-02-24] */}
          <form onSubmit={handleSearch} className="mt-6 relative w-full max-w-xs">
            <input 
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="CARI..."
              className="w-full bg-zinc-900 border-none rounded-xl px-6 py-4 text-white font-bold uppercase tracking-widest text-xs outline-none focus:ring-1 focus:ring-white/20 transition-all"
            />
            <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">
              <Search size={18} />
            </button>
          </form>
        </div>

        {/* Brand Label Bawah */}
        <div className="absolute bottom-10 text-white/20 text-[12px] font-bold uppercase tracking-[1em]">
          HNM STORE
        </div>
      </div>
    </nav>
  )
}