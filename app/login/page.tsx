'use client'

import { useState } from 'react'
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
      // GANTI: Menembak API Auth lokal VPS kamu
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: identifier, 
          password: password 
        })
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.message || 'Gagal masuk.')
      }

      // Login Berhasil
      localStorage.setItem('user_email', identifier)
      
      router.push('/admin')
      router.refresh()
      
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal masuk. Periksa kembali email dan password Anda.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4 font-sans text-gray-900">
      <div className="w-full max-w-md bg-white rounded-xl p-8 md:p-12 border border-gray-100 shadow-2xl shadow-black/5">
        
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-black rounded-xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-black/20">
            <Lock className="text-white" size={32} />
          </div>
          <h1 className="text-4xl font-bold italic tracking-tighter uppercase leading-none">HnM Store</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em] mt-3 italic">Control Center</p>
        </div>

        {errorMsg && (
          <div className="mb-8 p-5 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold uppercase text-center tracking-widest leading-relaxed">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-400 uppercase ml-2 tracking-widest">Email Admin</label>
            <div className="relative group">
              <User className="absolute left-5 top-5 text-gray-300 group-focus-within:text-black transition-colors" size={20} />
              <input 
                type="email" 
                required 
                placeholder="admin@hnmstore.id"
                className="w-full pl-14 pr-6 py-5 bg-gray-50 border-2 border-transparent rounded-xl outline-none focus:bg-white focus:border-black transition-all font-bold text-sm text-black"
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-400 uppercase ml-2 tracking-widest">Password</label>
            <div className="relative group">
              <Lock className="absolute left-5 top-5 text-gray-300 group-focus-within:text-black transition-colors" size={20} />
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                placeholder="••••••••"
                className="w-full pl-14 pr-14 py-5 bg-gray-50 border-2 border-transparent rounded-xl outline-none focus:bg-white focus:border-black transition-all font-bold text-sm text-black"
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-5 text-gray-300 hover:text-black transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full py-6 bg-black text-white rounded-xl font-bold text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-zinc-800 active:scale-[0.96] transition-all flex items-center justify-center gap-4 disabled:bg-gray-200"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Membuka Gerbang...</span>
              </>
            ) : "Masuk Dashboard"}
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-gray-50 text-center">
            <p className="text-xs font-bold text-gray-300 uppercase tracking-widest italic">
              HnM Store Dashboard v2.0
            </p>
        </div>
      </div>
    </div>
  )
}