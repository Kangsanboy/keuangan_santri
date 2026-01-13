import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, History, ArrowUpCircle, ArrowDownCircle, Wallet, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import * as XLSX from "xlsx";

interface Transaction {
  id: string; amount: number; type: 'income' | 'expense'; description: string;
  transaction_date: string; created_at: string;
}
interface SantriDetailProps { santriId: string; onBack: () => void; }

const SantriDetail = ({ santriId, onBack }: SantriDetailProps) => {
  const { isAdmin } = useAuth(); // Ambil status Admin
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [santriName, setSantriName] = useState("");
  const [currentSaldo, setCurrentSaldo] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: santri } = await supabase.from("view_santri_saldo").select("nama_lengkap, saldo").eq("id", santriId).single();
      if (santri) { setSantriName(santri.nama_lengkap); setCurrentSaldo(santri.saldo); }

      const { data: trx } = await supabase.from("transactions_2025_12_01_21_34").select("*").eq("santri_id", santriId).order("transaction_date", { ascending: false });
      if (trx) { 
          // @ts-ignore
          setTransactions(trx); 
      }
    } catch (error) { console.error("Error fetching detail:", error); } finally { setLoading(false); }
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
    const rows = transactions.map(t => ({ Tanggal: t.transaction_date, Jenis: t.type === 'income' ? 'Pemasukan' : 'Pengeluaran', Nominal: t.amount, Keterangan: t.description || '-' }));
    const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Riwayat"); XLSX.writeFile(wb, `Riwayat_${santriName}.xlsx`);
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={onBack} className="bg-white hover:bg-green-50"><ArrowLeft className="w-5 h-5 text-gray-700" /></Button>
        <div><h2 className="text-xl font-bold text-gray-800 capitalize">{santriName || "Memuat..."}</h2><p className="text-xs text-gray-500">Detail Riwayat Transaksi</p></div>
      </div>

      <Card className="bg-green-600 text-white border-none shadow-lg">
          <CardContent className="p-6 flex items-center justify-between">
              <div><p className="text-green-100 text-sm font-medium mb-1">Sisa Saldo Saat Ini</p><h1 className="text-3xl font-bold">Rp {currentSaldo.toLocaleString("id-ID")}</h1></div>
              <Wallet className="w-12 h-12 text-green-400 opacity-50" />
          </CardContent>
      </Card>

      <Card className="border-green-100 shadow-sm bg-white">
          <CardHeader className="bg-gray-50/50 border-b pb-3 flex flex-row items-center justify-between"><CardTitle className="text-lg flex items-center gap-2 text-gray-800"><History className="w-5 h-5 text-green-600" /> Riwayat Transaksi</CardTitle>{transactions.length > 0 && (<Button variant="outline" size="sm" onClick={handleExport} className="h-8 text-xs">Export Excel</Button>)}</CardHeader>
          <CardContent className="p-0">
              {loading ? <div className="p-8 text-center text-gray-400">Memuat data...</div> : transactions.length === 0 ? <div className="p-8 text-center text-gray-400 italic">Belum ada riwayat transaksi.</div> : (
                  <div className="divide-y divide-gray-100">
                      {transactions.map((trx) => (
                          <div key={trx.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-3">
                                  {trx.type === 'income' ? <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600"><ArrowUpCircle size={18} /></div> : <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600"><ArrowDownCircle size={18} /></div>}
                                  <div><p className="font-medium text-gray-800 text-sm">{trx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</p><p className="text-xs text-gray-500">{trx.transaction_date} • <span className="italic">{trx.description || "Tanpa Keterangan"}</span></p></div>
                              </div>
                              <div className="flex items-center gap-3">
                                  <div className={`font-bold text-sm ${trx.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>{trx.type === 'income' ? '+' : '-'} Rp {trx.amount.toLocaleString("id-ID")}</div>
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

export default SantriDetail;SantriDetail;
