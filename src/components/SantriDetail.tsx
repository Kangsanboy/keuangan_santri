import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, History, ArrowUpCircle, ArrowDownCircle, Wallet, Trash2, User, CreditCard, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import * as XLSX from "xlsx";
import QRCode from "react-qr-code"; // 🔥 Import library pembuat QR Code

/* ================= TYPES ================= */
interface Transaction {
  id: string; amount: number; type: 'income' | 'expense'; description: string;
  transaction_date: string; created_at: string;
}

interface SantriProfile {
  id: string;
  nama_lengkap: string;
  nisn: string;
  kelas: number;
  rombel: string;
  rfid_card_id: string;
}

interface SantriDetailProps { 
  santriId: string; 
  onBack: () => void; 
}

const SantriDetail = ({ santriId, onBack }: SantriDetailProps) => {
  const { isAdmin } = useAuth(); // Ambil status Admin
  const { toast } = useToast();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profile, setProfile] = useState<SantriProfile | null>(null);
  const [currentSaldo, setCurrentSaldo] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Ambil Profil Santri Lengkap
      const { data: santriData } = await supabase
        .from("santri_2025_12_01_21_34")
        .select("id, nama_lengkap, nisn, kelas, rombel, rfid_card_id")
        .eq("id", santriId)
        .single();
        
      if (santriData) setProfile(santriData as SantriProfile);

      // 2. Ambil Sisa Saldo
      const { data: saldoData } = await supabase
        .from("view_santri_saldo")
        .select("saldo")
        .eq("id", santriId)
        .single();
        
      if (saldoData) setCurrentSaldo(saldoData.saldo || 0);

      // 3. Ambil Riwayat Transaksi
      const { data: trx } = await supabase
        .from("transactions_2025_12_01_21_34")
        .select("*")
        .eq("santri_id", santriId)
        .order("transaction_date", { ascending: false });
        
      if (trx) { 
          // @ts-ignore
          setTransactions(trx); 
      }
    } catch (error) { 
        console.error("Error fetching detail:", error); 
    } finally { 
        setLoading(false); 
    }
  };

  useEffect(() => { fetchData(); }, [santriId]);

  const handleDelete = async (id: string) => {
      if (!window.confirm("Hapus transaksi ini?")) return;
      try {
          const { error } = await supabase.from('transactions_2025_12_01_21_34').delete().eq('id', id);
          if (error) throw error;
          toast({ title: "Berhasil", description: "Transaksi dihapus." });
          fetchData(); // Refresh data biar saldo update
      } catch (err: any) {
          toast({ title: "Gagal", description: err.message, variant: "destructive" });
      }
  };

  const handleExport = () => {
    const rows = transactions.map(t => ({ 
        Tanggal: t.transaction_date, 
        Jenis: t.type === 'income' ? 'Pemasukan' : 'Pengeluaran', 
        Nominal: t.amount, 
        Keterangan: t.description || '-' 
    }));
    const ws = XLSX.utils.json_to_sheet(rows); 
    const wb = XLSX.utils.book_new(); 
    XLSX.utils.book_append_sheet(wb, ws, "Riwayat"); 
    XLSX.writeFile(wb, `Riwayat_${profile?.nama_lengkap || 'Santri'}.xlsx`);
  };

  // 🔥 Tentukan ID yang dipakai untuk QR Code (Prioritas: RFID -> NISN -> ID Sistem)
  const qrValue = profile?.rfid_card_id || profile?.nisn || profile?.id || "unknown";

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      
      {/* HEADER BACK */}
      <div className="flex items-center gap-3 mb-2">
        <Button variant="outline" size="icon" onClick={onBack} className="bg-white hover:bg-green-50 shadow-sm border-gray-200">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Button>
        <div>
            <h2 className="text-xl font-bold text-gray-800 capitalize">Profil & Detail Santri</h2>
            <p className="text-xs text-gray-500">Informasi lengkap dan riwayat transaksi.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* 🔥 CARD PROFIL & QR CODE */}
          <Card className="lg:col-span-2 shadow-sm border-gray-200 bg-white">
              <CardContent className="p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  
                  {/* BAGIAN KIRI: GAMBAR QR CODE */}
                  <div className="flex flex-col items-center gap-2 bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-inner w-full sm:w-auto">
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                          {profile ? (
                              <QRCode 
                                  value={qrValue} 
                                  size={130} 
                                  level="M" 
                                  className="w-32 h-32"
                              />
                          ) : (
                              <div className="w-32 h-32 bg-gray-100 flex items-center justify-center animate-pulse rounded"></div>
                          )}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                          <QrCode size={12} /> Scan Mengaji
                      </div>
                  </div>

                  {/* BAGIAN KANAN: INFO DATA DIRI */}
                  <div className="flex-1 space-y-3 text-center sm:text-left w-full">
                      <div>
                          <h3 className="text-2xl font-black text-gray-800 leading-tight">
                              {profile?.nama_lengkap || "Memuat Nama..."}
                          </h3>
                          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded text-xs font-bold border border-blue-200 mt-2 shadow-sm">
                              <User size={14}/> Kelas {profile?.kelas} - {profile?.rombel || 'A'}
                          </div>
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-2 mt-2 text-sm text-gray-600 w-full">
                          <div className="flex items-center justify-between sm:justify-start sm:gap-4 border-b border-gray-200 pb-2">
                              <span className="text-gray-400 font-medium w-20 text-left">NISN Santri</span>
                              <span className="font-bold text-gray-800 font-mono tracking-wider">{profile?.nisn || '-'}</span>
                          </div>
                          <div className="flex items-center justify-between sm:justify-start sm:gap-4 pt-1">
                              <span className="text-gray-400 font-medium w-20 text-left">Kartu RFID</span>
                              <span className={`font-bold font-mono tracking-wider ${profile?.rfid_card_id ? 'text-green-600' : 'text-orange-500'}`}>
                                  {profile?.rfid_card_id ? (
                                      <span className="flex items-center gap-1"><CreditCard size={14}/> {profile.rfid_card_id}</span>
                                  ) : (
                                      "Belum Terhubung"
                                  )}
                              </span>
                          </div>
                      </div>
                  </div>

              </CardContent>
          </Card>

          {/* CARD SISA SALDO */}
          <Card className="lg:col-span-1 bg-gradient-to-br from-green-600 to-green-700 text-white border-none shadow-md relative overflow-hidden flex flex-col justify-center">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 bg-white/10 w-32 h-32 rounded-full blur-2xl"></div>
              <CardContent className="p-6 relative z-10 text-center lg:text-left">
                  <p className="text-green-100 text-sm font-medium mb-1 flex items-center justify-center lg:justify-start gap-2">
                      <Wallet size={16} /> Sisa Saldo Saat Ini
                  </p>
                  <h1 className="text-4xl md:text-3xl lg:text-4xl font-black mt-2 drop-shadow-sm">
                      Rp {currentSaldo.toLocaleString("id-ID")}
                  </h1>
              </CardContent>
          </Card>
      </div>

      {/* CARD RIWAYAT TRANSAKSI */}
      <Card className="border-green-100 shadow-sm bg-white mt-2">
          <CardHeader className="bg-gray-50/50 border-b pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2 text-gray-800">
                  <History className="w-5 h-5 text-green-600" /> Riwayat Transaksi
              </CardTitle>
              {transactions.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleExport} className="h-8 text-xs bg-white shadow-sm border-gray-200">
                      Export Excel
                  </Button>
              )}
          </CardHeader>
          <CardContent className="p-0">
              {loading ? (
                  <div className="p-8 text-center text-gray-400 animate-pulse">Memuat data transaksi...</div>
              ) : transactions.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 italic">Belum ada riwayat transaksi.</div>
              ) : (
                  <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                      {transactions.map((trx) => (
                          <div key={trx.id} className="p-4 flex items-center justify-between hover:bg-green-50/30 transition-colors">
                              <div className="flex items-center gap-3">
                                  {trx.type === 'income' ? (
                                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shadow-sm border border-green-200">
                                          <ArrowUpCircle size={20} />
                                      </div>
                                  ) : (
                                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shadow-sm border border-red-200">
                                          <ArrowDownCircle size={20} />
                                      </div>
                                  )}
                                  <div>
                                      <p className="font-bold text-gray-800 text-sm">
                                          {trx.type === 'income' ? 'Setor Tunai / Pemasukan' : 'Jajan / Pengeluaran'}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-1">
                                          <span>{trx.transaction_date}</span> 
                                          <span className="hidden sm:inline">•</span> 
                                          <span className="italic">{trx.description || "Tanpa Keterangan"}</span>
                                      </p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-3">
                                  <div className={`font-black text-sm md:text-base ${trx.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                                      {trx.type === 'income' ? '+' : '-'} Rp {trx.amount.toLocaleString("id-ID")}
                                  </div>
                                  {/* 🔥 TOMBOL HAPUS (Hanya Admin) */}
                                  {isAdmin && (
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(trx.id)}>
                                          <Trash2 size={16} />
                                      </Button>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </CardContent>
      </Card>
    </div>
  );
};

export default SantriDetail;
