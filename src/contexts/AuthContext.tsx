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

  // 🔹 Fetch profile dari public.users
  const fetchProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle(); // ✅ AMAN

    if (error) {
      console.warn("Profile fetch warning:", error.message);
      setProfile(null);
      return;
    }

    if (!data) {
      console.warn("Profile not found");
      setProfile(null);
      return;
    }

    setProfile(data);
  } catch (err) {
    console.error("Fetch profile error:", err);
    setProfile(null);
  }
};

  // 🔹 INIT SESSION
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();

      setSession(data.session);
      setUser(data.session?.user ?? null);

      if (data.session?.user) {
        await fetchProfile(data.session.user.id);
      }

      setLoading(false);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
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

    return () => listener.subscription.unsubscribe();
  }, []);

  // 🔐 AUTH ACTIONS
  const signUp = async (email: string, password: string, fullName: string, role: "admin" | "viewer") => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
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
  toast({
    title: "Login gagal",
    description: error.message,
    variant: "destructive",
  });
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
