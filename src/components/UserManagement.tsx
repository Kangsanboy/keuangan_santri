import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Search, 
  UserCog, 
  Trash2, 
  Link as LinkIcon, 
  UserCheck,
  Users,
  Shield,
  User
} from "lucide-react";

// Tipe data
type UserData = {
  id: string;
  email: string;
  role: string;
  created_at: string;
};

type SantriData = {
  id: number;
  nama: string;
  nis: string;
  wali_id?: string;
};

const UserManagement = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  // State untuk Filter Role via Card
  const [roleFilter, setRoleFilter] = useState<string>("all"); 
  
  const { toast } = useToast();

  // State Fitur Link Santri
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedWali, setSelectedWali] = useState<UserData | null>(null);
  const [santriList, setSantriList] = useState<SantriData[]>([]);
  const [selectedSantriId, setSelectedSantriId] = useState<string>("");
  const [linking, setLinking] = useState(false);

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (usersError) throw usersError;
      setUsers(usersData || []);

      const { data: santriData, error: santriError } = await supabase
        .from("santri")
        .select("id, nama, nis, wali_id")
        .order("nama", { ascending: true });

      if (santriError) throw santriError;
      setSantriList(santriData || []);

    } catch (error: any) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Hitung Statistik untuk Card
  const stats = {
    total: users.length,
    admin: users.filter(u => u.role === 'admin' || u.role === 'super_admin').length,
    wali: users.filter(u => u.role === 'wali_santri').length,
    others: users.filter(u => u.role !== 'admin' && u.role !== 'super_admin' && u.role !== 'wali_santri').length
  };

  // Logic Hapus User
  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Hapus user ini?")) return;
    try {
      const { error } = await supabase.from("users").delete().eq("id", userId);
      if (error) throw error;
      toast({ title: "User dihapus" });
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal", description: error.message });
    }
  };

  // Logic Link Santri
  const handleLinkSantri = async () => {
    if (!selectedWali || !selectedSantriId) return;
    setLinking(true);
    try {
      const { error } = await supabase
        .from("santri")
        .update({ wali_id: selectedWali.id })
        .eq("id", parseInt(selectedSantriId));
      if (error) throw error;
      toast({ title: "Berhasil Terhubung! 🔗" });
      setIsLinkModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal", description: error.message });
    } finally {
      setLinking(false);
    }
  };

  // Filter Data Tabel (Gabungan Search + Card Filter)
  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (roleFilter === 'all') return matchesSearch;
    if (roleFilter === 'admin') return matchesSearch && (user.role === 'admin' || user.role === 'super_admin');
    if (roleFilter === 'wali') return matchesSearch && user.role === 'wali_santri';
    if (roleFilter === 'others') return matchesSearch && (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'wali_santri');
    
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* BAGIAN 1: KARTU FILTER (TAMPILAN LAMA) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card Total */}
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${roleFilter === 'all' ? 'ring-2 ring-green-600 bg-green-50' : ''}`}
          onClick={() => setRoleFilter('all')}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <h3 className="text-2xl font-bold text-gray-800">{stats.total}</h3>
            </div>
            <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        {/* Card Admin */}
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${roleFilter === 'admin' ? 'ring-2 ring-green-600 bg-green-50' : ''}`}
          onClick={() => setRoleFilter('admin')}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Administrator</p>
              <h3 className="text-2xl font-bold text-green-700">{stats.admin}</h3>
            </div>
            <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* Card Wali Santri */}
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${roleFilter === 'wali' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
          onClick={() => setRoleFilter('wali')}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Wali Santri</p>
              <h3 className="text-2xl font-bold text-blue-700">{stats.wali}</h3>
            </div>
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* Card Lainnya */}
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${roleFilter === 'others' ? 'ring-2 ring-orange-500 bg-orange-50' : ''}`}
          onClick={() => setRoleFilter('others')}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">User Lain</p>
              <h3 className="text-2xl font-bold text-orange-700">{stats.others}</h3>
            </div>
            <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BAGIAN 2: SEARCH & TABEL */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserCog className="h-5 w-5 text-gray-500" /> 
            Data Pengguna
          </h2>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Cari user..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead>Email User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Santri Terhubung</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-gray-500">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-gray-500">
                  Tidak ada user ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.email}
                    <div className="text-[10px] text-gray-400 font-mono">ID: {user.id.substring(0, 8)}...</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      user.role === 'admin' ? 'default' : 
                      user.role === 'wali_santri' ? 'secondary' : 'outline'
                    } className={
                      user.role === 'admin' ? 'bg-green-600' :
                      user.role === 'wali_santri' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : ''
                    }>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {/* Logic Tampilan Santri */}
                    {user.role === 'wali_santri' ? (
                      (() => {
                        const linkedSantri = santriList.filter(s => s.wali_id === user.id);
                        return linkedSantri.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {linkedSantri.map(s => (
                              <Badge key={s.id} variant="outline" className="border-green-200 bg-green-50 text-green-700">
                                {s.nama}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Belum ada</span>
                        );
                      })()
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {/* TOMBOL LINK KHUSUS WALI */}
                      {user.role === 'wali_santri' && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => {
                            setSelectedWali(user);
                            setSelectedSantriId("");
                            setIsLinkModalOpen(true);
                          }}
                          title="Hubungkan Santri"
                        >
                          <LinkIcon className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* MODAL LINK SANTRI (TETAP ADA) */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hubungkan Wali ke Santri</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
              Wali: <strong>{selectedWali?.email}</strong>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Pilih Santri</label>
              <Select onValueChange={setSelectedSantriId} value={selectedSantriId}>
                <SelectTrigger>
                  <SelectValue placeholder="Cari nama santri..." />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {santriList.map((santri) => (
                    <SelectItem key={santri.id} value={santri.id.toString()}>
                      {santri.nama} ({santri.nis})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkModalOpen(false)}>Batal</Button>
            <Button onClick={handleLinkSantri} disabled={linking || !selectedSantriId} className="bg-green-700">
              {linking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
