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
  CalendarClock, BookOpen, MapPin, Plus, Trash2, Clock, 
  CheckCircle2, AlertCircle, CalendarDays 
} from "lucide-react";

/* ================= TYPES ================= */
interface Activity { id: number; name: string; category: string; }
interface Location { id: number; name: string; type: string; }
interface Schedule {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  activity: { name: string };
  location: { name: string };
  is_active: boolean;
}

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const AcademicSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("activities");

  // DATA STATE
  const [activities, setActivities] = useState<Activity[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  // FORM STATE
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"activity" | "schedule">("activity");
  
  // Form Data (Flexible)
  const [formData, setFormData] = useState<any>({});

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get Activities
      const { data: actData } = await supabase.from('activities').select('*').order('name');
      if (actData) setActivities(actData);

      // 2. Get Locations
      const { data: locData } = await supabase.from('locations').select('*').order('name');
      if (locData) setLocations(locData);

      // 3. Get Schedules (Join Activity & Location)
      const { data: schData, error } = await supabase
        .from('schedules')
        .select(`
            id, day_of_week, start_time, end_time, is_active,
            activity:activity_id(name),
            location:location_id(name)
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
    if (!confirm("Yakin ingin menghapus data ini?")) return;
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
  const openAddSchedule = () => { setDialogType('schedule'); setFormData({ day_of_week: "1", start_time: "07:00", end_time: "08:00" }); setIsDialogOpen(true); };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-blue-100">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <CalendarClock className="text-blue-600" /> Pengaturan Akademik
            </h2>
            <p className="text-sm text-gray-500">Atur kegiatan, jadwal harian, dan lokasi absensi.</p>
        </div>
      </div>

      <Tabs defaultValue="activities" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
            <TabsTrigger value="activities">Daftar Kegiatan</TabsTrigger>
            <TabsTrigger value="schedules">Jadwal Mingguan</TabsTrigger>
        </TabsList>

        {/* TAB 1: MASTER KEGIATAN */}
        <TabsContent value="activities" className="mt-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div><CardTitle>Master Kegiatan</CardTitle><CardDescription>Daftar nama kegiatan yang ada di pesantren.</CardDescription></div>
                    <Button onClick={openAddActivity} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" /> Tambah Kegiatan</Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {activities.map((act) => (
                            <div key={act.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:border-blue-300 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${act.category === 'ibadah' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                        <BookOpen className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800">{act.name}</p>
                                        <span className="text-[10px] uppercase tracking-wider bg-gray-200 px-2 py-0.5 rounded text-gray-600">{act.category}</span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete('activities', act.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        {/* TAB 2: JADWAL MINGGUAN */}
        <TabsContent value="schedules" className="mt-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div><CardTitle>Jadwal Aktif</CardTitle><CardDescription>Sistem akan menggunakan jadwal ini untuk absensi otomatis.</CardDescription></div>
                    <Button onClick={openAddSchedule} className="bg-green-600 hover:bg-green-700"><Plus className="w-4 h-4 mr-2" /> Buat Jadwal</Button>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* LOOP PER HARI */}
                    {[1, 2, 3, 4, 5, 6, 0].map((dayCode) => { // Mulai Senin (1) s/d Minggu (0)
                        const daySchedules = schedules.filter(s => s.day_of_week === dayCode);
                        if (daySchedules.length === 0) return null;

                        return (
                            <div key={dayCode} className="border rounded-xl overflow-hidden">
                                <div className="bg-gray-100 px-4 py-2 font-bold text-gray-700 flex items-center gap-2">
                                    <CalendarDays className="w-4 h-4" /> {DAYS[dayCode]}
                                </div>
                                <div className="divide-y divide-gray-100 bg-white">
                                    {daySchedules.map((sch) => (
                                        <div key={sch.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                                            <div className="flex items-center gap-4">
                                                <div className="text-center w-16">
                                                    <span className="block text-sm font-bold text-gray-800">{sch.start_time.slice(0,5)}</span>
                                                    <span className="block text-[10px] text-gray-400">s/d {sch.end_time.slice(0,5)}</span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800">{sch.activity?.name}</p>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {sch.location?.name}</p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete('schedules', sch.id)} className="text-red-400 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG FORM INPUT */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{dialogType === 'activity' ? "Tambah Kegiatan Baru" : "Tambah Jadwal Baru"}</DialogTitle>
                <DialogDescription>Pastikan data yang diinput sudah benar.</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
                {/* FORM KEGIATAN */}
                {dialogType === 'activity' && (
                    <>
                        <div className="space-y-2"><label className="text-sm font-medium">Nama Kegiatan</label><Input placeholder="Contoh: Ekskul Memanah" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
                        <div className="space-y-2"><label className="text-sm font-medium">Kategori</label>
                            <Select onValueChange={(v) => setFormData({...formData, category: v})}>
                                <SelectTrigger><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                                <SelectContent><SelectItem value="ibadah">Ibadah</SelectItem><SelectItem value="sekolah">Sekolah</SelectItem><SelectItem value="ekskul">Ekskul</SelectItem><SelectItem value="umum">Umum</SelectItem></SelectContent>
                            </Select>
                        </div>
                    </>
                )}

                {/* FORM JADWAL */}
                {dialogType === 'schedule' && (
                    <>
                        <div className="space-y-2"><label className="text-sm font-medium">Kegiatan</label>
                            <Select onValueChange={(v) => setFormData({...formData, activity_id: v})}>
                                <SelectTrigger><SelectValue placeholder="Pilih Kegiatan..." /></SelectTrigger>
                                <SelectContent>{activities.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2"><label className="text-sm font-medium">Lokasi</label>
                            <Select onValueChange={(v) => setFormData({...formData, location_id: v})}>
                                <SelectTrigger><SelectValue placeholder="Dimana?" /></SelectTrigger>
                                <SelectContent>{locations.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2"><label className="text-sm font-medium">Hari</label>
                            <Select onValueChange={(v) => setFormData({...formData, day_of_week: v})}>
                                <SelectTrigger><SelectValue placeholder="Pilih Hari" /></SelectTrigger>
                                <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><label className="text-sm font-medium">Jam Mulai Absen</label><Input type="time" value={formData.start_time || ''} onChange={(e) => setFormData({...formData, start_time: e.target.value})} /></div>
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
