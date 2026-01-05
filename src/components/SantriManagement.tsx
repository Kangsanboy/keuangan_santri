import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users } from "lucide-react";

interface SantriSaldo {
  santri_id: string;
  nama_lengkap: string;
  saldo: number;
}

const SantriManagement = ({ kelas }: { kelas: string | null }) => {
  const { toast } = useToast();
  const [data, setData] = useState<SantriSaldo[]>([]);
  const [loading, setLoading] = useState(false);

  const kelasNumber = kelas ? Number(kelas) : null;

  useEffect(() => {
    if (!kelasNumber) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc(
          "get_saldo_santri_by_kelas",
          { p_kelas: kelasNumber }
        );

        if (error) throw error;

        console.log("DATA RPC:", data); // 🔥 DEBUG PENTING

        setData(data || []);
      } catch (err) {
        toast({
          title: "Error",
          description: "Gagal memuat saldo santri",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [kelasNumber]);

  if (!kelasNumber) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Pilih kelas dari menu ☰
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          Memuat data...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Saldo Santri Kelas {kelasNumber}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {data.length === 0 && (
          <div className="text-sm text-muted-foreground">
            Tidak ada data
          </div>
        )}

        {data.map((s) => (
          <div
            key={s.santri_id}
            className="flex justify-between items-center border-b pb-2"
          >
            <span className="font-medium">{s.nama_lengkap}</span>
            <span className="text-green-600 font-semibold">
              Rp {s.saldo.toLocaleString("id-ID")}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default SantriManagement;