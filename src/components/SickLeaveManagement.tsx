import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Activity, Home, Plus, Save, Search, User, CalendarDays, 
  CheckCircle2, Clock, AlertCircle, History 
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
  
  // Data State
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [activeLogs, setActiveLogs] = useState<HealthLog[]>([]);
  
  // Form State
  const [filterKelas, setFilterKelas] = useState("");
  const [selectedSantri, setSelectedSantri] = useState("");
  const [statusInput, setStatusInput] = useState<"Sakit" | "Pulang">("Sakit");
  const [keterangan, setKeterangan] = useState("");

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Ambil Master Santri (Aktif)
      const { data: sData } = await supabase
        .from('santri_2025_12_01_21_34')
        .select('id, nama_lengkap, kelas, rombel:rombels(nama)')
        .eq('status', 'aktif')
        .order('nama_lengkap');
      
      if (sData) setSantriList(sData as any);

      // 2. Ambil Log yang SEDANG SAKIT / PULANG (Belum Sembuh)
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
        .neq('status', 'Sembuh') // Hanya ambil yang aktif
        .order('start_date', { ascending: false });

      if (error) throw error;
      if (lData) setActiveLogs(lData as any);

    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // SETUP REALTIME (Supaya update otomatis)
    const channel = supabase
      .channel('health-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_health_logs' },
        () => {
          fetchData(); // Refresh data jika ada perubahan di tabel
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  /* ================= ACTIONS ================= */
  
  // 1. Simpan Data Baru
  const handleSave = async () => {
    if (!selectedSantri) {
      toast({ title: "Pilih Santri", description: "Mohon pilih nama santri terlebih dahulu.", variant: "destructive" });
      return;
    }

    // Cek apakah santri ini sedang sakit (biar gak double input)
    const isAlreadySick = activeLogs.some(log => log.santri_id === selectedSantri);
    if (isAlreadySick) {
        toast({ title: "Gagal", description: "Santri ini tercatat sedang sakit/pulang. Selesaikan dulu status sebelumnya.", variant: "destructive" });
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
      // Reset Form
      setSelectedSantri("");
      setKeterangan("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // 2. Tandai Sembuh / Kembali
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

  /* ================= STATS ================= */
  const totalSakit = activeLogs.filter(l => l.status === 'Sakit').length;
  const totalPulang = activeLogs.filter(l => l.status === 'Pulang').length;

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-300 pb-20">
      
      {/* HEADER & DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 flex flex-col justify-center">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Activity className="text-red-500" /> Catatan Kesehatan
            </h1>
            <p className="text-sm text-gray-500">Monitoring kondisi santri real-time.</p>
        </div>
        
        {/* CARD SAKIT */}
        <Card className="bg-red-50 border-red-200 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-red-600 uppercase">Sedang Sakit</p>
                    <h2 className="text-3xl font-black text-red-700">{totalSakit}</h2>
                </div>
                <div className="p-3 bg-red-200 rounded-full text-red-700"><AlertCircle size={24}/></div>
            </CardContent>
        </Card>

        {/* CARD PULANG */}
        <Card className="bg-blue-50 border-blue-200 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-blue-600 uppercase">Izin Pulang</p>
                    <h2 className="text-3xl font-black text-blue-700">{totalPulang}</h2>
                </div>
                <div className="p-3 bg-blue-200 rounded-full text-blue-700"><Home size={24}/></div>
            </CardContent>
        </Card>
      </div>

      {/* FORM INPUT CEPAT */}
      <Card className="border-l-4 border-l-red-500 shadow-md">
        <CardHeader className="pb-3 border-b bg-gray-50/50">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-gray-700">
                <Plus className="w-4 h-4"/> Input Data Baru
            </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            
            {/* 1. Filter Kelas */}
            <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Filter Kelas</label>
                <Select value={filterKelas} onValueChange={(v) => { setFilterKelas(v); setSelectedSantri(""); }}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Pilih..." /></SelectTrigger>
                    <SelectContent>
                        {CLASSES.map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {/* 2. Pilih Nama Santri */}
            <div className="md:col-span-3 space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Nama Santri</label>
                <Select value={selectedSantri} onValueChange={setSelectedSantri} disabled={!filterKelas}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Cari Nama..." /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        {santriList
                            .filter(s => String(s.kelas) === filterKelas)
                            .map(s => (
                                <SelectItem key={s.id} value={s.id}>
                                    {s.nama_lengkap} {s.rombel ? `(${s.rombel.nama})` : ''}
                                </SelectItem>
                            ))
                        }
                    </SelectContent>
                </Select>
            </div>

            {/* 3. Status */}
            <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
                <Select value={statusInput} onValueChange={(v: any) => setStatusInput(v)}>
                    <SelectTrigger className={`font-bold ${statusInput === 'Sakit' ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50'}`}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Sakit">😷 Sakit (Asrama)</SelectItem>
                        <SelectItem value="Pulang">🏠 Izin Pulang</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* 4. Keterangan */}
            <div className="md:col-span-3 space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Keterangan (Opsional)</label>
                <Input 
                    placeholder={statusInput === 'Sakit' ? "Cth: Demam, Pusing..." : "Cth: Acara Keluarga..."} 
                    value={keterangan} 
                    onChange={e => setKeterangan(e.target.value)} 
                    className="bg-white"
                />
            </div>

            {/* 5. Tombol Simpan */}
            <div className="md:col-span-2">
                <Button onClick={handleSave} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold">
                    <Save className="w-4 h-4 mr-2"/> Simpan
                </Button>
            </div>

        </CardContent>
      </Card>

      {/* TABEL MONITORING REALTIME */}
      <Card className="shadow-sm">
        <CardHeader className="bg-gray-50 border-b py-3">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-orange-500"/> Sedang Sakit / Pulang Saat Ini</span>
                <Badge variant="outline" className="bg-white">{activeLogs.length} Santri</Badge>
            </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3">Nama Santri</th>
                            <th className="px-4 py-3 text-center">Kelas</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Mulai Tanggal</th>
                            <th className="px-4 py-3">Keterangan</th>
                            <th className="px-4 py-3 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {activeLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-800">
                                    {log.santri?.nama_lengkap}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <Badge variant="secondary" className="text-[10px]">
                                        {log.santri?.kelas} {log.santri?.rombel?.nama}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3">
                                    <Badge className={`${log.status === 'Sakit' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
                                        {log.status === 'Sakit' ? '😷 Sakit' : '🏠 Pulang'}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3 text-gray-600 flex items-center gap-2">
                                    <CalendarDays className="w-3 h-3 text-gray-400"/>
                                    {new Date(log.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-4 py-3 text-gray-500 italic text-xs">
                                    {log.keterangan || "-"}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => handleRecover(log.id, log.santri?.nama_lengkap || "")}
                                        className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 h-8 text-xs font-bold"
                                    >
                                        <CheckCircle2 className="w-3 h-3 mr-1"/> {log.status === 'Sakit' ? 'Sembuh' : 'Kembali'}
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        {activeLogs.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-gray-400">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <CheckCircle2 className="w-8 h-8 text-green-200"/>
                                        <span>Alhamdulillah, tidak ada santri yang sakit.</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default SickLeaveManagement;
