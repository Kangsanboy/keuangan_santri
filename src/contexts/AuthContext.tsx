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

  useEffect(() => {
    // 1. Cek Sesi Saat Ini (Startup)
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await checkUserRole(session.user.id);
        }
      } catch (error) {
        console.error("Auth Init Error:", error);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // 2. Dengerin Perubahan Login/Logout (Realtime)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(true);

      if (session?.user) {
        await checkUserRole(session.user.id);
      } else {
        setIsAdmin(false); // Kalau logout, admin jadi false
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn("Gagal ambil role:", error.message);
        setIsAdmin(false);
      } else {
        setIsAdmin(data?.role === 'admin' || data?.role === 'super_admin');
      }
    } catch (error) {
      console.error("Role Check Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        toast({ title: "Logout Berhasil", description: "Sampai jumpa lagi!" });
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
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
