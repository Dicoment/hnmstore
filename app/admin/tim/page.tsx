'use client'

import { useState, useEffect } from 'react'
import { 
  Users, UserPlus, Shield, ArrowLeft, Search, 
  Loader2, X, Save, MapPin, CreditCard, Fingerprint, Trash2, Edit3
} from 'lucide-react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

export default function KelolaTimPage() {
  const [team, setTeam] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState<any | null>(null) // State untuk Edit Drawer
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    full_name: '', email: '', role: 'STAFF', address: '', nik: '', bank_account: ''
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => { fetchTeam() }, [])

  async function fetchTeam() {
    try {
      setLoading(true)
      const res = await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({ sql: 'SELECT * FROM public."Profiles" ORDER BY created_at DESC' })
      })
      const result = await res.json()
      if (result.data) setTeam(result.data)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  // --- FUNGSI TAMBAH ANGGOTA BARU ---
  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: 'password123',
      })
      if (authError) throw authError

      const vpsRes = await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({
          sql: `INSERT INTO public."Profiles" (id, full_name, email, role, address, nik, bank_account) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          params: [authData.user?.id, formData.full_name, formData.email, formData.role, formData.address, formData.nik, formData.bank_account]
        })
      })
      if ((await vpsRes.json()).error) throw new Error("Gagal simpan ke VPS")
      
      alert("Tim Berhasil Didaftarkan!")
      setShowModal(false)
      setFormData({ full_name: '', email: '', role: 'STAFF', address: '', nik: '', bank_account: '' })
      fetchTeam()
    } catch (err: any) { alert(err.message) } finally { setIsSubmitting(false) }
  }

  // --- FUNGSI UPDATE DATA (EDIT) ---
  async function handleUpdateMember(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedMember) return
    setIsSubmitting(true)
    try {
      const sql = `
        UPDATE public."Profiles" 
        SET full_name = $1, role = $2, address = $3, nik = $4, bank_account = $5 
        WHERE id = $6
      `
      const res = await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({
          sql,
          params: [selectedMember.full_name, selectedMember.role, selectedMember.address, selectedMember.nik, selectedMember.bank_account, selectedMember.id]
        })
      })
      if ((await res.json()).error) throw new Error("Gagal update VPS")

      alert("Data Karyawan Berhasil Diperbarui!")
      setSelectedMember(null)
      fetchTeam()
    } catch (err: any) { alert(err.message) } finally { setIsSubmitting(false) }
  }

  async function handleDeleteMember(id: string, name: string) {
    if (!confirm(`Hapus ${name}? Akses login akan dicabut.`)) return
    await fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: 'DELETE FROM public."Profiles" WHERE id = $1', params: [id] }) })
    fetchTeam()
  }

  return (
    <div className="p-4 md:p-8 bg-white min-h-screen text-black font-sans relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <Link href="/admin" className="text-xs font-black uppercase text-gray-400 hover:text-black mb-2 flex items-center gap-2 tracking-widest transition-all">
              <ArrowLeft size={16}/> DASHBOARD
            </Link>
            <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-4">
              <Users className="text-black" size={36} /> KELOLA SDM
            </h1>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-black text-white px-8 py-4 rounded-xl text-xs font-black shadow-xl active:scale-95 transition-all flex items-center gap-2 uppercase tracking-widest">
            <UserPlus size={18} /> ANGGOTA BARU
          </button>
        </div>

        {/* SEARCH AREA */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="CARI TIM..." className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-black transition-all uppercase" onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        {/* TABLE */}
        <div className="bg-white border-2 border-gray-100 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b-2 border-gray-100 text-[11px] font-black uppercase text-gray-400 tracking-widest">
                <tr>
                  <th className="p-5">IDENTITAS</th>
                  <th className="p-5">INFO PRIBADI</th>
                  <th className="p-5">REKENING</th>
                  <th className="p-5">ROLE</th>
                  <th className="p-5 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs font-black uppercase">
                {team.filter(u => u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())).map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-all group border-l-4 border-transparent hover:border-black">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white font-black">{user.full_name?.charAt(0)}</div>
                        <div>
                          <p className="text-sm tracking-tight">{user.full_name}</p>
                          <p className="text-[10px] text-gray-400 lowercase font-bold tracking-normal">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-gray-600">
                      <p className="flex items-center gap-1"><Fingerprint size={12}/> {user.nik || '-'}</p>
                      <p className="flex items-center gap-1 mt-1 opacity-60"><MapPin size={12}/> {user.address || '-'}</p>
                    </td>
                    <td className="p-5 text-gray-600">
                       <p className="flex items-center gap-2"><CreditCard size={14}/> {user.bank_account || '-'}</p>
                    </td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${user.role === 'OWNER' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}>{user.role}</span>
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setSelectedMember(user)} className="p-2.5 bg-gray-50 hover:bg-black hover:text-white rounded-xl transition-all"><Edit3 size={16} /></button>
                        <button onClick={() => handleDeleteMember(user.id, user.full_name)} className="p-2.5 bg-red-50 text-red-400 hover:bg-red-600 hover:text-white rounded-xl transition-all"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* EDIT DRAWER (SAMA KAYAK HALAMAN PRODUK) */}
        {selectedMember && (
          <div className="fixed inset-0 z-100 flex justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedMember(null)} />
            <div className="relative w-full max-w-lg bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col overflow-hidden rounded-l-xl">
              <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
                <div>
                  <h2 className="font-black text-2xl uppercase tracking-tighter">Edit Profil Tim</h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">ID: {selectedMember.id.slice(0,8)}...</p>
                </div>
                <button onClick={() => setSelectedMember(null)} className="p-2 bg-white border rounded-xl hover:bg-red-500 hover:text-white transition-all"><X size={24} /></button>
              </div>

              <form onSubmit={handleUpdateMember} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar text-black">
                <div className="space-y-6">
                  <div className="border-b-2 border-gray-100 focus-within:border-black transition-all py-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Nama Lengkap</label>
                    <input type="text" value={selectedMember.full_name} onChange={(e) => setSelectedMember({...selectedMember, full_name: e.target.value})} className="w-full outline-none font-black text-lg bg-transparent uppercase" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Nomor NIK</label>
                      <input type="text" value={selectedMember.nik || ''} onChange={(e) => setSelectedMember({...selectedMember, nik: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-xl p-4 font-black text-sm outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Hak Akses</label>
                      <select value={selectedMember.role} onChange={(e) => setSelectedMember({...selectedMember, role: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-xl p-4 font-black text-sm outline-none appearance-none cursor-pointer">
                        <option value="STAFF">STAFF</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="OWNER">OWNER</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Alamat Lengkap</label>
                    <textarea value={selectedMember.address || ''} onChange={(e) => setSelectedMember({...selectedMember, address: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-xl p-4 font-bold text-sm outline-none h-24 resize-none" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Info Rekening</label>
                    <input type="text" value={selectedMember.bank_account || ''} onChange={(e) => setSelectedMember({...selectedMember, bank_account: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-xl p-4 font-black text-sm outline-none" placeholder="BCA - 123456789 - A/N NAMA" />
                  </div>
                </div>

                <div className="sticky bottom-0 pt-6 bg-white">
                  <button type="submit" disabled={isSubmitting} className="w-full bg-black text-white py-5 rounded-xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} SIMPAN PERUBAHAN
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL TAMBAH (FUNGSI TETAP SAMA) */}
        {showModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl p-8 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200">
               {/* ... (Isi Form Tambah Member tetap sama dengan sebelumnya) ... */}
               <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black uppercase tracking-tighter">Registrasi Tim Baru</h2>
                <button onClick={() => setShowModal(false)}><X size={24}/></button>
              </div>
              <form onSubmit={handleAddMember} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <input required placeholder="NAMA LENGKAP" className="p-4 bg-gray-50 rounded-xl outline-none font-black text-xs uppercase" onChange={(e) => setFormData({...formData, full_name: e.target.value})} />
                  <input required placeholder="EMAIL" className="p-4 bg-gray-50 rounded-xl outline-none font-black text-xs" onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
                <button className="w-full bg-black text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl">SIMPAN DATA TIM</button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}