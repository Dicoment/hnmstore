'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, Save, Loader2, Info, Phone, FileText, Layout } from 'lucide-react'

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
      // Ambil data dari VPS
      const res = await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({ sql: 'SELECT * FROM public."WhatsAppConfig" LIMIT 1' })
      })
      const result = await res.json()
      
      if (result.data && result.data.length > 0) {
        setConfig(result.data[0])
      } else {
        // Default kalau database masih kosong
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
        // INSERT kalau baru pertama kali
        sql = `INSERT INTO public."WhatsAppConfig" (phone_number, template_message, is_active) VALUES ($1, $2, $3) RETURNING *`
        params = [config.phone_number, config.template_message, config.is_active]
      } else {
        // UPDATE kalau sudah ada
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
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
      <Loader2 className="animate-spin text-black" size={40} />
      <p className="text-xs font-black uppercase tracking-widest text-gray-400">Menghubungkan ke VPS...</p>
    </div>
  )

  return (
    <div className="flex flex-col h-screen lg:h-[calc(100vh-140px)] font-sans text-black">
      <div className="flex flex-col flex-1 bg-white border border-gray-200 overflow-hidden lg:rounded-2xl lg:mx-4 lg:my-2 shadow-sm">
        
        {/* HEADER */}
        <div className="p-6 md:p-8 border-b border-gray-100 bg-white sticky top-0 z-30">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-black italic uppercase flex items-center gap-3 tracking-tighter">
                <MessageCircle size={28} className="text-green-500" /> WhatsApp Control Center
              </h1>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mt-1 italic">Atur Jalur Pemesanan Otomatis</p>
            </div>
            <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 ${config?.is_active ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
              <div className={`w-2 h-2 rounded-full ${config?.is_active ? 'bg-green-600 animate-pulse' : 'bg-red-600'}`} />
              {config?.is_active ? 'Floating WA Aktif' : 'Floating WA Mati'}
            </div>
          </div>
        </div>

        {/* FORM CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12 bg-white custom-scrollbar">
          <form onSubmit={handleSave} className="max-w-3xl mx-auto space-y-12">
            
            {/* TOGGLE STATUS */}
            <div className={`flex items-center justify-between p-8 rounded-3xl border-2 transition-all duration-500 ${config?.is_active ? 'bg-green-50/50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${config?.is_active ? 'bg-green-500 text-white' : 'bg-gray-300 text-white'}`}>
                    <Layout size={24} />
                </div>
                <div>
                  <h3 className="font-black text-base uppercase tracking-tight text-black">Tampilkan Floating Button</h3>
                  <p className="text-xs text-gray-500 font-bold mt-1">Munculkan tombol WhatsApp melayang di pojok kanan bawah website.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setConfig(prev => prev ? {...prev, is_active: !prev.is_active} : null)}
                className={`w-16 h-8 rounded-full p-1 transition-all duration-300 ${config?.is_active ? 'bg-black' : 'bg-gray-200'}`}
              >
                <div className={`w-6 h-6 bg-white rounded-full shadow-lg transition-transform ${config?.is_active ? 'translate-x-8' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-10">
              {/* NOMOR WHATSAPP */}
              <div className="space-y-3">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1">
                  <Phone size={16} className="text-black" /> Nomor WA Admin <span className="text-blue-500 italic">(Wajib awali 62)</span>
                </label>
                <div className="relative group">
                    <input 
                      type="text" 
                      value={config?.phone_number}
                      onChange={(e) => setConfig(prev => prev ? {...prev, phone_number: e.target.value} : null)}
                      placeholder="628xxxxxxxxxx"
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 font-black text-lg outline-none focus:border-black focus:bg-white transition-all text-black"
                    />
                </div>
              </div>

              {/* TEMPLATE PESAN */}
              <div className="space-y-3">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1">
                  <FileText size={16} className="text-black" /> Template Pesan Otomatis
                </label>
                <textarea 
                  rows={6}
                  value={config?.template_message}
                  onChange={(e) => setConfig(prev => prev ? {...prev, template_message: e.target.value} : null)}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-6 font-bold text-base outline-none focus:border-black focus:bg-white transition-all resize-none text-black"
                  placeholder="Ketik format pesan di sini..."
                />
                
                {/* INFO PLACEHOLDER */}
                <div className="p-6 bg-blue-50 rounded-2xl border-2 border-blue-100 flex gap-4">
                  <Info size={20} className="text-blue-500 shrink-0" />
                  <div className="space-y-2">
                    <p className="text-xs font-black uppercase text-blue-900 tracking-wider">Gunakan Shortcode Dinamis:</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-[11px] bg-white border-2 border-blue-200 px-3 py-1 rounded-xl font-black text-blue-600 shadow-sm hover:scale-105 transition-transform cursor-default">{"{produk}"}</span>
                      <span className="text-[11px] bg-white border-2 border-blue-200 px-3 py-1 rounded-xl font-black text-blue-600 shadow-sm hover:scale-105 transition-transform cursor-default">{"{harga}"}</span>
                      <span className="text-[11px] bg-white border-2 border-blue-200 px-3 py-1 rounded-xl font-black text-blue-600 shadow-sm hover:scale-105 transition-transform cursor-default">{"{link}"}</span>
                    </div>
                    <p className="text-xs font-bold text-blue-400 mt-2 italic">Tag di atas akan otomatis terganti dengan detail sepatu yang diklik user.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* BUTTON SAVE */}
            <div className="pt-6 pb-12">
              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full bg-black text-white py-6 rounded-[28px] font-black text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-2xl hover:bg-zinc-800 transition-all active:scale-95 disabled:bg-gray-300"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Update Konfigurasi WA
              </button>
            </div>

          </form>
        </div>
      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; border-radius: 10px; }
      `}</style>
    </div>
  )
}