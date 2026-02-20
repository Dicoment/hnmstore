"use client";

import { useState, useEffect } from "react";
import { User, Mail, Lock, Camera, Save, Loader2, KeyRound, ShieldCheck } from "lucide-react";
import { createBrowserClient } from '@supabase/ssr'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [profile, setProfile] = useState({
    id: "",
    full_name: "",
    email: "",
    role: "",
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function getProfile() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return;

        // Tarik data dari VPS Database
        const res = await fetch('/api/vps-db', {
          method: 'POST',
          body: JSON.stringify({ 
            sql: 'SELECT * FROM public."Profiles" WHERE id = $1 LIMIT 1',
            params: [user.id]
          })
        })
        const result = await res.json()
        const data = result.data?.[0]

        setProfile({
          id: user.id,
          full_name: data?.full_name || "",
          email: user.email || "",
          role: data?.role || "STAFF",
        });
      } finally {
        setLoading(false);
      }
    }
    getProfile();
  }, [supabase]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    
    try {
      await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({
          sql: 'UPDATE public."Profiles" SET full_name = $1 WHERE id = $2',
          params: [profile.full_name, profile.id]
        })
      });
      alert("Nama berhasil diperbarui!");
    } catch (err) {
      alert("Gagal update profil");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("Konfirmasi password tidak cocok!");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      alert("Password minimal 6 karakter!");
      return;
    }

    setPassLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: passwordData.newPassword
    });

    if (error) {
      alert("Gagal ubah password: " + error.message);
    } else {
      alert("Password berhasil diubah!");
      setPasswordData({ newPassword: "", confirmPassword: "" });
    }
    setPassLoading(false);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Loader2 className="animate-spin text-black mb-4" size={48} />
      <p className="text-black font-black uppercase tracking-widest text-xs">Menghubungkan ke Database.</p>
    </div>
  );

  return (
    <div className="p-4 md:p-10 max-w-6xl mx-auto space-y-10 font-sans text-black bg-white">
      <div className="border-b-4 border-black pb-6">
        <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">Pengaturan Profil</h1>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Kelola identitas dan keamanan akun admin</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Kiri: Status & Role */}
        <div className="space-y-6">
          <div className="bg-zinc-900 p-8 rounded-xl shadow-2xl flex flex-col items-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ShieldCheck size={80} />
            </div>
            <div className="relative">
              <div className="w-32 h-32 rounded-xl bg-zinc-800 flex items-center justify-center border-2 border-zinc-700 shadow-inner">
                <User size={64} className="text-zinc-500" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-green-500 p-2 rounded-lg border-4 border-zinc-900">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              </div>
            </div>
            <div className="mt-8 text-center relative z-10">
              <h2 className="font-black text-xl uppercase tracking-tight leading-none">{profile.full_name || "Admin"}</h2>
              <p className="text-[10px] font-black text-zinc-500 mt-2 uppercase tracking-[0.3em]">{profile.email}</p>
              <div className="mt-6 px-4 py-2 bg-white text-black text-[10px] font-black rounded-lg uppercase tracking-widest inline-block">
                {profile.role}
              </div>
            </div>
          </div>
        </div>

        {/* Kanan: Form Data & Keamanan */}
        <div className="lg:col-span-2 space-y-8">
          {/* Update Nama */}
          <div className="bg-white p-8 rounded-xl border-2 border-gray-100 shadow-sm">
            <h3 className="text-sm font-black mb-8 uppercase tracking-widest flex items-center gap-3 border-b border-gray-100 pb-4">
              <User size={18} className="text-black"/> Informasi Dasar
            </h3>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nama Lengkap Admin</label>
                <input
                  type="text"
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-black rounded-xl font-bold outline-none transition-all"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                />
              </div>
              <button disabled={updating} className="w-full md:w-auto bg-black text-white px-10 py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:bg-zinc-800 active:scale-95 shadow-xl disabled:opacity-50">
                {updating ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Perbarui Nama
              </button>
            </form>
          </div>

          {/* Update Password */}
          <div className="bg-white p-8 rounded-xl border-2 border-gray-100 shadow-sm">
            <h3 className="text-sm font-black mb-8 uppercase tracking-widest flex items-center gap-3 border-b border-gray-100 pb-4 text-red-600">
              <KeyRound size={18}/> Kredensial Keamanan
            </h3>
            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Password Baru</label>
                  <input
                    type="password"
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-black rounded-xl font-bold outline-none transition-all"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Minimal 6 karakter"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Konfirmasi Password</label>
                  <input
                    type="password"
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-black rounded-xl font-bold outline-none transition-all"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Ulangi password"
                  />
                </div>
              </div>
              <button disabled={passLoading} className="w-full md:w-auto bg-zinc-100 text-zinc-900 px-10 py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:bg-red-600 hover:text-white active:scale-95 shadow-md disabled:opacity-50">
                {passLoading ? <Loader2 className="animate-spin" size={18} /> : <Lock size={18} />} Ganti Password Sekarang
              </button>
            </form>
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; border-radius: 4px; }
      `}</style>
    </div>
  );
}