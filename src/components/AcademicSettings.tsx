import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  School, Moon, BookOpen, MapPin, Plus, Trash2, CalendarDays, Filter, 
  Database, Clock, Building2, Home 
} from "lucide-react";

/* ================= TYPES ================= */
interface Activity { id: number; name: string; category: string; }
interface Location { id: number; name: string; type: string; }
interface Schedule {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  activity: { name: string; category: string };
  location: { name: string; id: number };
  is_active: boolean;
}

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const AcademicSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("kbm");

  // DATA STATE
  const [activities, setActivities] = useState<Activity[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  // FILTER STATE
  const [filterKelas, setFilterKelas] = useState<string>("all");   
  const [filterLokasi, setFilterLokasi] = useState<string>("all"); 

  // FORM STATE
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // 🔥 UPDATE TYPE: Tambah 'location'
  const [dialogType, setDialogType] = useState<"activity" | "schedule" | "location">("activity");
  const [scheduleCategory, setScheduleCategory] = useState<"school" | "pesantren">("school");
  const [formData, setFormData] = useState<any>({});

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: actData } = await supabase.from('activities').select('*').order('name');
      if (actData) setActivities(actData);

      const { data: locData } = await supabase.from('locations').select('*').order('name');
      if (locData) setLocations(locData);

      const { data: schData, error } = await supabase
        .from('schedules')
        .select(`
            id, day_of_week, start_time, end_time, is_active, location_id, activity_id,
            activity:activity_id(name, category),
            location:location_id(name, id)
        `)
        .order('day_of_week')
        .order('start_time');
      
      if (error) throw error;
      // @ts-ignore
      if (schData) setSchedules(schData);

    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  /* ================= ACTIONS ================= */
  const handleDelete = async (table: string, id: number) => {
    if (!confirm("Hapus data ini? Hati-hati, jadwal yang terkait juga akan terhapus.")) return;
    try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        toast({ title: "Terhapus", description: "Data berhasil dihapus." });
        fetchData();
    } catch (err: any) { toast({ title: "Gagal", description: err.message, variant: "destructive" }); }
  };

  const handleSave = async () => {
    try {
        if (dialogType === 'activity') {
            const { error } = await supabase.from('activities').insert([{ 
                name: formData.name, 
                category: formData.category || 'umum' 
            }]);
            if (error) throw error;
        } 
        // 🔥 LOGIC BARU: SIMPAN LOKASI
        else if (dialogType === 'location') {
            const { error } = await supabase.from('locations').insert([{ 
                name: formData.name, 
                type: formData.type || 'general' 
            }]);
            if (error) throw error;
        }
        else if (dialogType === 'schedule') {
            const { error } = await supabase.from('schedules').insert([{
                activity_id: parseInt(formData.activity_id),
                location_id: parseInt(formData.location_id),
                day_of_week: parseInt(formData.day_of_week),
                start_time: formData.start_time,
                end_time: formData.end_time
            }]);
            if (error) throw error;
        }
        toast({ title: "Berhasil", description: "Data tersimpan.", className: "bg-green-600 text-white" });
        setIsDialogOpen(false);
        fetchData();
    } catch (err: any) { toast({ title: "Gagal", description: err.message, variant: "destructive" }); }
  };

  const openAddActivity = () => { setDialogType('activity'); setFormData({}); setIsDialogOpen(true); };
  // 🔥 FUNGSI BARU
  const openAddLocation = () => { setDialogType('location'); setFormData({}); setIsDialogOpen(true); };
  
  const openAddSchedule = (type: "school" | "pesantren") => { 
      setDialogType('schedule'); 
      setScheduleCategory(type);
      const initialLoc = type === 'school' 
        ? (filterKelas !== 'all' ? filterKelas : "") 
        : (filterLokasi !== 'all' ? filterLokasi : "");
      
      setFormData({ day_of_week: "1", start_time: "07:00", end_time: "08:00", location_id: initialLoc }); 
      setIsDialogOpen(true); 
  };

  // LOGIC MEMISAHKAN JADWAL
  const schoolSchedules = schedules.filter(s => s.activity.category === 'pelajaran');
  const pesantrenSchedules = schedules.filter(s => s.activity.category !== 'pelajaran');

  const filteredSchool = filterKelas === 'all' ? schoolSchedules : schoolSchedules.filter(s => String(s.location.id) === filterKelas);
  const filteredPesantren = filterLokasi === 'all' ? pesantrenSchedules : pesantrenSchedules.filter(s => String(s.location.id) === filterLokasi);

  const ScheduleList = ({ data }: { data: Schedule[] }) => (
    <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6, 0].map((dayCode) => { 
            const dayItems = data.filter(s => s.day_of_week === dayCode);
            if (dayItems.length === 0) return null;
            return (
                <div key={dayCode} className="border rounded-xl overflow-hidden bg-white shadow-sm">
                    <div className="bg-gray-50 px-4 py-2 font-bold text-gray-800 flex items-center gap-2 border-b">
                        <CalendarDays className="w-4 h-4 text-gray-500" /> {DAYS[dayCode]}
                    </div>
                    <div className="divide-y divide-gray-100">
                        {dayItems.map((sch) => (
                            <div key={sch.id} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="text-center w-20 border-r border-gray-100 pr-3">
                                        <span className="block text-sm font-black text-gray-700">{sch.start_time.slice(0,5)}</span>
                                        <span className="block text-[10px] text-gray-400">s/d {sch.end_time.slice(0,5)}</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800">{sch.activity?.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${sch.activity.category === 'pelajaran' ? 'bg-blue-100 text-blue-700' : (sch.activity.category === 'ibadah' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700')}`}>
                                                {sch.activity.category}
                                            </span>
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> {sch.location?.name}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete('schedules', sch.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-50 transition-all"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                        ))}
                    </div>
                </div>
            )
        })}
        {data.length === 0 && (
            <div className="text-center py-10 text-gray-400 bg-gray-50/50 rounded-xl border border-dashed">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Belum ada jadwal di kategori ini.</p>
            </div>
        )}
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-purple-100">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <CalendarDays className="text-purple-600" /> Pengaturan Jadwal
            </h2>
            <p className="text-sm text-gray-500">Kelola jadwal KBM Sekolah dan Kegiatan Pesantren secara terpisah.</p>
        </div>
      </div>

      <Tabs defaultValue="kbm" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full md:w-[600px] grid-cols-3 bg-purple-50">
            <TabsTrigger value="kbm" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"><School className="w-4 h-4 mr-2" /> KBM Sekolah</TabsTrigger>
            <TabsTrigger value="pesantren" className="data-[state=active]:bg-green-600 data-[state=active]:text-white"><Moon className="w-4 h-4 mr-2" /> Kegiatan Pesantren</TabsTrigger>
            <TabsTrigger value="activities"><Database className="w-4 h-4 mr-2" /> Database Master</TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: KBM SEKOLAH ================= */}
        <TabsContent value="kbm" className="mt-4 space-y-4">
            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Filter className="text-blue-400 w-5 h-5" />
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-blue-700 uppercase">Filter Kelas:</label>
                        <Select value={filterKelas} onValueChange={setFilterKelas}>
                            <SelectTrigger className="w-[250px] font-bold border-blue-200"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Kelas</SelectItem>
                                {locations.filter(l => l.type === 'class').map(l => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <Button onClick={() => openAddSchedule('school')} className="bg-blue-600 hover:bg-blue-700 shadow-md w-full md:w-auto border-none"><Plus className="w-4 h-4 mr-2" /> Tambah Pelajaran</Button>
            </div>
            <Card className="border-t-4 border-t-blue-600 shadow-sm">
                <CardHeader><CardTitle>Jadwal Mata Pelajaran</CardTitle></CardHeader>
                <CardContent><ScheduleList data={filteredSchool} /></CardContent>
            </Card>
        </TabsContent>

        {/* ================= TAB 2: KEGIATAN PESANTREN ================= */}
        <TabsContent value="pesantren" className="mt-4 space-y-4">
            <div className="bg-green-50/50 p-4 rounded-lg border border-green-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Filter className="text-green-400 w-5 h-5" />
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-green-700 uppercase">Filter Lokasi:</label>
                        <Select value={filterLokasi} onValueChange={setFilterLokasi}>
                            <SelectTrigger className="w-[250px] font-bold border-green-200"><SelectValue placeholder="Semua Lokasi" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Lokasi</SelectItem>
                                {locations.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <Button onClick={() => openAddSchedule('pesantren')} className="bg-green-600 hover:bg-green-700 shadow-md w-full md:w-auto border-none"><Plus className="w-4 h-4 mr-2" /> Tambah Kegiatan</Button>
            </div>
            <Card className="border-t-4 border-t-green-600 shadow-sm">
                <CardHeader><CardTitle>Jadwal Kegiatan Pondok</CardTitle></CardHeader>
                <CardContent><ScheduleList data={filteredPesantren} /></CardContent>
            </Card>
        </TabsContent>

        {/* ================= TAB 3: DATABASE MASTER (UPDATED) ================= */}
        <TabsContent value="activities" className="mt-4 space-y-8">
            {/* BAGIAN 1: LOKASI & RUANGAN */}
            <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-purple-50/30">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2"><MapPin className="text-purple-600 w-5 h-5"/> Data Lokasi & Ruangan</CardTitle>
                        <CardDescription>Daftar tempat absensi (Kelas, Masjid, Asrama, dll).</CardDescription>
                    </div>
                    <Button onClick={openAddLocation} variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50"><Plus className="w-4 h-4 mr-2" /> Tambah Lokasi</Button>
                </CardHeader>
                <CardContent className="pt-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {locations.map((loc) => (
                            <div key={loc.id} className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${loc.type === 'class' ? 'bg-blue-50 text-blue-600' : (loc.type === 'mosque' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600')}`}>
                                        {loc.type === 'class' ? <School className="w-4 h-4" /> : (loc.type === 'mosque' ? <Moon className="w-4 h-4" /> : <Building2 className="w-4 h-4" />)}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-bold text-gray-800 text-sm truncate">{loc.name}</p>
                                        <span className="text-[10px] uppercase font-bold text-gray-400">{loc.type}</span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete('locations', loc.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* BAGIAN 2: KEGIATAN & MAPEL */}
            <Card className="border-l-4 border-l-orange-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-orange-50/30">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2"><BookOpen className="text-orange-600 w-5 h-5"/> Data Mapel & Kegiatan</CardTitle>
                        <CardDescription>Daftar nama mata pelajaran dan aktivitas lainnya.</CardDescription>
                    </div>
                    <Button onClick={openAddActivity} variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50"><Plus className="w-4 h-4 mr-2" /> Tambah Kegiatan</Button>
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {activities.map((act) => (
                            <div key={act.id} className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${act.category === 'pelajaran' ? 'bg-blue-50 text-blue-600' : (act.category === 'ibadah' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600')}`}>
                                        {act.category === 'pelajaran' ? <BookOpen className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-bold text-gray-800 text-sm truncate">{act.name}</p>
                                        <span className="text-[10px] uppercase font-bold text-gray-400">{act.category}</span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete('activities', act.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      {/* ================= DIALOG FORM ================= */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle>
                    {dialogType === 'activity' && "Tambah Nama Kegiatan/Mapel"}
                    {dialogType === 'location' && "Tambah Lokasi Baru"}
                    {dialogType === 'schedule' && (scheduleCategory === 'school' ? "Tambah Jadwal Pelajaran" : "Tambah Kegiatan Pondok")}
                </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
                {/* FORM MASTER KEGIATAN */}
                {dialogType === 'activity' && (
                    <>
                        <div className="space-y-2"><label className="text-sm font-medium">Nama Kegiatan</label><Input placeholder="Contoh: Matematika / Sholat Subuh" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
                        <div className="space-y-2"><label className="text-sm font-medium">Kategori</label>
                            <Select onValueChange={(v) => setFormData({...formData, category: v})}>
                                <SelectTrigger><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                                <SelectContent><SelectItem value="pelajaran">Mata Pelajaran (KBM)</SelectItem><SelectItem value="ibadah">Ibadah</SelectItem><SelectItem value="ekskul">Ekskul</SelectItem><SelectItem value="umum">Umum</SelectItem></SelectContent>
                            </Select>
                        </div>
                    </>
                )}

                {/* 🔥 FORM MASTER LOKASI (BARU) */}
                {dialogType === 'location' && (
                    <>
                        <div className="space-y-2"><label className="text-sm font-medium">Nama Tempat / Ruangan</label><Input placeholder="Contoh: Kelas 7A / Asrama Putra" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
                        <div className="space-y-2"><label className="text-sm font-medium">Kategori Tempat</label>
                            <Select onValueChange={(v) => setFormData({...formData, type: v})}>
                                <SelectTrigger><SelectValue placeholder="Pilih Tipe" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="class">Kelas / Ruang Belajar</SelectItem>
                                    <SelectItem value="mosque">Masjid / Musholla</SelectItem>
                                    <SelectItem value="dorm">Asrama</SelectItem>
                                    <SelectItem value="gate">Gerbang / Pos Satpam</SelectItem>
                                    <SelectItem value="general">Area Umum</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </>
                )}

                {/* FORM JADWAL */}
                {dialogType === 'schedule' && (
                    <>
                        <div className="space-y-2"><label className="text-sm font-medium">{scheduleCategory === 'school' ? 'Kelas' : 'Lokasi'}</label>
                            <Select value={String(formData.location_id || '')} onValueChange={(v) => setFormData({...formData, location_id: v})}>
                                <SelectTrigger className="bg-gray-50"><SelectValue placeholder="Pilih Tempat" /></SelectTrigger>
                                <SelectContent>{locations.filter(l => scheduleCategory === 'school' ? l.type === 'class' : true).map(l => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2"><label className="text-sm font-medium">{scheduleCategory === 'school' ? 'Mata Pelajaran' : 'Nama Kegiatan'}</label>
                            <Select onValueChange={(v) => setFormData({...formData, activity_id: v})}>
                                <SelectTrigger><SelectValue placeholder="Cari..." /></SelectTrigger>
                                <SelectContent className="max-h-[200px]">{activities.filter(a => scheduleCategory === 'school' ? a.category === 'pelajaran' : a.category !== 'pelajaran').map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2"><label className="text-sm font-medium">Hari</label>
                            <Select value={String(formData.day_of_week)} onValueChange={(v) => setFormData({...formData, day_of_week: v})}>
                                <SelectTrigger><SelectValue placeholder="Pilih Hari" /></SelectTrigger>
                                <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><label className="text-sm font-medium">Jam Mulai</label><Input type="time" value={formData.start_time || ''} onChange={(e) => setFormData({...formData, start_time: e.target.value})} /></div>
                            <div className="space-y-2"><label className="text-sm font-medium">Jam Selesai</label><Input type="time" value={formData.end_time || ''} onChange={(e) => setFormData({...formData, end_time: e.target.value})} /></div>
                        </div>
                    </>
                )}
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">Simpan</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AcademicSettings;
