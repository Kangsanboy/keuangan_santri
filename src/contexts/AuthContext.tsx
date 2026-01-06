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
  loading: boolean;
  role: Role | null;
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
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("fetchRole error:", error.message);
    setRole("viewer");
    return;
  }

  if (!data) {
    console.warn("Profile tidak ditemukan untuk user:", userId);
    setRole("viewer");
    return;
  }

  setRole(data.role);
};

  /* ================= INIT AUTH ================= */
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();

        if (!mounted) return;

        const session = data.session;
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchRole(session.user.id); // ⬅️ TUNGGU ROLE
        } else {
          setRole(null);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (mounted) setLoading(false); // ⬅️ PASTI SELESAI
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchRole(session.user.id);
        } else {
          setRole(null);
        }

        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  /* ================= AUTH ACTION ================= */
  const signIn = async (email: string, password: string) => {
    const res = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return res;
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
        loading,
        role,
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
