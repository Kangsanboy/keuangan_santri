import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import AuthPage from "@/components/AuthPage";
import TransactionForm from "@/components/TransactionForm";
import SantriManagement from "@/components/SantriManagement";
import SantriDetail from "@/components/SantriDetail"; // 🔥 Import Detail Santri
import UserManagement from "@/components/UserManagement";
import FinanceChart from "@/components/FinanceChart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { 
  LayoutDashboard, 
  Wallet, 
  Users, 
  UserCog, 
  LogOut, 
  PanelLeftClose,
  PanelLeftOpen,
  GraduationCap,
  FileSpreadsheet,
  CalendarDays,
  Menu,
  History,
  ArrowUpCircle,
  ArrowDownCircle
} from "lucide-react";

/* ================= TYPES ================= */
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
  santri: {
    nama_lengkap: string;
    kelas: number;
  } | null;
}

const Index = () => {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  /* ================= STATE UI ================= */
  const [activeMenu, setActiveMenu] = useState<"dashboard" | "keuangan" | "santri" | "pengguna">("dashboard");
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768); 
  const [selectedKelasSantri, setSelectedKelasSantri] = useState<number | null>(null);
  
  // 🔥 STATE BARU: ID Santri yang sedang dilihat detailnya
  const [detailSantriId, setDetailSantriId] = useState<string | null>(null);

  /* ================= STATE EXPORT ================= */
  const [exportMonth, setExportMonth] = useState(new Date().getMonth());
  const [exportYear, setExportYear] = useState(new Date().getFullYear());

  const monthsList = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const yearsList = [2024, 2025, 2026, 2027, 2028];

  /* ================= STATE DATA ================= */
  const [rekapSaldo, setRekapSaldo] = useState<RekapSaldo[]>([]);
  
  // Ringkasan Dashboard
  const [totalMasuk, setTotalMasuk] = useState(0);
  const [totalKeluar, setTotalKeluar] = useState(0);
  const [masuk7Hari, setMasuk7Hari] = useState(0);
  const [keluar7Hari, setKeluar7Hari] = useState(0);
  const [keluarHariIni, setKeluarHariIni] = useState(0);

  // Riwayat Transaksi Hari Ini (Di Menu Keuangan)
  const [trxHariIni, setTrxHariIni] = useState<TransaksiItem[]>([]);

  /* ================= LOGIC DATA ================= */
  
  const fetchKeuangan = useCallback(async () => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);
    const todayStr = today.toISOString().slice(0, 10);

    // 1. Ambil Data Ringkasan (Chart & Card Atas)
    const { data } = await supabase
      .from("transactions_2025_12_01_21_34")
      .select("amount, type, transaction_date");

    if (data) {
        let masuk = 0, keluar = 0, masuk7 = 0, keluar7 = 0, keluarToday = 0;

        data.forEach((d) => {
        const tgl = new Date(d.transaction_date);
        if (d.type === "income") masuk += d.amount;
        if (d.type === "expense") keluar += d.amount;

        if (tgl >= sevenDaysAgo && tgl <= today) {
            if (d.type === "income") masuk7 += d.amount;
            if (d.type === "expense") keluar7 += d.amount;
        }

        if (d.type === "expense" && d.transaction_date === todayStr) {
            keluarToday += d.amount;
        }
        });

        setTotalMasuk(masuk);
        setTotalKeluar(keluar);
        setMasuk7Hari(masuk7);
        setKeluar7Hari(keluar7);
        setKeluarHariIni(keluarToday);
    }

    // 2. Ambil Data Detail Riwayat Hari Ini (Untuk Tabel di Menu Keuangan)
    const { data: detailHariIni } = await supabase
      .from("transactions_2025_12_01_21_34")
      .select(`
        id, amount, type, description, transaction_date, created_at,
        santri:santri_id ( nama_lengkap, kelas )
      `)
      .eq("transaction_date", todayStr)
      .order("created_at", { ascending: false });

    if (detailHariIni) {
        // @ts-ignore
        setTrxHariIni(detailHariIni);
    }

  }, []);

  const fetchRekapSaldo = useCallback(async () => {
    // Ambil data saldo per kelas dari View
    const { data } = await supabase
      .from("view_santri_saldo")
      .select("kelas, gender, saldo");

    if (data) {
      const stats: RekapSaldo[] = [];
      const classes = [7, 8, 9, 10, 11, 12];
      const genders = ["ikhwan", "akhwat"];

      classes.forEach(k => {
        genders.forEach(g => {
          stats.push({ kelas: k, gender: g as "ikhwan"|"akhwat", saldo: 0 });
        });
      });

      data.forEach((item: any) => {
        const target = stats.find(s => s.kelas === item.kelas && s.gender === item.gender);
        if (target) {
          target.saldo += (item.saldo || 0);
        }
      });

      setRekapSaldo(stats);
    }
  }, []);

  const exportExcelBulanan = async () => {
    const bulan = exportMonth;
    const tahun = exportYear;
    const namaBulan = monthsList[bulan];
    const awal = `${tahun}-${String(bulan + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(tahun, bulan + 1, 0).getDate(); 
    const akhir = `${tahun}-${String(bulan + 1).padStart(2, "0")}-${lastDay}`;

    const { data, error } = await supabase
      .from("transactions_2025_12_01_21_34")
      .select(`
        transaction_date, type, amount, description,
        santri:santri_id ( nama_lengkap, kelas )
      `)
      .gte("transaction_date", awal)
      .lte("transaction_date", akhir)
      .order("transaction_date");

    if (error || !data) return;

    const rows = data.map((d: any) => ({
      Tanggal: d.transaction_date,
      Santri: d.santri?.nama_lengkap || "-",
      Kelas: d.santri?.kelas || "-",
      Jenis: d.type === "income" ? "Pemasukan" : "Pengeluaran",
      Nominal: d.amount,
      Keterangan: d.description,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    XLSX.writeFile(wb, `Laporan Keuangan ${namaBulan} ${tahun}.xlsx`);
  };

  useEffect(() => {
    if (user) {
      fetchKeuangan();
      fetchRekapSaldo();
    }
  }, [user, fetchKeuangan, fetchRekapSaldo]);

  // Listener Auto-Refresh (Dengar sinyal dari TransactionForm)
  useEffect(() => {
    const handleRefresh = () => {
        console.log("♻️ Auto-refreshing dashboard data...");
        fetchKeuangan();
        fetchRekapSaldo();
    };
    window.addEventListener("refresh-keuangan", handleRefresh);
    return () => {
        window.removeEventListener("refresh-keuangan", handleRefresh);
    };
  }, [fetchKeuangan, fetchRekapSaldo]);

  /* ================= NAVIGASI ================= */
  const handleOpenKelas = (kelas: number) => {
    setSelectedKelasSantri(kelas);
    setActiveMenu("santri");
    setDetailSantriId(null); // Reset detail kalau buka kelas baru
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleMenuClick = (menu: any) => {
    setActiveMenu(menu);
    if (menu === "santri") setSelectedKelasSantri(null);
    setDetailSantriId(null); // Reset detail kalau ganti menu
    if (window.innerWidth < 768) setSidebarOpen(false);
  }

  // 🔥 Fungsi Navigasi ke Detail Santri
  const handleSelectSantri = (id: string) => {
      setDetailSantriId(id);
      window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll ke atas otomatis
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-10 w-10 border-b-2 border-green-600 rounded-full" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const avatarUrl = user?.user_metadata?.avatar_url;
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans relative">
      
      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed md:relative z-50 h-full bg-green-900 text-white shadow-2xl 
          transition-transform duration-300 ease-in-out flex flex-col flex-shrink-0
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden"}
          w-[280px] md:w-auto
        `}
        style={{ width: isSidebarOpen && window.innerWidth >= 768 ? '18rem' : undefined }}
      >
        <div className="h-20 bg-green-950 flex items-center justify-center border-b border-green-800 relative overflow-hidden flex-shrink-0">
            <GraduationCap className="absolute -left-4 -bottom-4 text-green-800/30 w-32 h-32" />
            <div className={`text-center transition-opacity duration-300 ${!isSidebarOpen && "md:opacity-0"}`}>
                <h1 className="text-xl font-bold tracking-widest text-yellow-400 font-serif">
                    PPS AL-JAWAHIR
                </h1>
                <p className="text-[10px] text-green-200 tracking-widest uppercase mt-1">
                    Sistem Keuangan Digital
                </p>
            </div>
            <button 
                onClick={() => setSidebarOpen(false)} 
                className="absolute top-3 right-3 md:hidden text-green-200 hover:text-white p-1"
            >
                <PanelLeftClose size={24} />
            </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <p className="px-4 text-xs font-semibold text-green-400 uppercase tracking-wider mb-2 opacity-80">Menu Utama</p>

          <button
            onClick={() => handleMenuClick("dashboard")}
            className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${
              activeMenu === "dashboard" 
              ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" 
              : "text-green-100 hover:bg-green-800"
            }`}
          >
            <LayoutDashboard className="mr-3 h-5 w-5 flex-shrink-0" />
            Dashboard
          </button>

          <button
            onClick={() => handleMenuClick("keuangan")}
            className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${
              activeMenu === "keuangan" 
              ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" 
              : "text-green-100 hover:bg-green-800"
            }`}
          >
            <Wallet className="mr-3 h-5 w-5 flex-shrink-0" />
            Keuangan
          </button>

          <div className="border-t border-green-800 my-4"></div>
          <p className="px-4 text-xs font-semibold text-green-400 uppercase tracking-wider mb-2 opacity-80">Database</p>

          <button
            onClick={() => handleMenuClick("santri")} 
            className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${
              activeMenu === "santri" 
              ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" 
              : "text-green-100 hover:bg-green-800"
            }`}
          >
            <Users className="mr-3 h-5 w-5 flex-shrink-0" />
            Data Santri
          </button>

          {isAdmin && (
            <button
              onClick={() => handleMenuClick("pengguna")}
              className={`flex items-center w-full px-4 py-3 rounded-lg transition-all text-sm font-medium whitespace-nowrap ${
                activeMenu === "pengguna" 
                ? "bg-green-700 text-white shadow-lg border-l-4 border-yellow-400 pl-3" 
                : "text-green-100 hover:bg-green-800"
              }`}
            >
              <UserCog className="mr-3 h-5 w-5 flex-shrink-0" />
              Admin
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-green-800 bg-green-950 flex-shrink-0">
            <button 
                onClick={signOut}
                className="flex items-center w-full px-4 py-3 rounded-lg text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-colors text-sm font-medium whitespace-nowrap"
            >
                <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
                Keluar Aplikasi
            </button>
        </div>
      </aside>

      {/* CONTENT */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">
        <header className="bg-white h-16 flex items-center justify-between px-4 md:px-6 shadow-sm z-10 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <button 
                onClick={() => setSidebarOpen(!isSidebarOpen)} 
                className="text-gray-600 p-2 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors"
            >
              {isSidebarOpen ? <PanelLeftClose size={24} className="hidden md:block" /> : <PanelLeftOpen size={24} className="hidden md:block" />}
              <Menu size={24} className="md:hidden" />
            </button>
          </div>

          <div className="flex items-center gap-3 max-w-[60%]">
                <div className="text-right hidden sm:block truncate">
                    <p className="text-sm font-bold text-gray-800 truncate">{userName}</p>
                    <p className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full inline-block">
                        {isAdmin ? "Admin" : "Viewer"}
                    </p>
                </div>
                <div className="h-9 w-9 rounded-full border-2 border-green-100 shadow-sm overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="User" className="h-full w-full object-cover" />
                    ) : (
                        <span className="text-green-700 font-bold text-lg">
                            {user?.email?.charAt(0).toUpperCase()}
                        </span>
                    )}
                </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 md:p-8 bg-gray-50/50 w-full">
          <div className="max-w-7xl mx-auto space-y-6 pb-20">

            {/* --- DASHBOARD --- */}
            {activeMenu === "dashboard" && (
              <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="text-center space-y-2 pb-4 border-b border-gray-200">
                    <h1 className="text-xl md:text-3xl font-bold text-green-700 uppercase tracking-wide px-2">
                        KEUANGAN PPS AL-JAWAHIR
                    </h1>
                    <p className="text-gray-500 max-w-3xl mx-auto text-xs md:text-base leading-relaxed px-4">
                        Monitoring data saldo santri secara real-time.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[7, 8, 9, 10, 11, 12].map((kls) => {
                      const ikhwan = rekapSaldo.find((r) => r.kelas === kls && r.gender === "ikhwan")?.saldo || 0;
                      const akhwat = rekapSaldo.find((r) => r.kelas === kls && r.gender === "akhwat")?.saldo || 0;
                      const total = ikhwan + akhwat;
                      return (
                        <div
                          key={kls}
                          onClick={() => handleOpenKelas(kls)} 
                          className="border-2 border-green-400/80 rounded-2xl bg-white shadow-sm p-4 cursor-pointer group relative overflow-hidden active:scale-95 transition-transform"
                        >
                          <div className="absolute top-0 right-0 w-12 h-12 bg-green-50 rounded-bl-full -mr-6 -mt-6 z-0 group-hover:bg-green-100 transition-colors"></div>
                          <h3 className="text-center font-bold text-gray-800 mb-3 text-lg relative z-10">Kelas {kls}</h3>
                          <div className="space-y-2 text-sm font-medium relative z-10">
                            <div className="flex justify-between items-center text-gray-600">
                              <span>Ikhwan</span>
                              <span className="text-green-600">Rp {ikhwan.toLocaleString("id-ID")}</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-600">
                              <span>Akhwat</span>
                              <span className="text-pink-600">Rp {akhwat.toLocaleString("id-ID")}</span>
                            </div>
                            <div className="h-px bg-gray-200 my-1"></div>
                            <div className="flex justify-between items-center font-bold text-gray-900">
                              <span>Total</span>
                              <span>Rp {total.toLocaleString("id-ID")}</span>
                            </div>
                          </div>
                          <div className="mt-3 text-center relative z-10">
                            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                                Lihat Detail &rarr;
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { title: "Total Saldo", value: totalMasuk - totalKeluar, color: "text-green-600" },
                    { title: "Masuk 7 Hari", value: masuk7Hari, color: "text-green-600" },
                    { title: "Keluar 7 Hari", value: keluar7Hari, color: "text-red-600" },
                    { title: "Keluar Hari Ini", value: keluarHariIni, color: "text-orange-600" },
                  ].map((item, idx) => (
                    <div key={idx} className="border border-green-500 rounded-xl bg-white shadow-sm p-3 text-center flex flex-col justify-center min-h-[100px]">
                        <h4 className="text-[10px] md:text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide">{item.title}</h4>
                        <p className={`text-sm md:text-xl font-bold ${item.color} break-words`}>
                            Rp {item.value.toLocaleString("id-ID")}
                        </p>
                    </div>
                  ))}
                </div>

                {/* 🔥 FITUR CHART (GRAFIK) SUDAH KEMBALI */}
                <div className="border border-green-500 rounded-xl bg-white shadow-sm p-4 overflow-x-auto">
                    <h3 className="text-center font-bold text-gray-800 mb-4 text-sm md:text-lg">Grafik Mingguan</h3>
                    <div className="min-w-[300px]">
                        <FinanceChart pemasukan={masuk7Hari} pengeluaran={keluar7Hari} />
                    </div>
                </div>
              </div>
            )}

            {/* --- KEUANGAN --- */}
            {activeMenu === "keuangan" && isAdmin && (
              <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800">Keuangan</h2>
                </div>

                <Card className="border-green-200 bg-white shadow-sm overflow-hidden">
                  <CardHeader className="bg-green-50/50 border-b border-green-100 pb-3 p-4">
                      <div className="flex items-center gap-2 text-green-800">
                          <FileSpreadsheet className="w-5 h-5" />
                          <CardTitle className="text-base md:text-lg">Laporan Bulanan</CardTitle>
                      </div>
                  </CardHeader>
                  <CardContent className="p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-xs font-medium text-gray-600">Bulan</label>
                                <select 
                                    value={exportMonth}
                                    onChange={(e) => setExportMonth(parseInt(e.target.value))}
                                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                >
                                    {monthsList.map((m, idx) => (
                                        <option key={idx} value={idx}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-24">
                                <label className="text-xs font-medium text-gray-600">Tahun</label>
                                <select 
                                    value={exportYear}
                                    onChange={(e) => setExportYear(parseInt(e.target.value))}
                                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                >
                                    {yearsList.map((y) => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <Button 
                            onClick={exportExcelBulanan} 
                            className="bg-green-700 hover:bg-green-800 shadow-md w-full"
                        >
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Unduh Excel
                        </Button>
                      </div>
                  </CardContent>
                </Card>

                {/* 🔥 FORM TRANSAKSI SUDAH KEMBALI */}
                <div className="bg-white rounded-xl shadow-sm border p-1 relative">
                    <div className="absolute top-0 right-0 p-4 z-10 hidden md:block">
                         <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md border border-yellow-200 flex items-center gap-1">
                             <CalendarDays size={12}/> Mode Input Tanggal
                         </span>
                    </div>
                   <TransactionForm />
                </div>

                {/* 🔥 TABEL RIWAYAT TRANSAKSI HARI INI (BARU) */}
                <Card className="border-green-200 bg-white shadow-sm overflow-hidden">
                  <CardHeader className="bg-gray-50/50 border-b border-green-100 pb-3 p-4">
                      <div className="flex items-center gap-2 text-gray-800">
                          <History className="w-5 h-5 text-green-600" />
                          <CardTitle className="text-base md:text-lg">Riwayat Transaksi Hari Ini</CardTitle>
                      </div>
                  </CardHeader>
                  <CardContent className="p-0">
                      {trxHariIni.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            Belum ada transaksi di tanggal ini.
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                           {trxHariIni.map((trx, idx) => (
                               <div key={idx} className="p-4 flex items-center justify-between hover:bg-green-50/30 transition-colors">
                                   <div className="flex items-center gap-3">
                                       {trx.type === 'income' ? (
                                           <ArrowUpCircle className="text-green-600 w-8 h-8 opacity-80" />
                                       ) : (
                                           <ArrowDownCircle className="text-red-500 w-8 h-8 opacity-80" />
                                       )}
                                       
                                       <div className="flex flex-col">
                                           <span className="font-bold text-gray-800 text-sm">
                                               {trx.santri ? trx.santri.nama_lengkap : "Tanpa Nama"}
                                           </span>
                                           <span className="text-xs text-gray-500 flex gap-2">
                                              <span>{trx.santri ? `Kelas ${trx.santri.kelas}` : "-"}</span>
                                              <span>•</span>
                                              <span className="italic">{trx.description || "Tanpa Keterangan"}</span>
                                           </span>
                                       </div>
                                   </div>

                                   <div className={`font-bold text-sm ${trx.type === 'income' ? 'text-green-700' : 'text-red-600'}`}>
                                       {trx.type === 'income' ? '+' : '-'} Rp {trx.amount.toLocaleString("id-ID")}
                                   </div>
                               </div>
                           ))}
                        </div>
                      )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* --- SANTRI --- */}
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
                            onSelectSantri={handleSelectSantri} // Oper Fungsi Navigasi ke sini
                        />
                     </>
                 )}
              </div>
            )}

            {/* --- USER --- */}
            {activeMenu === "pengguna" && isAdmin && (
              <div className="animate-in fade-in zoom-in duration-300">
                <UserManagement />
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
