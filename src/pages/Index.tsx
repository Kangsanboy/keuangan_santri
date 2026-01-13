import React, { useEffect, useState, useCallback } from "react";
// ... (Import lainnya tetap sama)
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import AuthPage from "@/components/AuthPage";
import TransactionForm from "@/components/TransactionForm";
import SantriManagement from "@/components/SantriManagement";
// 🔥 IMPORT KOMPONEN BARU
import SantriDetail from "@/components/SantriDetail"; 
import UserManagement from "@/components/UserManagement";
import FinanceChart from "@/components/FinanceChart";
// ... (Import UI Components tetap sama)
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { 
  LayoutDashboard, Wallet, Users, UserCog, LogOut, PanelLeftClose, PanelLeftOpen,
  GraduationCap, FileSpreadsheet, CalendarDays, Menu, History, ArrowUpCircle, ArrowDownCircle
} from "lucide-react";

// ... (Interface RekapSaldo & TransaksiItem Tetap Sama)
interface RekapSaldo {
  kelas: number;
  gender: "ikhwan" | "akhwat";
  saldo: number;
}
interface TransaksiItem {
  id: string;
  amount: number;
  type: "income" | "expense";
  description: string;
  transaction_date: string;
  santri: { nama_lengkap: string; kelas: number; } | null;
}

const Index = () => {
  const { user, loading, isAdmin, signOut } = useAuth();
  
  // STATE UI
  const [activeMenu, setActiveMenu] = useState<"dashboard" | "keuangan" | "santri" | "pengguna">("dashboard");
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768); 
  const [selectedKelasSantri, setSelectedKelasSantri] = useState<number | null>(null);

  // 🔥 STATE BARU: Untuk menyimpan ID santri yang sedang dilihat detailnya
  const [detailSantriId, setDetailSantriId] = useState<string | null>(null);

  // ... (State Export & Data Keuangan Tetap Sama)
  const [exportMonth, setExportMonth] = useState(new Date().getMonth());
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const [rekapSaldo, setRekapSaldo] = useState<RekapSaldo[]>([]);
  const [totalMasuk, setTotalMasuk] = useState(0);
  const [totalKeluar, setTotalKeluar] = useState(0);
  const [masuk7Hari, setMasuk7Hari] = useState(0);
  const [keluar7Hari, setKeluar7Hari] = useState(0);
  const [keluarHariIni, setKeluarHariIni] = useState(0);
  const [trxHariIni, setTrxHariIni] = useState<TransaksiItem[]>([]);
  
  const monthsList = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const yearsList = [2024, 2025, 2026, 2027, 2028];

  // ... (Fungsi fetchKeuangan, fetchRekapSaldo, exportExcelBulanan TETAP SAMA TIDAK BERUBAH)
  // ... (Gunakan kode lama untuk bagian Logic Data ini)
  const fetchKeuangan = useCallback(async () => { /* Kode Lama */ 
      // ... Copy isi dari file Index.tsx sebelumnya ...
      const today = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 6);
      const todayStr = today.toISOString().slice(0, 10);

      const { data } = await supabase.from("transactions_2025_12_01_21_34").select("amount, type, transaction_date");
      if (data) {
          let m=0, k=0, m7=0, k7=0, kToday=0;
          data.forEach(d => {
             const tgl = new Date(d.transaction_date);
             if(d.type==='income') m+=d.amount; else k+=d.amount;
             if(tgl>=sevenDaysAgo && tgl<=today) { if(d.type==='income') m7+=d.amount; else k7+=d.amount; }
             if(d.type==='expense' && d.transaction_date===todayStr) kToday+=d.amount;
          });
          setTotalMasuk(m); setTotalKeluar(k); setMasuk7Hari(m7); setKeluar7Hari(k7); setKeluarHariIni(kToday);
      }
      const { data: detailHariIni } = await supabase.from("transactions_2025_12_01_21_34")
        .select(`id, amount, type, description, transaction_date, created_at, santri:santri_id ( nama_lengkap, kelas )`)
        .eq("transaction_date", todayStr).order("created_at", { ascending: false });
      if (detailHariIni) setTrxHariIni(detailHariIni as any);
  }, []);

  const fetchRekapSaldo = useCallback(async () => { /* Kode Lama */ 
      const { data } = await supabase.from("view_santri_saldo").select("kelas, gender, saldo");
      if (data) {
        const stats: RekapSaldo[] = [];
        const classes = [7, 8, 9, 10, 11, 12];
        const genders = ["ikhwan", "akhwat"];
        classes.forEach(k => { genders.forEach(g => { stats.push({ kelas: k, gender: g as any, saldo: 0 }); }); });
        data.forEach((item: any) => {
          const target = stats.find(s => s.kelas === item.kelas && s.gender === item.gender);
          if (target) target.saldo += (item.saldo || 0);
        });
        setRekapSaldo(stats);
      }
  }, []);

  const exportExcelBulanan = async () => { /* Kode Lama */ 
     // ... Copy dari file Index.tsx sebelumnya ...
     // ... agar tidak kepanjangan di sini ...
  };

  useEffect(() => { if (user) { fetchKeuangan(); fetchRekapSaldo(); } }, [user, fetchKeuangan, fetchRekapSaldo]);
  useEffect(() => {
    const handleRefresh = () => { fetchKeuangan(); fetchRekapSaldo(); };
    window.addEventListener("refresh-keuangan", handleRefresh);
    return () => { window.removeEventListener("refresh-keuangan", handleRefresh); };
  }, [fetchKeuangan, fetchRekapSaldo]);


  // NAVIGASI
  const handleOpenKelas = (kelas: number) => {
    setSelectedKelasSantri(kelas);
    setActiveMenu("santri");
    setDetailSantriId(null); // Reset detail kalau ganti menu
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleMenuClick = (menu: any) => {
    setActiveMenu(menu);
    if (menu === "santri") setSelectedKelasSantri(null);
    setDetailSantriId(null); // Reset detail kalau ganti menu
    if (window.innerWidth < 768) setSidebarOpen(false);
  }

  // 🔥 NAVIGASI KE DETAIL SANTRI
  const handleSelectSantri = (id: string) => {
      setDetailSantriId(id);
      window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll ke atas
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin h-10 w-10 border-b-2 border-green-600 rounded-full" /></div>;
  if (!user) return <AuthPage />;

  const avatarUrl = user?.user_metadata?.avatar_url;
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans relative">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in" onClick={() => setSidebarOpen(false)} />}
      
      {/* SIDEBAR (Kode Lama Tidak Berubah) */}
      <aside className={`fixed md:relative z-50 h-full bg-green-900 text-white shadow-2xl transition-transform duration-300 ease-in-out flex flex-col flex-shrink-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden"} w-[280px] md:w-auto`} style={{ width: isSidebarOpen && window.innerWidth >= 768 ? '18rem' : undefined }}>
        <div className="h-20 bg-green-950 flex items-center justify-center border-b border-green-800 relative overflow-hidden flex-shrink-0">
            <GraduationCap className="absolute -left-4 -bottom-4 text-green-800/30 w-32 h-32" />
            <div className={`text-center transition-opacity duration-300 ${!isSidebarOpen && "md:opacity-0"}`}>
                <h1 className="text-xl font-bold tracking-widest text-yellow-400 font-serif">PPS AL-JAWAHIR</h1>
                <p className="text-[10px] text-green-200 tracking-widest uppercase mt-1">Sistem Keuangan Digital</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="absolute top-3 right-3 md:hidden text-green-200 hover:text-white p-1"><PanelLeftClose size={24} /></button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <p className="px-4 text-xs font-semibold text-green-400 uppercase tracking-wider mb-2 opacity-80">Menu Utama</p>
          <button onClick={() => handleMenuClick("dashboard")} className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${activeMenu === "dashboard" ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" : "text-green-100 hover:bg-green-800"}`}><LayoutDashboard className="mr-3 h-5 w-5 flex-shrink-0" />Dashboard</button>
          <button onClick={() => handleMenuClick("keuangan")} className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${activeMenu === "keuangan" ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" : "text-green-100 hover:bg-green-800"}`}><Wallet className="mr-3 h-5 w-5 flex-shrink-0" />Keuangan</button>
          <div className="border-t border-green-800 my-4"></div>
          <p className="px-4 text-xs font-semibold text-green-400 uppercase tracking-wider mb-2 opacity-80">Database</p>
          <button onClick={() => handleMenuClick("santri")} className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${activeMenu === "santri" ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" : "text-green-100 hover:bg-green-800"}`}><Users className="mr-3 h-5 w-5 flex-shrink-0" />Data Santri</button>
          {isAdmin && <button onClick={() => handleMenuClick("pengguna")} className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${activeMenu === "pengguna" ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" : "text-green-100 hover:bg-green-800"}`}><UserCog className="mr-3 h-5 w-5 flex-shrink-0" />Admin</button>}
        </nav>
        <div className="p-4 border-t border-green-800 bg-green-950 flex-shrink-0">
            <button onClick={signOut} className="flex items-center w-full px-4 py-3 rounded-lg text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-colors text-sm font-medium whitespace-nowrap"><LogOut className="mr-3 h-5 w-5 flex-shrink-0" />Keluar Aplikasi</button>
        </div>
      </aside>

      {/* CONTENT */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">
        <header className="bg-white h-16 flex items-center justify-between px-4 md:px-6 shadow-sm z-10 border-b flex-shrink-0">
            <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-gray-600 p-2 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors">
                    {isSidebarOpen ? <PanelLeftClose size={24} className="hidden md:block" /> : <PanelLeftOpen size={24} className="hidden md:block" />}
                    <Menu size={24} className="md:hidden" />
                </button>
            </div>
            <div className="flex items-center gap-3 max-w-[60%]">
                <div className="text-right hidden sm:block truncate">
                    <p className="text-sm font-bold text-gray-800 truncate">{userName}</p>
                    <p className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full inline-block">{isAdmin ? "Admin" : "Viewer"}</p>
                </div>
                <div className="h-9 w-9 rounded-full border-2 border-green-100 shadow-sm overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {avatarUrl ? <img src={avatarUrl} alt="User" className="h-full w-full object-cover" /> : <span className="text-green-700 font-bold text-lg">{user?.email?.charAt(0).toUpperCase()}</span>}
                </div>
            </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 md:p-8 bg-gray-50/50 w-full">
          <div className="max-w-7xl mx-auto space-y-6 pb-20">

            {/* --- DASHBOARD --- */}
            {activeMenu === "dashboard" && (
              <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="text-center space-y-2 pb-4 border-b border-gray-200">
                    <h1 className="text-xl md:text-3xl font-bold text-green-700 uppercase tracking-wide px-2">KEUANGAN PPS AL-JAWAHIR</h1>
                    <p className="text-gray-500 max-w-3xl mx-auto text-xs md:text-base leading-relaxed px-4">Monitoring data saldo santri secara real-time.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[7, 8, 9, 10, 11, 12].map((kls) => {
                      const ikhwan = rekapSaldo.find((r) => r.kelas === kls && r.gender === "ikhwan")?.saldo || 0;
                      const akhwat = rekapSaldo.find((r) => r.kelas === kls && r.gender === "akhwat")?.saldo || 0;
                      const total = ikhwan + akhwat;
                      return (
                        <div key={kls} onClick={() => handleOpenKelas(kls)} className="border-2 border-green-400/80 rounded-2xl bg-white shadow-sm p-4 cursor-pointer group relative overflow-hidden active:scale-95 transition-transform">
                          <div className="absolute top-0 right-0 w-12 h-12 bg-green-50 rounded-bl-full -mr-6 -mt-6 z-0 group-hover:bg-green-100 transition-colors"></div>
                          <h3 className="text-center font-bold text-gray-800 mb-3 text-lg relative z-10">Kelas {kls}</h3>
                          <div className="space-y-2 text-sm font-medium relative z-10">
                            <div className="flex justify-between items-center text-gray-600"><span>Ikhwan</span><span className="text-green-600">Rp {ikhwan.toLocaleString("id-ID")}</span></div>
                            <div className="flex justify-between items-center text-gray-600"><span>Akhwat</span><span className="text-pink-600">Rp {akhwat.toLocaleString("id-ID")}</span></div>
                            <div className="h-px bg-gray-200 my-1"></div>
                            <div className="flex justify-between items-center font-bold text-gray-900"><span>Total</span><span>Rp {total.toLocaleString("id-ID")}</span></div>
                          </div>
                          <div className="mt-3 text-center relative z-10"><span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Lihat Detail &rarr;</span></div>
                        </div>
                      );
                    })}
                </div>
                {/* Summary & Chart (Tetap Sama) */}
                {/* ... (Copy dari Index.tsx sebelumnya) ... */}
              </div>
            )}

            {/* --- KEUANGAN --- */}
            {activeMenu === "keuangan" && isAdmin && (
               // ... (Copy dari Index.tsx sebelumnya) ...
               // Gunakan kode lama untuk bagian Keuangan
               <div className="text-center py-10">Menu Keuangan (Gunakan Kode Lama)</div> 
            )}

            {/* --- SANTRI (LOGIKA BARU) --- */}
            {activeMenu === "santri" && (
              <div className="animate-in fade-in zoom-in duration-300 space-y-4">
                 
                 {/* 🔥 LOGIKA NAVIGASI: Kalau ada ID Santri, Tampilkan Detail. Kalau tidak, Tampilkan List. */}
                 {detailSantriId ? (
                     <SantriDetail 
                        santriId={detailSantriId} 
                        onBack={() => setDetailSantriId(null)} 
                     />
                 ) : (
                     <>
                        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-3 rounded-lg border shadow-sm gap-2">
                            <h2 className="text-base md:text-lg font-bold text-gray-800">
                                {selectedKelasSantri ? `Data Santri Kelas ${selectedKelasSantri}` : "Data Semua Santri"}
                            </h2>
                            {selectedKelasSantri && <Button variant="outline" size="sm" onClick={() => setSelectedKelasSantri(null)} className="w-full md:w-auto">Tampilkan Semua</Button>}
                        </div>

                        <SantriManagement 
                            key={selectedKelasSantri || 'all'} 
                            kelas={selectedKelasSantri ? String(selectedKelasSantri) : null} 
                            onSelectSantri={handleSelectSantri} // 🔥 OPER FUNGSI INI
                        />
                     </>
                 )}
              </div>
            )}

            {/* --- USER --- */}
            {activeMenu === "pengguna" && isAdmin && <UserManagement />}

          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
