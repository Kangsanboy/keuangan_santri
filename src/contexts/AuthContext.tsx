import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "viewer";

interface AuthContextType {
  user: any;
  role: Role | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  /* ================= AMBIL ROLE ================= */
  const fetchRole = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_profiles_2025_12_01_21_34")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      console.warn("Role tidak ditemukan, default viewer");
      return "viewer" as Role;
    }

    return data.role as Role;
  };

  /* ================= INIT AUTH ================= */
  useEffect(() => {
    let active = true;

    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) return;

        if (session?.user) {
          setUser(session.user);
          const fetchedRole = await fetchRole(session.user.id);
          if (active) setRole(fetchedRole);
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    initAuth();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!active) return;

        if (session?.user) {
          setUser(session.user);
          const fetchedRole = await fetchRole(session.user.id);
          if (active) setRole(fetchedRole);
        } else {
          setUser(null);
          setRole(null);
        }

        setLoading(false);
      }
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  /* ================= ACTION ================= */
  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  const isAdmin = role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        isAdmin,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/* ================= HOOK ================= */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth harus dipakai di dalam AuthProvider");
  }
  return ctx;
};
