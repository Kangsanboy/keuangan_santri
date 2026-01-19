import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
} from "@/components/ui/alert-dialog"; // Import Alert Dialog untuk keamanan
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { 
  UserPlus, Search, Pencil, Trash2, Users, GraduationCap, 
  ArrowUpCircle, AlertTriangle 
} from 'lucide-react';

interface Santri {
  id: string;
  nama_lengkap: string;
  nis: string;
  kelas: number;
  gender: 'ikhwan' | 'akhwat';
  status: string;
  nama_wali: string;
  no_hp_wali: string;
}

interface SantriManagementProps {
  kelas?: string | null;
  onSelectSantri?: (id: string) => void; 
}

const SantriManagement = ({ kelas, onSelectSantri }: SantriManagementProps) => {
  const { toast } = useToast();
  const [santris, setSantris] = useState<Santri[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // State Form
  const [formData, setFormData] = useState<Partial<Santri>>({
    gender: 'ikhwan',
    status: 'Aktif',
    kelas: 7
  });

  const fetchSantris = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('santri_2025_12_01_21_34')
        .select('*')
        .order('nama_lengkap', { ascending: true });

      if (kelas) {
        query = query.eq('kelas', parseInt(kelas));
      }

      const { data, error } = await query;
      if (error) throw error;
      setSantris(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSantris();
  }, [kelas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditMode && formData.id) {
        const { error } = await supabase
          .from('santri_2025_12_01_21_34')
          .update(formData)
          .eq('id', formData.id);
        if (error) throw error;
        toast({ title: "Sukses", description: "Data santri berhasil diperbarui" });
      } else {
        const { error } = await supabase
          .from('santri_2025_12_01_21_34')
          .insert([formData]);
        if (error) throw error;
        toast({ title: "Sukses", description: "Santri baru berhasil ditambahkan" });
      }
      setIsDialogOpen(false);
      fetchSantris();
      setFormData({ gender: 'ikhwan', status: 'Aktif', kelas: 7 });
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus data santri ini? Data keuangan juga akan terhapus!")) return;
    try {
      const { error } = await supabase.from('santri_2025_12_01_21_34').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Terhapus", description: "Data santri telah dihapus" });
      fetchSantris();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const openEdit = (santri: Santri) => {
    setFormData(santri);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const openAdd = () => {
    setFormData({ gender: 'ikhwan', status: 'Aktif', kelas: 7 });
    setIsEditMode(false);
    setIsDialogOpen(true);
  };

  // 🔥 FUNGSI NAIK KELAS MASSAL
  const handleNaikKelasMassal = async () => {
    try {
        setLoading(true);
        // Panggil fungsi RPC yang sudah kita buat di SQL
        const { error } = await supabase.rpc('naik_kelas_massal');
        
        if (error) throw error;

        toast({ 
            title: "Alhamdulillah! 🎓", 
            description: "Semua santri berhasil naik kelas. Kelas 12 kini menjadi Alumni (Kls 99).",
            duration: 5000
        });
        
        // Refresh data
        fetchSantris();

    } catch (error: any) {
        toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  // Filter Search
  const filteredSantris = santris.filter(s => 
    s.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nis?.includes(searchTerm)
  );

  return (
    <Card className="border-green-100 shadow-sm">
      <CardHeader className="bg-white border-b border-green-50 pb-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
             <Users className="text-green-600 h-6 w-6" />
             <div>
                <CardTitle className="text-lg font-bold text-gray-800">
                    Manajemen Santri {kelas ? `Kelas ${kelas}` : ''}
                </CardTitle>
                <p className="text-xs text-gray-500">Total: {filteredSantris.length} Santri</p>
             </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari Nama / NIS..."
                className="pl-9 h-9 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Button onClick={openAdd} size="sm" className="bg-green-600 hover:bg-green-700 h-9">
              <UserPlus className="h-4 w-4 mr-2" />
              Baru
            </Button>
            
            {/* 🔥 TOMBOL NAIK KELAS (Hanya muncul jika mode 'Semua Santri') */}
            {!kelas && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="border-orange-200 text-orange-600 hover:bg-orange-50 h-9">
                            <ArrowUpCircle className="h-4 w-4 mr-2" />
                            Naik Kelas
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
                                <AlertTriangle className="h-5 w-5" /> Peringatan Kenaikan Kelas
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Apakah Anda yakin ingin menjalankan <strong>Kenaikan Kelas Massal</strong>?
                                <br/><br/>
                                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                                    <li>Kelas <strong>12</strong> akan menjadi <strong>Alumni (Kelas 99)</strong>.</li>
                                    <li>Kelas <strong>7 - 11</strong> akan naik <strong>+1 tingkat</strong>.</li>
                                    <li>Saldo santri <strong>TIDAK AKAN HILANG</strong>.</li>
                                </ul>
                                <br/>
                                <em>Tindakan ini tidak dapat dibatalkan secara otomatis.</em>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={handleNaikKelasMassal} className="bg-orange-600 hover:bg-orange-700">
                                Ya, Proses Naik Kelas
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

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
                <th className="p-4">Kelas</th>
                <th className="p-4">Gender</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSantris.length === 0 ? (
                <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400 italic">
                        Tidak ada data santri ditemukan.
                    </td>
                </tr>
              ) : (
                  filteredSantris.map((santri) => (
                    <tr key={santri.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="p-4 font-mono text-gray-500">{santri.nis || "-"}</td>
                      <td 
                        className="p-4 font-bold text-gray-800 cursor-pointer hover:text-green-600 hover:underline"
                        onClick={() => onSelectSantri && onSelectSantri(santri.id)} // 🔥 Klik Nama -> Detail
                      >
                          {santri.nama_lengkap}
                      </td>
                      <td className="p-4">
                          {santri.kelas === 99 ? (
                              <span className="badge bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs border border-gray-200">Alumni</span>
                          ) : (
                              <span className="font-medium">Kelas {santri.kelas}</span>
                          )}
                      </td>
                      <td className="p-4 capitalize">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                            santri.gender === 'ikhwan' 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : 'bg-pink-50 text-pink-700 border-pink-200'
                        }`}>
                            {santri.gender}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${santri.status === 'Aktif' ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}>
                            {santri.status}
                        </span>
                      </td>
                      <td className="p-4 text-center flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-50" onClick={() => openEdit(santri)}>
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => handleDelete(santri.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* DIALOG FORM (Tambah/Edit) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Santri" : "Tambah Santri Baru"}</DialogTitle>
            <DialogDescription>Isi data santri dengan lengkap.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">NIS</label>
                    <Input value={formData.nis || ''} onChange={e => setFormData({...formData, nis: e.target.value})} placeholder="12345" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Nama Lengkap</label>
                    <Input value={formData.nama_lengkap || ''} onChange={e => setFormData({...formData, nama_lengkap: e.target.value})} placeholder="Nama Santri" required />
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Kelas</label>
                    <Select value={String(formData.kelas || 7)} onValueChange={v => setFormData({...formData, kelas: parseInt(v)})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {[7,8,9,10,11,12].map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}
                            <SelectItem value="99">Alumni</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Gender</label>
                    <Select value={formData.gender} onValueChange={v => setFormData({...formData, gender: v as any})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ikhwan">Ikhwan (Laki-laki)</SelectItem>
                            <SelectItem value="akhwat">Akhwat (Perempuan)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Nama Wali</label>
                <Input value={formData.nama_wali || ''} onChange={e => setFormData({...formData, nama_wali: e.target.value})} placeholder="Nama Orang Tua" />
            </div>

            <DialogFooter>
                <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={loading}>
                    {loading ? "Menyimpan..." : "Simpan Data"}
                </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SantriManagement;
