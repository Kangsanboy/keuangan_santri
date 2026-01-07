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
  const isMounted = useRef(true); // 🔥 Pelacak status komponen

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Fungsi Fetch Profile yang TAHAN BANTING
  const fetchProfile = async (userId: string) => {
    try {
      console.log("🚀 Mengambil profil untuk ID:", userId);
      
      const { data, error } = await supabase
        .from('users') 
        .select('*')
        .eq('id', userId)
        .single();

      if (!isMounted.current) return; // Stop kalau komponen udah unmount

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

  // 🔹 USE EFFECT UTAMA (Anti-Stuck saat Reload)
  useEffect(() => {
    isMounted.current = true;

    const initializeAuth = async () => {
      try {
        // Cek sesi awal
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (isMounted.current && initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          // Tunggu profil sebentar
          await fetchProfile(initialSession.user.id);
        }
      } catch (error) {
        console.error("Auth Init Error:", error);
      } finally {
        // 🔥 FORCE STOP LOADING: Apapun yang terjadi, loading HARUS mati
        if (isMounted.current) {
          console.log("🏁 Init selesai, mematikan loading.");
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // 🔹 LISTENER REALTIME
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted.current) return;
        
        console.log("🔔 Auth Event:", event);
        
        if (event === 'SIGNED_IN' && session) {
            setSession(session);
            setUser(session.user);
            
            // Fetch profil dan matikan loading
            await fetchProfile(session.user.id);
            if (isMounted.current) setLoading(false);

        } else if (event === 'SIGNED_OUT') {
            setSession(null);
            setUser(null);
            setProfile(null);
            if (isMounted.current) setLoading(false);
        }
      }
    );

    // 🔥 SAFETY NET: Timeout 5 detik
    // Kalau karena satu dan lain hal loading masih nyangkut, matikan paksa.
    const safetyTimeout = setTimeout(() => {
        if (loading && isMounted.current) {
            console.warn("⚠️ Loading terlalu lama, mematikan paksa.");
            setLoading(false);
        }
    }, 5000);

    return () => {
      isMounted.current = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // 🔐 ACTIONS
  const signUp = async (email: string, password: string, fullName: string, role: "admin" | "viewer") => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });
    if (error) {
      toast({ title: "Registrasi gagal", description: error.message, variant: "destructive" });
      return { data: null, error };
    }
    toast({ title: "Registrasi berhasil", description: "Silakan login." });
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
    // Loading dimatikan oleh listener SIGNED_IN
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
