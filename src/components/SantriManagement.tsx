import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Search, RefreshCw } from "lucide-react"; 
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SantriSaldo {
  id: string;
  nama_lengkap: string;
  kelas: number;
  saldo: number;
}

const SantriManagement = ({ kelas }: { kelas: string | null }) => {
  const { toast } = useToast();
  const [data, setData] = useState<SantriSaldo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const kelasNumber = kelas ? Number(kelas) : null;

  const fetchData = async () => {
    setLoading(true);
    try {
      // 🔥 PERUBAHAN UTAMA:
      // Jangan pakai .rpc("get_saldo_santri_by_kelas") lagi!
      // Pakai .from("view_santri_saldo") karena lebih stabil.
      
      let query = supabase
        .from("view_santri_saldo") 
        .select("*");

      if (kelasNumber) {
        query = query.eq("kelas", kelasNumber);
      }

      const { data: result, error } = await query.order("nama_lengkap", { ascending: true });

      if (error) throw error;

      setData(result || []);

    } catch (err) {
      console.error(err);
      toast({
        title: "Gagal memuat data",
        description: "Cek koneksi atau pastikan SQL View sudah dijalankan.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [kelasNumber]);

  // Auto-refresh saat ada transaksi baru
  useEffect(() => {
    const handleRefresh = () => fetchData();
    window.addEventListener("refresh-keuangan", handleRefresh);
    return () => window.removeEventListener("refresh-keuangan", handleRefresh);
  }, []);

  const filteredData = data.filter((item) =>
    item.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="border-green-100 shadow-sm">
      <CardHeader className="pb-3 border-b bg-gray-50/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-lg text-gray-800">
            <Users className="w-5 h-5 text-green-600" />
            {kelasNumber ? `Saldo Kelas ${kelasNumber}` : "Database Semua Santri"}
            </CardTitle>
            
            <div className="flex gap-2 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Cari nama santri..."
                        className="pl-9 bg-white border-green-200 focus:ring-green-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={fetchData} 
                    disabled={loading}
                    title="Refresh Data"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
           <div className="p-8 text-center text-gray-500 animate-pulse">Menghitung saldo...</div>
        ) : filteredData.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Belum ada data santri.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredData.map((s) => (
              <div
                key={s.id}
                className="flex justify-between items-center p-4 hover:bg-green-50/30 transition-colors"
              >
                <div className="flex flex-col">
                    <span className="font-bold text-gray-700">{s.nama_lengkap}</span>
                    <span className="text-xs text-gray-400">
                        {s.kelas ? `Kelas ${s.kelas}` : "Tanpa Kelas"}
                    </span>
                </div>
                <div className="text-right">
                    <span className={`font-bold text-lg ${ 
                        s.saldo > 0 ? 'text-green-600' : 
                        s.saldo < 0 ? 'text-red-500' : 'text-gray-400' 
                    }`}>
                    Rp {s.saldo.toLocaleString("id-ID")}
                    </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SantriManagement;
