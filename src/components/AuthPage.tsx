import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { 
  Database, ArrowRight, Loader2, UserPlus, LogIn, 
  GraduationCap, ArrowLeft, KeyRound, Eye, EyeOff, ShieldCheck 
} from "lucide-react";

const AuthPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null); // State khusus loading tombol sosmed
  
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false); 
  const [isUpdatePassword, setIsUpdatePassword] = useState(false); 
  const [showPassword, setShowPassword] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsUpdatePassword(true); setIsForgotPassword(false); setIsLogin(false);
      }
    });
    return () => { authListener.subscription.unsubscribe(); };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ title: "Login Berhasil", description: "Selamat datang di SIMATREN Al-Jawahir.", className: "bg-green-50 border-green-200 text-green-800" });
      navigate("/");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal Masuk", description: "Email belum diverifikasi atau kata sandi salah." });
    } finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return toast({ variant: "destructive", title: "Data Belum Lengkap", description: "Nama lengkap wajib diisi." });
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, role: 'pending' } } });
      if (error) throw error;
      toast({ title: "Pendaftaran Berhasil!", description: "Silakan CEK KOTAK MASUK EMAIL Anda untuk mengaktifkan akun.", className: "bg-blue-600 text-white font-bold", duration: 8000 });
      setIsLogin(true); setFullName(""); setPassword("");
    } catch (error: any) { toast({ variant: "destructive", title: "Gagal Mendaftar", description: error.message }); } 
    finally { setLoading(false); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast({ title: "Email Kosong", description: "Harap masukkan alamat email.", variant: "destructive" });
    setLoading(true);
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        toast({ title: "Link Reset Terkirim!", description: "Silakan cek kotak masuk Email Anda.", className: "bg-green-600 text-white font-bold" });
        setIsForgotPassword(false); 
    } catch (err: any) { toast({ title: "Gagal Mengirim Link", description: err.message, variant: "destructive" }); } 
    finally { setLoading(false); }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast({ title: "Kata Sandi Lemah", description: "Minimal harus 6 karakter.", variant: "destructive" });
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: password });
      if (error) throw error;
      toast({ title: "Kata Sandi Diperbarui!", description: "Silakan masuk menggunakan kata sandi baru Anda.", className: "bg-green-600 text-white font-bold" });
      setPassword(""); setIsUpdatePassword(false); setIsLogin(true);
    } catch (err: any) { toast({ title: "Gagal Mengubah Sandi", description: err.message, variant: "destructive" }); } 
    finally { setLoading(false); }
  };

  // 🔥 FUNGSI LOGIN GOOGLE & FACEBOOK
  const handleOAuthLogin = async (provider: 'google' | 'facebook') => {
    setLoadingProvider(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ variant: "destructive", title: `Gagal masuk dengan ${provider}`, description: error.message });
      setLoadingProvider(null);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-green-900 lg:bg-gray-50 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-30 lg:opacity-10 pointer-events-none z-0">
        <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-yellow-400 blur-3xl"></div>
      </div>
      
      {/* KIRI (Desktop) */}
      <div className="hidden lg:flex w-1/2 bg-green-900 relative flex-col justify-between p-12 text-white z-10">
        <div className="relative z-10 flex items-center gap-4">
          <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/20">
            <img src="/logo mahad.png" alt="Logo" className="h-12 w-auto object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
          <div><h1 className="text-2xl font-bold tracking-wider font-serif">SIMATREN AL-JAWAHIR</h1><p className="text-green-200 text-sm tracking-widest uppercase">Sistem Informasi Pesantren</p></div>
        </div>
        <div className="relative z-10 space-y-6 max-w-lg">
          <h2 className="text-4xl font-bold leading-tight">Transformasi Digital <span className="text-yellow-400">SIMATREN</span> Terpadu</h2>
          <p className="text-green-100 text-lg leading-relaxed opacity-90">Platform digital terintegrasi untuk pengelolaan akademik, kesantrian, dan administrasi pondok pesantren.</p>
        </div>
        <div className="relative z-10 text-sm text-green-300/60">&copy; {new Date().getFullYear()} Pondok Pesantren Salafiyah Al-Jawahir.</div>
      </div>

      {/* KANAN - FORM AREA */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12 relative z-10 overflow-y-auto">
        
        {/* Logo Mobile */}
        <div className="flex lg:hidden flex-col items-center justify-center gap-3 mb-6 w-full text-center mt-4">
           <div className="bg-white/10 p-3 rounded-2xl shadow-lg border border-white/20 backdrop-blur-md">
            <img src="/logo mahad.png" alt="Logo" className="h-12 w-auto object-contain drop-shadow-lg" onError={(e) => e.currentTarget.style.display = 'none'} />
          </div>
          <div><h1 className="font-bold text-white text-3xl font-serif tracking-wider drop-shadow-md">SIMATREN</h1></div>
        </div>

        <Card className="w-full max-w-md border-none shadow-2xl lg:shadow-none bg-white/95 lg:bg-transparent backdrop-blur-md rounded-3xl lg:rounded-none">
          <CardContent className="p-8 lg:p-0 space-y-8">
            
            {/* LUPA SANDI & GANTI SANDI DISINI (Diringkas agar fokus ke tampilan form login) */}
            {isUpdatePassword ? (
              <div className="animate-in fade-in zoom-in duration-500">
                <div className="space-y-2 text-center lg:text-left mb-6">
                  <ShieldCheck className="w-8 h-8 text-green-600 mb-2" />
                  <h2 className="text-2xl font-bold text-gray-900">Buat Sandi Baru</h2>
                </div>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <Input type={showPassword ? "text" : "password"} placeholder="Minimal 6 karakter" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12"/>
                  <Button type="submit" className="w-full h-12 bg-green-600 text-white" disabled={loading}>Simpan Sandi Baru</Button>
                </form>
              </div>
            ) : isForgotPassword ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-2 text-center lg:text-left mb-6">
                  <KeyRound className="w-8 h-8 text-orange-600 mb-2" />
                  <h2 className="text-2xl font-bold text-gray-900">Lupa Kata Sandi?</h2>
                </div>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <Input type="email" placeholder="Email terdaftar" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12"/>
                  <Button type="submit" className="w-full h-12 bg-orange-500 text-white" disabled={loading}>Kirim Tautan Reset</Button>
                  <Button variant="link" onClick={() => setIsForgotPassword(false)} className="w-full text-gray-500">Kembali ke Login</Button>
                </form>
              </div>
            ) : (
              
              /* ================= MODE LOGIN / REGISTER UTAMA ================= */
              <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                <div className="space-y-2 text-center lg:text-left pt-2 lg:pt-0">
                  <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">{isLogin ? "PORTAL SIMATREN" : "Buat Akun Pengurus"}</h2>
                  <p className="text-gray-500 text-sm lg:text-base">{isLogin ? "Masukan kredensial Anda untuk mengakses sistem pesantren." : "Daftarkan akun baru untuk staf atau pengurus pondok."}</p>
                </div>

                <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-5 mt-8">
                  {!isLogin && (
                    <div className="space-y-2">
                      <Label>Nama Lengkap</Label>
                      <Input type="text" placeholder="Contoh: Ahmad Fulan" value={fullName} onChange={(e) => setFullName(e.target.value)} required={!isLogin} className="h-12"/>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input type="email" placeholder="nama@aljawahir.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                       <Label>Password</Label>
                       {isLogin && <button type="button" onClick={() => setIsForgotPassword(true)} className="text-xs font-bold text-green-700 hover:underline">Lupa sandi?</button>}
                    </div>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-12 bg-green-900 hover:bg-green-800 text-white font-bold text-base shadow-lg mt-2 rounded-xl" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <>{isLogin ? "Masuk" : "Daftar Akun"} <ArrowRight className="ml-2 h-5 w-5" /></>}
                  </Button>
                </form>

                {/* GARIS ATAU */}
                <div className="relative mt-8 mb-6">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white lg:bg-gray-50 px-3 text-gray-400 font-bold tracking-wider">Atau lanjutkan dengan</span></div>
                </div>

                {/* 🔥 TOMBOL LOGIN GOOGLE & FACEBOOK */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="h-11 bg-white hover:bg-gray-50 border-gray-200 shadow-sm font-semibold text-gray-700"
                    onClick={() => handleOAuthLogin('google')}
                    disabled={loadingProvider !== null}
                  >
                    {loadingProvider === 'google' ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                      <>
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Google
                      </>
                    )}
                  </Button>

                  <Button 
                    type="button" 
                    variant="outline" 
                    className="h-11 bg-white hover:bg-gray-50 border-gray-200 shadow-sm font-semibold text-gray-700"
                    onClick={() => handleOAuthLogin('facebook')}
                    disabled={loadingProvider !== null}
                  >
                    {loadingProvider === 'facebook' ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                      <>
                        <svg className="w-5 h-5 mr-2 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        Facebook
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-center pb-2 lg:pb-0">
                  <p className="text-sm text-gray-600">
                    {isLogin ? "Belum memiliki akun staff? " : "Sudah memiliki akun? "}
                    <button type="button" onClick={() => setIsLogin(!isLogin)} className="ml-2 font-bold text-green-700 hover:text-green-800 hover:underline inline-flex items-center">
                      {isLogin ? <>Daftar Sekarang <UserPlus className="ml-1 h-4 w-4" /></> : <>Masuk Disini <LogIn className="ml-1 h-4 w-4" /></>}
                    </button>
                  </p>
                </div>
              </div>
            )}
            
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
