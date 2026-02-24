//'use client'

import { Suspense } from 'react' // Import Suspense
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import FloatingWA from '@/components/FloatingWA'
import { Metadata } from 'next'

export const metadata: Metadata = {
  // 1. Template Judul: Biar otomatis ada akhiran " | HnM Store" [cite: 2026-02-24]
  title: {
    default: 'HnM Store | Authentic Sneaker & Streetwear Jepara',
    template: '%s | HnM Store' 
  },
  
  // 2. Deskripsi Global: Muncul di Google kalau halaman tersebut gak punya deskripsi [cite: 2026-02-24]
  description: 'HnM Store Jepara menyediakan koleksi sepatu original terbaik. Jaminan 100% authentic dari brand global.',
  
  // 3. Favicon & Icons [cite: 2026-02-24]
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },

  // 4. Meta buat Sosmed (OpenGraph) biar cakep pas di-share di WA/IG [cite: 2026-02-24]
  openGraph: {
    title: 'HnM Store | Authentic Sneaker Jepara',
    description: '100% Authentic Sneaker Selection',
    images: ['/images/og-image.jpg'], // Pastiin filenya ada di folder public [cite: 2026-02-24]
  }
}
export default function FrontendLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <section>
      {/* WAJIB BUNGKUS NAVBAR DI SINI [cite: 2026-02-24] */}
      <Suspense fallback={<div className="h-20 bg-black w-full" />}>
        <Navbar />
      </Suspense>
      
      <main>{children}</main>
      <FloatingWA />
      <Footer />
    </section>
  )
}