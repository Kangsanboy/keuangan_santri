import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  ClipboardCheck, Clock, MapPin, User, CheckCircle2, XCircle, AlertCircle, ShieldCheck, CalendarDays
} from "lucide-react";

interface ScheduleItem {
  id: number;
  start_time: string;
  end_time: string;
  kelas: number;
  rombel?: { nama: string; kategori: string };
  activity: { id: number; name: string; category: string };
  teacher: { id: number; full_name: string };
  location: { name: string };
}

interface AttendanceLog {
  id: string;
  teacher_id: number;
  activity_id: number;
  status: string;
}

const PiketManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  
  // Waktu saat ini (Real-time)
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update tiap menit
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const dayOfWeek = today.getDay(); 
      const dateStr = today.toISOString().split('T')[0];

      // 1. Tarik Jadwal Hari Ini (Hanya yang ada gurunya)
      const { data: schData, error: schError } = await supabase
        .from('schedules')
        .select(`
            id, start_time, end_time, kelas, 
            rombel:rombels(nama, kategori), 
            activity:activities(id, name, category), 
            teacher:teachers(id, full_name),
            location:locations(name)
        `)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .not('teacher_id', 'is', null)
        .order('start_time');

      if (schError) throw schError;
      // @ts-ignore
      setSchedules(schData || []);

      // 2. Tarik Log Absen Hari Ini
      const { data: logData, error: logError } = await supabase
        .from('attendance_logs')
        .select('id, teacher_id, activity_id, status')
        .gte('created_at', `${dateStr}T00:00:00`)
        .lte('created_at', `${dateStr}T23:59:59`)
        .not('teacher_id', 'is', null);

      if (logError) throw logError;
      // @ts-ignore
      setLogs(logData || []);

    } catch (err: any) {
      toast({ title: "Gagal memuat data", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Fungsi untuk Update/Insert Absen dari Piket
  const handleOverrideAttendance = async (teacherId: number, activityId: number, status: string) => {
    try {
      const today = new Date();
      const existingLog = logs.find(l => l.teacher_id === teacherId && l.activity_id === activityId);

      // 🔥 FIX 1: Tangani "Hapus Status" dengan menghapus data log-nya
      if (status === 'Belum Ada Info') {
          if (existingLog) {
              const { error } = await supabase.from('attendance_logs').delete().eq('id', existingLog.id);
              if (error) throw error;
              toast({ title: "Dihapus", description: "Status absensi direset." });
              fetchData();
          }
          return;
      }

      // 🔥 FIX 2: Pakai format toISOString() untuk menyesuaikan dengan tipe data Timestamp di Database
      if (existingLog) {
        const { error } = await supabase.from('attendance_logs')
            .update({ status: status, scan_time: today.toISOString() })
            .eq('id', existingLog.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('attendance_logs')
            .insert([{
                teacher_id: teacherId,
                activity_id: activityId,
                status: status,
                scan_time: today.toISOString(),
                keterangan: 'Verifikasi Piket',
                created_at: today.toISOString()
            }]);
        if (error) throw error;
      }

      toast({ title: "Terverifikasi", description: `Status diubah menjadi ${status}`, className: "bg-green-600 text-white" });
      fetchData(); // Refresh data
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    }
  };

  const getStatusWidget = (teacherId: number, activityId: number) => {
      const log = logs.find(l => l.teacher_id === teacherId && l.activity_id === activityId);
      
      if (!log) return { status: "Belum Ada Info", color: "bg-gray-100 text-gray-600", icon: <AlertCircle size={14} /> };
      if (log.status === "Hadir") return { status: "Hadir (Tapping)", color: "bg-green-100 text-green-700 border-green-300", icon: <CheckCircle2 size={14} /> };
      if (log.status === "Sakit") return { status: "Sakit", color: "bg-red-100 text-red-700 border-red-300", icon: <XCircle size={14} /> };
      if (log.status === "Izin") return { status: "Izin", color: "bg-blue-100 text-blue-700 border-blue-300", icon: <AlertCircle size={14} /> };
      if (log.status === "Alpa") return { status: "Alpa (Tanpa Ket.)", color: "bg-gray-800 text-white", icon: <XCircle size={14} /> };
      
      return { status: log.status, color: "bg-gray-100 text-gray-800", icon: <AlertCircle size={14} /> };
  };

  const todayStr = currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 max-w-4xl mx-auto">
      
      {/* HEADER KHUSUS MOBILE */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 shadow-lg text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2 drop-shadow-md">
                  <ShieldCheck className="w-8 h-8 text-yellow-300" /> Piket Verifikasi
              </h1>
              <p className="text-blue-100 mt-1 text-sm">Pantau dan verifikasi kehadiran guru di kelas secara real-time.</p>
          </div>
          <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/30 flex items-center gap-3 w-full md:w-auto">
              <Clock className="text-yellow-300" />
              <div>
                  <div className="text-xs text-blue-100 uppercase tracking-widest font-bold">{todayStr}</div>
                  <div className="text-xl font-black font-mono">{currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' })}</div>
              </div>
          </div>
      </div>

      {loading && schedules.length === 0 ? (
          <div className="text-center py-20 text-gray-500 animate-pulse flex flex-col items-center">
              <ClipboardCheck className="w-12 h-12 mb-4 opacity-20" />
              <p>Memuat jadwal hari ini...</p>
          </div>
      ) : schedules.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center">
              <div className="bg-gray-50 p-4 rounded-full mb-4"><CalendarDays className="w-12 h-12 text-gray-400" /></div>
              <h3 className="text-lg font-bold text-gray-700">Tidak Ada Jadwal</h3>
              <p className="text-gray-500 text-sm mt-1">Tidak ada jadwal KBM/Kegiatan yang menugaskan guru pada hari ini.</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {schedules.map((sch) => {
                  const statusData = getStatusWidget(sch.teacher.id, sch.activity.id);
                  // Cek apakah jadwal sedang berlangsung, akan datang, atau lewat
                  const nowStr = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute:'2-digit' });
                  let timeStatus = "Akan Datang";
                  let timeColor = "bg-gray-100 text-gray-600";
                  if (nowStr >= sch.start_time && nowStr <= sch.end_time) {
                      timeStatus = "Sedang Berlangsung";
                      timeColor = "bg-green-600 text-white animate-pulse shadow-md";
                  } else if (nowStr > sch.end_time) {
                      timeStatus = "Selesai";
                      timeColor = "bg-gray-200 text-gray-500";
                  }

                  return (
                      <Card key={sch.id} className={`border-l-4 overflow-hidden shadow-sm hover:shadow-md transition-shadow ${timeStatus === 'Sedang Berlangsung' ? 'border-l-green-500 ring-1 ring-green-100' : 'border-l-gray-300'}`}>
                          <CardHeader className="bg-gray-50/50 pb-3 border-b pt-4 px-4 flex flex-row justify-between items-start">
                              <div>
                                  <Badge variant="outline" className={`mb-2 font-bold uppercase tracking-wider text-[10px] border-transparent ${timeColor}`}>
                                      {timeStatus}
                                  </Badge>
                                  <CardTitle className="text-lg font-bold text-gray-800">{sch.activity.name}</CardTitle>
                                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 font-medium">
                                      <Clock size={12} /> {sch.start_time.slice(0,5)} - {sch.end_time.slice(0,5)}
                                  </div>
                              </div>
                              <div className="text-right">
                                  {sch.kelas ? (
                                     <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-200 text-center">
                                         Kls {sch.kelas}{sch.rombel ? `-${sch.rombel.nama}` : ''}
                                     </div>
                                  ) : (
                                     <div className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs font-bold border border-purple-200 text-center">
                                         Berjamaah
                                     </div>
                                  )}
                                  <div className="flex items-center gap-1 justify-end text-[10px] text-gray-500 mt-1 mt-1 font-medium">
                                      <MapPin size={10} /> {sch.location?.name}
                                  </div>
                              </div>
                          </CardHeader>
                          <CardContent className="p-4">
                              <div className="flex flex-col gap-4">
                                  {/* Info Guru & Status Mesin */}
                                  <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                                      <div className="flex items-center gap-3">
                                          <div className="bg-indigo-100 p-2 rounded-full text-indigo-700"><User size={16}/></div>
                                          <div>
                                              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Pengampu</p>
                                              <p className="font-bold text-gray-800 text-sm leading-tight">{sch.teacher.full_name}</p>
                                          </div>
                                      </div>
                                      <div className={`px-2 py-1 rounded border text-[10px] font-bold flex items-center gap-1 ${statusData.color}`}>
                                          {statusData.icon} <span className="hidden sm:inline">{statusData.status}</span>
                                      </div>
                                  </div>

                                  {/* Action Buttons Piket */}
                                  <div className="flex gap-2">
                                      <Button 
                                          onClick={() => handleOverrideAttendance(sch.teacher.id, sch.activity.id, 'Hadir')}
                                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-10 shadow-sm"
                                          disabled={statusData.status.includes('Hadir')}
                                      >
                                          <CheckCircle2 className="w-4 h-4 mr-1" /> Konfirmasi Hadir
                                      </Button>
                                      
                                      {/* Dropdown Ubah Status (Sakit/Izin/Alpa) */}
                                      <Select onValueChange={(v) => handleOverrideAttendance(sch.teacher.id, sch.activity.id, v)}>
                                          <SelectTrigger className="flex-1 h-10 border-red-200 text-red-600 font-bold hover:bg-red-50 focus:ring-red-500">
                                              <SelectValue placeholder="Tandai Absen..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                              <SelectItem value="Alpa" className="text-red-600 font-bold">Alpa (Tanpa Ket.)</SelectItem>
                                              <SelectItem value="Sakit" className="text-orange-600 font-bold">Sakit</SelectItem>
                                              <SelectItem value="Izin" className="text-blue-600 font-bold">Izin</SelectItem>
                                              {/* Tombol Reset ke Kosong kalau salah pencet */}
                                              <SelectItem value="Belum Ada Info" className="text-gray-500 italic border-t mt-1">Hapus Status</SelectItem>
                                          </SelectContent>
                                      </Select>
                                  </div>
                              </div>
                          </CardContent>
                      </Card>
                  )
              })}
          </div>
      )}
    </div>
  );
};

export default PiketManagement;
