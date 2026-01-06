import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SantriSaldo {
  id: string;
  nama_lengkap: string;
  gender: string;
  saldo: number;
}

const SaldoKelas = () => {
  const { kelas } = useParams();
  const [data, setData] = useState<SantriSaldo[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.rpc(
        "get_saldo_santri_by_kelas",
        { p_kelas: Number(kelas) }
      );

      if (!error) setData(data || []);
    };

    fetchData();
  }, [kelas]);

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            Detail Saldo Santri Kelas {kelas}
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {data.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-4">
              <div className="font-semibold">{s.nama_lengkap}</div>
              <div className="text-sm capitalize">{s.gender}</div>
              <div className="mt-2 font-bold text-green-600">
                Rp {s.saldo.toLocaleString("id-ID")}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SaldoKelas;
