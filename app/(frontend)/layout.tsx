// 1. Import dulu filenya dari folder components
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function FrontendLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <section>
      {/* 2. Panggil sebagai tag HTML di sini */}
      <Navbar /> 
      
      {/* Children ini adalah isi halaman (Home, Shop, dll) */}
      <main>{children}</main>
      
      <Footer />
    </section>
  )
}