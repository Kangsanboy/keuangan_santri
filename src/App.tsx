import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Analytics } from "@vercel/analytics/react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SaldoKelas from "@/pages/SaldoKelas";
import CashierPage from "./components/CashierPage"; 

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/santri" element={<Index />} />
            <Route path="/keuangan" element={<Index />} />
            <Route path="/users" element={<Index />} /> {/* Biar refresh di menu users gak 404 */}
            <Route path="/pengguna" element={<Index />} /> {/* Jaga-jaga kalau pathnya pengguna */}
            
            <Route path="/saldo-kelas/:kelas" element={<SaldoKelas />} />
            
            {/* 🔥 ROUTE KASIR (Sekarang aman karena sudah di-import) */}
            <Route path="/kasir" element={<CashierPage />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
        <Analytics />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
