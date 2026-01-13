import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Link as LinkIcon, AlertCircle, CheckCircle2 } from 'lucide-react';

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
      // Validasi biar Admin gak ngunci diri sendiri
      if (userId === currentUser?.id && newRole !== 'admin') {
          toast({ title: "Gagal", description: "Anda tidak bisa mengubah role Anda sendiri.", variant: "destructive" });
          return;
      }

      const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
      if (error) throw error;
      
      toast({ title: "Berhasil", description: "Role pengguna diperbarui." });
      fetchData(); // Refresh data
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

  if (!isAdmin) return null;

  return (
    <Card className="border-green-100 shadow-md">
        <CardHeader className="bg-green-50/50 border-b border-green-100">
            <CardTitle className="flex items-center gap-2 text-green-800">
                <Users className="h-5 w-5" /> Manajemen Pengguna
            </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {users.map((u) => (
                <div key={u.id} className="flex flex-col lg:flex-row lg:items-center justify-between p-4 gap-4 hover:bg-gray-50 transition-colors">
                  
                  {/* Bagian Kiri: Info User */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-800 truncate">{u.full_name || "Tanpa Nama"}</span>
                        {/* Badge Status */}
                        {u.role === 'pending' && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200 flex items-center gap-1"><AlertCircle size={10} /> Pending</span>}
                        {u.role === 'admin' && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">Admin</span>}
                        {u.role === 'parent' && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">Orang Tua</span>}
                    </div>
                    <div className="text-xs text-gray-500 font-mono truncate">{u.email}</div>
                  </div>
                  
                  {/* Bagian Kanan: Kontrol */}
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    
                    {/* 1. Pilih Role */}
                    <div className="w-full sm:w-40">
                        <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Role Akses</label>
                        <Select value={u.role} onValueChange={(v) => handleRoleUpdate(u.id, v)}>
                            <SelectTrigger className="h-9 text-xs bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pending">🚫 Pending (Tahan)</SelectItem>
                                <SelectItem value="viewer">👀 Viewer (Lihat Semua)</SelectItem>
                                <SelectItem value="admin">🛠️ Admin (Full)</SelectItem>
                                <SelectItem value="parent">👨‍👩‍👧 Orang Tua (Khusus)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 2. Pilih Anak (Hanya Muncul Jika Role = Parent) */}
                    {u.role === 'parent' && (
                        <div className="w-full sm:w-56 animate-in fade-in slide-in-from-left-4 duration-300">
                            <label className="text-[10px] text-purple-600 font-bold uppercase mb-1 flex items-center gap-1">
                                <LinkIcon size={10} /> Hubungkan ke Anak
                            </label>
                            <Select 
                                value={u.linked_santri_id || ""} 
                                onValueChange={(v) => handleLinkSantri(u.id, v)}
                            >
                                <SelectTrigger className={`h-9 text-xs border-purple-200 ${u.linked_santri_id ? 'bg-purple-50 text-purple-700 font-bold' : 'bg-white text-gray-400'}`}>
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
                            <CheckCircle2 size={20} />
                        </div>
                    )}

                  </div>
                </div>
              ))}
            </div>
        </CardContent>
    </Card>
  );
};

export default UserManagement;
