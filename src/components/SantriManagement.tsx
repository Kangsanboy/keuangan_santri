import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { 
  UserPlus, Search, Pencil, Trash2, Users, ArrowUpCircle, 
  AlertTriangle, ArrowLeft, GraduationCap, User, UserCheck
} from 'lucide-react';

/* ================= TYPES ================= */
interface TransactionHistory {
  amount: number;
  type: 'income' | 'expense';
  date: string;
}

interface SantriSaldo {
  id: string; nama_lengkap: string; nis: string; kelas: number;
  gender: "ikhwan" | "akhwat"; saldo: number; status: string;
  nama_wali: string; 
  recent_trx: TransactionHistory[];
}

interface SantriManagementProps {
  kelas?: string | null;
  onSelectSantri?: (id: string) => void; 
}

interface ClassSummary {
  kelas: number; count: number; totalSaldo: number;
}

const SantriManagement = ({ kelas: initialKelas, onSelectSantri }: SantriManagementProps) => {
  const { toast } = useToast();
  
  // State Navigasi & Data
  const [activeKelas, setActiveKelas] = useState<number | null>(initialKelas ? parseInt(initialKelas) : null);
  const [santris, setSantris] = useState<SantriSaldo[]>([]);
  const [classSummaries, setClassSummaries] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // 🔥 STATE BARU: TAB GENDER (Default: Ikhwan)
  const [activeTab, setActiveTab] = useState<"ikhwan" | "akhwat">("ikhwan");

  // State Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<SantriSaldo>>({
    gender: 'ikhwan', status: 'Aktif', kelas: 7
  });

  /* FETCH DATA */
  const fetchSummaries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('view_santri_saldo').select('kelas, saldo');
      if (error) throw error;
      if (data) {
        const summaries: ClassSummary[] = [];
        const classes = [7, 8, 9, 10, 11, 12]; 
        classes.forEach(k => {
          const filtered = data.filter(d => d.kelas === k);
          const total = filtered.reduce((acc, curr) => acc + (curr.saldo || 0), 0);
          summaries.push({ kelas: k, count: filtered.length, totalSaldo: total });
        });
        setClassSummaries(summaries);
      }
    } catch (error: any) { console.error("Error summary:", error); } finally { setLoading(false); }
  };

  const fetchSantrisInClass = async () => {
    if (activeKelas === null) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('view_santri_saldo').select('*').eq('kelas', activeKelas).order('nama_lengkap', { ascending: true });
      if (error) throw error;
      // @ts-ignore
      setSantris(data || []);
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); } finally { setLoading(false); }
  };

  useEffect(() => { activeKelas === null ? fetchSummaries() : fetchSantrisInClass(); }, [activeKelas]);

  /* CRUD & ACTIONS */
  const handleNaikKelasMassal = async () => {
    setLoading(true);
    try {
        const { error } = await supabase.rpc('naik_kelas_massal');
        if (error) throw error;
        toast({ title: "Sukses! 🎓", description: "Naik kelas berhasil.", duration: 5000 });
        fetchSummaries();
    } catch (error: any) { toast({ title: "Gagal", description: error.message, variant: "destructive" }); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { nama_lengkap: formData.nama_lengkap, nis: formData.nis, kelas: formData.kelas, gender: formData.gender, nama_wali: formData.nama_wali, status: formData.status };
      if (isEditMode && formData.id) {
        const { error } = await supabase.from('santri_2025_12_01_21_34').update(payload).eq('id', formData.id);
        if (error) throw error; toast({ title: "Sukses", description: "Data diperbarui" });
      } else {
        const { error } = await supabase.from('santri_2025_12_01_21_34').insert([payload]);
        if (error) throw error; toast({ title: "Sukses", description: "Santri baru ditambahkan" });
      }
      setIsDialogOpen(false); activeKelas === null ? fetchSummaries() : fetchSantrisInClass(); setFormData({ gender: 'ikhwan', status: 'Aktif', kelas: 7 });
    } catch (error: any) { toast({ title: "Gagal", description: error.message, variant: "destructive" }); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus santri ini?")) return;
    try {
      const { error } = await supabase.from('santri_2025_12_01_21_34').delete().eq('id', id);
      if (error) throw error; toast({ title: "Terhapus", description: "Data dihapus" }); fetchSantrisInClass();
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
  };

  const openAdd = () => { setFormData({ gender: 'ikhwan', status: 'Aktif', kelas: activeKelas || 7 }); setIsEditMode(false); setIsDialogOpen(true); };
  const openEdit = (e: React.MouseEvent, santri: SantriSaldo) => { e.stopPropagation(); setFormData(santri); setIsEditMode(true); setIsDialogOpen(true); };
  const onDeleteClick = (e: React.MouseEvent, id: string) => { e.stopPropagation(); handleDelete(id); }

  // 🔥 FILTER DATA BERDASARKAN PENCARIAN & TAB GENDER
  const filteredSantris = santris.filter(s => s.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()));
  const currentTabSantris = filteredSantris.filter(s => s.gender === activeTab);

  /* VIEW 1: DASHBOARD KARTU KELAS */
  if (activeKelas === null) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-green-100">
             <div><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Users className="text-green-600" /> Database Santri</h2><p className="text-sm text-gray-500">Pilih kelas untuk melihat detail.</p></div>
             <div className="flex gap-3 w-full md:w-auto">
                 <Button onClick={openAdd} className="bg-green-600 hover:bg-green-700 shadow-md flex-1 md:flex-none"><UserPlus className="mr-2 h-4 w-4" /> Santri Baru</Button>
                 <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="outline" className="border-orange-200 text-orange-600 hover:bg-orange-50 shadow-sm flex-1 md:flex-none"><ArrowUpCircle className="mr-2 h-4 w-4" /> Naik Kelas</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle className="text-orange-600 flex items-center gap-2"><AlertTriangle /> Peringatan Kenaikan Kelas</AlertDialogTitle><AlertDialogDescription><ul className="list-disc pl-5 space-y-1 text-sm text-gray-700"><li>Kls 7-11 naik tingkat.</li><li className="text-red-600 font-bold">Kls 12 DIHAPUS.</li></ul></AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleNaikKelasMassal} className="bg-orange-600 hover:bg-orange-700">Ya, Proses</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
             </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {classSummaries.map((summary) => (
                <Card key={summary.kelas} onClick={() => setActiveKelas(summary.kelas)} className="cursor-pointer hover:shadow-md hover:border-green-300 transition-all group relative overflow-hidden bg-white border-green-100">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-full -mr-8 -mt-8 z-0 group-hover:bg-green-100 transition-colors"></div>
                    <CardHeader className="pb-2 relative z-10"><CardTitle className="text-lg font-bold text-gray-700 flex justify-between items-center">Kelas {summary.kelas}<GraduationCap className="w-5 h-5 text-green-600 opacity-50" /></CardTitle><CardDescription>{summary.count} Santri</CardDescription></CardHeader>
                    <CardContent className="relative z-10"><div className="text-2xl font-bold text-gray-800">Rp {summary.totalSaldo.toLocaleString("id-ID")}</div><p className="text-[10px] text-green-600 mt-1 font-medium bg-green-50 inline-block px-2 py-0.5 rounded-full">Total Tabungan</p></CardContent>
                </Card>
            ))}
        </div>
        {/* Dialog Form Tambah (Global) */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent><DialogHeader><DialogTitle>Tambah Santri Baru</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-sm font-medium">NIS</label><Input value={formData.nis || ''} onChange={e => setFormData({...formData, nis: e.target.value})} placeholder="12345" /></div><div className="space-y-2"><label className="text-sm font-medium">Nama</label><Input value={formData.nama_lengkap || ''} onChange={e => setFormData({...formData, nama_lengkap: e.target.value})} placeholder="Nama Santri" required /></div></div>
                    <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-sm font-medium">Kelas</label><Select value={String(formData.kelas)} onValueChange={v => setFormData({...formData, kelas: parseInt(v)})}> <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[7,8,9,10,11,12].map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><label className="text-sm font-medium">Gender</label><Select value={formData.gender} onValueChange={v => setFormData({...formData, gender: v as any})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ikhwan">Ikhwan</SelectItem><SelectItem value="akhwat">Akhwat</SelectItem></SelectContent></Select></div></div>
                    <div className="space-y-2"><label className="text-sm font-medium">Wali</label><Input value={formData.nama_wali || ''} onChange={e => setFormData({...formData, nama_wali: e.target.value})} placeholder="Nama Orang Tua" /></div>
                    <DialogFooter><Button type="submit" className="bg-green-600 hover:bg-green-700">Simpan Data</Button></DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
      </div>
    );
  }

  /* VIEW 2: DETAIL TABLE DENGAN TAB GENDER */
  return (
    <Card className={`shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300 border-t-4 ${activeTab === 'ikhwan' ? 'border-t-green-600 border-green-100' : 'border-t-pink-500 border-pink-100'}`}>
      <CardHeader className="bg-white border-b border-gray-100 pb-0">
        {/* Header Atas */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
             <Button variant="ghost" size="icon" onClick={() => setActiveKelas(null)} className="hover:bg-green-50"><ArrowLeft className="h-5 w-5 text-gray-600" /></Button>
             <div><CardTitle className="text-lg font-bold text-gray-800">Kelas {activeKelas}</CardTitle><p className="text-xs text-gray-500">{filteredSantris.length} Santri Total</p></div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" /><Input placeholder="Cari..." className="pl-9 h-9 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            <Button onClick={openAdd} size="sm" className="bg-green-600 hover:bg-green-700 h-9"><UserPlus className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Baru</span></Button>
          </div>
        </div>

        {/* 🔥 TAB SWITCHER IKHWAN / AKHWAT */}
        <div className="flex w-full border-b border-gray-200">
             <button 
                onClick={() => setActiveTab('ikhwan')}
                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2 ${
                    activeTab === 'ikhwan' 
                    ? 'border-green-600 text-green-700 bg-green-50/50' 
                    : 'border-transparent text-gray-400 hover:text-green-600'
                }`}
             >
                <User className="w-4 h-4" /> IKHWAN ({filteredSantris.filter(s => s.gender === 'ikhwan').length})
             </button>
             <button 
                onClick={() => setActiveTab('akhwat')}
                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2 ${
                    activeTab === 'akhwat' 
                    ? 'border-pink-500 text-pink-700 bg-pink-50/50' 
                    : 'border-transparent text-gray-400 hover:text-pink-600'
                }`}
             >
                <UserCheck className="w-4 h-4" /> AKHWAT ({filteredSantris.filter(s => s.gender === 'akhwat').length})
             </button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className={`font-semibold border-b ${activeTab === 'ikhwan' ? 'bg-green-50 text-green-800 border-green-100' : 'bg-pink-50 text-pink-800 border-pink-100'}`}>
              <tr>
                <th className="p-4 w-[100px]">NIS</th>
                <th className="p-4 w-[200px]">Nama Lengkap</th>
                <th className="p-4 text-center">Riwayat (5 Terakhir)</th>
                <th className="p-4 text-right">Saldo</th>
                <th className="p-4 text-center w-[100px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentTabSantris.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">Tidak ada santri {activeTab} ditemukan di kelas ini.</td></tr>
              ) : (
                  currentTabSantris.map((santri) => (
                    <tr key={santri.id} className="hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => onSelectSantri && onSelectSantri(santri.id)}>
                      <td className="p-4 font-mono text-gray-500">{santri.nis || "-"}</td>
                      <td className="p-4 font-bold text-gray-800 group-hover:text-green-600 group-hover:underline">{santri.nama_lengkap}</td>
                      
                      {/* 5 Riwayat Terakhir */}
                      <td className="p-4">
                        <div className="flex justify-center gap-1.5 flex-wrap max-w-[250px] mx-auto">
                            {Array.isArray(santri.recent_trx) && santri.recent_trx.length > 0 ? (
                                santri.recent_trx.map((trx, idx) => (
                                    <div key={idx} title={`${trx.date}: ${trx.type === 'income' ? 'Masuk' : 'Keluar'}`}
                                        className={`text-[10px] px-1.5 py-0.5 rounded border font-medium flex items-center ${trx.type === 'income' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}
                                    >
                                        {trx.type === 'income' ? '+' : '-'}{(trx.amount / 1000).toFixed(0)}k
                                    </div>
                                ))
                            ) : (<span className="text-gray-300 text-xs">-</span>)}
                        </div>
                      </td>

                      <td className="p-4 font-bold text-gray-700 text-right">Rp {(santri.saldo || 0).toLocaleString('id-ID')}</td>
                      <td className="p-4 text-center flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-50" onClick={(e) => openEdit(e, santri)}><Pencil size={14} /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={(e) => onDeleteClick(e, santri.id)}><Trash2 size={14} /></Button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* Dialog reuse (Sama persis) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent><DialogHeader><DialogTitle>{isEditMode ? "Edit Santri" : "Tambah Santri Baru"}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-sm font-medium">NIS</label><Input value={formData.nis || ''} onChange={e => setFormData({...formData, nis: e.target.value})} placeholder="12345" /></div><div className="space-y-2"><label className="text-sm font-medium">Nama</label><Input value={formData.nama_lengkap || ''} onChange={e => setFormData({...formData, nama_lengkap: e.target.value})} placeholder="Nama Santri" required /></div></div>
                    <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-sm font-medium">Kelas</label><Select value={String(formData.kelas)} onValueChange={v => setFormData({...formData, kelas: parseInt(v)})}> <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[7,8,9,10,11,12].map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><label className="text-sm font-medium">Gender</label><Select value={formData.gender} onValueChange={v => setFormData({...formData, gender: v as any})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ikhwan">Ikhwan</SelectItem><SelectItem value="akhwat">Akhwat</SelectItem></SelectContent></Select></div></div>
                    <div className="space-y-2"><label className="text-sm font-medium">Wali</label><Input value={formData.nama_wali || ''} onChange={e => setFormData({...formData, nama_wali: e.target.value})} placeholder="Nama Orang Tua" /></div>
                    <DialogFooter><Button type="submit" className="bg-green-600 hover:bg-green-700">Simpan Data</Button></DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    </Card>
  );
};

export default SantriManagement;
