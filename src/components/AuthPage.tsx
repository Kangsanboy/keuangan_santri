import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User, Loader2, KeyRound, ArrowLeft } from "lucide-react";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false); // 🔥 State baru buat mode Lupa Sandi
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      return toast({ title: "Data Belum Lengkap", description: "Harap isi semua kolom.", variant: "destructive" });
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: 'pending' } },
    });
    setLoading(false);

    if (error) {
      toast({ title: "Gagal Mendaftar", description: error.message, variant: "destructive" });
    } else {
      // 🔥 Peringatan Cek Email buat Verifikasi
      toast({ 
        title: "Pendaftaran Berhasil!", 
        description: "Silakan CEK EMAIL Anda (termasuk folder Spam) untuk mengaktifkan akun sebelum login.", 
        className: "bg-blue-600 text-white font-bold" 
      });
      setIsLogin(true);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      return toast({ title: "Data Belum Lengkap", description: "Masukkan email dan kata sandi.", variant: "destructive" });
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    
    if (error) {
      toast({ title: "Gagal Login", description: "Email belum diverifikasi atau kata sandi salah.", variant: "destructive" });
    } else {
      toast({ title: "Berhasil Login", description: "Selamat datang kembali!", className: "bg-green-600 text-white" });
    }
  };

  // 🔥 FUNGSI RESET PASSWORD
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      return toast({ title: "Email Kosong", description: "Harap masukkan email Anda terlebih dahulu.", variant: "destructive" });
    }
    
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin, // Otomatis balik ke web kita setelah klik link di email
    });
    setLoading(false);

    if (error) {
      toast({ title: "Gagal Mengirim Link", description: error.message, variant: "destructive" });
    } else {
      toast({ 
        title: "Link Reset Terkirim!", 
        description: "Silakan cek kotak masuk Email Anda untuk mengatur ulang kata sandi.", 
        className: "bg-green-600 text-white font-bold" 
      });
      setIsForgotPassword(false); // Balikin ke form login
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
      <div className="absolute inset-0 bg-green-900/5 bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:20px_20px] opacity-20"></div>
      
      <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-green-600 relative z-10 bg-white/95 backdrop-blur-sm">
        
        {/* ================= MODE LUPA SANDI ================= */}
        {isForgotPassword ? (
          <>
            <CardHeader className="space-y-2 pb-6 text-center">
              <div className="mx-auto bg-orange-100 p-3 rounded-full w-fit mb-2">
                <KeyRound className="w-8 h-8 text-orange-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-800">Lupa Kata Sandi?</CardTitle>
              <CardDescription className="text-gray-500">
                Masukkan alamat email yang terdaftar. Kami akan mengirimkan tautan untuk mengatur ulang kata sandi Anda.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input type="email" placeholder="Alamat Email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12 bg-gray-50" required />
                </div>
                <Button type="submit" className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold text-base shadow-md" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Kirim Link Reset Sandi"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center border-t p-4 bg-gray-50/50 rounded-b-xl">
              <Button variant="link" onClick={() => setIsForgotPassword(false)} className="text-gray-500 hover:text-green-700">
                <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Halaman Login
              </Button>
            </CardFooter>
          </>

        ) : (
          /* ================= MODE LOGIN / DAFTAR (DEFAULT) ================= */
          <>
            <CardHeader className="space-y-2 pb-6 text-center">
              <img src="/mylogo.png" alt="Logo" className="h-16 mx-auto mb-2 drop-shadow-md" onError={(e) => e.currentTarget.style.display = 'none'} />
              <CardTitle className="text-2xl font-bold text-gray-800">SIMATREN</CardTitle>
              <CardDescription className="text-gray-500">Sistem Informasi Manajemen Pesantren</CardDescription>
            </CardHeader>
            <CardContent>
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setIsLogin(true)} className={`py-2 text-sm font-bold rounded-md transition-all ${isLogin ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Masuk</button>
                <button onClick={() => setIsLogin(false)} className={`py-2 text-sm font-bold rounded-md transition-all ${!isLogin ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Daftar</button>
              </TabsList>

              <form onSubmit={isLogin ? handleLogin : handleSignUp} className="space-y-4">
                {!isLogin && (
                  <div className="relative animate-in slide-in-from-top-2 duration-300">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input type="text" placeholder="Nama Lengkap" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10 h-12 bg-gray-50 focus:bg-white transition-colors" required={!isLogin} />
                  </div>
                )}
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input type="email" placeholder="Alamat Email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12 bg-gray-50 focus:bg-white transition-colors" required />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input type="password" placeholder="Kata Sandi" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-12 bg-gray-50 focus:bg-white transition-colors" required />
                </div>

                {/* 🔥 LINK MENUJU LUPA SANDI (Cuma muncul di mode Login) */}
                {isLogin && (
                  <div className="flex justify-end mt-1">
                    <button type="button" onClick={() => setIsForgotPassword(true)} className="text-xs font-semibold text-green-600 hover:text-green-800 transition-colors">
                      Lupa Kata Sandi?
                    </button>
                  </div>
                )}

                <Button type="submit" className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-base shadow-md mt-4 transition-all active:scale-[0.98]" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? "Masuk ke Sistem" : "Buat Akun Baru"}
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>
      
      <div className="fixed bottom-4 text-center w-full text-xs text-gray-400 z-0">
        &copy; {new Date().getFullYear()} SIMATREN - Sistem Terpadu Pesantren
      </div>
    </div>
  );
};

export default AuthPage;
