import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SantriSaldo {
  santri_id?: string; // Tanda tanya biar aman kalau beda nama kolom
  id?: string;
  nama_lengkap: string;
  kelas?: number;
  saldo: number; // Pastikan view/tabel punya kolom saldo/balance
}

const SantriManagement = ({ kelas }: { kelas: string | null }) => {
  const { toast } = useToast();
  const [data, setData] = useState<SantriSaldo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const kelasNumber = kelas ? Number(kelas) : null;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 🔥 LOGIKA BARU:
        // Kita ambil dari view/tabel summary saldo yang ada di gambar database abang
        // Nama tabel disesuaikan dengan screenshot: 'santri_balance_summary_2025_12_01_21_34'
        // Kalau error nama tabel, ganti dengan nama tabel/view yang benar di Supabase abang.
        
        let query = supabase
          .from("santri_balance_summary_2025_12_01_21_34") 
          .select("*");

        // Kalau ada filter kelas, pasang filter. Kalau null, ambil semua.
        if (kelasNumber) {
          query = query.eq("kelas", kelasNumber);
        }

        const { data: result, error } = await query.order("nama_lengkap", { ascending: true });

        if (error) {
            // Fallback: Kalau tabel summary belum ada, coba ambil dari tabel santri biasa
            console.warn("Mencoba fetch fallback...", error.message);
            const { data: santriBiasa, error: err2 } = await supabase
                .from("santri_2025_12_01_21_34")
                .select("id, nama_lengkap, kelas")
                .eq("status", "aktif");
            
            if (kelasNumber && santriBiasa) {
                 const filtered = santriBiasa.filter(s => s.kelas === kelasNumber);
                 // @ts-ignore
                 setData(filtered.map(s => ({ ...s, saldo: 0 }))); // Saldo 0 dulu kalau darurat
            } else {
                 // @ts-ignore
                 setData(santriBiasa || []);
            }
        } else {
            // @ts-ignore
            setData(result || []);
        }

      } catch (err) {
        console.error(err);
        toast({
          title: "Gagal memuat data",
          description: "Periksa koneksi internet Anda.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [kelasNumber]);

  // Fitur Search Client-side
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
            
            {/* Input Pencarian */}
            <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Cari nama santri..."
                    className="pl-9 bg-white border-green-200 focus:ring-green-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
           <div className="p-8 text-center text-gray-500 animate-pulse">Sedang memuat data santri...</div>
        ) : filteredData.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Belum ada data santri.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredData.map((s, idx) => (
              <div
                key={s.id || s.santri_id || idx}
                className="flex justify-between items-center p-4 hover:bg-green-50/30 transition-colors"
              >
                <div className="flex flex-col">
                    <span className="font-bold text-gray-700">{s.nama_lengkap}</span>
                    <span className="text-xs text-gray-400">
                        {s.kelas ? `Kelas ${s.kelas}` : "Tanpa Kelas"}
                    </span>
                </div>
                <div className="text-right">
                    <span className={`font-bold ${ (s.saldo || 0) >= 0 ? 'text-green-600' : 'text-red-500' }`}>
                    Rp {(s.saldo || 0).toLocaleString("id-ID")}
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
