import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calendar, Search, Filter, Save, User, MapPin, 
  CheckCircle2, XCircle, Clock, AlertTriangle, FileSpreadsheet 
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from "recharts";

/* ================= TYPES ================= */
interface Santri { id: string; nama_lengkap: string; kelas: number; gender: string; nis: string; }
interface Teacher { id: number; full_name: string; nip: string; gender: string; }
interface AttendanceLog {
  id: string; scan_time: string; status: string; created_at: string;
  santri_id?: string; teacher_id?: number; activity_id?: number; location_id?: number;
  santri?: { nama_lengkap: string; kelas: number; nis: string };
  teacher?: { full_name: string; };
  activity?: { name: string; category: string };
  location?: { name: string };
  keterangan?: string; // Untuk Izin/Sakit
}

const COLORS = ['#22c55e', '#eab308', '#ef4444', '#3b82f6']; // Hijau, Kuning, Merah, Biru

const AttendanceMonitoring = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("santri");
  
  // Data Master
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [teacherList, setTeacherList] = useState<Teacher[]>([]);
  
  // Filter Utama
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  
  // Filter Santri (Khusus Tabel & Form)
  const [filterKelas, setFilterKelas] = useState("all");
  
  // Form Izin/Sakit State
  const [formKelas, setFormKelas] = useState("");
  const [formGender, setFormGender] = useState("");
  const [formSantriId, setFormSantriId] = useState("");
  const [formStatus, setFormStatus] = useState("Izin");
  const [formKet, setFormKet] = useState("");

  // Filter Log Bawah
  const [logFilterKelas, setLogFilterKelas] = useState("all");

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Ambil Logs berdasarkan Tanggal (Harian)
      // Kita ambil range 1 minggu dari tanggal yang dipilih untuk kebutuhan tabel mingguan
      const selectedDate = new Date(dateFilter);
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + 1); // Senin
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Minggu

      const { data: logData, error } = await supabase
        .from('attendance_logs')
        .select(`
            id, scan_time, status, created_at, santri_id, teacher_id, activity_id, location_id,
            santri:santri_2025_12_01_21_34(nama_lengkap, kelas, nis),
            teacher:teachers(full_name),
            activity:activity_id(name, category),
            location:location_id(name)
        `)
        .gte('created_at', startOfWeek.toISOString())
        .lte('created_at', endOfWeek.toISOString() + 'T23:59:59');

      if (error) throw error;
      // @ts-ignore
      setLogs(logData || []);

      // 2. Ambil Master Santri (untuk Form)
      const { data: sData } = await supabase.from('santri_2025_12_01_21_34').select('id, nama_lengkap, kelas, gender, nis').eq('status', 'aktif');
      if (sData) setSantriList(sData);

      // 3. Ambil Master Guru
      const { data: tData } = await supabase.from('teachers').select('*').eq('is_active', true);
      if (tData) setTeacherList(tData);

    } catch (err: any) {
      console.error(err);
      toast({ title: "Gagal memuat data", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [dateFilter]);

  /* ================= LOGIC HELPER ================= */
  // Filter log harian (untuk pie chart & log list)
  const dailyLogs = logs.filter(l => l.created_at.startsWith(dateFilter));

  // Hitung Statistik Pie Chart
  const getStats = (type: 'santri' | 'guru', category?: string) => {
      let filtered = dailyLogs.filter(l => type === 'santri' ? l.santri_id : l.teacher_id);
      
      if (category === 'kbm') filtered = filtered.filter(l => l.activity?.category === 'pelajaran');
      else if (category === 'ibadah') filtered = filtered.filter(l => l.activity?.category === 'ibadah' || l.activity?.name.toLowerCase().includes('sholat') || l.activity?.name.toLowerCase().includes('ngaji'));
      else if (category === 'ekskul') filtered = filtered.filter(l => l.activity?.category !== 'pelajaran' && l.activity?.category !== 'ibadah');

      const total = filtered.length;
      if (total === 0) return [{ name: 'Belum Ada Data', value: 1 }];

      const hadir = filtered.filter(l => l.status === 'Hadir').length;
      const telat = filtered.filter(l => l.status === 'Telat').length;
      const izin = filtered.filter(l => l.status === 'Izin').length;
      const sakit = filtered.filter(l => l.status === 'Sakit').length;

      return [
          { name: 'Hadir', value: hadir },
          { name: 'Telat', value: telat },
          { name: 'Sakit/Izin', value: izin + sakit },
      ].filter(x => x.value > 0);
  };

  // Submit Manual Permission
  const handleSubmitPermission = async (type: 'santri' | 'guru') => {
      try {
          const payload: any = {
              status: formStatus,
              scan_time: new Date().toLocaleTimeString(), // Jam saat ini
              created_at: new Date().toISOString(), // Tanggal hari ini
              activity_id: null, // General permission (izin harian)
              location_id: null
          };

          if (type === 'santri') {
              if (!formSantriId) return toast({title: "Pilih Santri", variant: "destructive"});
              payload.santri_id = formSantriId;
          } else {
              // Logic guru nanti
          }

          const { error } = await supabase.from('attendance_logs').insert([payload]);
          if (error) throw error;
          
          toast({ title: "Berhasil", description: "Data izin/sakit tersimpan." });
          fetchData(); // Refresh data
          setFormSantriId(""); setFormKet(""); // Reset form
      } catch (err: any) {
          toast({ title: "Gagal", description: err.message, variant: "destructive" });
      }
  };

  /* ================= SUB-COMPONENTS ================= */
  
  // 1. Komponen Grafik Pie
  const ChartCard = ({ title, data }: { title: string, data: any[] }) => (
      <Card className="border shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-center uppercase text-gray-600">{title}</CardTitle></CardHeader>
          <CardContent className="h-[200px] relative">
              {data[0].name === 'Belum Ada Data' ? (
                  <div className="flex items-center justify-center h-full text-xs text-gray-400">Belum ada data</div>
              ) : (
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                              {data.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                          </Pie>
                          <RechartsTooltip />
                          <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{ fontSize: '10px' }}/>
                      </PieChart>
                  </ResponsiveContainer>
              )}
          </CardContent>
      </Card>
  );

  // 2. Komponen Tabel Mingguan (Excel-like)
  const WeeklyTable = ({ category, dataList, filterKelas }: { category: string, dataList: any[], filterKelas: string }) => {
      // Filter list siswa/guru sesuai kelas (jika santri)
      const filteredSubjects = filterKelas === 'all' ? dataList : dataList.filter(s => String(s.kelas) === filterKelas);
      const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

      // Logic cek status per hari
      const getStatusOnDay = (id: string, dayIndex: number) => {
          // Cari log di range tanggal minggu ini yang sesuai Day Index (0=Minggu di JS, tapi di array kita sesuaikan)
          // Simplifikasi: Kita cek log yang harinya cocok
          const relevantLogs = logs.filter(l => {
              const logDate = new Date(l.created_at);
              const logDay = logDate.getDay(); // 0=Minggu, 1=Senin
              const targetDay = dayIndex === 6 ? 0 : dayIndex + 1; // Konversi index array days ke JS Day
              
              let isCategoryMatch = false;
              if (category === 'kbm') isCategoryMatch = l.activity?.category === 'pelajaran';
              else if (category === 'ibadah') isCategoryMatch = l.activity?.category === 'ibadah' || l.activity?.name.includes('Sholat');
              else if (category === 'ekskul') isCategoryMatch = l.activity?.category !== 'pelajaran' && l.activity?.category !== 'ibadah';
              
              return (l.santri_id === id || String(l.teacher_id) === id) && logDay === targetDay && isCategoryMatch;
          });

          if (relevantLogs.length === 0) return "-";
          // Prioritas status: Sakit > Izin > Alpa > Telat > Hadir
          if (relevantLogs.some(l => l.status === 'Sakit')) return <span className="text-red-500 font-bold">S</span>;
          if (relevantLogs.some(l => l.status === 'Izin')) return <span className="text-blue-500 font-bold">I</span>;
          if (relevantLogs.some(l => l.status === 'Telat')) return <span className="text-yellow-600 font-bold">T</span>;
          return <span className="text-green-500 font-bold">✓</span>;
      };

      return (
          <div className="overflow-x-auto border rounded-lg bg-white shadow-sm mt-4">
              <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 text-gray-700 uppercase font-bold">
                      <tr>
                          <th className="p-3 border-b border-r w-10">No</th>
                          <th className="p-3 border-b border-r min-w-[150px]">Nama Lengkap</th>
                          {category !== 'guru' && <th className="p-3 border-b border-r w-24">NIS</th>}
                          {days.map(d => <th key={d} className="p-3 border-b text-center w-12">{d.slice(0,3)}</th>)}
                      </tr>
                  </thead>
                  <tbody className="divide-y">
                      {filteredSubjects.map((s, idx) => (
                          <tr key={s.id} className="hover:bg-gray-50">
                              <td className="p-3 border-r text-center">{idx + 1}</td>
                              <td className="p-3 border-r font-medium">{category === 'guru' ? s.full_name : s.nama_lengkap}</td>
                              {category !== 'guru' && <td className="p-3 border-r text-gray-500">{s.nis}</td>}
                              {days.map((_, i) => (
                                  <td key={i} className="p-3 border-r text-center bg-gray-50/30">
                                      {getStatusOnDay(String(s.id), i)}
                                  </td>
                              ))}
                          </tr>
                      ))}
                  </tbody>
              </table>
              {filteredSubjects.length === 0 && <div className="p-4 text-center text-gray-400 text-sm">Data tidak ditemukan atau pilih filter kelas.</div>}
          </div>
      );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER & DATE PICKER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-blue-100">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <FileSpreadsheet className="text-blue-600" /> Monitoring Absensi
            </h1>
            <p className="text-sm text-gray-500">Pantau kehadiran Santri & Guru secara real-time & historis.</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border">
            <Calendar className="text-gray-500 w-4 h-4" />
            <input 
                type="date" 
                className="bg-transparent text-sm font-bold text-gray-700 outline-none"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
            />
        </div>
      </div>

      <Tabs defaultValue="santri" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="santri" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Santri</TabsTrigger>
            <TabsTrigger value="guru" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white">Guru & Staf</TabsTrigger>
        </TabsList>

        {/* ======================= TAB SANTRI ======================= */}
        <TabsContent value="santri" className="space-y-8">
            
            {/* 1. GRAFIK PIE (3 Kategori) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ChartCard title="Kehadiran KBM (Kelas)" data={getStats('santri', 'kbm')} />
                <ChartCard title="Kehadiran Sholat & Mengaji" data={getStats('santri', 'ibadah')} />
                <ChartCard title="Kehadiran Ekstrakurikuler" data={getStats('santri', 'ekskul')} />
            </div>

            {/* 2. TABEL EXCEL VIEW */}
            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-green-600"/> Rekap Mingguan</h3>
                    <Select value={filterKelas} onValueChange={setFilterKelas}>
                        <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Kelas</SelectItem>
                            {[7,8,9,10,11,12].map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                {/* Tabel KBM */}
                <div>
                    <h4 className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-2">Absensi KBM (Sekolah)</h4>
                    <WeeklyTable category="kbm" dataList={santriList} filterKelas={filterKelas} />
                </div>

                {/* Tabel Ibadah */}
                <div>
                    <h4 className="text-sm font-bold text-green-700 uppercase tracking-wide mb-2">Absensi Sholat & Mengaji</h4>
                    <WeeklyTable category="ibadah" dataList={santriList} filterKelas={filterKelas} />
                </div>

                {/* Tabel Ekskul */}
                <div>
                    <h4 className="text-sm font-bold text-orange-700 uppercase tracking-wide mb-2">Absensi Ekstrakurikuler</h4>
                    <WeeklyTable category="ekskul" dataList={santriList} filterKelas={filterKelas} />
                </div>
            </div>

            {/* 3. FORM INPUT IZIN / SAKIT */}
            <Card className="border-l-4 border-l-purple-500 bg-purple-50/30">
                <CardHeader><CardTitle className="text-purple-800">Input Izin / Sakit Manual</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="space-y-1">
                        <label className="text-xs font-bold">Pilih Kelas</label>
                        <Select value={formKelas} onValueChange={(v) => { setFormKelas(v); setFormSantriId(""); }}>
                            <SelectTrigger className="bg-white"><SelectValue placeholder="Kelas..." /></SelectTrigger>
                            <SelectContent>{[7,8,9,10,11,12].map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold">Gender</label>
                        <Select value={formGender} onValueChange={(v) => { setFormGender(v); setFormSantriId(""); }}>
                            <SelectTrigger className="bg-white"><SelectValue placeholder="L/P" /></SelectTrigger>
                            <SelectContent><SelectItem value="L">Laki-laki</SelectItem><SelectItem value="P">Perempuan</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <div className="md:col-span-2 space-y-1">
                        <label className="text-xs font-bold">Nama Santri</label>
                        <Select value={formSantriId} onValueChange={setFormSantriId} disabled={!formKelas || !formGender}>
                            <SelectTrigger className="bg-white"><SelectValue placeholder="Pilih Nama..." /></SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                                {santriList.filter(s => String(s.kelas) === formKelas && s.gender === formGender).map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.nama_lengkap}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold">Status</label>
                        <Select value={formStatus} onValueChange={setFormStatus}>
                            <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="Izin">Izin</SelectItem><SelectItem value="Sakit">Sakit</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <div className="md:col-span-5 flex gap-2">
                        <Input placeholder="Keterangan (Opsional)" value={formKet} onChange={e => setFormKet(e.target.value)} className="bg-white" />
                        <Button onClick={() => handleSubmitPermission('santri')} className="bg-purple-600 hover:bg-purple-700 text-white w-32"><Save className="w-4 h-4 mr-2"/> Simpan</Button>
                    </div>
                </CardContent>
            </Card>

            {/* 4. LOG HARIAN REALTIME (FILTERED) */}
            <Card>
                <CardHeader className="flex flex-row justify-between items-center bg-gray-50 border-b pb-2">
                    <CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4"/> Log Absensi Hari Ini ({dateFilter})</CardTitle>
                    <Select value={logFilterKelas} onValueChange={setLogFilterKelas}>
                        <SelectTrigger className="w-[120px] h-8 text-xs bg-white"><SelectValue placeholder="Filter Kelas" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua</SelectItem>
                            {[7,8,9,10,11,12].map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="max-h-[400px] overflow-y-auto divide-y">
                        {dailyLogs
                            .filter(l => l.santri_id) // Hanya santri
                            .filter(l => logFilterKelas === 'all' || String(l.santri?.kelas) === logFilterKelas)
                            .map((log) => (
                            <div key={log.id} className="flex items-center justify-between p-3 hover:bg-blue-50/50 text-sm">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${log.status === 'Hadir' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        {log.status === 'Hadir' ? <CheckCircle2 size={16}/> : <XCircle size={16}/>}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800">{log.santri?.nama_lengkap}</p>
                                        <div className="flex gap-2 text-xs text-gray-500">
                                            <span className="bg-gray-100 px-1 rounded">Kls {log.santri?.kelas}</span>
                                            <span>• {log.activity?.name || "Manual/Umum"}</span>
                                            <span className="flex items-center gap-1"><MapPin size={10}/> {log.location?.name || "-"}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="font-mono font-bold text-gray-700 block">{log.scan_time.slice(0,5)}</span>
                                    <Badge variant={log.status === 'Hadir' ? 'default' : (log.status === 'Telat' ? 'secondary' : 'destructive')} className="text-[10px] h-5">
                                        {log.status}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                        {dailyLogs.length === 0 && <p className="text-center py-8 text-gray-400 italic">Belum ada data absensi hari ini.</p>}
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        {/* ======================= TAB GURU ======================= */}
        <TabsContent value="guru" className="space-y-8">
             {/* 1. GRAFIK PIE GURU */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ChartCard title="Kehadiran Mengajar (KBM)" data={getStats('guru', 'kbm')} />
                <ChartCard title="Kehadiran Kegiatan Lain" data={getStats('guru', 'ibadah')} />
            </div>

            {/* 2. TABEL GURU */}
            <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2 mb-4"><FileSpreadsheet className="w-5 h-5 text-teal-600"/> Rekap Mingguan Guru</h3>
                <WeeklyTable category="guru" dataList={teacherList} filterKelas="all" />
            </div>

            {/* 3. LOG HARIAN GURU */}
            <Card>
                <CardHeader className="bg-gray-50 border-b pb-2"><CardTitle className="text-base">Log Absensi Guru Hari Ini</CardTitle></CardHeader>
                <CardContent className="p-0">
                    <div className="max-h-[400px] overflow-y-auto divide-y">
                        {dailyLogs.filter(l => l.teacher_id).map((log) => (
                            <div key={log.id} className="flex items-center justify-between p-3 hover:bg-teal-50/50 text-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-teal-100 text-teal-600"><User size={16}/></div>
                                    <div>
                                        <p className="font-bold text-gray-800">{log.teacher?.full_name}</p>
                                        <p className="text-xs text-gray-500">{log.activity?.name}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="font-mono font-bold block">{log.scan_time.slice(0,5)}</span>
                                    <Badge className="bg-teal-600">{log.status}</Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default AttendanceMonitoring;
