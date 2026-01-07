import React, { createContext, useContext, useEffect, useState, useRef } from "react";
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
  signUp: (e: string, p: string, f: string, r: "admin" | "viewer") => Promise<any>;
  signIn: (e: string, p: string) => Promise<any>;
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
  const isMounted = useRef(true);

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Fungsi Fetch dengan RETRY & TIMEOUT
  const fetchProfileWithRetry = async (userId: string, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`🚀 Percobaan ambil data ke-${i + 1} untuk ID: ${userId}`);

        // 1. Buat janji timeout (2 detik max per request)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request Timeout")), 2000)
        );

        // 2. Request ke Database
        const dbPromise = supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        // 3. Balapan: Mana duluan, data sampai atau waktu habis?
        // @ts-ignore
        const { data, error } = await Promise.race([dbPromise, timeoutPromise]);

        if (error) throw error;

        if (data) {
          console.log("✅ Profil ditemukan (Admin/Viewer):", data.role);
          if (isMounted.current) setProfile(data as UserProfile);
          return; // SUKSES! Keluar dari loop
        }
      } catch (err: any) {
        console.warn(`⚠️ Gagal percobaan ke-${i + 1}:`, err.message || err);
        // Kalau belum limit retry, kita coba lagi (loop lanjut)
        if (i < retries - 1) {
             console.log("♻️ Mencoba ulang dalam 1 detik...");
             await new Promise(res => setTimeout(res, 1000));
        }
      }
    }
    console.error("🔥 Gagal mengambil profil setelah 3x percobaan.");
  };

  // 🔹 INIT SESSION
  useEffect(() => {
    isMounted.current = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (isMounted.current && initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          // Pakai fungsi retry yang baru
          await fetchProfileWithRetry(initialSession.user.id);
        }
      } catch (error) {
        console.error("Auth Init Error:", error);
      } finally {
        if (isMounted.current) {
          console.log("🏁 Init selesai. Mematikan loading.");
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted.current) return;
        console.log("🔔 Auth Event:", event);

        if (event === 'SIGNED_IN' && session) {
            setSession(session);
            setUser(session.user);
            // Pakai retry saat login juga
            await fetchProfileWithRetry(session.user.id);
            if (isMounted.current) setLoading(false);
        } else if (event === 'SIGNED_OUT') {
            setSession(null);
            setUser(null);
            setProfile(null);
            if (isMounted.current) setLoading(false);
        }
      }
    );

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: "admin" | "viewer") => {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: fullName, role } },
    });
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
      return { data: null, error };
    }
    toast({ title: "Berhasil", description: "Cek email/Login." });
    return { data, error: null };
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast({ title: "Gagal Login", description: error.message, variant: "destructive" });
      return { data: null, error };
    }
    toast({ title: "Login Berhasil" });
    return { data, error: null };
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user, session, profile, loading,
        signUp, signIn, signOut,
        isAdmin: profile?.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
