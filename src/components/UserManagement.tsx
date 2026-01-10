import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, UserCheck, Loader2 } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'viewer';
  created_at: string;
}

const UserManagement: React.FC = () => {
  const { isAdmin, user: currentUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);

  // 🔥 FETCH DATA DARI TABEL 'users' (YANG BENAR)
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Kita ambil langsung dari tabel 'users' karena kolomnya sudah lengkap (email, full_name, role)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: "Gagal memuat data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  // 🔥 UPDATE ROLE LANGSUNG KE TABEL 'users'
  const handleRoleUpdate = async (targetUserId: string, newRole: 'admin' | 'viewer', userName: string) => {
    if (!isAdmin) {
      toast({
        title: "Akses Ditolak",
        description: "Hanya admin yang dapat mengubah role",
        variant: "destructive",
      });
      return;
    }

    // Mencegah Admin mengubah role dirinya sendiri jadi Viewer (Biar gak terkunci)
    if (targetUserId === currentUser?.id) {
        toast({
            title: "Bahaya",
            description: "Anda tidak bisa mengubah role Anda sendiri.",
            variant: "destructive",
        });
        return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', targetUserId);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: `Role ${userName} diubah menjadi ${newRole}`,
      });

      // Refresh list biar update
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Gagal Update",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!isAdmin) {
    return (
      <Card className="border-red-100 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <Shield className="h-5 w-5" />
            Akses Dibatasi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600">
            Hanya akun dengan level <strong>Admin</strong> yang dapat mengakses halaman ini.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500 uppercase">Total Pengguna</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800">
              {users.length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-green-600 uppercase">Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {users.filter(u => u.role === 'admin').length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-blue-600 uppercase">Viewer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {users.filter(u => u.role === 'viewer').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader className="border-b bg-gray-50/50">
          <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-gray-600" />
                    Daftar Pengguna
                </CardTitle>
                <CardDescription>
                    Kelola hak akses pengguna sistem
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchUsers} disabled={isLoading}>
                 {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
                {isLoading ? "Memuat data..." : "Belum ada pengguna terdaftar"}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {users.map((userData) => (
                <div
                  key={userData.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-gray-50 transition-colors gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-800">{userData.full_name || "Tanpa Nama"}</span>
                      <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full border ${
                        userData.role === 'admin' 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {userData.role}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 font-mono">
                        {userData.email}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Bergabung: {new Date(userData.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Select 
                      value={userData.role} 
                      onValueChange={(value: 'admin' | 'viewer') => 
                        handleRoleUpdate(userData.id, value, userData.full_name)
                      }
                      // Disable kalau sedang loading atau user itu adalah diri sendiri
                      disabled={isLoading || userData.id === currentUser?.id}
                    >
                      <SelectTrigger className="w-32 h-9 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
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
