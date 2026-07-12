import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom"; 
import AuthPage from "@/components/AuthPage";
import TransactionForm from "@/components/TransactionForm";
import SantriManagement from "@/components/SantriManagement";
import SantriDetail from "@/components/SantriDetail"; 
import TeacherManagement from "@/components/TeacherManagement";
import SickLeaveManagement from "@/components/SickLeaveManagement";
import UserManagement from "@/components/UserManagement";
import WarungMonitoring from "@/components/WarungMonitoring"; 
import AcademicSettings from "@/components/AcademicSettings"; 
import AttendanceMonitoring from "@/components/AttendanceMonitoring"; 
import FinanceChart from "@/components/FinanceChart";
import ClassManagement from "@/components/ClassManagement";
import PiketManagement from "@/components/PiketManagement";
import ViolationManagement from "@/components/ViolationManagement";
import PermitManagement from "@/components/PermitManagement";
import { DoorOpen } from "lucide-react"; 
import { Scale } from "lucide-react"; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast"; 
import * as XLSX from "xlsx";
import { 
  LayoutDashboard, Wallet, Users, User, UserCog, LogOut, PanelLeftClose, PanelLeftOpen,
  Banknote, FileSpreadsheet, CalendarDays, Menu, History, ArrowUpCircle, ArrowDownCircle,
  Clock, ShieldAlert, Trash2, ScanBarcode, Store, BarChart3, GraduationCap, CalendarClock, 
  Activity, Shield, Library, ShieldCheck, UserCheck, RefreshCcw, AlertTriangle, Bell
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from "recharts";

/* ================= TYPES ================= */
interface RekapSaldo { kelas: number; gender: "ikhwan" | "akhwat"; saldo: number; }
interface TransaksiItem {
  id: string; amount: number; type: "income" | "expense"; description: string;
  transaction_date: string; santri: { nama_lengkap: string; kelas: number; } | null;
  merchant: { full_name: string; } | null; 
}

const COLORS = ['#22c55e', '#eab308', '#ef4444', '#3b82f6'];

const Index = () => {
  const { user, loading, isAdmin, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  /* ================= STATE ================= */
  const [activeMenu, setActiveMenu] = useState<"dashboard" | "keuangan" | "santri" | "manajemen_kelas" | "pengguna" | "monitoring_warung" | "akademik" | "absensi" | "guru" | "kesehatan" | "piket" | "pelanggaran" | "perizinan">("dashboard");
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768); 
  const [selectedKelasSantri, setSelectedKelasSantri] = useState<number | null>(null);
  const [detailSantriId, setDetailSantriId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("pending"); 
  
  const [targetAbsensiTab, setTargetAbsensiTab] = useState<string>("kbm");

  /* ================= STATE DATA & FILTER ================= */
  const [exportKelas, setExportKelas] = useState<string>("all");
  const [exportGender, setExportGender] = useState<string>("all");
  const [exportMonth, setExportMonth] = useState(new Date().getMonth());
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  
  // 🔥 STATE RESET SALDO
  const [resetKelas, setResetKelas] = useState<string>("");
  const [resetGender, setResetGender] = useState<string>("");
  const [isResetting, setIsResetting] = useState(false);

  // 🔥 STATE NOTIFIKASI
  const [pendingUsersCount, setPendingUsersCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const [historyDate, setHistoryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [riwayatTrx, setRiwayatTrx] = useState<TransaksiItem[]>([]);

  const [rekapSaldo, setRekapSaldo] = useState<RekapSaldo[]>([]);
  const [totalMasuk, setTotalMasuk] = useState(0);
  const [totalKeluar, setTotalKeluar] = useState(0);
  const [masuk7Hari, setMasuk7Hari] = useState(0);
  const [keluar7Hari, setKeluar7Hari] = useState(0);
  const [keluarHariIni, setKeluarHariIni] = useState(0);
  const [absensiLogs, setAbsensiLogs] = useState<any[]>([]); 
  
  const [loginHistory, setLoginHistory] = useState<any[]>([]);

  const monthsList = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const yearsList = [2024, 2025, 2026, 2027, 2028];

  /* ================= HELPER ================= */
  const getInitials = (name: string) => {
    if (!name) return "P"; 
    const words = name.trim().split(" ");
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

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

  useEffect(() => {
    const checkUserRole = async () => {
        if (!user) return;
        try {
            const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
            if (data) {
                setUserRole(data.role);
                if (data.role === 'kantin') { navigate('/kasir'); return; }

                const sessionKey = `has_opened_web_${user.id}`;
                if (!sessionStorage.getItem(sessionKey)) {
                    await supabase.from('user_login_logs').insert([{ user_id: user.id }]);
                    sessionStorage.setItem(sessionKey, 'true');
                }
            }
        } catch (err) { console.error("Gagal cek role:", err); }
    };
    checkUserRole();
  }, [user, navigate]);

  /* ================= FETCH DATA KEUANGAN, RIWAYAT & LOGIN ================= */
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
      .select(`amount, type`)
      .eq("transaction_date", todayStr);
      
    if (detailHariIni) {
        const pengeluaranHariIni = detailHariIni.filter(d => d.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
        setKeluarHariIni(pengeluaranHariIni);
    }
  }, [userRole]);

  const fetchRiwayatTransaksi = useCallback(async () => {
      if (userRole === 'pending') return;
      const { data } = await supabase.from("transactions_2025_12_01_21_34")
        .select(`id, amount, type, description, transaction_date, created_at, santri:santri_id ( nama_lengkap, kelas ), merchant:merchant_id(full_name)`)
        .eq("transaction_date", historyDate)
        .order("created_at", { ascending: false });
      
      if (data) setRiwayatTrx(data as any[]);
  }, [userRole, historyDate]);

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

  const fetchAbsensiHariIni = useCallback(async () => {
    if (userRole === 'pending') return;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const { data } = await supabase.from('attendance_logs')
        .select(`status, activity:activity_id(name, category)`)
        .not('santri_id', 'is', null) 
        .gte('created_at', `${todayStr}T00:00:00`)
        .lte('created_at', `${todayStr}T23:59:59`);
        
    if (data) setAbsensiLogs(data);
  }, [userRole]);

  const fetchLoginHistory = useCallback(async () => {
      if (userRole === 'super_admin' || userRole === 'guru') {
          const { data } = await supabase
            .from('user_login_logs')
            .select(`
                created_at,
                users (full_name, role)
            `)
            .order('created_at', { ascending: false })
            .limit(8); 
            
          if (data) {
              const formattedData = data.map((log: any) => ({
                  full_name: log.users?.full_name || "Tanpa Nama",
                  role: log.users?.role || "unknown",
                  created_at: log.created_at
              }));
              setLoginHistory(formattedData);
          }
      }
  }, [userRole]);

  // 🔥 FETCH DATA NOTIFIKASI PENDING USER (HANYA SUPER ADMIN)
  const fetchPendingUsers = useCallback(async () => {
      if (userRole === 'super_admin') {
          const { count, error } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'pending');
            
          if (!error && count !== null) {
              setPendingUsersCount(count);
          }
      }
  }, [userRole]);

  useEffect(() => { 
      if (user) { 
          fetchKeuangan(); fetchRekapSaldo(); fetchAbsensiHariIni(); fetchRiwayatTransaksi(); fetchLoginHistory(); fetchPendingUsers();
      } 
  }, [user, userRole, historyDate, fetchKeuangan, fetchRekapSaldo, fetchAbsensiHariIni, fetchRiwayatTransaksi, fetchLoginHistory, fetchPendingUsers]);
  
  useEffect(() => {
    const handleRefreshEvent = () => { 
        fetchKeuangan(); 
        fetchRekapSaldo(); 
        fetchRiwayatTransaksi(); 
        fetchPendingUsers();
    };
    window.addEventListener("refresh-keuangan", handleRefreshEvent); 
    
    const calculateTimeToMidnight = () => {
        const now = new Date(); const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0); 
        return (tomorrow.getTime() - now.getTime()) + 2000; 
    };
    const scheduleRefresh = () => {
        const timeToWait = calculateTimeToMidnight();
        const timerId = setTimeout(() => {
            handleRefreshEvent(); fetchAbsensiHariIni();
            toast({ title: "Pergantian Hari 🕛", description: "Data reset.", duration: 5000 });
            scheduleRefresh();
        }, timeToWait);
        return timerId;
    };
    const timer = scheduleRefresh(); 
    
    return () => { 
        clearTimeout(timer);
        window.removeEventListener("refresh-keuangan", handleRefreshEvent); 
    };
  }, [fetchKeuangan, fetchRekapSaldo, fetchRiwayatTransaksi, fetchAbsensiHariIni, fetchPendingUsers, toast]);

  /* ACTIONS */
  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm("Hapus transaksi ini?")) return;
    try {
        const { error } = await supabase.from('transactions_2025_12_01_21_34').delete().eq('id', id);
        if (error) throw error; toast({ title: "Dihapus", description: "Transaksi dihapus." }); 
        fetchKeuangan(); fetchRekapSaldo(); fetchRiwayatTransaksi();
    } catch (err: any) { toast({ title: "Gagal", description: err.message, variant: "destructive" }); }
  };

  const exportExcelBulanan = async () => { 
    const bulan = exportMonth; const tahun = exportYear; const namaBulan = monthsList[bulan];
    const awal = `${tahun}-${String(bulan + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(tahun, bulan + 1, 0).getDate(); const akhir = `${tahun}-${String(bulan + 1).padStart(2, "0")}-${lastDay}`;
    
    let dbQuery = supabase.from("transactions_2025_12_01_21_34")
      .select(`transaction_date, type, amount, description, santri:santri_id!inner ( nama_lengkap, kelas, gender ), merchant:merchant_id(full_name)`)
      .gte("transaction_date", awal).lte("transaction_date", akhir).order("transaction_date");
    
    if (exportKelas !== 'all') dbQuery = dbQuery.eq('santri.kelas', parseInt(exportKelas));
    if (exportGender !== 'all') dbQuery = dbQuery.eq('santri.gender', exportGender);
      
    const { data, error } = await dbQuery;
    if (error || !data) return toast({title: "Gagal", description: error?.message || "Data tidak ditemukan", variant: "destructive"});
    if (data.length === 0) return toast({title: "Kosong", description: "Tidak ada transaksi di filter ini.", variant: "destructive"});

    const rows = data.map((d: any) => ({ 
        Tanggal: d.transaction_date, 
        Santri: d.santri?.nama_lengkap || "-", 
        Kelas: d.santri?.kelas || "-", 
        "Jenis Kelamin": d.santri?.gender === 'ikhwan' ? 'L' : 'P',
        Jenis: d.type === "income" ? "Pemasukan" : "Pengeluaran", 
        Nominal: d.amount, 
        Keterangan: d.description, 
        Kasir: d.merchant?.full_name || "-" 
    }));
    const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Laporan"); 
    
    let fileName = `Lap_Keuangan_${namaBulan}_${tahun}`;
    if (exportKelas !== 'all') fileName += `_Kls${exportKelas}`;
    if (exportGender !== 'all') fileName += `_${exportGender}`;
    
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const handleResetSaldo = async () => {
    if (!resetKelas || !resetGender) return toast({ title: "Perhatian", description: "Mohon pilih Kelas dan Gender terlebih dahulu.", variant: "destructive" });
    if (!window.confirm(`PERINGATAN KERAS!\n\nAnda yakin ingin MENGOSONGKAN SALDO seluruh santri Kelas ${resetKelas} ${resetGender}?\n\nData yang direset tidak bisa dikembalikan.`)) return;

    setIsResetting(true);
    try {
        const { data: santriData, error: sErr } = await supabase.from('santri_2025_12_01_21_34')
            .select('id, nama_lengkap')
            .eq('kelas', parseInt(resetKelas))
            .eq('gender', resetGender)
            .eq('status', 'aktif');
            
        if (sErr) throw sErr;
        if (!santriData || santriData.length === 0) {
            toast({ title: "Gagal", description: "Tidak ada data santri di kelas tersebut.", variant: "destructive" });
            setIsResetting(false); return;
        }

        const santriIds = santriData.map(s => s.id);
        const { data: saldoData, error: saldoErr } = await supabase.from('view_santri_saldo').select('id, saldo').in('id', santriIds);
        
        if (saldoErr) throw saldoErr;

        const transactionsToInsert: any[] = [];
        const now = new Date().toISOString().split('T')[0];

        saldoData?.forEach(s => {
            if (s.saldo > 0) {
                transactionsToInsert.push({
                    user_id: user!.id,
                    santri_id: s.id,
                    type: 'expense',
                    amount: s.saldo,
                    description: 'Reset Saldo Berkala',
                    category: 'santri',
                    transaction_date: now
                });
            } else if (s.saldo < 0) {
                transactionsToInsert.push({
                    user_id: user!.id,
                    santri_id: s.id,
                    type: 'income',
                    amount: Math.abs(s.saldo),
                    description: 'Penyesuaian Reset Saldo',
                    category: 'santri',
                    transaction_date: now
                });
            }
        });

        if (transactionsToInsert.length === 0) {
            toast({ title: "Selesai", description: "Semua saldo di kelas ini sudah Rp 0." });
            setIsResetting(false); return;
        }

        const { error: insertErr } = await supabase.from('transactions_2025_12_01_21_34').insert(transactionsToInsert);
        if (insertErr) throw insertErr;

        toast({ title: "Berhasil!", description: `${transactionsToInsert.length} data saldo santri berhasil direset menjadi Rp 0.`, className: "bg-green-600 text-white" });
        fetchKeuangan(); fetchRekapSaldo(); fetchRiwayatTransaksi();
        setResetKelas(""); setResetGender("");
        
    } catch (err: any) {
        toast({ title: "Error Mereset", description: err.message, variant: "destructive" });
    } finally {
        setIsResetting(false);
    }
  };

  const handleOpenKelas = (kelas: number) => { setSelectedKelasSantri(kelas); navigateTo("santri", null); };
  const handleMenuClick = (menu: any) => { if (menu === "santri") setSelectedKelasSantri(null); navigateTo(menu, null); }
  const handleSelectSantri = (id: string) => { navigateTo("santri", id); }
  const handleBackFromDetail = () => { window.history.back(); }

  const getActivityType = (log: any) => {
      const cat = log.activity?.category?.toLowerCase() || '';
      const name = log.activity?.name?.toLowerCase() || '';
      
      if (cat === 'pelajaran') return 'kbm';
      if (cat === 'mengaji') return 'mengaji';
      if (cat === 'sholat') return 'sholat';
      if (cat === 'ekskul') return 'ekskul';
      
      if (name.includes('ngaji') || name.includes('quran') || name.includes('tahfidz') || name.includes('kitab') || name.includes("ba'da")) return 'mengaji';
      if (name.includes('sholat') || name.includes('dzuhur') || name.includes('ashar') || name.includes('maghrib') || name.includes('isya') || name.includes('subuh')) return 'sholat';
      
      return 'ekskul'; 
  };

  const getDashboardAbsenStats = (group: string) => {
      let filtered = absensiLogs.filter(l => getActivityType(l) === group);
      const total = filtered.length;
      if (total === 0) return [{ name: 'Belum Ada Data', value: 1 }];
      const hadir = filtered.filter(l => l.status === 'Hadir').length;
      const telat = filtered.filter(l => l.status === 'Telat').length;
      const izin = filtered.filter(l => l.status === 'Izin').length;
      const sakit = filtered.filter(l => l.status === 'Sakit').length;

      return [
          { name: 'Hadir', value: hadir },
          { name: 'Telat', value: telat },
          { name: 'Sakit/Izin', value: izin + sakit },
      ].filter(x => x.value > 0);
  };

  const DashboardChartCard = ({ title, data, tabName }: { title: string, data: any[], tabName: string }) => (
      <Card 
          className="border-2 border-green-400/80 rounded-2xl bg-white shadow-sm cursor-pointer group relative overflow-hidden active:scale-95 transition-transform hover:border-green-500 hover:shadow-md"
          onClick={() => {
              setTargetAbsensiTab(tabName);
              handleMenuClick("absensi");
          }}
      >
          <div className="absolute top-0 right-0 w-12 h-12 bg-green-50 rounded-bl-full -mr-6 -mt-6 z-0 group-hover:bg-green-100 transition-colors"></div>
          
          <CardHeader className="pb-2 relative z-10 border-b border-gray-100 bg-transparent px-3 pt-3">
              <CardTitle className="text-xs font-extrabold text-center uppercase text-gray-700 group-hover:text-green-700 transition-colors">{title}</CardTitle>
          </CardHeader>
          <CardContent className="h-[140px] pt-3 pb-2 relative z-10 bg-transparent px-2">
              {data[0].name === 'Belum Ada Data' ? (
                  <div className="flex items-center justify-center h-full text-[10px] text-gray-400 italic">Belum ada absen hari ini</div>
              ) : (
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie data={data} cx="50%" cy="50%" innerRadius={30} outerRadius={45} paddingAngle={5} dataKey="value">
                              {data.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                          </Pie>
                          <RechartsTooltip wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                          <Legend verticalAlign="bottom" height={24} iconSize={8} wrapperStyle={{ fontSize: '10px' }}/>
                      </PieChart>
                  </ResponsiveContainer>
              )}
          </CardContent>
      </Card>
  );

  /* ================= UI RENDER ================= */
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin h-10 w-10 border-b-2 border-green-600 rounded-full" /></div>;
  if (!user) return <AuthPage />;

  const avatarUrl = user?.user_metadata?.avatar_url;
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0];
  
  const isSuperAdmin = userRole === 'super_admin';
  const isGuru = userRole === 'guru'; 
  const isPengasuh = userRole === 'pengasuh';
  const hasAdminAccess = isAdmin || isSuperAdmin || isPengasuh;
  
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

  const totalSaldoReal = rekapSaldo.reduce((acc, curr) => acc + curr.saldo, 0);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans relative">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in" onClick={() => setSidebarOpen(false)} />}
      
      <aside className={`fixed md:relative z-50 h-full bg-green-900 text-white shadow-2xl transition-transform duration-300 ease-in-out flex flex-col flex-shrink-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden"} w-[280px] md:w-auto`} style={{ width: isSidebarOpen && window.innerWidth >= 768 ? '18rem' : undefined }}>
         
         <div className="py-8 bg-green-950 flex items-center justify-center border-b border-green-800 relative overflow-hidden flex-shrink-0 min-h-[130px]">
             <GraduationCap className="absolute -left-4 -bottom-4 text-green-800/30 w-32 h-32" />
             <div className={`text-center flex flex-col items-center transition-opacity duration-300 relative z-10 ${!isSidebarOpen && "md:opacity-0"}`}>
                 <img src="/mylogo.png" alt="Logo" className="h-12 w-auto object-contain mb-2 drop-shadow-md" onError={(e) => e.currentTarget.style.display = 'none'} />
                 <h1 className="text-xl font-bold tracking-widest text-yellow-400 font-serif leading-tight">SIMATREN</h1>
                 <p className="text-[10px] text-green-200 tracking-widest uppercase mt-0.5">Sistem Informasi Pesantren</p>
             </div>
             <button onClick={() => setSidebarOpen(false)} className="absolute top-3 right-3 md:hidden text-green-200 hover:text-white p-1"><PanelLeftClose size={24} /></button>
         </div>
         
         <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
           <p className="px-4 text-xs font-semibold text-green-400 uppercase tracking-wider mb-2 opacity-80">Utama</p>
           <button onClick={() => handleMenuClick("dashboard")} className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${activeMenu === "dashboard" ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" : "text-green-100 hover:bg-green-800"}`}><LayoutDashboard className="mr-3 h-5 w-5 flex-shrink-0" />Dashboard Pusat</button>
           
           <div className="border-t border-green-800 my-4"></div>
           <p className="px-4 text-xs font-semibold text-green-400 uppercase tracking-wider mb-2 opacity-80">Akademik & Kesiswaan</p>
           
           <button onClick={() => handleMenuClick("santri")} className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${activeMenu === "santri" ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" : "text-green-100 hover:bg-green-800"}`}><Users className="mr-3 h-5 w-5 flex-shrink-0" />Data Santri</button>

           {!isGuru && !isPengasuh && (
               <>
                   <button onClick={() => handleMenuClick("manajemen_kelas")} className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${activeMenu === "manajemen_kelas" ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" : "text-green-100 hover:bg-green-800"}`}><Library className="mr-3 h-5 w-5 flex-shrink-0" />Manajemen Kelas</button>
                   <button onClick={() => handleMenuClick("guru")} className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${activeMenu === "guru" ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" : "text-green-100 hover:bg-green-800"}`}><User className="mr-3 h-5 w-5 flex-shrink-0" />Data Guru</button>
               </>
           )}
           
           <button onClick={() => handleMenuClick("absensi")} className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${activeMenu === "absensi" ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" : "text-green-100 hover:bg-green-800"}`}><Clock className="mr-3 h-5 w-5 flex-shrink-0" />Monitoring Absensi</button>
           <button onClick={() => handleMenuClick("kesehatan")} className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${activeMenu === "kesehatan" ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" : "text-green-100 hover:bg-green-800"}`}><Activity className="mr-3 h-5 w-5 flex-shrink-0" />Catatan Kesehatan</button>
           
           {(isSuperAdmin || isAdmin || isGuru || isPengasuh) && (
           <button onClick={() => handleMenuClick("perizinan")} className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${activeMenu === "perizinan" ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" : "text-green-100 hover:bg-green-800"}`}><DoorOpen className="mr-3 h-5 w-5 flex-shrink-0" />Portal Perizinan</button>
          )}
           <button onClick={() => handleMenuClick("pelanggaran")} className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${activeMenu === "pelanggaran" ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" : "text-green-100 hover:bg-green-800"}`}><Scale className="mr-3 h-5 w-5 flex-shrink-0" />Catatan Pelanggaran</button>
           
           {isSuperAdmin && (
              <button onClick={() => handleMenuClick("akademik")} className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${activeMenu === "akademik" ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" : "text-green-100 hover:bg-green-800"}`}><CalendarClock className="mr-3 h-5 w-5 flex-shrink-0" />Atur Jadwal & Kegiatan</button>
           )}
           
           {!isGuru && (
               <>
                  <div className="border-t border-green-800 my-4"></div>
                  <p className="px-4 text-xs font-semibold text-green-400 uppercase tracking-wider mb-2 opacity-80">Keuangan Digital</p>
                  <button onClick={() => handleMenuClick("keuangan")} className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${activeMenu === "keuangan" ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" : "text-green-100 hover:bg-green-800"}`}><Wallet className="mr-3 h-5 w-5 flex-shrink-0" />Tabungan & Saldo</button>
                  {isSuperAdmin && (
                      <button onClick={() => handleMenuClick("monitoring_warung")} className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${activeMenu === "monitoring_warung" ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" : "text-green-100 hover:bg-green-800"}`}><Store className="mr-3 h-5 w-5 flex-shrink-0" /> Monitoring Kantin</button>
                  )}
               </>
           )}

           {(isAdmin || isSuperAdmin) && (
               <>
                  <div className="border-t border-green-800 my-4"></div>
                  <p className="px-4 text-xs font-semibold text-green-400 uppercase tracking-wider mb-2 opacity-80">Sistem & Operasional</p>
                  <button onClick={() => handleMenuClick("piket")} className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${activeMenu === "piket" ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" : "text-green-100 hover:bg-green-800"}`}><ShieldCheck className="mr-3 h-5 w-5 flex-shrink-0" />Piket Harian</button>
                  {isSuperAdmin && (
                      <button onClick={() => handleMenuClick("pengguna")} className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${activeMenu === "pengguna" ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" : "text-green-100 hover:bg-green-800"}`}><UserCog className="mr-3 h-5 w-5 flex-shrink-0" />Manajemen User</button>
                  )}
               </>
           )}
         </nav>
         
         <div className="p-4 border-t border-green-800 bg-green-950 flex-shrink-0"><button onClick={signOut} className="flex items-center w-full px-4 py-3 rounded-lg text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-colors text-sm font-medium whitespace-nowrap"><LogOut className="mr-3 h-5 w-5 flex-shrink-0" />Keluar Aplikasi</button></div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">
        
        {/* 🔥 FIX Z-INDEX HEADER JADI z-50 DAN RELATIVE */}
        <header className="bg-gradient-to-r from-white via-green-50/50 to-green-100/60 backdrop-blur-md h-20 flex items-center justify-between px-4 md:px-6 shadow-sm z-50 relative border-b border-green-200 flex-shrink-0">
          <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                  <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-green-800 p-2.5 bg-white border border-green-100 shadow-sm hover:bg-green-50 rounded-xl transition-all">{isSidebarOpen ? <PanelLeftClose size={20} className="hidden md:block" /> : <PanelLeftOpen size={20} className="hidden md:block" />}<Menu size={20} className="md:hidden" /></button>
              </div>
          </div>
          
          <div className="flex items-center gap-3 max-w-[70%]">
              
              {isSuperAdmin && (
                  <div className="relative">
                      <button 
                          onClick={() => setIsNotifOpen(!isNotifOpen)}
                          className="p-2 bg-white border border-green-100 rounded-full text-gray-600 hover:text-green-600 hover:bg-green-50 transition-colors relative shadow-sm"
                      >
                          <Bell size={20} />
                          {pendingUsersCount > 0 && (
                              <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold border-2 border-white shadow-sm">
                                  {pendingUsersCount}
                              </span>
                          )}
                      </button>

                      {isNotifOpen && (
                          <>
                              {/* Overlay dengan z-[90] dan bg agak gelap sedikit biar kelihatan fokus */}
                              <div className="fixed inset-0 z-[90] bg-black/5" onClick={() => setIsNotifOpen(false)}></div>
                              
                              {/* Notifikasi Menu dengan z-[100] paling tinggi */}
                              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-green-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
                                  <div className="bg-green-50 p-3 border-b border-green-100 flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                          <Bell className="w-4 h-4 text-green-700" />
                                          <h4 className="text-sm font-bold text-green-900">Notifikasi Sistem</h4>
                                      </div>
                                      <span className="text-[10px] bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-bold">{pendingUsersCount} Baru</span>
                                  </div>
                                  <div className="p-4 bg-white">
                                      {pendingUsersCount > 0 ? (
                                          <div className="space-y-4">
                                              <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                                                  <div className="p-2 bg-yellow-100 text-yellow-700 rounded-full shrink-0">
                                                      <UserCog size={16} />
                                                  </div>
                                                  <div>
                                                      <p className="text-sm font-bold text-gray-800">Akun Perlu Verifikasi</p>
                                                      <p className="text-xs text-gray-600 mt-1">Terdapat <strong>{pendingUsersCount} akun baru</strong> yang mendaftar dan masih berstatus "pending".</p>
                                                  </div>
                                              </div>
                                              <Button 
                                                  onClick={() => {
                                                      setIsNotifOpen(false);
                                                      handleMenuClick("pengguna");
                                                  }} 
                                                  className="w-full bg-green-600 hover:bg-green-700 text-xs h-9 shadow-sm"
                                              >
                                                  Proses Sekarang
                                              </Button>
                                          </div>
                                      ) : (
                                          <div className="text-center py-6">
                                              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2"><Bell className="w-5 h-5 text-gray-300"/></div>
                                              <p className="text-sm font-bold text-gray-500">Tidak ada notifikasi</p>
                                              <p className="text-xs text-gray-400 mt-1">Semua sistem berjalan lancar.</p>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          </>
                      )}
                  </div>
              )}

              <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm p-1.5 pr-4 rounded-full shadow-sm border border-green-100 hover:shadow-md transition-all cursor-pointer group" onClick={signOut} title="Klik untuk Keluar">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center text-white font-bold text-sm shadow-inner shrink-0 overflow-hidden">
                      {avatarUrl ? <img src={avatarUrl} alt="User" className="h-full w-full object-cover" /> : getInitials(userName)}
                  </div>
                  
                  <div className="hidden sm:flex flex-col justify-center text-left">
                      <span className="text-sm font-bold text-gray-800 leading-none capitalize truncate max-w-[120px] lg:max-w-[200px] group-hover:text-red-600 transition-colors">{userName}</span>
                      <span className="text-[10px] text-gray-500 mt-1 font-medium truncate max-w-[120px] lg:max-w-[200px]">{user?.email || "email@pesantren.com"}</span>
                  </div>

                  <div className="hidden sm:block h-6 w-px bg-gray-200 mx-1"></div>

                  <div className="hidden sm:block">
                      {isSuperAdmin ? (
                          <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest border border-yellow-200 shadow-sm">🚀 Super Admin</span>
                      ) : isAdmin ? (
                          <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest border border-green-200 shadow-sm"><ShieldAlert className="w-3 h-3" /> Admin</span>
                      ) : isGuru ? (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest border border-blue-200 shadow-sm">Guru / Staf</span>
                      ) : isPengasuh ? (
                          <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest border border-teal-200 shadow-sm">Pengasuh</span>
                      ) : (
                          <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-700 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest border border-gray-200 shadow-sm">Viewer</span>
                      )}
                  </div>
              </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 md:p-8 bg-gray-50/50 w-full">
          <div className="max-w-7xl mx-auto space-y-6 pb-20">
             
             {/* DASHBOARD */}
             {activeMenu === "dashboard" && (
                <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                   <div className="text-center space-y-2 pb-4 border-b border-gray-200"><h1 className="text-xl md:text-3xl font-bold text-green-700 uppercase tracking-wide px-2">DASHBOARD PUSAT</h1><p className="text-gray-500 max-w-3xl mx-auto text-xs md:text-base leading-relaxed px-4">Ringkasan data pesantren secara real-time.</p></div>
                   
                   <div className="space-y-4 mb-8 mt-2">
                       <h3 className="text-center font-extrabold text-gray-800 text-sm md:text-lg tracking-widest uppercase">MONITOR ABSENSI SANTRI</h3>
                       <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                           <DashboardChartCard title="KBM Sekolah" data={getDashboardAbsenStats('kbm')} tabName="kbm" />
                           <DashboardChartCard title="Mengaji" data={getDashboardAbsenStats('mengaji')} tabName="mengaji" />
                           <DashboardChartCard title="Sholat" data={getDashboardAbsenStats('sholat')} tabName="sholat" />
                           <DashboardChartCard title="Ekskul" data={getDashboardAbsenStats('ekskul')} tabName="ekskul" />
                       </div>
                   </div>

                   {/* DATA KEUANGAN */}
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                     {[7, 8, 9, 10, 11, 12].map((kls) => {
                       const ikhwan = rekapSaldo.find((r) => r.kelas === kls && r.gender === "ikhwan")?.saldo || 0;
                       const akhwat = rekapSaldo.find((r) => r.kelas === kls && r.gender === "akhwat")?.saldo || 0;
                       const total = ikhwan + akhwat;
                       return (
                         <div key={kls} onClick={() => handleOpenKelas(kls)} className="border-2 border-green-400/80 rounded-2xl bg-white shadow-sm p-4 cursor-pointer group relative overflow-hidden active:scale-95 transition-transform hover:shadow-md">
                           <div className="absolute top-0 right-0 w-12 h-12 bg-green-50 rounded-bl-full -mr-6 -mt-6 z-0 group-hover:bg-green-100 transition-colors"></div>
                           <h3 className="text-center font-bold text-gray-800 mb-3 text-lg relative z-10">Kelas {kls}</h3>
                           <div className="space-y-2 text-sm font-medium relative z-10"><div className="flex justify-between items-center text-gray-600"><span>Ikhwan</span><span className="text-green-600">Rp {ikhwan.toLocaleString("id-ID")}</span></div><div className="flex justify-between items-center text-gray-600"><span>Akhwat</span><span className="text-pink-600">Rp {akhwat.toLocaleString("id-ID")}</span></div><div className="h-px bg-gray-200 my-1"></div><div className="flex justify-between items-center font-bold text-gray-900"><span>Total</span><span>Rp {total.toLocaleString("id-ID")}</span></div></div>
                           <div className="mt-3 text-center relative z-10"><span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Lihat Detail &rarr;</span></div>
                         </div>
                       );
                     })}
                   </div>
                   
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                       {[
                           { title: "Total Saldo", value: totalSaldoReal, color: "text-green-600" }, 
                           { title: "Masuk 7 Hari", value: masuk7Hari, color: "text-green-600" }, 
                           { title: "Keluar 7 Hari", value: keluar7Hari, color: "text-red-600" }, 
                           { title: "Keluar Hari Ini", value: keluarHariIni, color: "text-orange-600" }
                       ].map((item, idx) => (
                           <div key={idx} className="border border-green-500 rounded-xl bg-white shadow-sm p-3 text-center flex flex-col justify-center min-h-[100px] hover:shadow-md transition-shadow">
                               <h4 className="text-[10px] md:text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">{item.title}</h4>
                               <p className={`text-sm md:text-xl font-bold ${item.color} break-words`}>Rp {item.value.toLocaleString("id-ID")}</p>
                           </div>
                       ))}
                   </div>

                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                       <div className={`border border-green-500 rounded-xl bg-white shadow-sm p-4 overflow-x-auto ${(isSuperAdmin || isGuru) ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                           <h3 className="text-center font-bold text-gray-800 mb-4 text-sm md:text-lg">Detail Saldo Per Kelas</h3>
                           <div className="min-w-[300px]"><FinanceChart data={rekapSaldo} /></div>
                       </div>

                       {(isSuperAdmin || isGuru) && (
                           <div className="border border-blue-200 rounded-xl bg-white shadow-sm p-4 flex flex-col h-full max-h-[420px]">
                               <h3 className="text-center font-bold text-blue-900 mb-4 text-sm md:text-lg flex items-center justify-center gap-2 border-b border-blue-100 pb-3">
                                   <UserCheck className="w-5 h-5 text-blue-600" /> Riwayat Akun Pengguna
                               </h3>
                               <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                                   {loginHistory.length === 0 ? (
                                       <div className="text-center text-gray-400 text-xs italic mt-4">Belum ada data aktivitas.</div>
                                   ) : (
                                       loginHistory.map((log, idx) => (
                                           <div key={idx} className="flex items-center justify-between p-3 hover:bg-blue-50/50 rounded-lg border border-gray-100 transition-colors">
                                               <div className="flex items-center gap-3 w-full">
                                                   <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 border border-blue-200">
                                                       {getInitials(log.full_name)}
                                                   </div>
                                                   <div className="flex-1 min-w-0">
                                                       <p className="text-sm font-bold text-gray-800 truncate">{log.full_name}</p>
                                                       <p className="text-[10px] text-gray-500 capitalize">{log.role.replace('_', ' ')}</p>
                                                   </div>
                                                   <div className="text-[10px] text-gray-400 font-mono text-right shrink-0">
                                                       {new Date(log.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                                                   </div>
                                               </div>
                                           </div>
                                       ))
                                   )}
                               </div>
                           </div>
                       )}

                   </div>
                </div>
             )}
             
             {/* KEUANGAN */}
             {activeMenu === "keuangan" && hasAdminAccess && (
                 <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="flex items-center justify-between mb-2"><h2 className="text-xl md:text-2xl font-bold text-gray-800">Keuangan</h2></div>
                    
                    {!isPengasuh && (
                    <Card className="border-green-200 bg-white shadow-sm overflow-hidden">
                        <CardHeader className="bg-green-50/50 border-b border-green-100 pb-3 p-4">
                            <div className="flex items-center gap-2 text-green-800"><FileSpreadsheet className="w-5 h-5" /><CardTitle className="text-base md:text-lg">Laporan & Unduh Data</CardTitle></div>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="flex flex-col gap-3">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-600">Pilih Kelas</label>
                                        <select value={exportKelas} onChange={(e) => setExportKelas(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm outline-none">
                                            <option value="all">Semua Kelas</option>
                                            {[7, 8, 9, 10, 11, 12].map(k => <option key={k} value={String(k)}>Kelas {k}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-600">Pilih Gender</label>
                                        <select value={exportGender} onChange={(e) => setExportGender(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm outline-none">
                                            <option value="all">Semua Gender</option>
                                            <option value="ikhwan">Ikhwan</option>
                                            <option value="akhwat">Akhwat</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-600">Bulan</label>
                                        <select value={exportMonth} onChange={(e) => setExportMonth(parseInt(e.target.value))} className="w-full p-2 border border-gray-300 rounded-md text-sm outline-none">
                                            {monthsList.map((m, idx) => (<option key={idx} value={idx}>{m}</option>))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-600">Tahun</label>
                                        <select value={exportYear} onChange={(e) => setExportYear(parseInt(e.target.value))} className="w-full p-2 border border-gray-300 rounded-md text-sm outline-none">
                                            {yearsList.map((y) => (<option key={y} value={y}>{y}</option>))}
                                        </select>
                                    </div>
                                </div>
                                <Button onClick={exportExcelBulanan} className="bg-green-700 hover:bg-green-800 shadow-md w-full">
                                    <FileSpreadsheet className="mr-2 h-4 w-4" />Unduh Excel Spesifik
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                    )}

                    {/* 🔥 FORM RESET SALDO KHUSUS SUPER ADMIN */}
                    {isSuperAdmin && (
                        <Card className="border-red-200 bg-white shadow-sm overflow-hidden mb-6">
                            <CardHeader className="bg-red-50/50 border-b border-red-100 pb-3 p-4">
                                <div className="flex items-center gap-2 text-red-800">
                                    <RefreshCcw className="w-5 h-5" />
                                    <CardTitle className="text-base md:text-lg">Reset Saldo Santri</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="flex flex-col gap-3">
                                    <div className="bg-red-50 p-3 rounded-md border border-red-100 text-xs text-red-700 flex items-start gap-2 mb-2">
                                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <p><strong>Peringatan:</strong> Fitur ini akan mengosongkan (menjadi Rp 0) seluruh saldo santri pada kelas dan gender yang dipilih. Gunakan di akhir semester atau saat tutup buku. Tindakan ini <strong>tidak bisa dibatalkan.</strong></p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-gray-600">Pilih Kelas</label>
                                            <select value={resetKelas} onChange={(e) => setResetKelas(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm outline-none">
                                                <option value="">-- Pilih Kelas --</option>
                                                {[7, 8, 9, 10, 11, 12].map(k => <option key={k} value={String(k)}>Kelas {k}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-gray-600">Pilih Gender</label>
                                            <select value={resetGender} onChange={(e) => setResetGender(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm outline-none">
                                                <option value="">-- Pilih Gender --</option>
                                                <option value="ikhwan">Ikhwan</option>
                                                <option value="akhwat">Akhwat</option>
                                            </select>
                                        </div>
                                    </div>
                                    <Button 
                                        onClick={handleResetSaldo} 
                                        disabled={isResetting || !resetKelas || !resetGender} 
                                        className="bg-red-600 hover:bg-red-700 shadow-md w-full mt-2"
                                    >
                                        {isResetting ? "Mereset Saldo..." : "Konfirmasi Reset Saldo"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="bg-white rounded-xl shadow-sm border p-1 relative"><div className="absolute top-0 right-0 p-4 z-10 hidden md:block"><span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md border border-yellow-200 flex items-center gap-1"><CalendarDays size={12}/> Mode Input Cepat</span></div><TransactionForm /></div>
                    
                    {!isPengasuh && (
                    <Card className="border-green-200 bg-white shadow-sm overflow-hidden">
                       <CardHeader className="bg-gray-50/50 border-b border-green-100 pb-3 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                           <div className="flex items-center gap-2 text-gray-800"><History className="w-5 h-5 text-green-600" /><CardTitle className="text-base md:text-lg">Riwayat Transaksi Global</CardTitle></div>
                           <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border shadow-sm">
                               <CalendarDays className="w-4 h-4 text-gray-400" />
                               <input type="date" value={historyDate} onChange={(e) => setHistoryDate(e.target.value)} className="text-sm font-bold text-gray-700 outline-none" />
                           </div>
                       </CardHeader>
                       
                       <CardContent className="p-0">{riwayatTrx.length === 0 ? (<div className="p-8 text-center text-gray-500 text-sm italic">Belum ada transaksi di tanggal ini.</div>) : (
                         <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                           {riwayatTrx.map((trx, idx) => (
                             <div key={idx} className="p-4 flex items-center justify-between hover:bg-green-50/30 transition-colors">
                                 <div className="flex items-center gap-3">
                                     {trx.type === 'income' ? <ArrowUpCircle className="text-green-600 w-8 h-8 opacity-80" /> : <ArrowDownCircle className="text-red-500 w-8 h-8 opacity-80" />}
                                     <div className="flex flex-col">
                                         <span className="font-bold text-gray-800 text-sm">{trx.santri ? trx.santri.nama_lengkap : "Tanpa Nama"}</span>
                                         <div className="text-xs text-gray-500 flex gap-2 flex-wrap">
                                             <span>{trx.santri ? `Kelas ${trx.santri.kelas}` : "-"}</span><span>•</span><span className="italic">{trx.description || "Tanpa Keterangan"}</span>
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
                    )}
                 </div>
             )}

             {/* DATA SANTRI */}
             {activeMenu === "santri" && (
               <div className="animate-in fade-in zoom-in duration-300 space-y-4">
                 {detailSantriId ? <SantriDetail santriId={detailSantriId} onBack={handleBackFromDetail} /> : (<><div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-3 rounded-lg border shadow-sm gap-2"><h2 className="text-base md:text-lg font-bold text-gray-800">{selectedKelasSantri ? `Data Santri Kelas ${selectedKelasSantri}` : "Data Semua Santri"}</h2>{selectedKelasSantri && <Button variant="outline" size="sm" onClick={() => setSelectedKelasSantri(null)} className="w-full md:w-auto">Tampilkan Semua</Button>}</div><SantriManagement key={selectedKelasSantri || 'all'} kelas={selectedKelasSantri ? String(selectedKelasSantri) : null} onSelectSantri={handleSelectSantri} /></>)}
               </div>
             )}
             
             {/* LAIN-LAIN */}
             {activeMenu === "guru" && !isGuru && !isPengasuh && <div className="animate-in fade-in zoom-in duration-300"><TeacherManagement /></div>}
             {activeMenu === "manajemen_kelas" && !isGuru && !isPengasuh && <ClassManagement />}
             {activeMenu === "pengguna" && isSuperAdmin && <UserManagement />}
             {activeMenu === "monitoring_warung" && isSuperAdmin && <WarungMonitoring />}
             {activeMenu === "akademik" && isSuperAdmin && <AcademicSettings />}
             {activeMenu === "absensi" && <AttendanceMonitoring initialTab={targetAbsensiTab} />}
             {activeMenu === "kesehatan" && <SickLeaveManagement />}
             {activeMenu === "pelanggaran" && <ViolationManagement />}
             {activeMenu === "piket" && (isAdmin || isSuperAdmin) && <PiketManagement />}
             {activeMenu === "perizinan" && <PermitManagement />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
