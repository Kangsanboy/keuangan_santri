import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { 
  UserPlus, Search, Pencil, Trash2, Users, ArrowUpCircle, 
  AlertTriangle, ArrowLeft, GraduationCap, User, UserCheck, ScanBarcode, CreditCard, Upload, Download, FileSpreadsheet
} from 'lucide-react';

/* ================= TYPES ================= */
interface TransactionHistory {
  amount: number;
  type: 'income' | 'expense';
  date: string;
}

interface SantriSaldo {
  id: string; nama_lengkap: string; nis: string; kelas: number;
  rombel: string; 
  kelas_mengaji?: number;
  rombel_mengaji?: string;
  gender: "ikhwan" | "akhwat"; saldo: number; status: string;
  nama_wali: string; 
  rfid_card_id: string | null;
  recent_trx: TransactionHistory[];
}

interface SantriManagementProps {
  kelas?: string | null;
  onSelectSantri?: (id: string) => void; 
}

interface ClassSummary {
  kelas: number; count: number; totalSaldo: number;
}

const SantriManagement = ({ kelas: initialKelas, onSelectSantri }: SantriManagementProps) => {
  const { toast } = useToast();
  
  // State Navigasi & Data
  const [activeKelas, setActiveKelas] = useState<number | null>(initialKelas ? parseInt(initialKelas) : null);
  const [santris, setSantris] = useState<SantriSaldo[]>([]);
  const [classSummaries, setClassSummaries] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Tab Gender
  const [activeTab, setActiveTab] = useState<"ikhwan" | "akhwat">("ikhwan");

  // State Dialog Form Manual
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<SantriSaldo>>({
    gender: 'ikhwan', status: 'aktif', kelas: 7, rombel: 'A', rfid_card_id: ''
  });

  // 🔥 State Dialog Import Excel
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  /* FETCH DATA */
  const fetchSummaries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('view_santri_saldo').select('kelas, saldo');
      if (error) throw error;
      if (data) {
        const summaries: ClassSummary[] = [];
        const classes = [7, 8, 9, 10, 11, 12]; 
        classes.forEach(k => {
          const filtered = data.filter(d => d.kelas === k);
          const total = filtered.reduce((acc, curr) => acc + (curr.saldo || 0), 0);
          summaries.push({ kelas: k, count: filtered.length, totalSaldo: total });
        });
        setClassSummaries(summaries);
      }
    } catch (error: any) { console.error("Error summary:", error); } finally { setLoading(false); }
  };

  const fetchSantrisInClass = async () => {
    if (activeKelas === null) return;
    setLoading(true);
    try {
      // 1. Tarik data utama santri yang udah ada kelas_mengaji nya
      const { data: baseData, error } = await supabase.from('santri_2025_12_01_21_34')
        .select('*')
        .eq('kelas', activeKelas)
        .order('rombel', { ascending: true }) 
        .order('nama_lengkap', { ascending: true });
        
      if (error) throw error;

      // 2. Tarik data saldo dari view
      const { data: saldoData } = await supabase.from('view_santri_saldo')
        .select('id, saldo')
        .eq('kelas', activeKelas);

      // 3. Gabungkan datanya (Merge)
      const mergedData = baseData?.map(santri => {
          const matchSaldo = saldoData?.find(s => s.id === santri.id);
          return {
              ...santri,
              saldo: matchSaldo?.saldo || 0
          };
      });

      // @ts-ignore
      setSantris(mergedData || []);
    } catch (error: any) { 
      toast({ title: "Error", description: error.message, variant: "destructive" }); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { activeKelas === null ? fetchSummaries() : fetchSantrisInClass(); }, [activeKelas]);

  /* CRUD & ACTIONS */
  const handleNaikKelasMassal = async () => {
    setLoading(true);
    try {
        const { error } = await supabase.rpc('naik_kelas_massal');
        if (error) throw error;
        toast({ title: "Sukses! 🎓", description: "Naik kelas berhasil.", duration: 5000 });
        fetchSummaries();
    } catch (error: any) { toast({ title: "Gagal", description: error.message, variant: "destructive" }); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { 
          nama_lengkap: formData.nama_lengkap, 
          nis: formData.nis, 
          kelas: formData.kelas,
          rombel: formData.rombel || 'A', 
          gender: formData.gender, 
          nama_wali: formData.nama_wali, 
          status: formData.status,
          rfid_card_id: formData.rfid_card_id || null
      };

      if (isEditMode && formData.id) {
        const { error } = await supabase.from('santri_2025_12_01_21_34').update(payload).eq('id', formData.id);
        if (error) throw error; toast({ title: "Sukses", description: "Data diperbarui" });
      } else {
        const { error } = await supabase.from('santri_2025_12_01_21_34').insert([payload]);
        if (error) throw error; toast({ title: "Sukses", description: "Santri baru ditambahkan" });
      }
      setIsDialogOpen(false); activeKelas === null ? fetchSummaries() : fetchSantrisInClass(); setFormData({ gender: 'ikhwan', status: 'aktif', kelas: 7, rombel: 'A', rfid_card_id: '' });
    } catch (error: any) { toast({ title: "Gagal", description: "Cek kembali data (Mungkin NIS/Kartu sudah dipakai).", variant: "destructive" }); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus santri ini?")) return;
    try {
      const { error } = await supabase.from('santri_2025_12_01_21_34').delete().eq('id', id);
      if (error) throw error; toast({ title: "Terhapus", description: "Data dihapus" }); fetchSantrisInClass();
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
  };

  /* 🔥 FUNGSI IMPORT EXCEL (CSV) */
  const downloadTemplate = () => {
    const headers = "nis,nama_lengkap,kelas,rombel,gender,nama_wali,rfid_card_id\n";
    const sample1 = "11111,Ahmad Fulan,7,A,ikhwan,Bapak Ahmad,\n";
    const sample2 = "22222,Siti Fulanah,7,B,akhwat,Ibu Siti,\n";
    const csvContent = "data:text/csv;charset=utf-8," + headers + sample1 + sample2;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_import_simatren.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async () => {
    if (!importFile) {
        return toast({ title: "Pilih file dulu", description: "Anda belum memasukkan file CSV.", variant: "destructive" });
    }

    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            const text = e.target?.result as string;
            // Pisahkan per baris
            const rows = text.split('\n').map(row => row.trim()).filter(row => row !== '');
            
            if (rows.length < 2) throw new Error("File kosong atau tidak ada data santri.");

            // Ambil nama kolom dari baris pertama (header)
            const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
            
            const dataToInsert = [];
            
            // Looping baris data (mulai dari index 1 karena index 0 adalah header)
            for (let i = 1; i < rows.length; i++) {
                const values = rows[i].split(',').map(v => v.trim());
                if (values.length < 2) continue; // Lewati baris yang tidak valid

                const santri: any = { status: 'aktif' };
                
                headers.forEach((header, index) => {
                    if (header === 'kelas') {
                        santri[header] = parseInt(values[index]) || 7;
                    } else if (values[index]) {
                        santri[header] = values[index];
                    }
                });

                // Syarat mutlak: Nama lengkap harus ada
                if (santri.nama_lengkap) {
                    dataToInsert.push(santri);
                }
            }

            if (dataToInsert.length === 0) throw new Error("Tidak ada baris data yang valid ditemukan di file.");

            // Masukkan data massal ke Supabase
            const { error } = await supabase.from('santri_2025_12_01_21_34').insert(dataToInsert);
            if (error) throw error;

            toast({ title: "Sukses Import 🎉", description: `${dataToInsert.length} santri berhasil ditambahkan.`, className: "bg-green-600 text-white border-none" });
            
            setIsImportOpen(false);
            setImportFile(null);
            activeKelas === null ? fetchSummaries() : fetchSantrisInClass();
            
        } catch (err: any) {
            toast({ title: "Gagal Import", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    reader.readAsText(importFile);
  };

  const openAdd = () => { setFormData({ gender: 'ikhwan', status: 'aktif', kelas: activeKelas || 7, rombel: 'A', rfid_card_id: '' }); setIsEditMode(false); setIsDialogOpen(true); };
  const openEdit = (e: React.MouseEvent, santri: SantriSaldo) => { e.stopPropagation(); setFormData(santri); setIsEditMode(true); setIsDialogOpen(true); };
  const onDeleteClick = (e: React.MouseEvent, id: string) => { e.stopPropagation(); handleDelete(id); }

  const filteredSantris = santris.filter(s => s.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()));
  const currentTabSantris = filteredSantris.filter(s => s.gender === activeTab);

  /* VIEW 1: DASHBOARD KARTU KELAS */
  if (activeKelas === null) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-green-100">
             <div><h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Users className="text-green-600" /> Database Santri</h2><p className="text-sm text-gray-500">Pilih kelas untuk melihat detail.</p></div>
             
             {/* 🔥 TOMBOL IMPORT DI DASHBOARD UTAMA */}
             <div className="flex flex-wrap gap-2 w-full md:w-auto">
                 <Button onClick={() => setIsImportOpen(true)} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 shadow-sm flex-1 md:flex-none">
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Import Excel
                 </Button>
                 <Button onClick={openAdd} className="bg-green-600 hover:bg-green-700 shadow-md flex-1 md:flex-none"><UserPlus className="mr-2 h-4 w-4" /> Santri Baru</Button>
                 <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="outline" className="border-orange-200 text-orange-600 hover:bg-orange-50 shadow-sm w-full md:w-auto mt-2 md:mt-0"><ArrowUpCircle className="mr-2 h-4 w-4" /> Naik Kelas</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle className="text-orange-600 flex items-center gap-2"><AlertTriangle /> Peringatan Kenaikan Kelas</AlertDialogTitle><AlertDialogDescription><ul className="list-disc pl-5 space-y-1 text-sm text-gray-700"><li>Kls 7-11 naik tingkat.</li><li className="text-red-600 font-bold">Kls 12 DIHAPUS.</li></ul></AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleNaikKelasMassal} className="bg-orange-600 hover:bg-orange-700">Ya, Proses</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
             </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {classSummaries.map((summary) => (
                <Card key={summary.kelas} onClick={() => setActiveKelas(summary.kelas)} className="cursor-pointer hover:shadow-md hover:border-green-300 transition-all group relative overflow-hidden bg-white border-green-100">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-full -mr-8 -mt-8 z-0 group-hover:bg-green-100 transition-colors"></div>
                    <CardHeader className="pb-2 relative z-10"><CardTitle className="text-lg font-bold text-gray-700 flex justify-between items-center">Kelas {summary.kelas}<GraduationCap className="w-5 h-5 text-green-600 opacity-50" /></CardTitle><CardDescription>{summary.count} Santri</CardDescription></CardHeader>
                    <CardContent className="relative z-10"><div className="text-2xl font-bold text-gray-800">Rp {summary.totalSaldo.toLocaleString("id-ID")}</div><p className="text-[10px] text-green-600 mt-1 font-medium bg-green-50 inline-block px-2 py-0.5 rounded-full">Total Tabungan</p></CardContent>
                </Card>
            ))}
        </div>
        
        {/* DIALOG FORM MANUAL (Global) */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Tambah Santri Baru</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="text-sm font-medium">NIS</label><Input value={formData.nis || ''} onChange={e => setFormData({...formData, nis: e.target.value})} placeholder="12345" /></div>
                        <div className="space-y-2"><label className="text-sm font-medium">Nama</label><Input value={formData.nama_lengkap || ''} onChange={e => setFormData({...formData, nama_lengkap: e.target.value})} placeholder="Nama Santri" required /></div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-blue-600 flex items-center gap-2"><ScanBarcode className="w-4 h-4"/> Kode Kartu RFID (Opsional)</label>
                        <Input value={formData.rfid_card_id || ''} onChange={e => setFormData({...formData, rfid_card_id: e.target.value})} placeholder="Klik disini lalu tempel kartu..." className="border-blue-300 focus:border-blue-500 bg-blue-50/50 font-mono" />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
    <div className="col-span-2 space-y-2">
        <label className="text-sm font-medium">Kelas Sekolah</label>
        <Select disabled={isEditMode} value={String(formData.kelas)} onValueChange={v => setFormData({...formData, kelas: parseInt(v)})}> 
            {/* 🔥 Tambahkan disabled di SelectTrigger juga */}
            <SelectTrigger disabled={isEditMode} className={isEditMode ? "bg-gray-100 opacity-60 cursor-not-allowed" : ""}><SelectValue /></SelectTrigger>
            <SelectContent>{[7,8,9,10,11,12].map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}</SelectContent>
        </Select>
    </div>
    <div className="col-span-1 space-y-2">
        <label className="text-sm font-medium">Rombel</label>
        <Select disabled={isEditMode} value={formData.rombel} onValueChange={v => setFormData({...formData, rombel: v})}>
            {/* 🔥 Tambahkan disabled di SelectTrigger juga */}
            <SelectTrigger disabled={isEditMode} className={isEditMode ? "bg-gray-100 opacity-60 cursor-not-allowed" : ""}><SelectValue /></SelectTrigger>
            <SelectContent>
                {['A','B','C','D','E'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
        </Select>
    </div>
</div>
{isEditMode && <p className="text-[10px] text-orange-500 font-bold">*Ubah kelas & rombel melalui menu Manajemen Kelas.</p>}

                    <div className="space-y-2"><label className="text-sm font-medium">Gender</label><Select value={formData.gender} onValueChange={v => setFormData({...formData, gender: v as any})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ikhwan">Ikhwan</SelectItem><SelectItem value="akhwat">Akhwat</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><label className="text-sm font-medium">Wali</label><Input value={formData.nama_wali || ''} onChange={e => setFormData({...formData, nama_wali: e.target.value})} placeholder="Nama Orang Tua" /></div>
                    <DialogFooter><Button type="submit" className="bg-green-600 hover:bg-green-700">Simpan Data</Button></DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

        {/* 🔥 DIALOG IMPORT EXCEL */}
        <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="text-blue-600"/> Import Data Santri</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-2">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col gap-3">
                        <p className="text-sm text-blue-800 leading-relaxed">
                            <span className="font-bold">Langkah-langkah:</span><br/>
                            1. Unduh template Excel (CSV) di bawah ini.<br/>
                            2. Buka file di Excel, lalu isi data santri (jangan ubah nama kolom paling atas).<br/>
                            3. Simpan (Save) file tersebut, lalu unggah kembali ke sini.
                        </p>
                        <Button onClick={downloadTemplate} variant="outline" className="bg-white border-blue-300 text-blue-700 hover:bg-blue-100 hover:text-blue-800 w-full shadow-sm">
                            <Download className="w-4 h-4 mr-2" /> Download Template Excel
                        </Button>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Upload File CSV yang sudah diisi</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors">
                            <Input 
                                type="file" 
                                accept=".csv" 
                                onChange={(e) => setImportFile(e.target.files?.[0] || null)} 
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer bg-transparent border-0 p-0"
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsImportOpen(false)}>Batal</Button>
                    <Button onClick={handleImport} disabled={!importFile || loading} className="bg-blue-600 hover:bg-blue-700 shadow-md">
                        {loading ? "Memproses..." : <><Upload className="w-4 h-4 mr-2"/> Mulai Import</>}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    );
  }

  /* VIEW 2: DETAIL TABLE */
  return (
    <Card className={`shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300 border-t-4 ${activeTab === 'ikhwan' ? 'border-t-green-600 border-green-100' : 'border-t-pink-500 border-pink-100'}`}>
      <CardHeader className="bg-white border-b border-gray-100 pb-0">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
             <Button variant="ghost" size="icon" onClick={() => setActiveKelas(null)} className="hover:bg-green-50"><ArrowLeft className="h-5 w-5 text-gray-600" /></Button>
             <div><CardTitle className="text-lg font-bold text-gray-800">Kelas {activeKelas}</CardTitle><p className="text-xs text-gray-500">{filteredSantris.length} Santri Total</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 min-w-[200px] md:w-64"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" /><Input placeholder="Cari santri..." className="pl-9 h-9 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            
            {/* 🔥 TOMBOL IMPORT DI HALAMAN DETAIL KELAS */}
            <Button onClick={() => setIsImportOpen(true)} size="sm" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 h-9">
                <FileSpreadsheet className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Import</span>
            </Button>
            
            <Button onClick={openAdd} size="sm" className="bg-green-600 hover:bg-green-700 h-9">
                <UserPlus className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Baru</span>
            </Button>
          </div>
        </div>

        <div className="flex w-full border-b border-gray-200">
             <button onClick={() => setActiveTab('ikhwan')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2 ${activeTab === 'ikhwan' ? 'border-green-600 text-green-700 bg-green-50/50' : 'border-transparent text-gray-400 hover:text-green-600'}`}><User className="w-4 h-4" /> IKHWAN ({filteredSantris.filter(s => s.gender === 'ikhwan').length})</button>
             <button onClick={() => setActiveTab('akhwat')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2 ${activeTab === 'akhwat' ? 'border-pink-500 text-pink-700 bg-pink-50/50' : 'border-transparent text-gray-400 hover:text-pink-600'}`}><UserCheck className="w-4 h-4" /> AKHWAT ({filteredSantris.filter(s => s.gender === 'akhwat').length})</button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className={`font-semibold border-b ${activeTab === 'ikhwan' ? 'bg-green-50 text-green-800 border-green-100' : 'bg-pink-50 text-pink-800 border-pink-100'}`}>
              <tr>
                <th className="p-4 w-[80px]">NIS</th>
                <th className="p-4 min-w-[200px]">Nama Lengkap</th>
                <th className="p-4 text-center w-[120px]">Kls Sekolah</th>
                <th className="p-4 text-center w-[120px]">Kls Mengaji</th>
                <th className="p-4 text-right">Saldo</th>
                <th className="p-4 text-center w-[80px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentTabSantris.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">Tidak ada santri {activeTab} ditemukan di kelas ini.</td></tr>
              ) : (
                  currentTabSantris.map((santri) => (
                    <tr key={santri.id} className="hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => onSelectSantri && onSelectSantri(santri.id)}>
                      <td className="p-4 font-mono text-gray-500">{santri.nis || "-"}</td>
                      <td className="p-4">
                          <div className="font-bold text-gray-800 group-hover:text-green-600 group-hover:underline flex items-center gap-2">
                              {santri.nama_lengkap}
                              {santri.rfid_card_id && (<span title="Kartu Terhubung" className="text-blue-500"><CreditCard className="w-3 h-3" /></span>)}
                          </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-bold border border-green-200 shadow-sm">
                          {santri.kelas}-{santri.rombel || 'A'}
                        </span>
                      </td>

{/* KELAS MENGAJI */}
                      <td className="p-4 text-center">
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-200 shadow-sm">
                          {santri.kelas_mengaji || santri.kelas}-{santri.rombel_mengaji || santri.rombel || 'A'}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-gray-700 text-right">Rp {(santri.saldo || 0).toLocaleString('id-ID')}</td>
                      <td className="p-4 text-center flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-50" onClick={(e) => openEdit(e, santri)}><Pencil size={14} /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={(e) => onDeleteClick(e, santri.id)}><Trash2 size={14} /></Button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* DIALOG FORM (Global untuk detail) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent><DialogHeader><DialogTitle>{isEditMode ? "Edit Santri" : "Tambah Santri Baru"}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="text-sm font-medium">NIS</label><Input value={formData.nis || ''} onChange={e => setFormData({...formData, nis: e.target.value})} placeholder="12345" /></div>
                        <div className="space-y-2"><label className="text-sm font-medium">Nama</label><Input value={formData.nama_lengkap || ''} onChange={e => setFormData({...formData, nama_lengkap: e.target.value})} placeholder="Nama Santri" required /></div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-blue-600 flex items-center gap-2"><ScanBarcode className="w-4 h-4"/> Kode Kartu RFID (Opsional)</label>
                        <Input value={formData.rfid_card_id || ''} onChange={e => setFormData({...formData, rfid_card_id: e.target.value})} placeholder="Klik disini lalu tempel kartu..." className="border-blue-300 focus:border-blue-500 bg-blue-50/50 font-mono" />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
    <div className="col-span-2 space-y-2">
        <label className="text-sm font-medium">Kelas Sekolah</label>
        <Select disabled={isEditMode} value={String(formData.kelas)} onValueChange={v => setFormData({...formData, kelas: parseInt(v)})}> 
            {/* 🔥 Tambahkan disabled di SelectTrigger juga */}
            <SelectTrigger disabled={isEditMode} className={isEditMode ? "bg-gray-100 opacity-60 cursor-not-allowed" : ""}><SelectValue /></SelectTrigger>
            <SelectContent>{[7,8,9,10,11,12].map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}</SelectContent>
        </Select>
    </div>
    <div className="col-span-1 space-y-2">
        <label className="text-sm font-medium">Rombel</label>
        <Select disabled={isEditMode} value={formData.rombel} onValueChange={v => setFormData({...formData, rombel: v})}>
            {/* 🔥 Tambahkan disabled di SelectTrigger juga */}
            <SelectTrigger disabled={isEditMode} className={isEditMode ? "bg-gray-100 opacity-60 cursor-not-allowed" : ""}><SelectValue /></SelectTrigger>
            <SelectContent>
                {['A','B','C','D','E'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
        </Select>
    </div>
</div>
{isEditMode && <p className="text-[10px] text-orange-500 font-bold">*Ubah kelas & rombel melalui menu Manajemen Kelas.</p>}

                    <div className="space-y-2"><label className="text-sm font-medium">Gender</label><Select value={formData.gender} onValueChange={v => setFormData({...formData, gender: v as any})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ikhwan">Ikhwan</SelectItem><SelectItem value="akhwat">Akhwat</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><label className="text-sm font-medium">Wali</label><Input value={formData.nama_wali || ''} onChange={e => setFormData({...formData, nama_wali: e.target.value})} placeholder="Nama Orang Tua" /></div>
                    <DialogFooter><Button type="submit" className="bg-green-600 hover:bg-green-700">Simpan Data</Button></DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

        {/* DIALOG IMPORT EXCEL (Copy buat halaman detail) */}
        <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="text-blue-600"/> Import Data Santri</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-2">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col gap-3">
                        <p className="text-sm text-blue-800 leading-relaxed">
                            <span className="font-bold">Langkah-langkah:</span><br/>
                            1. Unduh template Excel (CSV) di bawah ini.<br/>
                            2. Buka file di Excel, lalu isi data santri (jangan ubah nama kolom paling atas).<br/>
                            3. Simpan (Save) file tersebut, lalu unggah kembali ke sini.
                        </p>
                        <Button onClick={downloadTemplate} variant="outline" className="bg-white border-blue-300 text-blue-700 hover:bg-blue-100 hover:text-blue-800 w-full shadow-sm">
                            <Download className="w-4 h-4 mr-2" /> Download Template Excel
                        </Button>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Upload File CSV yang sudah diisi</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors">
                            <Input 
                                type="file" 
                                accept=".csv" 
                                onChange={(e) => setImportFile(e.target.files?.[0] || null)} 
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer bg-transparent border-0 p-0"
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsImportOpen(false)}>Batal</Button>
                    <Button onClick={handleImport} disabled={!importFile || loading} className="bg-blue-600 hover:bg-blue-700 shadow-md">
                        {loading ? "Memproses..." : <><Upload className="w-4 h-4 mr-2"/> Mulai Import</>}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </Card>
  );
};

export default SantriManagement;
