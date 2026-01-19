import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
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
  AlertTriangle, ArrowLeft, Wallet, GraduationCap, RefreshCw
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
  nama_wali: string; recent_trx: TransactionHistory[];
}

interface SantriManagementProps {
  kelas?: string | null;
  onSelectSantri?: (id: string) => void; 
}

interface ClassSummary {
  kelas: number;
  count: number;
  totalSaldo: number;
}

const SantriManagement = ({ kelas: initialKelas, onSelectSantri }: SantriManagementProps) => {
  const { toast } = useToast();
  
  // State Navigasi (Null = Tampilan Grid Kelas, Angka = Tampilan Detail Kelas)
  const [activeKelas, setActiveKelas] = useState<number | null>(initialKelas ? parseInt(initialKelas) : null);
  
  // State Data
  const [santris, setSantris] = useState<SantriSaldo[]>([]);
  const [classSummaries, setClassSummaries] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // State Dialog & Form
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<SantriSaldo>>({
    gender: 'ikhwan', status: 'Aktif', kelas: 7
  });

  /* ================= 1. LOGIC FETCH DATA RINGKASAN (VIEW AWAL) ================= */
  const fetchSummaries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('view_santri_saldo').select('kelas, saldo');
      if (error) throw error;

      if (data) {
        const summaries: ClassSummary[] = [];
        const classes = [7, 8, 9, 10, 11, 12]; // Alumni (99) tidak kita tampilkan lagi

        classes.forEach(k => {
          const filtered = data.filter(d => d.kelas === k);
          const total = filtered.reduce((acc, curr) => acc + (curr.saldo || 0), 0);
          summaries.push({ kelas: k, count: filtered.length, totalSaldo: total });
        });
        setClassSummaries(summaries);
      }
    } catch (error: any) { console.error("Error summary:", error); } finally { setLoading(false); }
  };

  /* ================= 2. LOGIC FETCH DATA DETAIL (VIEW KELAS) ================= */
  const fetchSantrisInClass = async () => {
    if (activeKelas === null) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('view_santri_saldo')
        .select('*')
        .eq('kelas', activeKelas)
        .order('nama_lengkap', { ascending: true });

      if (error) throw error;
      // @ts-ignore
      setSantris(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeKelas === null) fetchSummaries();
    else fetchSantrisInClass();
  }, [activeKelas]);

  /* ================= LOGIC CRUD & NAIK KELAS ================= */
  const handleNaikKelasMassal = async () => {
    setLoading(true);
    try {
        const { error } = await supabase.rpc('naik_kelas_massal');
        if (error) throw error;
        toast({ title: "Sukses! 🎓", description: "Kenaikan kelas berhasil. Kelas 12 telah dihapus.", duration: 5000 });
        fetchSummaries(); // Refresh Grid
    } catch (error: any) {
        toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
         nama_lengkap: formData.nama_lengkap, nis: formData.nis, kelas: formData.kelas,
         gender: formData.gender, nama_wali: formData.nama_wali, status: formData.status
      };
      
      if (isEditMode && formData.id) {
        const { error } = await supabase.from('santri_2025_12_01_21_34').update(payload).eq('id', formData.id);
        if (error) throw error;
        toast({ title: "Sukses", description: "Data diperbarui" });
      } else {
        const { error } = await supabase.from('santri_2025_12_01_21_34').insert([payload]);
        if (error) throw error;
        toast({ title: "Sukses", description: "Santri baru ditambahkan" });
      }
      setIsDialogOpen(false);
      activeKelas === null ? fetchSummaries() : fetchSantrisInClass();
      setFormData({ gender: 'ikhwan', status: 'Aktif', kelas: 7 });
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus santri ini?")) return;
    try {
      const { error } = await supabase.from('santri_2025_12_01_21_34').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Terhapus", description: "Data dihapus" });
      fetchSantrisInClass();
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
  };

  const openAdd = () => {
    setFormData({ gender: 'ikhwan', status: 'Aktif', kelas: activeKelas || 7 });
    setIsEditMode(false); setIsDialogOpen(true);
  };

  const openEdit = (e: React.MouseEvent, santri: SantriSaldo) => {
    e.stopPropagation(); setFormData(santri); setIsEditMode(true); setIsDialogOpen(true);
  };

  const onDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); handleDelete(id);
  }

  // Filter Search
  const filteredSantris = santris.filter(s => s.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()));

  /* ================= TAMPILAN 1: GRID KARTU KELAS (DASHBOARD SANTRI) ================= */
  if (activeKelas === null) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* CONTROL PANEL ATAS */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-green-100">
             <div>
                 <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Users className="text-green-600" /> Database Santri</h2>
                 <p className="text-sm text-gray-500">Pilih kelas untuk melihat daftar santri.</p>
             </div>
             <div className="flex gap-3 w-full md:w-auto">
                 {/* TOMBOL TAMBAH SANTRI */}
                 <Button onClick={openAdd} className="bg-green-600 hover:bg-green-700 shadow-md flex-1 md:flex-none">
                    <UserPlus className="mr-2 h-4 w-4" /> Santri Baru
                 </Button>
                 {/* TOMBOL NAIK KELAS (BERBAHAYA - DIKANAN) */}
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" className="border-orange-200 text-orange-600 hover:bg-orange-50 shadow-sm flex-1 md:flex-none">
                            <ArrowUpCircle className="mr-2 h-4 w-4" /> Naik Kelas
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-orange-600 flex items-center gap-2">
                                <AlertTriangle /> Peringatan Kenaikan Kelas
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                <span className="block mb-2 font-bold text-gray-800">Sistem akan melakukan:</span>
                                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                                    <li>Kelas 7-11 naik ke tingkat berikutnya.</li>
                                    <li className="text-red-600 font-bold">Kelas 12 akan DIHAPUS permanen (Lulus).</li>
                                    <li className="text-red-600 font-bold">Riwayat Transaksi Kelas 12 juga akan DIHAPUS.</li>
                                </ul>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={handleNaikKelasMassal} className="bg-orange-600 hover:bg-orange-700">Ya, Proses Naik Kelas</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
             </div>
        </div>

        {/* GRID KARTU KELAS */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {classSummaries.map((summary) => (
                <Card key={summary.kelas} onClick={() => setActiveKelas(summary.kelas)} className="cursor-pointer hover:shadow-md hover:border-green-300 transition-all group relative overflow-hidden bg-white border-green-100">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-full -mr-8 -mt-8 z-0 group-hover:bg-green-100 transition-colors"></div>
                    <CardHeader className="pb-2 relative z-10">
                        <CardTitle className="text-lg font-bold text-gray-700 flex justify-between items-center">
                            Kelas {summary.kelas}
                            <GraduationCap className="w-5 h-5 text-green-600 opacity-50" />
                        </CardTitle>
                        <CardDescription>{summary.count} Santri</CardDescription>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-2xl font-bold text-gray-800">Rp {summary.totalSaldo.toLocaleString("id-ID")}</div>
                        <p className="text-[10px] text-green-600 mt-1 font-medium bg-green-50 inline-block px-2 py-0.5 rounded-full">Total Tabungan</p>
                    </CardContent>
                </Card>
            ))}
        </div>

        {/* FORM TAMBAH (GLOBAL DI HALAMAN DEPAN) */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Tambah Santri Baru</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="text-sm font-medium">NIS</label><Input value={formData.nis || ''} onChange={e => setFormData({...formData, nis: e.target.value})} placeholder="12345" /></div>
                        <div className="space-y-2"><label className="text-sm font-medium">Nama</label><Input value={formData.nama_lengkap || ''} onChange={e => setFormData({...formData, nama_lengkap: e.target.value})} placeholder="Nama Lengkap" required /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="text-sm font-medium">Kelas</label><Select value={String(formData.kelas)} onValueChange={v => setFormData({...formData, kelas: parseInt(v)})}> <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[7,8,9,10,11,12].map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}</SelectContent></Select></div>
                        <div className="space-y-2"><label className="text-sm font-medium">Gender</label><Select value={formData.gender} onValueChange={v => setFormData({...formData, gender: v as any})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ikhwan">Ikhwan</SelectItem><SelectItem value="akhwat">Akhwat</SelectItem></SelectContent></Select></div>
                    </div>
                    <div className="space-y-2"><label className="text-sm font-medium">Wali</label><Input value={formData.nama_wali || ''} onChange={e => setFormData({...formData, nama_wali: e.target.value})} placeholder="Nama Orang Tua" /></div>
                    <DialogFooter><Button type="submit" className="bg-green-600 hover:bg-green-700">Simpan Data</Button></DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
      </div>
    );
  }

  /* ================= TAMPILAN 2: DETAIL LIST PER KELAS ================= */
  return (
    <Card className="border-green-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
      <CardHeader className="bg-white border-b border-green-50 pb-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
             <Button variant="ghost" size="icon" onClick={() => setActiveKelas(null)} className="hover:bg-green-50"><ArrowLeft className="h-5 w-5 text-gray-600" /></Button>
             <div><CardTitle className="text-lg font-bold text-gray-800">Data Santri Kelas {activeKelas}</CardTitle><p className="text-xs text-gray-500">{filteredSantris.length} Santri Terdaftar</p></div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" /><Input placeholder="Cari Nama / NIS..." className="pl-9 h-9 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            <Button onClick={openAdd} size="sm" className="bg-green-600 hover:bg-green-700 h-9"><UserPlus className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Baru</span></Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-green-50 text-green-800 font-semibold border-b border-green-100">
              <tr>
                <th className="p-4">NIS</th><th className="p-4">Nama Lengkap</th><th className="p-4">Gender</th><th className="p-4">Saldo</th><th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSantris.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">Tidak ada data santri ditemukan.</td></tr>
              ) : (
                  filteredSantris.map((santri) => (
                    <tr key={santri.id} className="hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => onSelectSantri && onSelectSantri(santri.id)}>
                      <td className="p-4 font-mono text-gray-500">{santri.nis || "-"}</td>
                      <td className="p-4 font-bold text-gray-800 group-hover:text-green-600 group-hover:underline">{santri.nama_lengkap}</td>
                      <td className="p-4 capitalize"><span className={`px-2 py-1 rounded-full text-xs font-medium border ${santri.gender === 'ikhwan' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-pink-50 text-pink-700 border-pink-200'}`}>{santri.gender}</span></td>
                      <td className="p-4 font-bold text-gray-700">Rp {(santri.saldo || 0).toLocaleString('id-ID')}</td>
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
      
      {/* Dialog Edit (Sama dengan Tambah) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>{isEditMode ? "Edit Santri" : "Tambah Santri Baru"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-sm font-medium">NIS</label><Input value={formData.nis || ''} onChange={e => setFormData({...formData, nis: e.target.value})} placeholder="12345" /></div>
                    <div className="space-y-2"><label className="text-sm font-medium">Nama</label><Input value={formData.nama_lengkap || ''} onChange={e => setFormData({...formData, nama_lengkap: e.target.value})} placeholder="Nama Santri" required /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-sm font-medium">Kelas</label><Select value={String(formData.kelas)} onValueChange={v => setFormData({...formData, kelas: parseInt(v)})}> <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[7,8,9,10,11,12].map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><label className="text-sm font-medium">Gender</label><Select value={formData.gender} onValueChange={v => setFormData({...formData, gender: v as any})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ikhwan">Ikhwan</SelectItem><SelectItem value="akhwat">Akhwat</SelectItem></SelectContent></Select></div>
                </div>
                <div className="space-y-2"><label className="text-sm font-medium">Wali</label><Input value={formData.nama_wali || ''} onChange={e => setFormData({...formData, nama_wali: e.target.value})} placeholder="Nama Orang Tua" /></div>
                <DialogFooter><Button type="submit" className="bg-green-600 hover:bg-green-700">Simpan Data</Button></DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SantriManagement;
