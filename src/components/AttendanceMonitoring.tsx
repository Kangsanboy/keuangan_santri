import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Clock, MapPin, Calendar, User, Search, Filter, 
  CheckCircle2, AlertTriangle, RefreshCw, XCircle 
} from "lucide-react";

/* ================= TYPES ================= */
interface AttendanceLog {
  id: string;
  scan_time: string;
  status: string;
  santri: { nama_lengkap: string; kelas: number; rombel: string; nis: string };
  activity: { name: string; category: string };
  location: { name: string };
}

interface Location { id: number; name: string; }

const AttendanceMonitoring = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  
  // Filter State
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [locationFilter, setLocationFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Stats
  const stats = {
    totalHadir: logs.length,
    tepatWaktu: logs.filter(l => l.status === 'Hadir').length,
    telat: logs.filter(l => l.status === 'Telat').length,
  };

  /* ================= FETCH DATA ================= */
  const fetchLocations = async () => {
    const { data } = await supabase.from('locations').select('id, name').order('name');
    if (data) setLocations(data);
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('attendance_logs')
        .select(`
            id, scan_time, status,
            santri:santri_id(nama_lengkap, kelas, rombel, nis),
            activity:activity_id(name, category),
            location:location_id(name)
        `)
        // Filter by Date (scan_time is timestamptz, so we cast to date)
        .gte('scan_time', `${dateFilter}T00:00:00`)
        .lte('scan_time', `${dateFilter}T23:59:59`)
        .order('scan_time', { ascending: false });

      if (locationFilter !== "all") {
        query = query.eq('location_id', locationFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // @ts-ignore
      setLogs(data || []);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Gagal memuat data", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  /* ================= REALTIME SUBSCRIPTION ================= */
  useEffect(() => {
    fetchLocations();
    fetchLogs();

    // 🔥 LIVE UPDATE: Kalau ada alat yang kirim data, tabel update sendiri!
    const subscription = supabase
      .channel('public:attendance_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance_logs' }, (payload) => {
        console.log('Realtime update:', payload);
        fetchLogs(); // Refresh data saat ada log baru
        toast({ 
            title: "Absensi Baru Masuk! 📡", 
            description: "Data kehadiran diperbarui secara real-time.",
            className: "bg-blue-600 text-white border-none"
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [dateFilter, locationFilter]); // Re-subscribe kalau filter berubah

  /* ================= RENDER ================= */
  const filteredLogs = logs.filter(l => 
    l.santri?.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.santri?.nis.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-20">
      
      {/* HEADER & STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Hadir */}
        <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-full text-blue-600"><User className="w-8 h-8" /></div>
                <div>
                    <p className="text-sm font-medium text-blue-600 uppercase">Total Kehadiran</p>
                    <h3 className="text-3xl font-bold text-blue-900">{stats.totalHadir}</h3>
                </div>
            </CardContent>
        </Card>
        {/* Card 2: Tepat Waktu */}
        <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-full text-green-600"><CheckCircle2 className="w-8 h-8" /></div>
                <div>
                    <p className="text-sm font-medium text-green-600 uppercase">Tepat Waktu</p>
                    <h3 className="text-3xl font-bold text-green-900">{stats.tepatWaktu}</h3>
                </div>
            </CardContent>
        </Card>
        {/* Card 3: Telat */}
        <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-full text-orange-600"><Clock className="w-8 h-8" /></div>
                <div>
                    <p className="text-sm font-medium text-orange-600 uppercase">Terlambat</p>
                    <h3 className="text-3xl font-bold text-orange-900">{stats.telat}</h3>
                </div>
            </CardContent>
        </Card>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="pl-9 w-[160px]" />
            </div>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Semua Lokasi" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Semua Lokasi</SelectItem>
                    {locations.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchLogs} disabled={loading}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></Button>
        </div>
        <div className="relative w-full md:w-[300px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input placeholder="Cari nama santri..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* ATTENDANCE LIST */}
      <Card className="border-t-4 border-t-blue-600 shadow-lg">
        <CardHeader className="border-b bg-gray-50/50 pb-3">
            <CardTitle className="text-lg flex items-center gap-2"><Filter className="w-5 h-5 text-blue-600" /> Log Aktivitas Hari Ini</CardTitle>
            <CardDescription>Data diurutkan dari yang paling baru masuk.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-3">Waktu</th>
                            <th className="px-6 py-3">Santri</th>
                            <th className="px-6 py-3">Kegiatan / Mapel</th>
                            <th className="px-6 py-3">Lokasi</th>
                            <th className="px-6 py-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredLogs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <XCircle className="w-10 h-10 opacity-20" />
                                        <p>Belum ada data absensi yang sesuai filter.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredLogs.map((log) => (
                                <tr key={log.id} className="bg-white hover:bg-blue-50/50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-gray-600 font-bold">
                                        {new Date(log.scan_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-800 capitalize">{log.santri?.nama_lengkap || "Tanpa Nama"}</div>
                                        <div className="text-xs text-gray-500">
                                            {log.santri ? `Kelas ${log.santri.kelas}-${log.santri.rombel || ''}` : '-'} • NIS: {log.santri?.nis}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-700">{log.activity?.name}</div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${log.activity?.category === 'pelajaran' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                            {log.activity?.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 flex items-center gap-2">
                                        <MapPin className="w-3 h-3" /> {log.location?.name}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {log.status === 'Hadir' ? (
                                            <Badge className="bg-green-600 hover:bg-green-700">TEPAT WAKTU</Badge>
                                        ) : log.status === 'Telat' ? (
                                            <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">TERLAMBAT</Badge>
                                        ) : (
                                            <Badge variant="destructive">{log.status}</Badge>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceMonitoring;
