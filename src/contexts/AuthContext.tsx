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

  // 🔹 Fungsi Fetch Profile
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
  };

  // 🔹 USE EFFECT UTAMA (Anti-Stuck & Anti-Race Condition)
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (mounted) {
          if (session) {
            setSession(session);
            setUser(session.user);
            await fetchProfile(session.user.id);
          }
        }
      } catch (error) {
        console.error("Auth Init Error:", error);
      } finally {
        if (mounted) {
          console.log("🏁 Initial Load Selesai. Loading dimatikan.");
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log("🔔 Auth Event:", event);
        
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN' && session) {
            // Fetch profil saat baru login
            await fetchProfile(session.user.id);
            
            // 🔥 FIX PENTING DISINI:
            // Wajib matikan loading setelah fetch profil selesai
            // supaya spinner dari tombol login berhenti berputar.
            setLoading(false); 

        } else if (event === 'SIGNED_OUT') {
            setProfile(null);
            setLoading(false);
        } 
        // Note: Event INITIAL_SESSION diabaikan disini karena sudah dihandle oleh initializeAuth
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 🔐 AUTH ACTIONS
  const signUp = async (email: string, password: string, fullName: string, role: "admin" | "viewer") => {
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
    setLoading(true); // Menyalakan loading
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false); // Matikan kalau error
      toast({ title: "Login gagal", description: error.message, variant: "destructive" });
      return { data: null, error };
    }

    toast({ title: "Login berhasil" });
    // Loading akan dimatikan oleh listener onAuthStateChange di atas
    return { data, error: null };
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
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
