import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, FileSpreadsheet, Download, Upload, Pencil, BookOpen, GraduationCap, Users
} from 'lucide-react';

interface SantriClass {
  id: string;
  nis: string;
  nama_lengkap: string;
  gender: string;
  kelas: number;
  rombel: string;
  kelas_mengaji: number;
  rombel_mengaji: string;
}

const ClassManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [santris, setSantris] = useState<SantriClass[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("sekolah");
  const [filterKelas, setFilterKelas] = useState("all");

  // State Import
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // State Edit Satuan
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState<SantriClass | null>(null);

  const fetchSantris = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('santri_2025_12_01_21_34')
        .select('id, nis, nama_lengkap, gender, kelas, rombel, kelas_mengaji, rombel_mengaji')
        .eq('status', 'aktif')
        .order('kelas')
        .order('nama_lengkap');
      
      if (error) throw error;
      setSantris(data || []);
    } catch (err: any) {
      toast({ title: "Gagal memuat data", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSantris();
  }, []);

  /* ================= FITUR EXCEL ================= */
  // Download Template berisi seluruh data santri
  const downloadTemplate = () => {
    if (santris.length === 0) {
        return toast({ title: "Data kosong", description: "Belum ada data santri untuk didownload.", variant: "destructive" });
    }

    const headers = "ID_SISTEM,NIS,NAMA_SANTRI,KELAS_SEKOLAH,ROMBEL_SEKOLAH,KELAS_MENGAJI,ROMBEL_MENGAJI\n";
    const rows = santris.map(s => 
        `${s.id},${s.nis || '-'},${s.nama_lengkap},${s.kelas},${s.rombel || 'A'},${s.kelas_mengaji || s.kelas},${s.rombel_mengaji || 'A'}`
    ).join("\n");
    
    const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Update_Kelas_Santri.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async () => {
    if (!importFile) return toast({ title: "Pilih file", description: "Upload file CSV terlebih dahulu.", variant: "destructive" });

    setIsUploading(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            const text = e.target?.result as string;
            const rows = text.split('\n').map(row => row.trim()).filter(row => row !== '');
            if (rows.length < 2) throw new Error("File kosong atau format salah.");

            // Lakukan update satu per satu secara paralel agar cepat
            const updatePromises = [];
            
            for (let i = 1; i < rows.length; i++) {
                const cols = rows[i].split(',');
                if (cols.length < 7) continue;

                const id_sistem = cols[0];
                const k_sekolah = parseInt(cols[3]) || 7;
                const r_sekolah = cols[4] || 'A';
                const k_mengaji = parseInt(cols[5]) || 7;
                const r_mengaji = cols[6] || 'A';

                // Skip header atau data tidak valid
                if (id_sistem === 'ID_SISTEM' || !id_sistem) continue;

                const updateQuery = supabase
                    .from('santri_2025_12_01_21_34')
                    .update({
                        kelas: k_sekolah,
                        rombel: r_sekolah,
                        kelas_mengaji: k_mengaji,
                        rombel_mengaji: r_mengaji
                    })
                    .eq('id', id_sistem);
                
                updatePromises.push(updateQuery);
            }

            await Promise.all(updatePromises);
            
            toast({ title: "Sukses Update 🎉", description: `Berhasil memperbarui kelas & rombel santri.`, className: "bg-green-600 text-white" });
            setIsImportOpen(false);
            setImportFile(null);
            fetchSantris();
            
        } catch (err: any) {
            toast({ title: "Gagal Update", description: err.message, variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };
    reader.readAsText(importFile);
  };

  /* ================= FITUR EDIT MANUAL ================= */
  const handleEditSave = async () => {
      if (!editData) return;
      try {
          const { error } = await supabase
            .from('santri_2025_12_01_21_34')
            .update({
                kelas: editData.kelas,
                rombel: editData.rombel,
                kelas_mengaji: editData.kelas_mengaji,
                rombel_mengaji: editData.rombel_mengaji
            })
            .eq('id', editData.id);
          
          if (error) throw error;
          toast({ title: "Berhasil", description: "Kelas santri diperbarui." });
          setIsEditOpen(false);
          fetchSantris();
      } catch (err: any) {
          toast({ title: "Gagal", description: err.message, variant: "destructive" });
      }
  };

  /* ================= RENDER ================= */
  const filteredSantris = santris.filter(s => {
      const matchName = s.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase());
      const matchKelas = filterKelas === "all" ? true : 
                         activeTab === 'sekolah' ? s.kelas === parseInt(filterKelas) : s.kelas_mengaji === parseInt(filterKelas);
      return matchName && matchKelas;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-green-100">
        <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="text-green-600" /> Manajemen Kelas & Rombel
            </h1>
            <p className="text-xs text-gray-500">Atur pemisahan kelas formal (sekolah) dan diniyah (mengaji).</p>
        </div>
        <Button onClick={() => setIsImportOpen(true)} className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto shadow-sm">
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Import Update Massal
        </Button>
      </div>

      <Card className="shadow-sm border-t-4 border-t-green-600">
          <CardHeader className="bg-white border-b border-gray-100 pb-0 pt-4">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                 <Tabs defaultValue="sekolah" value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                    <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1">
                        <TabsTrigger value="sekolah" className="data-[state=active]:bg-green-600 data-[state=active]:text-white text-xs font-bold gap-2">
                            <GraduationCap size={14}/> Kelas Sekolah
                        </TabsTrigger>
                        <TabsTrigger value="mengaji" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs font-bold gap-2">
                            <BookOpen size={14}/> Kelas Mengaji
                        </TabsTrigger>
                    </TabsList>
                 </Tabs>

                 <div className="flex w-full md:w-auto gap-2">
                     <Select value={filterKelas} onValueChange={setFilterKelas}>
                         <SelectTrigger className="w-[130px] h-9 text-xs font-bold"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
                         <SelectContent>
                             <SelectItem value="all">Semua Kelas</SelectItem>
                             {[7,8,9,10,11,12].map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}
                         </SelectContent>
                     </Select>
                     <div className="relative flex-1 md:w-48">
                         <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                         <Input placeholder="Cari nama..." className="pl-9 h-9 text-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                     </div>
                 </div>
              </div>
          </CardHeader>
          <CardContent className="p-0">
             <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                     <thead className={`font-semibold border-b ${activeTab === 'sekolah' ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'}`}>
                         <tr>
                             <th className="p-4 w-12 text-center">No</th>
                             <th className="p-4 w-24">NIS</th>
                             <th className="p-4 min-w-[200px]">Nama Lengkap</th>
                             <th className="p-4 text-center">Kelas {activeTab === 'sekolah' ? 'Sekolah' : 'Mengaji'}</th>
                             <th className="p-4 text-center">Rombel</th>
                             <th className="p-4 text-center w-20">Aksi</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                         {loading ? (
                             <tr><td colSpan={6} className="p-8 text-center text-gray-500">Memuat data...</td></tr>
                         ) : filteredSantris.length === 0 ? (
                             <tr><td colSpan={6} className="p-8 text-center text-gray-400 italic">Tidak ada santri ditemukan.</td></tr>
                         ) : (
                             filteredSantris.map((s, idx) => (
                                 <tr key={s.id} className="hover:bg-gray-50 transition-colors group">
                                     <td className="p-4 text-center text-gray-500">{idx + 1}</td>
                                     <td className="p-4 font-mono text-gray-500 text-xs">{s.nis || '-'}</td>
                                     <td className="p-4 font-bold text-gray-800">{s.nama_lengkap}</td>
                                     <td className="p-4 text-center">
                                         <span className="bg-gray-100 px-3 py-1 rounded text-xs font-bold border">
                                             {activeTab === 'sekolah' ? s.kelas : (s.kelas_mengaji || s.kelas)}
                                         </span>
                                     </td>
                                     <td className="p-4 text-center">
                                         <span className={`px-3 py-1 rounded text-xs font-bold border ${activeTab === 'sekolah' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                             {activeTab === 'sekolah' ? (s.rombel || 'A') : (s.rombel_mengaji || 'A')}
                                         </span>
                                     </td>
                                     <td className="p-4 text-center">
                                         <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-500 hover:bg-orange-50 opacity-50 group-hover:opacity-100" onClick={() => { setEditData(s); setIsEditOpen(true); }}>
                                             <Pencil size={14} />
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

      {/* DIALOG IMPORT */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
          <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="text-blue-600"/> Import Update Kelas</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                      <strong>Cara Praktis Update Massal:</strong><br/>
                      1. Klik tombol download di bawah untuk mengunduh data santri saat ini.<br/>
                      2. Buka di Excel, lalu ubah angka/huruf di kolom kelas dan rombel.<br/>
                      3. <span className="text-red-600 font-bold">JANGAN UBAH</span> tulisan di kolom `ID_SISTEM`.<br/>
                      4. Save file-nya, lalu upload kembali ke sini.
                  </div>
                  <Button onClick={downloadTemplate} variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-100">
                      <Download className="w-4 h-4 mr-2" /> 1. Download Data Saat Ini (Template)
                  </Button>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors mt-2">
                      <label className="text-xs font-bold text-gray-500 mb-2 block">2. Upload File CSV yang sudah diedit</label>
                      <Input type="file" accept=".csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="text-xs file:bg-blue-50 file:text-blue-700 cursor-pointer" />
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsImportOpen(false)}>Batal</Button>
                  <Button onClick={handleImport} disabled={!importFile || isUploading} className="bg-blue-600 hover:bg-blue-700">
                      {isUploading ? "Memproses..." : <><Upload className="w-4 h-4 mr-2"/> 3. Mulai Update</>}
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* DIALOG EDIT MANUAL */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Edit Kelas & Rombel</DialogTitle></DialogHeader>
              {editData && (
                  <div className="space-y-4 py-4">
                      <div className="p-3 bg-gray-50 rounded-lg border text-sm">
                          <span className="font-bold text-gray-800">{editData.nama_lengkap}</span> <span className="text-gray-500">({editData.nis})</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 border p-3 rounded-lg bg-green-50/30">
                          <div className="col-span-2 text-xs font-bold text-green-700 mb-1">Pendidikan Formal (Sekolah)</div>
                          <div className="space-y-1"><label className="text-xs font-bold">Kelas</label><Select value={String(editData.kelas)} onValueChange={v => setEditData({...editData, kelas: parseInt(v)})}> <SelectTrigger className="bg-white h-8"><SelectValue /></SelectTrigger><SelectContent>{[7,8,9,10,11,12].map(k => <SelectItem key={k} value={String(k)}>{k}</SelectItem>)}</SelectContent></Select></div>
                          <div className="space-y-1"><label className="text-xs font-bold">Rombel</label><Select value={editData.rombel || 'A'} onValueChange={v => setEditData({...editData, rombel: v})}><SelectTrigger className="bg-white h-8"><SelectValue /></SelectTrigger><SelectContent>{['A','B','C','D','E'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 border p-3 rounded-lg bg-blue-50/30">
                          <div className="col-span-2 text-xs font-bold text-blue-700 mb-1">Pendidikan Diniyah (Mengaji)</div>
                          <div className="space-y-1"><label className="text-xs font-bold">Kelas</label><Select value={String(editData.kelas_mengaji || editData.kelas)} onValueChange={v => setEditData({...editData, kelas_mengaji: parseInt(v)})}> <SelectTrigger className="bg-white h-8"><SelectValue /></SelectTrigger><SelectContent>{[7,8,9,10,11,12].map(k => <SelectItem key={k} value={String(k)}>{k}</SelectItem>)}</SelectContent></Select></div>
                          <div className="space-y-1"><label className="text-xs font-bold">Rombel</label><Select value={editData.rombel_mengaji || editData.rombel || 'A'} onValueChange={v => setEditData({...editData, rombel_mengaji: v})}><SelectTrigger className="bg-white h-8"><SelectValue /></SelectTrigger><SelectContent>{['A','B','C','D','E'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
                      </div>
                  </div>
              )}
              <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Batal</Button>
                  <Button onClick={handleEditSave} className="bg-green-600 hover:bg-green-700">Simpan Perubahan</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassManagement;
