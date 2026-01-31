import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext"; // 🔥 Ambil user login
import { supabase } from "@/integrations/supabase/client";
import { ScanBarcode, Wallet, User, RotateCcw, ArrowLeft, Printer, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Style khusus print (Thermal 58mm)
const printStyles = `
  @media print {
    @page { size: 58mm auto; margin: 0; }
    body * { visibility: hidden; }
    #printable-receipt, #printable-receipt * { visibility: visible; }
    #printable-receipt {
      position: absolute; left: 0; top: 0; width: 58mm;
      font-family: 'Courier New', monospace; font-size: 12px;
      color: black; padding: 5px;
    }
    .no-print { display: none !important; }
  }
`;

interface SantriKasir {
  id: string; nama_lengkap: string; kelas: number; gender: string; saldo: number; rfid_card_id: string | null; nis: string;
}

const CashierPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth(); // Ambil data Merchant yg login
  const inputRef = useRef<HTMLInputElement>(null);

  const [scanCode, setScanCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [santri, setSantri] = useState<SantriKasir | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [lastTrx, setLastTrx] = useState<any>(null); // Data untuk struk

  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, [santri]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault(); if (!scanCode.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('view_santri_saldo').select('*').or(`rfid_card_id.eq.${scanCode},nis.eq.${scanCode}`).single();
      if (error || !data) {
        toast({ title: "Tidak Ditemukan", description: "Kartu/NIS salah.", variant: "destructive" }); setScanCode("");
      } else {
        // @ts-ignore
        setSantri(data); setScanCode(""); setLastTrx(null); // Reset struk lama
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handlePayment = async () => {
    if (!santri || !amount || !user) return;
    const nominal = parseInt(amount.replace(/\D/g, ''));
    if (nominal <= 0 || nominal > santri.saldo) {
        toast({ title: "Error", description: "Saldo tidak cukup / Nominal salah.", variant: "destructive" }); return;
    }

    setLoading(true);
    try {
      const trxData = {
        santri_id: santri.id,
        amount: nominal,
        type: 'expense',
        description: 'Jajan Kantin',
        merchant_id: user.id, // 🔥 CATAT SIAPA YANG JUALAN
        transaction_date: new Date().toISOString().split('T')[0]
      };

      const { error } = await supabase.from('transactions_2025_12_01_21_34').insert([trxData]);
      if (error) throw error;

      // Siapkan data struk
      setLastTrx({ ...trxData, santri_nama: santri.nama_lengkap, sisa_saldo: santri.saldo - nominal, time: new Date().toLocaleString() });
      
      toast({ title: "Berhasil", description: "Transaksi tersimpan.", className: "bg-green-600 text-white" });
      
      // Auto Print (Opsional, atau klik manual)
      // setTimeout(() => window.print(), 500); 

      setSantri(null); setAmount(""); // Reset UI tapi simpan lastTrx buat print
      if (inputRef.current) inputRef.current.focus();

    } catch (err: any) { toast({ title: "Gagal", description: err.message, variant: "destructive" }); } finally { setLoading(false); }
  };

  const handleReset = () => { setSantri(null); setAmount(""); setScanCode(""); if (inputRef.current) inputRef.current.focus(); };

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center justify-center font-sans">
      <style>{printStyles}</style>

      {/* HEADER */}
      <div className="w-full max-w-lg mb-6 flex items-center justify-between no-print">
         <Button variant="ghost" onClick={() => navigate('/')}><ArrowLeft className="mr-2 h-4 w-4" /> Dashboard</Button>
         <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Store /> KASIR KANTIN</h1>
      </div>

      <Card className="w-full max-w-lg shadow-xl border-green-200 overflow-hidden no-print">
        {!santri ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-pulse"><ScanBarcode className="w-12 h-12 text-green-600" /></div>
            <div><h2 className="text-2xl font-bold text-gray-800">Siap Scan</h2><p className="text-gray-500">Tempel Kartu RFID / Ketik NIS</p></div>
            <form onSubmit={handleScan}><Input ref={inputRef} value={scanCode} onChange={(e) => setScanCode(e.target.value)} className="text-center text-lg h-12" autoFocus /><Button type="submit" className="w-full mt-4 bg-green-600 h-12">{loading ? "..." : "CARI"}</Button></form>
            
            {/* TOMBOL CETAK STRUK TERAKHIR */}
            {lastTrx && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-bold text-yellow-800 mb-2">Transaksi Terakhir: Rp {lastTrx.amount.toLocaleString()}</p>
                    <Button onClick={() => window.print()} variant="outline" size="sm" className="w-full border-yellow-600 text-yellow-700 hover:bg-yellow-100"><Printer className="mr-2 h-4 w-4" /> Cetak Struk</Button>
                </div>
            )}
          </div>
        ) : (
          <div>
            <CardHeader className={`text-white text-center py-6 ${santri.gender==='ikhwan'?'bg-green-600':'bg-pink-500'}`}><CardTitle className="text-2xl font-bold capitalize">{santri.nama_lengkap}</CardTitle><p className="opacity-90">{santri.kelas} • {santri.gender}</p></CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="text-center p-4 bg-gray-50 rounded-xl border"><p className="text-sm text-gray-500 flex justify-center gap-2"><Wallet className="w-4 h-4" /> Saldo</p><div className="text-3xl font-bold text-gray-800">Rp {santri.saldo.toLocaleString("id-ID")}</div></div>
                <div className="space-y-2"><label className="text-sm font-bold">Nominal (Rp)</label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="text-center text-3xl font-bold h-16" autoFocus /></div>
                <div className="grid grid-cols-2 gap-4"><Button variant="outline" onClick={handleReset} className="h-12 border-red-200 text-red-600"><RotateCcw className="mr-2 h-4 w-4" /> Batal</Button><Button onClick={handlePayment} disabled={loading || !amount} className="h-12 bg-green-600 font-bold">{loading ? "..." : "BAYAR"}</Button></div>
            </CardContent>
          </div>
        )}
      </Card>

      {/* 🔥 FORMAT STRUK (HANYA MUNCUL SAAT PRINT) */}
      <div id="printable-receipt">
        {lastTrx && (
            <div className="text-center border-b-2 border-black pb-2 mb-2 border-dashed">
                <h2 className="font-bold text-lg">PPS AL-JAWAHIR</h2>
                <p className="text-xs">Sistem Kantin Digital</p>
                <p className="text-xs mt-1">{lastTrx.time}</p>
                <hr className="border-t border-black border-dashed my-2"/>
                <div className="text-left">
                    <p>Santri : {lastTrx.santri_nama}</p>
                    <p>Item   : Jajan Kantin</p>
                </div>
                <hr className="border-t border-black border-dashed my-2"/>
                <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>Rp {lastTrx.amount.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                    <span>Sisa Saldo</span>
                    <span>Rp {lastTrx.sisa_saldo.toLocaleString("id-ID")}</span>
                </div>
                <hr className="border-t border-black border-dashed my-2"/>
                <p className="text-center text-xs mt-2">Terima Kasih</p>
                <p className="text-center text-[10px]">Simpan struk ini sebagai bukti.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default CashierPage;
