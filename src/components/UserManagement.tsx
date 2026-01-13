import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, UserCheck, Loader2, Link as LinkIcon } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'viewer' | 'parent'; // Tambah role parent
  created_at: string;
  linked_santri_id?: string; // Kolom baru
}

interface SantriSimple {
    id: string;
    nama_lengkap: string;
    kelas: number;
}

const UserManagement: React.FC = () => {
  const { isAdmin, user: currentUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [santriList, setSantriList] = useState<SantriSimple[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Ambil User
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (userError) throw userError;
      setUsers(userData || []);

      // 2. Ambil List Santri (Buat Pilihan Dropdown)
      const { data: santriData } = await supabase
        .from('santri_2025_12_01_21_34')
        .select('id, nama_lengkap, kelas')
        .order('nama_lengkap');
      
      setSantriList(santriData || []);

    } catch (error: any) {
      toast({ title: "Gagal memuat data", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  // Update Role
  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
      if (error) throw error;
      toast({ title: "Sukses", description: "Role berhasil diupdate" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Update Link Santri
  const handleLinkSantri = async (userId: string, santriId: string) => {
    try {
      const { error } = await supabase.from('users').update({ linked_santri_id: santriId }).eq('id', userId);
      if (error) throw error;
      toast({ title: "Terhubung!", description: "Akun berhasil dihubungkan ke santri." });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (!isAdmin) return null;

  return (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Manajemen Pengguna & Wali Santri
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="divide-y divide-gray-100">
              {users.map((u) => (
                <div key={u.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 hover:bg-gray-50">
                  
                  {/* Info User */}
                  <div className="flex-1">
                    <div className="font-bold text-gray-800">{u.full_name || "Tanpa Nama"}</div>
                    <div className="text-sm text-gray-500">{u.email}</div>
                    <div className="mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                            u.role === 'admin' ? 'bg-green-50 text-green-700 border-green-200' :
                            u.role === 'parent' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                            {u.role}
                        </span>
                    </div>
                  </div>
                  
                  {/* Kontrol Role & Link Santri */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    
                    {/* Pilih Role */}
                    <div className="w-32">
                        <label className="text-[10px] text-gray-400 font-bold uppercase">Role</label>
                        <Select value={u.role} onValueChange={(v) => handleRoleUpdate(u.id, v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="viewer">Viewer</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="parent">Orang Tua</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Pilih Anak (Hanya muncul kalau role = parent) */}
                    {u.role === 'parent' && (
                        <div className="w-48 animate-in fade-in slide-in-from-left-2">
                            <label className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
                                <LinkIcon size={10} /> Hubungkan Santri
                            </label>
                            <Select 
                                value={u.linked_santri_id || ""} 
                                onValueChange={(v) => handleLinkSantri(u.id, v)}
                            >
                                <SelectTrigger className="h-8 text-xs bg-purple-50 border-purple-200 text-purple-700">
                                    <SelectValue placeholder="Pilih Anak..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {santriList.map(s => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.nama_lengkap} (Kls {s.kelas})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
