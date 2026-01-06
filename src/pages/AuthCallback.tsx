import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
  const timer = setTimeout(() => {
    navigate("/");
  }, 500);

  return () => clearTimeout(timer);
}, [navigate]);
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
