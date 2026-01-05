import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AuthPage from "@/components/AuthPage";
import Header from "@/components/Header";
import TransactionForm from "@/components/TransactionForm";
import SantriManagement from "@/components/SantriManagement";
import UserManagement from "@/components/UserManagement";
import FinanceChart from "@/components/FinanceChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* 🔹 NAMA BULAN */
const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const Index = () => {
  const { user, loading, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();

  const tab = searchParams.get("tab") || "transactions";
  const kelas = searchParams.get("kelas");

  /* ================= STATE ================= */
  const [totalMasuk, setTotalMasuk] = useState(0);
  const [totalKeluar, setTotalKeluar] = useState(0);

  const [mingguanMasuk, setMingguanMasuk] = useState(0);
  const [mingguanKeluar, setMingguanKeluar] = useState(0);
  const [rataKeluar, setRataKeluar] = useState(0);

  const [bulan, setBulan] = useState<number>(
    new Date().getMonth() + 1
  );
  const [tahun, setTahun] = useState<number>(
    new Date().getFullYear()
  );

  /* ================= AMBIL DATA KEUANGAN ================= */
  const fetchKeuangan = async () => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);

    const { data, error } = await supabase
      .from("transactions_2025_12_01_21_34")
      .select("amount, type, transaction_date");

    if (error || !data) return;

    /* TOTAL */
    const masuk = data
      .filter((d) => d.type === "pemasukan")
      .reduce((s, d) => s + d.amount, 0);

    const keluar = data
      .filter((d) => d.type === "pengeluaran")
      .reduce((s, d) => s + d.amount, 0);

    setTotalMasuk(masuk);
    setTotalKeluar(keluar);

    /* 7 HARI */
    const mingguIni = data.filter((d) => {
      const tgl = new Date(d.transaction_date);
      return tgl >= sevenDaysAgo && tgl <= today;
    });

    const masuk7 = mingguIni
      .filter((d) => d.type === "pemasukan")
      .reduce((s, d) => s + d.amount, 0);

    const keluar7 = mingguIni
      .filter((d) => d.type === "pengeluaran")
      .reduce((s, d) => s + d.amount, 0);

    setMingguanMasuk(masuk7);
    setMingguanKeluar(keluar7);
    setRataKeluar(Math.round(keluar7 / 7));
  };

  /* ================= EXPORT EXCEL ================= */
  const exportExcel = async () => {
    const awal = `${tahun}-${String(bulan).padStart(2, "0")}-01`;
    const akhir = `${tahun}-${String(bulan).padStart(2, "0")}-31`;

    const { data, error } = await supabase
      .from("transactions_2025_12_01_21_34")
      .select(`
        transaction_date,
        type,
        amount,
        description,
        santri:santri_id (
          nama_lengkap,
          kelas
        )
      `)
      .gte("transaction_date", awal)
      .lte("transaction_date", akhir)
      .order("transaction_date");

    if (error || !data) {
      alert("Gagal export data");
      return;
    }

    const rows = data.map((d) => ({
      Tanggal: d.transaction_date,
      Santri: d.santri?.nama_lengkap || "-",
      Kelas: d.santri?.kelas || "-",
      Jenis: d.type,
      Nominal: d.amount,
      Keterangan: d.description,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      `Laporan ${NAMA_BULAN[bulan - 1]}`
    );

    XLSX.writeFile(
      workbook,
      `laporan-keuangan-${NAMA_BULAN[bulan - 1]}-${tahun}.xlsx`
    );
  };

  /* ================= EFFECT ================= */
  useEffect(() => {
    fetchKeuangan();
    window.addEventListener("refresh-keuangan", fetchKeuangan);
    return () => {
      window.removeEventListener("refresh-keuangan", fetchKeuangan);
    };
  }, []);

  /* ================= AUTH ================= */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {tab === "transactions" && (
          <>
            {/* 🔥 RINGKASAN */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">
                    Pemasukan 7 Hari
                  </div>
                  <div className="text-xl font-bold text-green-600">
                    Rp {mingguanMasuk.toLocaleString("id-ID")}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">
                    Pengeluaran 7 Hari
                  </div>
                  <div className="text-xl font-bold text-red-600">
                    Rp {mingguanKeluar.toLocaleString("id-ID")}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">
                    Rata-rata / Hari
                  </div>
                  <div className="text-xl font-bold text-orange-600">
                    Rp {rataKeluar.toLocaleString("id-ID")}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 📊 GRAFIK */}
            <FinanceChart
              pemasukan={totalMasuk}
              pengeluaran={totalKeluar}
            />

            {/* ===== EXPORT EXCEL ===== */}
            <Card>
              <CardHeader>
                <CardTitle>📊 Laporan Keuangan Bulanan</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Unduh laporan keuangan bulanan dalam format Excel
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                  <div className="flex-1">
                    <label className="text-sm text-muted-foreground">
                      Bulan
                    </label>
                    <Select
                      value={bulan.toString()}
                      onValueChange={(v) => setBulan(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }).map((_, i) => (
                          <SelectItem
                            key={i + 1}
                            value={(i + 1).toString()}
                          >
                            Bulan {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1">
                    <label className="text-sm text-muted-foreground">
                      Tahun
                    </label>
                    <Select
                      value={tahun.toString()}
                      onValueChange={(v) => setTahun(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2025, 2026].map((y) => (
                          <SelectItem key={y} value={y.toString()}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:pt-6">
                    <Button onClick={exportExcel}>Export Excel</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ➕ FORM */}
            <TransactionForm />
          </>
        )}

        {tab === "santri" && (
          <SantriManagement kelas={kelas ? kelas : null} />
        )}

        {tab === "pengguna" && isAdmin && <UserManagement />}
      </main>
    </div>
  );
};

export default Index;
