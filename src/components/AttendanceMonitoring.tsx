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
  CheckCircle2, XCircle, Clock, FileSpreadsheet, Users, Trophy, BookOpen, GraduationCap, ArrowLeft, ArrowRight
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from "recharts";

/* ================= TYPES ================= */
interface Santri { 
  id: string; 
  nama_lengkap: string; 
  kelas: number; 
  gender: string; 
  nis: string;
  rombel?: any; 
  kelas_mengaji?: number;
  rombel_mengaji?: any;
}
interface Teacher { id: number; full_name: string; nip: string; gender: string; }
interface Activity { id: number; name: string; category: string; }
interface ActivityMember { activity_id: number; santri_id: string; }
interface AttendanceLog {
  id: string; scan_time: string; status: string; created_at: string;
  santri_id?: string; teacher_id?: number; activity_id?: number; location_id?: number;
  santri?: { 
      nama_lengkap: string; 
      kelas: number; 
      nis: string; 
      gender: string;
      rombel?: any; 
      kelas_mengaji?: number;
      rombel_mengaji?: any;
  };
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
  
  // State untuk Alur Baru KBM
  const [selectedKbmClass, setSelectedKbmClass] = useState<{kelas: number, rombel: string} | null>(null);
  const [selectedKbmSubject, setSelectedKbmSubject] = useState<Activity | null>(null);

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

  /* ================= HELPER ROMBEL ================= */
  const getRombel = (rombelData: any) => {
      if (!rombelData) return 'A'; 
      if (typeof rombelData === 'string') return rombelData;
      if (typeof rombelData === 'object' && rombelData.nama) return rombelData.nama;
      return 'A';
  };

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    setLoading(true);
    try {
      const selectedDate = new Date(dateFilter);
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

      const { data: logData, error } = await supabase
        .from('attendance_logs')
        .select(`
            id, scan_time, status, created_at, santri_id, teacher_id, activity_id, location_id,
            santri:santri_2025_12_01_21_34(nama_lengkap, kelas, nis, gender, rombel, kelas_mengaji, rombel_mengaji),
            teacher:teachers(full_name),
            activity:activity_id(name, category),
            location:location_id(name)
        `)
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString() + 'T23:59:59');

      if (error) throw error;
      setLogs(logData as any || []);

      const { data: sData } = await supabase
        .from('santri_2025_12_01_21_34')
        .select('id, nama_lengkap, kelas, nis, gender, rombel, kelas_mengaji, rombel_mengaji')
        .eq('status', 'aktif');
      
      if (sData) setSantriList(sData as any);

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

  // Reset state alur KBM kalau pindah tab
  useEffect(() => {
     if (santriTab !== 'kbm') {
         setSelectedKbmClass(null);
         setSelectedKbmSubject(null);
     }
  }, [santriTab]);

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

  // --- ALUR BARU: RENDER KHUSUS TAB KBM SEKOLAH ---
  const renderKbmFlow = () => {
      // 1. TAHAP PILIH KELAS & ROMBEL (LIST BAR MODE)
      if (!selectedKbmClass) {
          const classMap = new Map();
          santriList.forEach(s => {
              const k = s.kelas;
              const r = getRombel(s.rombel);
              const key = `${k}-${r}`;
              if (!classMap.has(key)) classMap.set(key, { kelas: k, rombel: r, count: 0 });
              classMap.get(key).count++;
          });
          const uniqueClasses = Array.from(classMap.values()).sort((a,b) => a.kelas === b.kelas ? a.rombel.localeCompare(b.rombel) : a.kelas - b.kelas);

          return (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <h3 className="font-bold text-green-800 flex items-center gap-2 mb-4 border-b border-green-200 pb-2">
                      <Users className="text-green-600"/> Pilih Kelas & Rombel
                  </h3>
                  <div className="flex flex-col gap-3">
                      {uniqueClasses.map(c => (
                          <div key={`${c.kelas}-${c.rombel}`} 
                               onClick={() => setSelectedKbmClass(c)} 
                               className="flex items-center justify-between p-4 bg-white border-2 border-green-100 rounded-xl cursor-pointer hover:border-green-500 hover:bg-green-50 hover:shadow-md transition-all group"
                          >
                              <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-colors shadow-sm">
                                      <GraduationCap size={24} />
                                  </div>
                                  <div>
                                      <h4 className="font-extrabold text-lg text-gray-800">Kelas {c.kelas} - {c.rombel}</h4>
                                      <p className="text-xs font-medium text-gray-500">{c.count} Santri Terdaftar</p>
                                  </div>
                              </div>
                              <div className="text-green-500 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                                  <ArrowRight />
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )
      }

      // 2. TAHAP PILIH PELAJARAN (SCROLLABLE LIST BAR MODE)
      if (!selectedKbmSubject) {
          const subjects = activities.filter(a => a.category === 'pelajaran');
          return (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between mb-4 border-b border-green-200 pb-3">
                      <div className="flex items-center gap-3">
                          <Button variant="outline" size="sm" onClick={() => setSelectedKbmClass(null)} className="hover:bg-green-50 border-green-200 text-green-700">
                              <ArrowLeft className="w-4 h-4 mr-2"/> Kembali
                          </Button>
                          <h3 className="font-bold text-green-800 flex items-center gap-2">
                              Pilih Pelajaran <Badge className="bg-green-600 ml-2 shadow-sm">Kls {selectedKbmClass.kelas}-{selectedKbmClass.rombel}</Badge>
                          </h3>
                      </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto pr-2 pb-2">
                      {subjects.length === 0 ? (
                           <div className="text-center p-8 text-gray-400 border-2 border-dashed border-green-200 rounded-xl bg-green-50/50">Belum ada data mata pelajaran di menu Jadwal.</div>
                      ) : subjects.map(s => (
                          <div key={s.id} 
                               onClick={() => setSelectedKbmSubject(s)} 
                               className="flex items-center p-3 bg-white border-2 border-green-100 rounded-xl cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all group shadow-sm"
                          >
                              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mr-4 group-hover:bg-green-600 group-hover:text-white transition-colors shadow-sm border border-green-200 group-hover:border-green-600">
                                  <BookOpen size={20} />
                              </div>
                              <h4 className="font-bold text-sm text-gray-800 flex-1">{s.name}</h4>
                              <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50 mr-2">{s.category}</Badge>
                              <div className="text-green-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <ArrowRight size={18}/>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )
      }

      // 3. TAHAP TABEL ABSENSI PERTEMUAN (DIPISAH IKHWAN & AKHWAT)
      const classStudents = santriList.filter(s => s.kelas === selectedKbmClass.kelas && getRombel(s.rombel) === selectedKbmClass.rombel);
      const subjectLogs = logs.filter(l => l.activity_id === selectedKbmSubject.id && l.santri?.kelas === selectedKbmClass.kelas && getRombel(l.santri?.rombel) === selectedKbmClass.rombel);
      
      const uniqueDates = Array.from(new Set(subjectLogs.map(l => l.created_at.split('T')[0]))).sort();
      const meetingCount = Math.max(uniqueDates.length, 8);
      const meetings = Array.from({length: meetingCount}, (_, i) => ({
          label: `Per-${i+1}`,
          date: uniqueDates[i] || null 
      }));

      const getStatus = (santriId: string, date: string | null) => {
          if (!date) return "-";
          const log = subjectLogs.find(l => l.santri_id === santriId && l.created_at.startsWith(date));
          if (!log) return "-";
          if (log.status === 'Sakit') return <span className="text-red-500 font-bold">S</span>;
          if (log.status === 'Izin') return <span className="text-blue-500 font-bold">I</span>;
          if (log.status === 'Telat') return <span className="text-yellow-600 font-bold">T</span>;
          return <span className="text-green-500 font-bold">✓</span>;
      };

      const ikhwan = classStudents.filter(s => s.gender === 'ikhwan' || s.gender === 'L');
      const akhwat = classStudents.filter(s => s.gender === 'akhwat' || s.gender === 'P');

      const renderPertemuanTable = (students: Santri[], title: string, hoverColor: string, headerClass: string) => (
          <div className="mb-6 animate-in slide-in-from-bottom-4 duration-500">
              <h4 className={`text-sm font-bold uppercase mb-3 flex items-center gap-2 p-2 rounded-lg ${headerClass}`}>
                  <User size={16}/> {title} ({students.length})
              </h4>
              <div className="overflow-x-auto border-2 border-gray-200 rounded-xl bg-white shadow-sm">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                      <thead className="bg-gray-50 text-gray-700 uppercase font-bold border-b-2 border-gray-200">
                          <tr>
                              <th className="p-3 text-center w-10 border-r border-gray-200">No</th>
                              <th className="p-3 min-w-[200px] border-r border-gray-200">Nama Lengkap</th>
                              <th className="p-3 w-20 border-r border-gray-200 text-center">NIS</th>
                              {meetings.map((m, idx) => (
                                  <th key={idx} className="p-3 text-center w-16 border-r border-gray-200 text-xs bg-white" title={m.date || "Belum ada data"}>
                                      {m.label}
                                      {m.date && <span className="block text-[9px] font-normal text-gray-400 mt-1">{m.date.slice(5)}</span>}
                                  </th>
                              ))}
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {students.length === 0 ? (
                              <tr><td colSpan={3 + meetings.length} className="p-8 text-center text-gray-400 italic">Tidak ada santri.</td></tr>
                          ) : (
                              students.map((s, idx) => (
                                  <tr key={s.id} className={`${hoverColor} transition-colors`}>
                                      <td className="p-3 text-center border-r border-gray-100 text-gray-500 font-medium">{idx + 1}</td>
                                      <td className="p-3 border-r border-gray-100 font-bold text-gray-800">{s.nama_lengkap}</td>
                                      <td className="p-3 border-r border-gray-100 text-center text-gray-500 font-mono text-xs">{s.nis || '-'}</td>
                                      {meetings.map((m, mIdx) => (
                                          <td key={mIdx} className="p-3 border-r border-gray-100 text-center bg-gray-50/20">
                                              {getStatus(s.id, m.date)}
                                          </td>
                                      ))}
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      );

      return (
          <div className="space-y-2 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-green-50 p-4 rounded-xl border-2 border-green-200 shadow-sm">
                  <div className="flex items-center gap-4">
                      <Button variant="outline" size="sm" onClick={() => setSelectedKbmSubject(null)} className="bg-white border-green-200 hover:bg-green-100 text-green-700">
                          <ArrowLeft className="w-4 h-4 mr-2"/> Kembali
                      </Button>
                      <div>
                          <h3 className="font-extrabold text-green-900 text-lg flex items-center gap-2"><BookOpen size={18}/> {selectedKbmSubject.name}</h3>
                          <p className="text-xs font-bold text-green-700 mt-1">Kelas {selectedKbmClass.kelas}-{selectedKbmClass.rombel} • {classStudents.length} Total Santri</p>
                      </div>
                  </div>
              </div>

              {renderPertemuanTable(ikhwan, "Ikhwan", "hover:bg-green-50/50", "bg-green-100 text-green-800 border-l-4 border-green-600")}
              {renderPertemuanTable(akhwat, "Akhwat", "hover:bg-pink-50/50", "bg-pink-100 text-pink-800 border-l-4 border-pink-500")}
          </div>
      )
  };

  // --- TABEL LAMA UNTUK MENGAJI, SHOLAT, EKSKUL ---
  const WeeklyTable = ({ category, subjects }: { category: string, subjects: any[] }) => {
      const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
      const selectedDate = new Date(dateFilter);
      const isMengaji = category === 'mengaji';
      
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
          <div className="overflow-x-auto border-2 border-gray-200 rounded-lg bg-white shadow-sm mt-1 mb-4">
              <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-700 uppercase font-bold border-b-2 border-gray-200">
                      <tr>
                          <th className="p-2 border-r border-gray-200 w-8 text-center">No</th>
                          <th className="p-2 border-r border-gray-200 min-w-[150px]">Nama Lengkap</th>
                          {category !== 'guru' && <th className="p-2 border-r border-gray-200 w-20">NIS</th>}
                          {category !== 'guru' && <th className="p-2 border-r border-gray-200 w-16 text-center">Kls</th>}
                          {days.map(d => <th key={d} className="p-2 border-r border-gray-200 text-center w-8">{d.slice(0,3)}</th>)}
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {subjects.map((s, idx) => (
                          <tr key={s.id} className="hover:bg-gray-50">
                              <td className="p-2 text-center border-r border-gray-100">{idx + 1}</td>
                              <td className="p-2 border-r border-gray-100 font-medium truncate max-w-[150px]">{s.nama_lengkap || s.full_name}</td>
                              {category !== 'guru' && <td className="p-2 border-r border-gray-100 text-gray-500">{s.nis}</td>}
                              {category !== 'guru' && (
                                  <td className="p-2 border-r border-gray-100 text-center font-bold text-gray-700 bg-gray-50/50">
                                      {isMengaji ? s.kelas_mengaji : s.kelas}-{getRombel(isMengaji ? s.rombel_mengaji : s.rombel)}
                                  </td>
                              )}
                              {days.map((_, i) => (
                                  <td key={i} className="p-2 border-r border-gray-100 text-center bg-white">
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

  const MonthlyEkskulTable = ({ activityId }: { activityId: number }) => {
      const memberIds = members.filter(m => m.activity_id === activityId).map(m => m.santri_id);
      const subjectList = santriList.filter(s => memberIds.includes(s.id));
      const weeks = [1, 2, 3, 4];

      const getStatusOnWeek = (santriId: string, weekNum: number) => {
          const selectedDate = new Date(dateFilter);
          const startDay = (weekNum - 1) * 7 + 1;
          const endDay = startDay + 6;
          
          const relevantLogs = logs.filter(l => {
              const logDate = new Date(l.created_at);
              const day = logDate.getDate();
              const logMonth = logDate.getMonth();
              const filterMonth = selectedDate.getMonth();
              
              return l.santri_id === santriId && l.activity_id === activityId && logMonth === filterMonth && day >= startDay && day <= endDay;
          });

          if (relevantLogs.length === 0) return "-";
          if (relevantLogs.some(l => l.status === 'Sakit')) return <span className="text-red-500 font-bold">S</span>;
          if (relevantLogs.some(l => l.status === 'Izin')) return <span className="text-blue-500 font-bold">I</span>;
          return <span className="text-green-500 font-bold">✓</span>;
      };

      if (subjectList.length === 0) return <div className="text-center py-2 text-xs text-gray-400 italic">Belum ada anggota.</div>;

      return (
          <div className="overflow-x-auto border-2 border-gray-200 rounded-lg bg-white shadow-sm mt-2 mb-4">
              <table className="w-full text-xs text-left">
                  <thead className="bg-orange-50 text-orange-800 uppercase font-bold border-b-2 border-orange-200">
                      <tr>
                          <th className="p-2 border-r border-orange-100 w-8 text-center">No</th>
                          <th className="p-2 border-r border-orange-100 min-w-[150px]">Nama Anggota</th>
                          <th className="p-2 border-r border-orange-100 w-20">NIS</th>
                          <th className="p-2 border-r border-orange-100 w-16 text-center">Kls</th>
                          {weeks.map(w => <th key={w} className="p-2 border-r border-orange-100 text-center w-12">Min {w}</th>)}
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {subjectList.map((s, idx) => (
                          <tr key={s.id} className="hover:bg-orange-50/30">
                              <td className="p-2 text-center border-r border-gray-100">{idx + 1}</td>
                              <td className="p-2 border-r border-gray-100 font-medium">{s.nama_lengkap}</td>
                              <td className="p-2 border-r border-gray-100 text-gray-500">{s.nis}</td>
                              <td className="p-2 border-r border-gray-100 text-center font-bold bg-gray-50/50">
                                  {s.kelas}-{getRombel(s.rombel)}
                              </td>
                              {weeks.map(w => (
                                  <td key={w} className="p-2 border-r border-gray-100 text-center bg-white">
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

  const RenderClassTables = ({ category }: { category: string }) => {
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

      const isMengaji = category === 'mengaji';
      const classesToShow = filterKelas === 'all' ? CLASSES : [parseInt(filterKelas)];
      
      return (
          <div className="space-y-8">
              {classesToShow.map(cls => {
                  const classStudents = santriList.filter(s => isMengaji ? s.kelas_mengaji === cls : s.kelas === cls);
                  if (filterKelas === 'all' && classStudents.length === 0) return null;

                  const uniqueRombels = Array.from(new Set(classStudents.map(s => getRombel(isMengaji ? s.rombel_mengaji : s.rombel)))).sort();

                  return (
                      <div key={cls} className="animate-in fade-in slide-in-from-bottom-2 border p-4 rounded-xl bg-gray-50/50 shadow-sm">
                          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                              <Badge className="bg-green-700 text-base px-4 py-1.5 shadow-sm">Kelas {cls}</Badge>
                              <span className="text-sm text-gray-500 font-bold bg-white px-2 py-1 rounded border">
                                  {classStudents.length} Total Santri
                              </span>
                          </div>
                          
                          <div className="space-y-6">
                              {uniqueRombels.map(rombelName => {
                                  const rombelStudents = classStudents.filter(s => getRombel(isMengaji ? s.rombel_mengaji : s.rombel) === rombelName);
                                  const ikhwan = rombelStudents.filter(s => s.gender === 'ikhwan' || s.gender === 'L');
                                  const akhwat = rombelStudents.filter(s => s.gender === 'akhwat' || s.gender === 'P');

                                  if (rombelStudents.length === 0) return null;

                                  return (
                                      <div key={rombelName} className="border-2 border-green-100 p-4 rounded-xl bg-white shadow-sm">
                                          <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2 border-b border-green-50 pb-2">
                                              <Badge variant="outline" className="border-green-400 text-green-800 bg-green-50/50">
                                                  Rombel {rombelName}
                                              </Badge>
                                              <span className="text-xs text-gray-400 font-medium">({rombelStudents.length} Santri)</span>
                                          </h4>
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
                                  );
                              })}
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
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-green-100">
        <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FileSpreadsheet className="text-green-600" /> Monitoring Absensi
            </h1>
            <p className="text-xs text-gray-500">Pantau kehadiran KBM secara detail per pertemuan, atau historis mingguan/bulanan.</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
            <Calendar className="text-gray-500 w-4 h-4" />
            <input type="date" className="bg-transparent text-sm font-bold text-gray-700 outline-none" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        </div>
      </div>

      <Tabs defaultValue="santri" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100 p-1">
            <TabsTrigger value="santri" className="data-[state=active]:bg-green-600 data-[state=active]:text-white shadow-sm font-bold">Santri</TabsTrigger>
            <TabsTrigger value="guru" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white shadow-sm font-bold">Guru & Staf</TabsTrigger>
        </TabsList>

        <TabsContent value="santri" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ChartCard title="Grafik KBM" data={getStats('santri', 'kbm')} />
                <ChartCard title="Grafik Ibadah" data={getStats('santri', 'ibadah')} />
                <ChartCard title="Grafik Ekskul" data={getStats('santri', 'ekskul')} />
            </div>

            <div className="bg-white p-6 rounded-xl border border-green-100 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Users className="w-5 h-5 text-green-600"/> Rekap Absensi</h3>
                    {santriTab !== 'ekskul' && santriTab !== 'kbm' && (
                        <Select value={filterKelas} onValueChange={setFilterKelas}>
                            <SelectTrigger className="w-[150px] h-8 text-xs font-bold"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                            <SelectContent><SelectItem value="all">Semua Kelas</SelectItem>{CLASSES.map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}</SelectContent>
                        </Select>
                    )}
                </div>

                <Tabs defaultValue="kbm" value={santriTab} onValueChange={setSantriTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-green-50 p-1 rounded-lg mb-6 border border-green-100">
                        <TabsTrigger value="kbm" className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-[10px] md:text-sm font-bold transition-all">KBM Sekolah</TabsTrigger>
                        <TabsTrigger value="mengaji" className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-[10px] md:text-sm font-bold transition-all">Mengaji</TabsTrigger>
                        <TabsTrigger value="sholat" className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-[10px] md:text-sm font-bold transition-all">Sholat</TabsTrigger>
                        <TabsTrigger value="ekskul" className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-[10px] md:text-sm font-bold transition-all">Ekskul</TabsTrigger>
                    </TabsList>

                    <TabsContent value="kbm">{renderKbmFlow()}</TabsContent>
                    <TabsContent value="mengaji"><RenderClassTables category="mengaji" /></TabsContent>
                    <TabsContent value="sholat"><RenderClassTables category="sholat" /></TabsContent>
                    <TabsContent value="ekskul"><RenderClassTables category="ekskul" /></TabsContent>
                </Tabs>
            </div>

            <Card className="border-l-4 border-l-purple-500 bg-purple-50/30 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-purple-800 uppercase font-bold">Input Izin / Sakit Manual</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase">Kelas</label><Select value={formKelas} onValueChange={(v) => { setFormKelas(v); setFormSantriId(""); }}><SelectTrigger className="bg-white h-9 border-purple-200"><SelectValue placeholder="-" /></SelectTrigger><SelectContent>{CLASSES.map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase">Kategori</label><Select value={formGender} onValueChange={(v) => { setFormGender(v); setFormSantriId(""); }}><SelectTrigger className="bg-white h-9 border-purple-200"><SelectValue placeholder="-" /></SelectTrigger><SelectContent><SelectItem value="ikhwan">Ikhwan</SelectItem><SelectItem value="akhwat">Akhwat</SelectItem></SelectContent></Select></div>
                    <div className="md:col-span-2 space-y-1"><label className="text-[10px] font-bold uppercase">Nama Santri</label><Select value={formSantriId} onValueChange={setFormSantriId} disabled={!formKelas || !formGender}><SelectTrigger className="bg-white h-9 border-purple-200"><SelectValue placeholder="Pilih Nama..." /></SelectTrigger><SelectContent className="max-h-[200px]">{santriList.filter(s => String(s.kelas) === formKelas && (s.gender === formGender || (formGender==='ikhwan' ? s.gender==='L':s.gender==='P'))).map(s => (<SelectItem key={s.id} value={s.id}>{s.nama_lengkap} ({s.kelas}-{getRombel(s.rombel)})</SelectItem>))}</SelectContent></Select></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase">Status</label><Select value={formStatus} onValueChange={setFormStatus}><SelectTrigger className="bg-white h-9 border-purple-200"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Izin">Izin</SelectItem><SelectItem value="Sakit">Sakit</SelectItem></SelectContent></Select></div>
                    <div className="md:col-span-5 flex gap-2 mt-2"><Input placeholder="Keterangan (Opsional)" value={formKet} onChange={e => setFormKet(e.target.value)} className="bg-white h-9 text-sm w-full border-purple-200" /><Button onClick={() => handleSubmitPermission('santri')} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white w-32 shadow-md"><Save className="w-4 h-4 mr-2"/> Simpan</Button></div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-green-200">
                <CardHeader className="flex flex-row justify-between items-center bg-green-50/50 border-b border-green-100 pb-2 pt-3 px-4">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-green-800"><Clock className="w-4 h-4 text-green-600"/> Riwayat Absensi Hari Ini</CardTitle>
                    <Select value={logFilterKelas} onValueChange={setLogFilterKelas}><SelectTrigger className="w-[100px] h-7 text-[10px] bg-white font-bold border-green-200"><SelectValue placeholder="Filter" /></SelectTrigger><SelectContent><SelectItem value="all">Semua</SelectItem>{CLASSES.map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}</SelectContent></Select>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-100">
                        {dailyLogs.filter(l => l.santri_id).filter(l => logFilterKelas === 'all' || String(l.santri?.kelas) === logFilterKelas).length === 0 ? (
                             <div className="p-6 text-center text-xs text-gray-400 italic">Belum ada aktivitas absensi di hari ini.</div>
                        ) : (
                            dailyLogs.filter(l => l.santri_id).filter(l => logFilterKelas === 'all' || String(l.santri?.kelas) === logFilterKelas).map((log) => (
                                <div key={log.id} className="flex items-center justify-between p-3 px-4 hover:bg-green-50/50 transition-colors">
                                    <div className="flex items-center gap-3"><div className={`p-1.5 rounded-full shadow-sm border ${log.status === 'Hadir' ? 'bg-green-100 text-green-600 border-green-200' : 'bg-red-100 text-red-600 border-red-200'}`}>{log.status === 'Hadir' ? <CheckCircle2 size={16}/> : <XCircle size={16}/>}</div><div><p className="font-bold text-gray-800 text-sm">{log.santri?.nama_lengkap}</p><div className="flex gap-2 text-[10px] text-gray-500 mt-0.5"><span className="bg-gray-100 px-1.5 rounded font-bold border">Kls {log.santri?.kelas}-{getRombel(log.santri?.rombel)}</span><span>• {log.activity?.name || "Manual"}</span><span className="flex items-center gap-1"><MapPin size={10}/> {log.location?.name || "-"}</span></div></div></div>
                                    <div className="text-right"><span className="font-mono font-bold text-gray-700 block text-xs mb-1">{log.scan_time.slice(0,5)}</span><Badge variant="outline" className={`text-[9px] h-4 px-1 ${log.status === 'Hadir' ? 'text-green-600 border-green-200 bg-green-50' : 'text-red-600 border-red-200 bg-red-50'}`}>{log.status}</Badge></div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="guru" className="space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ChartCard title="Kehadiran Mengajar (KBM)" data={getStats('guru', 'kbm')} />
                <ChartCard title="Kehadiran Kegiatan Lain" data={getStats('guru', 'ibadah')} />
            </div>
            <div className="bg-white p-6 rounded-xl border border-teal-100 shadow-sm">
                <h3 className="font-bold text-lg text-teal-800 flex items-center gap-2 mb-4"><FileSpreadsheet className="w-5 h-5 text-teal-600"/> Rekap Mingguan Guru</h3>
                <WeeklyTable category="guru" subjects={teacherList} />
            </div>
            <Card className="shadow-sm border-teal-200">
                <CardHeader className="bg-teal-50/50 border-b border-teal-100 pb-2 pt-3 px-4"><CardTitle className="text-sm font-bold text-teal-800">Log Absensi Guru</CardTitle></CardHeader>
                <CardContent className="p-0">
                    <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-100">
                        {dailyLogs.filter(l => l.teacher_id).length === 0 ? (
                            <div className="p-6 text-center text-xs text-gray-400 italic">Belum ada absensi guru hari ini.</div>
                        ) : (
                            dailyLogs.filter(l => l.teacher_id).map((log) => (<div key={log.id} className="flex items-center justify-between p-3 px-4 hover:bg-teal-50/50 transition-colors"><div className="flex items-center gap-3"><div className="p-2 rounded-full bg-teal-100 text-teal-700 shadow-sm border border-teal-200"><User size={16}/></div><div><p className="font-bold text-gray-800 text-sm">{log.teacher?.full_name}</p><p className="text-[10px] text-gray-500 mt-0.5">{log.activity?.name}</p></div></div><div className="text-right"><span className="font-mono font-bold block text-gray-700 text-xs mb-1">{log.scan_time.slice(0,5)}</span><Badge className="bg-teal-600 text-[9px] h-4 px-1 shadow-sm">{log.status}</Badge></div></div>))
                        )}
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default AttendanceMonitoring;
