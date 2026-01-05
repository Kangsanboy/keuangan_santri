import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Wallet } from "lucide-react";

interface Props {
  kelas: number;
}

interface SaldoItem {
  id: string;
  nama_lengkap: string;
  saldo: number;
}

const SaldoSantri = ({ kelas }: Props) => {
  const [data, setData] = useState<SaldoItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSaldo = async () => {
    setLoading(true);

    const { data, error } = await supabase.rpc("get_saldo_santri_by_kelas", {
      kelas_input: kelas,
    });

    if (!error) {
      setData(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchSaldo();
  }, [kelas]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Saldo Santri Kelas {kelas}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-2">
        {loading && <div className="text-sm text-muted-foreground">Memuat...</div>}

        {!loading && data.length === 0 && (
          <div className="text-sm text-muted-foreground">
            Belum ada transaksi
          </div>
        )}

        {data.map((s) => (
          <div
            key={s.id}
            className="flex justify-between items-center text-sm"
          >
            <span>{s.nama_lengkap}</span>
            <span className="font-semibold">
              Rp {s.saldo.toLocaleString("id-ID")}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default SaldoSantri;