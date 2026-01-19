import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Search, RefreshCw, User, UserCheck, ChevronRight } from "lucide-react"; 
import { Users, Search, RefreshCw, User, UserCheck } from "lucide-react"; 
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Interface baru untuk menangkap data riwayat dari SQL View baru
interface TransactionHistory {
  amount: number;
  type: 'income' | 'expense';
@@ -19,10 +18,16 @@ interface SantriSaldo {
  kelas: number;
  gender: "ikhwan" | "akhwat";
  saldo: number;
  recent_trx: TransactionHistory[]; // Data baru dari View
  recent_trx: TransactionHistory[];
}

const SantriManagement = ({ kelas }: { kelas: string | null }) => {
// 🔥 Tambahkan Props 'onSelectSantri'
interface SantriManagementProps {
    kelas: string | null;
    onSelectSantri?: (id: string) => void; 
}

const SantriManagement = ({ kelas, onSelectSantri }: SantriManagementProps) => {
  const { toast } = useToast();
  const [data, setData] = useState<SantriSaldo[]>([]);
  const [loading, setLoading] = useState(false);
@@ -33,26 +38,21 @@ const SantriManagement = ({ kelas }: { kelas: string | null }) => {
  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("view_santri_saldo") 
        .select("*");
      let query = supabase.from("view_santri_saldo").select("*");

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
        description: "Pastikan SQL View versi terbaru sudah dijalankan.",
        description: "Cek koneksi internet Anda.",
        variant: "destructive",
      });
    } finally {
@@ -77,48 +77,40 @@ const SantriManagement = ({ kelas }: { kelas: string | null }) => {
  const dataIkhwan = filteredData.filter(s => s.gender === 'ikhwan');
  const dataAkhwat = filteredData.filter(s => s.gender === 'akhwat');

  // 🔥 KOMPONEN DATA PER KELAS + RIWAYAT
  const SantriPerKelas = ({ items }: { items: SantriSaldo[] }) => {
      // Kita loop kelas 7 sampai 12
      const classList = [7, 8, 9, 10, 11, 12];

      return (
        <div className="space-y-6 p-2">
            {classList.map((cls) => {
                // Ambil santri di kelas ini saja
                const studentsInClass = items.filter(s => s.kelas === cls);
                
                // Kalau kelas ini kosong, skip aja biar gak menuhin layar
                if (studentsInClass.length === 0) return null;

                return (
                    <div key={cls} className="mb-4">
                        {/* HEADER KELAS */}
                        <div className="flex items-center gap-2 mb-2 px-2">
                            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-md border border-gray-200">
                                KELAS {cls}
                            </span>
                            <div className="h-px bg-gray-100 flex-1"></div>
                        </div>

                        {/* LIST SANTRI */}
                        <div className="space-y-1">
                            {studentsInClass.map((s) => (
                                <div
                                    key={s.id}
                                    className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-transparent hover:border-gray-100 hover:bg-white hover:shadow-sm transition-all bg-gray-50/30"
                                    // 🔥 UBAH DIV JADI CLICKABLE (POINTER)
                                    onClick={() => onSelectSantri && onSelectSantri(s.id)}
                                    className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-transparent hover:border-green-300 hover:bg-green-50/50 hover:shadow-sm transition-all bg-gray-50/30 cursor-pointer"
                                >
                                    {/* NAMA */}
                                    <div className="mb-2 sm:mb-0">
                                        <span className="font-bold text-gray-700 text-sm capitalize block">
                                        {/* Tambahkan efek underline saat hover biar tau bisa diklik */}
                                        <span className="font-bold text-gray-700 text-sm capitalize block group-hover:text-green-700 group-hover:underline decoration-green-500 decoration-2 underline-offset-2">
                                            {s.nama_lengkap}
                                        </span>
                                    </div>

                                    {/* KANAN: RIWAYAT + SALDO */}
                                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                                        
                                        {/* 🔥 3 RIWAYAT TERAKHIR (ESTETIK) */}
                                        <div className="flex gap-1 overflow-hidden opacity-80 group-hover:opacity-100 transition-opacity">
                                            {s.recent_trx && s.recent_trx.map((trx, idx) => (
                                                <div 
@@ -130,15 +122,12 @@ const SantriManagement = ({ kelas }: { kelas: string | null }) => {
                                                            : 'bg-red-50 text-red-600 border-red-100'
                                                        }
                                                    `}
                                                    title={`${trx.type === 'income' ? 'Masuk' : 'Keluar'} tgl ${trx.date}`}
                                                >
                                                    {trx.type === 'income' ? '+' : '-'}
                                                    {(trx.amount / 1000).toFixed(0)}k
                                                </div>
                                            ))}
                                        </div>

                                        {/* SALDO UTAMA */}
                                        <div className="text-right min-w-[80px]">
                                            <span className={`font-bold text-sm ${ 
                                                s.saldo > 0 ? 'text-green-600' : 
@@ -154,19 +143,12 @@ const SantriManagement = ({ kelas }: { kelas: string | null }) => {
                    </div>
                );
            })}
            
            {items.length === 0 && (
                 <div className="text-center py-8 text-gray-400 text-xs italic">
                     Tidak ada data santri yang ditemukan.
                 </div>
            )}
        </div>
      );
  };

  return (
    <div className="space-y-4">
        {/* HEADER & SEARCH */}
        <Card className="border-green-100 shadow-sm bg-white">
            <CardHeader className="py-4 px-4 border-b bg-gray-50/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
@@ -185,60 +167,32 @@ const SantriManagement = ({ kelas }: { kelas: string | null }) => {
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
                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={fetchData} disabled={loading}>
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
           <Card className="p-8 text-center text-gray-500 animate-pulse bg-white">Sedang memuat data santri...</Card>
        ) : (
            /* 🔥 GRID LAYOUT: 2 KOLOM */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* KOLOM KIRI: IKHWAN */}
                <Card className="border-green-200 shadow-sm bg-white flex flex-col h-full border-t-4 border-t-green-600">
                    <div className="bg-green-50 p-3 border-b border-green-100 flex items-center justify-between sticky top-0 z-10">
                        <h3 className="font-bold text-green-800 flex items-center gap-2">
                            <User className="w-4 h-4" /> Santri Ikhwan
                        </h3>
                        <span className="text-xs bg-white px-2 py-0.5 rounded-full text-green-700 font-bold border border-green-200">
                            {dataIkhwan.length} Santri
                        </span>
                        <h3 className="font-bold text-green-800 flex items-center gap-2"><User className="w-4 h-4" /> Santri Ikhwan</h3>
                        <span className="text-xs bg-white px-2 py-0.5 rounded-full text-green-700 font-bold border border-green-200">{dataIkhwan.length} Santri</span>
                    </div>
                    <CardContent className="p-0 max-h-[600px] overflow-y-auto custom-scrollbar">
                        <SantriPerKelas items={dataIkhwan} />
                    </CardContent>
                    <CardContent className="p-0 max-h-[600px] overflow-y-auto custom-scrollbar"><SantriPerKelas items={dataIkhwan} /></CardContent>
                </Card>

                {/* KOLOM KANAN: AKHWAT */}
                <Card className="border-pink-200 shadow-sm bg-white flex flex-col h-full border-t-4 border-t-pink-500">
                    <div className="bg-pink-50 p-3 border-b border-pink-100 flex items-center justify-between sticky top-0 z-10">
                        <h3 className="font-bold text-pink-800 flex items-center gap-2">
                            <UserCheck className="w-4 h-4" /> Santri Akhwat
                        </h3>
                        <span className="text-xs bg-white px-2 py-0.5 rounded-full text-pink-700 font-bold border border-pink-200">
                            {dataAkhwat.length} Santri
                        </span>
                        <h3 className="font-bold text-pink-800 flex items-center gap-2"><UserCheck className="w-4 h-4" /> Santri Akhwat</h3>
                        <span className="text-xs bg-white px-2 py-0.5 rounded-full text-pink-700 font-bold border border-pink-200">{dataAkhwat.length} Santri</span>
                    </div>
                    <CardContent className="p-0 max-h-[600px] overflow-y-auto custom-scrollbar">
                         <SantriPerKelas items={dataAkhwat} />
                    </CardContent>
                    <CardContent className="p-0 max-h-[600px] overflow-y-auto custom-scrollbar"><SantriPerKelas items={dataAkhwat} /></CardContent>
                </Card>

            </div>
        )}
    </div>
