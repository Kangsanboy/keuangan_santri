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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { toast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  /* ================= FETCH PROFILE ================= */
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error || !data) {
        setProfile(null);
        return;
      }

      setProfile(data);
    } catch {
      setProfile(null);
    }
  };

  /* ================= INIT SESSION ================= */
  useEffect(() => {
  let mounted = true;

  const init = async () => {
    try {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);

      if (data.session?.user) {
        await fetchProfile(data.session.user.id);
      }
    } catch (e) {
      console.error("Auth init error", e);
    } finally {
      if (mounted) setLoading(false); // ⬅️ INI KUNCI
    }
  };

  init();

  const { data: listener } = supabase.auth.onAuthStateChange(
    async (_event, session) => {
      if (!mounted) return;

      setSession(session ?? null);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }

      setLoading(false); // ⬅️ JANGAN LUPA
    }
  );

  return () => {
    mounted = false;
    listener.subscription.unsubscribe();
  };
}, []);

  /* ================= AUTH ACTIONS ================= */

  // 🔐 SIGN UP (EMAIL CONFIRM + REDIRECT)
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: "admin" | "viewer"
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName,
          role,
        },
      },
    });

    if (error) {
      toast({
        title: "Registrasi gagal",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }

    toast({
      title: "Registrasi berhasil",
      description: "Silakan cek email untuk verifikasi akun.",
    });

    return { data, error: null };
  };

  // 🔐 SIGN IN (CEK EMAIL VERIFIED)
  const signIn = async (email: string, password: string) => {
    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      toast({
        title: "Login gagal",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }

    if (!data.user?.email_confirmed_at) {
      await supabase.auth.signOut();
      toast({
        title: "Email belum diverifikasi",
        description: "Silakan cek email dan klik link verifikasi.",
        variant: "destructive",
      });
      return { data: null, error: "Email belum diverifikasi" };
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
