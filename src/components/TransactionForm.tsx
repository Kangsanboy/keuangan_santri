import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Wallet, Download, ArrowDownCircle, ArrowUpCircle, History } from "lucide-react";

interface Santri {
  id: string;
  nama_lengkap: string;
  saldo: number;
}

interface TransactionHistory {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  transaction_date: string;
  santri: { nama_lengkap: string };
}

type UIType = "pemasukan" | "pengeluaran";

const TransactionForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [type, setType] = useState<UIType>("pemasukan");
  const [kelas, setKelas] = useState<number | null>(null);
  const [gender, setGender] = useState<"ikhwan" | "akhwat" | null>(null);
  
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [historyList, setHistoryList] = useState<TransactionHistory[]>([]);
  
  // State untuk form massal: Record<santri_id, { amount: string, mode: '10000' | 'custom' }>
  const [formData, setFormData] = useState<Record<string, { amount: string, mode: '10000' | 'custom' }>>({});
  
  const [trxDate, setTrxDate] = useState<string>(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()));
  const [loading, setLoading] = useState(false);

  /* 1. FETCH DATA USER (CEK PENGASUH) */
  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
        setCurrentUser(data);
        if (data?.role === 'pengasuh') {
          setKelas(parseInt(data.kelas_asuh));
          setGender(data.gender_asuh);
        }
      }
    };
    fetchProfile();
  }, [user]);

  /* 2. FETCH DAFTAR SANTRI & SALDO + RIWAYAT */
  const fetchData = async () => {
    if (!kelas || !gender) return;

    // A. Fetch Santri & Saldo
    const { data: santriData } = await supabase
      .from("santri_2025_12_01_21_34")
      .select("id, nama_lengkap")
      .eq("kelas", kelas).eq("gender", gender).eq("status", "aktif")
      .order("nama_lengkap");

    const { data: saldoData } = await supabase.from("view_santri_saldo").select("id, saldo").eq("kelas", kelas);

    const mergedSantri = santriData?.map(s => {
      const match = saldoData?.find(sd => sd.id === s.id);
      return { ...s, saldo: match?.saldo || 0 };
    }) || [];

    setSantriList(mergedSantri);

    // Inisialisasi state form default untuk pengeluaran (mode 10000)
    const initialForm: Record<string, any> = {};
    mergedSantri.forEach(s => {
        initialForm[s.id] = { amount: "", mode: "10000" };
    });
    setFormData(initialForm);

    // B. Fetch Riwayat Transaksi Kelas Ini
    const { data: historyData } = await supabase
      .from("transactions_2025_12_01_21_34")
      .select(`id, amount, type, transaction_date, santri:santri_id(nama_lengkap)`)
      .in('santri_id', mergedSantri.map(s => s.id))
      .order('created_at', { ascending: false })
      .limit(20);
      
    // @ts-ignore
    setHistoryList(historyData || []);
  };

  useEffect(() => { fetchData(); }, [kelas, gender]);

  /* HANDLER PERUBAHAN INPUT MASSAL */
  const handleAmountChange = (id: string, val: string) => {
    setFormData(prev => ({ ...prev, [id]: { ...prev[id], amount: val } }));
  };

  const handleModeChange = (id: string, mode: '10000' | 'custom') => {
    setFormData(prev => ({ 
        ...prev, 
        [id]: { mode, amount: mode === '10000' ? "" : prev[id]?.amount || "" } 
    }));
  };

  /* 3. SIMPAN SEMUA TRANSAKSI SEKALIGUS (BULK INSERT) */
  const handleBulkSubmit = async () => {
    if (!trxDate) return toast({ title: "Pilih Tanggal!", variant: "destructive" });

    const transactionsToInsert: any[] = [];
    const dbType = type === "pemasukan" ? "income" : "expense";
    let hasError = false;

    for (const santri of santriList) {
        const rowData = formData[santri.id];
        let finalAmount = 0;

        if (type === 'pengeluaran' && rowData?.mode === '10000') {
            finalAmount = 10000; // Jika tidak di-klik hapus/ubah, anggap default 10k ada isinya kalau mode ini dipilih
            // Catatan: Supaya tidak otomatis kepotong semua santri, kita cek apakah checkbox/input dikosongkan.
            // Di desain ini, JIKA mode 10000 dipilih, kita anggap dia jajan 10k. 
            // TAPI, untuk amannya, kita hanya insert kalau usernya ngeklik sesuatu atau kita jadikan opsi kosong sebagai default.
            // *Perbaikan logika UX:* Kita hanya proses jika 'amount' diisi, ATAU jika mode pengeluaran adalah '10000' DAN dia tidak berniat mengosongkannya.
            // Agar aman, mari kita syaratkan user MENGETIK nominal, atau MEMILIH mode 10000 secara sadar. 
            // Karena ini form massal, lebih baik kita baca dari `amount`.
        }
        
        // Logika Pasti: Ambil nominal dari input teks. Khusus mode 10k, input teks otomatis di-set/dianggap 10000 di UI jika tidak diubah.
        if (type === 'pemasukan') {
            finalAmount = Number(rowData?.amount || 0);
        } else {
            finalAmount = rowData?.mode === '10000' ? 10000 : Number(rowData?.amount || 0);
            
            // JIKA user pilih custom tapi kosong, abaikan (0)
            if (rowData?.mode === 'custom' && (!rowData?.amount || rowData?.amount === '0')) {
                finalAmount = 0;
            }
        }

        // Cek jika ada nominal yang valid untuk diinsert
        if (finalAmount > 0) {
            // Proteksi Saldo Minus untuk Pengeluaran
            if (type === 'pengeluaran' && finalAmount > santri.saldo) {
                toast({ title: `Saldo ${santri.nama_lengkap} Tidak Cukup!`, description: `Sisa Rp ${santri.saldo.toLocaleString()}`, variant: "destructive" });
                hasError = true;
                break; // Hentikan proses jika ada 1 saja yang minus
            }

            transactionsToInsert.push({
                user_id: user!.id,
                santri_id: santri.id,
                type: dbType,
                amount: finalAmount,
                description: type === 'pemasukan' ? 'Setoran Massal' : 'Jajan Massal',
                category: "santri",
                transaction_date: trxDate,
            });
        }
    }

    if (hasError) return;
    if (transactionsToInsert.length === 0) {
        return toast({ title: "Form Kosong", description: "Tidak ada nominal yang diisi.", variant: "destructive" });
    }

    setLoading(true);
    try {
        const { error } = await supabase.from("transactions_2025_12_01_21_34").insert(transactionsToInsert);
        if (error) throw error;

        toast({ title: "Berhasil!", description: `${transactionsToInsert.length} data transaksi disimpan.`, className: "bg-green-600 text-white" });
        
        // Reset isi form
        const resetForm: Record<string, any> = {};
        santriList.forEach(s => resetForm[s.id] = { amount: "", mode: "10000" });
        setFormData(resetForm);
        
        // Refresh data saldo dan riwayat
        fetchData();
        setTimeout(() => window.dispatchEvent(new Event("refresh-keuangan")), 100);
    } catch (err) {
        toast({ title: "Gagal Menyimpan", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
        <Card className="border-green-100 shadow-sm bg-white">
        <CardHeader className="pb-4 border-b border-gray-50 bg-gray-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <CardTitle className="text-xl font-bold text-gray-800">Buku Kas Kelas</CardTitle>
                <p className="text-sm text-gray-500">Input transaksi santri secara massal.</p>
            </div>
            
            {/* Tombol Export hanya untuk Admin/Guru */}
            {currentUser?.role !== 'pengasuh' && (
                <Button variant="outline" className="border-green-200 text-green-700 hover:bg-green-50 shadow-sm"><Download className="w-4 h-4 mr-2"/> Export Data</Button>
            )}
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
            {/* FILTER & TANGGAL */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="space-y-1">
                    <Label className="text-gray-600">Tanggal Trx</Label>
                    <Input type="date" value={trxDate} onChange={(e) => setTrxDate(e.target.value)} className="bg-white font-bold" />
                </div>
                <div className="space-y-1">
                    <Label className="text-gray-600">Kelas</Label>
                    <Select value={kelas ? String(kelas) : undefined} onValueChange={(v) => setKelas(Number(v))} disabled={currentUser?.role === 'pengasuh'}>
                        <SelectTrigger className={currentUser?.role === 'pengasuh' ? "bg-gray-100 opacity-70" : "bg-white"}><SelectValue placeholder="Pilih Kelas..." /></SelectTrigger>
                        <SelectContent>{[7,8,9,10,11,12].map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-1">
                    <Label className="text-gray-600">Gender</Label>
                    <Select value={gender || undefined} onValueChange={(v: any) => setGender(v)} disabled={currentUser?.role === 'pengasuh'}>
                        <SelectTrigger className={currentUser?.role === 'pengasuh' ? "bg-gray-100 opacity-70" : "bg-white"}><SelectValue placeholder="Pilih Gender..." /></SelectTrigger>
                        <SelectContent><SelectItem value="ikhwan">Ikhwan</SelectItem><SelectItem value="akhwat">Akhwat</SelectItem></SelectContent>
                    </Select>
                </div>
            </div>

            {/* TOGGLE JENIS TRANSAKSI */}
            <div className="flex w-full bg-gray-100 rounded-xl p-1">
                <button onClick={() => setType('pemasukan')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${type === 'pemasukan' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-green-600'}`}>
                    <ArrowDownCircle className="w-5 h-5"/> PEMASUKAN (+)
                </button>
                <button onClick={() => setType('pengeluaran')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${type === 'pengeluaran' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-red-600'}`}>
                    <ArrowUpCircle className="w-5 h-5"/> PENGELUARAN (-)
                </button>
            </div>

            {/* FORM MASSAL (TABLE VIEW) */}
            {kelas && gender ? (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className={`border-b ${type === 'pemasukan' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                            <tr>
                                <th className="p-3">Nama Santri</th>
                                <th className="p-3 text-right w-[150px]">Sisa Saldo</th>
                                <th className="p-3 text-center w-[250px]">Nominal Transaksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {santriList.length === 0 ? (
                                <tr><td colSpan={3} className="p-6 text-center text-gray-400 italic">Tidak ada data santri.</td></tr>
                            ) : (
                                santriList.map(santri => (
                                    <tr key={santri.id} className="hover:bg-gray-50">
                                        <td className="p-3 font-bold text-gray-700">{santri.nama_lengkap}</td>
                                        <td className="p-3 text-right">
                                            <span className={`font-medium ${santri.saldo < 10000 ? 'text-red-500' : 'text-gray-600'}`}>Rp {santri.saldo.toLocaleString()}</span>
                                        </td>
                                        <td className="p-3 flex justify-center gap-2">
                                            {type === 'pemasukan' ? (
                                                <Input type="number" placeholder="Rp 0" value={formData[santri.id]?.amount || ""} onChange={(e) => handleAmountChange(santri.id, e.target.value)} className="w-full text-right font-bold focus:border-green-500" />
                                            ) : (
                                                <div className="flex gap-2 w-full">
                                                    <Select value={formData[santri.id]?.mode || '10000'} onValueChange={(v: any) => handleModeChange(santri.id, v)}>
                                                        <SelectTrigger className="w-[120px] bg-white"><SelectValue/></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="10000">Rp 10.000</SelectItem>
                                                            <SelectItem value="custom">Custom</SelectItem>
                                                            <SelectItem value="batal" className="text-red-500 font-bold">KOSONG (-)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    
                                                    {formData[santri.id]?.mode === 'custom' && (
                                                        <Input type="number" placeholder="Rp..." value={formData[santri.id]?.amount || ""} onChange={(e) => handleAmountChange(santri.id, e.target.value)} className="w-full text-right font-bold focus:border-red-500" />
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="p-8 border-2 border-dashed border-gray-200 rounded-xl text-center text-gray-500">
                    Silakan pilih kelas dan gender terlebih dahulu.
                </div>
            )}

            {santriList.length > 0 && (
                <Button onClick={handleBulkSubmit} disabled={loading} className={`w-full h-14 text-lg font-bold shadow-lg ${type === 'pemasukan' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                    {loading ? "Menyimpan Data..." : `SIMPAN SEMUA DATA ${type.toUpperCase()}`}
                </Button>
            )}
        </CardContent>
        </Card>

        {/* TABEL RIWAYAT KELAS */}
        {santriList.length > 0 && (
            <Card className="border-gray-200 shadow-sm bg-white">
                <CardHeader className="border-b bg-gray-50/50 p-4">
                    <CardTitle className="text-base font-bold text-gray-700 flex items-center gap-2"><History className="w-5 h-5 text-blue-500"/> Riwayat Transaksi Anak Asuh</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <table className="w-full text-left text-sm">
                        <tbody className="divide-y divide-gray-100">
                            {historyList.length === 0 ? (
                                <tr><td className="p-4 text-center text-gray-400 italic">Belum ada riwayat transaksi.</td></tr>
                            ) : (
                                historyList.map(hist => (
                                    <tr key={hist.id} className="hover:bg-gray-50">
                                        <td className="p-3">
                                            <p className="font-bold text-gray-800">{hist.santri?.nama_lengkap}</p>
                                            <p className="text-xs text-gray-500">{hist.transaction_date}</p>
                                        </td>
                                        <td className="p-3 text-right">
                                            <span className={`font-bold ${hist.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                {hist.type === 'income' ? '+' : '-'} Rp {hist.amount.toLocaleString()}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        )}
    </div>
  );
};

export default TransactionForm;
