import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  email: string;
  role: "admin" | "viewer";
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: "admin" | "viewer"
  ) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Fungsi Fetch Profile yang Stabil
  const fetchProfile = async (userId: string) => {
    try {
      console.log("🚀 Mengambil profil untuk ID:", userId);
      const { data, error } = await supabase
        .from('users') 
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("❌ Gagal ambil profil:", error.message);
      } else if (data) {
        console.log("✅ Profil ditemukan. Role:", data.role);
        setProfile(data as UserProfile);
      } else {
        console.warn("⚠️ Data profil kosong");
      }
    } catch (err) {
      console.error("🔥 Error fetch:", err);
    }
    // Catatan: Kita TIDAK mematikan loading di sini, biar diatur oleh useEffect utama
  };

  // 🔹 USE EFFECT UTAMA (Anti-Stuck Loading)
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // 1. Cek sesi yang tersimpan di browser
        const { data: { session } } = await supabase.auth.getSession();

        if (mounted) {
          if (session) {
            setSession(session);
            setUser(session.user);
            // Tunggu ambil profil dulu baru matikan loading
            await fetchProfile(session.user.id);
          }
        }
      } catch (error) {
        console.error("Auth Init Error:", error);
      } finally {
        // 2. APAPUN YANG TERJADI, MATIKAN LOADING DI SINI
        if (mounted) {
          console.log("🏁 Initial Load Selesai. Loading dimatikan.");
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // 3. Listener untuk perubahan status (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log("🔔 Auth Event:", event);
        
        // Update state dasar
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN' && session) {
            // Kalau baru login, ambil profil
            await fetchProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
            // Kalau logout, kosongkan data
            setProfile(null);
            setLoading(false);
        } else if (event === 'INITIAL_SESSION') {
            // Abaikan event ini karena sudah dihandle oleh initializeAuth di atas
            // Ini kunci biar gak loading muter-muter
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 🔐 AUTH ACTIONS
  const signUp = async (email: string, password: string, fullName: string, role: "admin" | "viewer") => {
    // Jangan set loading true global biar UI gak kaget, cukup handle di component register
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    });

    if (error) {
      toast({ title: "Registrasi gagal", description: error.message, variant: "destructive" });
      return { data: null, error };
    }

    toast({ title: "Registrasi berhasil", description: "Silakan login." });
    return { data, error: null };
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true); // Nyalakan loading cuma pas klik tombol login
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      toast({ title: "Login gagal", description: error.message, variant: "destructive" });
      return { data: null, error };
    }

    // Sukses login, fetchProfile akan dijalankan oleh onAuthStateChange
    toast({ title: "Login berhasil" });
    return { data, error: null };
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    // State akan di-reset oleh onAuthStateChange
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        isAdmin: profile?.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
