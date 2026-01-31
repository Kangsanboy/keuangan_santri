import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Store, Banknote, RefreshCw, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface WarungStats {
  id: string;
  nama_warung: string;
  email: string;
  tagihan_belum_bayar: number; // 🔥 Yang harus dibayar Abang sekarang
  total_omzet_hari_ini: number; // Total penjualan (termasuk yang udah dibayar)
  transaksi_count: number;
}

const WarungMonitoring = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [warungData, setWarungData] = useState<WarungStats[]>([]);
  const [grandTotalTagihan, setGrandTotalTagihan] = useState(0);

  const fetchWarungData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // 1. Ambil User Kantin
      const { data: merchants, error: errMerchant } = await supabase.from('users').select('id, full_name, email').eq('role', 'kantin');
      if (errMerchant) throw errMerchant;
      if (!merchants || merchants.length === 0) { setWarungData([]); setLoading(false); return; }

      // 2. Ambil Transaksi HARI INI (Expense santri = Income warung)
      // Kita ambil status is_settled juga
      const { data: transactions, error: errTrx } = await supabase
        .from('transactions_2025_12_01_21_34')
        .select('merchant_id, amount, is_settled')
        .eq('transaction_date', today)
        .eq('type', 'expense');

      if (errTrx) throw errTrx;

      // 3. Hitung Tagihan
      let totalHarusBayar = 0;
      
      const stats: WarungStats[] = merchants.map(m => {
        const myTrx = transactions?.filter(t => t.merchant_id === m.id) || [];
        
        // Hitung total omzet kotor
        const totalOmzet = myTrx.reduce((acc, curr) => acc + curr.amount, 0);
        
        // Hitung yang BELUM di-settle (is_settled === false)
        const belumBayar = myTrx
            .filter(t => t.is_settled === false)
            .reduce((acc, curr) => acc + curr.amount, 0);

        totalHarusBayar += belumBayar;

        return {
          id: m.id,
          nama_warung: m.full_name || "Warung Tanpa Nama",
          email: m.email,
          tagihan_belum_bayar: belumBayar,
          total_omzet_hari_ini: totalOmzet,
          transaksi_count: myTrx.length
        };
      });

      setWarungData(stats);
      setGrandTotalTagihan(totalHarusBayar);

    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); } finally { setLoading(false); }
  };

  useEffect(() => { fetchWarungData(); }, []);

  // 🔥 FUNGSI BAYAR (SETTLEMENT)
  const handleSettlement = async (merchantId: string, namaWarung: string, nominal: number) => {
    const today = new Date().toISOString().split('T')[0];
    setLoading(true);
    try {
        // Update semua transaksi hari ini milik merchant ini jadi settled
        const { error } = await supabase
            .from('transactions_2025_12_01_21_34')
            .update({ is_settled: true })
            .eq('merchant_id', merchantId)
            .eq('transaction_date', today)
            .eq('type', 'expense')
            .eq('is_settled', false); // Hanya yang belum lunas

        if (error) throw error;

        toast({ 
            title: "✅ Pelunasan Berhasil!", 
            description: `Dana Rp ${nominal.toLocaleString()} ke ${namaWarung} tercatat lunas.`,
            className: "bg-green-600 text-white border-none"
        });

        fetchWarungData(); // Refresh data

    } catch (error: any) {
        toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-purple-100">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Store className="text-purple-600" /> Monitoring Warung</h2>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><Calendar className="w-3 h-3" /> Settlement Harian: <strong>{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
        </div>
        
        {/* KARTU TOTAL GRAND (YANG HARUS DISIAPKAN) */}
        <div className={`p-4 rounded-xl shadow-lg flex items-center gap-4 w-full md:w-auto transition-colors ${grandTotalTagihan > 0 ? 'bg-purple-600 text-white animate-pulse' : 'bg-green-600 text-white'}`}>
            <div className="bg-white/20 p-3 rounded-full"><Banknote className="w-8 h-8" /></div>
            <div>
                <p className="text-xs opacity-90 uppercase font-bold tracking-wider">
                    {grandTotalTagihan > 0 ? "Siapkan Uang Cash" : "Semua Lunas"}
                </p>
                <h3 className="text-2xl font-bold">Rp {grandTotalTagihan.toLocaleString("id-ID")}</h3>
            </div>
        </div>
      </div>

      <div className="flex justify-end"><Button variant="outline" size="sm" onClick={fetchWarungData} disabled={loading} className="gap-2"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Data</Button></div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {warungData.length === 0 ? (
            <div className="col-span-full text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed"><Store className="w-12 h-12 mx-auto mb-2 opacity-20" /><p>Belum ada transaksi hari ini.</p></div>
        ) : (
            warungData.map((warung) => (
                <Card key={warung.id} className={`transition-shadow hover:shadow-md ${warung.tagihan_belum_bayar > 0 ? 'border-l-4 border-l-orange-500' : 'border-l-4 border-l-green-500 opacity-80'}`}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold text-gray-800 flex justify-between items-start">
                            <span>{warung.nama_warung}</span>
                            {warung.tagihan_belum_bayar === 0 && <CheckCircle2 className="text-green-500 w-6 h-6" />}
                        </CardTitle>
                        <p className="text-xs text-gray-500">{warung.email}</p>
                    </CardHeader>
                    <CardContent>
                        <div className="mt-4 space-y-4">
                            {/* STATUS TAGIHAN */}
                            <div className={`p-4 rounded-lg text-center ${warung.tagihan_belum_bayar > 0 ? 'bg-orange-50 border border-orange-100' : 'bg-green-50 border border-green-100'}`}>
                                <p className="text-xs font-bold uppercase mb-1 text-gray-500">Tagihan Malam Ini</p>
                                <h3 className={`text-2xl font-bold ${warung.tagihan_belum_bayar > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                    Rp {warung.tagihan_belum_bayar.toLocaleString('id-ID')}
                                </h3>
                                {warung.tagihan_belum_bayar === 0 && <span className="text-xs text-green-700 font-bold bg-green-200 px-2 py-0.5 rounded-full mt-1 inline-block">SUDAH DIBAYAR</span>}
                            </div>

                            {/* TOTAL OMZET (INFO) */}
                            <div className="flex justify-between text-xs text-gray-500 px-1">
                                <span>Total Omzet Hari Ini:</span>
                                <span className="font-bold">Rp {warung.total_omzet_hari_ini.toLocaleString()}</span>
                            </div>

                            {/* TOMBOL AKSI */}
                            {warung.tagihan_belum_bayar > 0 ? (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button className="w-full bg-purple-600 hover:bg-purple-700 shadow-md font-bold">
                                            <Banknote className="mr-2 h-4 w-4" /> BAYARKAN SEKARANG
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="flex items-center gap-2 text-purple-700"><AlertCircle /> Konfirmasi Pembayaran</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Apakah Anda sudah menyerahkan uang tunai sebesar <strong>Rp {warung.tagihan_belum_bayar.toLocaleString('id-ID')}</strong> kepada <strong>{warung.nama_warung}</strong>?
                                                <br /><br />
                                                <span className="text-xs bg-yellow-100 p-2 rounded text-yellow-800 block">Tindakan ini akan mereset tagihan warung menjadi Rp 0.</span>
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Batal</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleSettlement(warung.id, warung.nama_warung, warung.tagihan_belum_bayar)} className="bg-purple-600 hover:bg-purple-700">
                                                Ya, Sudah Bayar
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            ) : (
                                <Button variant="outline" disabled className="w-full border-green-200 text-green-600 bg-green-50">
                                    <CheckCircle2 className="mr-2 h-4 w-4" /> LUNAS
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))
        )}
      </div>
    </div>
  );
};

export default WarungMonitoring;
