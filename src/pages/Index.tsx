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
  ChevronDown
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
  const [isSidebarOpen, setSidebarOpen] = useState(true); // Default terbuka di laptop
  const [selectedKelasSantri, setSelectedKelasSantri] = useState<number | null>(null);

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

  const exportExcelBulanan = async () => {
    const now = new Date();
    const bulan = now.getMonth();
    const tahun = now.getFullYear();
    const namaBulan = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"][bulan];
    const awal = `${tahun}-${String(bulan + 1).padStart(2, "0")}-01`;
    const akhir = `${tahun}-${String(bulan + 1).padStart(2, "0")}-31`;

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
      Jenis: d.type,
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

  /* ================= NAVIGASI SANTRI ================= */
  const handleOpenKelas = (kelas: number) => {
    setSelectedKelasSantri(kelas); // Set filter kelas
    setActiveMenu("santri"); // Pindah tab
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-10 w-10 border-b-2 border-green-600 rounded-full" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  /* ================= STYLE HELPER (Sesuai Request) ================= */
  // Style kartu hijau sesuai gambar referensi
  const dashboardCardStyle = "border-2 border-green-400/80 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all";
  const summaryCardStyle = "border border-green-500 rounded-xl bg-white shadow-sm";

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans">
      
      {/* ================= SIDEBAR ================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-green-900 text-white shadow-2xl transition-all duration-300 ease-in-out flex flex-col
          ${isSidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full md:w-0 md:translate-x-0"} 
        `}
      >
        {/* Logo Area */}
        <div className="h-20 flex items-center justify-center border-b border-green-800 bg-green-950 p-4">
            {/* Ganti src dengan path logo abang */}
            <img 
                src="/logo-mahad.png" 
                alt="Logo" 
                className="h-12 w-auto object-contain"
                onError={(e) => {
                    // Fallback kalau gambar gak ketemu
                    e.currentTarget.style.display = 'none';
                }}
            />
            {/* Fallback Text kalau gambar error/belum ada */}
            <span className="ml-2 font-bold text-lg hidden">PPS Al-Jawahir</span> 
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => setActiveMenu("dashboard")}
            className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
              activeMenu === "dashboard" ? "bg-green-700 text-white shadow-lg" : "text-green-100 hover:bg-green-800"
            }`}
          >
            <LayoutDashboard className="mr-3 h-5 w-5" />
            <span className={!isSidebarOpen ? "hidden" : "block"}>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveMenu("keuangan")}
            className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
              activeMenu === "keuangan" ? "bg-green-700 text-white shadow-lg" : "text-green-100 hover:bg-green-800"
            }`}
          >
            <Wallet className="mr-3 h-5 w-5" />
            <span className={!isSidebarOpen ? "hidden" : "block"}>Keuangan</span>
          </button>

          <div className="border-t border-green-800 my-4"></div>
          <p className="px-4 text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">Database</p>

          <button
            onClick={() => { setActiveMenu("santri"); setSelectedKelasSantri(null); }} // Reset filter kalau klik menu samping
            className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
              activeMenu === "santri" ? "bg-green-700 text-white shadow-lg" : "text-green-100 hover:bg-green-800"
            }`}
          >
            <Users className="mr-3 h-5 w-5" />
            <span className={!isSidebarOpen ? "hidden" : "block"}>Data Santri</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveMenu("pengguna")}
              className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                activeMenu === "pengguna" ? "bg-green-700 text-white shadow-lg" : "text-green-100 hover:bg-green-800"
              }`}
            >
              <UserCog className="mr-3 h-5 w-5" />
              <span className={!isSidebarOpen ? "hidden" : "block"}>Admin</span>
            </button>
          )}
        </nav>
      </aside>

      {/* ================= KONTEN KANAN ================= */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative transition-all duration-300">
        
        {/* HEADER */}
        <header className="bg-white h-16 flex items-center justify-between px-4 md:px-6 shadow-sm z-10 border-b">
          <div className="flex items-center gap-3">
            {/* Tombol Toggle Sidebar */}
            <button 
                onClick={() => setSidebarOpen(!isSidebarOpen)} 
                className="text-gray-600 p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              {isSidebarOpen ? <ChevronLeft size={24} /> : <Menu size={24} />}
            </button>
            
            {/* Logo & Judul Header (Sesuai Gambar 1) */}
            <div className="flex items-center gap-2">
                <img src="/logo-mahad.png" alt="Logo" className="h-8 w-auto hidden md:block" />
                <h2 className="text-lg font-bold text-gray-800 tracking-tight">
                    KEUANGAN PPS AL-JAWAHIR
                </h2>
            </div>
          </div>

          {/* User Profile & Logout (Sesuai Request 4) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors border border-transparent hover:border-gray-200">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-gray-800">{user?.email?.split('@')[0]}</p>
                        <p className="text-xs text-green-600 font-medium">{isAdmin ? "Administrator" : "Viewer"}</p>
                    </div>
                    <div className="h-9 w-9 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold border border-green-200 shadow-sm">
                        {user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <ChevronDown size={16} className="text-gray-400" />
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-600 cursor-pointer font-medium">
                    <LogOut className="mr-2 h-4 w-4" />
                    Keluar Aplikasi
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* AREA SCROLLABLE */}
        <main className="flex-1 overflow-y-auto bg-white p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">

            {/* --- VIEW 1: DASHBOARD (Sesuai Gambar 2) --- */}
            {activeMenu === "dashboard" && (
              <div className="space-y-8 animate-in fade-in zoom-in duration-300">
                
                {/* JUDUL BESAR & DESKRIPSI (Sesuai Gambar) */}
                <div className="text-center space-y-3 pb-4">
                    <h1 className="text-2xl md:text-3xl font-bold text-green-700 uppercase tracking-wide">
                        SALDO SANTRI PPS AL-JAWAHIR
                    </h1>
                    <p className="text-gray-500 max-w-3xl mx-auto text-sm md:text-base leading-relaxed">
                        Monitoring data saldo santri Pondok Pesantren Salafiyah Al-Jawahir secara real-time, akurat, dan terintegrasi.
                    </p>
                </div>

                {/* KARTU SALDO PER KELAS (Style Gambar 2) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[7, 8, 9, 10, 11, 12].map((kls) => {
                      const ikhwan = rekapSaldo.find((r) => r.kelas === kls && r.gender === "ikhwan")?.saldo || 0;
                      const akhwat = rekapSaldo.find((r) => r.kelas === kls && r.gender === "akhwat")?.saldo || 0;
                      const total = ikhwan + akhwat;
                      return (
                        <div
                          key={kls}
                          onClick={() => handleOpenKelas(kls)} // 🔥 FIX: Klik kartu -> Buka Data Santri Kelas Tsb
                          className={`${dashboardCardStyle} p-5 cursor-pointer group`}
                        >
                          <h3 className="text-center font-bold text-gray-800 mb-4 text-lg">Kelas {kls}</h3>
                          
                          <div className="space-y-3 text-sm font-medium">
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
                          
                          <div className="mt-4 text-center">
                            <span className="text-xs text-gray-400 group-hover:text-green-600 transition-colors">
                                Klik untuk melihat detail santri
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* RINGKASAN BAWAH (Style Gambar 2) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { title: "Total Saldo", value: totalMasuk - totalKeluar, color: "text-green-600" },
                    { title: "Pemasukan 7 Hari", value: masuk7Hari, color: "text-green-600" },
                    { title: "Pengeluaran 7 Hari", value: keluar7Hari, color: "text-red-600" },
                    { title: "Pengeluaran Hari Ini", value: keluarHariIni, color: "text-orange-600" },
                  ].map((item, idx) => (
                    <div key={idx} className={`${summaryCardStyle} p-4 text-center`}>
                        <h4 className="text-xs font-bold text-gray-700 mb-2">{item.title}</h4>
                        <p className={`text-xl font-bold ${item.color}`}>
                            Rp {item.value.toLocaleString("id-ID")}
                        </p>
                    </div>
                  ))}
                </div>

                {/* GRAFIK (Style Gambar 2) */}
                <div className={`${summaryCardStyle} p-6`}>
                    <h3 className="text-center font-bold text-gray-800 mb-6 text-lg">Grafik Keuangan Mingguan</h3>
                    <FinanceChart pemasukan={masuk7Hari} pengeluaran={keluar7Hari} />
                </div>
              </div>
            )}

            {/* --- VIEW 2: KEUANGAN (AKSI) --- */}
            {activeMenu === "keuangan" && isAdmin && (
              <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                <Card className="border-green-200 bg-green-50">
                  <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-green-800">Laporan Bulanan</h3>
                      <p className="text-sm text-green-600">Unduh rekap transaksi bulan ini dalam format Excel.</p>
                    </div>
                    <Button onClick={exportExcelBulanan} className="bg-green-700 hover:bg-green-800">
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Download Excel
                    </Button>
                  </div>
                </Card>

                <div className="bg-white rounded-xl shadow-sm border p-1">
                   <TransactionForm />
                </div>
              </div>
            )}

            {/* --- VIEW 3: SANTRI (Perbaikan Request 5) --- */}
            {activeMenu === "santri" && (
              <div className="animate-in fade-in zoom-in duration-300">
                {/* PASSING PROPS KELAS DISINI 
                    Jika selectedKelasSantri ada isinya (misal 7), maka hanya tampilkan kelas 7.
                */}
                <SantriManagement kelas={selectedKelasSantri ? String(selectedKelasSantri) : null} />
                
                {/* Tombol Reset Filter (Muncul kalau lagi filter kelas) */}
                {selectedKelasSantri && (
                    <div className="mt-4 text-center">
                        <Button variant="outline" onClick={() => setSelectedKelasSantri(null)}>
                            Tampilkan Semua Kelas
                        </Button>
                    </div>
                )}
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
