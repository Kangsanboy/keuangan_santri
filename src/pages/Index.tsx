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
// Import Icon Modern
import { 
  LayoutDashboard, 
  Wallet, 
  Users, 
  UserCog, 
  LogOut, 
  Menu, 
  X, 
  FileSpreadsheet 
} from "lucide-react";

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
  // Mengatur menu yang aktif (Default: Dashboard)
  const [activeMenu, setActiveMenu] = useState<"dashboard" | "keuangan" | "santri" | "pengguna">("dashboard");
  // Mengatur buka/tutup sidebar di HP
  const [isSidebarOpen, setSidebarOpen] = useState(false);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-10 w-10 border-b-2 border-green-600 rounded-full" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  /* ================= STYLE HELPER ================= */
  const cardStyle = "border border-green-100 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200";

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* ================= SIDEBAR ================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r shadow-xl transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0 flex flex-col`}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center justify-between px-6 border-b">
          <h1 className="text-xl font-bold text-green-700 tracking-tight">PPS Al-Jawahir</h1>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-500">
            <X size={24} />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Menu Utama</p>
          
          <button
            onClick={() => { setActiveMenu("dashboard"); setSidebarOpen(false); }}
            className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
              activeMenu === "dashboard" ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <LayoutDashboard className="mr-3 h-5 w-5" />
            Dashboard
          </button>

          <button
            onClick={() => { setActiveMenu("keuangan"); setSidebarOpen(false); }}
            className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
              activeMenu === "keuangan" ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Wallet className="mr-3 h-5 w-5" />
            Keuangan & Transaksi
          </button>

          <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-2">Database</p>

          <button
            onClick={() => { setActiveMenu("santri"); setSidebarOpen(false); }}
            className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
              activeMenu === "santri" ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Users className="mr-3 h-5 w-5" />
            Data Santri
          </button>

          {isAdmin && (
            <button
              onClick={() => { setActiveMenu("pengguna"); setSidebarOpen(false); }}
              className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                activeMenu === "pengguna" ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <UserCog className="mr-3 h-5 w-5" />
              Manajemen Admin
            </button>
          )}
        </nav>

        {/* Logout Area */}
        <div className="p-4 border-t">
          <button
            onClick={signOut}
            className="flex items-center w-full px-4 py-3 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Keluar Aplikasi
          </button>
        </div>
      </aside>

      {/* ================= KONTEN KANAN ================= */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Header Mobile & Desktop */}
        <header className="bg-white border-b h-16 flex items-center justify-between px-4 md:px-6 shadow-sm z-10">
          <div className="flex items-center">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden mr-4 text-gray-600 p-2 hover:bg-gray-100 rounded-md">
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-bold text-gray-800">
              {activeMenu === "dashboard" && "Monitoring Saldo"}
              {activeMenu === "keuangan" && "Keuangan & Laporan"}
              {activeMenu === "santri" && "Database Santri"}
              {activeMenu === "pengguna" && "Manajemen Pengguna"}
            </h2>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                <p className="text-xs text-green-600">{isAdmin ? "Administrator" : "Viewer"}</p>
             </div>
             <div className="h-9 w-9 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold border border-green-200">
                {user?.email?.charAt(0).toUpperCase()}
             </div>
          </div>
        </header>

        {/* Area Scrollable */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* --- VIEW 1: DASHBOARD --- */}
            {activeMenu === "dashboard" && (
              <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                {/* Ringkasan Atas */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { title: "Total Saldo", value: totalMasuk - totalKeluar, color: "text-green-700", bg: "bg-green-50" },
                    { title: "Pemasukan 7 Hari", value: masuk7Hari, color: "text-blue-600", bg: "bg-blue-50" },
                    { title: "Keluar 7 Hari", value: keluar7Hari, color: "text-red-600", bg: "bg-red-50" },
                    { title: "Keluar Hari Ini", value: keluarHariIni, color: "text-orange-600", bg: "bg-orange-50" },
                  ].map((item, idx) => (
                    <Card key={idx} className={`${cardStyle} border-none`}>
                      <CardContent className="p-4 md:p-6">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">{item.title}</p>
                        <p className={`text-lg md:text-2xl font-bold ${item.color}`}>
                          Rp {item.value.toLocaleString("id-ID")}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Saldo Per Kelas */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                    <LayoutDashboard className="w-5 h-5 mr-2 text-green-600" />
                    Saldo Per Kelas
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[7, 8, 9, 10, 11, 12].map((kls) => {
                      const ikhwan = rekapSaldo.find((r) => r.kelas === kls && r.gender === "ikhwan")?.saldo || 0;
                      const akhwat = rekapSaldo.find((r) => r.kelas === kls && r.gender === "akhwat")?.saldo || 0;
                      return (
                        <Card
                          key={kls}
                          className={`${cardStyle} cursor-pointer hover:border-green-400 group`}
                          onClick={() => navigate(`/saldo-kelas/${kls}`)}
                        >
                          <CardHeader className="py-3 bg-gray-50/50 border-b border-gray-100">
                            <CardTitle className="text-center text-sm font-bold text-gray-700">Kelas {kls}</CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">Ikhwan</span>
                              <span className="font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                                Rp {ikhwan.toLocaleString("id-ID")}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">Akhwat</span>
                              <span className="font-semibold text-pink-600 bg-pink-50 px-2 py-0.5 rounded">
                                Rp {akhwat.toLocaleString("id-ID")}
                              </span>
                            </div>
                            <div className="pt-2 mt-2 border-t flex justify-between font-bold text-gray-800">
                              <span>Total</span>
                              <span>Rp {(ikhwan + akhwat).toLocaleString("id-ID")}</span>
                            </div>
                            <p className="text-xs text-center text-gray-400 mt-2 group-hover:text-green-600 transition-colors">
                              Klik detail
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Grafik */}
                <Card className={cardStyle}>
                  <CardHeader>
                    <CardTitle className="text-gray-800">Analisis Keuangan Mingguan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FinanceChart pemasukan={masuk7Hari} pengeluaran={keluar7Hari} />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* --- VIEW 2: KEUANGAN (AKSI) --- */}
            {activeMenu === "keuangan" && isAdmin && (
              <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                {/* Bagian Export */}
                <Card className={`${cardStyle} bg-gradient-to-r from-green-50 to-white`}>
                  <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">Laporan Bulanan</h3>
                      <p className="text-sm text-gray-500">Unduh rekap transaksi bulan ini dalam format Excel.</p>
                    </div>
                    <Button onClick={exportExcelBulanan} className="bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200">
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Download Excel
                    </Button>
                  </div>
                </Card>

                {/* Form Transaksi */}
                <div className="bg-white rounded-xl shadow-sm border p-1">
                   {/* Komponen Transaksi Form Abang */}
                   <TransactionForm />
                </div>
              </div>
            )}

            {/* --- VIEW 3: SANTRI --- */}
            {activeMenu === "santri" && (
              <div className="animate-in fade-in zoom-in duration-300">
                <SantriManagement kelas={null} />
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
