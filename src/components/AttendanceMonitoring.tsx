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
  CheckCircle2, XCircle, Clock, FileSpreadsheet, Users, Trophy, BookOpen, GraduationCap, ArrowLeft, ArrowRight, Moon, Sunrise
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from "recharts";

/* ================= TYPES ================= */
interface Santri { 
  id: string; nama_lengkap: string; kelas: number; gender: string; nis: string;
  rombel?: any; kelas_mengaji?: number; rombel_mengaji?: any;
}
interface Teacher { id: number; full_name: string; nip: string; gender: string; }
interface Activity { id: number; name: string; category: string; }
interface ActivityMember { activity_id: number; santri_id: string; }
interface AttendanceLog {
  id: string; scan_time: string; status: string; created_at: string;
  santri_id?: string; teacher_id?: number; activity_id?: number; location_id?: number;
  santri?: { nama_lengkap: string; kelas: number; nis: string; gender: string; rombel?: any; kelas_mengaji?: number; rombel_mengaji?: any; };
  teacher?: { full_name: string; }; activity?: { name: string; category: string }; location?: { name: string }; keterangan?: string;
}

const COLORS = ['#22c55e', '#eab308', '#ef4444', '#3b82f6'];
const CLASSES = [7, 8, 9, 10, 11, 12];

// Komponen Pengganti Sunset sementara lucide-react versi lama
const Sunset = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 10V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h20"/><path d="m17.66 12.34 1.41-1.41"/><path d="M22 22H2"/><path d="M8 6l4-4 4 4"/><path d="M16 18a4 4 0 0 0-8 0"/></svg>;

const AttendanceMonitoring = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("santri");
  const [santriTab, setSantriTab] = useState("kbm");
  const [guruTab, setGuruTab] = useState("kbm");
  
  // States Alur Multi-Tahap Santri
  const [selectedKbmClass, setSelectedKbmClass] = useState<any>(null);
  const [selectedKbmSubject, setSelectedKbmSubject] = useState<Activity | null>(null);
  
  const [selectedMengajiClass, setSelectedMengajiClass] = useState<any>(null);
  const [selectedMengajiTime, setSelectedMengajiTime] = useState<string | null>(null);

  const [selectedSholatClass, setSelectedSholatClass] = useState<any>(null);
  const [selectedSholatTime, setSelectedSholatTime] = useState<string | null>(null);
  const [selectedSholatWeek, setSelectedSholatWeek] = useState<number>(0);

  const [selectedEkskul, setSelectedEkskul] = useState<Activity | null>(null);
  const [selectedEkskulClass, setSelectedEkskulClass] = useState<any>(null);

  // Data Master & Filter
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [teacherList, setTeacherList] = useState<Teacher[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [members, setMembers] = useState<ActivityMember[]>([]);
  
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [filterKelas, setFilterKelas] = useState("all");
  const [logFilterKelas, setLogFilterKelas] = useState("all");
  
  // Form Manual State
  const [formKelas, setFormKelas] = useState("");
  const [formGender, setFormGender] = useState("");
  const [formSantriId, setFormSantriId] = useState("");
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formStatus, setFormStatus] = useState("Izin");
  const [formKet, setFormKet] = useState("");

  const getRombel = (rombelData: any) => {
      if (!rombelData) return 'A'; 
      if (typeof rombelData === 'string') return rombelData;
      if (typeof rombelData === 'object' && rombelData.nama) return rombelData.nama;
      return 'A';
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const selectedDate = new Date(dateFilter);
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

      const { data: logData } = await supabase.from('attendance_logs').select(`id, scan_time, status, created_at, santri_id, teacher_id, activity_id, location_id, santri:santri_2025_12_01_21_34(nama_lengkap, kelas, nis, gender, rombel, kelas_mengaji, rombel_mengaji), teacher:teachers(full_name), activity:activity_id(name, category), location:location_id(name)`).gte('created_at', startOfMonth.toISOString()).lte('created_at', endOfMonth.toISOString() + 'T23:59:59');
      if (logData) setLogs(logData as any);

      const { data: sData } = await supabase.from('santri_2025_12_01_21_34').select('id, nama_lengkap, kelas, nis, gender, rombel, kelas_mengaji, rombel_mengaji').eq('status', 'aktif');
      if (sData) setSantriList(sData as any);

      const { data: tData } = await supabase.from('teachers').select('*').eq('is_active', true);
      if (tData) setTeacherList(tData);

      const { data: actData } = await supabase.from('activities').select('*');
      if (actData) setActivities(actData);

      const { data: memData } = await supabase.from('activity_members').select('*');
      if (memData) setMembers(memData);

    } catch (err: any) { } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [dateFilter]);

  useEffect(() => {
     setSelectedKbmClass(null); setSelectedKbmSubject(null);
     setSelectedMengajiClass(null); setSelectedMengajiTime(null);
     setSelectedSholatClass(null); setSelectedSholatTime(null);
     setSelectedEkskul(null); setSelectedEkskulClass(null);
  }, [santriTab]);

  const dailyLogs = logs.filter(l => l.created_at?.startsWith(dateFilter) || l.scan_time?.startsWith(dateFilter));

  /* ================= LOGIC HELPER & CHART ================= */
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
          } else {
              if (!formTeacherId) return toast({title: "Pilih Guru", variant: "destructive"});
              payload.teacher_id = parseInt(formTeacherId);
          }
          const { error } = await supabase.from('attendance_logs').insert([payload]);
          if (error) throw error;
          toast({ title: "Berhasil", description: "Data izin/sakit tersimpan." });
          fetchData();
          setFormSantriId(""); setFormTeacherId(""); setFormKet("");
      } catch (err: any) {
          toast({ title: "Gagal", description: err.message, variant: "destructive" });
      }
  };

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

  const getStatusIcon = (status: string) => {
      if (status === 'Sakit') return <span className="text-red-500 font-bold">S</span>;
      if (status === 'Izin') return <span className="text-blue-500 font-bold">I</span>;
      if (status === 'Telat') return <span className="text-yellow-600 font-bold">T</span>;
      if (status === 'Hadir') return <span className="text-green-500 font-bold">✓</span>;
      return "-";
  };
  
  // --- FUNGSI TABEL GURU ---
  const TeacherWeeklyTable = ({ category }: { category: string }) => {
      const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
      const selectedDate = new Date(dateFilter);
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + 1);

      const getStatusOnDay = (id: number, dayIndex: number) => {
          const targetDate = new Date(startOfWeek);
          targetDate.setDate(startOfWeek.getDate() + dayIndex);
          const dateStr = targetDate.toISOString().split('T')[0];

          const relevantLogs = logs.filter(l => {
              const logDate = l.created_at?.split('T')[0];
              return l.teacher_id === id && logDate === dateStr && getActivityType(l) === category;
          });

          if (relevantLogs.length === 0) return "-";
          if (relevantLogs.some(l => l.status === 'Sakit')) return <span className="text-red-500 font-bold">S</span>;
          if (relevantLogs.some(l => l.status === 'Izin')) return <span className="text-blue-500 font-bold">I</span>;
          if (relevantLogs.some(l => l.status === 'Telat')) return <span className="text-yellow-600 font-bold">T</span>;
          return <span className="text-green-500 font-bold">✓</span>;
      };

      if (teacherList.length === 0) return <div className="text-center py-2 text-xs text-gray-400 italic">Data guru kosong.</div>;

      return (
          <div className="overflow-x-auto border-2 border-teal-200 rounded-xl bg-white shadow-sm mt-1 mb-4">
              <table className="w-full text-xs text-left">
                  <thead className="bg-teal-50 text-teal-800 uppercase font-bold border-b-2 border-teal-200">
                      <tr>
                          <th className="p-3 border-r border-teal-100 w-8 text-center">No</th>
                          <th className="p-3 border-r border-teal-100 min-w-[200px]">Nama Guru</th>
                          {days.map(d => <th key={d} className="p-3 border-r border-teal-100 text-center w-12">{d.slice(0,3)}</th>)}
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {teacherList.map((t, idx) => (
                          <tr key={t.id} className="hover:bg-teal-50/30">
                              <td className="p-3 text-center border-r border-gray-100 text-gray-500 font-medium">{idx + 1}</td>
                              <td className="p-3 border-r border-gray-100 font-bold text-gray-800">{t.full_name}</td>
                              {days.map((_, i) => (
                                  <td key={i} className="p-3 border-r border-gray-100 text-center bg-white text-sm">
                                      {getStatusOnDay(t.id, i)}
                                  </td>
                              ))}
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      );
  };

  const renderStudentTable = (students: Santri[], title: string, colorClass: string, cols: any[], getStatus: (id: string, key: string) => any) => {
    return (
        <div className="mb-6 animate-in slide-in-from-bottom-4 duration-500">
            <h4 className={`text-sm font-bold uppercase mb-3 flex items-center gap-2 p-2 rounded-lg ${colorClass}`}>
                <User size={16}/> {title} ({students.length})
            </h4>
            <div className="overflow-x-auto border-2 border-green-200 rounded-xl bg-white shadow-sm">
                <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-green-50 text-green-800 uppercase font-bold border-b-2 border-green-200">
                        <tr>
                            <th className="p-3 text-center w-10 border-r border-green-100">No</th>
                            <th className="p-3 min-w-[200px] border-r border-green-100">Nama Lengkap</th>
                            <th className="p-3 w-20 border-r border-green-100 text-center">NIS</th>
                            {cols.map((c, i) => (
                                <th key={i} className="p-3 text-center border-r border-green-100 text-xs bg-white" title={c.tooltip}>
                                    {c.label}
                                    {c.subLabel && <span className="block text-[9px] font-normal text-gray-400 mt-1">{c.subLabel}</span>}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {students.length === 0 ? (
                            <tr><td colSpan={3+cols.length} className="p-8 text-center text-gray-400 italic">Tidak ada santri.</td></tr>
                        ) : students.map((s, idx) => (
                            <tr key={s.id} className="hover:bg-green-50/50 transition-colors">
                                <td className="p-3 text-center border-r border-gray-100 text-gray-500 font-medium">{idx+1}</td>
                                <td className="p-3 border-r border-gray-100 font-bold text-gray-800">{s.nama_lengkap}</td>
                                <td className="p-3 border-r border-gray-100 text-center text-gray-500 font-mono text-xs">{s.nis || '-'}</td>
                                {cols.map((c, i) => (
                                    <td key={i} className="p-3 border-r border-gray-100 text-center bg-gray-50/20">
                                        {getStatus(s.id, c.key)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
  };

  /* ================= RENDER FLOW KBM SANTRI ================= */
  const renderKbmFlow = () => {
      if (!selectedKbmClass) {
          const classMap = new Map();
          santriList.forEach(s => {
              const k = s.kelas; const r = getRombel(s.rombel); const key = `${k}-${r}`;
              if (!classMap.has(key)) classMap.set(key, { kelas: k, rombel: r, count: 0 });
              classMap.get(key).count++;
          });
          const uniqueClasses = Array.from(classMap.values()).sort((a,b) => a.kelas === b.kelas ? a.rombel.localeCompare(b.rombel) : a.kelas - b.kelas);

          return (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <h3 className="font-bold text-green-800 flex items-center gap-2 mb-4 border-b border-green-200 pb-2"><GraduationCap className="text-green-600"/> Pilih Kelas KBM</h3>
                  <div className="flex flex-col gap-3">
                      {uniqueClasses.map(c => (
                          <div key={`${c.kelas}-${c.rombel}`} onClick={() => setSelectedKbmClass(c)} className="flex items-center justify-between p-4 bg-white border-2 border-green-100 rounded-xl cursor-pointer hover:border-green-500 hover:bg-green-50 hover:shadow-md transition-all group">
                              <div className="flex items-center gap-4"><div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-colors shadow-sm"><Users size={24} /></div><div><h4 className="font-extrabold text-lg text-gray-800">Kelas {c.kelas} - {c.rombel}</h4><p className="text-xs font-medium text-gray-500">{c.count} Santri</p></div></div>
                              <div className="text-green-500 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all"><ArrowRight /></div>
                          </div>
                      ))}
                  </div>
              </div>
          )
      }

      if (!selectedKbmSubject) {
          const subjects = activities.filter(a => a.category === 'pelajaran');
          return (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center gap-3 mb-4 border-b border-green-200 pb-3">
                      <Button variant="outline" size="sm" onClick={() => setSelectedKbmClass(null)} className="hover:bg-green-50 border-green-200 text-green-700"><ArrowLeft className="w-4 h-4 mr-2"/> Kembali</Button>
                      <h3 className="font-bold text-green-800 flex items-center gap-2">Pilih Pelajaran <Badge className="bg-green-600 ml-2 shadow-sm">Kls {selectedKbmClass.kelas}-{selectedKbmClass.rombel}</Badge></h3>
                  </div>
                  <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto pr-2 pb-2">
                      {subjects.length === 0 ? (<div className="text-center p-8 text-gray-400 border-2 border-dashed border-green-200 rounded-xl bg-green-50">Belum ada mata pelajaran.</div>) : subjects.map(s => (
                          <div key={s.id} onClick={() => setSelectedKbmSubject(s)} className="flex items-center p-3 bg-white border-2 border-green-100 rounded-xl cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all group shadow-sm">
                              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mr-4 group-hover:bg-green-600 group-hover:text-white transition-colors border border-green-200"><BookOpen size={20} /></div>
                              <h4 className="font-bold text-sm text-gray-800 flex-1">{s.name}</h4><Badge variant="outline" className="border-green-300 text-green-700 bg-green-50 mr-2">{s.category}</Badge>
                              <div className="text-green-400 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight size={18}/></div>
                          </div>
                      ))}
                  </div>
              </div>
          )
      }

      const classStudents = santriList.filter(s => s.kelas === selectedKbmClass.kelas && getRombel(s.rombel) === selectedKbmClass.rombel);
      const subjectLogs = logs.filter(l => l.activity_id === selectedKbmSubject.id && l.santri?.kelas === selectedKbmClass.kelas && getRombel(l.santri?.rombel) === selectedKbmClass.rombel);
      const uniqueDates = Array.from(new Set(subjectLogs.map(l => l.created_at.split('T')[0]))).sort();
      const meetingCount = Math.max(uniqueDates.length, 8);
      const columns = Array.from({length: meetingCount}, (_, i) => ({ key: uniqueDates[i] || `null-${i}`, label: `Per-${i+1}`, subLabel: uniqueDates[i] ? uniqueDates[i].slice(5) : '', tooltip: uniqueDates[i] || 'Belum ada data' }));

      const getStatus = (santriId: string, dateKey: string) => {
          if (dateKey.startsWith('null')) return "-";
          const log = subjectLogs.find(l => l.santri_id === santriId && l.created_at.startsWith(dateKey));
          return log ? getStatusIcon(log.status) : "-";
      };

      const ikhwan = classStudents.filter(s => s.gender === 'ikhwan' || s.gender === 'L');
      const akhwat = classStudents.filter(s => s.gender === 'akhwat' || s.gender === 'P');

      return (
          <div className="space-y-2 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-4 mb-4 bg-green-50 p-4 rounded-xl border-2 border-green-200 shadow-sm">
                  <Button variant="outline" size="sm" onClick={() => setSelectedKbmSubject(null)} className="bg-white border-green-200 text-green-700"><ArrowLeft className="w-4 h-4 mr-2"/> Kembali</Button>
                  <div><h3 className="font-extrabold text-green-900 text-lg flex items-center gap-2"><BookOpen size={18}/> {selectedKbmSubject.name}</h3><p className="text-xs font-bold text-green-700 mt-1">Kelas {selectedKbmClass.kelas}-{selectedKbmClass.rombel} • {classStudents.length} Santri</p></div>
              </div>
              {renderStudentTable(ikhwan, "Ikhwan", "bg-green-100 text-green-800 border-l-4 border-green-600", columns, getStatus)}
              {renderStudentTable(akhwat, "Akhwat", "bg-pink-100 text-pink-800 border-l-4 border-pink-500", columns, getStatus)}
          </div>
      )
  };

  /* ================= RENDER FLOW MENGAJI SANTRI ================= */
  const renderMengajiFlow = () => {
      if (!selectedMengajiClass) {
          const classMap = new Map();
          santriList.forEach(s => {
              const k = s.kelas_mengaji || s.kelas; const r = getRombel(s.rombel_mengaji || s.rombel); const key = `${k}-${r}`;
              if (!classMap.has(key)) classMap.set(key, { kelas: k, rombel: r, count: 0 });
              classMap.get(key).count++;
          });
          const uniqueClasses = Array.from(classMap.values()).sort((a,b) => a.kelas === b.kelas ? a.rombel.localeCompare(b.rombel) : a.kelas - b.kelas);

          return (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <h3 className="font-bold text-green-800 flex items-center gap-2 mb-4 border-b border-green-200 pb-2"><BookOpen className="text-green-600"/> Pilih Kelas Mengaji</h3>
                  <div className="flex flex-col gap-3">
                      {uniqueClasses.map(c => (
                          <div key={`${c.kelas}-${c.rombel}`} onClick={() => setSelectedMengajiClass(c)} className="flex items-center justify-between p-4 bg-white border-2 border-green-100 rounded-xl cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all group">
                              <div className="flex items-center gap-4"><div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors"><BookOpen size={24} /></div><div><h4 className="font-extrabold text-lg text-gray-800">Kelas {c.kelas} - {c.rombel}</h4><p className="text-xs font-medium text-gray-500">{c.count} Santri</p></div></div>
                              <div className="text-green-500 opacity-50 group-hover:opacity-100 transition-all"><ArrowRight /></div>
                          </div>
                      ))}
                  </div>
              </div>
          )
      }

      if (!selectedMengajiTime) {
          const times = [
              { name: "Ba'da Pagi", icon: <Sunrise size={24}/>, color: "text-orange-500 bg-orange-50 border-orange-200 group-hover:bg-orange-500" },
              { name: "Ba'da Maghrib", icon: <Sunset size={24}/>, color: "text-purple-600 bg-purple-50 border-purple-200 group-hover:bg-purple-600" },
              { name: "Ba'da Isya", icon: <Moon size={24}/>, color: "text-indigo-600 bg-indigo-50 border-indigo-200 group-hover:bg-indigo-600" }
          ];
          return (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center gap-3 mb-4 border-b border-green-200 pb-3">
                      <Button variant="outline" size="sm" onClick={() => setSelectedMengajiClass(null)} className="hover:bg-green-50 border-green-200 text-green-700"><ArrowLeft className="w-4 h-4 mr-2"/> Kembali</Button>
                      <h3 className="font-bold text-green-800 flex items-center gap-2">Pilih Waktu Mengaji <Badge className="bg-blue-600 ml-2">Kls {selectedMengajiClass.kelas}-{selectedMengajiClass.rombel}</Badge></h3>
                  </div>
                  <div className="flex flex-col gap-3">
                      {times.map(t => (
                          <div key={t.name} onClick={() => setSelectedMengajiTime(t.name)} className="flex items-center p-4 bg-white border-2 border-green-100 rounded-xl cursor-pointer hover:border-green-500 transition-all group shadow-sm">
                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 transition-colors border ${t.color} group-hover:text-white`}>{t.icon}</div>
                              <h4 className="font-bold text-lg text-gray-800 flex-1">{t.name}</h4>
                              <div className="text-green-400 opacity-0 group-hover:opacity-100 transition-opacity"><ArrowRight size={20}/></div>
                          </div>
                      ))}
                  </div>
              </div>
          )
      }

      const classStudents = santriList.filter(s => (s.kelas_mengaji || s.kelas) === selectedMengajiClass.kelas && getRombel(s.rombel_mengaji || s.rombel) === selectedMengajiClass.rombel);
      const year = new Date(dateFilter).getFullYear(); const month = new Date(dateFilter).getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const columns = Array.from({length: daysInMonth}, (_, i) => ({ key: String(i+1), label: String(i+1) }));

      const getStatus = (santriId: string, day: string) => {
          const targetDateStr = `${year}-${String(month+1).padStart(2,'0')}-${day.padStart(2,'0')}`;
          const log = logs.find(l => l.santri_id === santriId && l.activity?.name === selectedMengajiTime && l.created_at.startsWith(targetDateStr));
          return log ? getStatusIcon(log.status) : "-";
      };

      const ikhwan = classStudents.filter(s => s.gender === 'ikhwan' || s.gender === 'L');
      const akhwat = classStudents.filter(s => s.gender === 'akhwat' || s.gender === 'P');

      return (
          <div className="space-y-2 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-4 mb-4 bg-green-50 p-4 rounded-xl border-2 border-green-200 shadow-sm">
                  <Button variant="outline" size="sm" onClick={() => setSelectedMengajiTime(null)} className="bg-white border-green-200 text-green-700"><ArrowLeft className="w-4 h-4 mr-2"/> Kembali</Button>
                  <div><h3 className="font-extrabold text-green-900 text-lg">Ngaji {selectedMengajiTime}</h3><p className="text-xs font-bold text-green-700 mt-1">Kelas {selectedMengajiClass.kelas}-{selectedMengajiClass.rombel} • Skala Bulanan</p></div>
              </div>
              {renderStudentTable(ikhwan, "Ikhwan", "bg-green-100 text-green-800 border-l-4 border-green-600", columns, getStatus)}
              {renderStudentTable(akhwat, "Akhwat", "bg-pink-100 text-pink-800 border-l-4 border-pink-500", columns, getStatus)}
          </div>
      )
  };

  /* ================= RENDER FLOW SHOLAT SANTRI ================= */
  const renderSholatFlow = () => {
      if (!selectedSholatClass) {
          const classMap = new Map();
          santriList.forEach(s => {
              const k = s.kelas; const r = getRombel(s.rombel); const key = `${k}-${r}`;
              if (!classMap.has(key)) classMap.set(key, { kelas: k, rombel: r, count: 0 });
              classMap.get(key).count++;
          });
          const uniqueClasses = Array.from(classMap.values()).sort((a,b) => a.kelas === b.kelas ? a.rombel.localeCompare(b.rombel) : a.kelas - b.kelas);

          return (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <h3 className="font-bold text-green-800 flex items-center gap-2 mb-4 border-b border-green-200 pb-2"><Moon className="text-green-600"/> Pilih Kelas (Sholat)</h3>
                  <div className="flex flex-col gap-3">
                      {uniqueClasses.map(c => (
                          <div key={`${c.kelas}-${c.rombel}`} onClick={() => setSelectedSholatClass(c)} className="flex items-center justify-between p-4 bg-white border-2 border-green-100 rounded-xl cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all group">
                              <div className="flex items-center gap-4"><div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors"><Users size={24} /></div><div><h4 className="font-extrabold text-lg text-gray-800">Kelas {c.kelas} - {c.rombel}</h4></div></div>
                              <div className="text-green-500 opacity-50 group-hover:opacity-100 transition-all"><ArrowRight /></div>
                          </div>
                      ))}
                  </div>
              </div>
          )
      }

      if (!selectedSholatTime) {
          const times = ["Subuh", "Dzuhur", "Ashar", "Maghrib", "Isya"];
          return (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center gap-3 mb-4 border-b border-green-200 pb-3">
                      <Button variant="outline" size="sm" onClick={() => setSelectedSholatClass(null)} className="hover:bg-green-50"><ArrowLeft className="w-4 h-4 mr-2"/> Kembali</Button>
                      <h3 className="font-bold text-green-800 flex items-center gap-2">Pilih Waktu Sholat <Badge className="bg-teal-600 ml-2">Kls {selectedSholatClass.kelas}-{selectedSholatClass.rombel}</Badge></h3>
                  </div>
                  <div className="flex flex-col gap-3">
                      {times.map(t => (
                          <div key={t} onClick={() => setSelectedSholatTime(t)} className="flex items-center p-4 bg-white border-2 border-green-100 rounded-xl cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all group">
                              <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center mr-4 group-hover:bg-teal-600 group-hover:text-white transition-colors"><Moon size={20} /></div>
                              <h4 className="font-bold text-lg text-gray-800 flex-1">Sholat {t}</h4>
                              <div className="text-green-400 opacity-0 group-hover:opacity-100"><ArrowRight size={20}/></div>
                          </div>
                      ))}
                  </div>
              </div>
          )
      }

      const classStudents = santriList.filter(s => s.kelas === selectedSholatClass.kelas && getRombel(s.rombel) === selectedSholatClass.rombel);
      const year = new Date(dateFilter).getFullYear(); const month = new Date(dateFilter).getMonth();
      const firstDayOfMonth = new Date(year, month, 1);
      const dayOfWeek = firstDayOfMonth.getDay(); 
      const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
      const startOfGrid = new Date(year, month, 1);
      startOfGrid.setDate(startOfGrid.getDate() - offset); 
      const weekStart = new Date(startOfGrid);
      weekStart.setDate(weekStart.getDate() + (selectedSholatWeek * 7));

      const daysList = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
      const columns = daysList.map((d, i) => {
          const cellDate = new Date(weekStart); cellDate.setDate(cellDate.getDate() + i);
          return { key: String(i), label: d, subLabel: cellDate.getDate().toString().padStart(2,'0') };
      });

      const getStatus = (santriId: string, dayIndexStr: string) => {
          const cellDate = new Date(weekStart); cellDate.setDate(cellDate.getDate() + parseInt(dayIndexStr));
          const dateStr = cellDate.toISOString().split('T')[0];
          const log = logs.find(l => l.santri_id === santriId && l.activity?.name?.includes(selectedSholatTime) && l.created_at.startsWith(dateStr));
          return log ? getStatusIcon(log.status) : "-";
      };

      const ikhwan = classStudents.filter(s => s.gender === 'ikhwan' || s.gender === 'L');
      const akhwat = classStudents.filter(s => s.gender === 'akhwat' || s.gender === 'P');

      return (
          <div className="space-y-2 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-green-50 p-4 rounded-xl border-2 border-green-200 shadow-sm">
                  <div className="flex items-center gap-4">
                      <Button variant="outline" size="sm" onClick={() => setSelectedSholatTime(null)} className="bg-white border-green-200 text-green-700"><ArrowLeft className="w-4 h-4 mr-2"/> Kembali</Button>
                      <div><h3 className="font-extrabold text-green-900 text-lg">Sholat {selectedSholatTime}</h3><p className="text-xs font-bold text-green-700 mt-1">Kelas {selectedSholatClass.kelas}-{selectedSholatClass.rombel}</p></div>
                  </div>
                  <Select value={String(selectedSholatWeek)} onValueChange={v => setSelectedSholatWeek(parseInt(v))}>
                      <SelectTrigger className="w-[150px] bg-white border-green-300 font-bold text-green-800"><SelectValue/></SelectTrigger>
                      <SelectContent>
                          {[0,1,2,3,4].map(w => <SelectItem key={w} value={String(w)}>Minggu Ke-{w+1}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
              {renderStudentTable(ikhwan, "Ikhwan", "bg-green-100 text-green-800 border-l-4 border-green-600", columns, getStatus)}
              {renderStudentTable(akhwat, "Akhwat", "bg-pink-100 text-pink-800 border-l-4 border-pink-500", columns, getStatus)}
          </div>
      )
  };

  /* ================= RENDER FLOW EKSKUL SANTRI ================= */
  const renderEkskulFlow = () => {
      if (!selectedEkskul) {
          const ekskuls = activities.filter(a => a.category !== 'pelajaran' && a.category !== 'ibadah' && !a.name.toLowerCase().includes('sholat') && !a.name.toLowerCase().includes('ngaji'));
          return (
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <h3 className="font-bold text-green-800 flex items-center gap-2 mb-4 border-b border-green-200 pb-2"><Trophy className="text-green-600"/> Pilih Ekstrakurikuler</h3>
                  <div className="flex flex-col gap-3">
                      {ekskuls.length === 0 ? <div className="text-center p-8 text-gray-400 border-2 border-dashed border-green-200 rounded-xl bg-green-50">Belum ada data ekskul.</div> : ekskuls.map(e => {
                          const isPilihan = members.some(m => m.activity_id === e.id);
                          return (
                              <div key={e.id} onClick={() => setSelectedEkskul(e)} className="flex items-center justify-between p-4 bg-white border-2 border-green-100 rounded-xl cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all group shadow-sm">
                                  <div className="flex items-center gap-4"><div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors"><Trophy size={24} /></div><div><h4 className="font-extrabold text-lg text-gray-800">{e.name}</h4><Badge variant="outline" className={`mt-1 ${isPilihan ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{isPilihan ? 'Ekskul Pilihan' : 'Ekskul Wajib'}</Badge></div></div>
                                  <div className="text-green-500 opacity-50 group-hover:opacity-100 transition-all"><ArrowRight /></div>
                              </div>
                          )
                      })}
                  </div>
              </div>
          )
      }

      const isPilihan = members.some(m => m.activity_id === selectedEkskul.id);

      if (!isPilihan && !selectedEkskulClass) {
          const classMap = new Map();
          santriList.forEach(s => {
              const k = s.kelas; const r = getRombel(s.rombel); const key = `${k}-${r}`;
              if (!classMap.has(key)) classMap.set(key, { kelas: k, rombel: r, count: 0 });
              classMap.get(key).count++;
          });
          const uniqueClasses = Array.from(classMap.values()).sort((a,b) => a.kelas === b.kelas ? a.rombel.localeCompare(b.rombel) : a.kelas - b.kelas);

          return (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center gap-3 mb-4 border-b border-green-200 pb-3">
                      <Button variant="outline" size="sm" onClick={() => setSelectedEkskul(null)} className="hover:bg-green-50"><ArrowLeft className="w-4 h-4 mr-2"/> Kembali</Button>
                      <h3 className="font-bold text-green-800 flex items-center gap-2">Pilih Kelas <Badge className="bg-orange-600 ml-2">{selectedEkskul.name}</Badge></h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {uniqueClasses.map(c => (
                          <div key={`${c.kelas}-${c.rombel}`} onClick={() => setSelectedEkskulClass(c)} className="bg-white border-2 border-green-100 rounded-xl p-4 text-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all shadow-sm">
                              <h4 className="font-extrabold text-lg text-gray-800 mb-1">Kelas {c.kelas}-{c.rombel}</h4>
                              <p className="text-xs text-gray-500">{c.count} Santri</p>
                          </div>
                      ))}
                  </div>
              </div>
          )
      }

      let classStudents: Santri[] = [];
      if (isPilihan) {
          const memberIds = members.filter(m => m.activity_id === selectedEkskul.id).map(m => m.santri_id);
          classStudents = santriList.filter(s => memberIds.includes(s.id));
      } else {
          classStudents = santriList.filter(s => s.kelas === selectedEkskulClass.kelas && getRombel(s.rombel) === selectedEkskulClass.rombel);
      }

      const subjectLogs = logs.filter(l => l.activity_id === selectedEkskul.id && classStudents.some(cs => cs.id === l.santri_id));
      const uniqueDates = Array.from(new Set(subjectLogs.map(l => l.created_at.split('T')[0]))).sort();
      const meetingCount = Math.max(uniqueDates.length, 6);
      const columns = Array.from({length: meetingCount}, (_, i) => ({ key: uniqueDates[i] || `null-${i}`, label: `Per-${i+1}`, subLabel: uniqueDates[i] ? uniqueDates[i].slice(5) : '' }));

      const getStatus = (santriId: string, dateKey: string) => {
          if (dateKey.startsWith('null')) return "-";
          const log = subjectLogs.find(l => l.santri_id === santriId && l.created_at.startsWith(dateKey));
          return log ? getStatusIcon(log.status) : "-";
      };

      const ikhwan = classStudents.filter(s => s.gender === 'ikhwan' || s.gender === 'L');
      const akhwat = classStudents.filter(s => s.gender === 'akhwat' || s.gender === 'P');

      return (
          <div className="space-y-2 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-4 mb-4 bg-green-50 p-4 rounded-xl border-2 border-green-200 shadow-sm">
                  <Button variant="outline" size="sm" onClick={() => isPilihan ? setSelectedEkskul(null) : setSelectedEkskulClass(null)} className="bg-white border-green-200 text-green-700"><ArrowLeft className="w-4 h-4 mr-2"/> Kembali</Button>
                  <div><h3 className="font-extrabold text-green-900 text-lg flex items-center gap-2"><Trophy size={18}/> {selectedEkskul.name}</h3><p className="text-xs font-bold text-green-700 mt-1">{isPilihan ? 'Anggota Ekskul Pilihan' : `Kelas Wajib ${selectedEkskulClass.kelas}-${selectedEkskulClass.rombel}`} • {classStudents.length} Santri</p></div>
              </div>
              {renderStudentTable(ikhwan, "Ikhwan", "bg-green-100 text-green-800 border-l-4 border-green-600", columns, getStatus)}
              {renderStudentTable(akhwat, "Akhwat", "bg-pink-100 text-pink-800 border-l-4 border-pink-500", columns, getStatus)}
          </div>
      )
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-green-100">
        <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FileSpreadsheet className="text-green-600" /> Monitoring Absensi
            </h1>
            <p className="text-xs text-gray-500">Pantau kehadiran santri dan guru secara detail per pertemuan, atau historis mingguan/bulanan.</p>
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

        {/* TAB KHUSUS SANTRI */}
        <TabsContent value="santri" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ChartCard title="Grafik KBM" data={getStats('santri', 'kbm')} />
                <ChartCard title="Grafik Ibadah" data={getStats('santri', 'ibadah')} />
                <ChartCard title="Grafik Ekskul" data={getStats('santri', 'ekskul')} />
            </div>

            <div className="bg-white p-6 rounded-xl border border-green-100 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Users className="w-5 h-5 text-green-600"/> Rekap Absensi Terpadu</h3>
                </div>

                <Tabs defaultValue="kbm" value={santriTab} onValueChange={setSantriTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-green-50 p-1 rounded-lg mb-6 border border-green-100">
                        <TabsTrigger value="kbm" className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-[10px] md:text-sm font-bold transition-all">KBM Sekolah</TabsTrigger>
                        <TabsTrigger value="mengaji" className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-[10px] md:text-sm font-bold transition-all">Mengaji</TabsTrigger>
                        <TabsTrigger value="sholat" className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-[10px] md:text-sm font-bold transition-all">Sholat</TabsTrigger>
                        <TabsTrigger value="ekskul" className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-[10px] md:text-sm font-bold transition-all">Ekskul</TabsTrigger>
                    </TabsList>

                    <TabsContent value="kbm">{renderKbmFlow()}</TabsContent>
                    <TabsContent value="mengaji">{renderMengajiFlow()}</TabsContent>
                    <TabsContent value="sholat">{renderSholatFlow()}</TabsContent>
                    <TabsContent value="ekskul">{renderEkskulFlow()}</TabsContent>
                </Tabs>
            </div>

            <Card className="border-l-4 border-l-purple-500 bg-purple-50/30 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-purple-800 uppercase font-bold">Input Izin / Sakit Santri</CardTitle></CardHeader>
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

        {/* TAB KHUSUS GURU */}
        <TabsContent value="guru" className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ChartCard title="Kehadiran Mengajar (KBM)" data={getStats('guru', 'kbm')} />
                <ChartCard title="Kehadiran Ibadah & Mengaji" data={getStats('guru', 'ibadah')} />
                <ChartCard title="Kehadiran Ekstrakurikuler" data={getStats('guru', 'ekskul')} />
            </div>

            <div className="bg-white p-6 rounded-xl border border-teal-100 shadow-sm">
                <h3 className="font-bold text-lg text-teal-800 flex items-center gap-2 mb-4"><FileSpreadsheet className="w-5 h-5 text-teal-600"/> Rekap Absensi Mingguan Guru</h3>
                
                <Tabs defaultValue="kbm" value={guruTab} onValueChange={setGuruTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-teal-50 p-1 rounded-lg mb-6 border border-teal-100">
                        <TabsTrigger value="kbm" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-[10px] md:text-sm font-bold transition-all">KBM Sekolah</TabsTrigger>
                        <TabsTrigger value="mengaji" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-[10px] md:text-sm font-bold transition-all">Mengaji</TabsTrigger>
                        <TabsTrigger value="sholat" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-[10px] md:text-sm font-bold transition-all">Sholat</TabsTrigger>
                        <TabsTrigger value="ekskul" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-[10px] md:text-sm font-bold transition-all">Ekskul</TabsTrigger>
                    </TabsList>

                    {/* Kita Panggil Langsung Fungsi Render Tabel Gurunya */}
                    {['kbm', 'mengaji', 'sholat', 'ekskul'].map(cat => (
                        <TabsContent key={cat} value={cat}>
                            {(() => {
                                const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
                                const selectedDate = new Date(dateFilter);
                                const startOfWeek = new Date(selectedDate);
                                startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay() + 1);

                                const getStatusOnDay = (id: number, dayIndex: number) => {
                                    const targetDate = new Date(startOfWeek);
                                    targetDate.setDate(startOfWeek.getDate() + dayIndex);
                                    const dateStr = targetDate.toISOString().split('T')[0];

                                    const relevantLogs = logs.filter(l => {
                                        const logDate = l.created_at?.split('T')[0];
                                        return l.teacher_id === id && logDate === dateStr && getActivityType(l) === cat;
                                    });

                                    if (relevantLogs.length === 0) return "-";
                                    if (relevantLogs.some(l => l.status === 'Sakit')) return <span className="text-red-500 font-bold">S</span>;
                                    if (relevantLogs.some(l => l.status === 'Izin')) return <span className="text-blue-500 font-bold">I</span>;
                                    if (relevantLogs.some(l => l.status === 'Telat')) return <span className="text-yellow-600 font-bold">T</span>;
                                    return <span className="text-green-500 font-bold">✓</span>;
                                };

                                if (teacherList.length === 0) return <div className="text-center py-2 text-xs text-gray-400 italic">Data guru kosong.</div>;

                                return (
                                    <div className="overflow-x-auto border-2 border-teal-200 rounded-xl bg-white shadow-sm mt-1 mb-4">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-teal-50 text-teal-800 uppercase font-bold border-b-2 border-teal-200">
                                                <tr>
                                                    <th className="p-3 border-r border-teal-100 w-8 text-center">No</th>
                                                    <th className="p-3 border-r border-teal-100 min-w-[200px]">Nama Guru</th>
                                                    {days.map(d => <th key={d} className="p-3 border-r border-teal-100 text-center w-12">{d.slice(0,3)}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {teacherList.map((t, idx) => (
                                                    <tr key={t.id} className="hover:bg-teal-50/30">
                                                        <td className="p-3 text-center border-r border-gray-100 text-gray-500 font-medium">{idx + 1}</td>
                                                        <td className="p-3 border-r border-gray-100 font-bold text-gray-800">{t.full_name}</td>
                                                        {days.map((_, i) => (
                                                            <td key={i} className="p-3 border-r border-gray-100 text-center bg-white text-sm">
                                                                {getStatusOnDay(t.id, i)}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })()}
                        </TabsContent>
                    ))}
                </Tabs>
            </div>

            {/* Input Manual Izin Sakit Khusus Guru */}
            <Card className="border-l-4 border-l-purple-500 bg-purple-50/30 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-purple-800 uppercase font-bold">Input Izin / Sakit Guru</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div className="md:col-span-2 space-y-1"><label className="text-[10px] font-bold uppercase">Nama Guru</label><Select value={formTeacherId} onValueChange={setFormTeacherId}><SelectTrigger className="bg-white h-9 border-purple-200"><SelectValue placeholder="Pilih Nama..." /></SelectTrigger><SelectContent className="max-h-[200px]">{teacherList.map(t => (<SelectItem key={t.id} value={String(t.id)}>{t.full_name}</SelectItem>))}</SelectContent></Select></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold uppercase">Status</label><Select value={formStatus} onValueChange={setFormStatus}><SelectTrigger className="bg-white h-9 border-purple-200"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Izin">Izin</SelectItem><SelectItem value="Sakit">Sakit</SelectItem></SelectContent></Select></div>
                    <div className="md:col-span-4 flex gap-2 mt-2"><Input placeholder="Keterangan (Opsional)" value={formKet} onChange={e => setFormKet(e.target.value)} className="bg-white h-9 text-sm w-full border-purple-200" /><Button onClick={() => handleSubmitPermission('guru')} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white w-32 shadow-md"><Save className="w-4 h-4 mr-2"/> Simpan</Button></div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-teal-200">
                <CardHeader className="bg-teal-50/50 border-b border-teal-100 pb-2 pt-3 px-4"><CardTitle className="text-sm font-bold text-teal-800 flex items-center gap-2"><Clock className="w-4 h-4 text-teal-600"/> Log Absensi Guru Hari Ini</CardTitle></CardHeader>
                <CardContent className="p-0">
                    <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-100">
                        {dailyLogs.filter(l => l.teacher_id).length === 0 ? (
                            <div className="p-6 text-center text-xs text-gray-400 italic">Belum ada absensi guru hari ini.</div>
                        ) : (
                            dailyLogs.filter(l => l.teacher_id).map((log) => (<div key={log.id} className="flex items-center justify-between p-3 px-4 hover:bg-teal-50/50 transition-colors"><div className="flex items-center gap-3"><div className="p-2 rounded-full bg-teal-100 text-teal-700 shadow-sm border border-teal-200"><User size={16}/></div><div><p className="font-bold text-gray-800 text-sm">{log.teacher?.full_name}</p><p className="text-[10px] text-gray-500 mt-0.5">{log.activity?.name || log.keterangan || "Kegiatan Umum"}</p></div></div><div className="text-right"><span className="font-mono font-bold block text-gray-700 text-xs mb-1">{log.scan_time.slice(0,5)}</span><Badge className={`text-[9px] h-4 px-1 shadow-sm ${log.status === 'Hadir' ? 'bg-green-600 text-white' : (log.status === 'Izin' ? 'bg-blue-500 text-white' : 'bg-red-500 text-white')}`}>{log.status}</Badge></div></div>))
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
