import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
    Users, Link as LinkIcon, AlertCircle, CheckCircle2, 
    Search, UserCog, Eye, GraduationCap, Clock 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface UserData {
  id: string; email: string; full_name: string;
  role: 'admin' | 'viewer' | 'parent' | 'pending';
  created_at: string; linked_santri_id?: string;
}
interface SantriSimple { id: string; nama_lengkap: string; kelas: number; }

const UserManagement: React.FC = () => {
  const { isAdmin, user: currentUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [santriList, setSantriList] = useState<SantriSimple[]>([]);
  
  // State untuk Filter & Tab
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'admin' | 'viewer' | 'parent'>('all');
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: userData, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      // @ts-ignore
      setUsers(userData || []);
      
      const { data: santriData } = await supabase.from('santri_2025_12_01_21_34').select('id, nama_lengkap, kelas').order('nama_lengkap');
      setSantriList(santriData || []);
    } catch (error: any) { 
        console.error(error);
    } finally { 
        setLoading(false); 
    }
  };

  useEffect(() => { if (isAdmin) fetchData(); }, [isAdmin]);

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      if (userId === currentUser?.id && newRole !== 'admin') {
          toast({ title: "Gagal", description: "Anda tidak bisa mengubah role Anda sendiri.", variant: "destructive" });
          return;
      }
      const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
      if (error) throw error;
      toast({ title: "Berhasil", description: "Role pengguna diperbarui." });
      fetchData(); 
    } catch (err: any) { 
        toast({ title: "Error", description: err.message, variant: "destructive" }); 
    }
  };

  const handleLinkSantri = async (userId: string, santriId: string) => {
    try {
      const { error } = await supabase.from('users').update({ linked_santri_id: santriId }).eq('id', userId);
      if (error) throw error;
      toast({ title: "Terhubung!", description: "Akun Orang Tua berhasil ditautkan ke Santri." });
      fetchData();
    } catch (err: any) { 
        toast({ title: "Error", description: err.message, variant: "destructive" }); 
    }
  };

  // 🔥 LOGIKA FILTERING
  const filteredUsers = users.filter(u => {
      const matchesSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = activeTab === 'all' ? true : u.role === activeTab;
      return matchesSearch && matchesTab;
  });

  // 🔥 HITUNG JUMLAH PER ROLE
  const countPending = users.filter(u => u.role === 'pending').length;
  const countAdmin = users.filter(u => u.role === 'admin').length;
  const countViewer = users.filter(u => u.role === 'viewer').length;
  const countParent = users.filter(u => u.role === 'parent').length;

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
        
        {/* 1. BAGIAN ATAS: INDIKATOR STATISTIK */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="border-gray-200 bg-white shadow-sm cursor-pointer hover:border-gray-400 transition-all" onClick={() => setActiveTab('all')}>
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-gray-800">{users.length}</span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mt-1">Total User</span>
                </CardContent>
            </Card>
            
            <Card className={`border-yellow-200 bg-yellow-50/50 shadow-sm cursor-pointer hover:bg-yellow-100 transition-all ${activeTab === 'pending' ? 'ring-2 ring-yellow-400' : ''}`} onClick={() => setActiveTab('pending')}>
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-yellow-700">{countPending}</span>
                    <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-wide mt-1 flex items-center gap-1">
                        <Clock size={12} /> Pending
                    </span>
                </CardContent>
            </Card>

            <Card className={`border-green-200 bg-green-50/50 shadow-sm cursor-pointer hover:bg-green-100 transition-all ${activeTab === 'admin' ? 'ring-2 ring-green-400' : ''}`} onClick={() => setActiveTab('admin')}>
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-green-700">{countAdmin}</span>
                    <span className="text-[10px] font-bold text-green-600 uppercase tracking-wide mt-1 flex items-center gap-1">
                        <UserCog size={12} /> Admin
                    </span>
                </CardContent>
            </Card>

            <Card className={`border-purple-200 bg-purple-50/50 shadow-sm cursor-pointer hover:bg-purple-100 transition-all ${activeTab === 'parent' ? 'ring-2 ring-purple-400' : ''}`} onClick={() => setActiveTab('parent')}>
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-purple-700">{countParent}</span>
                    <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wide mt-1 flex items-center gap-1">
                        <GraduationCap size={12} /> Orang Tua
                    </span>
                </CardContent>
            </Card>

            <Card className={`border-blue-200 bg-blue-50/50 shadow-sm cursor-pointer hover:bg-blue-100 transition-all ${activeTab === 'viewer' ? 'ring-2 ring-blue-400' : ''}`} onClick={() => setActiveTab('viewer')}>
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-blue-700">{countViewer}</span>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mt-1 flex items-center gap-1">
                        <Eye size={12} /> Viewer
                    </span>
                </CardContent>
            </Card>
        </div>

        {/* 2. BAGIAN TENGAH: FILTER & SEARCH */}
        <Card className="border-green-100 shadow-md bg-white">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-3 p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-gray-800">
                        <Users className="h-5 w-5 text-green-600" />
                        <CardTitle className="text-base">Daftar Pengguna ({activeTab === 'all' ? 'Semua' : activeTab.toUpperCase()})</CardTitle>
                    </div>
                    
                    {/* Search Bar */}
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Cari nama atau email..."
                            className="pl-9 bg-white h-9 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            
            <CardContent className="p-0">
                {filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm italic">
                        Tidak ada pengguna ditemukan di kategori ini.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredUsers.map((u) => (
                            <div key={u.id} className="flex flex-col lg:flex-row lg:items-center justify-between p-4 gap-4 hover:bg-gray-50 transition-colors animate-in fade-in duration-300">
                            
                            {/* Bagian Kiri: Info User */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-gray-800 truncate">{u.full_name || "Tanpa Nama"}</span>
                                    {/* Badge Status Dinamis */}
                                    {u.role === 'pending' && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200 flex items-center gap-1 animate-pulse"><AlertCircle size={10} /> Perlu Verifikasi</span>}
                                    {u.role === 'parent' && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200 font-bold">Wali Santri</span>}
                                    {u.role === 'admin' && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200 font-bold">Admin</span>}
                                    {u.role === 'viewer' && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 font-bold">Viewer</span>}
                                </div>
                                <div className="text-xs text-gray-500 font-mono truncate">{u.email}</div>
                                <div className="text-[10px] text-gray-400 mt-1">Gabung: {new Date(u.created_at).toLocaleDateString('id-ID')}</div>
                            </div>
                            
                            {/* Bagian Kanan: Kontrol */}
                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-gray-50 p-2 rounded-lg lg:bg-transparent lg:p-0">
                                
                                {/* 1. Pilih Role */}
                                <div className="w-full sm:w-40">
                                    <label className="text-[9px] text-gray-400 font-bold uppercase mb-1 block">Role Akses</label>
                                    <Select value={u.role} onValueChange={(v) => handleRoleUpdate(u.id, v)}>
                                        <SelectTrigger className={`h-8 text-xs ${u.role === 'pending' ? 'border-yellow-400 bg-yellow-50' : 'bg-white'}`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">🚫 Pending</SelectItem>
                                            <SelectItem value="viewer">👀 Viewer</SelectItem>
                                            <SelectItem value="admin">🛠️ Admin</SelectItem>
                                            <SelectItem value="parent">👨‍👩‍👧 Orang Tua</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* 2. Pilih Anak (Hanya Muncul Jika Role = Parent) */}
                                {u.role === 'parent' && (
                                    <div className="w-full sm:w-56 animate-in fade-in slide-in-from-left-4 duration-300">
                                        <label className="text-[9px] text-purple-600 font-bold uppercase mb-1 flex items-center gap-1">
                                            <LinkIcon size={10} /> Hubungkan ke Anak
                                        </label>
                                        <Select 
                                            value={u.linked_santri_id || ""} 
                                            onValueChange={(v) => handleLinkSantri(u.id, v)}
                                        >
                                            <SelectTrigger className={`h-8 text-xs border-purple-200 ${u.linked_santri_id ? 'bg-purple-50 text-purple-700 font-bold' : 'bg-white text-gray-400'}`}>
                                                <SelectValue placeholder="-- Pilih Nama Santri --" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[200px]">
                                                {santriList.map(s => (
                                                    <SelectItem key={s.id} value={s.id}>
                                                        {s.nama_lengkap} (Kelas {s.kelas})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Indikator Sukses Link */}
                                {u.role === 'parent' && u.linked_santri_id && (
                                    <div className="hidden sm:block text-green-600" title="Terhubung">
                                        <CheckCircle2 size={18} />
                                    </div>
                                )}

                            </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
};

export default UserManagement;
