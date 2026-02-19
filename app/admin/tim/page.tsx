'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Users, UserPlus, Shield, 
  MoreVertical, ArrowLeft, Search, CheckCircle2, 
  Loader2, Mail, X, Save, MapPin, CreditCard, Fingerprint, Trash2
} from 'lucide-react'
import Link from 'next/link'

export default function KelolaTimPage() {
  const [team, setTeam] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'KARYAWAN',
    address: '',
    nik: '',
    bank_account: ''
  })

  // PROTEKSI HALAMAN & FETCH DATA
  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('Profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        // Jika bukan OWNER, tendang ke dashboard (Proteksi lapis kedua setelah middleware)
        if (profile?.role !== 'OWNER') {
          window.location.href = '/admin'
          return
        }
      }
      fetchTeam()
    }
    
    checkAccess()
  }, [])

  async function fetchTeam() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('Profiles') 
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      if (data) setTeam(data)
    } catch (err: any) {
      console.error("Error fetch team:", err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      // 1. Daftarkan User ke Auth Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: 'password123',
        options: {
          emailRedirectTo: `${window.location.origin}/admin/tim`,
        }
      })

      if (authError) throw authError

      // 2. Masukkan ke tabel Profiles
      const { error: profileError } = await supabase
        .from('Profiles')
        .insert([{
          id: authData.user?.id,
          full_name: formData.full_name,
          email: formData.email,
          role: formData.role,
          address: formData.address,
          nik: formData.nik,
          bank_account: formData.bank_account
        }])

      if (profileError) throw profileError
      
      alert("Anggota tim berhasil ditambahkan! Password default: password123")
      setShowModal(false)
      setFormData({ full_name: '', email: '', role: 'KARYAWAN', address: '', nik: '', bank_account: '' })
      fetchTeam()
    } catch (err: any) {
      alert("Gagal: " + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteMember(id: string, name: string) {
    if (confirm(`Hapus ${name} dari tim? Akses login dia juga akan dicabut.`)) {
      try {
        const { error } = await supabase.from('Profiles').delete().eq('id', id)
        if (error) throw error
        alert("Anggota berhasil dihapus")
        fetchTeam()
      } catch (err: any) {
        alert("Gagal menghapus: " + err.message)
      }
    }
  }

  return (
    <div className="p-4 md:p-8 bg-white min-h-screen text-black font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <Link href="/admin" className="text-[10px] font-black uppercase text-gray-400 hover:text-black mb-2 flex items-center gap-1 tracking-widest transition-all">
              <ArrowLeft size={14}/> Kembali ke Dashboard
            </Link>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase flex items-center gap-3">
              <Users className="text-black" size={32} /> Kelola Tim
            </h1>
          </div>
          
          <button 
            onClick={() => setShowModal(true)}
            className="w-full md:w-auto bg-black text-white px-8 py-4 rounded-xl text-[10px] font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
          >
            <UserPlus size={18} /> Tambah Anggota
          </button>
        </div>

        {/* SEARCH AREA */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="md:col-span-3 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <input 
              type="text" 
              placeholder="CARI NAMA, EMAIL, ATAU NIK..." 
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-xl text-[10px] font-black outline-none focus:ring-2 focus:ring-black transition-all"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="bg-gray-100 px-6 py-4 rounded-xl flex items-center gap-3">
            <Shield size={18} className="text-black" />
            <span className="text-[10px] font-black uppercase tracking-widest text-center">Akses Owner</span>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-black" size={32} />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Loading...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                  <tr>
                    <th className="p-5">Anggota</th>
                    <th className="p-5">NIK & Alamat</th>
                    <th className="p-5">Rekening</th>
                    <th className="p-5">Role</th>
                    <th className="p-5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-[11px] font-bold uppercase italic">
                  {team.filter(u => 
                    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    u.nik?.includes(searchTerm)
                  ).map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 font-black">
                            {user.full_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-black">{user.full_name}</p>
                            <p className="text-[10px] text-gray-400 not-italic font-medium lowercase tracking-normal">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-5 text-gray-500">
                        <p className="flex items-center gap-1"><Fingerprint size={12}/> {user.nik || '-'}</p>
                        <p className="flex items-center gap-1 mt-1 opacity-70 text-[10px]"><MapPin size={12}/> {user.address || '-'}</p>
                      </td>
                      <td className="p-5 text-gray-500">
                         <p className="flex items-center gap-2"><CreditCard size={14}/> {user.bank_account || '-'}</p>
                      </td>
                      <td className="p-5">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${user.role === 'OWNER' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-5 text-right">
                        <button 
                          onClick={() => handleDeleteMember(user.id, user.full_name)}
                          className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Hapus Anggota"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL TAMBAH ANGGOTA */}
        {showModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-xl p-8 w-full max-w-2xl shadow-2xl my-8 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black italic uppercase tracking-tighter">Data Lengkap Tim Baru</h2>
                <button onClick={() => setShowModal(false)}><X size={24}/></button>
              </div>

              <form onSubmit={handleAddMember} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nama Lengkap</label>
                        <input required type="text" className="w-full p-4 bg-gray-50 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-black"
                            value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Email Login</label>
                        <input required type="email" className="w-full p-4 bg-gray-50 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-black"
                            value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">NIK (KTP)</label>
                    <input type="text" className="w-full p-4 bg-gray-50 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-black"
                        value={formData.nik} onChange={(e) => setFormData({...formData, nik: e.target.value})} />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Role</label>
                    <select className="w-full p-4 bg-gray-50 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-black appearance-none"
                        value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                        <option value="KARYAWAN">KARYAWAN</option>
                        <option value="OWNER">OWNER</option>
                    </select>
                </div>

                <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Alamat Lengkap (Domisili)</label>
                    <textarea className="w-full p-4 bg-gray-50 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-black h-20"
                        value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                </div>

                <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nomor Rekening (Untuk Gajian)</label>
                    <input type="text" placeholder="Contoh: BCA 123456789 a/n Nama" className="w-full p-4 bg-gray-50 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-black"
                        value={formData.bank_account} onChange={(e) => setFormData({...formData, bank_account: e.target.value})} />
                </div>

                <button disabled={isSubmitting} className="md:col-span-2 w-full bg-black text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl hover:bg-gray-900 transition-all">
                  {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                  SIMPAN DATA TIM
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}