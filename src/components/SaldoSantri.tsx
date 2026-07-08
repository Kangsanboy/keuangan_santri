import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Wallet } from "lucide-react";

interface Props {
  kelas?: number;
}

interface SaldoItem {
  id: string;
  nama_lengkap: string;
  saldo: number;
  gender?: string;
}

const SaldoSantri = ({ kelas: initialKelas }: Props) => {
  const [data, setData] = useState<SaldoItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 1. STATE UNTUK USER LOGIN
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeKelas, setActiveKelas] = useState<number | null>(initialKelas || null);

  // 2. FETCH DATA USER (CEK PENGASUH)
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: user } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setCurrentUser(user);

        // Jika pengasuh, paksa kelasnya sesuai dengan kelas asuhan
        if (user?.role === 'pengasuh') {
          setActiveKelas(parseInt(user.kelas_asuh));
        }
      }
    };
    getUser();
  }, []);

  // 3. FETCH SALDO DENGAN FILTER GENDER & KELAS
  const fetchSaldo = async () => {
    if (!activeKelas) return;
    setLoading(true);

    try {
      // Ambil data dasar santri dulu untuk mengecek gender dan nama
      let query = supabase.from('santri_2025_12_01_21_34')
        .select('id, nama_lengkap, gender')
        .eq('kelas', activeKelas)
        .order('nama_lengkap', { ascending: true });

      // Filter jika yang login pengasuh
      if (currentUser?.role === 'pengasuh') {
        query = query.eq('gender', currentUser.gender_asuh);
      }

      const { data: santriData, error: santriError } = await query;
      if (santriError) throw santriError;

      // Ambil data saldo dari view
      const { data: saldoData, error: saldoError } = await supabase
        .from('view_santri_saldo')
        .select('id, saldo')
        .eq('kelas', activeKelas);

      if (saldoError) throw saldoError;

      // Gabungkan data santri dengan saldonya
      const mergedData = santriData?.map((santri) => {
        const matchSaldo = saldoData?.find((s) => s.id === santri.id);
        return {
          ...santri,
          saldo: matchSaldo?.saldo || 0,
        };
      });

      setData(mergedData || []);
    } catch (error) {
      console.error("Error fetching saldo:", error);
    } finally {
      setLoading(false);
    }
  };

  // Jalankan fetch setiap kali user atau kelas aktif berubah
  useEffect(() => {
    if (currentUser !== null) { 
        fetchSaldo();
    }
  }, [activeKelas, currentUser]);

  // Sembunyikan form jika kelas belum ada
  if (!activeKelas && currentUser?.role !== 'pengasuh') return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-green-600" />
          Saldo Santri Kelas {activeKelas}
          {currentUser?.role === 'pengasuh' && (
             <span className="text-sm font-normal text-gray-500 uppercase">
                ({currentUser.gender_asuh})
             </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-2">
        {loading && <div className="text-sm text-muted-foreground">Memuat data...</div>}

        {!loading && data.length === 0 && (
          <div className="text-sm text-muted-foreground p-4 text-center border border-dashed rounded-lg">
            Belum ada data santri atau transaksi.
          </div>
        )}

        {!loading && data.map((s) => (
          <div
            key={s.id}
            className="flex justify-between items-center text-sm border-b border-gray-100 pb-2 last:border-0 hover:bg-gray-50 p-1 rounded transition-colors"
          >
            <span className="font-medium text-gray-700">{s.nama_lengkap}</span>
            <span className="font-bold text-green-600">
              Rp {s.saldo.toLocaleString("id-ID")}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default SaldoSantri;
