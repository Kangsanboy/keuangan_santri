import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Scale, AlertTriangle, ShieldAlert, CheckCircle2, User, FileText, 
  Gavel, Plus, Trash2, CalendarDays, Search
} from "lucide-react";

/* ================= TYPES ================= */
interface Rule {
  id: number; kategori: string; pelanggaran: string; gender_berlaku: string; default_hukuman: string;
}
interface Santri { id: string; nama_lengkap: string; kelas: number; gender: string; rombel?: { nama: string }; }
interface Teacher { id: number; full_name: string; }
interface ViolationLog {
  id: number; tanggal: string; status: string; tindakan?: string;
  santri_id: string; violation_id: number; penindak_id?: number;
  santri?: { nama_lengkap: string; kelas: number; gender: string; rombel?: { nama: string } };
  rule?: Rule; teacher?: { full_name: string };
}

const CLASSES = [7, 8, 9, 10, 11, 12];

const ViolationManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState("monitoring");
  
  // Data
  const [rules, setRules] = useState<Rule[]>([]);
  const [santris, setSantris] = useState<Santri[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [logs, setLogs] = useState<ViolationLog[]>([]);

  // Form Rule
  const [isRuleOpen, setIsRuleOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState<Partial<Rule>>({ kategori: 'Ringan', gender_berlaku: 'semua' });

  // Form Log (Catat Pelanggaran)
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [filterKelas, setFilterKelas] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [logForm, setLogForm] = useState({ santri_id: "", kategori: "", violation_id: "", tanggal: new Date().toISOString().split('T')[0] });

  // Form Tindak (Eksekusi Hukuman)
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [actionData, setActionData] = useState<any>(null);
  const [actionForm, setActionForm] = useState({ penindak_id: "", tindakan: "" });

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: rData } = await supabase.from('violation_master').select('*').order('kategori');
      if (rData) setRules(rData);

      const { data: sData } = await supabase.from('santri_2025_12_01_21_34').select('id, nama_lengkap, kelas, gender, rombel:rombels(nama)').eq('status', 'aktif').order('nama_lengkap');
      if (sData) setSantris(sData as any);

      const { data: tData } = await supabase.from('teachers').select('id, full_name').eq('is_active', true);
      if (tData) setTeachers(tData);

      const { data: lData } = await supabase.from('student_violations').select(`
        id, tanggal, status, tindakan, santri_id, violation_id, penindak_id,
        santri:santri_id(nama_lengkap, kelas, gender, rombel:rombels(nama)),
        rule:violation_id(*),
        teacher:penindak_id(full_name)
      `).order('tanggal', { ascending: false }).order('id', { ascending: false });
      if (lData) setLogs(lData as any);

    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  /* ================= ACTIONS ================= */
  const handleSaveRule = async () => {
      try {
          if(!ruleForm.pelanggaran || !ruleForm.default_hukuman) return toast({title:"Lengkapi Data", variant:"destructive"});
          const { error } = await supabase.from('violation_master').insert([ruleForm]);
          if(error) throw error;
          toast({title: "Berhasil", description: "Undang-undang baru ditambahkan."});
          setIsRuleOpen(false); setRuleForm({ kategori: 'Ringan', gender_berlaku: 'semua' }); fetchData();
      } catch(err:any) { toast({title: "Gagal", description: err.message, variant: "destructive"}); }
  };

  const handleSaveLog = async () => {
      try {
          if(!logForm.santri_id || !logForm.violation_id) return toast({title:"Lengkapi Data", variant:"destructive"});
          const { error } = await supabase.from('student_violations').insert([{
              santri_id: logForm.santri_id,
              violation_id: parseInt(logForm.violation_id),
              tanggal: logForm.tanggal,
              status: 'Belum Ditindak'
          }]);
          if(error) throw error;
          toast({title: "Catatan Dibuat", description: "Pelanggaran berhasil dicatat ke antrean.", className: "bg-red-600 text-white"});
          setIsLogOpen(false); setFilterKelas(""); setFilterGender(""); setLogForm({ santri_id: "", kategori: "", violation_id: "", tanggal: new Date().toISOString().split('T')[0] }); fetchData();
      } catch(err:any) { toast({title: "Gagal", description: err.message, variant: "destructive"}); }
  };

  const openActionDialog = (log: ViolationLog) => {
      setActionData(log);
      setActionForm({ penindak_id: "", tindakan: log.rule?.default_hukuman || "" });
      setIsActionOpen(true);
  };

  const handleExecuteAction = async () => {
      try {
          if(!actionForm.penindak_id || !actionForm.tindakan) return toast({title:"Lengkapi Data Penindak", variant:"destructive"});
          const { error } = await supabase.from('student_violations').update({
              status: 'Sudah Ditindak',
              penindak_id: parseInt(actionForm.penindak_id),
              tindakan: actionForm.tindakan
          }).eq('id', actionData.id);
          
          if(error) throw error;
          toast({title: "Dieksekusi", description: "Santri telah ditindak secara kedisiplinan.", className:"bg-green-600 text-white"});
          setIsActionOpen(false); fetchData();
      } catch(err:any) { toast({title: "Gagal", description: err.message, variant: "destructive"}); }
  };

  const deleteRule = async (id: number) => {
      if(!confirm("Hapus aturan ini?")) return;
      await supabase.from('violation_master').delete().eq('id', id); fetchData();
  };
  const deleteLog = async (id: number) => {
      if(!confirm("Hapus catatan pelanggaran ini?")) return;
      await supabase.from('student_violations').delete().eq('id', id); fetchData();
  };

  /* ================= RENDER HELPERS ================= */
  const getKategoriColor = (kat: string) => {
      if(kat === 'Ringan') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      if(kat === 'Sedang') return 'bg-orange-100 text-orange-800 border-orange-300';
      if(kat === 'Berat') return 'bg-red-100 text-red-800 border-red-300';
      return 'bg-gray-100 text-gray-800';
  };

  const pendingLogs = logs.filter(l => l.status === 'Belum Ditindak');
  const resolvedLogs = logs.filter(l => l.status === 'Sudah Ditindak');

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 max-w-6xl mx-auto">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-red-800 to-red-600 rounded-2xl p-6 shadow-lg text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2 drop-shadow-md"><Scale className="w-8 h-8 text-yellow-300" /> Mahkamah Kedisiplinan</h1>
              <p className="text-red-100 mt-1 text-sm">Monitoring pelanggaran, penindakan, dan master undang-undang santri.</p>
          </div>
          <Button onClick={() => setIsLogOpen(true)} className="bg-yellow-400 hover:bg-yellow-500 text-red-900 font-bold shadow-md w-full md:w-auto"><AlertTriangle className="w-4 h-4 mr-2"/> Catat Pelanggaran Baru</Button>
      </div>

      <Tabs defaultValue="monitoring" value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
          <TabsList className="grid w-full md:w-[400px] grid-cols-2 mb-4 bg-white shadow-sm border border-gray-200">
              <TabsTrigger value="monitoring" className="data-[state=active]:bg-red-600 data-[state=active]:text-white font-bold">Monitoring Pelanggar</TabsTrigger>
              <TabsTrigger value="master" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white font-bold">Master Undang-Undang</TabsTrigger>
          </TabsList>

          {/* TAB MONITORING */}
          <TabsContent value="monitoring" className="space-y-6">
              
              {/* TABEL BELUM DITINDAK */}
              <Card className="border-t-4 border-t-red-500 shadow-sm">
                  <CardHeader className="bg-red-50/50 pb-3 border-b flex flex-row justify-between items-center"><CardTitle className="text-red-800 flex items-center gap-2"><ShieldAlert className="w-5 h-5"/> Menunggu Penindakan <Badge className="bg-red-600">{pendingLogs.length}</Badge></CardTitle></CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-gray-50 text-gray-600 uppercase text-xs border-b">
                              <tr><th className="p-3 w-10 text-center">No</th><th className="p-3">Nama Santri</th><th className="p-3 text-center">Kelas</th><th className="p-3">Pelanggaran</th><th className="p-3 text-center">Jenis</th><th className="p-3 text-center">Aksi</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {pendingLogs.length === 0 ? (<tr><td colSpan={6} className="text-center py-8 text-gray-400 italic">Alhamdulillah, tidak ada santri yang melanggar.</td></tr>) : 
                                  pendingLogs.map((log, i) => (
                                      <tr key={log.id} className="hover:bg-red-50/30">
                                          <td className="p-3 text-center text-gray-500">{i+1}</td>
                                          <td className="p-3 font-bold text-gray-800">{log.santri?.nama_lengkap}</td>
                                          <td className="p-3 text-center"><Badge variant="outline" className="text-[10px]">{log.santri?.kelas} {log.santri?.rombel?.nama}</Badge></td>
                                          <td className="p-3 text-red-600 font-medium">{log.rule?.pelanggaran}</td>
                                          <td className="p-3 text-center"><Badge variant="outline" className={`text-[10px] ${getKategoriColor(log.rule?.kategori || '')}`}>{log.rule?.kategori}</Badge></td>
                                          <td className="p-3 text-center flex justify-center gap-2">
                                              <Button size="sm" onClick={() => openActionDialog(log)} className="bg-red-600 hover:bg-red-700 h-8 text-xs font-bold shadow-sm"><Gavel className="w-3 h-3 mr-1"/> Tindak</Button>
                                              <Button size="icon" variant="ghost" onClick={() => deleteLog(log.id)} className="h-8 w-8 text-gray-400 hover:text-red-500"><Trash2 size={14}/></Button>
                                          </td>
                                      </tr>
                                  ))
                              }
                          </tbody>
                      </table>
                  </CardContent>
              </Card>

              {/* TABEL SUDAH DITINDAK */}
              <Card className="border-t-4 border-t-green-500 shadow-sm">
                  <CardHeader className="bg-green-50/50 pb-3 border-b flex flex-row justify-between items-center"><CardTitle className="text-green-800 flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> Riwayat Penindakan <Badge className="bg-green-600">{resolvedLogs.length}</Badge></CardTitle></CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-gray-50 text-gray-600 uppercase text-xs border-b">
                              <tr><th className="p-3 w-10 text-center">No</th><th className="p-3">Nama Santri</th><th className="p-3 text-center">Kelas</th><th className="p-3">Pelanggaran (Jenis)</th><th className="p-3">Penindak</th><th className="p-3">Tindakan/Hukuman</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {resolvedLogs.length === 0 ? (<tr><td colSpan={6} className="text-center py-8 text-gray-400 italic">Belum ada riwayat penindakan.</td></tr>) : 
                                  resolvedLogs.map((log, i) => (
                                      <tr key={log.id} className="hover:bg-green-50/30">
                                          <td className="p-3 text-center text-gray-500">{i+1}</td>
                                          <td className="p-3 font-bold text-gray-800">{log.santri?.nama_lengkap} <span className="block text-[10px] text-gray-400 font-normal">{new Date(log.tanggal).toLocaleDateString('id-ID')}</span></td>
                                          <td className="p-3 text-center"><Badge variant="outline" className="text-[10px]">{log.santri?.kelas} {log.santri?.rombel?.nama}</Badge></td>
                                          <td className="p-3">
                                              <span className="block text-red-600 font-medium mb-1">{log.rule?.pelanggaran}</span>
                                              <Badge variant="outline" className={`text-[9px] h-4 ${getKategoriColor(log.rule?.kategori || '')}`}>{log.rule?.kategori}</Badge>
                                          </td>
                                          <td className="p-3 text-indigo-700 font-bold text-xs"><User className="w-3 h-3 inline mr-1"/>{log.teacher?.full_name}</td>
                                          <td className="p-3 text-gray-600 text-xs italic max-w-[200px] truncate" title={log.tindakan}>{log.tindakan}</td>
                                      </tr>
                                  ))
                              }
                          </tbody>
                      </table>
                  </CardContent>
              </Card>
          </TabsContent>

          {/* TAB MASTER UNDANG-UNDANG */}
          <TabsContent value="master" className="space-y-4">
              <div className="flex justify-end mb-2"><Button onClick={() => setIsRuleOpen(true)} className="bg-gray-800 hover:bg-gray-900"><Plus className="w-4 h-4 mr-2"/> Tambah Undang-Undang</Button></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['Ringan', 'Sedang', 'Berat'].map(kat => {
                      const rulesCat = rules.filter(r => r.kategori === kat);
                      return (
                          <Card key={kat} className={`border-t-4 shadow-sm ${kat === 'Ringan' ? 'border-t-yellow-400' : (kat==='Sedang' ? 'border-t-orange-500' : 'border-t-red-600')}`}>
                              <CardHeader className="pb-2 bg-gray-50/50"><CardTitle className="text-lg flex justify-between items-center">{kat} <Badge variant="secondary">{rulesCat.length}</Badge></CardTitle></CardHeader>
                              <CardContent className="p-0">
                                  <div className="divide-y max-h-[500px] overflow-y-auto">
                                      {rulesCat.length===0 && <div className="p-4 text-center text-xs text-gray-400">Kosong</div>}
                                      {rulesCat.map(r => (
                                          <div key={r.id} className="p-4 hover:bg-gray-50 group">
                                              <div className="flex justify-between items-start gap-2">
                                                  <div>
                                                      <p className="font-bold text-gray-800 text-sm leading-tight mb-1">{r.pelanggaran}</p>
                                                      <Badge variant="outline" className={`text-[9px] mb-2 ${r.gender_berlaku==='semua'?'bg-gray-100 text-gray-600':(r.gender_berlaku==='ikhwan'?'bg-blue-100 text-blue-700':'bg-pink-100 text-pink-700')}`}>Berlaku: {r.gender_berlaku.toUpperCase()}</Badge>
                                                      <p className="text-xs text-gray-500 flex items-start gap-1 bg-gray-100 p-2 rounded border border-gray-200"><Gavel className="w-3 h-3 mt-0.5 shrink-0"/> {r.default_hukuman}</p>
                                                  </div>
                                                  <Button variant="ghost" size="icon" onClick={() => deleteRule(r.id)} className="h-6 w-6 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></Button>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </CardContent>
                          </Card>
                      )
                  })}
              </div>
          </TabsContent>
      </Tabs>

      {/* DIALOG 1: CATAT PELANGGARAN (LOG) */}
      <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
          <DialogContent className="max-w-lg border-t-4 border-t-red-600">
              <DialogHeader><DialogTitle className="flex items-center gap-2 text-red-700"><AlertTriangle/> Catat Pelanggaran Santri</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><label className="text-xs font-bold uppercase text-gray-500">Tanggal</label><Input type="date" value={logForm.tanggal} onChange={e=>setLogForm({...logForm, tanggal: e.target.value})} className="h-9"/></div>
                      <div className="space-y-1"><label className="text-xs font-bold uppercase text-gray-500">Kelas Filter</label><Select value={filterKelas} onValueChange={(v)=>{setFilterKelas(v); setLogForm({...logForm, santri_id:""});}}><SelectTrigger className="h-9"><SelectValue placeholder="Pilih..."/></SelectTrigger><SelectContent>{CLASSES.map(k=><SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-1"><label className="text-xs font-bold uppercase text-gray-500">Gender Filter</label><Select value={filterGender} onValueChange={(v)=>{setFilterGender(v); setLogForm({...logForm, santri_id:""});}}><SelectTrigger className="h-9"><SelectValue placeholder="Pilih..."/></SelectTrigger><SelectContent><SelectItem value="ikhwan">Ikhwan</SelectItem><SelectItem value="akhwat">Akhwat</SelectItem></SelectContent></Select></div>
                      <div className="space-y-1"><label className="text-xs font-bold uppercase text-red-600">Pilih Santri</label><Select value={logForm.santri_id} onValueChange={v=>setLogForm({...logForm, santri_id:v})} disabled={!filterKelas || !filterGender}><SelectTrigger className="h-9 border-red-200"><SelectValue placeholder="Cari Nama..."/></SelectTrigger><SelectContent className="max-h-[200px]">{santris.filter(s=>String(s.kelas)===filterKelas && (s.gender===filterGender || (filterGender==='ikhwan'?s.gender==='L':s.gender==='P'))).map(s=><SelectItem key={s.id} value={s.id}>{s.nama_lengkap}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                  <div className="border-t pt-4 space-y-3">
                      <div className="space-y-1"><label className="text-xs font-bold uppercase text-gray-500">Tingkat Pelanggaran</label><Select value={logForm.kategori} onValueChange={(v)=>{setLogForm({...logForm, kategori:v, violation_id:""});}}><SelectTrigger className="h-9"><SelectValue placeholder="Pilih Tingkat..."/></SelectTrigger><SelectContent><SelectItem value="Ringan">Ringan</SelectItem><SelectItem value="Sedang">Sedang</SelectItem><SelectItem value="Berat">Berat</SelectItem></SelectContent></Select></div>
                      <div className="space-y-1"><label className="text-xs font-bold uppercase text-red-600">Pilih Pelanggaran (UU)</label><Select value={logForm.violation_id} onValueChange={v=>setLogForm({...logForm, violation_id:v})} disabled={!logForm.kategori || !filterGender}><SelectTrigger className="h-9 border-red-200"><SelectValue placeholder="Cari di UU..."/></SelectTrigger><SelectContent className="max-h-[200px]">{rules.filter(r=>r.kategori===logForm.kategori && (r.gender_berlaku==='semua' || r.gender_berlaku===filterGender)).map(r=><SelectItem key={r.id} value={String(r.id)}>{r.pelanggaran}</SelectItem>)}</SelectContent></Select></div>
                  </div>
              </div>
              <DialogFooter><Button variant="ghost" onClick={()=>setIsLogOpen(false)}>Batal</Button><Button onClick={handleSaveLog} className="bg-red-600 hover:bg-red-700 text-white">Catat & Masukkan Antrean</Button></DialogFooter>
          </DialogContent>
      </Dialog>

      {/* DIALOG 2: EKSEKUSI HUKUMAN (TINDAK) */}
      <Dialog open={isActionOpen} onOpenChange={setIsActionOpen}>
          <DialogContent className="max-w-md border-t-4 border-t-indigo-600">
              <DialogHeader><DialogTitle className="flex items-center gap-2 text-indigo-700"><Gavel/> Eksekusi Penindakan</DialogTitle></DialogHeader>
              {actionData && (
                  <div className="space-y-4 py-2">
                      <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-sm">
                          <p className="font-bold text-gray-800 mb-1">{actionData.santri?.nama_lengkap} <span className="text-xs font-normal text-gray-500">(Kls {actionData.santri?.kelas})</span></p>
                          <p className="text-red-700 font-medium">{actionData.rule?.pelanggaran}</p>
                      </div>
                      <div className="space-y-1"><label className="text-xs font-bold uppercase text-gray-500">Guru / Ustadz Penindak</label><Select value={actionForm.penindak_id} onValueChange={v=>setActionForm({...actionForm, penindak_id:v})}><SelectTrigger className="h-9 border-indigo-200"><SelectValue placeholder="Pilih Nama Penindak..."/></SelectTrigger><SelectContent className="max-h-[200px]">{teachers.map(t=><SelectItem key={t.id} value={String(t.id)}>{t.full_name}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-1"><label className="text-xs font-bold uppercase text-gray-500">Tindakan / Hukuman Dijatuhkan</label><Input value={actionForm.tindakan} onChange={e=>setActionForm({...actionForm, tindakan: e.target.value})} className="h-9 border-indigo-200"/></div>
                      <p className="text-[10px] text-orange-500 italic">*Tindakan default dari master UU otomatis terisi, bisa Anda ubah sesuai kebijakan.</p>
                  </div>
              )}
              <DialogFooter><Button variant="ghost" onClick={()=>setIsActionOpen(false)}>Batal</Button><Button onClick={handleExecuteAction} className="bg-indigo-600 hover:bg-indigo-700 text-white">Sahkan Penindakan</Button></DialogFooter>
          </DialogContent>
      </Dialog>

      {/* DIALOG 3: TAMBAH MASTER UU */}
      <Dialog open={isRuleOpen} onOpenChange={setIsRuleOpen}>
          <DialogContent className="max-w-md border-t-4 border-t-gray-800">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText/> Buat Undang-Undang Baru</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><label className="text-xs font-bold uppercase text-gray-500">Kategori</label><Select value={ruleForm.kategori} onValueChange={v=>setRuleForm({...ruleForm, kategori:v})}><SelectTrigger className="h-9"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Ringan">Ringan</SelectItem><SelectItem value="Sedang">Sedang</SelectItem><SelectItem value="Berat">Berat</SelectItem></SelectContent></Select></div>
                      <div className="space-y-1"><label className="text-xs font-bold uppercase text-gray-500">Berlaku Untuk</label><Select value={ruleForm.gender_berlaku} onValueChange={v=>setRuleForm({...ruleForm, gender_berlaku:v})}><SelectTrigger className="h-9"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="semua">Semua Gender</SelectItem><SelectItem value="ikhwan">Hanya Ikhwan</SelectItem><SelectItem value="akhwat">Hanya Akhwat</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="space-y-1"><label className="text-xs font-bold uppercase text-gray-500">Deskripsi Pelanggaran</label><Input placeholder="Cth: Keluar pondok tanpa izin..." value={ruleForm.pelanggaran || ''} onChange={e=>setRuleForm({...ruleForm, pelanggaran: e.target.value})} className="h-9"/></div>
                  <div className="space-y-1"><label className="text-xs font-bold uppercase text-gray-500">Tindakan / Hukuman Default</label><Input placeholder="Cth: Surat peringatan 1 & Bersih asrama..." value={ruleForm.default_hukuman || ''} onChange={e=>setRuleForm({...ruleForm, default_hukuman: e.target.value})} className="h-9"/></div>
              </div>
              <DialogFooter><Button variant="ghost" onClick={()=>setIsRuleOpen(false)}>Batal</Button><Button onClick={handleSaveRule} className="bg-gray-800 hover:bg-gray-900 text-white">Simpan Master UU</Button></DialogFooter>
          </DialogContent>
      </Dialog>

    </div>
  );
};

export default ViolationManagement;
