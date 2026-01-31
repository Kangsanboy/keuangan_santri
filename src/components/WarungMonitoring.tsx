import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Store, Banknote, RefreshCw, Calendar, TrendingUp } from "lucide-react";

interface WarungStats {
  id: string;
  nama_warung: string;
  email: string;
  omzet_hari_ini: number;
  transaksi_count: number;
}

const WarungMonitoring = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [warungData, setWarungData] = useState<WarungStats[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);

  const fetchWarungData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD

      // 1. Ambil semua user dengan role 'kantin'
      const { data: merchants, error: errMerchant } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'kantin');

      if (errMerchant) throw errMerchant;
      if (!merchants || merchants.length === 0) {
        setWarungData([]); setLoading(false); return;
      }

      // 2. Ambil transaksi HARI INI untuk semua merchant sekaligus
      const { data: transactions, error: errTrx } = await supabase
        .from('transactions_2025_12_01_21_34')
        .select('merchant_id, amount')
        .eq('transaction_date', today)
        .eq('type', 'expense'); // Expense bagi santri = Income bagi warung

      if (errTrx) throw errTrx;

      // 3. Gabungkan Data (Hitung Omzet per Warung)
      let totalUangSiap = 0;
      const stats: WarungStats[] = merchants.map(m => {
        // Filter transaksi milik merchant ini
        const myTrx = transactions?.filter(t => t.merchant_id === m.id) || [];
        const omzet = myTrx.reduce((acc, curr) => acc + curr.amount, 0);
        
        totalUangSiap += omzet;

        return {
          id: m.id,
          nama_warung: m.full_name || "Warung Tanpa Nama",
          email: m.email,
          omzet_hari_ini: omzet,
          transaksi_count: myTrx.length
        };
      });

      setWarungData(stats);
      setGrandTotal(totalUangSiap);

    } catch (error: any) {
      toast({ title: "Gagal memuat data", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarungData();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
      
      {/* HEADER & SUMMARY */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-purple-100">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Store className="text-purple-600" /> Monitoring Warung
            </h2>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <Calendar className="w-3 h-3" /> Data Transaksi: <strong>HARI INI</strong> ({new Date().toLocaleDateString('id-ID')})
            </p>
        </div>
        
        {/* KARTU TOTAL GRAND */}
        <div className="bg-purple-600 text-white p-4 rounded-xl shadow-lg flex items-center gap-4 w-full md:w-auto">
            <div className="bg-white/20 p-3 rounded-full">
                <Banknote className="w-8 h-8" />
            </div>
            <div>
                <p className="text-xs text-purple-200 uppercase font-bold tracking-wider">Total Dana Disiapkan</p>
                <h3 className="text-2xl font-bold">Rp {grandTotal.toLocaleString("id-ID")}</h3>
            </div>
        </div>
      </div>

      {/* TOMBOL REFRESH */}
      <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={fetchWarungData} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
          </Button>
      </div>

      {/* GRID KARTU WARUNG */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {warungData.length === 0 ? (
            <div className="col-span-full text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed">
                <Store className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>Belum ada warung terdaftar atau belum ada transaksi hari ini.</p>
            </div>
        ) : (
            warungData.map((warung) => (
                <Card key={warung.id} className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold text-gray-800 flex justify-between items-start">
                            <span>{warung.nama_warung}</span>
                            <Store className="w-5 h-5 text-gray-400" />
                        </CardTitle>
                        <p className="text-xs text-gray-500">{warung.email}</p>
                    </CardHeader>
                    <CardContent>
                        <div className="mt-2 space-y-3">
                            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                                <span className="text-sm text-gray-600">Omzet Hari Ini</span>
                                <span className="text-lg font-bold text-purple-700">
                                    Rp {warung.omzet_hari_ini.toLocaleString('id-ID')}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <TrendingUp className="w-4 h-4 text-green-500" />
                                <span>{warung.transaksi_count} kali transaksi berhasil.</span>
                            </div>
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
