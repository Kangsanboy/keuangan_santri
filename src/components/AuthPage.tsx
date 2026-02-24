import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Database, ArrowRight, Loader2, UserPlus, LogIn, GraduationCap } from "lucide-react";

const AuthPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(""); // 🔥 Tambahan state untuk Nama Lengkap
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  // --- LOGIC ---
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Login Berhasil",
        description: "Selamat datang di SIMATREN Al-Jawahir.",
        className: "bg-green-50 border-green-200 text-green-800",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal Masuk",
        description: error.message || "Periksa email dan password Anda.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi ekstra biar nama nggak boleh kosong
    if (!fullName.trim()) {
      toast({
        variant: "destructive",
        title: "Data Belum Lengkap",
        description: "Nama lengkap wajib diisi.",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName, // 🔥 Menyimpan input nama ke kolom full_name di Supabase
          },
        },
      });

      if (error) throw error;

      if (data?.user && !data.session) {
        toast({
          title: "Cek Email Anda",
          description: "Link konfirmasi telah dikirim ke email tersebut.",
          className: "bg-blue-50 border-blue-200 text-blue-800",
        });
      } else {
        toast({
          title: "Pendaftaran Berhasil",
          description: "Akun Anda telah dibuat. Silakan login.",
          className: "bg-green-50 border-green-200 text-green-800",
        });
        // Reset form setelah sukses daftar
        setIsLogin(true); 
        setFullName("");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal Mendaftar",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // --- TAMPILAN ---

  return (
    <div className="min-h-screen flex w-full bg-gray-50">
      {/* Bagian Kiri - Branding & Info (Hanya Desktop) */}
      <div className="hidden lg:flex w-1/2 bg-green-900 relative overflow-hidden flex-col justify-between p-12 text-white">
        {/* Background Blur Effects */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-yellow-400 blur-3xl"></div>
        </div>
        
        {/* Header Kiri dengan LOGO MA'HAD */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/20">
            <img 
              src="/logo mahad.png" 
              alt="Logo Al-Jawahir" 
              className="h-12 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-yellow-400"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>';
              }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-wider font-serif">SIMATREN AL-JAWAHIR</h1>
            <p className="text-green-200 text-sm tracking-widest uppercase">Sistem Informasi Pesantren</p>
          </div>
        </div>

        {/* Konten Utama Kiri */}
        <div className="relative z-10 space-y-6 max-w-lg">
          <h2 className="text-4xl font-bold leading-tight">
            Transformasi Digital <span className="text-yellow-400">SIMATREN</span> Terpadu
          </h2>
          <p className="text-green-100 text-lg leading-relaxed opacity-90">
            Platform digital terintegrasi untuk pengelolaan akademik, kesantrian, dan administrasi pondok pesantren secara efisien dan real-time.
          </p>
          <div className="flex gap-4 pt-4">
            <div className="flex items-center gap-2 bg-green-800/50 px-4 py-2 rounded-full border border-green-700 backdrop-blur-sm">
              <Database className="h-5 w-5 text-green-400" />
              <span className="text-sm font-medium">Data Terintegrasi</span>
            </div>
            <div className="flex items-center gap-2 bg-green-800/50 px-4 py-2 rounded-full border border-green-700 backdrop-blur-sm">
              <GraduationCap className="h-5 w-5 text-yellow-400" />
              <span className="text-sm font-medium">Manajemen Akademik</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-green-300/60">
          &copy; {new Date().getFullYear()} Pondok Pesantren Salafiyah Al-Jawahir. All rights reserved.
        </div>
      </div>

      {/* Bagian Kanan - Form Login/Register */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-8 lg:p-12 relative overflow-y-auto">
        
        {/* 🔥 PERBAIKAN MOBILE: Logo & Judul di tengah, tidak menabrak form */}
        <div className="flex lg:hidden flex-col items-center justify-center gap-3 mb-8 w-full text-center mt-4">
           <div className="bg-green-900 p-3 rounded-2xl shadow-lg border border-green-800">
            <img src="/logo mahad.png" alt="Logo" className="h-10 w-auto object-contain filter brightness-0 invert" 
              onError={(e) => e.currentTarget.style.display = 'none'}
            />
          </div>
          <div>
            <h1 className="font-bold text-green-900 text-2xl font-serif tracking-wider">SIMATREN</h1>
            <p className="text-xs text-green-700 font-bold tracking-widest uppercase">Al-Jawahir</p>
          </div>
        </div>

        <Card className="w-full max-w-md border-none shadow-none bg-transparent">
          <CardContent className="p-0 space-y-8">
            <div className="space-y-2 text-center lg:text-left">
              <h2 className="text-3xl font-bold text-gray-900">
                {isLogin ? "PORTAL SIMATREN" : "Buat Akun Pengurus"}
              </h2>
              <p className="text-gray-500">
                {isLogin 
                  ? "Masukan kredensial Anda untuk mengakses sistem pesantren." 
                  : "Daftarkan akun baru untuk staf atau pengurus pondok."}
              </p>
            </div>

            <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-5">
              
              {/* 🔥 INPUT NAMA: Hanya muncul saat mode "Daftar" */}
              {!isLogin && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label htmlFor="fullName">Nama Lengkap</Label>
                  <Input 
                    id="fullName" 
                    type="text" 
                    placeholder="Contoh: Ahmad Fulan" 
                    className="h-12 border-gray-200 focus:border-green-500 focus:ring-green-500 bg-white"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="nama@aljawahir.com" 
                  className="h-12 border-gray-200 focus:border-green-500 focus:ring-green-500 bg-white"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="h-12 border-gray-200 focus:border-green-500 focus:ring-green-500 bg-white"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-green-900 hover:bg-green-800 text-white font-bold text-base transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 mt-2"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {isLogin ? "Masuk" : "Daftar Akun"} 
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-50 px-2 text-gray-500">Atau</span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                {isLogin ? "Belum memiliki akun staff? " : "Sudah memiliki akun? "}
                <button 
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="ml-2 font-bold text-green-700 hover:text-green-800 hover:underline transition-colors inline-flex items-center"
                >
                  {isLogin ? (
                    <>Daftar Sekarang <UserPlus className="ml-1 h-4 w-4" /></>
                  ) : (
                    <>Masuk Disini <LogIn className="ml-1 h-4 w-4" /></>
                  )}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
