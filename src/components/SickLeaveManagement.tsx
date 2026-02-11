import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Activity, Home, Plus, Save, Search, User, CalendarDays, 
  CheckCircle2, Clock, AlertCircle, History, FileSpreadsheet
} from "lucide-react";

/* ================= TYPES ================= */
interface Santri { 
  id: string; 
  nama_lengkap: string; 
  kelas: number; 
  rombel?: { nama: string }; 
}

interface HealthLog {
  id: number;
  santri_id: string;
  status: 'Sakit' | 'Pulang' | 'Sembuh';
  start_date: string;
  end_date?: string;
  keterangan?: string;
  santri?: { 
    nama_lengkap: string; 
    kelas: number;
    rombel?: { nama: string };
  };
}

const CLASSES = [7, 8, 9, 10, 11, 12];

const SickLeaveManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("active"); // 'active' or 'history'
  
  // Data State
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [allLogs, setAllLogs] = useState<HealthLog[]>([]);
  
  // Form State
  const [filterKelas, setFilterKelas] = useState("");
  const [selectedSantri, setSelectedSantri] = useState("");
  const [statusInput, setStatusInput] = useState<"Sakit" | "Pulang">("Sakit");
  const [keterangan, setKeterangan] = useState("");

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Ambil Master Santri
      const { data: sData } = await supabase
        .from('santri_2025_12_01_21_34')
        .select('id, nama_lengkap, kelas, rombel:rombels(nama)')
        .eq('status', 'aktif')
        .order('nama_lengkap');
      
      if (sData) setSantriList(sData as any);

      // 2. Ambil SEMUA Log (Sakit, Pulang, Sembuh)
      const { data: lData, error } = await supabase
        .from('student_health_logs')
        .select(`
          *,
          santri:santri_2025_12_01_21_34 (
            nama_lengkap, 
            kelas,
            rombel:rombels(nama)
          )
        `)
        .order('start_date', { ascending: false }); // Urutkan dari yang terbaru

      if (error) {
          console.error("Error fetching logs:", error);
          throw error;
      }
      
      if (lData) setAllLogs(lData as any);

    } catch (err: any) {
      // Jangan spam toast error kalau cuma masalah koneksi sebentar
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // SETUP REALTIME
    const channel = supabase
      .channel('health-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_health_logs' },
        () => {
          fetchData(); 
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  /* ================= ACTIONS ================= */
  
  const handleSave = async () => {
    if (!selectedSantri) {
      toast({ title: "Pilih Santri", description: "Mohon pilih nama santri terlebih dahulu.", variant: "destructive" });
      return;
    }

    // Cek apakah santri ini sedang sakit (Status bukan Sembuh)
    const isAlreadySick = allLogs.some(log => log.santri_id === selectedSantri && log.status !== 'Sembuh');
    if (isAlreadySick) {
        toast({ title: "Gagal", description: "Santri ini tercatat sedang sakit/pulang. Selesaikan status sebelumnya dulu.", variant: "destructive" });
        return;
    }

    try {
      const { error } = await supabase.from('student_health_logs').insert([{
        santri_id: selectedSantri,
        status: statusInput,
        start_date: new Date().toISOString(),
        keterangan: keterangan || (statusInput === 'Sakit' ? 'Sakit Ringan/Demam' : 'Izin Pulang')
      }]);

      if (error) throw error;

      toast({ title: "Berhasil", description: `Data ${statusInput} berhasil dicatat.` });
      setSelectedSantri("");
      setKeterangan("");
      setActiveTab("active"); // Pindah ke tab aktif biar kelihatan
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleRecover = async (id: number, nama: string) => {
    try {
      const { error } = await supabase
        .from('student_health_logs')
        .update({ 
          status: 'Sembuh', 
          end_date: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Alhamdulillah", description: `${nama} telah ditandai sembuh/kembali.`, className: "bg-green-600 text-white" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
      if(!confirm("Hapus data riwayat ini?")) return;
      try {
          const { error } = await supabase.from('student_health_logs').delete().eq('id', id);
          if (error) throw error;
          toast({ title: "Terhapus", description: "Data berhasil dihapus." });
      } catch (err: any) {
          toast({ title: "Gagal", description: err.message, variant: "destructive" });
      }
  }

  /* ================= FILTERS ================= */
  // Filter Active: Status BUKAN 'Sembuh'
  const activeLogs = allLogs.filter(l => l.status !== 'Sembuh');
  // Filter History: Status 'Sembuh'
  const historyLogs = allLogs.filter(l => l.status === 'Sembuh');

  const totalSakit = activeLogs.filter(l => l.status === 'Sakit').length;
  const totalPulang = activeLogs.filter(l => l.status === 'Pulang').length;

  // Komponen Tabel (Reusable)
  const LogTable = ({ data, isHistory }: { data: HealthLog[], isHistory: boolean }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                <tr>
                    <th className="px-4 py-3">Nama Santri</th>
                    <th className="px-4 py-3 text-center">Kelas</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Mulai</th>
                    {isHistory && <th className="px-4 py-3">Selesai</th>}
                    <th className="px-4 py-3">Keterangan</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {data.length === 0 ? (
                    <tr><td colSpan={isHistory ? 7 : 6} className="text-center py-8 text-gray-400 italic">Tidak ada data.</td></tr>
                ) : (
                    data.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-800">{log.santri?.nama_lengkap || "Nama Tidak Ditemukan"}</td>
                            <td className="px-4 py-3 text-center"><Badge variant="secondary" className="text-[10px]">{log.santri?.kelas} {log.santri?.rombel?.nama}</Badge></td>
                            <td className="px-4 py-3">
                                <Badge className={`${log.status === 'Sakit' ? 'bg-red-100 text-red-700' : (log.status === 'Pulang' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700')}`}>
                                    {log.status}
                                </Badge>
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-xs">
                                {new Date(log.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            {isHistory && (
                                <td className="px-4 py-3 text-gray-600 text-xs">
                                    {log.end_date ? new Date(log.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : "-"}
                                </td>
                            )}
                            <td className="px-4 py-3 text-gray-500 italic text-xs truncate max-w-[150px]">{log.keterangan || "-"}</td>
                            <td className="px-4 py-3 text-center">
                                {!isHistory ? (
                                    <Button size="sm" variant="outline" onClick={() => handleRecover(log.id, log.santri?.nama_lengkap || "")} className="text-green-600 border-green-200 hover:bg-green-50 h-7 text-xs font-bold">
                                        <CheckCircle2 className="w-3 h-3 mr-1"/> Selesai
                                    </Button>
                                ) : (
                                    <Button size="sm" variant="ghost" onClick={() => handleDelete(log.id)} className="text-red-400 hover:text-red-600 h-7 text-xs">Hapus</Button>
                                )}
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-300 pb-20">
      
      {/* HEADER STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 flex flex-col justify-center">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Activity className="text-red-500" /> Catatan Kesehatan</h1>
            <p className="text-sm text-gray-500">Monitoring kondisi santri.</p>
        </div>
        <Card className="bg-red-50 border-red-200 shadow-sm"><CardContent className="p-4 flex items-center justify-between"><div><p className="text-xs font-bold text-red-600 uppercase">Sedang Sakit</p><h2 className="text-3xl font-black text-red-700">{totalSakit}</h2></div><div className="p-3 bg-red-200 rounded-full text-red-700"><AlertCircle size={24}/></div></CardContent></Card>
        <Card className="bg-blue-50 border-blue-200 shadow-sm"><CardContent className="p-4 flex items-center justify-between"><div><p className="text-xs font-bold text-blue-600 uppercase">Izin Pulang</p><h2 className="text-3xl font-black text-blue-700">{totalPulang}</h2></div><div className="p-3 bg-blue-200 rounded-full text-blue-700"><Home size={24}/></div></CardContent></Card>
      </div>

      {/* FORM INPUT */}
      <Card className="border-l-4 border-l-red-500 shadow-md">
        <CardHeader className="pb-3 border-b bg-gray-50/50"><CardTitle className="text-base font-bold flex items-center gap-2 text-gray-700"><Plus className="w-4 h-4"/> Input Data Baru</CardTitle></CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-2 space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Kelas</label><Select value={filterKelas} onValueChange={(v) => { setFilterKelas(v); setSelectedSantri(""); }}><SelectTrigger className="bg-white"><SelectValue placeholder="-" /></SelectTrigger><SelectContent>{CLASSES.map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}</SelectContent></Select></div>
            <div className="md:col-span-3 space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Nama Santri</label><Select value={selectedSantri} onValueChange={setSelectedSantri} disabled={!filterKelas}><SelectTrigger className="bg-white"><SelectValue placeholder="Cari Nama..." /></SelectTrigger><SelectContent className="max-h-[300px]">{santriList.filter(s => String(s.kelas) === filterKelas).map(s => (<SelectItem key={s.id} value={s.id}>{s.nama_lengkap} {s.rombel ? `(${s.rombel.nama})` : ''}</SelectItem>))}</SelectContent></Select></div>
            <div className="md:col-span-2 space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Status</label><Select value={statusInput} onValueChange={(v: any) => setStatusInput(v)}><SelectTrigger className={`font-bold ${statusInput === 'Sakit' ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50'}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Sakit">😷 Sakit</SelectItem><SelectItem value="Pulang">🏠 Pulang</SelectItem></SelectContent></Select></div>
            <div className="md:col-span-3 space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Keterangan</label><Input placeholder="Cth: Demam..." value={keterangan} onChange={e => setKeterangan(e.target.value)} className="bg-white"/></div>
            <div className="md:col-span-2"><Button onClick={handleSave} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold"><Save className="w-4 h-4 mr-2"/> Simpan</Button></div>
        </CardContent>
      </Card>

      {/* TABEL DATA (TABS) */}
      <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full md:w-[400px] grid-cols-2">
              <TabsTrigger value="active" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">Sedang Sakit ({activeLogs.length})</TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">Riwayat Sembuh</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active">
              <Card><CardContent className="p-0"><LogTable data={activeLogs} isHistory={false} /></CardContent></Card>
          </TabsContent>
          
          <TabsContent value="history">
              <Card><CardContent className="p-0"><LogTable data={historyLogs} isHistory={true} /></CardContent></Card>
          </TabsContent>
      </Tabs>

    </div>
  );
};

export default SickLeaveManagement;
