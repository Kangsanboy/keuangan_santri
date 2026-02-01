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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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
import { 
  Loader2, 
  Search, 
  Trash2, 
  Users, 
  Shield, 
  UserCheck, 
  User,
  Link as LinkIcon 
} from "lucide-react";

// Tipe Data
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
  const [filterRole, setFilterRole] = useState("all");
  const { toast } = useToast();

  // --- STATE BARU (Untuk Fitur Hubungkan Santri) ---
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [santriList, setSantriList] = useState<SantriData[]>([]);
  const [selectedWali, setSelectedWali] = useState<UserData | null>(null);
  const [selectedSantriId, setSelectedSantriId] = useState<string>("");
  const [linking, setLinking] = useState(false);

  // Fetch Data User & Santri Sekaligus
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Ambil Data User
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (userError) throw userError;
      setUsers(userData || []);

      // 2. Ambil Data Santri (Untuk Dropdown & Display)
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

  // Hitung Statistik untuk Card Filter
  const stats = {
    total: users.length,
    admin: users.filter((u) => u.role === "admin" || u.role === "super_admin").length,
    wali: users.filter((u) => u.role === "wali_santri").length,
    others: users.filter((u) => u.role !== "admin" && u.role !== "super_admin" && u.role !== "wali_santri").length,
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus user ini?")) return;
    try {
      const { error } = await supabase.from("users").delete().eq("id", userId);
      if (error) throw error;
      toast({ title: "User berhasil dihapus" });
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal", description: error.message });
    }
  };

  // --- FUNGSI BARU: Simpan Link Santri ---
  const handleLinkSantri = async () => {
    if (!selectedWali || !selectedSantriId) return;
    setLinking(true);

    try {
      const { error } = await supabase
        .from("santri")
        .update({ wali_id: selectedWali.id }) // Update kolom wali_id di tabel santri
        .eq("id", parseInt(selectedSantriId));

      if (error) throw error;

      toast({ 
        title: "Berhasil Terhubung! 🔗", 
        description: `Santri berhasil dihubungkan ke akun ${selectedWali.email}` 
      });
      
      setIsLinkModalOpen(false);
      fetchData(); // Refresh biar datanya update di tabel
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal", description: error.message });
    } finally {
      setLinking(false);
    }
  };

  // Filter Logic (Search + Card Filter)
  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole =
      filterRole === "all"
        ? true
        : filterRole === "admin"
        ? user.role === "admin" || user.role === "super_admin"
        : filterRole === "wali"
        ? user.role === "wali_santri"
        : user.role !== "admin" && user.role !== "super_admin" && user.role !== "wali_santri";

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* --- BAGIAN CARD FILTER (PERSIS KODE LAMA) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            filterRole === "all" ? "ring-2 ring-primary bg-primary/5" : ""
          }`}
          onClick={() => setFilterRole("all")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Users</p>
              <h3 className="text-2xl font-bold">{stats.total}</h3>
            </div>
            <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        {/* Administrator */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            filterRole === "admin" ? "ring-2 ring-green-600 bg-green-50" : ""
          }`}
          onClick={() => setFilterRole("admin")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Administrator</p>
              <h3 className="text-2xl font-bold text-green-700">{stats.admin}</h3>
            </div>
            <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* Wali Santri */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            filterRole === "wali" ? "ring-2 ring-blue-500 bg-blue-50" : ""
          }`}
          onClick={() => setFilterRole("wali")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Wali Santri</p>
              <h3 className="text-2xl font-bold text-blue-700">{stats.wali}</h3>
            </div>
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* User Lain */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            filterRole === "others" ? "ring-2 ring-orange-500 bg-orange-50" : ""
          }`}
          onClick={() => setFilterRole("others")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">User Lain</p>
              <h3 className="text-2xl font-bold text-orange-700">{stats.others}</h3>
            </div>
            <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- BAGIAN TABEL USER --- */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Daftar Pengguna</h2>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari email..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              {/* Tambahan Kolom */}
              <TableHead>Santri Terhubung</TableHead> 
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Memuat data...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Tidak ada user ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.email}
                    <div className="text-xs text-muted-foreground">Created: {new Date(user.created_at).toLocaleDateString()}</div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.role === "admin"
                          ? "default"
                          : user.role === "wali_santri"
                          ? "secondary"
                          : "outline"
                      }
                      className={
                        user.role === "admin" ? "bg-green-600" :
                        user.role === "wali_santri" ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : ""
                      }
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  {/* KOLOM SANTRI TERHUBUNG */}
                  <TableCell>
                    {user.role === 'wali_santri' ? (
                      (() => {
                        // Cari santri yang wali_id nya sama dengan ID user ini
                        const linked = santriList.filter(s => s.wali_id === user.id);
                        return linked.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {linked.map(s => (
                              <Badge key={s.id} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                {s.nama}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Belum ada link</span>
                        )
                      })()
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {/* TOMBOL LINK (Hanya muncul untuk Wali Santri) */}
                      {user.role === 'wali_santri' && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-blue-600 border-blue-200 hover:bg-blue-50"
                          title="Hubungkan ke Santri"
                          onClick={() => {
                            setSelectedWali(user);
                            setSelectedSantriId("");
                            setIsLinkModalOpen(true);
                          }}
                        >
                          <LinkIcon className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
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

      {/* --- MODAL POPUP HUBUNGKAN SANTRI --- */}
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
                      {santri.wali_id ? " - Sudah ada Wali" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                *Data santri diambil dari database santri.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkModalOpen(false)}>Batal</Button>
            <Button onClick={handleLinkSantri} disabled={linking || !selectedSantriId} className="bg-green-700 hover:bg-green-800">
              {linking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
              Simpan Hubungan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default UserManagement;
