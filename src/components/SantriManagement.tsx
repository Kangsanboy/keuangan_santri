import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Search, RefreshCw, User, UserCheck } from "lucide-react"; 
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SantriSaldo {
  id: string;
  nama_lengkap: string;
  kelas: number;
  gender: "ikhwan" | "akhwat"; // Pastikan ada gender
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
      let query = supabase
        .from("view_santri_saldo") 
        .select("*");

      if (kelasNumber) {
        query = query.eq("kelas", kelasNumber);
      }

      const { data: result, error } = await query.order("nama_lengkap", { ascending: true });

      if (error) throw error;

      // @ts-ignore
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

  useEffect(() => {
    const handleRefresh = () => fetchData();
    window.addEventListener("refresh-keuangan", handleRefresh);
    return () => window.removeEventListener("refresh-keuangan", handleRefresh);
  }, []);

  // Filter Data Utama berdasarkan Search
  const filteredData = data.filter((item) =>
    item.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 🔥 PISAHKAN DATA IKHWAN & AKHWAT
  const dataIkhwan = filteredData.filter(s => s.gender === 'ikhwan');
  const dataAkhwat = filteredData.filter(s => s.gender === 'akhwat');

  // Komponen Kecil untuk List Item (Biar kodingan rapi tidak berulang)
  const SantriList = ({ items }: { items: SantriSaldo[] }) => {
      if (items.length === 0) {
          return <div className="p-8 text-center text-gray-400 text-sm italic">Tidak ada data.</div>;
      }
      return (
        <div className="divide-y divide-gray-100">
            {items.map((s) => (
              <div
                key={s.id}
                className="flex justify-between items-center p-3 hover:bg-green-50/50 transition-colors"
              >
                <div className="flex flex-col">
                    <span className="font-bold text-gray-700 text-sm capitalize">{s.nama_lengkap}</span>
                    <span className="text-[10px] text-gray-400">
                        {s.kelas ? `Kelas ${s.kelas}` : "Tanpa Kelas"}
                    </span>
                </div>
                <div className="text-right">
                    <span className={`font-bold text-sm ${ 
                        s.saldo > 0 ? 'text-green-600' : 
                        s.saldo < 0 ? 'text-red-500' : 'text-gray-400' 
                    }`}>
                    Rp {s.saldo.toLocaleString("id-ID")}
                    </span>
                </div>
              </div>
            ))}
        </div>
      );
  };

  return (
    <div className="space-y-4">
        {/* HEADER & SEARCH */}
        <Card className="border-green-100 shadow-sm bg-white">
            <CardHeader className="py-4 px-4 border-b bg-gray-50/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle className="flex items-center gap-2 text-lg text-gray-800">
                        <Users className="w-5 h-5 text-green-600" />
                        {kelasNumber ? `Data Santri Kelas ${kelasNumber}` : "Database Semua Santri"}
                    </CardTitle>
                    
                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Cari nama santri..."
                                className="pl-9 bg-white border-green-200 focus:ring-green-500 h-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-9 w-9"
                            onClick={fetchData} 
                            disabled={loading}
                            title="Refresh Data"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>
            </CardHeader>
        </Card>

        {/* LOADING STATE */}
        {loading ? (
           <Card className="p-8 text-center text-gray-500 animate-pulse bg-white">
               Sedang memuat data santri...
           </Card>
        ) : (
            /* 🔥 GRID LAYOUT: 2 KOLOM (IKHWAN KIRI - AKHWAT KANAN) */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* KOLOM KIRI: IKHWAN */}
                <Card className="border-green-200 shadow-sm bg-white overflow-hidden flex flex-col h-full">
                    <div className="bg-green-100/50 p-3 border-b border-green-100 flex items-center justify-between">
                        <h3 className="font-bold text-green-800 flex items-center gap-2">
                            <User className="w-4 h-4" /> Santri Ikhwan (Putra)
                        </h3>
                        <span className="text-xs bg-white px-2 py-0.5 rounded-full text-green-700 font-bold shadow-sm">
                            {dataIkhwan.length}
                        </span>
                    </div>
                    <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                        <SantriList items={dataIkhwan} />
                    </CardContent>
                </Card>

                {/* KOLOM KANAN: AKHWAT */}
                <Card className="border-pink-200 shadow-sm bg-white overflow-hidden flex flex-col h-full">
                    <div className="bg-pink-50/50 p-3 border-b border-pink-100 flex items-center justify-between">
                        <h3 className="font-bold text-pink-800 flex items-center gap-2">
                            <UserCheck className="w-4 h-4" /> Santri Akhwat (Putri)
                        </h3>
                        <span className="text-xs bg-white px-2 py-0.5 rounded-full text-pink-700 font-bold shadow-sm">
                            {dataAkhwat.length}
                        </span>
                    </div>
                    <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                         <SantriList items={dataAkhwat} />
                    </CardContent>
                </Card>

            </div>
        )}
    </div>
  );
};

export default SantriManagement;
