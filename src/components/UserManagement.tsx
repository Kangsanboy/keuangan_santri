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
import { User, Shield, Users, Edit, Search, Rocket, Trash2, XCircle } from "lucide-react";

interface AppUser {
  id: string; email: string; role: "super_admin" | "admin" | "viewer" | "parent" | "pending"; full_name: string;
}

const UserManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // 🔥 STATE BARU: FILTER ROLE
  const [filterRole, setFilterRole] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [newRole, setNewRole] = useState<string>("viewer");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      // @ts-ignore
      setUsers(data || []);
    } catch (error: any) {
      toast({ title: "Gagal memuat user", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleUpdateRole = async () => {
    if (!editingUser) return;
    try {
      const { error } = await supabase.from('users').update({ role: newRole }).eq('id', editingUser.id);
      if (error) throw error;
      toast({ title: "Berhasil", description: `Role ${editingUser.full_name} diubah menjadi ${newRole}.` });
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  };

  // 🔥 FITUR HAPUS USER
  const handleDeleteUser = async (user: AppUser) => {
    if (!window.confirm(`Yakin ingin menghapus user "${user.full_name}"? Akses login mereka akan dicabut.`)) return;
    
    try {
      const { error } = await supabase.from('users').delete().eq('id', user.id);
      if (error) throw error;
      toast({ title: "Terhapus", description: "User berhasil dihapus." });
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Gagal", description: "Tidak bisa menghapus: " + error.message, variant: "destructive" });
    }
  };

  // 🔥 LOGIC FILTERING
  // Klik kartu -> Set filter. Klik kartu yang sama -> Hapus filter (Toggle).
  const toggleFilter = (role: string) => {
    if (filterRole === role) {
        setFilterRole(null); // Reset
    } else {
        setFilterRole(role); // Set
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole ? u.role === filterRole : true;
    return matchesSearch && matchesRole;
  });

  // Statistik
  const superAdminCount = users.filter(u => u.role === 'super_admin').length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const viewerCount = users.filter(u => u.role === 'viewer').length;
  const pendingCount = users.filter(u => u.role === 'pending').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* HEADER STATISTIK (CLICKABLE) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* 1. SUPER ADMIN */}
        <Card 
            onClick={() => toggleFilter('super_admin')}
            className={`cursor-pointer transition-all hover:shadow-md bg-purple-50 border-purple-200 
                ${filterRole === 'super_admin' ? 'ring-2 ring-purple-500 ring-offset-2' : ''}`}
        >
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Super Admin</CardTitle>
            <Rocket className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-purple-900">{superAdminCount}</div>
            <p className="text-xs text-purple-600 mt-1">{filterRole === 'super_admin' ? 'Sedang Ditampilkan' : 'Akses Penuh'}</p>
          </CardContent>
        </Card>

        {/* 2. ADMIN */}
        <Card 
            onClick={() => toggleFilter('admin')}
            className={`cursor-pointer transition-all hover:shadow-md bg-green-50 border-green-200 
                ${filterRole === 'admin' ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}
        >
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Admin</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-green-900">{adminCount}</div>
            <p className="text-xs text-green-600 mt-1">{filterRole === 'admin' ? 'Sedang Ditampilkan' : 'Pengelola'}</p>
          </CardContent>
        </Card>

        {/* 3. VIEWER / PARENT */}
        <Card 
            onClick={() => toggleFilter('viewer')}
            className={`cursor-pointer transition-all hover:shadow-md bg-blue-50 border-blue-200 
                ${filterRole === 'viewer' ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
        >
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Viewer</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-blue-900">{viewerCount}</div>
            <p className="text-xs text-blue-600 mt-1">{filterRole === 'viewer' ? 'Sedang Ditampilkan' : 'Hanya Lihat'}</p>
          </CardContent>
        </Card>

        {/* 4. PENDING */}
        <Card 
            onClick={() => toggleFilter('pending')}
            className={`cursor-pointer transition-all hover:shadow-md bg-yellow-50 border-yellow-200 
                ${filterRole === 'pending' ? 'ring-2 ring-yellow-500 ring-offset-2' : ''}`}
        >
          <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700">Pending</CardTitle>
            <div className="relative">
                <User className="h-4 w-4 text-yellow-600" />
                {pendingCount > 0 && <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-ping" />}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-yellow-900">{pendingCount}</div>
            <p className="text-xs text-yellow-600 mt-1">{filterRole === 'pending' ? 'Sedang Ditampilkan' : 'Butuh Verifikasi'}</p>
          </CardContent>
        </Card>
      </div>

      {/* FILTER INDICATOR (Muncul kalau ada filter aktif) */}
      {filterRole && (
          <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-md border border-gray-200 text-sm text-gray-600 animate-in fade-in">
              <span>Menampilkan filter: <strong>{filterRole.replace('_', ' ').toUpperCase()}</strong></span>
              <button onClick={() => setFilterRole(null)} className="ml-auto text-red-500 hover:text-red-700 flex items-center gap-1 font-bold">
                  <XCircle className="w-4 h-4" /> Reset
              </button>
          </div>
      )}

      {/* TABEL USER */}
      <Card className="border-green-100 shadow-sm bg-white">
        <CardHeader className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50 border-b border-gray-100 pb-4">
          <div><CardTitle>Manajemen Pengguna</CardTitle><p className="text-sm text-gray-500">Kelola hak akses aplikasi.</p></div>
          <div className="relative w-full md:w-64"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" /><Input placeholder="Cari user..." className="pl-9 h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                        <tr><th className="p-4">Nama Lengkap</th><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4 text-center">Aksi</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredUsers.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-400 italic">Tidak ada user ditemukan.</td></tr>
                        ) : (
                            filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="p-4 font-bold text-gray-800">{user.full_name}</td>
                                    <td className="p-4 text-gray-600">{user.email}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold border uppercase
                                            ${user.role === 'super_admin' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                            user.role === 'admin' ? 'bg-green-100 text-green-700 border-green-200' :
                                            user.role === 'parent' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                            user.role === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 animate-pulse' :
                                            'bg-blue-100 text-blue-700 border-blue-200'
                                            }`}>
                                            {user.role.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center flex items-center justify-center gap-2">
                                        <Button variant="outline" size="sm" onClick={() => { setEditingUser(user); setNewRole(user.role); }}>
                                            <Edit className="h-4 w-4 mr-2" /> Edit Role
                                        </Button>
                                        
                                        {/* 🔥 TOMBOL HAPUS */}
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteUser(user)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </CardContent>
      </Card>

      {/* DIALOG EDIT ROLE */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Ubah Hak Akses</DialogTitle>
                <DialogDescription>Mengubah role untuk <strong>{editingUser?.full_name}</strong></DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Pilih Role</label>
                    <Select value={newRole} onValueChange={setNewRole}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending">Pending (Tahan)</SelectItem>
                            <SelectItem value="viewer">Viewer (Hanya Lihat)</SelectItem>
                            <SelectItem value="parent">Orang Tua (Lihat Anak Saja)</SelectItem>
                            <SelectItem value="admin">Admin (Kelola Data)</SelectItem>
                            <SelectItem value="super_admin" className="text-purple-600 font-bold">🚀 Super Admin (Dewa)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setEditingUser(null)}>Batal</Button>
                <Button onClick={handleUpdateRole} className="bg-green-600 hover:bg-green-700">Simpan Perubahan</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
