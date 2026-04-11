import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  School, Moon, BookOpen, MapPin, Plus, Trash2, CalendarDays, Filter, 
  Database, Cpu, Wifi, Users, UserPlus, Medal, Pencil, CheckCircle2, User, Lock, RefreshCw
} from "lucide-react";

/* ================= TYPES ================= */
interface Activity { id: number; name: string; category: string; tipe_ekskul?: string; }
interface Location { id: number; name: string; type: string; }
interface Rombel { id: number; nama: string; kelas: number; kategori: string; } 
interface Teacher { id: number; full_name: string; } 
interface Device { 
  id: number; name: string; token: string; location_id: number; is_active: boolean;
  location?: { name: string }; 
}
interface Schedule {
  id: number; day_of_week: number; start_time: string; end_time: string;
  activity_id: number; location_id: number; teacher_id?: number; 
  kelas?: number; rombel_id?: number; rombel?: { nama: string; kategori?: string }; 
  activity: { name: string; category: string; tipe_ekskul?: string };
  location: { name: string; id: number }; teacher?: { full_name: string }; 
  is_active: boolean;
}
interface SantriSimple { id: string; nama_lengkap: string; kelas: number; }
interface ActivityMember { id: number; santri_id: string; santri: { nama_lengkap: string; kelas: number; }; }

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const KELAS_LIST = [7, 8, 9, 10, 11, 12];

const AcademicSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState("kbm");

  // DATA STATE
  const [activities, setActivities] = useState<Activity[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [devices, setDevices] = useState<Device[]>([]); 
  const [rombels, setRombels] = useState<Rombel[]>([]); 
  const [teachers, setTeachers] = useState<Teacher[]>([]); 
  const [santriList, setSantriList] = useState<SantriSimple[]>([]); 

  // STATE EKSKUL MEMBER
  const [selectedEkskulId, setSelectedEkskulId] = useState<string>("");
  const [members, setMembers] = useState<ActivityMember[]>([]);

  // FILTER STATE
  const [filterKelas, setFilterKelas] = useState<string>("all");   
  const [filterHari, setFilterHari] = useState<string>("all"); 

  // FORM STATE
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"activity" | "schedule" | "location" | "device" | "rombel" | "member">("activity");
  const [scheduleCategory, setScheduleCategory] = useState<"school" | "mengaji" | "sholat" | "ekskul">("school");
  const [formData, setFormData] = useState<any>({});
  const [isEditMode, setIsEditMode] = useState(false);

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: actData } = await supabase.from('activities').select('*').order('name');
      if (actData) setActivities(actData);

      const { data: locData } = await supabase.from('locations').select('*').order('name');
      if (locData) setLocations(locData);
      
      const { data: rmbData } = await supabase.from('rombels').select('*').order('kelas').order('nama');
      if (rmbData) setRombels(rmbData);

      const { data: tData } = await supabase.from('teachers').select('id, full_name').eq('is_active', true).order('full_name');
      if (tData) setTeachers(tData);

      const { data: devData } = await supabase.from('devices').select(`*, location:location_id(name)`).order('name');
      // @ts-ignore
      if (devData) setDevices(devData);

      const { data: schData } = await supabase
        .from('schedules')
        .select(`
            id, day_of_week, start_time, end_time, is_active, location_id, activity_id, kelas, rombel_id, teacher_id,
            activity:activity_id(name, category, tipe_ekskul),
            location:location_id(name, id),
            rombel:rombel_id(nama, kategori),
            teacher:teacher_id(full_name) 
        `)
        .order('day_of_week')
        .order('start_time');
      // @ts-ignore
      if (schData) setSchedules(schData);

      const { data: santriData } = await supabase.from('santri_2025_12_01_21_34').select('id, nama_lengkap, kelas').eq('status', 'aktif').order('nama_lengkap');
      if (santriData) setSantriList(santriData);

    } catch (err: any) { console.error(err); } 
    finally { setLoading(false); }
  };

  const fetchMembers = async (actId: string) => {
      if (!actId) return;
      const act = activities.find(a => String(a.id) === actId);
      if (act?.tipe_ekskul === 'wajib') return;

      setLoading(true);
      try {
          const { data, error } = await supabase.from('activity_members').select(`id, santri_id, santri:santri_2025_12_01_21_34(nama_lengkap, kelas)`).eq('activity_id', actId);
          if (error) throw error;
          // @ts-ignore
          setMembers(data || []);
      } catch (err: any) {
          toast({ title: "Gagal ambil data", description: err.message, variant: "destructive" });
      } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { 
      if (selectedEkskulId) fetchMembers(selectedEkskulId); 
      else setMembers([]);
  }, [selectedEkskulId]);

  const selectedActivity = activities.find(a => String(a.id) === selectedEkskulId);

  /* ================= FUNGSI AUTO-INJECT JADWAL SHOLAT ================= */
  const syncPrayerTimes = async () => {
      setSyncing(true);
      try {
          const res = await fetch('https://api.aladhan.com/v1/timingsByCity?city=Bandung&country=Indonesia&method=11');
          const { data } = await res.json();
          const timings = data.timings;

          const prayerNames = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'];
          const prayerApiKeys = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

          // 1. Amankan Lokasi (Bikin Masjid kalau belum ada)
          let defaultLocId = locations.find(l => l.type === 'mosque')?.id || locations[0]?.id;
          if (!defaultLocId) {
              const { data: newLoc } = await supabase.from('locations').insert([{ name: 'Masjid Utama', type: 'mosque' }]).select().single();
              if (newLoc) defaultLocId = newLoc.id;
          }

          // 2. Amankan Tabel Kegiatan (activities) - Pastikan 5 Waktu ada di DB biar bisa dipakai menu Absen
          const { data: existingActs } = await supabase.from('activities').select('*').eq('category', 'sholat');
          let sholatActs = existingActs || [];

          for (let i = 0; i < prayerNames.length; i++) {
              const pName = prayerNames[i];
              if (!sholatActs.find(a => a.name.toLowerCase().includes(pName.toLowerCase()))) {
                  const { data: newAct } = await supabase.from('activities').insert([{ name: `Sholat ${pName}`, category: 'sholat' }]).select().single();
                  if (newAct) sholatActs.push(newAct);
              }
          }

          // 3. Amankan Tabel Jadwal (schedules) - Bikin jadwal untuk 7 Hari penuh (0 sampai 6)
          for (let day = 0; day <= 6; day++) {
              for (let i = 0; i < prayerNames.length; i++) {
                  const act = sholatActs.find(a => a.name.toLowerCase().includes(prayerNames[i].toLowerCase()));
                  if (!act) continue;

                  const startTime = timings[prayerApiKeys[i]];
                  const { data: existingSch } = await supabase.from('schedules').select('id').eq('activity_id', act.id).eq('day_of_week', day).maybeSingle();

                  if (existingSch) {
                      await supabase.from('schedules').update({ start_time: startTime, end_time: startTime }).eq('id', existingSch.id);
                  } else {
                      await supabase.from('schedules').insert([{
                          activity_id: act.id, day_of_week: day, start_time: startTime, end_time: startTime,
                          location_id: defaultLocId, is_active: true
                      }]);
                  }
              }
          }

          toast({ title: "Jadwal Dipatenkan!", description: "Waktu Sholat Jabar otomatis ter-generate dan tersimpan.", className: "bg-green-600 text-white" });
          fetchData();
      } catch (err: any) {
          toast({ title: "Gagal Sinkronisasi", description: err.message, variant: "destructive" });
      } finally {
          setSyncing(false);
      }
  };

  /* ================= ACTIONS NORMAL ================= */
  const handleDelete = async (table: string, id: number) => {
    if (!confirm("Hapus data ini?")) return;
    try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        toast({ title: "Terhapus", description: "Data berhasil dihapus." });
        if (table === 'activity_members') fetchMembers(selectedEkskulId);
        else fetchData();
    } catch (err: any) { toast({ title: "Gagal", description: err.message, variant: "destructive" }); }
  };

  const handleSave = async () => {
    try {
        let error;
        const payload = { ...formData }; 

        if (dialogType === 'member') { 
             const data = { activity_id: parseInt(selectedEkskulId), santri_id: payload.santri_id };
             const { error: err } = await supabase.from('activity_members').insert([data]);
             error = err;
             if (!error) { toast({ title: "Berhasil", description: "Santri ditambahkan." }); fetchMembers(selectedEkskulId); setIsDialogOpen(false); return; }
        }
        else if (dialogType === 'device') {
            const data = { name: payload.name, token: payload.token, location_id: parseInt(payload.location_id), is_active: true };
            if (isEditMode) error = (await supabase.from('devices').update(data).eq('id', payload.id)).error;
            else error = (await supabase.from('devices').insert([data])).error;
        }
        else if (dialogType === 'rombel') { 
             const data = { nama: payload.name, kelas: parseInt(payload.kelas), kategori: payload.kategori || 'sekolah' };
             if(isEditMode) error = (await supabase.from('rombels').update(data).eq('id', payload.id)).error;
             else error = (await supabase.from('rombels').insert([data])).error;
        }
        else if (dialogType === 'activity') {
             const data = { name: payload.name, category: payload.category || 'umum', tipe_ekskul: payload.tipe_ekskul };
             if(isEditMode) error = (await supabase.from('activities').update(data).eq('id', payload.id)).error;
             else error = (await supabase.from('activities').insert([data])).error;
        } 
        else if (dialogType === 'location') {
             const data = { name: payload.name, type: payload.type || 'general' };
             if(isEditMode) error = (await supabase.from('locations').update(data).eq('id', payload.id)).error;
             else error = (await supabase.from('locations').insert([data])).error;
        } 
        else if (dialogType === 'schedule') {
             const isEkskul = scheduleCategory === 'ekskul';
             const data = {
                activity_id: parseInt(payload.activity_id),
                location_id: parseInt(payload.location_id),
                day_of_week: parseInt(payload.day_of_week),
                start_time: payload.start_time,
                end_time: payload.end_time,
                kelas: (isEkskul || !payload.kelas || payload.kelas === 'all') ? null : parseInt(payload.kelas),
                rombel_id: (isEkskul || !payload.rombel_id || payload.rombel_id === 'all') ? null : parseInt(payload.rombel_id),
                teacher_id: (payload.teacher_id && payload.teacher_id !== 'none') ? parseInt(payload.teacher_id) : null 
             };
             if(isEditMode) error = (await supabase.from('schedules').update(data).eq('id', payload.id)).error;
             else error = (await supabase.from('schedules').insert([data])).error;
        }

        if (error) throw error;
        toast({ title: "Berhasil", description: "Data tersimpan.", className: "bg-green-600 text-white" });
        setIsDialogOpen(false);
        fetchData();
    } catch (err: any) { 
        if (err.code === '23505') toast({ title: "Gagal", description: "Santri ini sudah terdaftar.", variant: "destructive" });
        else toast({ title: "Gagal", description: err.message, variant: "destructive" }); 
    }
  };

  const openAdd = (type: "activity" | "location" | "schedule" | "device" | "rombel" | "member", category: "school" | "mengaji" | "sholat" | "ekskul" = "school") => {
      setDialogType(type);
      setScheduleCategory(category);
      setIsEditMode(false);
      
      let initialData: any = {};
      if (type === 'schedule') initialData = { 
          day_of_week: "1", start_time: "07:00", end_time: "08:00", 
          kelas: filterKelas !== 'all' ? filterKelas : "7", 
          location_id: "", rombel_id: "all", teacher_id: "none" 
      };
      else if (type === 'device') initialData = { token: "DEV_" + Math.floor(Math.random() * 10000) }; 
      else if (type === 'activity') initialData = { category: category === 'ekskul' ? 'ekskul' : 'pelajaran', tipe_ekskul: 'wajib' };
      else if (type === 'rombel') initialData = { kelas: "7", kategori: category === 'mengaji' ? 'mengaji' : 'sekolah' }; 
      else if (type === 'member') {
          if (!selectedEkskulId) { toast({title: "Pilih Ekskul Dulu", description: "Silakan pilih kegiatan di sebelah kiri."}); return; }
          initialData = { santri_id: "" };
      }
      setFormData(initialData);
      setIsDialogOpen(true);
  };

  const openEdit = (type: any, data: any) => {
      setDialogType(type);
      setIsEditMode(true);
      setFormData({
          ...data,
          name: data.nama || data.name, 
          activity_id: String(data.activity_id),
          location_id: String(data.location_id),
          day_of_week: String(data.day_of_week),
          kategori: data.kategori || 'sekolah',
          kelas: data.kelas ? String(data.kelas) : undefined,
          rombel_id: data.rombel_id ? String(data.rombel_id) : undefined,
          teacher_id: data.teacher_id ? String(data.teacher_id) : "none" 
      });
      setIsDialogOpen(true);
  };

  // FILTER LOGIC UNTUK TAB JADWAL
  const filteredSchool = filterKelas === 'all' ? schedules.filter(s => s.activity?.category === 'pelajaran') : schedules.filter(s => s.activity?.category === 'pelajaran' && String(s.kelas) === filterKelas);
  const filteredMengaji = filterHari === 'all' ? schedules.filter(s => s.activity?.category === 'mengaji') : schedules.filter(s => s.activity?.category === 'mengaji' && String(s.day_of_week) === filterHari);
  const filteredEkskul = filterHari === 'all' ? schedules.filter(s => s.activity?.category === 'ekskul') : schedules.filter(s => s.activity?.category === 'ekskul' && String(s.day_of_week) === filterHari);
  const ekskulList = activities.filter(a => a.category === 'ekskul');

  const ScheduleList = ({ data, showKelas = false }: { data: Schedule[], showKelas?: boolean }) => (
    <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6, 0].map((dayCode) => { 
            const dayItems = data.filter(s => s.day_of_week === dayCode);
            if (dayItems.length === 0) return null;
            dayItems.sort((a,b) => a.start_time.localeCompare(b.start_time));
            return (
                <div key={dayCode} className="border rounded-xl overflow-hidden bg-white shadow-sm">
                    <div className="bg-gray-50 px-4 py-2 font-bold text-gray-800 flex items-center gap-2 border-b"><CalendarDays className="w-4 h-4 text-gray-500" /> {DAYS[dayCode]}</div>
                    <div className="divide-y divide-gray-100">
                        {dayItems.map((sch) => (
                            <div key={sch.id} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="text-center w-20 border-r border-gray-100 pr-3"><span className="block text-sm font-black text-gray-700">{sch.start_time.slice(0,5)}</span><span className="block text-xs text-gray-400">{sch.end_time.slice(0,5)}</span></div>
                                    <div>
                                        <p className="font-bold text-gray-800 flex items-center gap-2">{sch.activity?.name}{sch.activity?.category === 'ekskul' && sch.activity?.tipe_ekskul && (<span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${sch.activity.tipe_ekskul === 'wajib' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{sch.activity.tipe_ekskul}</span>)}</p>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            {sch.teacher && (<span className="text-xs bg-indigo-50 text-indigo-700 px-1.5 rounded flex items-center gap-1 border border-indigo-100"><User size={10} /> {sch.teacher.full_name}</span>)}
                                            {showKelas && sch.kelas && (<span className="text-xs bg-gray-200 px-1.5 rounded text-gray-700 font-bold flex items-center gap-1">Kls {sch.kelas} {sch.rombel?.nama ? `- ${sch.rombel.nama}` : ''}</span>)}
                                            {!showKelas && sch.rombel?.nama && (<span className="text-xs bg-gray-200 px-1.5 rounded text-gray-700 font-bold">{sch.rombel.nama}</span>)}
                                            <span className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {sch.location?.name}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" onClick={() => openEdit('schedule', sch)} className="text-blue-400 hover:bg-blue-50"><Pencil className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete('schedules', sch.id)} className="text-red-400 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )
        })}
    </div>
  );

  // 🔥 TAMPILAN KHUSUS SHOLAT (MANDIRI & PATEN)
  const renderPatenSholat = () => {
      // Ambil 1 set jadwal sholat aja (misal hari senin aja karena jamnya sama tiap hari)
      const sholatSchedules = schedules.filter(s => s.activity?.category === 'sholat' && s.day_of_week === 1); 
      
      const prayerOrder = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
      const sortedSholat = sholatSchedules.sort((a, b) => {
          const indexA = prayerOrder.findIndex(p => a.activity.name.toLowerCase().includes(p));
          const indexB = prayerOrder.findIndex(p => b.activity.name.toLowerCase().includes(p));
          return indexA - indexB;
      });

      return (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
              {sortedSholat.length === 0 ? (
                  <div className="col-span-5 text-center p-8 text-gray-400 border-2 border-dashed rounded-xl bg-gray-50">
                      Jadwal sholat belum ter-generate. Klik tombol <strong>"Generate & Sync Otomatis"</strong> di atas.
                  </div>
              ) : (
                  sortedSholat.map(sch => (
                      <div key={sch.id} className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
                          <h4 className="font-bold text-indigo-800 uppercase mb-2">{sch.activity.name}</h4>
                          <div className="text-2xl md:text-3xl font-black text-indigo-600">{sch.start_time.slice(0,5)}</div>
                          <div className="text-[10px] text-indigo-400 mt-2 font-bold uppercase tracking-widest bg-indigo-100/50 inline-block px-2 py-0.5 rounded-full">Otomatis / Paten</div>
                      </div>
                  ))
              )}
          </div>
      )
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-purple-100">
        <div><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><CalendarDays className="text-purple-600" /> Pengaturan Akademik</h2><p className="text-sm text-gray-500">Atur jadwal KBM, Mengaji, Sholat, Ekskul, dan Rombel Pesantren.</p></div>
      </div>

      <Tabs defaultValue="kbm" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto pb-2">
            <TabsList className="flex w-max min-w-full bg-purple-50 h-12 p-1 rounded-xl">
                <TabsTrigger value="kbm" className="flex-1 data-[state=active]:bg-blue-600 data-[state=active]:text-white"><School className="w-4 h-4 mr-2" /> KBM</TabsTrigger>
                <TabsTrigger value="mengaji" className="flex-1 data-[state=active]:bg-green-600 data-[state=active]:text-white"><BookOpen className="w-4 h-4 mr-2" /> Mengaji</TabsTrigger>
                <TabsTrigger value="sholat" className="flex-1 data-[state=active]:bg-indigo-600 data-[state=active]:text-white"><Moon className="w-4 h-4 mr-2" /> Sholat</TabsTrigger>
                <TabsTrigger value="ekskul" className="flex-1 data-[state=active]:bg-orange-500 data-[state=active]:text-white"><Medal className="w-4 h-4 mr-2" /> Ekskul</TabsTrigger>
                <TabsTrigger value="members" className="flex-1 data-[state=active]:bg-pink-600 data-[state=active]:text-white"><Users className="w-4 h-4 mr-2" /> Anggota</TabsTrigger>
                <TabsTrigger value="devices" className="flex-1 data-[state=active]:bg-slate-700 data-[state=active]:text-white"><Cpu className="w-4 h-4 mr-2" /> IoT</TabsTrigger>
                <TabsTrigger value="activities" className="flex-1"><Database className="w-4 h-4 mr-2" /> Master</TabsTrigger>
            </TabsList>
        </div>

        {/* KBM */}
        <TabsContent value="kbm" className="mt-4 space-y-4">
            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-3 w-full md:w-auto"><Filter className="text-blue-400 w-5 h-5" /><div className="space-y-1"><label className="text-xs font-bold text-blue-700 uppercase">Lihat Jadwal Kelas:</label><Select value={filterKelas} onValueChange={setFilterKelas}><SelectTrigger className="w-[200px] font-bold border-blue-200 bg-white"><SelectValue placeholder="Semua Kelas" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Kelas</SelectItem>{KELAS_LIST.map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}</SelectContent></Select></div></div>
                <Button onClick={() => openAdd('schedule', 'school')} className="bg-blue-600 hover:bg-blue-700 shadow-md w-full md:w-auto"><Plus className="w-4 h-4 mr-2" /> Buat Jadwal Mapel</Button>
            </div>
            <Card className="border-t-4 border-t-blue-600 shadow-sm"><CardHeader><CardTitle>Jadwal Sekolah {filterKelas !== 'all' ? `Kelas ${filterKelas}` : ''}</CardTitle></CardHeader><CardContent><ScheduleList data={filteredSchool} showKelas={filterKelas === 'all'} /></CardContent></Card>
        </TabsContent>

        {/* MENGAJI */}
        <TabsContent value="mengaji" className="mt-4 space-y-4">
            <div className="bg-green-50/50 p-4 rounded-lg border border-green-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-3 w-full md:w-auto"><Filter className="text-green-400 w-5 h-5" /><div className="space-y-1"><label className="text-xs font-bold text-green-700 uppercase">Filter Hari:</label><Select value={filterHari} onValueChange={setFilterHari}><SelectTrigger className="w-[200px] font-bold border-green-200 bg-white"><SelectValue placeholder="Semua Hari" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Hari</SelectItem>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent></Select></div></div>
                <Button onClick={() => openAdd('schedule', 'mengaji')} className="bg-green-600 hover:bg-green-700 shadow-md w-full md:w-auto"><Plus className="w-4 h-4 mr-2" /> Atur Jadwal Mengaji</Button>
            </div>
            <Card className="border-t-4 border-t-green-600 shadow-sm"><CardHeader><CardTitle>Jadwal Pengajian Kitab / Tahfidz</CardTitle></CardHeader><CardContent><ScheduleList data={filteredMengaji} showKelas={true} /></CardContent></Card>
        </TabsContent>

        {/* SHOLAT (PATEN & MANDIRI) */}
        <TabsContent value="sholat" className="mt-4 space-y-4">
            <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="text-sm font-bold text-indigo-800 flex items-center gap-2">
                   <Lock className="w-5 h-5" /> 5 Waktu Sholat (Paten & Mandiri)
                </div>
                <Button onClick={syncPrayerTimes} disabled={syncing} className="bg-indigo-600 hover:bg-indigo-700 shadow-md w-full md:w-auto">
                    <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Memproses...' : 'Generate & Sync Otomatis'}
                </Button>
            </div>
            <Card className="border-t-4 border-t-indigo-600 shadow-sm">
                <CardHeader><CardTitle>Waktu Sholat Real-time Jabar</CardTitle></CardHeader>
                <CardContent className="pb-8">
                    {renderPatenSholat()}
                </CardContent>
            </Card>
        </TabsContent>

        {/* EKSKUL */}
        <TabsContent value="ekskul" className="mt-4 space-y-4">
            <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-3 w-full md:w-auto"><Filter className="text-orange-400 w-5 h-5" /><div className="space-y-1"><label className="text-xs font-bold text-orange-700 uppercase">Filter Hari:</label><Select value={filterHari} onValueChange={setFilterHari}><SelectTrigger className="w-[200px] font-bold border-orange-200 bg-white"><SelectValue placeholder="Semua Hari" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Hari</SelectItem>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent></Select></div></div>
                <Button onClick={() => openAdd('schedule', 'ekskul')} className="bg-orange-500 hover:bg-orange-600 shadow-md w-full md:w-auto"><Plus className="w-4 h-4 mr-2" /> Tambah Jadwal Ekskul</Button>
            </div>
            <Card className="border-t-4 border-t-orange-500 shadow-sm"><CardHeader><CardTitle>Jadwal Ekstrakurikuler</CardTitle></CardHeader><CardContent><ScheduleList data={filteredEkskul} showKelas={false} /></CardContent></Card>
        </TabsContent>
        
        {/* TAB ANGGOTA */}
        <TabsContent value="members" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
                <Card className="col-span-1 border-pink-200 h-full flex flex-col">
                    <CardHeader className="bg-pink-50/50 pb-2"><CardTitle className="text-lg text-pink-700 flex items-center gap-2"><Medal className="w-5 h-5"/> Pilih Ekskul</CardTitle></CardHeader>
                    <CardContent className="pt-4 flex-1 overflow-y-auto space-y-2">
                        {ekskulList.map((act) => (
                            <div key={act.id} onClick={() => setSelectedEkskulId(String(act.id))} className={`p-3 rounded-lg cursor-pointer border transition-all ${selectedEkskulId === String(act.id) ? 'bg-pink-100 border-pink-500 shadow-sm' : 'hover:bg-gray-50 border-transparent hover:border-gray-200'}`}>
                                <h4 className={`font-bold ${selectedEkskulId === String(act.id) ? 'text-pink-800' : 'text-gray-700'}`}>{act.name}</h4>
                                <div className="flex gap-2 mt-1"><span className="text-[10px] bg-white px-1.5 rounded border border-gray-200 text-gray-500 uppercase">{act.category}</span>{act.tipe_ekskul && <span className={`text-[10px] px-1.5 rounded text-white ${act.tipe_ekskul === 'wajib' ? 'bg-red-400' : 'bg-blue-400'}`}>{act.tipe_ekskul}</span>}</div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                <Card className="col-span-1 md:col-span-2 border-pink-200 h-full flex flex-col">
                    <CardHeader className="bg-white border-b pb-3 flex flex-row justify-between items-center">
                        <div><CardTitle className="text-lg text-gray-800">Daftar Anggota</CardTitle><p className="text-xs text-gray-500 mt-1">{selectedEkskulId ? `Santri yang mengikuti ${selectedActivity?.name || '...'}` : "Pilih ekskul di sebelah kiri untuk melihat anggota."}</p></div>
                        {selectedEkskulId && selectedActivity?.tipe_ekskul !== 'wajib' && (<Button onClick={() => openAdd('member')} className="bg-pink-600 hover:bg-pink-700 text-white"><UserPlus className="w-4 h-4 mr-2"/> Tambah Anggota</Button>)}
                    </CardHeader>
                    <CardContent className="pt-0 flex-1 overflow-y-auto bg-gray-50/30 p-0">
                        {!selectedEkskulId ? (<div className="flex flex-col items-center justify-center h-full text-gray-400"><Users className="w-16 h-16 opacity-20 mb-2" /><p>Silakan pilih ekskul terlebih dahulu.</p></div>) : (
                            selectedActivity?.tipe_ekskul === 'wajib' ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in fade-in zoom-in">
                                    <div className="bg-green-100 p-4 rounded-full mb-4 shadow-sm border border-green-200"><CheckCircle2 className="w-12 h-12 text-green-600" /></div>
                                    <h3 className="text-xl font-bold text-gray-800">Kegiatan Wajib</h3>
                                    <p className="text-gray-500 max-w-sm mt-2 leading-relaxed">Kegiatan <strong>{selectedActivity.name}</strong> bersifat WAJIB. Seluruh santri aktif otomatis dianggap sebagai anggota.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {members.length === 0 && (<div className="text-center py-10 text-gray-400"><p>Belum ada anggota yang mendaftar.</p></div>)}
                                    {members.map((m, idx) => (
                                        <div key={m.id} className="flex items-center justify-between p-4 hover:bg-white bg-white/50">
                                            <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-xs">{idx + 1}</div><div><p className="font-bold text-gray-800">{m.santri?.nama_lengkap || "Nama Tidak Ditemukan"}</p><p className="text-xs text-gray-500">Kelas {m.santri?.kelas || "-"}</p></div></div>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete('activity_members', m.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                    </CardContent>
                </Card>
            </div>
        </TabsContent>

        <TabsContent value="devices" className="mt-4 space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-3"><Wifi className="text-slate-600 w-6 h-6" /><div><h3 className="font-bold text-slate-800">Manajemen Alat Absensi</h3><p className="text-xs text-slate-500">Daftarkan alat WT32-ETH01 dan tentukan lokasinya.</p></div></div>
                <Button onClick={() => openAdd('device')} className="bg-slate-700 hover:bg-slate-800 text-white"><Plus className="w-4 h-4 mr-2" /> Tambah Alat</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {devices.map((dev) => (
                    <Card key={dev.id} className="border-t-4 border-t-slate-700 shadow-sm"><CardHeader className="pb-2 flex flex-row justify-between items-start"><div><CardTitle className="text-base">{dev.name}</CardTitle><span className="text-[10px] text-gray-400 font-mono">ID: {dev.id}</span></div><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit('device', dev)}><Pencil className="w-3 h-3 text-blue-500" /></Button><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete('devices', dev.id)}><Trash2 className="w-3 h-3 text-red-500" /></Button></div></CardHeader><CardContent className="space-y-3"><div className="bg-gray-100 p-2 rounded text-xs font-mono break-all border border-gray-200"><span className="text-gray-500 block mb-1">Token Alat:</span><span className="font-bold text-gray-800">{dev.token}</span></div><div className="flex items-center gap-2 text-sm text-gray-600"><MapPin className="w-4 h-4 text-slate-600" /><span className="font-medium">{dev.location?.name || "Lokasi tidak ditemukan"}</span></div></CardContent></Card>
                ))}
            </div>
        </TabsContent>

        {/* MASTER DATA */}
        <TabsContent value="activities" className="mt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* LOKASI */}
                <Card className="border-l-4 border-l-purple-500"><CardHeader className="flex flex-row items-center justify-between pb-2 bg-purple-50/30"><div><CardTitle className="text-lg flex items-center gap-2"><MapPin className="text-purple-600 w-5 h-5"/> Data Lokasi</CardTitle></div><Button onClick={() => openAdd('location')} variant="outline" size="sm" className="border-purple-200 text-purple-700 bg-white"><Plus className="w-4 h-4 mr-1" /> Tambah</Button></CardHeader><CardContent className="pt-4 max-h-[300px] overflow-y-auto">{locations.map((loc) => (<div key={loc.id} className="flex justify-between items-center p-2 hover:bg-gray-50 border-b last:border-0"><div className="flex items-center gap-2"><MapPin size={14} className="text-purple-400"/><span className="text-sm font-bold">{loc.name}</span> <span className="text-[10px] bg-gray-100 px-1 rounded">{loc.type}</span></div><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit('location', loc)}><Pencil size={12}/></Button><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete('locations', loc.id)}><Trash2 size={12} className="text-red-400"/></Button></div></div>))}</CardContent></Card>
                
                {/* ROMBEL SEKOLAH */}
                <Card className="border-l-4 border-l-blue-500"><CardHeader className="flex flex-row items-center justify-between pb-2 bg-blue-50/30"><div><CardTitle className="text-lg flex items-center gap-2"><School className="text-blue-600 w-5 h-5"/> Rombel Sekolah</CardTitle></div><Button onClick={() => openAdd('rombel', 'school')} variant="outline" size="sm" className="border-blue-200 text-blue-700 bg-white"><Plus className="w-4 h-4 mr-1" /> Tambah</Button></CardHeader><CardContent className="pt-4 max-h-[300px] overflow-y-auto">{KELAS_LIST.map((k) => {const rombelKelas = rombels.filter(r => r.kelas === k && (!r.kategori || r.kategori === 'sekolah')); if (rombelKelas.length === 0) return null; return (<div key={k} className="mb-3"><div className="text-xs font-bold text-gray-500 uppercase mb-1">Kelas {k}</div><div className="space-y-1">{rombelKelas.map(r => (<div key={r.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border hover:bg-blue-50"><span className="text-sm font-bold">Rombel {r.nama}</span><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => openEdit('rombel', r)}><Pencil size={10}/></Button><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDelete('rombels', r.id)}><Trash2 size={10} className="text-red-400"/></Button></div></div>))}</div></div>)})}{rombels.filter(r => !r.kategori || r.kategori === 'sekolah').length === 0 && <p className="text-xs text-gray-400 text-center py-4">Belum ada data rombel.</p>}</CardContent></Card>
                
                {/* ROMBEL MENGAJI */}
                <Card className="border-l-4 border-l-green-500"><CardHeader className="flex flex-row items-center justify-between pb-2 bg-green-50/30"><div><CardTitle className="text-lg flex items-center gap-2"><BookOpen className="text-green-600 w-5 h-5"/> Rombel Mengaji</CardTitle></div><Button onClick={() => openAdd('rombel', 'mengaji')} variant="outline" size="sm" className="border-green-200 text-green-700 bg-white"><Plus className="w-4 h-4 mr-1" /> Tambah</Button></CardHeader><CardContent className="pt-4 max-h-[300px] overflow-y-auto">{KELAS_LIST.map((k) => {const rombelKelas = rombels.filter(r => r.kelas === k && r.kategori === 'mengaji'); if (rombelKelas.length === 0) return null; return (<div key={k} className="mb-3"><div className="text-xs font-bold text-gray-500 uppercase mb-1">Kelas {k}</div><div className="space-y-1">{rombelKelas.map(r => (<div key={r.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border hover:bg-green-50"><span className="text-sm font-bold">Rombel {r.nama}</span><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => openEdit('rombel', r)}><Pencil size={10}/></Button><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDelete('rombels', r.id)}><Trash2 size={10} className="text-red-400"/></Button></div></div>))}</div></div>)})}{rombels.filter(r => r.kategori === 'mengaji').length === 0 && <p className="text-xs text-gray-400 text-center py-4">Belum ada rombel mengaji.</p>}</CardContent></Card>
                
                {/* MAPEL & UMUM */}
                <Card className="border-l-4 border-l-indigo-500"><CardHeader className="flex flex-row items-center justify-between pb-2 bg-indigo-50/30"><div><CardTitle className="text-lg flex items-center gap-2"><Database className="text-indigo-600 w-5 h-5"/> Mapel & Kegiatan</CardTitle></div><Button onClick={() => openAdd('activity')} variant="outline" size="sm" className="border-indigo-200 text-indigo-700 bg-white"><Plus className="w-4 h-4 mr-1" /> Tambah</Button></CardHeader><CardContent className="pt-4 max-h-[300px] overflow-y-auto">{activities.filter(a => a.category !== 'ekskul' && a.category !== 'sholat').map((act) => (<div key={act.id} className="flex justify-between items-center p-2 hover:bg-gray-50 border-b last:border-0"><div><div className="text-sm font-bold">{act.name}</div><div className="flex gap-1 mt-1"><span className="text-[10px] bg-gray-100 px-1 rounded uppercase">{act.category}</span></div></div><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit('activity', act)}><Pencil size={12}/></Button><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete('activities', act.id)}><Trash2 size={12} className="text-red-400"/></Button></div></div>))}</CardContent></Card>

                {/* MASTER EKSKUL */}
                <Card className="border-l-4 border-l-orange-500"><CardHeader className="flex flex-row items-center justify-between pb-2 bg-orange-50/30"><div><CardTitle className="text-lg flex items-center gap-2"><Medal className="text-orange-600 w-5 h-5"/> Master Ekskul</CardTitle></div><Button onClick={() => openAdd('activity', 'ekskul')} variant="outline" size="sm" className="border-orange-200 text-orange-700 bg-white"><Plus className="w-4 h-4 mr-1" /> Tambah</Button></CardHeader><CardContent className="pt-4 max-h-[300px] overflow-y-auto">{activities.filter(a => a.category === 'ekskul').map((act) => (<div key={act.id} className="flex justify-between items-center p-2 hover:bg-gray-50 border-b last:border-0"><div><div className="text-sm font-bold">{act.name}</div><div className="flex gap-1 mt-1"><span className={`text-[10px] px-1.5 rounded uppercase font-bold text-white ${act.tipe_ekskul === 'wajib' ? 'bg-red-400' : 'bg-blue-400'}`}>{act.tipe_ekskul}</span></div></div><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit('activity', act)}><Pencil size={12}/></Button><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete('activities', act.id)}><Trash2 size={12} className="text-red-400"/></Button></div></div>))}{activities.filter(a => a.category === 'ekskul').length === 0 && <p className="text-xs text-gray-400 text-center py-4">Belum ada data ekskul.</p>}</CardContent></Card>

            </div>
        </TabsContent>
      </Tabs>

      {/* 🔥 SEMUA DIALOG / FORM */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{isEditMode ? "Edit Data" : "Tambah Data Baru"}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
                
                {dialogType === 'activity' && (
                    <>
                        <div className="space-y-2"><label className="text-sm font-medium">Nama Kegiatan</label><Input placeholder="Contoh: Matematika / Pencak Silat" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Kategori Utama</label>
                            <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                                <SelectTrigger><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pelajaran">Pelajaran (KBM)</SelectItem>
                                    <SelectItem value="mengaji">Mengaji Kitab/Tahfidz</SelectItem>
                                    <SelectItem value="ekskul">Ekstrakurikuler</SelectItem>
                                    <SelectItem value="umum">Umum Lainnya</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {formData.category === 'ekskul' && <div className="space-y-2"><label className="text-sm font-medium text-orange-600">Sifat Ekskul</label><Select value={formData.tipe_ekskul} onValueChange={(v) => setFormData({...formData, tipe_ekskul: v})}><SelectTrigger><SelectValue placeholder="Pilih Tipe" /></SelectTrigger><SelectContent><SelectItem value="wajib">Wajib (Seluruh Santri Otomatis)</SelectItem><SelectItem value="pilihan">Pilihan (Sesuai Minat)</SelectItem></SelectContent></Select></div>}
                    </>
                )}

                {dialogType === 'member' && (
                    <>
                         <div className="bg-pink-50 p-3 rounded text-sm text-pink-800 mb-2">Menambahkan anggota ke: <strong>{activities.find(a => String(a.id) === selectedEkskulId)?.name}</strong></div>
                         <div className="space-y-2"><label className="text-sm font-medium">Pilih Santri</label><Select value={formData.santri_id} onValueChange={(v) => setFormData({...formData, santri_id: v})}><SelectTrigger><SelectValue placeholder="Cari Nama Santri..." /></SelectTrigger><SelectContent className="max-h-[300px]">{santriList.map((s) => (<SelectItem key={s.id} value={s.id}>{s.nama_lengkap} (Kelas {s.kelas})</SelectItem>))}</SelectContent></Select></div>
                    </>
                )}

                {dialogType === 'location' && (
                    <>
                        <div className="space-y-2"><label className="text-sm font-medium">Nama Tempat</label><Input placeholder="Contoh: Lab Komputer" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
                        <div className="space-y-2"><label className="text-sm font-medium">Kategori Tempat</label><Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}><SelectTrigger><SelectValue placeholder="Pilih Tipe" /></SelectTrigger><SelectContent><SelectItem value="class">Kelas</SelectItem><SelectItem value="mosque">Masjid</SelectItem><SelectItem value="dorm">Asrama</SelectItem><SelectItem value="gate">Gerbang</SelectItem><SelectItem value="lab">Laboratorium</SelectItem><SelectItem value="general">Area Umum</SelectItem></SelectContent></Select></div>
                    </>
                )}

                {dialogType === 'device' && (
                    <>
                        <div className="space-y-2"><label className="text-sm font-medium">Nama Alat</label><Input value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
                        <div className="space-y-2"><label className="text-sm font-medium">Lokasi Pemasangan</label><Select value={String(formData.location_id || '')} onValueChange={(v) => setFormData({...formData, location_id: v})}><SelectTrigger><SelectValue placeholder="Pilih Lokasi..." /></SelectTrigger><SelectContent>{locations.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><label className="text-sm font-medium">Token Alat</label><Input value={formData.token || ''} readOnly className="bg-gray-100 font-mono text-gray-500" /></div>
                    </>
                )}

                {dialogType === 'rombel' && (
                    <>
                        <div className="space-y-2"><label className="text-sm font-medium">Kelas Tingkat</label><Select value={String(formData.kelas || '')} onValueChange={(v) => setFormData({...formData, kelas: v})}><SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger><SelectContent>{KELAS_LIST.map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><label className="text-sm font-medium">Nama / Kode Rombel</label><Input placeholder="Contoh: A, B, Ula, Wustho" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
                    </>
                )}

                {dialogType === 'schedule' && (
                    <>
                        {scheduleCategory !== 'ekskul' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-blue-700">Untuk Kelas</label>
                                    <Select value={String(formData.kelas || '')} onValueChange={(v) => setFormData({...formData, kelas: v})}><SelectTrigger><SelectValue placeholder="Semua Kelas" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Kelas</SelectItem>{KELAS_LIST.map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}</SelectContent></Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-blue-700">Rombel (Opsional)</label>
                                    <Select value={String(formData.rombel_id || '')} onValueChange={(v) => setFormData({...formData, rombel_id: v})}>
                                        <SelectTrigger><SelectValue placeholder="Semua Rombel" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua Rombel</SelectItem>
                                            {rombels.filter(r => String(r.kelas) === String(formData.kelas) && r.kategori === (scheduleCategory === 'mengaji' ? 'mengaji' : 'sekolah')).map(r => (<SelectItem key={r.id} value={String(r.id)}>Rombel {r.nama}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Pilih Kegiatan</label>
                            <Select value={String(formData.activity_id || '')} onValueChange={(v) => setFormData({...formData, activity_id: v})}>
                                <SelectTrigger><SelectValue placeholder="Cari..." /></SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    {activities.filter(a => scheduleCategory === 'school' ? a.category === 'pelajaran' : (scheduleCategory === 'mengaji' ? a.category === 'mengaji' : a.category === 'ekskul')).map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-1 text-indigo-700"><User size={14} /> Guru Pengampu</label>
                            <Select value={String(formData.teacher_id || 'none')} onValueChange={(v) => setFormData({...formData, teacher_id: v})}><SelectTrigger className="bg-indigo-50 border-indigo-200"><SelectValue placeholder="Pilih Guru..." /></SelectTrigger><SelectContent className="max-h-[200px]"><SelectItem value="none">Tanpa Guru / Mandiri</SelectItem>{teachers.map(t => (<SelectItem key={t.id} value={String(t.id)}>{t.full_name}</SelectItem>))}</SelectContent></Select>
                        </div>

                        <div className="space-y-2"><label className="text-sm font-medium">Bertempat di Ruangan</label><Select value={String(formData.location_id || '')} onValueChange={(v) => setFormData({...formData, location_id: v})}><SelectTrigger><SelectValue placeholder="Pilih Lokasi Belajar" /></SelectTrigger><SelectContent className="max-h-[200px]">{locations.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><label className="text-sm font-medium">Hari</label><Select value={String(formData.day_of_week)} onValueChange={(v) => setFormData({...formData, day_of_week: v})}><SelectTrigger><SelectValue placeholder="Pilih Hari" /></SelectTrigger><SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent></Select></div>
                        <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-sm font-medium">Jam Mulai</label><Input type="time" value={formData.start_time || ''} onChange={(e) => setFormData({...formData, start_time: e.target.value})} /></div><div className="space-y-2"><label className="text-sm font-medium">Jam Selesai</label><Input type="time" value={formData.end_time || ''} onChange={(e) => setFormData({...formData, end_time: e.target.value})} /></div></div>
                    </>
                )}
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button><Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">Simpan Perubahan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AcademicSettings;
