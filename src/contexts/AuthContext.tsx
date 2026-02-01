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

  // FUNGSI CEK ADMIN (Versi Anti-Crash)
  const checkUserRole = async (userId: string) => {
    try {
      // Kita pakai 'maybeSingle()' bukan 'single()' biar kalau datanya ga ada, dia gak error merah
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn("Gagal cek role (Tapi User tetap boleh login):", error.message);
        return; // Stop disini, jangan bikin crash
      }

      // Set status Admin
      if (data?.role === 'admin' || data?.role === 'super_admin') {
        setIsAdmin(true);
        console.log("User terdeteksi sebagai ADMIN");
      } else {
        setIsAdmin(false);
      }
      
    } catch (err) {
      console.error("Error Cek Role:", err);
      // Biarkan user tetap login sebagai user biasa
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    // 1. Cek Sesi Awal
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await checkUserRole(session.user.id);
        }
      } catch (error) {
        console.error("Init Error:", error);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // 2. Pantau Login/Logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Kalau login, cek role lagi
        await checkUserRole(session.user.id);
      } else {
        // Kalau logout, reset admin
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return () => {
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
