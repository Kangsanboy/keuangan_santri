import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  User, Plus, Save, Trash2, Search, IdCard, CheckCircle, XCircle 
} from "lucide-react";

interface Teacher {
  id: number;
  full_name: string;
  nip: string;
  rfid_uid: string;
  gender: "L" | "P";
  is_active: boolean;
}

const TeacherManagement = () => {
  const { toast } = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // State Form
  const [formData, setFormData] = useState({
    full_name: "",
    nip: "",
    rfid_uid: "",
    gender: "L",
  });

  // 1. Ambil Data Guru dari Supabase
  const fetchTeachers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("teachers")
      .select("*")
      .order("full_name", { ascending: true });

    if (error) {
      toast({ title: "Error", description: "Gagal memuat data guru", variant: "destructive" });
    } else {
      setTeachers(data as any[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  // 2. Simpan Guru Baru
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.rfid_uid) {
      toast({ title: "Gagal", description: "Nama dan RFID wajib diisi!", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("teachers").insert([{
      full_name: formData.full_name,
      nip: formData.nip,
      rfid_uid: formData.rfid_uid,
      gender: formData.gender,
      is_active: true
    }]);

    if (error) {
      // Biasanya error karena RFID duplikat
      toast({ title: "Gagal Simpan", description: error.message.includes("unique") ? "Kartu RFID ini sudah dipakai guru lain!" : error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Data Guru ditambahkan" });
      setShowModal(false);
      setFormData({ full_name: "", nip: "", rfid_uid: "", gender: "L" }); // Reset form
      fetchTeachers(); // Refresh tabel
    }
  };

  // 3. Hapus Guru
  const handleDelete = async (id: number) => {
    if(!window.confirm("Yakin hapus guru ini? Jadwal beliau akan jadi kosong loh.")) return;

    const { error } = await supabase.from("teachers").delete().eq("id", id);
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Terhapus", description: "Data guru dihapus" });
      fetchTeachers();
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in zoom-in duration-300">
      
      {/* HEADER */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full text-green-700">
                <User size={24} />
            </div>
            <div>
                <h2 className="text-lg font-bold text-gray-800">Manajemen Guru</h2>
                <p className="text-xs text-gray-500">Kelola data pengajar & kartu akses</p>
            </div>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-green-700 hover:bg-green-800">
          <Plus className="mr-2 h-4 w-4" /> Tambah Guru
        </Button>
      </div>

      {/* TABEL DATA */}
      <Card className="border-green-200 bg-white shadow-sm">
        <CardHeader className="bg-gray-50 border-b pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">Daftar Guru Terdaftar</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3">Nama Lengkap</th>
                  <th className="px-6 py-3">NIP</th>
                  <th className="px-6 py-3">L/P</th>
                  <th className="px-6 py-3">Status Kartu</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => (
                  <tr key={t.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{t.full_name}</td>
                    <td className="px-6 py-4">{t.nip || "-"}</td>
                    <td className="px-6 py-4">{t.gender}</td>
                    <td className="px-6 py-4">
                        {t.rfid_uid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle size={10} /> Terhubung
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <XCircle size={10} /> Belum Ada
                            </span>
                        )}
                    </td>
                    <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                            <Trash2 size={16} />
                        </Button>
                    </td>
                  </tr>
                ))}
                {teachers.length === 0 && !isLoading && (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-500">Belum ada data guru.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL TAMBAH (Manual pake Tailwind biar simpel) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-green-700 p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold flex items-center gap-2"><IdCard size={20}/> Tambah Guru Baru</h3>
                    <button onClick={() => setShowModal(false)} className="hover:bg-green-600 rounded-full p-1"><XCircle size={20}/></button>
                </div>
                <form onSubmit={handleSave} className="p-6 space-y-4">
                    
                    {/* Input Nama */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                        <input 
                            type="text" required 
                            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-green-500 outline-none"
                            placeholder="Contoh: Budi Santoso, S.Pd"
                            value={formData.full_name}
                            onChange={e => setFormData({...formData, full_name: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Input NIP */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">NIP (Opsional)</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-green-500 outline-none"
                                value={formData.nip}
                                onChange={e => setFormData({...formData, nip: e.target.value})}
                            />
                        </div>
                        {/* Input Gender */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
                            <select 
                                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-green-500 outline-none"
                                value={formData.gender}
                                onChange={e => setFormData({...formData, gender: e.target.value as "L" | "P"})}
                            >
                                <option value="L">Laki-laki</option>
                                <option value="P">Perempuan</option>
                            </select>
                        </div>
                    </div>

                    {/* Input RFID - AREA PENTING */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <label className="block text-sm font-bold text-yellow-800 mb-1 flex items-center gap-2">
                            <ScanBarcode size={16}/> Scan Kartu Disini
                        </label>
                        <input 
                            type="text" required autoFocus
                            className="w-full p-2 border border-yellow-300 rounded-md focus:ring-2 focus:ring-yellow-500 outline-none text-center font-mono font-bold tracking-widest"
                            placeholder="Klik disini lalu tempel kartu..."
                            value={formData.rfid_uid}
                            onChange={e => setFormData({...formData, rfid_uid: e.target.value})}
                        />
                        <p className="text-[10px] text-yellow-700 mt-1">*Pastikan kursor aktif di kotak ini saat menempelkan kartu.</p>
                    </div>

                    <Button type="submit" className="w-full bg-green-700 hover:bg-green-800 mt-2">
                        <Save className="mr-2 h-4 w-4"/> Simpan Data
                    </Button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default TeacherManagement;
