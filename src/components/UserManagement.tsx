import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Shield, Users, Edit, Search, Rocket, Trash2, XCircle, Baby, Store, BookOpen } from "lucide-react";

// Update Interface: viewer diubah jadi guru
interface AppUser {
  id: string;
  email: string;
  role: "super_admin" | "admin" | "guru" | "parent" | "pending" | "kantin";
  full_name: string;
  linked_santri_id?: string | null; 
}

interface SantriData {
  id: string;
  nama_lengkap: string; 
}

const UserManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string | null>(null);
  
  // State untuk Edit
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [newRole, setNewRole] = useState<string>("guru"); // default dropdown ke guru
  
  // State Santri
  const [santriList, setSantriList] = useState<SantriData[]>([]);
  const [selectedSantriId, setSelectedSantriId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      // @ts-ignore
      setUsers(data || []);
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const fetchSantriList = async () => {
    try {
      const { data, error } = await supabase
        .from('santri_2025_12_01_21_34') 
        .select('id, nama_lengkap')       
        .order('nama_lengkap', { ascending: true });

      if (error) throw error;
      setSantriList(data || []);
    } catch (error: any) {
      console.error("Gagal ambil data santri:", error.message);
    }
  };

  useEffect(() => { 
    fetchUsers(); 
    fetchSantriList(); 
  }, []);

  const handleUpdateRole = async () => {
    if (!editingUser) return;
    try {
      const updates: any = { role: newRole };
      
      if (newRole === 'parent') {
        updates.linked_santri_id = selectedSantriId;
      } else {
        updates.linked_santri_id = null; 
      }

      // 1. Update role di tabel users
      const { error } = await supabase.from('users').update(updates).eq('id', editingUser.id);
      if (error) throw error;

      // 2. 🔥 MAGIC: OTOMATISASI INSERT KE DATA GURU 🔥
      if (newRole === 'guru') {
          // Cek apakah guru dengan nama ini sudah ada di tabel teachers
          const { data: existingTeacher } = await supabase
              .from('teachers')
              .select('id')
              .eq('full_name', editingUser.full_name)
              .maybeSingle();

          // Kalau belum ada, masukin otomatis!
          if (!existingTeacher) {
              const { error: teacherError } = await supabase.from('teachers').insert([{
                  full_name: editingUser.full_name,
                  gender: 'L', // Default laki-laki, bisa diedit nanti
                  is_active: true
                  // NIP & RFID biarkan null/kosong agar diisi oleh Admin di menu Data Guru
              }]);
              
              if (teacherError) console.error("Gagal auto-sync ke tabel guru:", teacherError);
          }
      }

      toast({ title: "Berhasil", description: `Role diubah menjadi ${newRole}.` });
      setEditingUser(null); 
      fetchUsers();
    } catch (error: any) { 
      toast({ title: "Gagal", description: error.message, variant: "destructive" }); 
    }
  };

  const handleDeleteUser = async (user: AppUser) => {
    if (!window.confirm(`Hapus user "${user.full_name}"?`)) return;
    try {
      const { error } = await supabase.from('users').delete().eq('id', user.id);
      if (error) throw error; toast({ title: "Terhapus", description: "User dihapus." }); fetchUsers();
    } catch (error: any) { toast({ title: "Gagal", description: error.message, variant: "destructive" }); }
  };

  const toggleFilter = (role: string) => { setFilterRole(filterRole === role ? null : role); };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole ? u.role === filterRole : true;
    return matchesSearch && matchesRole;
  });

  // Statistik Role
  const superAdminCount = users.filter(u => u.role === 'super_admin').length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const kantinCount = users.filter(u => u.role === 'kantin').length;
  const parentCount = users.filter(u => u.role === 'parent').length;
  const guruCount = users.filter(u => u.role === 'guru').length; // Ubah dari viewer ke guru
  const pendingCount = users.filter(u => u.role === 'pending').length;

  const handleEditClick = (user: AppUser) => {
    setEditingUser(user);
    setNewRole(user.role);
    setSelectedSantriId(user.linked_santri_id || null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* GRID STATISTIK */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card onClick={() => toggleFilter('super_admin')} className={`cursor-pointer bg-purple-50 border-purple-200 ${filterRole === 'super_admin' ? 'ring-2 ring-purple-500' : ''}`}>
            <CardHeader className="p-4 flex flex-row justify-between pb-2"><CardTitle className="text-sm font-medium text-purple-700">Super Admin</CardTitle><Rocket className="h-4 w-4 text-purple-600" /></CardHeader>
            <CardContent className="p-4 pt-0"><div className="text-2xl font-bold text-purple-900">{superAdminCount}</div></CardContent>
        </Card>
        <Card onClick={() => toggleFilter('admin')} className={`cursor-pointer bg-green-50 border-green-200 ${filterRole === 'admin' ? 'ring-2 ring-green-500' : ''}`}>
            <CardHeader className="p-4 flex flex-row justify-between pb-2"><CardTitle className="text-sm font-medium text-green-700">Admin</CardTitle><Shield className="h-4 w-4 text-green-600" /></CardHeader>
            <CardContent className="p-4 pt-0"><div className="text-2xl font-bold text-green-900">{adminCount}</div></CardContent>
        </Card>
        <Card onClick={() => toggleFilter('kantin')} className={`cursor-pointer bg-teal-50 border-teal-200 ${filterRole === 'kantin' ? 'ring-2 ring-teal-500' : ''}`}>
            <CardHeader className="p-4 flex flex-row justify-between pb-2"><CardTitle className="text-sm font-medium text-teal-700">Warung/Kantin</CardTitle><Store className="h-4 w-4 text-teal-600" /></CardHeader>
            <CardContent className="p-4 pt-0"><div className="text-2xl font-bold text-teal-900">{kantinCount}</div></CardContent>
        </Card>
        <Card onClick={() => toggleFilter('parent')} className={`cursor-pointer bg-orange-50 border-orange-200 ${filterRole === 'parent' ? 'ring-2 ring-orange-500' : ''}`}>
            <CardHeader className="p-4 flex flex-row justify-between pb-2"><CardTitle className="text-sm font-medium text-orange-700">Orang Tua</CardTitle><Baby className="h-4 w-4 text-orange-600" /></CardHeader>
            <CardContent className="p-4 pt-0"><div className="text-2xl font-bold text-orange-900">{parentCount}</div></CardContent>
        </Card>
        {/* CARD KHUSUS GURU */}
        <Card onClick={() => toggleFilter('guru')} className={`cursor-pointer bg-blue-50 border-blue-200 ${filterRole === 'guru' ? 'ring-2 ring-blue-500' : ''}`}>
            <CardHeader className="p-4 flex flex-row justify-between pb-2"><CardTitle className="text-sm font-medium text-blue-700">Guru / Staf</CardTitle><BookOpen className="h-4 w-4 text-blue-600" /></CardHeader>
            <CardContent className="p-4 pt-0"><div className="text-2xl font-bold text-blue-900">{guruCount}</div></CardContent>
        </Card>
        <Card onClick={() => toggleFilter('pending')} className={`cursor-pointer bg-yellow-50 border-yellow-200 ${filterRole === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}>
            <CardHeader className="p-4 flex flex-row justify-between pb-2"><CardTitle className="text-sm font-medium text-yellow-700">Pending</CardTitle><User className="h-4 w-4 text-yellow-600" /></CardHeader>
            <CardContent className="p-4 pt-0"><div className="text-2xl font-bold text-yellow-900">{pendingCount}</div></CardContent>
        </Card>
      </div>

      {filterRole && (<div className="flex items-center gap-2 bg-gray-100 p-2 rounded-md border text-sm text-gray-600"><span>Filter: <strong>{filterRole.replace('_',' ').toUpperCase()}</strong></span><button onClick={() => setFilterRole(null)} className="ml-auto text-red-500 font-bold flex gap-1"><XCircle className="w-4 h-4" /> Reset</button></div>)}

      <Card className="border-green-100 shadow-sm bg-white">
        <CardHeader className="flex flex-col md:flex-row justify-between gap-4 bg-gray-50/50 border-b pb-4"><div><CardTitle>Manajemen Pengguna</CardTitle></div><div className="relative w-full md:w-64"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" /><Input placeholder="Cari user..." className="pl-9 h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div></CardHeader>
        <CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-gray-50 text-gray-700 font-semibold border-b"><tr><th className="p-4">Nama</th><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4 text-center">Aksi</th></tr></thead><tbody className="divide-y">{filteredUsers.map((user) => (<tr key={user.id} className="hover:bg-gray-50"><td className="p-4 font-bold">{user.full_name}</td><td className="p-4 text-gray-600">{user.email}</td><td className="p-4">
            <span className={`px-2 py-1 rounded-full text-xs font-bold border uppercase ${
                user.role==='super_admin' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                user.role==='admin' ? 'bg-green-100 text-green-700 border-green-200' :
                user.role==='guru' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                user.role==='parent' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                user.role==='kantin' ? 'bg-teal-100 text-teal-700 border-teal-200' :
                'bg-gray-100 text-gray-700 border-gray-200'
            }`}>{user.role.replace('_',' ')}</span>
        </td><td className="p-4 text-center flex justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleEditClick(user)}><Edit className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user)}><Trash2 className="h-4 w-4 text-red-500" /></Button></td></tr>))}</tbody></table></div></CardContent>
      </Card>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
            <DialogHeader><DialogTitle>Ubah Hak Akses</DialogTitle><DialogDescription>{editingUser?.full_name}</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Pilih Role</label>
                    <Select value={newRole} onValueChange={setNewRole}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="guru" className="text-blue-600 font-bold">Guru / Staf</SelectItem>
                            <SelectItem value="parent" className="text-orange-600 font-bold">Orang Tua</SelectItem>
                            <SelectItem value="kantin" className="text-teal-600 font-bold">Warung / Kantin</SelectItem>
                            <SelectItem value="admin" className="text-green-600 font-bold">Admin</SelectItem>
                            <SelectItem value="super_admin" className="text-purple-600 font-bold">🚀 Super Admin</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {newRole === 'parent' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <label className="text-sm font-medium text-orange-700">Hubungkan dengan Santri</label>
                        <Select 
                            value={selectedSantriId || ""} 
                            onValueChange={setSelectedSantriId}
                        >
                            <SelectTrigger className="border-orange-200 bg-orange-50/50">
                                <SelectValue placeholder="Pilih Nama Santri..." />
                            </SelectTrigger>
                            <SelectContent>
                                {santriList.length > 0 ? santriList.map((santri) => (
                                    <SelectItem key={santri.id} value={santri.id}>
                                        {santri.nama_lengkap}
                                    </SelectItem>
                                )) : (
                                    <div className="p-2 text-sm text-gray-500 text-center">
                                        Data santri kosong
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">
                            Santri yang dipilih akan terhubung dengan akun ini.
                        </p>
                    </div>
                )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setEditingUser(null)}>Batal</Button>
                <Button onClick={handleUpdateRole} className="bg-green-600 hover:bg-green-700">Simpan</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
