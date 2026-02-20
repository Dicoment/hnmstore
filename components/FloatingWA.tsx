'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export default function FloatingWA() {
  const [config, setConfig] = useState<any>(null)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    async function fetchWAConfig() {
      try {
        const res = await fetch('/api/vps-db', {
          method: 'POST',
          body: JSON.stringify({ sql: 'SELECT * FROM public."WhatsAppConfig" WHERE is_active = true LIMIT 1' })
        })
        const result = await res.json()
        if (result.data?.length > 0) setConfig(result.data[0])
      } catch (err) {
        console.error("WA Button Error:", err)
      }
    }
    fetchWAConfig()

    const timer = setTimeout(() => setShowTooltip(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  if (!config) return null

  const handleChat = () => {
    const message = config.template_message
      .replace('{produk}', 'Produk')
      .replace('{harga}', '')
      .replace('{link}', window.location.href)
    
    const encodedMsg = encodeURIComponent(message)
    window.open(`https://wa.me/${config.phone_number}?text=${encodedMsg}`, '_blank')
  }

  return (
    <div className="fixed bottom-6 right-6 z-999 flex flex-col items-end gap-3 font-sans">
      
      {/* TOOLTIP INDUSTRIAL STYLE */}
      {showTooltip && (
        <div className="bg-white border-2 border-black p-4 rounded-2xl shadow-[20px_20px_0px_0px_rgba(0,0,0,0.1)] animate-in fade-in zoom-in duration-300 relative max-w-50">
          <button 
            onClick={() => setShowTooltip(false)}
            className="absolute -top-2 -right-2 bg-black text-white rounded-full p-1 hover:bg-red-600 transition-colors"
          >
            <X size={12} />
          </button>
          <p className="text-[11px] font-black uppercase tracking-tight text-black leading-tight">
            Butuh bantuan cari size, kak? Chat Admin yuk!
          </p>
        </div>
      )}

      {/* BUTTON WHATSAPP CUSTOM SVG */}
      <button
        onClick={handleChat}
        className="w-16 h-16 bg-[#25D366] text-white rounded-[20px] shadow-[0_15px_40px_rgba(37,211,102,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-500 group relative"
      >
        {/* SVG LOGO WHATSAPP ASLI */}
        <svg 
          viewBox="0 0 24 24" 
          className="w-9 h-9 fill-current transition-transform group-hover:rotate-10"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.438 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>

        {/* NOTIFICATION DOT */}
        <span className="absolute -top-1 -right-1 flex h-5 w-5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-5 w-5 bg-red-600 border-2 border-[#25D366]"></span>
        </span>
      </button>
    </div>
  )
}