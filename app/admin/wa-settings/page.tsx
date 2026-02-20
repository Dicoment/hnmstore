'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Save, Loader2, Info, Phone, FileText, Layout, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface WAConfig {
  id: string
  phone_number: string
  template_message: string
  is_active: boolean
}

export default function WhatsAppAdminPage() {
  const [config, setConfig] = useState<WAConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  async function fetchConfig() {
    try {
      setLoading(true)
      const res = await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({ sql: 'SELECT * FROM public."WhatsAppConfig" LIMIT 1' })
      })
      const result = await res.json()
      
      if (result.data && result.data.length > 0) {
        setConfig(result.data[0])
      } else {
        setConfig({
          id: '',
          phone_number: '6282138241048',
          template_message: 'Halo Admin HnM Store, saya mau tanya produk {produk}. Apakah masih ready?',
          is_active: true
        })
      }
    } catch (err) {
      console.error("Gagal load config WA:", err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!config) return
    setIsSaving(true)

    try {
      let sql = ''
      let params: any[] = []

      if (!config.id) {
        sql = `INSERT INTO public."WhatsAppConfig" (phone_number, template_message, is_active) VALUES ($1, $2, $3) RETURNING *`
        params = [config.phone_number, config.template_message, config.is_active]
      } else {
        sql = `UPDATE public."WhatsAppConfig" SET phone_number = $1, template_message = $2, is_active = $3 WHERE id = $4 RETURNING *`
        params = [config.phone_number, config.template_message, config.is_active, config.id]
      }

      const res = await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({ sql, params })
      })
      const result = await res.json()

      if (result.error) throw new Error(result.error)
      
      alert('Sip! Konfigurasi WhatsApp Berhasil Diupdate!')
      fetchConfig()
    } catch (err: any) {
      alert('Gagal simpan: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white p-6 text-center">
      <Loader2 className="animate-spin text-black" size={40} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Syncing WA Cloud Storage...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FBFBFB] md:p-4 lg:p-8 font-sans text-black">
      <div className="max-w-4xl mx-auto flex flex-col bg-white border border-gray-100 shadow-sm md:rounded-3xl overflow-hidden min-h-[calc(100vh-2rem)] md:min-h-0">
        
        {/* HEADER SECTION */}
        <div className="p-6 md:p-10 border-b border-gray-50 bg-white sticky top-0 z-30">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <Link href="/admin" className="inline-flex items-center gap-2 text-[9px] font-black uppercase text-gray-400 hover:text-black transition-colors mb-2 tracking-widest">
                <ArrowLeft size={12} /> Back to Dashboard
              </Link>
              <h1 className="text-2xl md:text-3xl font-black italic uppercase flex items-center gap-3 tracking-tighter leading-none">
                <MessageCircle size={32} className="text-green-500 shrink-0" /> WhatsApp <span className="text-zinc-300">Control.</span>
              </h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] italic">Automated Gateway Configuration</p>
            </div>
            
            <div className={`w-full md:w-auto px-5 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-3 border transition-all ${config?.is_active ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
              <div className={`w-2 h-2 rounded-full ${config?.is_active ? 'bg-green-600 animate-pulse' : 'bg-red-600'}`} />
              {config?.is_active ? 'System Active' : 'System Disabled'}
            </div>
          </div>
        </div>

        {/* FORM SECTION */}
        <div className="flex-1 p-6 md:p-10 lg:p-14">
          <form onSubmit={handleSave} className="space-y-10 md:space-y-14">
            
            {/* MASTER SWITCH */}
            <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 md:p-8 rounded-xl border-2 transition-all duration-500 gap-6 ${config?.is_active ? 'bg-green-50/30 border-green-100' : 'bg-gray-50/50 border-gray-100'}`}>
              <div className="flex items-start gap-5">
                <div className={`p-4 rounded-2xl shrink-0 transition-colors ${config?.is_active ? 'bg-green-500 text-white shadow-[0_10px_30px_rgba(34,197,94,0.3)]' : 'bg-gray-200 text-white'}`}>
                    <Layout size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-sm md:text-base uppercase tracking-tight">Floating Button Presence</h3>
                  <p className="text-[11px] text-gray-400 font-bold leading-relaxed max-w-xs uppercase">Tampilkan tombol WhatsApp melayang untuk memudahkan customer bertanya.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setConfig(prev => prev ? {...prev, is_active: !prev.is_active} : null)}
                className={`w-16 h-8 rounded-full p-1 transition-all duration-500 shrink-0 relative ${config?.is_active ? 'bg-black' : 'bg-gray-200'}`}
              >
                <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-500 ${config?.is_active ? 'translate-x-8' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-10 md:gap-14">
              {/* PHONE INPUT */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3 px-1">
                  <Phone size={14} className="text-black" /> Gateway Admin Number
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={config?.phone_number}
                    onChange={(e) => setConfig(prev => prev ? {...prev, phone_number: e.target.value} : null)}
                    placeholder="628xxxxxxxxxx"
                    className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl px-6 py-5 font-black text-lg md:text-xl outline-none focus:border-black focus:bg-white transition-all placeholder:text-gray-200"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[9px] font-black text-blue-500 uppercase tracking-widest hidden sm:block">ISO-62 Format</span>
                </div>
              </div>

              {/* TEMPLATE TEXTAREA */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3 px-1">
                  <FileText size={14} className="text-black" /> Auto-Reply Template
                </label>
                <div className="relative bg-gray-50 rounded-xl border-2 border-gray-50 focus-within:border-black focus-within:bg-white transition-all overflow-hidden p-2">
                  <textarea 
                    rows={6}
                    value={config?.template_message}
                    onChange={(e) => setConfig(prev => prev ? {...prev, template_message: e.target.value} : null)}
                    className="w-full bg-transparent p-5 font-bold text-sm md:text-base outline-none resize-none min-h-37"
                    placeholder="Contoh: Halo, saya tertarik dengan produk {produk}..."
                  />
                  
                  {/* SHORTCODE GUIDE */}
                  <div className="m-4 p-5 md:p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
                        <Info size={16} />
                      </div>
                      <p className="text-[10px] font-black uppercase text-zinc-800 tracking-wider">Dynamic Shortcodes</p>
                    </div>
                    <div className="flex flex-wrap gap-2 md:gap-3">
                      {["{produk}", "{harga}", "{link}"].map((tag) => (
                        <span key={tag} className="text-[10px] bg-zinc-50 border border-zinc-100 px-4 py-2 rounded-xl font-black text-black shadow-sm select-none">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-[9px] font-bold text-gray-400 italic">Sistem akan otomatis mengganti tag di atas dengan data produk asli saat diklik.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION BUTTON */}
            <div className="sticky bottom-6 md:static pb-6 md:pb-0">
              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full bg-black text-white py-6 rounded-xl font-black text-[11px] md:text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 shadow-[0_20px_40px_rgba(0,0,0,0.2)] hover:bg-zinc-800 hover:scale-[1.01] transition-all active:scale-95 disabled:bg-gray-200 disabled:shadow-none"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Update Konfigurasi WA
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #000; }
      `}</style>
    </div>
  )
}