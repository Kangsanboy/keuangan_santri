import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  role: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 🔥 SETTING BARU: LEBIH SABAR (BIAR NGGAK RE-TRY TERUS)
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // Jeda 1 detik antar percobaan
  const REQUEST_TIMEOUT = 10000; // 🔥 DULU 2000, SEKARANG 10000 (10 Detik)

  // Fungsi Fetch Profile dengan Logic "Sabar"
  const fetchProfile = async (userId: string, retryCount = 0) => {
    try {
      console.log(`🚀 Percobaan ambil data ke-${retryCount + 1} untuk ID: ${userId}`);

      // Race: Antara Data Database vs Timer
      const fetchPromise = supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request Timeout")), REQUEST_TIMEOUT)
      );

      // @ts-ignore
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (error) throw error;

      if (data) {
        console.log("✅ Profil ditemukan:", data.role);
        setRole(data.role);
        setLoading(false); // Stop loading langsung
      }
    } catch (error: any) {
      console.warn(`⚠️ Gagal percobaan ke-${retryCount + 1}:`, error.message);

      if (retryCount < MAX_RETRIES) {
        console.log(`♻️ Mencoba ulang dalam ${RETRY_DELAY}ms...`);
        setTimeout(() => {
          fetchProfile(userId, retryCount + 1);
        }, RETRY_DELAY);
      } else {
        console.error("🔥 Gagal mengambil profil setelah batas maksimal.");
        // Fallback biar gak blank putih selamanya
        setLoading(false); 
        // Opsional: Toast error kalau mau
        // toast({ title: "Koneksi Lambat", description: "Gagal memuat profil user.", variant: "destructive" });
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          if (initialSession) {
            setSession(initialSession);
            setUser(initialSession.user);
            // Langsung fetch profile
            fetchProfile(initialSession.user.id);
          } else {
            // Kalau gak ada session, ya udah stop loading (masuk login page)
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("Session init error:", err);
        setLoading(false);
      }
    };

    initSession();

    // Listener Perubahan Auth (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      console.log("🔔 Auth Event:", _event);
      
      if (mounted) {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Cek dulu apakah role sudah ada? Kalau null/pending, baru fetch ulang
          // Ini mencegah fetch ganda saat event SIGNED_IN dan INITIAL_SESSION tabrakan
          setLoading(true);
          fetchProfile(currentSession.user.id);
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setRole(null);
    setSession(null);
    setUser(null);
    setLoading(false);
    toast({ title: "Logout Berhasil", description: "Sampai jumpa lagi!" });
  };

  const isAdmin = role === "admin" || role === "super_admin";

  return (
    <AuthContext.Provider value={{ session, user, loading, isAdmin, role, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
