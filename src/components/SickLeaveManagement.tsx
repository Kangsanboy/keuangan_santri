import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import { 
  Activity, Home, Plus, Save, User, CalendarDays, 
  CheckCircle2, Clock, AlertCircle, FileSpreadsheet, Download, Trash2
} from "lucide-react";

/* ================= TYPES ================= */
interface Santri { 
  id: string; 
  nama_lengkap: string; 
  kelas: number; 
  gender: string;
  rombel?: { nama: string }; 
}

interface HealthLog {
  id: number;
  santri_id: string;
  status: 'Sakit' | 'Pulang' | 'Sembuh'; // 🔥 KEMBALI JADI 'Pulang' BIAR DATABASE AMAN
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
const monthsList = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const yearsList = [2024, 2025, 2026, 2027, 2028];

const SickLeaveManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("active"); 
  
  // Data State
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [allLogs, setAllLogs] = useState<HealthLog[]>([]);
  
  // Form State
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterKelas, setFilterKelas] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [selectedSantri, setSelectedSantri] = useState("");
  const [keterangan, setKeterangan] = useState("");

  // Export State
  const [exportMonth, setExportMonth] = useState(new Date().getMonth());
  const [exportYear, setExportYear] = useState(new Date().getFullYear());

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: sData } = await supabase
        .from('santri_2025_12_01_21_34')
        .select('id, nama_lengkap, kelas, gender, rombel:rombels(nama)')
        .eq('status', 'aktif')
        .order('nama_lengkap');
      
      if (sData) setSantriList(sData as any);

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
        .order('start_date', { ascending: false }); 

      if (error) throw error;
      if (lData) setAllLogs(lData as any);

    } catch (err: any) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('health-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_health_logs' }, () => { fetchData(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  /* ================= ACTIONS ================= */
  const handleSave = async () => {
    if (!selectedSantri) {
      return toast({ title: "Pilih Santri", description: "Mohon pilih nama santri terlebih dahulu.", variant: "destructive" });
    }

    const isAlreadySick = allLogs.some(log => log.santri_id === selectedSantri && log.status !== 'Sembuh');
    if (isAlreadySick) {
        return toast({ title: "Gagal", description: "Santri ini tercatat sedang sakit/pulang. Selesaikan status sebelumnya dulu.", variant: "destructive" });
    }

    try {
      const selectedDateTime = new Date(formDate);
      const now = new Date();
      selectedDateTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

      const { error } = await supabase.from('student_health_logs').insert([{
        santri_id: selectedSantri,
        status: 'Sakit', 
        start_date: selectedDateTime.toISOString(),
        keterangan: keterangan || 'Sakit (Tanpa Keterangan)'
      }]);

      if (error) throw error;

      toast({ title: "Berhasil", description: `Data sakit berhasil dicatat.` });
      setSelectedSantri(""); setKeterangan("");
      setActiveTab("active"); 
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handlePulang = async (id: number, nama: string) => {
    if(!confirm(`Tandai ${nama} dipulangkan?`)) return;
    try {
      const { error } = await supabase
        .from('student_health_logs')
        .update({ status: 'Pulang' }) // 🔥 SIMPAN KE DATABASE SEBAGAI 'Pulang'
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Diperbarui", description: `${nama} telah ditandai Sakit Pulang.`, className: "bg-blue-600 text-white" });
      fetchData(); // Refresh data
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleRecover = async (id: number, nama: string) => {
    try {
      const { error } = await supabase
        .from('student_health_logs')
        .update({ status: 'Sembuh', end_date: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Alhamdulillah", description: `${nama} telah sembuh.`, className: "bg-green-600 text-white" });
      fetchData(); // Refresh data
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
          fetchData(); // Refresh data
      } catch (err: any) {
          toast({ title: "Gagal", description: err.message, variant: "destructive" });
      }
  }

  /* ================= EXPORT EXCEL ================= */
  const exportActiveData = () => {
      const dataToExport = activeLogs.map((l, i) => ({
          "No": i + 1,
          "Nama Santri": l.santri?.nama_lengkap || "-",
          "Kelas": `${l.santri?.kelas} ${l.santri?.rombel?.nama || ''}`,
          "Status": l.status === 'Pulang' ? 'Sakit Pulang' : l.status, // 🔥 Di Excel ubah jadi Sakit Pulang
          "Tanggal Mulai": new Date(l.start_date).toLocaleDateString('id-ID'),
          "Keterangan": l.keterangan || "-"
      }));

      if(dataToExport.length === 0) return toast({title: "Kosong", description: "Tidak ada data santri sakit saat ini.", variant: "destructive"});

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sedang Sakit");
      XLSX.writeFile(wb, `Data_Santri_Sakit_${new Date().toLocaleDateString('id-ID')}.xlsx`);
  };

  const exportHistoryData = () => {
      const filteredHistory = historyLogs.filter(l => {
          const d = new Date(l.end_date || l.start_date);
          return d.getMonth() === exportMonth && d.getFullYear() === exportYear;
      });

      if(filteredHistory.length === 0) return toast({title: "Kosong", description: "Tidak ada riwayat sembuh pada bulan tersebut.", variant: "destructive"});

      const dataToExport = filteredHistory.map((l, i) => ({
          "No": i + 1,
          "Nama Santri": l.santri?.nama_lengkap || "-",
          "Kelas": `${l.santri?.kelas} ${l.santri?.rombel?.nama || ''}`,
          "Tanggal Mulai Sakit": new Date(l.start_date).toLocaleDateString('id-ID'),
          "Tanggal Sembuh": l.end_date ? new Date(l.end_date).toLocaleDateString('id-ID') : "-",
          "Keterangan": l.keterangan || "-"
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Riwayat Sembuh");
      XLSX.writeFile(wb, `Riwayat_Sembuh_${monthsList[exportMonth]}_${exportYear}.xlsx`);
  };

  /* ================= FILTERS ================= */
  const activeLogs = allLogs.filter(l => l.status !== 'Sembuh');
  const historyLogs = allLogs.filter(l => l.status === 'Sembuh');

  const totalSakit = activeLogs.filter(l => l.status === 'Sakit').length;
  const totalPulang = activeLogs.filter(l => l.status === 'Pulang').length; // 🔥 Hitung dari 'Pulang'

  const LogTable = ({ data, isHistory }: { data: HealthLog[], isHistory: boolean }) => (
    <div className="overflow-x-auto pb-4">
        <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                <tr>
                    <th className="px-4 py-3">Nama Santri</th>
                    <th className="px-4 py-3 text-center">Kelas</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Mulai</th>
                    {isHistory && <th className="px-4 py-3">Sembuh</th>}
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
                            <td className="px-4 py-3 font-bold text-gray-800">{log.santri?.nama_lengkap || "Tanpa Nama"}</td>
                            <td className="px-4 py-3 text-center"><Badge variant="secondary" className="text-[10px]">{log.santri?.kelas} {log.santri?.rombel?.nama}</Badge></td>
                            <td className="px-4 py-3">
                                {/* 🔥 Render tulisan 'Sakit Pulang' di tabel meskipun di DB cuma 'Pulang' */}
                                <Badge className={`${log.status === 'Sakit' ? 'bg-red-100 text-red-700 hover:bg-red-200' : (log.status === 'Pulang' ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-green-100 text-green-700')}`}>
                                    {log.status === 'Pulang' ? 'Sakit Pulang' : log.status} 
                                </Badge>
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-xs">
                                {new Date(log.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            {isHistory && (
                                <td className="px-4 py-3 text-gray-600 text-xs font-bold text-green-700">
                                    {log.end_date ? new Date(log.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}
                                </td>
                            )}
                            <td className="px-4 py-3 text-gray-500 italic text-xs">{log.keterangan || "-"}</td>
                            <td className="px-4 py-3 flex items-center justify-center gap-2">
                                {!isHistory ? (
                                    <>
                                        <Button size="sm" variant="outline" onClick={() => handleRecover(log.id, log.santri?.nama_lengkap || "")} className="text-green-600 border-green-200 hover:bg-green-50 h-7 text-[10px] font-bold px-2 shadow-sm">
                                            <CheckCircle2 className="w-3 h-3 mr-1"/> Sembuh
                                        </Button>
                                        {log.status === 'Sakit' && (
                                            <Button size="sm" variant="outline" onClick={() => handlePulang(log.id, log.santri?.nama_lengkap || "")} className="text-purple-600 border-purple-200 hover:bg-purple-50 h-7 text-[10px] font-bold px-2 shadow-sm">
                                                <Home className="w-3 h-3 mr-1"/> Dipulangkan
                                            </Button>
                                        )}
                                    </>
                                ) : (
                                    <Button size="icon" variant="ghost" onClick={() => handleDelete(log.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 w-7"><Trash2 size={14}/></Button>
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
        <Card className="bg-red-50 border-red-200 shadow-sm"><CardContent className="p-4 flex items-center justify-between"><div><p className="text-xs font-bold text-red-600 uppercase tracking-widest">Sedang Sakit</p><h2 className="text-3xl font-black text-red-700">{totalSakit}</h2></div><div className="p-3 bg-red-200 rounded-full text-red-700"><AlertCircle size={24}/></div></CardContent></Card>
        <Card className="bg-purple-50 border-purple-200 shadow-sm"><CardContent className="p-4 flex items-center justify-between"><div><p className="text-xs font-bold text-purple-600 uppercase tracking-widest">Sakit Pulang</p><h2 className="text-3xl font-black text-purple-700">{totalPulang}</h2></div><div className="p-3 bg-purple-200 rounded-full text-purple-700"><Home size={24}/></div></CardContent></Card>
      </div>

      {/* FORM INPUT */}
      <Card className="border-l-4 border-l-red-500 shadow-sm">
        <CardHeader className="pb-3 border-b bg-gray-50/50"><CardTitle className="text-sm font-bold flex items-center gap-2 text-red-800 uppercase"><Plus className="w-4 h-4"/> Catat Sakit Baru</CardTitle></CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-2 space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Tanggal</label><Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="bg-white h-9"/></div>
            <div className="md:col-span-2 space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Kelas</label><Select value={filterKelas} onValueChange={(v) => { setFilterKelas(v); setSelectedSantri(""); }}><SelectTrigger className="bg-white h-9"><SelectValue placeholder="-" /></SelectTrigger><SelectContent>{CLASSES.map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}</SelectContent></Select></div>
            <div className="md:col-span-2 space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Kategori</label><Select value={filterGender} onValueChange={(v) => { setFilterGender(v); setSelectedSantri(""); }}><SelectTrigger className="bg-white h-9"><SelectValue placeholder="-" /></SelectTrigger><SelectContent><SelectItem value="ikhwan">Ikhwan</SelectItem><SelectItem value="akhwat">Akhwat</SelectItem></SelectContent></Select></div>
            <div className="md:col-span-3 space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Nama Santri</label><Select value={selectedSantri} onValueChange={setSelectedSantri} disabled={!filterKelas || !filterGender}><SelectTrigger className="bg-white h-9"><SelectValue placeholder="Pilih Nama..." /></SelectTrigger><SelectContent className="max-h-[300px]">{santriList.filter(s => String(s.kelas) === filterKelas && (s.gender === filterGender || (filterGender==='ikhwan' ? s.gender==='L':s.gender==='P'))).map(s => (<SelectItem key={s.id} value={s.id}>{s.nama_lengkap} {s.rombel ? `(${s.rombel.nama})` : ''}</SelectItem>))}</SelectContent></Select></div>
            <div className="md:col-span-3 space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Keterangan Sakit</label><Input placeholder="Cth: Demam & Pusing..." value={keterangan} onChange={e => setKeterangan(e.target.value)} className="bg-white h-9"/></div>
            
            <div className="md:col-span-12 mt-2 pt-2 border-t flex justify-end">
                <Button onClick={handleSave} className="bg-red-600 hover:bg-red-700 text-white font-bold w-full md:w-auto shadow-md"><Save className="w-4 h-4 mr-2"/> Simpan Catatan</Button>
            </div>
        </CardContent>
      </Card>

      {/* TABEL DATA (TABS) */}
      <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
              <TabsList className="grid w-full md:w-[400px] grid-cols-2 shadow-sm border">
                  <TabsTrigger value="active" className="data-[state=active]:bg-red-600 data-[state=active]:text-white font-bold">Sedang Sakit ({activeLogs.length})</TabsTrigger>
                  <TabsTrigger value="history" className="data-[state=active]:bg-green-600 data-[state=active]:text-white font-bold">Riwayat Sembuh</TabsTrigger>
              </TabsList>

              {/* TOMBOL EXCEL DINAMIS */}
              {activeTab === 'active' ? (
                  <Button onClick={exportActiveData} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm w-full md:w-auto bg-white">
                      <Download className="w-4 h-4 mr-2"/> Download Rekap Saat Ini
                  </Button>
              ) : (
                  <div className="flex items-center gap-2 w-full md:w-auto p-1.5 bg-white border rounded-lg shadow-sm">
                      <select value={exportMonth} onChange={(e) => setExportMonth(parseInt(e.target.value))} className="p-1.5 border-none outline-none text-sm font-medium bg-transparent cursor-pointer">
                          {monthsList.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}
                      </select>
                      <select value={exportYear} onChange={(e) => setExportYear(parseInt(e.target.value))} className="p-1.5 border-none outline-none text-sm font-medium bg-transparent cursor-pointer border-l">
                          {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <Button onClick={exportHistoryData} size="sm" className="bg-green-600 hover:bg-green-700 ml-1">
                          <FileSpreadsheet className="w-4 h-4 mr-1"/> Excel
                      </Button>
                  </div>
              )}
          </div>
          
          <TabsContent value="active" className="mt-0">
              <Card className="shadow-sm border-t-4 border-t-red-500 overflow-hidden"><CardContent className="p-0"><LogTable data={activeLogs} isHistory={false} /></CardContent></Card>
          </TabsContent>
          
          <TabsContent value="history" className="mt-0">
              <Card className="shadow-sm border-t-4 border-t-green-500 overflow-hidden"><CardContent className="p-0"><LogTable data={historyLogs} isHistory={true} /></CardContent></Card>
          </TabsContent>
      </Tabs>

    </div>
  );
};

export default SickLeaveManagement;
