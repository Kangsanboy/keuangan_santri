import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import { toast } from "@/components/ui/use-toast";

/* =======================
   TYPES
======================= */

type Profile = {
  id: string;
  email: string;
  role: "admin" | "editor" | "viewer";
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

/* =======================
   CONTEXT
======================= */

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* =======================
   PROVIDER
======================= */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  /* =======================
     FETCH PROFILE
  ======================= */

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, role")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Fetch profile error:", error);
      setProfile(null);
      return;
    }

    setProfile(data as Profile);
  };

  /* =======================
     INIT & LISTENER
  ======================= */

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);

      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }

      if (mounted) setLoading(false);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        setLoading(true);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }

        if (mounted) setLoading(false);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  /* =======================
     AUTH ACTIONS
  ======================= */

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Login gagal",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Login berhasil" });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  /* =======================
     PROVIDER VALUE
  ======================= */

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* =======================
   HOOK
======================= */

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
