import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calendar, Save, User, MapPin, 
  CheckCircle2, XCircle, Clock, FileSpreadsheet, Users, Trophy
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from "recharts";

/* ================= TYPES ================= */
interface Santri { id: string; nama_lengkap: string; kelas: number; gender: string; nis: string; }
interface Teacher { id: number; full_name: string; nip: string; gender: string; }
interface Activity { id: number; name: string; category: string; }
interface ActivityMember { activity_id: number; santri_id: string; }
interface AttendanceLog {
  id: string; scan_time: string; status: string; created_at: string;
  santri_id?: string; teacher_id?: number; activity_id?: number; location_id?: number;
  santri?: { nama_lengkap: string; kelas: number; nis: string; gender: string };
  teacher?: { full_name: string; };
  activity?: { name: string; category: string };
  location?: { name: string };
  keterangan?: string;
}

const COLORS = ['#22c55e', '#eab308', '#ef4444', '#3b82f6'];
const CLASSES = [7, 8, 9, 10, 11, 12];

const AttendanceMonitoring = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("santri");
  const [santriTab, setSantriTab] = useState("kbm");
  
  // Data Master
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [teacherList, setTeacherList] = useState<Teacher[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [members, setMembers] = useState<ActivityMember[]>([]);
  
  // Filter
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [filterKelas, setFilterKelas] = useState("all");
  const [logFilterKelas, setLogFilterKelas] = useState("all");
  
  // Form Manual State
  const [formKelas, setFormKelas] = useState("");
  const [formGender, setFormGender] = useState("");
  const [formSantriId, setFormSantriId] = useState("");
  const [formStatus, setFormStatus] = useState("Izin");
  const [formKet, setFormKet] = useState("");

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    setLoading(true);
    try {
      const selectedDate = new Date(dateFilter);
      
      // Hitung Range Mingguan (Untuk KBM)
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + 1); 
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      // Hitung Range Bulanan (Untuk Ekskul)
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

      // Fetch Logs (Ambil cakupan bulanan biar aman untuk semua tab)
      const { data: logData, error } = await supabase
        .from('attendance_logs')
        .select(`
            id, scan_time, status, created_at, santri_id, teacher_id, activity_id, location_id,
            santri:santri_2025_12_01_21_34(nama_lengkap, kelas, nis, gender),
            teacher:teachers(full_name),
            activity:activity_id(name, category),
            location:location_id(name)
        `)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString() + 'T23:59:59');

      if (error) throw error;
      // @ts-ignore
      setLogs(logData || []);

      // Fetch Master Data
      const { data: sData } = await supabase.from('santri_2025_12_01_21_34').select('*').eq('status', 'aktif');
      if (sData) setSantriList(sData);

      const { data: tData } = await supabase.from('teachers').select('*').eq('is_active', true);
      if (tData) setTeacherList(tData);

      const { data: actData } = await supabase.from('activities').select('*');
      if (actData) setActivities(actData);

      const { data: memData } = await supabase.from('activity_members').select('*');
      if (memData) setMembers(memData);

    } catch (err: any) {
      // console.error(err); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [dateFilter]);

  /* ================= LOGIC HELPER ================= */
  const dailyLogs = logs.filter(l => l.created_at?.startsWith(dateFilter) || l.scan_time?.startsWith(dateFilter));

  const getActivityType = (log: AttendanceLog) => {
      const cat = log.activity?.category?.toLowerCase() || '';
      const name = log.activity?.name?.toLowerCase() || '';
      if (cat === 'pelajaran') return 'kbm';
      if (cat === 'ibadah' || name.includes('sholat') || name.includes('dzuhur') || name.includes('ashar') || name.includes('maghrib') || name.includes('isya') || name.includes('subuh')) {
          if (name.includes('ngaji') || name.includes('quran') || name.includes('tahfidz') || name.includes('kitab')) return 'mengaji';
          return 'sholat';
      }
      if (name.includes('ngaji') || name.includes('quran') || name.includes('tahfidz')) return 'mengaji';
      return 'ekskul'; 
  };

  const getStats = (type: 'santri' | 'guru', group?: string) => {
      let filtered = dailyLogs.filter(l => type === 'santri' ? l.santri_id : l.teacher_id);
      if (group === 'kbm') filtered = filtered.filter(l => getActivityType(l) === 'kbm');
      else if (group === 'ibadah') filtered = filtered.filter(l => getActivityType(l) === 'sholat' || getActivityType(l) === 'mengaji');
      else if (group === 'ekskul') filtered = filtered.filter(l => getActivityType(l) === 'ekskul');

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

  const handleSubmitPermission = async (type: 'santri' | 'guru') => {
      try {
          const payload: any = {
              status: formStatus,
              scan_time: new Date().toLocaleTimeString(),
              created_at: new Date().toISOString(),
              activity_id: null,
              location_id: null,
              keterangan: formKet
          };
          if (type === 'santri') {
              if (!formSantriId) return toast({title: "Pilih Santri", variant: "destructive"});
              payload.santri_id = formSantriId;
          }
          const { error } = await supabase.from('attendance_logs').insert([payload]);
          if (error) throw error;
          toast({ title: "Berhasil", description: "Data izin/sakit tersimpan." });
          fetchData();
          setFormSantriId(""); setFormKet("");
      } catch (err: any) {
          toast({ title: "Gagal", description: err.message, variant: "destructive" });
      }
  };

  /* ================= COMPONENTS ================= */
  
  const ChartCard = ({ title, data }: { title: string, data: any[] }) => (
      <Card className="border shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-center uppercase text-gray-500">{title}</CardTitle></CardHeader>
          <CardContent className="h-[180px]">
              {data[0].name === 'Belum Ada Data' ? (
                  <div className="flex items-center justify-center h-full text-xs text-gray-400">Belum ada data</div>
              ) : (
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie data={data} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={5} dataKey="value">
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

  // --- TABEL MINGGUAN (KBM / SHOLAT / MENGAJI) ---
  const WeeklyTable = ({ category, subjects }: { category: string, subjects: any[] }) => {
      const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
      const selectedDate = new Date(dateFilter);
      
      // Cari tanggal Senin minggu ini
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + 1);

      const getStatusOnDay = (id: string, dayIndex: number) => {
          const targetDate = new Date(startOfWeek);
          targetDate.setDate(startOfWeek.getDate() + dayIndex);
          const dateStr = targetDate.toISOString().split('T')[0];

          const relevantLogs = logs.filter(l => {
              const logDate = l.created_at?.split('T')[0];
              const logType = category === 'guru' ? 'guru' : getActivityType(l);
              return (l.santri_id === id || String(l.teacher_id) === id) && logDate === dateStr && (category === 'guru' ? true : logType === category);
          });

          if (relevantLogs.length === 0) return "-";
          if (relevantLogs.some(l => l.status === 'Sakit')) return <span className="text-red-500 font-bold">S</span>;
          if (relevantLogs.some(l => l.status === 'Izin')) return <span className="text-blue-500 font-bold">I</span>;
          if (relevantLogs.some(l => l.status === 'Telat')) return <span className="text-yellow-600 font-bold">T</span>;
          return <span className="text-green-500 font-bold">✓</span>;
      };

      if (subjects.length === 0) return <div className="text-center py-2 text-xs text-gray-400 italic">Data kosong.</div>;

      return (
          <div className="overflow-x-auto border rounded-lg bg-white shadow-sm mt-1 mb-4">
              <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-700 uppercase font-bold">
                      <tr>
                          <th className="p-2 border-b w-8 text-center">No</th>
                          <th className="p-2 border-b min-w-[150px]">Nama Lengkap</th>
                          {category !== 'guru' && <th className="p-2 border-b w-20">NIS</th>}
                          {category !== 'guru' && <th className="p-2 border-b w-10 text-center">Kls</th>}
                          {days.map(d => <th key={d} className="p-2 border-b text-center w-8">{d.slice(0,3)}</th>)}
                      </tr>
                  </thead>
                  <tbody className="divide-y">
                      {subjects.map((s, idx) => (
                          <tr key={s.id} className="hover:bg-gray-50">
                              <td className="p-2 text-center border-r">{idx + 1}</td>
                              <td className="p-2 border-r font-medium truncate max-w-[150px]">{s.nama_lengkap || s.full_name}</td>
                              {category !== 'guru' && <td className="p-2 border-r text-gray-500">{s.nis}</td>}
                              {category !== 'guru' && <td className="p-2 border-r text-center">{s.kelas}</td>}
                              {days.map((_, i) => (
                                  <td key={i} className="p-2 border-r text-center bg-gray-50/20">
                                      {getStatusOnDay(String(s.id), i)}
                                  </td>
                              ))}
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      );
  };

  // --- TABEL BULANAN (KHUSUS EKSKUL) ---
  const MonthlyEkskulTable = ({ activityId }: { activityId: number }) => {
      // Ambil anggota ekskul ini
      const memberIds = members.filter(m => m.activity_id === activityId).map(m => m.santri_id);
      const subjectList = santriList.filter(s => memberIds.includes(s.id));
      const weeks = [1, 2, 3, 4];

      const getStatusOnWeek = (santriId: string, weekNum: number) => {
          // Logika sederhana: Cek log di rentang tanggal minggu ke-X bulan ini
          const selectedDate = new Date(dateFilter);
          const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
          
          // Asumsi 1 minggu = 7 hari
          const startDay = (weekNum - 1) * 7 + 1;
          const endDay = startDay + 6;
          
          const relevantLogs = logs.filter(l => {
              const logDate = new Date(l.created_at);
              const day = logDate.getDate();
              return l.santri_id === santriId && l.activity_id === activityId && day >= startDay && day <= endDay;
          });

          if (relevantLogs.length === 0) return "-";
          if (relevantLogs.some(l => l.status === 'Sakit')) return <span className="text-red-500 font-bold">S</span>;
          if (relevantLogs.some(l => l.status === 'Izin')) return <span className="text-blue-500 font-bold">I</span>;
          return <span className="text-green-500 font-bold">✓</span>;
      };

      if (subjectList.length === 0) return <div className="text-center py-2 text-xs text-gray-400 italic">Belum ada anggota.</div>;

      return (
          <div className="overflow-x-auto border rounded-lg bg-white shadow-sm mt-2 mb-4">
              <table className="w-full text-xs text-left">
                  <thead className="bg-orange-50 text-orange-800 uppercase font-bold">
                      <tr>
                          <th className="p-2 border-b w-8 text-center">No</th>
                          <th className="p-2 border-b min-w-[150px]">Nama Anggota</th>
                          <th className="p-2 border-b w-20">NIS</th>
                          <th className="p-2 border-b w-10 text-center">Kls</th>
                          {weeks.map(w => <th key={w} className="p-2 border-b text-center w-12">Min {w}</th>)}
                      </tr>
                  </thead>
                  <tbody className="divide-y">
                      {subjectList.map((s, idx) => (
                          <tr key={s.id} className="hover:bg-gray-50">
                              <td className="p-2 text-center border-r">{idx + 1}</td>
                              <td className="p-2 border-r font-medium">{s.nama_lengkap}</td>
                              <td className="p-2 border-r text-gray-500">{s.nis}</td>
                              <td className="p-2 border-r text-center">{s.kelas}</td>
                              {weeks.map(w => (
                                  <td key={w} className="p-2 border-r text-center bg-gray-50/20">
                                      {getStatusOnWeek(s.id, w)}
                                  </td>
                              ))}
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      );
  };

  // RENDER TABEL UTAMA
  const RenderClassTables = ({ category }: { category: string }) => {
      // Jika kategori Ekskul, render per Kegiatan
      if (category === 'ekskul') {
          const ekskulActivities = activities.filter(a => a.category !== 'pelajaran' && a.category !== 'ibadah' && !a.name.toLowerCase().includes('sholat') && !a.name.toLowerCase().includes('ngaji'));
          
          return (
              <div className="space-y-8">
                  {ekskulActivities.map(act => (
                      <div key={act.id} className="animate-in fade-in slide-in-from-bottom-2 border p-4 rounded-xl bg-orange-50/30">
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-orange-200">
                              <Badge className="bg-orange-600 text-base px-3 py-1 flex gap-2"><Trophy size={14}/> {act.name}</Badge>
                          </div>
                          <MonthlyEkskulTable activityId={act.id} />
                      </div>
                  ))}
              </div>
          );
      }

      // Jika KBM/Sholat/Mengaji, render per Kelas & Gender
      const classesToShow = filterKelas === 'all' ? CLASSES : [parseInt(filterKelas)];
      return (
          <div className="space-y-8">
              {classesToShow.map(cls => {
                  const classStudents = santriList.filter(s => s.kelas === cls);
                  const ikhwan = classStudents.filter(s => s.gender === 'ikhwan' || s.gender === 'L');
                  const akhwat = classStudents.filter(s => s.gender === 'akhwat' || s.gender === 'P');

                  if (filterKelas === 'all' && classStudents.length === 0) return null;

                  return (
                      <div key={cls} className="animate-in fade-in slide-in-from-bottom-2 border p-4 rounded-xl bg-gray-50/50">
                          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                              <Badge className="bg-blue-700 text-base px-3 py-1">Kelas {cls}</Badge>
                              <span className="text-sm text-gray-500 font-medium">{classStudents.length} Santri</span>
                          </div>
                          
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <div>
                                  <h5 className="text-xs font-bold text-green-700 uppercase mb-2 flex items-center gap-2 bg-green-50 p-2 rounded"><User className="w-3 h-3"/> Ikhwan ({ikhwan.length})</h5>
                                  <WeeklyTable category={category} subjects={ikhwan} />
                              </div>
                              <div>
                                  <h5 className="text-xs font-bold text-pink-700 uppercase mb-2 flex items-center gap-2 bg-pink-50 p-2 rounded"><User className="w-3 h-3"/> Akhwat ({akhwat.length})</h5>
                                  <WeeklyTable category={category} subjects={akhwat} />
                              </div>
                          </div>
                      </div>
                  )
              })}
          </div>
      )
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-blue-100">
        <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FileSpreadsheet className="text-blue-600" /> Monitoring Absensi V2
            </h1>
            <p className="text-xs text-gray-500">Pantau kehadiran secara real-time & historis mingguan/bulanan.</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border">
            <Calendar className="text-gray-500 w-4 h-4" />
            <input type="date" className="bg-transparent text-sm font-bold text-gray-700 outline-none" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        </div>
      </div>

      <Tabs defaultValue="santri" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="santri" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Santri</TabsTrigger>
            <TabsTrigger value="guru" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white">Guru & Staf</TabsTrigger>
        </TabsList>

        <TabsContent value="santri" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ChartCard title="Grafik KBM" data={getStats('santri', 'kbm')} />
                <ChartCard title="Grafik Ibadah" data={getStats('santri', 'ibadah')} />
                <ChartCard title="Grafik Ekskul" data={getStats('santri', 'ekskul')} />
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Users className="w-5 h-5 text-blue-600"/> Rekap Absensi</h3>
                    {santriTab !== 'ekskul' && (
                        <Select value={filterKelas} onValueChange={setFilterKelas}>
                            <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                            <SelectContent><SelectItem value="all">Semua Kelas</SelectItem>{CLASSES.map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}</SelectContent>
                        </Select>
                    )}
                </div>

                <Tabs defaultValue="kbm" value={santriTab} onValueChange={setSantriTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 rounded-lg mb-6">
                        <TabsTrigger value="kbm" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs md:text-sm">KBM Sekolah</TabsTrigger>
                        <TabsTrigger value="sholat" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs md:text-sm">Sholat</TabsTrigger>
                        <TabsTrigger value="mengaji" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs md:text-sm">Mengaji</TabsTrigger>
                        <TabsTrigger value="ekskul" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs md:text-sm">Ekstrakulikuler</TabsTrigger>
                    </TabsList>

                    <TabsContent value="kbm"><RenderClassTables category="kbm" /></TabsContent>
                    <TabsContent value="sholat"><RenderClassTables category="sholat" /></TabsContent>
                    <TabsContent value="mengaji"><RenderClassTables category="mengaji" /></TabsContent>
                    <TabsContent value="ekskul"><RenderClassTables category="ekskul" /></TabsContent>
                </Tabs>
            </div>

            <Card className="border-l-4 border-l-purple-500 bg-purple-50/30">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-purple-800 uppercase">Input Izin / Sakit Manual</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase">Kelas</label><Select value={formKelas} onValueChange={(v) => { setFormKelas(v); setFormSantriId(""); }}><SelectTrigger className="bg-white h-9"><SelectValue placeholder="-" /></SelectTrigger><SelectContent>{CLASSES.map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase">Kategori</label><Select value={formGender} onValueChange={(v) => { setFormGender(v); setFormSantriId(""); }}><SelectTrigger className="bg-white h-9"><SelectValue placeholder="-" /></SelectTrigger><SelectContent><SelectItem value="ikhwan">Ikhwan</SelectItem><SelectItem value="akhwat">Akhwat</SelectItem></SelectContent></Select></div>
                    <div className="md:col-span-2 space-y-1"><label className="text-[10px] font-bold uppercase">Nama Santri</label><Select value={formSantriId} onValueChange={setFormSantriId} disabled={!formKelas || !formGender}><SelectTrigger className="bg-white h-9"><SelectValue placeholder="Pilih Nama..." /></SelectTrigger><SelectContent className="max-h-[200px]">{santriList.filter(s => String(s.kelas) === formKelas && (s.gender === formGender || (formGender==='ikhwan' ? s.gender==='L':s.gender==='P'))).map(s => (<SelectItem key={s.id} value={s.id}>{s.nama_lengkap}</SelectItem>))}</SelectContent></Select></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase">Status</label><Select value={formStatus} onValueChange={setFormStatus}><SelectTrigger className="bg-white h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Izin">Izin</SelectItem><SelectItem value="Sakit">Sakit</SelectItem></SelectContent></Select></div>
                    <div className="md:col-span-5 flex gap-2"><Input placeholder="Keterangan (Opsional)" value={formKet} onChange={e => setFormKet(e.target.value)} className="bg-white h-9 text-sm" /><Button onClick={() => handleSubmitPermission('santri')} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white w-32"><Save className="w-4 h-4 mr-2"/> Simpan</Button></div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row justify-between items-center bg-gray-50 border-b pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-bold flex items-center gap-2"><Clock className="w-4 h-4"/> Log Absensi Hari Ini</CardTitle>
                    <Select value={logFilterKelas} onValueChange={setLogFilterKelas}><SelectTrigger className="w-[100px] h-7 text-[10px] bg-white"><SelectValue placeholder="Filter" /></SelectTrigger><SelectContent><SelectItem value="all">Semua</SelectItem>{CLASSES.map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}</SelectContent></Select>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="max-h-[300px] overflow-y-auto divide-y">
                        {dailyLogs.filter(l => l.santri_id).filter(l => logFilterKelas === 'all' || String(l.santri?.kelas) === logFilterKelas).map((log) => (
                            <div key={log.id} className="flex items-center justify-between p-2 px-4 hover:bg-blue-50/50 text-xs">
                                <div className="flex items-center gap-3"><div className={`p-1.5 rounded-full ${log.status === 'Hadir' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{log.status === 'Hadir' ? <CheckCircle2 size={12}/> : <XCircle size={12}/>}</div><div><p className="font-bold text-gray-800">{log.santri?.nama_lengkap}</p><div className="flex gap-2 text-[10px] text-gray-500"><span className="bg-gray-100 px-1 rounded">Kls {log.santri?.kelas}</span><span>• {log.activity?.name || "Manual"}</span><span className="flex items-center gap-1"><MapPin size={10}/> {log.location?.name || "-"}</span></div></div></div>
                                <div className="text-right"><span className="font-mono font-bold text-gray-700 block">{log.scan_time.slice(0,5)}</span><Badge variant="outline" className="text-[9px] h-4 px-1">{log.status}</Badge></div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="guru" className="space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ChartCard title="Kehadiran Mengajar (KBM)" data={getStats('guru', 'kbm')} />
                <ChartCard title="Kehadiran Kegiatan Lain" data={getStats('guru', 'ibadah')} />
            </div>
            <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2 mb-4"><FileSpreadsheet className="w-5 h-5 text-teal-600"/> Rekap Mingguan Guru</h3>
                <WeeklyTable category="guru" subjects={teacherList} />
            </div>
            <Card>
                <CardHeader className="bg-gray-50 border-b pb-2 pt-3 px-4"><CardTitle className="text-sm font-bold">Log Absensi Guru</CardTitle></CardHeader>
                <CardContent className="p-0"><div className="max-h-[300px] overflow-y-auto divide-y">{dailyLogs.filter(l => l.teacher_id).map((log) => (<div key={log.id} className="flex items-center justify-between p-2 px-4 hover:bg-teal-50/50 text-xs"><div className="flex items-center gap-3"><div className="p-1.5 rounded-full bg-teal-100 text-teal-600"><User size={12}/></div><div><p className="font-bold text-gray-800">{log.teacher?.full_name}</p><p className="text-[10px] text-gray-500">{log.activity?.name}</p></div></div><div className="text-right"><span className="font-mono font-bold block">{log.scan_time.slice(0,5)}</span><Badge className="bg-teal-600 text-[9px] h-4 px-1">{log.status}</Badge></div></div>))}</div></CardContent>
            </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default AttendanceMonitoring;
