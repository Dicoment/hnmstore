'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { MessageCircle, Save, Loader2, Info, Phone, FileText, Power } from 'lucide-react'

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
      const { data, error } = await supabase
        .from('WhatsAppConfig')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') throw error
      
      if (data) {
        setConfig(data)
      } else {
        // Default config kalau belum ada di DB
        setConfig({
          id: '',
          phone_number: '628123456789',
          template_message: 'Halo Admin HnM Store, saya mau pesan produk {produk} dengan harga {harga}. Apakah masih tersedia?',
          is_active: true
        })
      }
    } catch (err: any) {
      alert('Gagal ambil data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!config) return
    setIsSaving(true)

    try {
      const { error } = await supabase
        .from('WhatsAppConfig')
        .upsert({
          id: config.id || undefined, // Supabase handle UUID auto if undefined
          phone_number: config.phone_number,
          template_message: config.template_message,
          is_active: config.is_active
        })

      if (error) throw error
      alert('Setting WA Berhasil Disimpan!')
      fetchConfig()
    } catch (err: any) {
      alert('Gagal simpan: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>
  )

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] font-sans text-black">
      <div className="flex flex-col flex-1 bg-white border border-gray-200 overflow-hidden rounded-xl mx-4 my-2 shadow-sm">
        
        {/* HEADER */}
        <div className="p-6 border-b border-gray-100 bg-white sticky top-0 z-30">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-black italic uppercase flex items-center gap-2">
                <MessageCircle size={20} /> WhatsApp Settings
              </h1>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Konfigurasi jalur pemesanan HnM Store</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1.5 ${config?.is_active ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${config?.is_active ? 'bg-green-600 animate-pulse' : 'bg-red-600'}`} />
              {config?.is_active ? 'Sistem Aktif' : 'Sistem Nonaktif'}
            </div>
          </div>
        </div>

        {/* FORM CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-white custom-scrollbar">
          <form onSubmit={handleSave} className="max-w-2xl mx-auto space-y-10">
            
            {/* TOGGLE AKTIF/NONAKTIF */}
            <div className="flex items-center justify-between p-6 bg-gray-50 border border-gray-100 rounded-xl">
              <div>
                <h3 className="font-black text-sm uppercase">Status Tombol Order</h3>
                <p className="text-[10px] text-gray-400 font-bold">Aktifkan atau matikan tombol WA di landing page</p>
              </div>
              <button 
                type="button"
                onClick={() => setConfig(prev => prev ? {...prev, is_active: !prev.is_active} : null)}
                className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${config?.is_active ? 'bg-black' : 'bg-gray-200'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${config?.is_active ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="space-y-6">
              {/* NOMOR WHATSAPP */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Phone size={12} /> Nomor WA Admin (Gunakan 62)
                </label>
                <input 
                  type="text" 
                  value={config?.phone_number}
                  onChange={(e) => setConfig(prev => prev ? {...prev, phone_number: e.target.value} : null)}
                  placeholder="Contoh: 628123456789"
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3.5 font-black text-sm outline-none focus:border-black transition-all"
                />
              </div>

              {/* TEMPLATE PESAN */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <FileText size={12} /> Format Pesan Otomatis
                </label>
                <textarea 
                  rows={5}
                  value={config?.template_message}
                  onChange={(e) => setConfig(prev => prev ? {...prev, template_message: e.target.value} : null)}
                  className="w-full bg-white border border-gray-200 rounded-lg p-4 font-bold text-sm outline-none focus:border-black transition-all resize-none"
                />
                
                {/* INFO PLACEHOLDER */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 flex gap-3">
                  <Info size={16} className="text-gray-400 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-gray-500">Gunakan Shortcut Tag:</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-[9px] bg-white border px-2 py-0.5 rounded font-black text-black">{"{produk}"}</span>
                      <span className="text-[9px] bg-white border px-2 py-0.5 rounded font-black text-black">{"{harga}"}</span>
                      <span className="text-[9px] bg-white border px-2 py-0.5 rounded font-black text-black">{"{link}"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BUTTON SAVE */}
            <div className="pt-4">
              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full bg-black text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl hover:bg-zinc-800 transition-all active:scale-95 disabled:bg-gray-300"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Simpan Konfigurasi
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}