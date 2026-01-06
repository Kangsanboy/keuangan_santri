import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import AuthPage from "@/components/AuthPage";
import Header from "@/components/Header";
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

/* ================= TYPES ================= */
interface RekapSaldo {
  kelas: number;
  gender: "ikhwan" | "akhwat";
  saldo: number;
}

/* ================= STYLE ================= */
const cardStyle =
  "border-2 border-green-500/60 rounded-2xl bg-white shadow-sm";

const Index = () => {
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();

  const tab = searchParams.get("tab") || "transactions";
  const kelas = searchParams.get("kelas");
  const navigate = useNavigate();

  /* ================= STATE ================= */
  const [rekapSaldo, setRekapSaldo] = useState<RekapSaldo[]>([]);
  const [totalMasuk, setTotalMasuk] = useState(0);
  const [totalKeluar, setTotalKeluar] = useState(0);
  const [masuk7Hari, setMasuk7Hari] = useState(0);
  const [keluar7Hari, setKeluar7Hari] = useState(0);
  const [keluarHariIni, setKeluarHariIni] = useState(0);

  /* ================= AMBIL DATA ================= */
  const fetchKeuangan = async () => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);
    const todayStr = today.toISOString().slice(0, 10);

    const { data } = await supabase
      .from("transactions_2025_12_01_21_34")
      .select("amount, type, transaction_date");

    if (!data) return;

    let masuk = 0,
      keluar = 0,
      masuk7 = 0,
      keluar7 = 0,
      keluarToday = 0;

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
    const { data } = await supabase.rpc(
      "get_saldo_rekap_kelas_gender"
    );
    setRekapSaldo(data || []);
  };

  /* ================= EXPORT EXCEL (FIX ERROR) ================= */
  const exportExcelBulanan = async () => {
    const now = new Date();
    const bulan = now.getMonth();
    const tahun = now.getFullYear();

    const namaBulan = [
      "Januari","Februari","Maret","April","Mei","Juni",
      "Juli","Agustus","September","Oktober","November","Desember",
    ][bulan];

    const awal = `${tahun}-${String(bulan + 1).padStart(2, "0")}-01`;
    const akhir = `${tahun}-${String(bulan + 1).padStart(2, "0")}-31`;

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
      console.error("Gagal export:", error);
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

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");

    XLSX.writeFile(
      wb,
      `Laporan Keuangan ${namaBulan} ${tahun}.xlsx`
    );
  };

  useEffect(() => {
    fetchKeuangan();
    fetchRekapSaldo();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-3 md:px-4 py-6 space-y-6">
        {tab === "transactions" && isAdmin && (
          <>
            {/* ================= JUDUL ================= */}
            <div className="text-center space-y-2">
              <h1 className="text-xl md:text-2xl font-bold text-green-700">
                SALDO SANTRI PPS AL-JAWAHIR
              </h1>
              <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto">
                Monitoring data saldo santri Pondok Pesantren Salafiyah
                Al-Jawahir secara real-time, akurat, dan terintegrasi.
              </p>
            </div>

            {/* ================= SALDO PER KELAS ================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[7, 8, 9, 10, 11, 12].map((kls) => {
                const ikhwan =
                  rekapSaldo.find(
                    (r) => r.kelas === kls && r.gender === "ikhwan"
                  )?.saldo || 0;

                const akhwat =
                  rekapSaldo.find(
                    (r) => r.kelas === kls && r.gender === "akhwat"
                  )?.saldo || 0;

                return (
                  <Card
                  key={kls}
                  className={`${cardStyle} cursor-pointer transition hover:shadow-md hover:border-green-600`}
                  onClick={() => navigate(`/saldo-kelas/${kls}`)}
>
                    <CardHeader className="py-3">
                      <CardTitle className="text-center text-base">
                        Kelas {kls}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Ikhwan</span>
                        <span className="text-green-600">
                          Rp {ikhwan.toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Akhwat</span>
                        <span className="text-pink-600">
                          Rp {akhwat.toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="border-t pt-1 flex justify-between font-semibold">
                        <span>Total</span>
                        <span>
                          Rp {(ikhwan + akhwat).toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="text-xs text-center text-gray-500 mt-1">
  Klik untuk melihat detail santri
</div>

                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* ================= RINGKASAN ================= */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { title: "Total Saldo", value: totalMasuk - totalKeluar, color: "text-green-700" },
                { title: "Pemasukan 7 Hari", value: masuk7Hari, color: "text-green-600" },
                { title: "Pengeluaran 7 Hari", value: keluar7Hari, color: "text-red-600" },
                { title: "Pengeluaran Hari Ini", value: keluarHariIni, color: "text-orange-600" },
              ].map((item) => (
                <Card key={item.title} className={cardStyle}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-center text-xs md:text-sm">
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-lg md:text-xl font-bold text-center ${item.color}`}>
                      Rp {item.value.toLocaleString("id-ID")}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* ================= GRAFIK ================= */}
            <Card className={cardStyle}>
              <CardHeader>
                <CardTitle className="text-center">
                  Grafik Keuangan Mingguan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FinanceChart
                  pemasukan={masuk7Hari}
                  pengeluaran={keluar7Hari}
                />
              </CardContent>
            </Card>

            {/* ================= EXPORT ================= */}
            <Card className={cardStyle}>
              <CardHeader>
                <CardTitle className="text-center">
                  Unduh Laporan Keuangan Bulanan
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Button
                  onClick={exportExcelBulanan}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Export Excel
                </Button>
              </CardContent>
            </Card>

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
