import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScanBarcode, Wallet, User, RotateCcw, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Tipe Data Santri untuk Kasir
interface SantriKasir {
  id: string;
  nama_lengkap: string;
  kelas: number;
  gender: string;
  saldo: number;
  rfid_card_id: string | null;
  nis: string;
}

const CashierPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null); // Biar kursor otomatis fokus

  const [scanCode, setScanCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [santri, setSantri] = useState<SantriKasir | null>(null);
  const [amount, setAmount] = useState<string>("");

  // Fokus otomatis ke input saat halaman dibuka (Mode Siap Scan)
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [santri]); // Reset fokus kalau santri berubah (transaksi selesai)

  // 1. FUNGSI CARI SANTRI (Simulasi Scan)
  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanCode.trim()) return;

    setLoading(true);
    try {
      // Cari santri berdasarkan RFID ATAU NIS (Biar bisa manual kalau kartu rusak)
      const { data, error } = await supabase
        .from('view_santri_saldo')
        .select('*')
        .or(`rfid_card_id.eq.${scanCode},nis.eq.${scanCode}`) // Cek RFID atau NIS
        .single();

      if (error || !data) {
        toast({ title: "Tidak Ditemukan", description: "Kartu atau NIS tidak terdaftar.", variant: "destructive" });
        setScanCode("");
      } else {
        // @ts-ignore
        setSantri(data);
        setScanCode(""); // Reset input scan
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 2. FUNGSI BAYAR (Kurangi Saldo)
  const handlePayment = async () => {
    if (!santri || !amount) return;
    const nominal = parseInt(amount.replace(/\D/g, '')); // Hapus karakter non-angka

    if (nominal <= 0) {
        toast({ title: "Error", description: "Nominal harus lebih dari 0", variant: "destructive" });
        return;
    }
    if (nominal > santri.saldo) {
        toast({ title: "Saldo Tidak Cukup!", description: `Sisa saldo: Rp ${santri.saldo.toLocaleString()}`, variant: "destructive" });
        return;
    }

    setLoading(true);
    try {
      // Input Transaksi Pengeluaran
      const { error } = await supabase.from('transactions_2025_12_01_21_34').insert([{
        santri_id: santri.id,
        amount: nominal,
        type: 'expense',
        description: 'Jajan Kantin (Cashless)', // Otomatisasi Keterangan
        transaction_date: new Date().toISOString().split('T')[0]
      }]);

      if (error) throw error;

      // Sukses!
      toast({ 
        title: "✅ Transaksi Berhasil", 
        description: `Rp ${nominal.toLocaleString()} berhasil dibayarkan.`,
        className: "bg-green-600 text-white border-none"
      });

      handleReset(); // Kembali ke mode scan
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSantri(null);
    setAmount("");
    setScanCode("");
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center justify-center font-sans">
      
      {/* HEADER KASIR */}
      <div className="w-full max-w-lg mb-6 flex items-center justify-between">
         <Button variant="ghost" onClick={() => navigate('/')} className="text-gray-600 hover:text-gray-900">
             <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Dashboard
         </Button>
         <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ScanBarcode /> KASIR KANTIN
         </h1>
      </div>

      <Card className="w-full max-w-lg shadow-xl border-green-200 overflow-hidden">
        {/* MODE 1: SCANNING (Idle) */}
        {!santri ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <ScanBarcode className="w-12 h-12 text-green-600" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Siap Scan Kartu</h2>
                <p className="text-gray-500">Tempelkan kartu RFID atau ketik NIS santri.</p>
            </div>
            
            <form onSubmit={handleScan} className="relative">
                <Input 
                    ref={inputRef}
                    value={scanCode}
                    onChange={(e) => setScanCode(e.target.value)}
                    placeholder="Menunggu input..." 
                    className="text-center text-lg h-12 border-2 focus:border-green-500 font-mono"
                    autoComplete="off"
                    autoFocus
                />
                <Button type="submit" className="w-full mt-4 bg-green-600 hover:bg-green-700 h-12 text-lg">
                    {loading ? "Mencari..." : "CARI DATA"}
                </Button>
            </form>
          </div>
        ) : (
          /* MODE 2: TRANSAKSI (Data Ditemukan) */
          <div>
            <CardHeader className={`text-white text-center py-6 ${santri.gender === 'ikhwan' ? 'bg-green-600' : 'bg-pink-500'}`}>
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 text-white">
                    <User className="w-10 h-10" />
                </div>
                <CardTitle className="text-2xl font-bold capitalize">{santri.nama_lengkap}</CardTitle>
                <p className="opacity-90">Kelas {santri.kelas} • {santri.gender}</p>
            </CardHeader>
            
            <CardContent className="p-6 space-y-6">
                {/* INFO SALDO */}
                <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-sm text-gray-500 mb-1 flex items-center justify-center gap-2">
                        <Wallet className="w-4 h-4" /> Sisa Saldo Saat Ini
                    </p>
                    <div className={`text-3xl font-bold ${santri.saldo < 10000 ? 'text-red-500' : 'text-gray-800'}`}>
                        Rp {santri.saldo.toLocaleString("id-ID")}
                    </div>
                </div>

                {/* INPUT NOMINAL */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Nominal Belanja (Rp)</label>
                    <Input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Contoh: 5000"
                        className="text-center text-3xl font-bold h-16 border-green-200 focus:ring-green-500"
                        autoFocus
                    />
                </div>

                {/* TOMBOL AKSI */}
                <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" onClick={handleReset} className="h-12 border-red-200 text-red-600 hover:bg-red-50">
                        <RotateCcw className="mr-2 h-4 w-4" /> Batal
                    </Button>
                    <Button onClick={handlePayment} disabled={loading || !amount} className="h-12 bg-green-600 hover:bg-green-700 text-lg font-bold shadow-md">
                        {loading ? "Memproses..." : "BAYAR SEKARANG"}
                    </Button>
                </div>
            </CardContent>
          </div>
        )}
      </Card>
      
      <p className="mt-8 text-gray-400 text-xs">Sistem Kasir v1.0 • PPS Al-Jawahir</p>
    </div>
  );
};

export default CashierPage;
