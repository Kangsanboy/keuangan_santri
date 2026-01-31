import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom"; 
import AuthPage from "@/components/AuthPage";
import TransactionForm from "@/components/TransactionForm";
import SantriManagement from "@/components/SantriManagement";
import SantriDetail from "@/components/SantriDetail"; 
import UserManagement from "@/components/UserManagement";
import WarungMonitoring from "@/components/WarungMonitoring"; 
import AcademicSettings from "@/components/AcademicSettings"; 
import AttendanceMonitoring from "@/components/AttendanceMonitoring"; // Import Absensi
import FinanceChart from "@/components/FinanceChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast"; 
import * as XLSX from "xlsx";
import { 
  LayoutDashboard, Wallet, Users, UserCog, LogOut, PanelLeftClose, PanelLeftOpen,
  Banknote, FileSpreadsheet, CalendarDays, Menu, History, ArrowUpCircle, ArrowDownCircle,
  Clock, ShieldAlert, Trash2, ScanBarcode, Store, BarChart3, GraduationCap, CalendarClock 
} from "lucide-react"; 

/* ================= TYPES ================= */
interface RekapSaldo { kelas: number; gender: "ikhwan" | "akhwat"; saldo: number; }
interface TransaksiItem {
  id: string; amount: number; type: "income" | "expense"; description: string;
  transaction_date: string; santri: { nama_lengkap: string; kelas: number; } | null;
  merchant: { full_name: string; } | null; 
}

const Index = () => {
  const { user, loading, isAdmin, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  /* ================= STATE ================= */
  const [activeMenu, setActiveMenu] = useState<"dashboard" | "keuangan" | "santri" | "pengguna" | "monitoring_warung" | "akademik" | "absensi">("dashboard");
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768); 
  const [selectedKelasSantri, setSelectedKelasSantri] = useState<number | null>(null);
  const [detailSantriId, setDetailSantriId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("pending"); 
  const [linkedSantriId, setLinkedSantriId] = useState<string | null>(null);

  /* ================= STATE DATA ================= */
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

  /* ================= LOGIC: TOMBOL BACK HP ================= */
  useEffect(() => { window.history.replaceState({ menu: 'dashboard', detailId: null }, ''); }, []);
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (state) {
        if (state.menu) setActiveMenu(state.menu);
        setDetailSantriId(state.detailId || null);
        if (window.innerWidth < 768) setSidebarOpen(false);
      } else {
        setActiveMenu('dashboard'); setDetailSantriId(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (menu: any, detailId: string | null = null) => {
    window.history.pushState({ menu, detailId }, '', '');
    setActiveMenu(menu); setDetailSantriId(detailId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  /* ================= LOGIC: CEK ROLE ================= */
  useEffect(() => {
    const checkUserRole = async () => {
        if (!user) return;
        try {
            const { data } = await supabase.from('users').select('role, linked_santri_id').eq('id', user.id).single();
            if (data) {
                setUserRole(data.role);
                setLinkedSantriId(data.linked_santri_id);
                if (data.role === 'kantin') { navigate('/kasir'); return; }
                if (data.role === 'parent' && data.linked_santri_id) {
                    setDetailSantriId(data.linked_santri_id); setActiveMenu("santri"); setSidebarOpen(false);
                }
            }
        } catch (err) { console.error("Gagal cek role:", err); }
    };
    checkUserRole();
  }, [user, navigate]);

  /* ================= FETCH DATA ================= */
  const fetchKeuangan = useCallback(async () => {
    if (userRole === 'pending') return; 
    
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 6);

    const { data } = await supabase.from("transactions_2025_12_01_21_34")
        .select("amount, type, transaction_date")
        .order('transaction_date', { ascending: false }); 

    if (data) {
        let m=0, k=0, m7=0, k7=0;
        data.forEach(d => {
           const tgl = new Date(d.transaction_date);
           if(d.type==='income') m+=d.amount; else k+=d.amount;
           if(tgl>=sevenDaysAgo && tgl<=now) { 
               if(d.type==='income') m7+=d.amount; else k7+=d.amount; 
           }
        });
        setTotalMasuk(m); setTotalKeluar(k); setMasuk7Hari(m7); setKeluar7Hari(k7);
    }
    
    const { data: detailHariIni } = await supabase.from("transactions_2025_12_01_21_34")
      .select(`id, amount, type, description, transaction_date, created_at, santri:santri_id ( nama_lengkap, kelas ), merchant:merchant_id(full_name)`)
      .eq("transaction_date", todayStr)
      .order("created_at", { ascending: false });
      
    if (detailHariIni) {
        setTrxHariIni(detailHariIni as any);
        const pengeluaranHariIni = detailHariIni
            .filter(d => d.type === 'expense')
            .reduce((acc, curr) => acc + curr.amount, 0);
        setKeluarHariIni(pengeluaranHariIni);
    }
  }, [userRole]);

  const fetchRekapSaldo = useCallback(async () => {
    if (userRole === 'pending') return;
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
  }, [userRole]);

  useEffect(() => { if (user) { fetchKeuangan(); fetchRekapSaldo(); } }, [user, userRole, fetchKeuangan, fetchRekapSaldo]);
  useEffect(() => {
    const handleRefresh = () => { fetchKeuangan(); fetchRekapSaldo(); };
    window.addEventListener("refresh-keuangan", handleRefresh); return () => { window.removeEventListener("refresh-keuangan", handleRefresh); };
  }, [fetchKeuangan, fetchRekapSaldo]);

  /* AUTO REFRESH */
  useEffect(() => {
    const calculateTimeToMidnight = () => {
        const now = new Date(); const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0); 
        return (tomorrow.getTime() - now.getTime()) + 2000; 
    };
    const scheduleRefresh = () => {
        const timeToWait = calculateTimeToMidnight();
        const timerId = setTimeout(() => {
            fetchKeuangan(); fetchRekapSaldo();
            toast({ title: "Pergantian Hari 🕛", description: "Data reset.", duration: 5000 });
            scheduleRefresh();
        }, timeToWait);
        return timerId;
    };
    const timer = scheduleRefresh(); return () => clearTimeout(timer);
  }, [fetchKeuangan, fetchRekapSaldo, toast]);

  /* ACTIONS */
  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm("Hapus transaksi ini?")) return;
    try {
        const { error } = await supabase.from('transactions_2025_12_01_21_34').delete().eq('id', id);
        if (error) throw error; toast({ title: "Dihapus", description: "Transaksi dihapus." }); fetchKeuangan(); fetchRekapSaldo();
    } catch (err: any) { toast({ title: "Gagal", description: err.message, variant: "destructive" }); }
  };

  const exportExcelBulanan = async () => { 
    const bulan = exportMonth; const tahun = exportYear; const namaBulan = monthsList[bulan];
    const awal = `${tahun}-${String(bulan + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(tahun, bulan + 1, 0).getDate(); const akhir = `${tahun}-${String(bulan + 1).padStart(2, "0")}-${lastDay}`;
    const { data, error } = await supabase.from("transactions_2025_12_01_21_34")
      .select(`transaction_date, type, amount, description, santri:santri_id ( nama_lengkap, kelas ), merchant:merchant_id(full_name)`)
      .gte("transaction_date", awal).lte("transaction_date", akhir).order("transaction_date");
    if (error || !data) return;
    const rows = data.map((d: any) => ({ 
        Tanggal: d.transaction_date, 
        Santri: d.santri?.nama_lengkap || "-", 
        Kelas: d.santri?.kelas || "-", 
        Jenis: d.type === "income" ? "Pemasukan" : "Pengeluaran", 
        Nominal: d.amount, 
        Keterangan: d.description, 
        Kasir: d.merchant?.full_name || "-" 
    }));
    const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Laporan"); XLSX.writeFile(wb, `Laporan Keuangan ${namaBulan} ${tahun}.xlsx`);
  };

  const handleOpenKelas = (kelas: number) => { setSelectedKelasSantri(kelas); navigateTo("santri", null); };
  const handleMenuClick = (menu: any) => { if (menu === "santri") setSelectedKelasSantri(null); navigateTo(menu, null); }
  const handleSelectSantri = (id: string) => { navigateTo("santri", id); }
  const handleBackFromDetail = () => { window.history.back(); }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin h-10 w-10 border-b-2 border-green-600 rounded-full" /></div>;
  if (!user) return <AuthPage />;

  const avatarUrl = user?.user_metadata?.avatar_url;
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0];
  const isParent = userRole === 'parent';
  const isSuperAdmin = userRole === 'super_admin';
  const hasAdminAccess = isAdmin || isSuperAdmin; 

  if (userRole === 'pending') {
      return (
          <div className="flex h-screen items-center justify-center bg-gray-50 p-4">
              <Card className="w-full max-w-md text-center shadow-lg border-green-100">
                  <CardHeader className="flex flex-col items-center pb-2">
                      <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-pulse"><Clock className="h-10 w-10 text-green-600" /></div>
                      <CardTitle className="text-xl font-bold text-gray-800">Menunggu Verifikasi</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <p className="text-gray-500">Halo <strong>{userName}</strong>, akun Anda sedang ditinjau oleh Admin.</p>
                      <Button onClick={signOut} variant="outline" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"><LogOut className="mr-2 h-4 w-4" /> Keluar Aplikasi</Button>
                  </CardContent>
              </Card>
          </div>
      );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans relative">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in" onClick={() => setSidebarOpen(false)} />}
      {!isParent && (
        <aside className={`fixed md:relative z-50 h-full bg-green-900 text-white shadow-2xl transition-transform duration-300 ease-in-out flex flex-col flex-shrink-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden"} w-[280px] md:w-auto`} style={{ width: isSidebarOpen && window.innerWidth >= 768 ? '18rem' : undefined }}>
           {/* HEADER SIDEBAR */}
           <div className="h-24 bg-green-950 flex items-center justify-center border-b border-green-800 relative overflow-hidden flex-shrink-0">
               <GraduationCap className="absolute -left-4 -bottom-4 text-green-800/30 w-32 h-32" />
               <div className={`text-center transition-opacity duration-300 ${!isSidebarOpen && "md:opacity-0"}`}>
                   <h1 className="text-xl font-bold tracking-widest text-yellow-400 font-serif">SIMATREN</h1>
                   <p className="text-[10px] text-green-200 tracking-widest uppercase mt-1">Sistem Informasi Pesantren</p>
               </div>
               <button onClick={() => setSidebarOpen(false)} className="absolute top-3 right-3 md:hidden text-green-200 hover:text-white p-1"><PanelLeftClose size={24} /></button>
           </div>
           
           <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
             
             {/* GROUP 1: UTAMA */}
             <p className="px-4 text-xs font-semibold text-green-400 uppercase tracking-wider mb-2 opacity-80">Utama</p>
             <button onClick={() => handleMenuClick("dashboard")} className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${activeMenu === "dashboard" ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" : "text-green-100 hover:bg-green-800"}`}><LayoutDashboard className="mr-3 h-5 w-5 flex-shrink-0" />Dashboard Pusat</button>
             
             {/* GROUP 2: AKADEMIK */}
             <div className="border-t border-green-800 my-4"></div>
             <p className="px-4 text-xs font-semibold text-green-400 uppercase tracking-wider mb-2 opacity-80">Akademik & Kesiswaan</p>
             <button onClick={() => handleMenuClick("santri")} className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${activeMenu === "santri" ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" : "text-green-100 hover:bg-green-800"}`}><Users className="mr-3 h-5 w-5 flex-shrink-0" />Data Santri</button>
             
             {/* MENU ABSENSI SUDAH AKTIF */}
             <button onClick={() => handleMenuClick("absensi")} className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${activeMenu === "absensi" ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" : "text-green-100 hover:bg-green-800"}`}>
                <Clock className="mr-3 h-5 w-5 flex-shrink-0" />Monitoring Absensi
             </button>
             
             {/* MENU JADWAL */}
             {isSuperAdmin && (
                <button onClick={() => handleMenuClick("akademik")} className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${activeMenu === "akademik" ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" : "text-green-100 hover:bg-green-800"}`}>
                    <CalendarClock className="mr-3 h-5 w-5 flex-shrink-0" />Atur Jadwal & Kegiatan
                </button>
             )}

             {/* GROUP 3: KEUANGAN */}
             <div className="border-t border-green-800 my-4"></div>
             <p className="px-4 text-xs font-semibold text-green-400 uppercase tracking-wider mb-2 opacity-80">Keuangan Digital</p>
             <button onClick={() => handleMenuClick("keuangan")} className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${activeMenu === "keuangan" ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" : "text-green-100 hover:bg-green-800"}`}><Wallet className="mr-3 h-5 w-5 flex-shrink-0" />Tabungan & Saldo</button>
             {isSuperAdmin && (
                 <button onClick={() => handleMenuClick("monitoring_warung")} className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${activeMenu === "monitoring_warung" ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" : "text-green-100 hover:bg-green-800"}`}>
                    <Store className="mr-3 h-5 w-5 flex-shrink-0" /> Monitoring Kantin
                 </button>
             )}

             {/* GROUP 4: SISTEM */}
             {isSuperAdmin && (
                 <>
                    <div className="border-t border-green-800 my-4"></div>
                    <p className="px-4 text-xs font-semibold text-green-400 uppercase tracking-wider mb-2 opacity-80">Sistem</p>
                    <button onClick={() => handleMenuClick("pengguna")} className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${activeMenu === "pengguna" ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" : "text-green-100 hover:bg-green-800"}`}><UserCog className="mr-3 h-5 w-5 flex-shrink-0" />Manajemen User</button>
                 </>
             )}
           </nav>
           
           <div className="p-4 border-t border-green-800 bg-green-950 flex-shrink-0"><button onClick={signOut} className="flex items-center w-full px-4 py-3 rounded-lg text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-colors text-sm font-medium whitespace-nowrap"><LogOut className="mr-3 h-5 w-5 flex-shrink-0" />Keluar Aplikasi</button></div>
        </aside>
      )}

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">
        {/* HEADER ATAS - TOMBOL KASIR SUDAH DIHAPUS DISINI */}
        <header className="bg-white h-16 flex items-center justify-between px-4 md:px-6 shadow-sm z-10 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            {!isParent ? (
              <div className="flex items-center gap-2">
                  <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-gray-600 p-2 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors">{isSidebarOpen ? <PanelLeftClose size={24} className="hidden md:block" /> : <PanelLeftOpen size={24} className="hidden md:block" />}<Menu size={24} className="md:hidden" /></button>
                  {/* TOMBOL MODE KASIR SUDAH DIHAPUS DARI SINI */}
              </div>
            ) : (<div className="flex items-center gap-2 text-green-800 font-bold"><Banknote className="h-6 w-6" /> PPS AL-JAWAHIR (Wali Santri)</div>)}
          </div>
          <div className="flex items-center gap-3 max-w-[60%]">
                <div className="text-right hidden sm:block truncate"><p className="text-sm font-bold text-gray-800 truncate">{userName}</p><p className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full inline-block border border-green-200">{isParent ? "Orang Tua" : (isSuperAdmin ? "🚀 Super Admin" : (isAdmin ? "Admin" : "Viewer"))}</p></div>
                {isParent && <button onClick={signOut} className="ml-2 text-red-500 hover:bg-red-50 p-2 rounded-full" title="Keluar"><LogOut size={18} /></button>}
                {!isParent && <div className="h-9 w-9 rounded-full border-2 border-green-100 shadow-sm overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">{avatarUrl ? <img src={avatarUrl} alt="User" className="h-full w-full object-cover" /> : <span className="text-green-700 font-bold text-lg">{user?.email?.charAt(0).toUpperCase()}</span>}</div>}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 md:p-8 bg-gray-50/50 w-full">
          <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {isParent ? (
                detailSantriId ? <SantriDetail santriId={detailSantriId} onBack={() => {}} /> : <div className="text-center py-20 text-gray-500"><p className="font-bold mb-2">Akun belum terhubung</p><p className="text-sm">Silakan hubungi Admin.</p></div>
            ) : (
                <>
                    {/* DASHBOARD */}
                    {activeMenu === "dashboard" && (
                       <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                          <div className="text-center space-y-2 pb-4 border-b border-gray-200"><h1 className="text-xl md:text-3xl font-bold text-green-700 uppercase tracking-wide px-2">DASHBOARD PUSAT</h1><p className="text-gray-500 max-w-3xl mx-auto text-xs md:text-base leading-relaxed px-4">Ringkasan data pesantren secara real-time.</p></div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[7, 8, 9, 10, 11, 12].map((kls) => {
                              const ikhwan = rekapSaldo.find((r) => r.kelas === kls && r.gender === "ikhwan")?.saldo || 0;
                              const akhwat = rekapSaldo.find((r) => r.kelas === kls && r.gender === "akhwat")?.saldo || 0;
                              const total = ikhwan + akhwat;
                              return (
                                <div key={kls} onClick={() => handleOpenKelas(kls)} className="border-2 border-green-400/80 rounded-2xl bg-white shadow-sm p-4 cursor-pointer group relative overflow-hidden active:scale-95 transition-transform">
                                  <div className="absolute top-0 right-0 w-12 h-12 bg-green-50 rounded-bl-full -mr-6 -mt-6 z-0 group-hover:bg-green-100 transition-colors"></div>
                                  <h3 className="text-center font-bold text-gray-800 mb-3 text-lg relative z-10">Kelas {kls}</h3>
                                  <div className="space-y-2 text-sm font-medium relative z-10"><div className="flex justify-between items-center text-gray-600"><span>Ikhwan</span><span className="text-green-600">Rp {ikhwan.toLocaleString("id-ID")}</span></div><div className="flex justify-between items-center text-gray-600"><span>Akhwat</span><span className="text-pink-600">Rp {akhwat.toLocaleString("id-ID")}</span></div><div className="h-px bg-gray-200 my-1"></div><div className="flex justify-between items-center font-bold text-gray-900"><span>Total</span><span>Rp {total.toLocaleString("id-ID")}</span></div></div>
                                  <div className="mt-3 text-center relative z-10"><span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Lihat Detail &rarr;</span></div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[{ title: "Total Saldo", value: totalMasuk - totalKeluar, color: "text-green-600" }, { title: "Masuk 7 Hari", value: masuk7Hari, color: "text-green-600" }, { title: "Keluar 7 Hari", value: keluar7Hari, color: "text-red-600" }, { title: "Keluar Hari Ini", value: keluarHariIni, color: "text-orange-600" }].map((item, idx) => (<div key={idx} className="border border-green-500 rounded-xl bg-white shadow-sm p-3 text-center flex flex-col justify-center min-h-[100px]"><h4 className="text-[10px] md:text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">{item.title}</h4><p className={`text-sm md:text-xl font-bold ${item.color} break-words`}>Rp {item.value.toLocaleString("id-ID")}</p></div>))}</div>
                          <div className="border border-green-500 rounded-xl bg-white shadow-sm p-4 overflow-x-auto"><h3 className="text-center font-bold text-gray-800 mb-4 text-sm md:text-lg">Detail Saldo Per Kelas</h3><div className="min-w-[300px]"><FinanceChart data={rekapSaldo} /></div></div>
                       </div>
                    )}
                    
                    {/* KEUANGAN */}
                    {activeMenu === "keuangan" && hasAdminAccess && (
                        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                           <div className="flex items-center justify-between mb-2"><h2 className="text-xl md:text-2xl font-bold text-gray-800">Keuangan</h2></div>
                           <Card className="border-green-200 bg-white shadow-sm overflow-hidden"><CardHeader className="bg-green-50/50 border-b border-green-100 pb-3 p-4"><div className="flex items-center gap-2 text-green-800"><FileSpreadsheet className="w-5 h-5" /><CardTitle className="text-base md:text-lg">Laporan Bulanan</CardTitle></div></CardHeader><CardContent className="p-4"><div className="flex flex-col gap-3"><div className="flex gap-2"><div className="flex-1"><label className="text-xs font-medium text-gray-600">Bulan</label><select value={exportMonth} onChange={(e) => setExportMonth(parseInt(e.target.value))} className="w-full p-2 border border-gray-300 rounded-md text-sm">{monthsList.map((m, idx) => (<option key={idx} value={idx}>{m}</option>))}</select></div><div className="w-24"><label className="text-xs font-medium text-gray-600">Tahun</label><select value={exportYear} onChange={(e) => setExportYear(parseInt(e.target.value))} className="w-full p-2 border border-gray-300 rounded-md text-sm">{yearsList.map((y) => (<option key={y} value={y}>{y}</option>))}</select></div></div><Button onClick={exportExcelBulanan} className="bg-green-700 hover:bg-green-800 shadow-md w-full"><FileSpreadsheet className="mr-2 h-4 w-4" />Unduh Excel</Button></div></CardContent></Card>
                           <div className="bg-white rounded-xl shadow-sm border p-1 relative"><div className="absolute top-0 right-0 p-4 z-10 hidden md:block"><span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md border border-yellow-200 flex items-center gap-1"><CalendarDays size={12}/> Mode Input Tanggal</span></div><TransactionForm /></div>
                           <Card className="border-green-200 bg-white shadow-sm overflow-hidden">
                              <CardHeader className="bg-gray-50/50 border-b border-green-100 pb-3 p-4"><div className="flex items-center gap-2 text-gray-800"><History className="w-5 h-5 text-green-600" /><CardTitle className="text-base md:text-lg">Riwayat Transaksi Hari Ini</CardTitle></div></CardHeader>
                              <CardContent className="p-0">{trxHariIni.length === 0 ? (<div className="p-8 text-center text-gray-500 text-sm">Belum ada transaksi di tanggal ini.</div>) : (
                                <div className="divide-y divide-gray-100">
                                  {trxHariIni.map((trx, idx) => (
                                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-green-50/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            {trx.type === 'income' ? <ArrowUpCircle className="text-green-600 w-8 h-8 opacity-80" /> : <ArrowDownCircle className="text-red-500 w-8 h-8 opacity-80" />}
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-800 text-sm">{trx.santri ? trx.santri.nama_lengkap : "Tanpa Nama"}</span>
                                                <div className="text-xs text-gray-500 flex gap-2 flex-wrap">
                                                    <span>{trx.santri ? `Kelas ${trx.santri.kelas}` : "-"}</span>
                                                    <span>•</span>
                                                    <span className="italic">{trx.description || "Tanpa Keterangan"}</span>
                                                    {trx.merchant && (<span className="bg-teal-50 text-teal-700 px-1.5 rounded flex items-center gap-1"><Store className="w-3 h-3" /> {trx.merchant.full_name}</span>)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className={`font-bold text-sm ${trx.type === 'income' ? 'text-green-700' : 'text-red-600'}`}>{trx.type === 'income' ? '+' : '-'} Rp {trx.amount.toLocaleString("id-ID")}</div>
                                            {hasAdminAccess && (<Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteTransaction(trx.id)}><Trash2 size={16} /></Button>)}
                                        </div>
                                    </div>
                                  ))}
                                </div>
                              )}</CardContent>
                           </Card>
                        </div>
                    )}

                    {/* DATA SANTRI */}
                    {activeMenu === "santri" && (
                      <div className="animate-in fade-in zoom-in duration-300 space-y-4">
                        {detailSantriId ? <SantriDetail santriId={detailSantriId} onBack={handleBackFromDetail} /> : (<><div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-3 rounded-lg border shadow-sm gap-2"><h2 className="text-base md:text-lg font-bold text-gray-800">{selectedKelasSantri ? `Data Santri Kelas ${selectedKelasSantri}` : "Data Semua Santri"}</h2>{selectedKelasSantri && <Button variant="outline" size="sm" onClick={() => setSelectedKelasSantri(null)} className="w-full md:w-auto">Tampilkan Semua</Button>}</div><SantriManagement key={selectedKelasSantri || 'all'} kelas={selectedKelasSantri ? String(selectedKelasSantri) : null} onSelectSantri={handleSelectSantri} /></>)}
                      </div>
                    )}
                    
                    {/* LAIN-LAIN */}
                    {activeMenu === "pengguna" && isSuperAdmin && <UserManagement />}
                    {activeMenu === "monitoring_warung" && isSuperAdmin && <WarungMonitoring />}
                    {activeMenu === "akademik" && isSuperAdmin && <AcademicSettings />}
                    {activeMenu === "absensi" && <AttendanceMonitoring />}
                </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
