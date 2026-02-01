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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  UserCheck 
} from "lucide-react";

// Tipe data User
type UserData = {
  id: string;
  email: string;
  role: string;
  created_at: string;
  nama_lengkap?: string; // Optional metadata
};

// Tipe data Santri (untuk dropdown)
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
  const { toast } = useToast();

  // State untuk fitur Hubungkan Santri
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedWali, setSelectedWali] = useState<UserData | null>(null);
  const [santriList, setSantriList] = useState<SantriData[]>([]);
  const [selectedSantriId, setSelectedSantriId] = useState<string>("");
  const [linking, setLinking] = useState(false);

  // 1. Fetch Data User
  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Ambil data dari tabel users (metadata) atau auth custom table
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Data Santri (Untuk Pilihan di Modal)
  const fetchSantriList = async () => {
    try {
      const { data, error } = await supabase
        .from("santri")
        .select("id, nama, nis, wali_id")
        .order("nama", { ascending: true });
      
      if (error) throw error;
      setSantriList(data || []);
    } catch (error) {
      console.error("Gagal ambil data santri", error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchSantriList(); // Load data santri di awal
  }, []);

  // 3. Fungsi Hapus User
  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Apakah anda yakin ingin menghapus user ini?")) return;
    
    try {
      // Hapus dari tabel users public
      const { error } = await supabase.from("users").delete().eq("id", userId);
      if (error) throw error;
      
      // Catatan: Menghapus user dari Auth Supabase butuh Admin API (Edge Function),
      // Di sini kita hanya hapus data profil publiknya dulu.
      
      toast({ title: "User dihapus", description: "Data user berhasil dihapus dari database." });
      fetchUsers();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal", description: error.message });
    }
  };

  // 4. Fungsi Buka Modal Link Santri
  const openLinkModal = (user: UserData) => {
    setSelectedWali(user);
    setSelectedSantriId(""); // Reset pilihan
    setIsLinkModalOpen(true);
  };

  // 5. Fungsi Simpan Hubungan (Wali -> Santri)
  const handleLinkSantri = async () => {
    if (!selectedWali || !selectedSantriId) {
      toast({ variant: "destructive", title: "Pilih Santri dulu!" });
      return;
    }

    setLinking(true);
    try {
      // Update tabel santri: Set kolom wali_id dengan ID user yang dipilih
      const { error } = await supabase
        .from("santri")
        .update({ wali_id: selectedWali.id })
        .eq("id", parseInt(selectedSantriId));

      if (error) throw error;

      toast({ 
        title: "Berhasil Terhubung! 🔗", 
        description: `Akun ${selectedWali.email} sekarang terhubung dengan santri.` 
      });
      
      setIsLinkModalOpen(false);
      fetchSantriList(); // Refresh data santri biar kelihatan updatenya
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal Menghubungkan", description: error.message });
    } finally {
      setLinking(false);
    }
  };

  // Filter Search
  const filteredUsers = users.filter((user) =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <h2 className="text-xl font-bold flex items-center gap-2 text-green-800">
          <UserCog className="h-6 w-6" /> Manajemen Pengguna
        </h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cari email atau role..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-green-50">
            <TableRow>
              <TableHead>Email User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status Santri</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <div className="flex justify-center items-center gap-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Memuat data user...
                  </div>
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
                    <div className="text-xs text-gray-400">ID: {user.id.substring(0, 8)}...</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      user.role === 'admin' ? 'default' : 
                      user.role === 'wali_santri' ? 'secondary' : 'outline'
                    } className={
                      user.role === 'admin' ? 'bg-green-600' :
                      user.role === 'wali_santri' ? 'bg-blue-100 text-blue-700' : ''
                    }>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {/* Logika Cek Status Koneksi Santri */}
                    {user.role === 'wali_santri' ? (
                      (() => {
                        // Cari santri yang punya wali_id user ini
                        const linkedSantri = santriList.filter(s => s.wali_id === user.id);
                        return linkedSantri.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {linkedSantri.map(s => (
                              <Badge key={s.id} variant="outline" className="w-fit border-green-200 text-green-700 bg-green-50">
                                <UserCheck className="w-3 h-3 mr-1" /> {s.nama}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Belum terhubung</span>
                        );
                      })()
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {/* TOMBOL KHUSUS WALI SANTRI */}
                      {user.role === 'wali_santri' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => openLinkModal(user)}
                          title="Hubungkan ke Santri"
                        >
                          <LinkIcon className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
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

      {/* MODAL / POPUP HUBUNGKAN SANTRI */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hubungkan Wali Santri</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800">
              Menghubungkan akun <strong>{selectedWali?.email}</strong> dengan data santri.
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
              <p className="text-xs text-gray-500">
                *Santri yang sudah punya wali akan dipindahkan ke wali ini jika dipilih.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkModalOpen(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleLinkSantri} 
              disabled={linking || !selectedSantriId}
              className="bg-green-700 hover:bg-green-800"
            >
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
