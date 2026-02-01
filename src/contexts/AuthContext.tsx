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
  const [isAdmin, setIsAdmin] = useState(false); // Default false dulu
  const { toast } = useToast();

  useEffect(() => {
    // 1. Cek Sesi Sederhana (Tanpa Cek Admin)
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        console.log("Sesi ditemukan:", session?.user?.email);
      } catch (error) {
        console.error("Error init session:", error);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // 2. Listener Login/Logout Sederhana
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("Status Auth Berubah:", _event);
      setSession(session);
      setUser(session?.user ?? null);
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
