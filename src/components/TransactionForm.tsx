import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Wallet } from "lucide-react";

interface Santri {
  id: string;
  nama_lengkap: string;
}

type UIType = "pemasukan" | "pengeluaran";
type DBType = "income" | "expense";

const TransactionForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [type, setType] = useState<UIType>("pemasukan");
  const [kelas, setKelas] = useState<number | null>(null);
  const [gender, setGender] = useState<"ikhwan" | "akhwat" | null>(null);
  const [santriId, setSantriId] = useState<string | null>(null);
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  
  // State untuk Tanggal, Saldo, dan User Profil
  const [trxDate, setTrxDate] = useState<string>(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()));
  const [currentSaldo, setCurrentSaldo] = useState<number>(0);
  const [currentUser, setCurrentUser] = useState<any>(null);

  /* FETCH DATA USER (CEK PENGASUH) */
  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
          
        setCurrentUser(data);

        // Jika role pengasuh, otomatis isi kelas dan gender, tidak perlu reset manual
        if (data?.role === 'pengasuh') {
          setKelas(parseInt(data.kelas_asuh));
          setGender(data.gender_asuh);
        }
      }
    };
    fetchProfile();
  }, [user]);

  /* Handler Manual untuk Select Kelas & Gender agar tidak bentrok dengan auto-fill Pengasuh */
  const handleKelasChange = (v: string) => {
    setKelas(Number(v));
    setGender(null);
    setSantriId(null);
    setSantriList([]);
    setCurrentSaldo(0);
  };

  const handleGenderChange = (v: "ikhwan" | "akhwat") => {
    setGender(v);
    setSantriId(null);
    setSantriList([]);
    setCurrentSaldo(0);
  };

  /* AMBIL SALDO SAAT SANTRI DIPILIH */
  useEffect(() => {
    const fetchSaldoSantri = async () => {
        if (!santriId) {
            setCurrentSaldo(0);
            return;
        }
        const { data, error } = await supabase
            .from("view_santri_saldo")
            .select("saldo")
            .eq("id", santriId)
            .single();

        if (data) setCurrentSaldo(data.saldo || 0);
    };

    fetchSaldoSantri();
  }, [santriId]);

  /* Ambil daftar santri jika kelas dan gender sudah ada */
  useEffect(() => {
    const fetchSantri = async () => {
      if (!kelas || !gender) return;

      const { data, error } = await supabase
        .from("santri_2025_12_01_21_34")
        .select("id, nama_lengkap")
        .eq("kelas", kelas)
        .eq("gender", gender)
        .eq("status", "aktif")
        .order("nama_lengkap");

      if (error) {
        toast({ title: "Error", description: "Gagal memuat santri", variant: "destructive" });
        return;
      }
      setSantriList(data || []);
    };

    fetchSantri();
  }, [kelas, gender]);

  /* Simpan Transaksi */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!kelas || !gender || !santriId || !amount || !trxDate) {
      toast({ title: "Data belum lengkap", description: "Lengkapi semua field termasuk tanggal.", variant: "destructive" });
      return;
    }

    const nominal = Number(amount);

    if (nominal <= 0) {
      toast({ title: "Nominal tidak valid", description: "Nominal harus lebih dari 0", variant: "destructive" });
      return;
    }

    // CEK PROTEKSI ANTI MINUS
    if (type === "pengeluaran" && nominal > currentSaldo) {
        toast({
            title: "Saldo Tidak Cukup!",
            description: `Sisa saldo santri hanya Rp ${currentSaldo.toLocaleString("id-ID")}. Transaksi dibatalkan.`,
            variant: "destructive",
        });
        return; 
    }

    const dbType: DBType = type === "pemasukan" ? "income" : "expense";
    setLoading(true);

    try {
      const { error } = await supabase
        .from("transactions_2025_12_01_21_34")
        .insert({
          user_id: user!.id,
          santri_id: santriId,
          type: dbType,
          amount: nominal,
          description,
          category: "santri",
          transaction_date: trxDate, 
        });

      if (error) throw error;

      toast({ title: "Berhasil", description: `Transaksi ${type} berhasil disimpan` });

      // 🔥 Update saldo lokal form biar responsif
      if (type === "pemasukan") setCurrentSaldo(prev => prev + nominal);
      else setCurrentSaldo(prev => prev - nominal);

      setAmount("");
      setDescription("");

      // 🔥 Tembak sinyal refresh ke Index.tsx pakai Timeout sebentar biar DB siap
      setTimeout(() => {
          window.dispatchEvent(new Event("refresh-keuangan"));
      }, 100);
      
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Gagal menyimpan transaksi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-green-100 shadow-sm">
      <CardHeader className="pb-3 border-b border-gray-50 bg-gray-50/30">
        <CardTitle className="text-lg font-bold text-gray-800">Tambah Transaksi Baru</CardTitle>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-green-600" /> Tanggal Transaksi
            </Label>
            <Input type="date" value={trxDate} onChange={(e) => setTrxDate(e.target.value)} className="bg-white border-green-200 focus:ring-green-500 font-medium" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Jenis</Label>
                <Select value={type} onValueChange={(v) => setType(v as UIType)}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="pemasukan" className="text-green-600 font-medium">Pemasukan (+)</SelectItem>
                    <SelectItem value="pengeluaran" className="text-red-600 font-medium">Pengeluaran (-)</SelectItem>
                </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Kelas</Label>
                <Select 
                   value={kelas ? kelas.toString() : undefined} 
                   onValueChange={handleKelasChange}
                   disabled={currentUser?.role === 'pengasuh'}
                >
                  <SelectTrigger className={currentUser?.role === 'pengasuh' ? "bg-gray-100 opacity-60 cursor-not-allowed" : "bg-white"}>
                    <SelectValue placeholder="Pilih..." />
                  </SelectTrigger>
                  <SelectContent>{[7, 8, 9, 10, 11, 12].map((k) => (<SelectItem key={k} value={k.toString()}>Kelas {k}</SelectItem>))}</SelectContent>
                </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Gender</Label>
                <Select 
                  value={gender ?? undefined} 
                  onValueChange={(v) => handleGenderChange(v as "ikhwan" | "akhwat")} 
                  disabled={!kelas || currentUser?.role === 'pengasuh'}
                >
                  <SelectTrigger className={currentUser?.role === 'pengasuh' ? "bg-gray-100 opacity-60 cursor-not-allowed" : "bg-white"}>
                    <SelectValue placeholder="Pilih..." />
                  </SelectTrigger>
                  <SelectContent><SelectItem value="ikhwan">Ikhwan</SelectItem><SelectItem value="akhwat">Akhwat</SelectItem></SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Santri</Label>
                <Select value={santriId ?? undefined} onValueChange={(v) => setSantriId(v)} disabled={santriList.length === 0}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Pilih nama..." /></SelectTrigger>
                <SelectContent>{santriList.map((s) => (<SelectItem key={s.id} value={s.id}>{s.nama_lengkap}</SelectItem>))}</SelectContent>
                </Select>
            </div>
          </div>

          {santriId && (
              <div className="bg-green-50 p-3 rounded-lg flex items-center justify-between border border-green-200">
                  <div className="flex items-center gap-2 text-sm text-green-800"><Wallet className="w-4 h-4" /><span>Sisa Saldo:</span></div>
                  <span className="font-bold text-green-700 text-lg">Rp {currentSaldo.toLocaleString("id-ID")}</span>
              </div>
          )}

          <div className="space-y-2">
            <Label>Nominal (Rp)</Label>
            <Input type="number" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="font-bold text-gray-700 bg-white" />
            {type === 'pengeluaran' && santriId && (Number(amount) > currentSaldo) && (
                <p className="text-xs text-red-500 font-medium animate-pulse">⚠️ Nominal melebihi sisa saldo!</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Keterangan</Label>
            <Textarea placeholder="Contoh: Tabungan mingguan, Uang saku..." value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white" />
          </div>

          <Button type="submit" disabled={loading} className={`w-full font-bold shadow-md transition-all ${type === 'pemasukan' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
            {loading ? "Menyimpan..." : type === 'pemasukan' ? "Simpan Pemasukan" : "Simpan Pengeluaran"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TransactionForm;
