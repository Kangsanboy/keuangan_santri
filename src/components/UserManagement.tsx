import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, Loader2, Link as LinkIcon, AlertCircle } from 'lucide-react';

interface UserData {
  id: string; email: string; full_name: string;
  role: 'admin' | 'viewer' | 'parent' | 'pending';
  created_at: string; linked_santri_id?: string;
}
interface SantriSimple { id: string; nama_lengkap: string; kelas: number; }

const UserManagement: React.FC = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [santriList, setSantriList] = useState<SantriSimple[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: userData, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      // @ts-ignore
      setUsers(userData || []);
      const { data: santriData } = await supabase.from('santri_2025_12_01_21_34').select('id, nama_lengkap, kelas').order('nama_lengkap');
      setSantriList(santriData || []);
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); } finally { setIsLoading(false); }
  };

  useEffect(() => { if (isAdmin) fetchData(); }, [isAdmin]);

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
      if (error) throw error;
      toast({ title: "Sukses", description: "Role berhasil diupdate" });
      fetchData();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const handleLinkSantri = async (userId: string, santriId: string) => {
    try {
      const { error } = await supabase.from('users').update({ linked_santri_id: santriId }).eq('id', userId);
      if (error) throw error;
      toast({ title: "Terhubung!", description: "Akun berhasil dihubungkan ke santri." });
      fetchData();
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  if (!isAdmin) return null;

  return (
    <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Manajemen Pengguna</CardTitle></CardHeader>
        <CardContent>
            <div className="divide-y divide-gray-100">
              {users.map((u) => (
                <div key={u.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="font-bold text-gray-800 flex items-center gap-2">
                        {u.full_name || "Tanpa Nama"}
                        {u.role === 'pending' && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertCircle size={10} /> Pending</span>}
                    </div>
                    <div className="text-sm text-gray-500">{u.email}</div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="w-32">
                        <label className="text-[10px] text-gray-400 font-bold uppercase">Role</label>
                        <Select value={u.role} onValueChange={(v) => handleRoleUpdate(u.id, v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="parent">Orang Tua</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {u.role === 'parent' && (
                        <div className="w-48">
                            <label className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1"><LinkIcon size={10} /> Hubungkan Santri</label>
                            <Select value={u.linked_santri_id || ""} onValueChange={(v) => handleLinkSantri(u.id, v)}>
                                <SelectTrigger className="h-8 text-xs bg-purple-50 border-purple-200 text-purple-700"><SelectValue placeholder="Pilih Anak..." /></SelectTrigger>
                                <SelectContent>{santriList.map(s => (<SelectItem key={s.id} value={s.id}>{s.nama_lengkap} (Kls {s.kelas})</SelectItem>))}</SelectContent>
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
