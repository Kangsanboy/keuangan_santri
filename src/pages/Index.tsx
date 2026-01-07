import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import AuthPage from "@/components/AuthPage";
import TransactionForm from "@/components/TransactionForm";
import SantriManagement from "@/components/SantriManagement";
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
  Menu, 
  ChevronLeft,
  FileSpreadsheet,
  PanelLeftClose,
  PanelLeftOpen,
  GraduationCap,
  CalendarDays
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ================= TYPES ================= */
interface RekapSaldo {
  kelas: number;
  gender: "ikhwan" | "akhwat";
  saldo: number;
}

const Index = () => {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  /* ================= STATE UI ================= */
  const [activeMenu, setActiveMenu] = useState<"dashboard" | "keuangan" | "santri" | "pengguna">("dashboard");
  const [isSidebarOpen, setSidebarOpen] = useState(true); 
  const [selectedKelasSantri, setSelectedKelasSantri] = useState<number | null>(null);

  /* ================= STATE EXPORT (BARU) ================= */
  const [exportMonth, setExportMonth] = useState(new Date().getMonth()); // 0 = Januari
  const [exportYear, setExportYear] = useState(new Date().getFullYear());

  const monthsList = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const yearsList = [2024, 2025, 2026, 2027, 2028];

  /* ================= STATE DATA ================= */
  const [rekapSaldo, setRekapSaldo] = useState<RekapSaldo[]>([]);
  const [totalMasuk, setTotalMasuk] = useState(0);
  const [totalKeluar, setTotalKeluar] = useState(0);
  const [masuk7Hari, setMasuk7Hari] = useState(0);
  const [keluar7Hari, setKeluar7Hari] = useState(0);
  const [keluarHariIni, setKeluarHariIni] = useState(0);

  /* ================= LOGIC DATA ================= */
  const fetchKeuangan = async () => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);
    const todayStr = today.toISOString().slice(0, 10);

    const { data } = await supabase
      .from("transactions_2025_12_01_21_34")
      .select("amount, type, transaction_date");

    if (!data) return;

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
  };

  const fetchRekapSaldo = async () => {
    const { data } = await supabase.rpc("get_saldo_rekap_kelas_gender");
    setRekapSaldo(data || []);
  };

  // 🔥 UPDATE: Fungsi Export Mengikuti State Bulan & Tahun
  const exportExcelBulanan = async () => {
    const bulan = exportMonth;
    const tahun = exportYear;
    const namaBulan = monthsList[bulan];
    
    // Hitung tanggal awal dan akhir bulan yang dipilih
    const awal = `${tahun}-${String(bulan + 1).padStart(2, "0")}-01`;
    // Cara gampang dapat tanggal terakhir bulan: tanggal 0 bulan berikutnya
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
  }, [user]);

  const handleOpenKelas = (kelas: number) => {
    setSelectedKelasSantri(kelas);
    setActiveMenu("santri");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-10 w-10 border-b-2 border-green-600 rounded-full" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  /* ================= STYLE HELPER ================= */
  const dashboardCardStyle = "border-2 border-green-400/80 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all";
  const summaryCardStyle = "border border-green-500 rounded-xl bg-white shadow-sm";

  // Ambil Avatar
  const avatarUrl = user?.user_metadata?.avatar_url;
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* ================= SIDEBAR ================= */}
      <aside
        className={`${isSidebarOpen ? "w-72" : "w-0"} 
        bg-green-900 text-white shadow-2xl transition-all duration-300 ease-in-out flex flex-col flex-shrink-0 z-50`}
      >
        <div className="h-20 bg-green-950 flex items-center justify-center border-b border-green-800 relative overflow-hidden">
            <GraduationCap className="absolute -left-4 -bottom-4 text-green-800/30 w-32 h-32" />
            <div className={`text-center transition-opacity duration-300 ${!isSidebarOpen && "opacity-0"}`}>
                <h1 className="text-xl font-bold tracking-widest text-yellow-400 font-serif">
                    PPS AL-JAWAHIR
                </h1>
                <p className="text-[10px] text-green-200 tracking-widest uppercase mt-1">
                    Sistem Keuangan Digital
                </p>
            </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
          <p className="px-4 text-xs font-semibold text-green-400 uppercase tracking-wider mb-2 opacity-80">Menu Utama</p>

          <button
            onClick={() => setActiveMenu("dashboard")}
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
            onClick={() => setActiveMenu("keuangan")}
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
            onClick={() => { setActiveMenu("santri"); setSelectedKelasSantri(null); }} 
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
              onClick={() => setActiveMenu("pengguna")}
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

        <div className="p-4 border-t border-green-800 bg-green-950">
            <button 
                onClick={signOut}
                className="flex items-center w-full px-4 py-3 rounded-lg text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-colors text-sm font-medium whitespace-nowrap"
            >
                <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
                Keluar Aplikasi
            </button>
        </div>
      </aside>

      {/* ================= KONTEN KANAN ================= */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative transition-all duration-300">
        
        {/* HEADER */}
        <header className="bg-white h-16 flex items-center justify-between px-4 md:px-6 shadow-sm z-10 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <button 
                onClick={() => setSidebarOpen(!isSidebarOpen)} 
                className="text-gray-600 p-2 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors"
                title="Buka/Tutup Menu"
            >
              {isSidebarOpen ? <PanelLeftClose size={24} /> : <PanelLeftOpen size={24} />}
            </button>
          </div>

          <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-gray-800">{userName}</p>
                    <p className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full inline-block">
                        {isAdmin ? "Administrator" : "Viewer"}
                    </p>
                </div>
                <div className="h-10 w-10 rounded-full border-2 border-green-100 shadow-sm overflow-hidden bg-gray-100 flex items-center justify-center">
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

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/50">
          <div className="max-w-7xl mx-auto space-y-8 pb-10">

            {/* --- VIEW 1: DASHBOARD --- */}
            {activeMenu === "dashboard" && (
              <div className="space-y-8 animate-in fade-in zoom-in duration-300">
                <div className="text-center space-y-3 pb-4 border-b border-gray-200">
                    <h1 className="text-2xl md:text-3xl font-bold text-green-700 uppercase tracking-wide">
                        KEUANGAN PPS AL-JAWAHIR
                    </h1>
                    <p className="text-gray-500 max-w-3xl mx-auto text-sm md:text-base leading-relaxed">
                        Monitoring data saldo santri Pondok Pesantren Salafiyah Al-Jawahir secara real-time, akurat, dan terintegrasi.
                    </p>
                </div>

                {/* Cards Saldo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[7, 8, 9, 10, 11, 12].map((kls) => {
                      const ikhwan = rekapSaldo.find((r) => r.kelas === kls && r.gender === "ikhwan")?.saldo || 0;
                      const akhwat = rekapSaldo.find((r) => r.kelas === kls && r.gender === "akhwat")?.saldo || 0;
                      const total = ikhwan + akhwat;
                      return (
                        <div
                          key={kls}
                          onClick={() => handleOpenKelas(kls)} 
                          className={`${dashboardCardStyle} p-5 cursor-pointer group relative overflow-hidden bg-white`}
                        >
                          <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-full -mr-8 -mt-8 z-0 group-hover:bg-green-100 transition-colors"></div>
                          <h3 className="text-center font-bold text-gray-800 mb-4 text-lg relative z-10">Kelas {kls}</h3>
                          <div className="space-y-3 text-sm font-medium relative z-10">
                            <div className="flex justify-between items-center text-gray-600">
                              <span>Ikhwan</span>
                              <span className="text-green-600">Rp {ikhwan.toLocaleString("id-ID")}</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-600">
                              <span>Akhwat</span>
                              <span className="text-pink-600">Rp {akhwat.toLocaleString("id-ID")}</span>
                            </div>
                            <div className="h-px bg-gray-200 my-2"></div>
                            <div className="flex justify-between items-center font-bold text-gray-900">
                              <span>Total</span>
                              <span>Rp {total.toLocaleString("id-ID")}</span>
                            </div>
                          </div>
                          <div className="mt-4 text-center relative z-10">
                            <span className="text-xs text-gray-400 group-hover:text-green-600 transition-colors font-semibold">
                                Klik untuk melihat detail santri →
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { title: "Total Saldo", value: totalMasuk - totalKeluar, color: "text-green-600" },
                    { title: "Pemasukan 7 Hari", value: masuk7Hari, color: "text-green-600" },
                    { title: "Pengeluaran 7 Hari", value: keluar7Hari, color: "text-red-600" },
                    { title: "Pengeluaran Hari Ini", value: keluarHariIni, color: "text-orange-600" },
                  ].map((item, idx) => (
                    <div key={idx} className={`${summaryCardStyle} p-4 text-center hover:shadow-md transition-shadow`}>
                        <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">{item.title}</h4>
                        <p className={`text-xl font-bold ${item.color}`}>
                            Rp {item.value.toLocaleString("id-ID")}
                        </p>
                    </div>
                  ))}
                </div>

                {/* Chart */}
                <div className={`${summaryCardStyle} p-6`}>
                    <h3 className="text-center font-bold text-gray-800 mb-6 text-lg">Grafik Keuangan Mingguan</h3>
                    <FinanceChart pemasukan={masuk7Hari} pengeluaran={keluar7Hari} />
                </div>
              </div>
            )}

            {/* --- VIEW 2: KEUANGAN (Revisi Layout) --- */}
            {activeMenu === "keuangan" && isAdmin && (
              <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-bold text-gray-800">Menu Keuangan</h2>
                </div>

                {/* 🔥 BAGIAN EXPORT EXCEL DENGAN FILTER BULAN/TAHUN */}
                <Card className="border-green-200 bg-white shadow-sm overflow-hidden">
                  <CardHeader className="bg-green-50/50 border-b border-green-100 pb-3">
                      <div className="flex items-center gap-2 text-green-800">
                          <FileSpreadsheet className="w-5 h-5" />
                          <CardTitle className="text-lg">Export Laporan Bulanan</CardTitle>
                      </div>
                  </CardHeader>
                  <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-end gap-4">
                        
                        {/* Pilih Bulan */}
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium text-gray-600">Pilih Bulan</label>
                            <select 
                                value={exportMonth}
                                onChange={(e) => setExportMonth(parseInt(e.target.value))}
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-700"
                            >
                                {monthsList.map((m, idx) => (
                                    <option key={idx} value={idx}>{m}</option>
                                ))}
                            </select>
                        </div>

                        {/* Pilih Tahun */}
                        <div className="w-full md:w-32 space-y-2">
                            <label className="text-sm font-medium text-gray-600">Tahun</label>
                            <select 
                                value={exportYear}
                                onChange={(e) => setExportYear(parseInt(e.target.value))}
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-700"
                            >
                                {yearsList.map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>

                        {/* Tombol Download */}
                        <Button 
                            onClick={exportExcelBulanan} 
                            className="bg-green-700 hover:bg-green-800 shadow-md h-[42px] px-6"
                        >
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Download Laporan
                        </Button>
                      </div>
                      <p className="text-xs text-gray-400 mt-3">
                          *Mengunduh laporan transaksi lengkap periode {monthsList[exportMonth]} {exportYear}
                      </p>
                  </CardContent>
                </Card>

                {/* FORM TRANSAKSI */}
                {/* Note: Untuk input tanggal manual (backdate), 
                    modifikasinya harus dilakukan di dalam file TransactionForm.tsx 
                */}
                <div className="bg-white rounded-xl shadow-sm border p-1 relative">
                    <div className="absolute top-0 right-0 p-4 z-10 hidden">
                         {/* Placeholder instruksi */}
                         <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md border border-yellow-200 flex items-center gap-1">
                             <CalendarDays size={12}/> Mode Input Tanggal
                         </span>
                    </div>
                   <TransactionForm />
                </div>
              </div>
            )}

            {/* --- VIEW 3: SANTRI --- */}
            {activeMenu === "santri" && (
              <div className="animate-in fade-in zoom-in duration-300 space-y-4">
                 <div className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
                    <h2 className="text-lg font-bold text-gray-800">
                        {selectedKelasSantri ? `Data Santri Kelas ${selectedKelasSantri}` : "Data Semua Santri"}
                    </h2>
                    {selectedKelasSantri && (
                        <Button variant="outline" size="sm" onClick={() => setSelectedKelasSantri(null)}>
                            Tampilkan Semua
                        </Button>
                    )}
                 </div>

                <SantriManagement 
                    key={selectedKelasSantri || 'all'} 
                    kelas={selectedKelasSantri ? String(selectedKelasSantri) : null} 
                />
              </div>
            )}

            {/* --- VIEW 4: USER --- */}
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
