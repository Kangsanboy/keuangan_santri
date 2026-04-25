import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  DoorOpen, LogOut, LogIn, Clock, ShieldCheck, MapPin, 
  FileText, History, Plus, AlertTriangle, CheckCircle2, User, CreditCard, CalendarDays
} from "lucide-react";

interface Santri { id: string; nama_lengkap: string; kelas: number; gender: string; nisn?: string; rfid_card_id?: string; rombel?: any; }
interface Permit {
  id: number; kategori: string; alasan: string; 
  tanggal_izin: string; tanggal_kembali?: string; 
  waktu_mulai: string; waktu_selesai: string;
  waktu_keluar_aktual: string; waktu_kembali_aktual: string; status: string;
  santri_id: string;
  santri?: Santri;
}

const CLASSES = [7, 8, 9, 10, 11, 12];

const PermitManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("perizinan");
  
  const [permits, setPermits] = useState<Permit[]>([]);
  const [santris, setSantris] = useState<Santri[]>([]);

  const [tapInput, setTapInput] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formKelas, setFormKelas] = useState("");
  const [formGender, setFormGender] = useState("");
  
  const [formData, setFormData] = useState({
      santri_id: '', alasan: '',
      tanggal_izin: new Date().toISOString().split('T')[0],
      tanggal_kembali: new Date().toISOString().split('T')[0],
      waktu_mulai: '08:00', waktu_selesai: '12:00'
  });

  const getRombel = (rombelData: any) => {
      if (!rombelData) return 'A'; 
      if (typeof rombelData === 'string') return rombelData;
      if (typeof rombelData === 'object' && rombelData.nama) return rombelData.nama;
      return 'A';
  };

  const fetchData = async () => {
      setLoading(true);
      try {
          const { data: pData, error: pErr } = await supabase.from('student_permits').select(`
              *,
              santri:santri_id(id, nama_lengkap, kelas, gender, nisn, rfid_card_id, rombel)
          `).order('created_at', { ascending: false });
          
          if (pErr) throw pErr;
          if (pData) setPermits(pData as any);

          const { data: sData } = await supabase.from('santri_2025_12_01_21_34').select('id, nama_lengkap, kelas, gender, nisn, rfid_card_id, rombel').eq('status', 'aktif');
          if (sData) setSantris(sData as any);

      } catch (err: any) { 
          toast({title: "Gagal Menarik Data", description: err.message, variant: "destructive"});
      } finally { 
          setLoading(false); 
      }
  };

  useEffect(() => { fetchData(); }, []);

  const triggerVibration = (type: 'success' | 'error') => {
      if (typeof window !== 'undefined' && navigator.vibrate) {
          if (type === 'success') navigator.vibrate([100, 50, 100]); 
          else navigator.vibrate([300, 100, 300]); 
      }
  };

  const handleTapping = async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return;
      if (!tapInput) return;

      const code = tapInput.trim();
      setTapInput(""); 

      const santri = santris.find(s => s.rfid_card_id === code || s.nisn === code || s.id === code);
      if (!santri) {
          triggerVibration('error');
          return toast({title: "Akses Ditolak", description: "Kartu / QR tidak terdaftar.", variant: "destructive"});
      }

      let activePermit = permits.find(p => p.santri_id === santri.id && p.status === 'Sedang Keluar');
      if (!activePermit) {
          activePermit = permits.find(p => p.santri_id === santri.id && p.status === 'Menunggu Keluar');
      }

      if (!activePermit) {
          triggerVibration('error');
          return toast({title: "Pelanggaran", description: `Tidak ada tiket aktif untuk ${santri.nama_lengkap}!`, variant: "destructive"});
      }

      try {
          const nowIso = new Date().toISOString();
          
          if (activePermit.status === 'Menunggu Keluar') {
              const { error } = await supabase.from('student_permits').update({ status: 'Sedang Keluar', waktu_keluar_aktual: nowIso }).eq('id', activePermit.id);
              if (error) throw error;
              triggerVibration('success');
              toast({title: "Berhasil Keluar", description: `Hati-hati di jalan, ${santri.nama_lengkap}.`, className: "bg-blue-600 text-white font-bold"});
          } else if (activePermit.status === 'Sedang Keluar') {
              const actualTime = new Date(nowIso).getTime();
              let isLate = false;

              if (activePermit.kategori === 'Perizinan') {
                  const cleanTime = activePermit.waktu_selesai?.length === 5 ? `${activePermit.waktu_selesai}:00` : activePermit.waktu_selesai;
                  const limitTimeStr = `${activePermit.tanggal_izin}T${cleanTime || '23:59:59'}`;
                  isLate = actualTime > new Date(limitTimeStr).getTime();
              } else {
                  const limitDateStr = `${activePermit.tanggal_kembali}T23:59:59`;
                  isLate = actualTime > new Date(limitDateStr).getTime();
              }
              
              const newStatus = isLate ? 'Terlambat' : 'Sudah Kembali';
              const { error } = await supabase.from('student_permits').update({ status: newStatus, waktu_kembali_aktual: nowIso }).eq('id', activePermit.id);
              if (error) throw error;

              if (isLate) {
                  triggerVibration('error');
                  toast({title: "Terlambat Kembali", description: "Status dicatat sebagai Terlambat.", variant: "destructive"});
              } else {
                  triggerVibration('success');
                  toast({title: "Kembali Tepat Waktu", description: "Selamat datang kembali!", className: "bg-green-600 text-white font-bold"});
              }
          }
          fetchData();
      } catch (err: any) { toast({title: "Sistem Error", description: err.message, variant: "destructive"}); }
  };

  const openForm = (type: string) => {
      setActiveTab(type);
      setFormData({
          santri_id: '', alasan: '',
          tanggal_izin: new Date().toISOString().split('T')[0],
          tanggal_kembali: new Date().toISOString().split('T')[0],
          waktu_mulai: '08:00', waktu_selesai: '12:00'
      });
      setFormKelas(""); setFormGender("");
      setIsFormOpen(true);
  };

  const handleSubmitForm = async () => {
      try {
          if (!formData.santri_id || !formData.alasan) return toast({title: "Lengkapi Data", variant: "destructive"});
          
          const payload: any = {
              kategori: activeTab === 'perizinan' ? 'Perizinan' : 'Perpulangan',
              santri_id: formData.santri_id,
              alasan: formData.alasan,
              tanggal_izin: formData.tanggal_izin,
          };

          if (activeTab === 'perizinan') {
              payload.waktu_mulai = formData.waktu_mulai;
              payload.waktu_selesai = formData.waktu_selesai;
          } else {
              payload.tanggal_kembali = formData.tanggal_kembali;
              payload.waktu_mulai = '00:00'; payload.waktu_selesai = '23:59';
          }

          const { error } = await supabase.from('student_permits').insert([payload]);
          if (error) throw error;
          
          toast({title: "Tiket Diterbitkan", description: "Data berhasil disimpan.", className: "bg-green-600 text-white"});
          setIsFormOpen(false); 
          fetchData();
      } catch (err: any) { toast({title: "Gagal Menyimpan", description: err.message, variant: "destructive"}); }
  };

  const getStatusColor = (status: string) => {
      if(status === 'Menunggu Keluar') return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      if(status === 'Sedang Keluar') return 'bg-blue-100 text-blue-700 border-blue-300';
      if(status === 'Sudah Kembali') return 'bg-green-100 text-green-700 border-green-300';
      if(status === 'Terlambat') return 'bg-red-100 text-red-700 border-red-300';
      return 'bg-gray-100 text-gray-700';
  };

  const renderTable = (data: Permit[]) => (
      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs border-b">
                  <tr><th className="p-3 w-10 text-center">No</th><th className="p-3">Santri</th><th className="p-3">Target</th><th className="p-3">Aktual</th><th className="p-3 text-center">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                  {data.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">Tidak ada data.</td></tr> : data.map((p, i) => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3 text-center text-gray-400 font-medium">{i+1}</td>
                          <td className="p-3"><p className="font-bold text-gray-800">{p.santri?.nama_lengkap}</p><p className="text-[10px] text-gray-500 uppercase tracking-tighter">Kls {p.santri?.kelas}-{getRombel(p.santri?.rombel)} • {p.alasan}</p></td>
                          <td className="p-3">
                              {p.kategori === 'Perizinan' ? (
                                  <div className="text-[10px] font-mono"><p className="bg-gray-100 px-1 rounded inline-block">{p.waktu_mulai?.slice(0,5)} - {p.waktu_selesai?.slice(0,5)}</p><p className="text-gray-400 mt-1">{new Date(p.tanggal_izin).toLocaleDateString('id-ID')}</p></div>
                              ) : (
                                  <div className="text-[10px] font-bold"><p className="text-gray-700 flex items-center gap-1"><LogOut size={10}/> {new Date(p.tanggal_izin).toLocaleDateString('id-ID')}</p><p className="text-red-600 flex items-center gap-1"><LogIn size={10}/> {p.tanggal_kembali ? new Date(p.tanggal_kembali).toLocaleDateString('id-ID') : '-'}</p></div>
                              )}
                          </td>
                          <td className="p-3 text-[10px] font-mono"><div className="text-blue-600">{p.waktu_keluar_aktual ? new Date(p.waktu_keluar_aktual).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}) : '--:--'}</div><div className="text-green-600">{p.waktu_kembali_aktual ? new Date(p.waktu_kembali_aktual).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}) : '--:--'}</div></td>
                          <td className="p-3 text-center"><Badge variant="outline" className={`text-[9px] font-bold ${getStatusColor(p.status)}`}>{p.status}</Badge></td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 max-w-6xl mx-auto">
      <div className="bg-gradient-to-r from-blue-800 to-indigo-700 rounded-2xl p-6 shadow-lg text-white flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="w-full md:w-auto text-center md:text-left"><h1 className="text-2xl md:text-3xl font-black flex items-center justify-center md:justify-start gap-2 drop-shadow-md"><ShieldCheck className="w-8 h-8 text-blue-300" /> Portal Resepsionis</h1><p className="text-blue-100 mt-1 text-sm">Tap Kartu / RFID untuk keluar masuk pondok.</p></div>
          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/20 w-full md:w-96 flex flex-col items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-blue-200 mb-2 flex items-center gap-1"><CreditCard size={14}/> Tap Kartu Disini</label>
              <Input autoFocus placeholder="Kursor harus disini..." value={tapInput} onChange={(e) => setTapInput(e.target.value)} onKeyDown={handleTapping} className="bg-white text-gray-900 text-center font-mono font-bold border-2 border-blue-300 shadow-inner h-12 text-lg rounded-lg" />
          </div>
      </div>

      <Tabs defaultValue="perizinan" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full md:w-[400px] grid-cols-2 mb-6 bg-white shadow-sm border border-gray-200">
              <TabsTrigger value="perizinan" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white font-bold">Perizinan</TabsTrigger>
              <TabsTrigger value="perpulangan" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-bold">Perpulangan</TabsTrigger>
          </TabsList>

          <TabsContent value="perizinan" className="space-y-6">
              <div className="flex justify-end"><Button onClick={() => openForm("perizinan")} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"><Plus className="w-4 h-4 mr-2"/> Buat Surat Perizinan</Button></div>
              <Card className="border-t-4 border-t-yellow-500 shadow-sm"><CardHeader className="bg-yellow-50/50 pb-3 border-b"><CardTitle className="text-yellow-800 flex items-center gap-2 text-sm"><DoorOpen className="w-5 h-5"/> Sedang Berlangsung <Badge className="bg-yellow-600">{permits.filter(p => p.kategori === 'Perizinan' && (p.status === 'Menunggu Keluar' || p.status === 'Sedang Keluar')).length}</Badge></CardTitle></CardHeader>
              <CardContent className="p-4">{renderTable(permits.filter(p => p.kategori === 'Perizinan' && (p.status === 'Menunggu Keluar' || p.status === 'Sedang Keluar')))}</CardContent></Card>
          </TabsContent>

          <TabsContent value="perpulangan" className="space-y-6">
              <div className="flex justify-end"><Button onClick={() => openForm("perpulangan")} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"><Plus className="w-4 h-4 mr-2"/> Buat Surat Perpulangan</Button></div>
              <Card className="border-t-4 border-t-orange-500 shadow-sm"><CardHeader className="bg-orange-50/50 pb-3 border-b"><CardTitle className="text-orange-800 flex items-center gap-2 text-sm"><MapPin className="w-5 h-5"/> Sedang Pulang Kampung <Badge className="bg-orange-600">{permits.filter(p => p.kategori === 'Perpulangan' && (p.status === 'Menunggu Keluar' || p.status === 'Sedang Keluar')).length}</Badge></CardTitle></CardHeader>
              <CardContent className="p-4">{renderTable(permits.filter(p => p.kategori === 'Perpulangan' && (p.status === 'Menunggu Keluar' || p.status === 'Sedang Keluar')))}</CardContent></Card>
          </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className={`max-w-xl border-t-4 ${activeTab === 'perizinan' ? 'border-t-blue-600' : 'border-t-indigo-600'}`}>
              <DialogHeader><DialogTitle className={`flex items-center gap-2 ${activeTab === 'perizinan' ? 'text-blue-800' : 'text-indigo-800'}`}><FileText/> {activeTab === 'perizinan' ? 'Input Izin Keluar' : 'Input Pulang Kampung'}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Kelas</label><Select value={formKelas} onValueChange={(v)=>{setFormKelas(v); setFormData({...formData, santri_id:""});}}><SelectTrigger className="h-9 bg-white"><SelectValue placeholder="-"/></SelectTrigger><SelectContent>{CLASSES.map(k=><SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Gender</label><Select value={formGender} onValueChange={(v)=>{setFormGender(v); setFormData({...formData, santri_id:""});}}><SelectTrigger className="h-9 bg-white"><SelectValue placeholder="-"/></SelectTrigger><SelectContent><SelectItem value="ikhwan">Ikhwan</SelectItem><SelectItem value="akhwat">Akhwat</SelectItem></SelectContent></Select></div>
                      <div className="space-y-1"><label className={`text-[10px] font-bold uppercase ${activeTab === 'perizinan' ? 'text-blue-600' : 'text-indigo-600'}`}>Pilih Santri</label><Select value={formData.santri_id} onValueChange={v=>setFormData({...formData, santri_id:v})} disabled={!formKelas || !formGender}><SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Cari Nama..."/></SelectTrigger><SelectContent className="max-h-[150px]">{santris.filter(s=>String(s.kelas)===formKelas && (s.gender===formGender || (formGender==='ikhwan'?s.gender==='L':s.gender==='P'))).map(s=><SelectItem key={s.id} value={s.id}>{s.nama_lengkap}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                  {activeTab === 'perizinan' ? (
                      <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Tanggal</label><Input type="date" value={formData.tanggal_izin} onChange={e=>setFormData({...formData, tanggal_izin: e.target.value})} className="h-9"/></div>
                          <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-blue-600">Jam Keluar</label><Input type="time" value={formData.waktu_mulai} onChange={e=>setFormData({...formData, waktu_mulai: e.target.value})} className="h-9 border-blue-200"/></div>
                          <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-red-500">Batas Kembali</label><Input type="time" value={formData.waktu_selesai} onChange={e=>setFormData({...formData, waktu_selesai: e.target.value})} className="h-9 border-red-200"/></div>
                      </div>
                  ) : (
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500 flex items-center gap-1"><LogOut size={12}/> Tanggal Pulang</label><Input type="date" value={formData.tanggal_izin} onChange={e=>setFormData({...formData, tanggal_izin: e.target.value})} className="h-9 border-gray-300"/></div>
                          <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-red-500 flex items-center gap-1"><LogIn size={12}/> Batas Kembali</label><Input type="date" value={formData.tanggal_kembali} onChange={e=>setFormData({...formData, tanggal_kembali: e.target.value})} className="h-9 border-red-200"/></div>
                      </div>
                  )}
                  <div className="space-y-1"><label className="text-[10px] font-bold uppercase text-gray-500">Tujuan / Alasan</label><Input placeholder="Cth: Belanja, Urusan keluarga, dll..." value={formData.alasan} onChange={e=>setFormData({...formData, alasan: e.target.value})} className="h-9"/></div>
              </div>
              <DialogFooter><Button variant="ghost" onClick={()=>setIsFormOpen(false)}>Batal</Button><Button onClick={handleSubmitForm} className={activeTab === 'perizinan' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}>Terbitkan Tiket</Button></DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
};

export default PermitManagement;
