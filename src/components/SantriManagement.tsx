import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { 
  UserPlus, Search, RefreshCw, User, UserCheck, 
  Pencil, Trash2 
} from 'lucide-react';

/* ================= TYPES ================= */
interface TransactionHistory {
  amount: number;
  type: 'income' | 'expense';
  date: string;
}

interface SantriSaldo {
  id: string;
  nama_lengkap: string;
  nis: string;
  kelas: number;
  gender: "ikhwan" | "akhwat";
  saldo: number;
  status: string;
  nama_wali: string;
  recent_trx: TransactionHistory[];
}

interface SantriManagementProps {
  kelas: string | null;
  onSelectSantri?: (id: string) => void; 
}

const SantriManagement = ({ kelas, onSelectSantri }: SantriManagementProps) => {
  const { toast } = useToast();
  const [data, setData] = useState<SantriSaldo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // State Dialog Form
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<SantriSaldo>>({
    gender: 'ikhwan',
    status: 'Aktif',
    kelas: 7
  });

  /* ================= FETCH DATA ================= */
  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("view_santri_saldo") 
        .select("*");

      if (kelas) {
        query = query.eq("kelas", parseInt(kelas));
      }

      const { data: result, error } = await query.order("nama_lengkap", { ascending: true });

      if (error) throw error;

      // @ts-ignore
      setData(result || []);

    } catch (err: any) {
      console.error(err);
      toast({
        title: "Gagal memuat data",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [kelas]);

  /* ================= CRUD LOGIC ================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditMode && formData.id) {
        // Update
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
        // Insert
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
      fetchData();
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
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const openAdd = () => {
    setFormData({ gender: 'ikhwan', status: 'Aktif', kelas: kelas ? parseInt(kelas) : 7 });
    setIsEditMode(false);
    setIsDialogOpen(true);
  };

  const openEdit = (e: React.MouseEvent, santri: SantriSaldo) => {
    e.stopPropagation(); // Biar gak trigger klik baris (masuk detail)
    setFormData(santri);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const onDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    handleDelete(id);
  }

  /* ================= RENDER COMPONENTS ================= */
  const filteredData = data.filter(s => 
    s.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const dataIkhwan = filteredData.filter(s => s.gender === 'ikhwan');
  const dataAkhwat = filteredData.filter(s => s.gender === 'akhwat');

  // Komponen List Santri Per Kelas (Design Lama)
  const SantriPerKelas = ({ items }: { items: SantriSaldo[] }) => {
      const classList = [7, 8, 9, 10, 11, 12, 99]; // Termasuk Alumni

      return (
        <div className="space-y-6 p-2">
            {classList.map((cls) => {
                const studentsInClass = items.filter(s => s.kelas === cls);
                if (studentsInClass.length === 0) return null;

                return (
                    <div key={cls} className="mb-4">
                        {/* HEADER KELAS KECIL */}
                        <div className="flex items-center gap-2 mb-2 px-2">
                            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-md border border-gray-200">
                                {cls === 99 ? "ALUMNI" : `KELAS ${cls}`}
                            </span>
                            <div className="h-px bg-gray-100 flex-1"></div>
                        </div>

                        {/* LIST ITEMS */}
                        <div className="space-y-1">
                            {studentsInClass.map((s) => (
                                <div
                                    key={s.id}
                                    onClick={() => onSelectSantri && onSelectSantri(s.id)}
                                    className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-transparent hover:border-green-300 hover:bg-green-50/50 hover:shadow-sm transition-all bg-gray-50/30 cursor-pointer"
                                >
                                    {/* NAMA */}
                                    <div className="mb-2 sm:mb-0">
                                        <span className="font-bold text-gray-700 text-sm capitalize block group-hover:text-green-700 group-hover:underline decoration-green-500 decoration-2 underline-offset-2">
                                            {s.nama_lengkap}
                                        </span>
                                    </div>

                                    {/* INFO KANAN */}
                                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                                        
                                        {/* RIWAYAT MINI (3 Terakhir) */}
                                        <div className="flex gap-1 overflow-hidden opacity-80 group-hover:opacity-100 transition-opacity">
                                            {s.recent_trx && s.recent_trx.map((trx, idx) => (
                                                <div 
                                                    key={idx}
                                                    className={`text-[9px] px-1 rounded border ${
                                                        trx.type === 'income' 
                                                        ? 'bg-green-50 text-green-600 border-green-100' 
                                                        : 'bg-red-50 text-red-600 border-red-100'
                                                    }`}
                                                >
                                                    {trx.type === 'income' ? '+' : '-'}
                                                    {(trx.amount / 1000).toFixed(0)}k
                                                </div>
                                            ))}
                                        </div>

                                        {/* SALDO */}
                                        <div className="text-right min-w-[80px]">
                                            <span className={`font-bold text-sm ${s.saldo > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                                Rp {s.saldo.toLocaleString('id-ID')}
                                            </span>
                                        </div>

                                        {/* TOMBOL EDIT/HAPUS (Muncul saat hover) */}
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => openEdit(e, s)}>
                                                <Pencil size={12} className="text-blue-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => onDeleteClick(e, s.id)}>
                                                <Trash2 size={12} className="text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
            
            {items.length === 0 && (
                 <div className="text-center py-8 text-gray-400 text-xs italic">
                     Tidak ada data santri yang ditemukan.
                 </div>
            )}
        </div>
      );
  };

  return (
    <div className="space-y-4">
        {/* HEADER & SEARCH & ADD BUTTON */}
        <Card className="border-green-100 shadow-sm bg-white">
            <CardHeader className="py-4 px-4 border-b bg-gray-50/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* BUTTON TAMBAH (TERPISAH DI KIRI) */}
                    <Button onClick={openAdd} className="bg-green-600 hover:bg-green-700 shadow-sm">
                        <UserPlus className="mr-2 h-4 w-4" /> Santri Baru
                    </Button>

                    <div className="flex items-center gap-2 flex-1 md:justify-end">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                            <Input 
                                placeholder="Cari Nama Santri..." 
                                className="pl-9 h-9 text-sm bg-white" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={fetchData} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>
            </CardHeader>
        </Card>

        {/* LOADING */}
        {loading ? (
           <Card className="p-8 text-center text-gray-500 animate-pulse bg-white">Sedang memuat data santri...</Card>
        ) : (
            /* GRID 2 KOLOM (OLD STYLE) */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* KOLOM KIRI: IKHWAN */}
                <Card className="border-green-200 shadow-sm bg-white flex flex-col h-full border-t-4 border-t-green-600">
                    <div className="bg-green-50 p-3 border-b border-green-100 flex items-center justify-between sticky top-0 z-10">
                        <h3 className="font-bold text-green-800 flex items-center gap-2"><User className="w-4 h-4" /> Santri Ikhwan</h3>
                        <span className="text-xs bg-white px-2 py-0.5 rounded-full text-green-700 font-bold border border-green-200">{dataIkhwan.length} Santri</span>
                    </div>
                    <CardContent className="p-0 max-h-[600px] overflow-y-auto custom-scrollbar">
                        <SantriPerKelas items={dataIkhwan} />
                    </CardContent>
                </Card>

                {/* KOLOM KANAN: AKHWAT */}
                <Card className="border-pink-200 shadow-sm bg-white flex flex-col h-full border-t-4 border-t-pink-500">
                    <div className="bg-pink-50 p-3 border-b border-pink-100 flex items-center justify-between sticky top-0 z-10">
                        <h3 className="font-bold text-pink-800 flex items-center gap-2"><UserCheck className="w-4 h-4" /> Santri Akhwat</h3>
                        <span className="text-xs bg-white px-2 py-0.5 rounded-full text-pink-700 font-bold border border-pink-200">{dataAkhwat.length} Santri</span>
                    </div>
                    <CardContent className="p-0 max-h-[600px] overflow-y-auto custom-scrollbar">
                         <SantriPerKelas items={dataAkhwat} />
                    </CardContent>
                </Card>

            </div>
        )}

        {/* DIALOG FORM */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditMode ? "Edit Santri" : "Tambah Santri Baru"}</DialogTitle>
                    <DialogDescription>Lengkapi data santri di bawah ini.</DialogDescription>
                </DialogHeader>
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
};

export default SantriManagement;
