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

  // 🔹 Update Fungsi Fetch Profile (SUDAH DIPERBAIKI)
  const fetchProfile = async (userId: string) => {
    try {
      // PENTING: Pakai 'userId' dari parameter, JANGAN pakai 'user.id' state karena bisa null
      console.log("🚀 Memulai pencarian profil untuk ID:", userId);

      const { data, error } = await supabase
        .from('users')  // Pastikan nama tabel benar
        .select('*')
        .eq('id', userId) // <-- PERBAIKAN UTAMA DISINI
        .single();

      if (error) {
        console.error("❌ Error Database:", error.message);
        // Jangan return dulu, biarkan loading selesai di akhir
      } else if (data) {
        console.log("✅ Data user ditemukan:", data);
        console.log("🧐 Role user ini adalah:", data.role);
        
        // SIMPAN DATA KE STATE (Ini yang bikin admin terbaca)
        setProfile(data as UserProfile);
      } else {
        console.warn("⚠️ Data user kosong di tabel 'users'");
      }

    } catch (err) {
      console.error("🔥 Fetch profile crash:", err);
    } finally {
      // Pastikan loading berhenti apapun yang terjadi
      setLoading(false);
    }
  };

  // 🔹 INIT SESSION
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();

        if (mounted) {
          setSession(data.session);
          setUser(data.session?.user ?? null);

          if (data.session?.user) {
            // Panggil fetchProfile dengan ID dari session
            await fetchProfile(data.session.user.id);
          } else {
            setLoading(false);
          }
        }
      } catch (e) {
        console.error("Auth init error:", e);
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        
        console.log("Auth state changed:", _event);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Reset loading jadi true saat ganti user biar gak glitch
          setLoading(true);
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // 🔐 AUTH ACTIONS
  const signUp = async (email: string, password: string, fullName: string, role: "admin" | "viewer") => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role, 
        },
      },
    });

    if (error) {
      setLoading(false);
      toast({ title: "Registrasi gagal", description: error.message, variant: "destructive" });
      return { data: null, error };
    }

    toast({ title: "Registrasi berhasil", description: "Silakan login." });
    setLoading(false);
    return { data, error: null };
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      toast({ title: "Login gagal", description: error.message, variant: "destructive" });
      return { data: null, error };
    }

    toast({ title: "Login berhasil" });
    // Loading akan di-handle oleh onAuthStateChange
    return { data, error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
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
        // Cek admin dengan aman (pakai optional chaining)
        isAdmin: profile?.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
