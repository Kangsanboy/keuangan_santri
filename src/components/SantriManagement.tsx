import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { 
  UserPlus, Search, Pencil, Trash2, Users, ArrowUpCircle, 
  AlertTriangle, ArrowLeft, Wallet, GraduationCap
} from 'lucide-react';

interface Santri {
  id: string;
  nama_lengkap: string;
  nis: string;
  kelas: number;
  gender: 'ikhwan' | 'akhwat';
  status: string;
  nama_wali: string;
  saldo: number; // Tambahan untuk view saldo
}

interface SantriManagementProps {
  kelas?: string | null;
  onSelectSantri?: (id: string) => void; 
}

// Tipe untuk Ringkasan Kelas
interface ClassSummary {
  kelas: number;
  count: number;
  totalSaldo: number;
}

const SantriManagement = ({ kelas: initialKelas, onSelectSantri }: SantriManagementProps) => {
  const { toast } = useToast();
  
  // State Utama
  // Jika initialKelas ada (dari props), pakai itu. Jika tidak, null (Tampil Grid Kelas)
  const [activeKelas, setActiveKelas] = useState<number | null>(initialKelas ? parseInt(initialKelas) : null);
  
  const [santris, setSantris] = useState<Santri[]>([]);
  const [classSummaries, setClassSummaries] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // State Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // State Form
  const [formData, setFormData] = useState<Partial<Santri>>({
    gender: 'ikhwan',
    status: 'Aktif',
    kelas: 7
  });

  // 1. FETCH RINGKASAN DATA (Untuk Tampilan Awal)
  const fetchSummaries = async () => {
    setLoading(true);
    try {
      // Kita ambil dari view_santri_saldo biar dapat saldonya sekalian
      const { data, error } = await supabase
        .from('view_santri_saldo')
        .select('kelas, saldo');

      if (error) throw error;

      if (data) {
        // Hitung manual grouping per kelas
        const summaries: ClassSummary[] = [];
        const classes = [7, 8, 9, 10, 11, 12, 99]; // 99 Alumni

        classes.forEach(k => {
          const filtered = data.filter(d => d.kelas === k);
          const total = filtered.reduce((acc, curr) => acc + (curr.saldo || 0), 0);
          summaries.push({
            kelas: k,
            count: filtered.length,
            totalSaldo: total
          });
        });
        setClassSummaries(summaries);
      }
    } catch (error: any) {
      console.error("Error summary:", error);
    } finally {
      setLoading(false);
    }
  };

  // 2. FETCH DATA DETAIL (Saat Masuk Kelas)
  const fetchSantrisInClass = async () => {
    if (activeKelas === null) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('view_santri_saldo') // Pakai view biar ada saldonya
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

  // Effect: Jalankan saat komponen dimuat atau activeKelas berubah
  useEffect(() => {
    if (activeKelas === null) {
      fetchSummaries();
    } else {
      fetchSantrisInClass();
    }
  }, [activeKelas]);

  // --- LOGIC CRUD & ACTION ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditMode && formData.id) {
        const { error } = await supabase.from('santri_2025_12_01_21_34').update({
             nama_lengkap: formData.nama_lengkap,
             nis: formData.nis,
             kelas: formData.kelas,
             gender: formData.gender,
             nama_wali: formData.nama_wali,
             status: formData.status
        }).eq('id', formData.id);
        if (error) throw error;
        toast({ title: "Sukses", description: "Data diperbarui" });
      } else {
        const { error } = await supabase.from('santri_2025_12_01_21_34').insert([{
             nama_lengkap: formData.nama_lengkap,
             nis: formData.nis,
             kelas: formData.kelas,
             gender: formData.gender,
             nama_wali: formData.nama_wali,
             status: formData.status
        }]);
        if (error) throw error;
        toast({ title: "Sukses", description: "Santri baru ditambahkan" });
      }
      setIsDialogOpen(false);
      // Refresh data sesuai view sekarang
      if (activeKelas === null) fetchSummaries(); else fetchSantrisInClass();
      setFormData({ gender: 'ikhwan', status: 'Aktif', kelas: 7 });
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus santri ini? Data keuangan akan hilang!")) return;
    try {
      const { error } = await supabase.from('santri_2025_12_01_21_34').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Terhapus", description: "Data dihapus" });
      fetchSantrisInClass();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleNaikKelasMassal = async () => {
    setLoading(true);
    try {
        const { error } = await supabase.rpc('naik_kelas_massal');
        if (error) throw error;
        toast({ title: "Sukses! 🎓", description: "Kenaikan kelas berhasil diproses.", duration: 5000 });
        fetchSummaries(); // Refresh tampilan luar
    } catch (error: any) {
        toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  const openAdd = () => {
    setFormData({ gender: 'ikhwan', status: 'Aktif', kelas: activeKelas || 7 });
    setIsEditMode(false);
    setIsDialogOpen(true);
  };

  const openEdit = (santri: Santri) => {
    setFormData(santri);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  // Filter Search
  const filteredSantris = santris.filter(s => 
    s.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nis?.includes(searchTerm)
  );

  /* ================= VIEW 1: GRID KELAS (TAMPILAN AWAL) ================= */
  if (activeKelas === null) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* HEADER & CONTROL PANEL */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-green-100">
             <div>
                 <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Users className="text-green-600" /> Database Santri
                 </h2>
                 <p className="text-sm text-gray-500">Kelola data santri, kenaikan kelas, dan pendaftaran.</p>
             </div>
             
             <div className="flex gap-3 w-full md:w-auto">
                 {/* TOMBOL 1: TAMBAH SANTRI */}
                 <Button onClick={openAdd} className="bg-green-600 hover:bg-green-700 shadow-md flex-1 md:flex-none">
                    <UserPlus className="mr-2 h-4 w-4" /> Santri Baru
                 </Button>

                 {/* TOMBOL 2: NAIK KELAS (DIPISAH BIAR CANGGIH) */}
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" className="border-orange-200 text-orange-600 hover:bg-orange-50 shadow-sm flex-1 md:flex-none">
                            <ArrowUpCircle className="mr-2 h-4 w-4" /> Kenaikan Kelas
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-orange-600 flex items-center gap-2">
                                <AlertTriangle /> Konfirmasi Kenaikan Kelas
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Sistem akan menaikkan tingkat semua santri secara otomatis.
                                <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-700 font-medium">
                                    <li>Kls 7-11 ➝ Naik 1 Tingkat</li>
                                    <li>Kls 12 ➝ Jadi Alumni</li>
                                    <li>Saldo ➝ <strong>AMAN (Tidak Hilang)</strong></li>
                                </ul>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={handleNaikKelasMassal} className="bg-orange-600 hover:bg-orange-700">Ya, Proses!</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
             </div>
        </div>

        {/* GRID KARTU KELAS */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {classSummaries.map((summary) => (
                <Card 
                    key={summary.kelas} 
                    onClick={() => setActiveKelas(summary.kelas)}
                    className="cursor-pointer hover:shadow-md hover:border-green-300 transition-all group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-full -mr-8 -mt-8 z-0 group-hover:bg-green-100 transition-colors"></div>
                    <CardHeader className="pb-2 relative z-10">
                        <CardTitle className="text-lg font-bold text-gray-700 flex justify-between items-center">
                            {summary.kelas === 99 ? "Alumni" : `Kelas ${summary.kelas}`}
                            <GraduationCap className="w-5 h-5 text-green-600 opacity-50" />
                        </CardTitle>
                        <CardDescription>{summary.count} Santri</CardDescription>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-2xl font-bold text-gray-800">
                            Rp {summary.totalSaldo.toLocaleString("id-ID")}
                        </div>
                        <p className="text-[10px] text-green-600 mt-1 font-medium bg-green-50 inline-block px-2 py-0.5 rounded-full">
                            Total Tabungan
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>

        {/* DIALOG TAMBAH (GLOBAL) */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Tambah Santri Baru</DialogTitle>
                    <DialogDescription>Masukkan data santri baru.</DialogDescription>
                </DialogHeader>
                {/* Form sama seperti sebelumnya */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="text-sm font-medium">NIS</label><Input value={formData.nis || ''} onChange={e => setFormData({...formData, nis: e.target.value})} placeholder="12345" /></div>
                        <div className="space-y-2"><label className="text-sm font-medium">Nama Lengkap</label><Input value={formData.nama_lengkap || ''} onChange={e => setFormData({...formData, nama_lengkap: e.target.value})} placeholder="Nama Santri" required /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Kelas</label>
                            <Select value={String(formData.kelas)} onValueChange={v => setFormData({...formData, kelas: parseInt(v)})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{[7,8,9,10,11,12].map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}<SelectItem value="99">Alumni</SelectItem></SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Gender</label>
                            <Select value={formData.gender} onValueChange={v => setFormData({...formData, gender: v as any})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="ikhwan">Ikhwan</SelectItem><SelectItem value="akhwat">Akhwat</SelectItem></SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2"><label className="text-sm font-medium">Nama Wali</label><Input value={formData.nama_wali || ''} onChange={e => setFormData({...formData, nama_wali: e.target.value})} placeholder="Nama Orang Tua" /></div>
                    <DialogFooter><Button type="submit" className="bg-green-600 hover:bg-green-700">Simpan Data</Button></DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
      </div>
    );
  }

  /* ================= VIEW 2: LIST DETAIL (SAAT KLIK KELAS) ================= */
  return (
    <Card className="border-green-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
      <CardHeader className="bg-white border-b border-green-50 pb-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
             {/* TOMBOL KEMBALI KE GRID KELAS */}
             <Button variant="ghost" size="icon" onClick={() => setActiveKelas(null)} className="hover:bg-green-50">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
             </Button>
             
             <div>
                <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    {activeKelas === 99 ? "Data Alumni" : `Data Santri Kelas ${activeKelas}`}
                </CardTitle>
                <p className="text-xs text-gray-500">{filteredSantris.length} Santri Terdaftar</p>
             </div>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input placeholder="Cari Nama / NIS..." className="pl-9 h-9 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            {/* Tombol Tambah juga ada di sini biar cepat */}
            <Button onClick={openAdd} size="sm" className="bg-green-600 hover:bg-green-700 h-9">
              <UserPlus className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Baru</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-green-50 text-green-800 font-semibold border-b border-green-100">
              <tr>
                <th className="p-4">NIS</th>
                <th className="p-4">Nama Lengkap</th>
                <th className="p-4">Gender</th>
                <th className="p-4">Saldo</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSantris.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400 italic">Tidak ada data santri ditemukan.</td></tr>
              ) : (
                  filteredSantris.map((santri) => (
                    <tr key={santri.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="p-4 font-mono text-gray-500">{santri.nis || "-"}</td>
                      <td className="p-4 font-bold text-gray-800 cursor-pointer hover:text-green-600 hover:underline" onClick={() => onSelectSantri && onSelectSantri(santri.id)}>
                          {santri.nama_lengkap}
                      </td>
                      <td className="p-4 capitalize">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${santri.gender === 'ikhwan' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-pink-50 text-pink-700 border-pink-200'}`}>{santri.gender}</span>
                      </td>
                      <td className="p-4 font-bold text-gray-700">Rp {(santri.saldo || 0).toLocaleString('id-ID')}</td>
                      <td className="p-4"><span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${santri.status === 'Aktif' ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}>{santri.status}</span></td>
                      <td className="p-4 text-center flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-50" onClick={() => openEdit(santri)}><Pencil size={14} /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => handleDelete(santri.id)}><Trash2 size={14} /></Button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
      
      {/* Reuse Dialog yang sama */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>{isEditMode ? "Edit Santri" : "Tambah Santri Baru"}</DialogTitle><DialogDescription>Isi data santri dengan lengkap.</DialogDescription></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-sm font-medium">NIS</label><Input value={formData.nis || ''} onChange={e => setFormData({...formData, nis: e.target.value})} placeholder="12345" /></div>
                    <div className="space-y-2"><label className="text-sm font-medium">Nama Lengkap</label><Input value={formData.nama_lengkap || ''} onChange={e => setFormData({...formData, nama_lengkap: e.target.value})} placeholder="Nama Santri" required /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-sm font-medium">Kelas</label><Select value={String(formData.kelas)} onValueChange={v => setFormData({...formData, kelas: parseInt(v)})}> <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[7,8,9,10,11,12].map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}<SelectItem value="99">Alumni</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><label className="text-sm font-medium">Gender</label><Select value={formData.gender} onValueChange={v => setFormData({...formData, gender: v as any})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ikhwan">Ikhwan</SelectItem><SelectItem value="akhwat">Akhwat</SelectItem></SelectContent></Select></div>
                </div>
                <div className="space-y-2"><label className="text-sm font-medium">Nama Wali</label><Input value={formData.nama_wali || ''} onChange={e => setFormData({...formData, nama_wali: e.target.value})} placeholder="Nama Orang Tua" /></div>
                <DialogFooter><Button type="submit" className="bg-green-600 hover:bg-green-700">Simpan Data</Button></DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SantriManagement;
