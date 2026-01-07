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

  // 🔹 Fetch profile dari tabel YANG BENAR
  // 🔹 Fetch profile dari tabel YANG BENAR
  // 🔹 Update Fungsi Fetch Profile
  const fetchProfile = async (userId: string) => {
    try {
      console.log("Mencari profil untuk user_id:", userId); // Debugging
      
      const { data, error } = await supabase
        .from("user_profiles_2025_12_01_21_34") 
        .select("*")
        .eq("user_id", userId) // <--- PERUBAHAN KRUSIAL DI SINI (Jangan pakai 'id')
        .maybeSingle(); 

      if (error) {
        console.warn("Error ambil profil:", error.message);
        setProfile(null);
        return;
      }

      if (!data) {
        console.warn("Profil tidak ditemukan (Data kosong). Cek apakah user_id ada di tabel?");
        setProfile(null);
        return;
      }

      console.log("Profil ditemukan:", data); // Kalau ini muncul, loading pasti hilang
      setProfile(data as UserProfile);
    } catch (err) {
      console.error("Fetch profile crash:", err);
      setProfile(null);
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
            await fetchProfile(data.session.user.id);
          }
        }
      } catch (e) {
        console.error("Auth init error:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        
        console.log("Auth state changed:", _event); // Debugging
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // 🔐 AUTH ACTIONS
  const signUp = async (email: string, password: string, fullName: string, role: "admin" | "viewer") => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role, // Metadata ini akan dicopy oleh Trigger Database (jika ada)
        },
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({ title: "Login gagal", description: error.message, variant: "destructive" });
      return { data: null, error };
    }

    toast({ title: "Login berhasil" });
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
        isAdmin: profile?.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
