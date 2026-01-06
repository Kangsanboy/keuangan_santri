import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuth = async () => {
      const { data, error } =
        await supabase.auth.getSession();

      if (error) {
        navigate("/login");
        return;
      }

      if (data.session) {
        // ✅ email confirmed & user logged in
        navigate("/"); // atau dashboard
      }
    };

    handleAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      Memverifikasi akun...
    </div>
  );
};

export default AuthCallback;
