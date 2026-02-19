"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { User, Mail, Lock, Camera, Save, Loader2, KeyRound } from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [profile, setProfile] = useState({
    id: "",
    full_name: "",
    email: "",
    avatar_url: "",
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    async function getProfile() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return;

        const { data } = await supabase
          .from("Profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        setProfile({
          id: user.id,
          full_name: data?.full_name || "",
          email: user.email || "",
          avatar_url: data?.avatar_url || "",
        });
      } finally {
        setLoading(false);
      }
    }
    getProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    const { error } = await supabase
      .from("Profiles")
      .update({ full_name: profile.full_name })
      .eq("id", profile.id);

    if (error) alert("Gagal update profil: " + error.message);
    else alert("Nama berhasil diperbarui!");
    setUpdating(false);
  };

  // FITUR UBAH PASSWORD LANGSUNG
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
      <Loader2 className="animate-spin text-orange-500 mb-2" size={32} />
      <p className="text-gray-500 text-sm">Memuat profil...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight text-center md:text-left">Pengaturan Akun</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Kiri: Foto */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center h-fit">
          <div className="relative group">
            <div className="w-36 h-36 rounded-full bg-orange-50 flex items-center justify-center overflow-hidden border-4 border-white shadow-md">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={54} className="text-orange-300" />
              )}
            </div>
            <button className="absolute bottom-1 right-1 p-2.5 bg-orange-500 rounded-full text-white shadow-lg border-2 border-white">
              <Camera size={18} />
            </button>
          </div>
          <div className="mt-6 text-center">
            <h2 className="font-bold text-gray-800 text-lg">{profile.full_name || "Admin"}</h2>
            <p className="text-xs text-gray-400 mt-1">{profile.email}</p>
          </div>
        </div>

        {/* Kanan: Form Data & Keamanan */}
        <div className="lg:col-span-2 space-y-6">
          {/* Update Nama */}
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><User size={20} className="text-orange-500"/> Data Diri</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="Nama Lengkap"
              />
              <button disabled={updating} className="w-full md:w-auto bg-orange-500 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition hover:bg-orange-600 disabled:opacity-50">
                {updating ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Simpan Nama
              </button>
            </form>
          </div>

          {/* Update Password Tanpa Verif Email */}
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><KeyRound size={20} className="text-red-500"/> Ganti Password</h3>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="password"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Password Baru"
                />
                <input
                  type="password"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Konfirmasi Password"
                />
              </div>
              <button disabled={passLoading} className="w-full md:w-auto bg-gray-800 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition hover:bg-black disabled:opacity-50 text-sm">
                {passLoading ? <Loader2 className="animate-spin" size={18} /> : <Lock size={18} />} Update Password Sekarang
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}