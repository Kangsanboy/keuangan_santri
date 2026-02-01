import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client"; // KITA PAKAI INI SEKARANG
import { Wallet, ArrowRight, Loader2, UserPlus, LogIn, ShieldCheck } from "lucide-react";

const AuthPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  // --- LOGIC BARU (MESIN BARU) ---
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Panggil Supabase Langsung (Anti Error "is not a function")
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Login Berhasil",
        description: "Selamat datang kembali di Sistem Keuangan.",
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
    setLoading(true);

    try {
      // Panggil Supabase Langsung
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: email.split('@')[0],
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
        navigate("/");
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

  // --- TAMPILAN TETAP CANTIK (TIDAK DIUBAH) ---

  return (
    <div className="min-h-screen flex w-full bg-gray-50">
      {/* Bagian Kiri - Branding & Info */}
      <div className="hidden lg:flex w-1/2 bg-green-900 relative overflow-hidden flex-col justify-between p-12 text-white">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-yellow-400 blur-3xl"></div>
        </div>
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            <Wallet className="h-8 w-8 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-wider font-serif">AL-JAWAHIR</h1>
            <p className="text-green-200 text-xs tracking-widest uppercase">Financial System</p>
          </div>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <h2 className="text-4xl font-bold leading-tight">
            Sistem Pengelolaan <span className="text-yellow-400">Keuangan Santri</span> Terpadu
          </h2>
          <p className="text-green-100 text-lg leading-relaxed opacity-90">
            Platform digital untuk memantau tabungan, transaksi, dan administrasi keuangan pondok pesantren secara transparan dan realtime.
          </p>
          <div className="flex gap-4 pt-4">
            <div className="flex items-center gap-2 bg-green-800/50 px-4 py-2 rounded-full border border-green-700 backdrop-blur-sm">
              <ShieldCheck className="h-5 w-5 text-green-400" />
              <span className="text-sm font-medium">Aman & Terpercaya</span>
            </div>
            <div className="flex items-center gap-2 bg-green-800/50 px-4 py-2 rounded-full border border-green-700 backdrop-blur-sm">
              <Wallet className="h-5 w-5 text-yellow-400" />
              <span className="text-sm font-medium">Monitoring Realtime</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-green-300/60">
          &copy; 2024 Pondok Pesantren Salafiyah Al-Jawahir. All rights reserved.
        </div>
      </div>

      {/* Bagian Kanan - Form Login/Register */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12 relative">
        {/* Mobile Branding (Only visible on small screens) */}
        <div className="absolute top-6 left-6 flex lg:hidden items-center gap-2 mb-8">
           <div className="bg-green-900 p-2 rounded-lg">
            <Wallet className="h-6 w-6 text-yellow-400" />
          </div>
          <span className="font-bold text-green-900 font-serif tracking-wider">AL-JAWAHIR</span>
        </div>

        <Card className="w-full max-w-md border-none shadow-none bg-transparent">
          <CardContent className="p-0 space-y-8">
            <div className="space-y-2 text-center lg:text-left">
              <h2 className="text-3xl font-bold text-gray-900">
                {isLogin ? "Selamat Datang Kembali" : "Buat Akun Baru"}
              </h2>
              <p className="text-gray-500">
                {isLogin 
                  ? "Masukan kredensial akun anda untuk mengakses sistem." 
                  : "Isi data berikut untuk mendaftarkan akun baru."}
              </p>
            </div>

            <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="nama@email.com" 
                    className="h-12 border-gray-200 focus:border-green-500 focus:ring-green-500 bg-white"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                  </div>
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
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-green-900 hover:bg-green-800 text-white font-bold text-base transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {isLogin ? "Masuk ke Dashboard" : "Daftar Akun"} 
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
                {isLogin ? "Belum memiliki akun?" : "Sudah memiliki akun?"}
                <button 
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
