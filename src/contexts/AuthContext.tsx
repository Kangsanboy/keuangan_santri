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

  // 1. FUNGSI CEK ADMIN (Dipisah biar aman)
  const checkAdminRole = async (userId: string) => {
    try {
      // Cek tabel users
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle(); // Pakai maybeSingle biar gak error 406
      
      if (error) {
        console.log("Info Role:", error.message);
        return;
      }
      
      const role = data?.role;
      setIsAdmin(role === 'admin' || role === 'super_admin');
    } catch (err) {
      console.error("Gagal cek role, anggap user biasa.");
    }
  };

  useEffect(() => {
    let mounted = true;

    // 2. CEK SESI AWAL (Hanya sekali pas web dibuka)
    const initSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          // Kalau ada user, baru cek admin
          if (initialSession?.user) {
            await checkAdminRole(initialSession.user.id);
          }
        }
      } catch (error) {
        console.error("Auth Init Error:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initSession();

    // 3. PASANG PENDENGAR (Listener) - Versi Paling Aman
    const { data } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      console.log("Auth Event:", event); // Debug di console
      
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      if (event === 'SIGNED_OUT') {
        setIsAdmin(false);
        setLoading(false);
      } else if (newSession?.user) {
        // Cek admin disini juga, tapi dibungkus try-catch
        await checkAdminRole(newSession.user.id);
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      if (data && data.subscription) {
        data.subscription.unsubscribe();
      }
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setIsAdmin(false);
    toast({ title: "Berhasil Keluar", description: "Anda telah logout." });
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
