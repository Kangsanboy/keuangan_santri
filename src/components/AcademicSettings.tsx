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
  CalendarClock, BookOpen, MapPin, Plus, Trash2, CalendarDays, Filter, School 
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
  const [activeTab, setActiveTab] = useState("schedules"); // Default ke Jadwal biar langsung kerja

  // DATA STATE
  const [activities, setActivities] = useState<Activity[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  // FILTER STATE (PENTING BUAT KBM)
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>("all");

  // FORM STATE
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"activity" | "schedule">("activity");
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
            id, day_of_week, start_time, end_time, is_active, location_id,
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
    if (!confirm("Hapus data ini?")) return;
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
        } else if (dialogType === 'schedule') {
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
  
  const openAddSchedule = () => { 
      setDialogType('schedule'); 
      // Auto select location kalau filter lagi aktif
      const initialLoc = selectedLocationFilter !== 'all' ? selectedLocationFilter : "";
      setFormData({ day_of_week: "1", start_time: "07:00", end_time: "08:00", location_id: initialLoc }); 
      setIsDialogOpen(true); 
  };

  // FILTER LOGIC
  const filteredSchedules = selectedLocationFilter === 'all' 
    ? schedules 
    : schedules.filter(s => String(s.location.id) === selectedLocationFilter);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-blue-100">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <School className="text-blue-600" /> Roster Akademik
            </h2>
            <p className="text-sm text-gray-500">Atur jadwal pelajaran (KBM) dan kegiatan rutin.</p>
        </div>
      </div>

      <Tabs defaultValue="schedules" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
            <TabsTrigger value="schedules">Jadwal Pelajaran</TabsTrigger>
            <TabsTrigger value="activities">Database Mapel</TabsTrigger>
        </TabsList>

        {/* TAB 1: JADWAL PELAJARAN (UTAMA) */}
        <TabsContent value="schedules" className="mt-4 space-y-4">
            {/* FILTER BAR */}
            <div className="bg-white p-4 rounded-lg border flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Filter className="text-gray-400 w-5 h-5" />
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Filter Ruangan / Kelas:</label>
                        <Select value={selectedLocationFilter} onValueChange={setSelectedLocationFilter}>
                            <SelectTrigger className="w-[250px] font-bold"><SelectValue placeholder="Pilih Lokasi" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">-- Tampilkan Semua --</SelectItem>
                                {locations.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <Button onClick={openAddSchedule} className="bg-blue-600 hover:bg-blue-700 shadow-md w-full md:w-auto">
                    <Plus className="w-4 h-4 mr-2" /> Tambah Jadwal
                </Button>
            </div>

            {/* ROSTER DISPLAY */}
            <Card className="border-t-4 border-t-blue-600">
                <CardHeader>
                    <CardTitle>
                        {selectedLocationFilter === 'all' 
                            ? "Jadwal Keseluruhan" 
                            : `Jadwal ${locations.find(l => String(l.id) === selectedLocationFilter)?.name || ''}`}
                    </CardTitle>
                    <CardDescription>
                        {filteredSchedules.length} slot jadwal ditemukan.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* LOOP PER HARI */}
                    {[1, 2, 3, 4, 5, 6, 0].map((dayCode) => { 
                        const daySchedules = filteredSchedules.filter(s => s.day_of_week === dayCode);
                        if (daySchedules.length === 0) return null;

                        return (
                            <div key={dayCode} className="border rounded-xl overflow-hidden bg-white shadow-sm">
                                <div className="bg-gray-50 px-4 py-3 font-bold text-gray-800 flex items-center gap-2 border-b">
                                    <CalendarDays className="w-5 h-5 text-blue-600" /> {DAYS[dayCode]}
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {daySchedules.map((sch) => (
                                        <div key={sch.id} className="p-4 flex items-center justify-between hover:bg-blue-50 transition-colors group">
                                            <div className="flex items-center gap-6">
                                                {/* KOLOM JAM */}
                                                <div className="text-center w-24 border-r border-gray-100 pr-4">
                                                    <span className="block text-lg font-black text-blue-700">{sch.start_time.slice(0,5)}</span>
                                                    <span className="block text-xs text-gray-400 font-medium">s/d {sch.end_time.slice(0,5)}</span>
                                                </div>
                                                
                                                {/* KOLOM MAPEL */}
                                                <div>
                                                    <p className="font-bold text-gray-800 text-lg">{sch.activity?.name}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider ${sch.activity.category === 'pelajaran' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
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
                    {filteredSchedules.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                            <CalendarClock className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p>Belum ada jadwal untuk filter ini.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>

        {/* TAB 2: MASTER KEGIATAN/MAPEL */}
        <TabsContent value="activities" className="mt-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div><CardTitle>Database Mata Pelajaran & Kegiatan</CardTitle><CardDescription>Tambahkan mapel baru disini sebelum membuat jadwal.</CardDescription></div>
                    <Button onClick={openAddActivity} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50"><Plus className="w-4 h-4 mr-2" /> Tambah Baru</Button>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {activities.map((act) => (
                            <div key={act.id} className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${act.category === 'pelajaran' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                        <BookOpen className="w-4 h-4" />
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

      {/* DIALOG FORM INPUT */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle>{dialogType === 'activity' ? "Tambah Mapel / Kegiatan" : "Tambah Slot Jadwal"}</DialogTitle>
                <DialogDescription>Pastikan data yang diinput valid.</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
                {/* FORM KEGIATAN */}
                {dialogType === 'activity' && (
                    <>
                        <div className="space-y-2"><label className="text-sm font-medium">Nama Mapel / Kegiatan</label><Input placeholder="Contoh: Biologi" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} autoFocus /></div>
                        <div className="space-y-2"><label className="text-sm font-medium">Kategori</label>
                            <Select onValueChange={(v) => setFormData({...formData, category: v})}>
                                <SelectTrigger><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                                <SelectContent><SelectItem value="pelajaran">Mata Pelajaran</SelectItem><SelectItem value="ibadah">Ibadah</SelectItem><SelectItem value="ekskul">Ekskul</SelectItem><SelectItem value="umum">Umum</SelectItem></SelectContent>
                            </Select>
                        </div>
                    </>
                )}

                {/* FORM JADWAL */}
                {dialogType === 'schedule' && (
                    <>
                        <div className="space-y-2"><label className="text-sm font-medium">Lokasi / Kelas</label>
                            <Select value={String(formData.location_id || '')} onValueChange={(v) => setFormData({...formData, location_id: v})}>
                                <SelectTrigger className="bg-gray-50"><SelectValue placeholder="Pilih Ruangan" /></SelectTrigger>
                                <SelectContent>{locations.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2"><label className="text-sm font-medium">Hari</label>
                            <Select value={String(formData.day_of_week)} onValueChange={(v) => setFormData({...formData, day_of_week: v})}>
                                <SelectTrigger><SelectValue placeholder="Pilih Hari" /></SelectTrigger>
                                <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2"><label className="text-sm font-medium">Mata Pelajaran / Kegiatan</label>
                            <Select onValueChange={(v) => setFormData({...formData, activity_id: v})}>
                                <SelectTrigger><SelectValue placeholder="Cari Mapel..." /></SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    {activities.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                                </SelectContent>
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
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">Simpan</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AcademicSettings;
