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
  Database, Cpu, Wifi, Users, UserPlus, Search, Medal
} from "lucide-react";

/* ================= TYPES ================= */
interface Activity { id: number; name: string; category: string; tipe_ekskul?: string; }
interface Location { id: number; name: string; type: string; }
interface Rombel { id: number; nama: string; kelas: number; }
interface Device { 
  id: number; name: string; token: string; location_id: number; is_active: boolean;
  location?: { name: string }; 
}
interface Schedule {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  activity_id: number;
  location_id: number;
  kelas?: number;
  rombel_id?: number;
  rombel?: { nama: string }; 
  activity: { name: string; category: string; tipe_ekskul?: string };
  location: { name: string; id: number };
  is_active: boolean;
}
// 櫨 Tipe Baru untuk Member Ekskul
interface SantriSimple { id: string; nama_lengkap: string; kelas: number; }
interface ActivityMember { id: number; santri_id: string; santri: { nama_lengkap: string; kelas: number; }; }

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const KELAS_LIST = [7, 8, 9, 10, 11, 12];

const AcademicSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("kbm");

  // DATA STATE
  const [activities, setActivities] = useState<Activity[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [devices, setDevices] = useState<Device[]>([]); 
  const [rombels, setRombels] = useState<Rombel[]>([]); 
  const [santriList, setSantriList] = useState<SantriSimple[]>([]); // Data master santri

  // STATE EKSKUL MEMBER
  const [selectedEkskulId, setSelectedEkskulId] = useState<string>("");
  const [members, setMembers] = useState<ActivityMember[]>([]);

  // FILTER STATE
  const [filterKelas, setFilterKelas] = useState<string>("all");   
  const [filterHari, setFilterHari] = useState<string>("all"); 
  const [city, setCity] = useState("Bandung");

  // FORM STATE
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"activity" | "schedule" | "location" | "device" | "rombel" | "member">("activity");
  const [scheduleCategory, setScheduleCategory] = useState<"school" | "pesantren">("school");
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

      const { data: devData } = await supabase.from('devices').select(`*, location:location_id(name)`).order('name');
      // @ts-ignore
      if (devData) setDevices(devData);

      const { data: schData } = await supabase
        .from('schedules')
        .select(`
            id, day_of_week, start_time, end_time, is_active, location_id, activity_id, kelas, rombel_id,
            activity:activity_id(name, category, tipe_ekskul),
            location:location_id(name, id),
            rombel:rombel_id(nama)
        `)
        .order('day_of_week')
        .order('start_time');
      // @ts-ignore
      if (schData) setSchedules(schData);

      // Ambil data santri ringkas untuk dropdown
      const { data: santriData } = await supabase.from('santri_2025_12_01_21_34').select('id, nama_lengkap, kelas').eq('status', 'aktif').order('nama_lengkap');
      if (santriData) setSantriList(santriData);

    } catch (err: any) { console.error(err); } 
    finally { setLoading(false); }
  };

  // Fetch Members ketika Ekskul dipilih
  const fetchMembers = async (actId: string) => {
      if (!actId) return;
      setLoading(true);
      try {
          const { data, error } = await supabase
            .from('activity_members')
            .select(`id, santri_id, santri:santri_2025_12_01_21_34(nama_lengkap, kelas)`)
            .eq('activity_id', actId);
            
          if (error) throw error;
          // @ts-ignore
          setMembers(data || []);
      } catch (err: any) {
          toast({ title: "Gagal ambil data", description: err.message, variant: "destructive" });
      } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  
  // Efek ganti ekskul
  useEffect(() => { 
      if (selectedEkskulId) fetchMembers(selectedEkskulId); 
      else setMembers([]);
  }, [selectedEkskulId]);

  /* ================= ACTIONS ================= */
  const handleDelete = async (table: string, id: number) => {
    if (!confirm("Hapus data ini?")) return;
    try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        toast({ title: "Terhapus", description: "Data berhasil dihapus." });
        if (table === 'activity_members') {
            fetchMembers(selectedEkskulId); // Refresh list member aja
        } else {
            fetchData();
        }
    } catch (err: any) { toast({ title: "Gagal", description: err.message, variant: "destructive" }); }
  };

  const handleSave = async () => {
    try {
        let error;
        const payload = { ...formData }; 

        if (dialogType === 'member') { // 櫨 SIMPAN MEMBER EKSKUL
             const data = { activity_id: parseInt(selectedEkskulId), santri_id: payload.santri_id };
             const { error: err } = await supabase.from('activity_members').insert([data]);
             error = err;
             if (!error) {
                 toast({ title: "Berhasil", description: "Santri ditambahkan ke ekskul." });
                 fetchMembers(selectedEkskulId); // Refresh khusus member
                 setIsDialogOpen(false);
                 return;
             }
        }
        else if (dialogType === 'device') {
            const data = { name: payload.name, token: payload.token, location_id: parseInt(payload.location_id), is_active: true };
            if (isEditMode) error = (await supabase.from('devices').update(data).eq('id', payload.id)).error;
            else error = (await supabase.from('devices').insert([data])).error;
        }
        else if (dialogType === 'rombel') { 
             const data = { nama: payload.name, kelas: parseInt(payload.kelas) };
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
             const data = {
                activity_id: parseInt(payload.activity_id),
                location_id: parseInt(payload.location_id),
                day_of_week: parseInt(payload.day_of_week),
                start_time: payload.start_time,
                end_time: payload.end_time,
                kelas: payload.kelas ? parseInt(payload.kelas) : null,
                rombel_id: (payload.rombel_id && payload.rombel_id !== 'all') ? parseInt(payload.rombel_id) : null 
             };
             if(isEditMode) error = (await supabase.from('schedules').update(data).eq('id', payload.id)).error;
             else error = (await supabase.from('schedules').insert([data])).error;
        }

        if (error) throw error;
        toast({ title: "Berhasil", description: "Data tersimpan.", className: "bg-green-600 text-white" });
        setIsDialogOpen(false);
        fetchData();
    } catch (err: any) { 
        // Handle error duplicate key
        if (err.code === '23505') toast({ title: "Gagal", description: "Santri ini sudah terdaftar di ekskul tersebut.", variant: "destructive" });
        else toast({ title: "Gagal", description: err.message, variant: "destructive" }); 
    }
  };

  // OPEN DIALOG
  const openAdd = (type: "activity" | "location" | "schedule" | "device" | "rombel" | "member", category: "school" | "pesantren" = "school") => {
      setDialogType(type);
      setScheduleCategory(category);
      setIsEditMode(false);
      
      let initialData: any = {};
      if (type === 'schedule') {
          initialData = { day_of_week: "1", start_time: "07:00", end_time: "08:00", kelas: filterKelas !== 'all' ? filterKelas : "7", location_id: "", rombel_id: "all" };
      } else if (type === 'device') {
          initialData = { token: "DEV_" + Math.floor(Math.random() * 10000) }; 
      } else if (type === 'activity') {
          initialData = { category: category === 'school' ? 'pelajaran' : 'ekskul', tipe_ekskul: 'wajib' };
      } else if (type === 'rombel') {
          initialData = { kelas: "7" }; 
      } else if (type === 'member') {
          if (!selectedEkskulId) { toast({title: "Pilih Ekskul Dulu", description: "Silakan pilih kegiatan ekskul di sebelah kiri."}); return; }
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
          kelas: data.kelas ? String(data.kelas) : undefined,
          rombel_id: data.rombel_id ? String(data.rombel_id) : undefined
      });
      setIsDialogOpen(true);
  };

  /* ================= RENDER LOGIC ================= */
  const schoolSchedules = schedules.filter(s => s.activity?.category === 'pelajaran');
  const pesantrenSchedules = schedules.filter(s => s.activity?.category !== 'pelajaran');
  
  const filteredSchool = filterKelas === 'all' ? schoolSchedules : schoolSchedules.filter(s => String(s.kelas) === filterKelas);
  const filteredPesantren = filterHari === 'all' ? pesantrenSchedules : pesantrenSchedules.filter(s => String(s.day_of_week) === filterHari);
  
  // List Ekskul untuk Dropdown Member
  const ekskulList = activities.filter(a => a.category !== 'pelajaran');

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
                                        <p className="font-bold text-gray-800 flex items-center gap-2">{sch.activity?.name}{sch.activity?.category !== 'pelajaran' && sch.activity?.tipe_ekskul && (<span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${sch.activity.tipe_ekskul === 'wajib' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{sch.activity.tipe_ekskul}</span>)}</p>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">{showKelas && sch.kelas && (<span className="text-xs bg-gray-200 px-1.5 rounded text-gray-700 font-bold flex items-center gap-1">Kls {sch.kelas} {sch.rombel?.nama ? `- ${sch.rombel.nama}` : ''}</span>)}{!showKelas && sch.rombel?.nama && (<span className="text-xs bg-gray-200 px-1.5 rounded text-gray-700 font-bold">{sch.rombel.nama}</span>)}<span className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {sch.location?.name}</span></div>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="icon" onClick={() => openEdit('schedule', sch)} className="text-blue-400 hover:bg-blue-50"><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete('schedules', sch.id)} className="text-red-400 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button></div>
                            </div>
                        ))}
                    </div>
                </div>
            )
        })}
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-purple-100">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><CalendarDays className="text-purple-600" /> Pengaturan Akademik</h2>
            <p className="text-sm text-gray-500">Atur jadwal KBM, Kelas, Rombel, dan Kegiatan Pesantren.</p>
        </div>
      </div>

      <Tabs defaultValue="kbm" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full md:w-[900px] grid-cols-5 bg-purple-50">
            <TabsTrigger value="kbm" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"><School className="w-4 h-4 mr-2" /> KBM</TabsTrigger>
            <TabsTrigger value="pesantren" className="data-[state=active]:bg-green-600 data-[state=active]:text-white"><Moon className="w-4 h-4 mr-2" /> Ekskul</TabsTrigger>
            {/* 櫨 TAB BARU */}
            <TabsTrigger value="members" className="data-[state=active]:bg-pink-600 data-[state=active]:text-white"><Users className="w-4 h-4 mr-2" /> Anggota</TabsTrigger>
            <TabsTrigger value="devices" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white"><Cpu className="w-4 h-4 mr-2" /> Alat IoT</TabsTrigger>
            <TabsTrigger value="activities"><Database className="w-4 h-4 mr-2" /> Master Data</TabsTrigger>
        </TabsList>

        {/* TAB 1: KBM */}
        <TabsContent value="kbm" className="mt-4 space-y-4">
            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-3 w-full md:w-auto"><Filter className="text-blue-400 w-5 h-5" /><div className="space-y-1"><label className="text-xs font-bold text-blue-700 uppercase">Lihat Jadwal Kelas:</label><Select value={filterKelas} onValueChange={setFilterKelas}><SelectTrigger className="w-[200px] font-bold border-blue-200 bg-white"><SelectValue placeholder="Semua Kelas" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Kelas</SelectItem>{KELAS_LIST.map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}</SelectContent></Select></div></div>
                <Button onClick={() => openAdd('schedule', 'school')} className="bg-blue-600 hover:bg-blue-700 shadow-md"><Plus className="w-4 h-4 mr-2" /> Buat Jadwal Pelajaran</Button>
            </div>
            <Card className="border-t-4 border-t-blue-600 shadow-sm"><CardHeader><CardTitle>Jadwal Mata Pelajaran {filterKelas !== 'all' ? `Kelas ${filterKelas}` : 'Semua Kelas'}</CardTitle></CardHeader><CardContent><ScheduleList data={filteredSchool} showKelas={filterKelas === 'all'} /></CardContent></Card>
        </TabsContent>

        {/* TAB 2: EKSKUL */}
        <TabsContent value="pesantren" className="mt-4 space-y-4">
            <div className="bg-green-50/50 p-4 rounded-lg border border-green-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-3 w-full md:w-auto"><Filter className="text-green-400 w-5 h-5" /><div className="space-y-1"><label className="text-xs font-bold text-green-700 uppercase">Filter Hari:</label><Select value={filterHari} onValueChange={setFilterHari}><SelectTrigger className="w-[200px] font-bold border-green-200 bg-white"><SelectValue placeholder="Semua Hari" /></SelectTrigger><SelectContent><SelectItem value="all">Semua Hari</SelectItem>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent></Select></div></div>
                <Button onClick={() => openAdd('schedule', 'pesantren')} className="bg-green-600 hover:bg-green-700 shadow-md"><Plus className="w-4 h-4 mr-2" /> Tambah Kegiatan</Button>
            </div>
            <Card className="border-t-4 border-t-green-600 shadow-sm"><CardHeader className="pb-2"><CardTitle>Jadwal Ekstrakulikuler & Kegiatan</CardTitle></CardHeader><CardContent><ScheduleList data={filteredPesantren} showKelas={false} /></CardContent></Card>
        </TabsContent>
        
        {/* 櫨 TAB 3: ANGGOTA EKSKUL (BARU) */}
        <TabsContent value="members" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px]">
                {/* KOLOM KIRI: PILIH EKSKUL */}
                <Card className="col-span-1 border-pink-200 h-full flex flex-col">
                    <CardHeader className="bg-pink-50/50 pb-2"><CardTitle className="text-lg text-pink-700 flex items-center gap-2"><Medal className="w-5 h-5"/> Pilih Ekskul</CardTitle></CardHeader>
                    <CardContent className="pt-4 flex-1 overflow-y-auto space-y-2">
                        {ekskulList.length === 0 && <p className="text-sm text-gray-400 text-center">Belum ada data ekskul.</p>}
                        {ekskulList.map((act) => (
                            <div key={act.id} onClick={() => setSelectedEkskulId(String(act.id))} className={`p-3 rounded-lg cursor-pointer border transition-all ${selectedEkskulId === String(act.id) ? 'bg-pink-100 border-pink-500 shadow-sm' : 'hover:bg-gray-50 border-transparent hover:border-gray-200'}`}>
                                <h4 className={`font-bold ${selectedEkskulId === String(act.id) ? 'text-pink-800' : 'text-gray-700'}`}>{act.name}</h4>
                                <div className="flex gap-2 mt-1">
                                    <span className="text-[10px] bg-white px-1.5 rounded border border-gray-200 text-gray-500 uppercase">{act.category}</span>
                                    {act.tipe_ekskul && <span className={`text-[10px] px-1.5 rounded text-white ${act.tipe_ekskul === 'wajib' ? 'bg-red-400' : 'bg-blue-400'}`}>{act.tipe_ekskul}</span>}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* KOLOM KANAN: LIST ANGGOTA */}
                <Card className="col-span-1 md:col-span-2 border-pink-200 h-full flex flex-col">
                    <CardHeader className="bg-white border-b pb-3 flex flex-row justify-between items-center">
                        <div>
                            <CardTitle className="text-lg text-gray-800">Daftar Anggota</CardTitle>
                            <p className="text-xs text-gray-500 mt-1">
                                {selectedEkskulId 
                                    ? `Santri yang mengikuti ${activities.find(a => String(a.id) === selectedEkskulId)?.name || '...'}`
                                    : "Pilih ekskul di sebelah kiri untuk melihat anggota."}
                            </p>
                        </div>
                        {selectedEkskulId && (
                            <Button onClick={() => openAdd('member')} className="bg-pink-600 hover:bg-pink-700 text-white"><UserPlus className="w-4 h-4 mr-2"/> Tambah Anggota</Button>
                        )}
                    </CardHeader>
                    <CardContent className="pt-0 flex-1 overflow-y-auto bg-gray-50/30 p-0">
                        {!selectedEkskulId ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <Users className="w-16 h-16 opacity-20 mb-2" />
                                <p>Silakan pilih ekskul terlebih dahulu.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {members.length === 0 && (
                                    <div className="text-center py-10 text-gray-400"><p>Belum ada anggota di ekskul ini.</p></div>
                                )}
                                {members.map((m, idx) => (
                                    <div key={m.id} className="flex items-center justify-between p-4 hover:bg-white bg-white/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-xs">{idx + 1}</div>
                                            <div>
                                                <p className="font-bold text-gray-800">{m.santri?.nama_lengkap || "Nama Tidak Ditemukan"}</p>
                                                <p className="text-xs text-gray-500">Kelas {m.santri?.kelas || "-"}</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete('activity_members', m.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </TabsContent>

        {/* TAB 4: DEVICES */}
        <TabsContent value="devices" className="mt-4 space-y-4">
            <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100 flex justify-between items-center">
                <div className="flex items-center gap-3"><Wifi className="text-orange-500 w-6 h-6" /><div><h3 className="font-bold text-orange-900">Manajemen Alat Absensi</h3><p className="text-xs text-orange-700">Daftarkan alat WT32-ETH01 dan tentukan lokasinya.</p></div></div>
                <Button onClick={() => openAdd('device')} className="bg-orange-600 hover:bg-orange-700 text-white"><Plus className="w-4 h-4 mr-2" /> Tambah Alat</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {devices.map((dev) => (
                    <Card key={dev.id} className="border-t-4 border-t-orange-500 shadow-sm"><CardHeader className="pb-2 flex flex-row justify-between items-start"><div><CardTitle className="text-base">{dev.name}</CardTitle><span className="text-[10px] text-gray-400 font-mono">ID: {dev.id}</span></div><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit('device', dev)}><Pencil className="w-3 h-3 text-blue-500" /></Button><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete('devices', dev.id)}><Trash2 className="w-3 h-3 text-red-500" /></Button></div></CardHeader><CardContent className="space-y-3"><div className="bg-gray-100 p-2 rounded text-xs font-mono break-all border border-gray-200"><span className="text-gray-500 block mb-1">Token Alat:</span><span className="font-bold text-gray-800">{dev.token}</span></div><div className="flex items-center gap-2 text-sm text-gray-600"><MapPin className="w-4 h-4 text-orange-600" /><span className="font-medium">{dev.location?.name || "Lokasi tidak ditemukan"}</span></div></CardContent></Card>
                ))}
            </div>
        </TabsContent>

        {/* TAB 5: MASTER DATA */}
        <TabsContent value="activities" className="mt-4 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-l-4 border-l-purple-500"><CardHeader className="flex flex-row items-center justify-between pb-2 bg-purple-50/30"><div><CardTitle className="text-lg flex items-center gap-2"><MapPin className="text-purple-600 w-5 h-5"/> Data Lokasi</CardTitle></div><Button onClick={() => openAdd('location')} variant="outline" size="sm" className="border-purple-200 text-purple-700"><Plus className="w-4 h-4 mr-2" /> Tambah</Button></CardHeader><CardContent className="pt-4 max-h-[400px] overflow-y-auto">{locations.map((loc) => (<div key={loc.id} className="flex justify-between items-center p-2 hover:bg-gray-50 border-b last:border-0"><div className="flex items-center gap-2"><MapPin size={14} className="text-purple-400"/><span className="text-sm font-bold">{loc.name}</span> <span className="text-[10px] bg-gray-100 px-1 rounded">{loc.type}</span></div><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit('location', loc)}><Pencil size={12}/></Button><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete('locations', loc.id)}><Trash2 size={12} className="text-red-400"/></Button></div></div>))}</CardContent></Card>
                <Card className="border-l-4 border-l-blue-500"><CardHeader className="flex flex-row items-center justify-between pb-2 bg-blue-50/30"><div><CardTitle className="text-lg flex items-center gap-2"><Users className="text-blue-600 w-5 h-5"/> Data Rombel</CardTitle></div><Button onClick={() => openAdd('rombel')} variant="outline" size="sm" className="border-blue-200 text-blue-700"><Plus className="w-4 h-4 mr-2" /> Tambah</Button></CardHeader><CardContent className="pt-4 max-h-[400px] overflow-y-auto">{KELAS_LIST.map((k) => {const rombelKelas = rombels.filter(r => r.kelas === k); if (rombelKelas.length === 0) return null; return (<div key={k} className="mb-3"><div className="text-xs font-bold text-gray-500 uppercase mb-1">Kelas {k}</div><div className="space-y-1">{rombelKelas.map(r => (<div key={r.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border hover:bg-blue-50"><span className="text-sm font-bold">Rombel {r.nama}</span><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => openEdit('rombel', r)}><Pencil size={10}/></Button><Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleDelete('rombels', r.id)}><Trash2 size={10} className="text-red-400"/></Button></div></div>))}</div></div>)})}{rombels.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Belum ada data rombel.</p>}</CardContent></Card>
                <Card className="border-l-4 border-l-orange-500"><CardHeader className="flex flex-row items-center justify-between pb-2 bg-orange-50/30"><div><CardTitle className="text-lg flex items-center gap-2"><BookOpen className="text-orange-600 w-5 h-5"/> Kegiatan & Mapel</CardTitle></div><Button onClick={() => openAdd('activity')} variant="outline" size="sm" className="border-orange-200 text-orange-700"><Plus className="w-4 h-4 mr-2" /> Tambah</Button></CardHeader><CardContent className="pt-4 max-h-[400px] overflow-y-auto">{activities.map((act) => (<div key={act.id} className="flex justify-between items-center p-2 hover:bg-gray-50 border-b last:border-0"><div><div className="text-sm font-bold">{act.name}</div><div className="flex gap-1 mt-1"><span className="text-[10px] bg-gray-100 px-1 rounded uppercase">{act.category}</span>{act.category !== 'pelajaran' && <span className={`text-[10px] px-1 rounded uppercase ${act.tipe_ekskul === 'wajib' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{act.tipe_ekskul}</span>}</div></div><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit('activity', act)}><Pencil size={12}/></Button><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete('activities', act.id)}><Trash2 size={12} className="text-red-400"/></Button></div></div>))}</CardContent></Card>
            </div>
        </TabsContent>
      </Tabs>

      {/* ================= DIALOG FORM ================= */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{isEditMode ? "Edit Data" : "Tambah Data Baru"}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
                {dialogType === 'activity' && (
                    <>
                        <div className="space-y-2"><label className="text-sm font-medium">Nama Kegiatan</label><Input placeholder="Contoh: Matematika" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
                        <div className="space-y-2"><label className="text-sm font-medium">Kategori</label><Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}><SelectTrigger><SelectValue placeholder="Pilih Kategori" /></SelectTrigger><SelectContent><SelectItem value="pelajaran">Mata Pelajaran</SelectItem><SelectItem value="ibadah">Ibadah</SelectItem><SelectItem value="ekskul">Ekskul / Seni</SelectItem><SelectItem value="umum">Umum</SelectItem></SelectContent></Select></div>
                        {formData.category !== 'pelajaran' && <div className="space-y-2"><label className="text-sm font-medium">Tipe Kehadiran</label><Select value={formData.tipe_ekskul} onValueChange={(v) => setFormData({...formData, tipe_ekskul: v})}><SelectTrigger><SelectValue placeholder="Pilih Tipe" /></SelectTrigger><SelectContent><SelectItem value="wajib">Wajib (Semua Santri)</SelectItem><SelectItem value="pilihan">Pilihan (Sesuai Minat)</SelectItem></SelectContent></Select></div>}
                    </>
                )}
                {/* 櫨 FORM TAMBAH MEMBER EKSKUL */}
                {dialogType === 'member' && (
                    <>
                         <div className="bg-pink-50 p-3 rounded text-sm text-pink-800 mb-2">
                             Menambahkan anggota ke: <strong>{activities.find(a => String(a.id) === selectedEkskulId)?.name}</strong>
                         </div>
                         <div className="space-y-2">
                            <label className="text-sm font-medium">Pilih Santri</label>
                            <Select value={formData.santri_id} onValueChange={(v) => setFormData({...formData, santri_id: v})}>
                                <SelectTrigger><SelectValue placeholder="Cari Nama Santri..." /></SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {santriList.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.nama_lengkap} (Kelas {s.kelas})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
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
                        <div className="space-y-2"><label className="text-sm font-medium">Kelas</label><Select value={String(formData.kelas || '')} onValueChange={(v) => setFormData({...formData, kelas: v})}><SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger><SelectContent>{KELAS_LIST.map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><label className="text-sm font-medium">Nama Rombel / Bagian</label><Input placeholder="Contoh: A, B, Tahfidz" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
                    </>
                )}
                {dialogType === 'schedule' && (
                    <>
                        {scheduleCategory === 'school' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-blue-700">Untuk Kelas</label>
                                    <Select value={String(formData.kelas || '')} onValueChange={(v) => setFormData({...formData, kelas: v})}>
                                        <SelectTrigger className="bg-blue-50"><SelectValue placeholder="Kelas" /></SelectTrigger>
                                        <SelectContent>{KELAS_LIST.map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-blue-700">Rombel (Opsional)</label>
                                    <Select value={String(formData.rombel_id || '')} onValueChange={(v) => setFormData({...formData, rombel_id: v})}>
                                        <SelectTrigger className="bg-blue-50"><SelectValue placeholder="Semua / Spesifik" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Semua Rombel</SelectItem>
                                            {rombels.filter(r => String(r.kelas) === String(formData.kelas)).map(r => (
                                                <SelectItem key={r.id} value={String(r.id)}>Rombel {r.nama}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                        
                        <div className="space-y-2"><label className="text-sm font-medium">Kegiatan / Mapel</label><Select value={String(formData.activity_id || '')} onValueChange={(v) => setFormData({...formData, activity_id: v})}><SelectTrigger><SelectValue placeholder="Cari..." /></SelectTrigger><SelectContent className="max-h-[200px]">{activities.filter(a => scheduleCategory === 'school' ? a.category === 'pelajaran' : a.category !== 'pelajaran').map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent></Select></div>
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
