'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifier,
        password: password,
      })

      if (error) throw error

      if (data.user) {
        router.push('/admin')
        router.refresh()
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal masuk. Periksa email dan password Anda.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4 font-sans text-gray-900">
      <div className="w-full max-w-md bg-white rounded-xl p-8 md:p-12 border border-gray-100 shadow-2xl shadow-black/5">
        
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-black rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-xl shadow-black/10">
            <Lock className="text-white" size={28} />
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">HnM Store</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[3px] mt-2">Dashboard HnM Store</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[10px] font-black uppercase text-center tracking-widest leading-relaxed">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Email</label>
            <div className="relative group">
              <User className="absolute left-5 top-4 text-gray-300 group-focus-within:text-black transition-colors" size={18} />
              <input 
                type="email" 
                required 
                placeholder="email@contoh.com"
                className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-black transition-all font-bold text-sm"
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Password</label>
            <div className="relative group">
              <Lock className="absolute left-5 top-4 text-gray-300 group-focus-within:text-black transition-colors" size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                placeholder="••••••••"
                className="w-full pl-14 pr-14 py-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-black transition-all font-bold text-sm"
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-4 text-gray-300 hover:text-black transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full py-5 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-[2px] shadow-xl hover:bg-zinc-800 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:bg-gray-400"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Memproses...</span>
              </>
            ) : "Masuk ke Dashboard"}
          </button>
        </form>

        <p className="text-center mt-10 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
          HnM Store System © 2026
        </p>
      </div>
    </div>
  )
}