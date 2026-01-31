import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ScanBarcode, Wallet, ArrowLeft, Store, AlertTriangle, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Style CSS khusus Struk (58mm)
const printStyles = `
  @media print {
    @page { size: 58mm auto; margin: 0; }
    body * { visibility: hidden; }
    #printable-receipt, #printable-receipt * { visibility: visible; }
    #printable-receipt {
      position: absolute; left: 0; top: 0; width: 58mm;
      font-family: 'Courier New', monospace; font-size: 12px;
      color: black; padding: 5px 2px; line-height: 1.2;
    }
    .no-print { display: none !important; }
  }
`;

interface SantriKasir {
  id: string; nama_lengkap: string; kelas: number; gender: string; 
  saldo: number; rfid_card_id: string | null; nis: string;
  today_expense: number; // 🔥 Data Jajan Hari Ini
}

const DAILY_LIMIT = 10000; // 🔥 BATAS LIMIT RP 10.000

const CashierPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [scanCode, setScanCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [santri, setSantri] = useState<SantriKasir | null>(null);
  const [amount, setAmount] = useState<string>("");
  
  const [lastTrx, setLastTrx] = useState<any>(null);
  const [printTrigger, setPrintTrigger] = useState(false);

  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, [santri]);

  // Efek Auto Print (Kalau nanti alatnya ada)
  useEffect(() => {
    if (printTrigger && lastTrx) {
        const timer = setTimeout(() => {
            window.print();
            setPrintTrigger(false);
        }, 300);
        return () => clearTimeout(timer);
    }
  }, [printTrigger, lastTrx]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault(); if (!scanCode.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('view_santri_saldo').select('*').or(`rfid_card_id.eq.${scanCode},nis.eq.${scanCode}`).single();
      if (error || !data) {
        toast({ title: "❌ Tidak Ditemukan", description: "Kartu atau NIS belum terdaftar.", variant: "destructive" }); setScanCode("");
      } else {
        // @ts-ignore
        setSantri(data); setScanCode(""); setLastTrx(null); 
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handlePayment = async () => {
    if (!santri || !amount || !user) return;
    const nominal = parseInt(amount.replace(/\D/g, ''));
    
    // --- 🛡️ VALIDASI LIMIT & SALDO ---
    if (nominal <= 0) { toast({ title: "Nominal Salah", variant: "destructive" }); return; }
    
    // Cek Saldo
    if (nominal > santri.saldo) { 
        toast({ title: "Saldo Kurang!", description: `Sisa: Rp ${santri.saldo.toLocaleString()}`, variant: "destructive" }); return; 
    }

    // 🔥 CEK LIMIT HARIAN
    const sisaJatah = DAILY_LIMIT - santri.today_expense;
    if (nominal > sisaJatah) {
        toast({ 
            title: "🚫 MELEBIHI LIMIT!", 
            description: `Sisa jatah hari ini: Rp ${sisaJatah.toLocaleString()}.`, 
            variant: "destructive",
            duration: 5000 
        });
        return; 
    }
    // ------------------------------------

    setLoading(true);
    try {
      const trxData = {
        santri_id: santri.id,
        amount: nominal,
        type: 'expense',
        description: 'Jajan Kantin',
        merchant_id: user.id, 
        transaction_date: new Date().toISOString().split('T')[0]
      };

      const { error } = await supabase.from('transactions_2025_12_01_21_34').insert([trxData]);
      if (error) throw error;

      const merchantName = user.user_metadata?.full_name || "Kantin PPS";
      setLastTrx({ ...trxData, santri_nama: santri.nama_lengkap, sisa_saldo: santri.saldo - nominal, merchant: merchantName, time: new Date().toLocaleString('id-ID') });

      toast({ title: "✅ Pembayaran Berhasil", description: `Sisa Limit: Rp ${(sisaJatah - nominal).toLocaleString()}`, className: "bg-green-600 text-white border-none" });

      setSantri(null); setAmount(""); setPrintTrigger(true); 
      if (inputRef.current) inputRef.current.focus();

    } catch (err: any) { toast({ title: "Gagal", description: err.message, variant: "destructive" }); } finally { setLoading(false); }
  };

  const handleReset = () => { setSantri(null); setAmount(""); setScanCode(""); if (inputRef.current) inputRef.current.focus(); };
  const merchantName = user?.user_metadata?.full_name || user?.email || "Kasir Kantin";

  // Hitungan UI Limit
  const usedPercent = santri ? Math.min((santri.today_expense / DAILY_LIMIT) * 100, 100) : 0;
  const sisaJatah = santri ? DAILY_LIMIT - santri.today_expense : 0;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      <style>{printStyles}</style>

      {/* HEADER */}
      <header className="bg-gray-900 text-white shadow-md p-4 flex justify-between items-center no-print sticky top-0 z-50">
         <div className="flex items-center gap-4">
             <Button variant="ghost" onClick={() => navigate('/')} className="text-gray-300 hover:text-white hover:bg-gray-800"><ArrowLeft className="mr-2 h-5 w-5" /> Keluar</Button>
             <div className="border-l border-gray-700 pl-4">
                 <h1 className="text-xl font-bold flex items-center gap-2 text-yellow-400"><Store className="h-6 w-6" /> {merchantName.toUpperCase()}</h1>
                 <p className="text-xs text-gray-400">Mode Kasir Aktif • Limit Rp 10rb/Hari</p>
             </div>
         </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1 flex items-center justify-center p-4 no-print">
        <Card className="w-full max-w-lg shadow-2xl border-0 overflow-hidden">
            
            {!santri ? (
            <div className="p-10 text-center space-y-8 bg-white">
                <div className="relative">
                    <div className="w-32 h-32 bg-green-50 rounded-full flex items-center justify-center mx-auto border-4 border-green-100 animate-pulse"><ScanBarcode className="w-16 h-16 text-green-600" /></div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-3 py-1 rounded-full shadow-sm">READER READY</div>
                </div>
                <div><h2 className="text-3xl font-bold text-gray-800 mb-2">Silakan Scan Kartu</h2><p className="text-gray-500">Tempelkan kartu RFID santri.</p></div>
                <form onSubmit={handleScan} className="relative w-full max-w-xs mx-auto">
                    <Input ref={inputRef} value={scanCode} onChange={(e) => setScanCode(e.target.value)} className="text-center text-lg h-12 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all rounded-xl" placeholder="...menunggu input..." autoFocus />
                </form>
            </div>
            ) : (
            <div className="flex flex-col h-full bg-white">
                {/* Header Santri */}
                <div className={`p-6 text-white text-center relative overflow-hidden ${santri.gender === 'ikhwan' ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gradient-to-r from-pink-500 to-rose-500'}`}>
                    <div className="relative z-10">
                        <h2 className="text-3xl font-bold capitalize mb-1">{santri.nama_lengkap}</h2>
                        <div className="flex justify-center gap-2 text-sm opacity-90 font-medium">
                            <span className="bg-white/20 px-3 py-1 rounded-full">Kelas {santri.kelas}</span>
                            <span className="bg-white/20 px-3 py-1 rounded-full capitalize">{santri.gender}</span>
                        </div>
                    </div>
                </div>

                <CardContent className="p-6 space-y-6">
                    {/* 🔥 INFO LIMIT HARIAN (BARU) */}
                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                        <div className="flex justify-between text-sm font-bold text-yellow-800 mb-1">
                            <span className="flex items-center gap-1"><Coins className="w-4 h-4" /> Limit Harian</span>
                            <span>{santri.today_expense.toLocaleString()} / 10.000</span>
                        </div>
                        {/* Progress Bar Limit */}
                        <div className="w-full bg-yellow-200 rounded-full h-3 overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${usedPercent >= 100 ? 'bg-red-500' : 'bg-yellow-500'}`} style={{ width: `${usedPercent}%` }}></div>
                        </div>
                        <p className={`text-center text-xs mt-2 font-bold ${sisaJatah <= 0 ? 'text-red-600' : 'text-green-700'}`}>
                            {sisaJatah <= 0 ? "🚫 JATAH HARI INI HABIS!" : `Boleh jajan Rp ${sisaJatah.toLocaleString()} lagi.`}
                        </p>
                    </div>

                    {/* Info Saldo */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200">
                        <div className="flex items-center gap-3"><div className="bg-blue-100 p-2 rounded-full"><Wallet className="text-blue-600 w-6 h-6" /></div><div><p className="text-xs text-gray-500 font-bold uppercase">Sisa Saldo</p><p className="text-sm text-gray-400">Dompet Utama</p></div></div>
                        <div className="text-right"><p className={`text-2xl font-bold ${santri.saldo < 5000 ? 'text-red-500' : 'text-gray-800'}`}>Rp {santri.saldo.toLocaleString("id-ID")}</p></div>
                    </div>

                    {/* Input Besar */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-700 uppercase tracking-wider block text-center">Input Nominal Belanja</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-2xl">Rp</span>
                            {/* Disabled kalau limit habis */}
                            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={sisaJatah <= 0} className="text-right text-4xl font-bold h-20 pl-12 border-2 border-gray-200 focus:border-green-500 rounded-2xl shadow-sm disabled:bg-gray-100 disabled:text-gray-400" placeholder="0" autoFocus />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-4 pt-2">
                        <Button variant="outline" onClick={handleReset} className="h-14 col-span-1 border-gray-300 hover:bg-gray-100 text-gray-600 rounded-xl"><RotateCcw className="w-6 h-6" /></Button>
                        <Button onClick={handlePayment} disabled={loading || !amount || sisaJatah <= 0} className="h-14 col-span-2 bg-green-600 hover:bg-green-700 text-white text-xl font-bold rounded-xl shadow-lg shadow-green-200 disabled:bg-gray-400">
                            {loading ? "..." : (sisaJatah <= 0 ? "LIMIT HABIS" : "BAYAR")}
                        </Button>
                    </div>
                </CardContent>
            </div>
            )}
        </Card>
      </main>

      {/* STRUK (HIDDEN) */}
      <div id="printable-receipt">
        {lastTrx && (
            <div className="text-center">
                <div className="font-bold text-lg mb-1">PPS AL-JAWAHIR</div><div className="text-xs mb-2">Jl. Pesantren No. 1</div>
                <hr className="border-t border-black border-dashed my-2"/>
                <div className="text-left flex justify-between text-xs mb-1"><span>Tanggal :</span><span>{lastTrx.time}</span></div>
                <div className="text-left flex justify-between text-xs mb-1"><span>Kasir :</span><span>{lastTrx.merchant}</span></div>
                <div className="text-left flex justify-between text-xs mb-2"><span>Santri :</span><span className="font-bold">{lastTrx.santri_nama}</span></div>
                <hr className="border-t border-black border-dashed my-2"/>
                <div className="flex justify-between font-bold text-sm my-2"><span>TOTAL BAYAR</span><span>Rp {lastTrx.amount.toLocaleString("id-ID")}</span></div>
                <div className="flex justify-between text-xs"><span>Sisa Saldo</span><span>Rp {lastTrx.sisa_saldo.toLocaleString("id-ID")}</span></div>
                <hr className="border-t border-black border-dashed my-2"/>
                <div className="text-center text-xs mt-2">Terima Kasih<br/>Simpan struk sebagai bukti sah.</div>
            </div>
        )}
      </div>
    </div>
  );
};

export default CashierPage;
