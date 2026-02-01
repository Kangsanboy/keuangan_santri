import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  // FUNGSI CEK ADMIN (Berjalan di Background)
  const checkUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (!error && (data?.role === 'admin' || data?.role === 'super_admin')) {
        setIsAdmin(true);
        console.log("Role Admin Terkonfirmasi");
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      console.error("Background Role Check Error:", err);
      // Jangan lakukan apa-apa, biarkan user tetap login sebagai user biasa
    }
  };

  useEffect(() => {
    let mounted = true;

    // 1. Inisialisasi Sesi
    const initSession = async () => {
      try {
        // Ambil sesi
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          if (initialSession) {
            setSession(initialSession);
            setUser(initialSession.user);
            // JALANKAN CEK ADMIN TAPI JANGAN DITUNGGU (AWAIT)
            // Biar loading cepat selesai
            checkUserRole(initialSession.user.id);
          }
        }
      } catch (error) {
        console.error("Session Init Error:", error);
      } finally {
        // KUNCI ANTI LOADING ABADI:
        // Apapun yang terjadi, Loading HARUS berhenti!
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initSession();

    // 2. Listener Perubahan Auth (Login/Logout Realtime)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        // Cek admin di background
        checkUserRole(currentSession.user.id);
      } else {
        setIsAdmin(false);
      }

      // Pastikan loading mati setiap ada perubahan status
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        toast({ title: "Logout Berhasil", description: "Sampai jumpa lagi!" });
        // Paksa refresh biar bersih
        window.location.href = "/";
    } catch (error: any) {
        toast({ title: "Error Logout", description: error.message });
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
