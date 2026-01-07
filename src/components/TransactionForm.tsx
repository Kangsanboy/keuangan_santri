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
import { CalendarIcon } from "lucide-react"; // Icon Tambahan

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
  
  // 🔥 STATE BARU: Tanggal Transaksi (Default: Hari Ini)
  const [trxDate, setTrxDate] = useState<string>(new Date().toISOString().slice(0, 10));

  /* reset saat kelas berubah */
  useEffect(() => {
    setGender(null);
    setSantriId(null);
    setSantriList([]);
  }, [kelas]);

  /* reset saat gender berubah */
  useEffect(() => {
    setSantriId(null);
    setSantriList([]);
  }, [gender]);

  /* ambil santri */
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
        toast({
          title: "Error",
          description: "Gagal memuat santri",
          variant: "destructive",
        });
        return;
      }

      setSantriList(data || []);
    };

    fetchSantri();
  }, [kelas, gender]);

  /* simpan transaksi */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi data
    if (!kelas || !gender || !santriId || !amount || !trxDate) {
      toast({
        title: "Data belum lengkap",
        description: "Lengkapi semua field termasuk tanggal.",
        variant: "destructive",
      });
      return;
    }

    if (Number(amount) <= 0) {
      toast({
        title: "Nominal tidak valid",
        description: "Nominal harus lebih dari 0",
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
          amount: Number(amount),
          description,
          category: "santri",
          // 🔥 GUNAKAN TANGGAL YANG DIPILIH USER
          transaction_date: trxDate, 
        });

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: `Transaksi tgl ${trxDate} berhasil disimpan`,
      });

      // Trigger refresh data di Dashboard
      window.dispatchEvent(new Event("refresh-keuangan"));

      // Reset Form (Kecuali Tanggal, biar enak kalau mau input banyak di tgl yg sama)
      setAmount("");
      setDescription("");
      setSantriId(null);
      // setTrxDate(new Date().toISOString().slice(0, 10)); // Uncomment kalau mau auto reset ke hari ini
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Gagal menyimpan transaksi",
        variant: "destructive",
      });
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
          
          {/* 🔥 INPUT TANGGAL (Paling Atas) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-green-600" />
                Tanggal Transaksi
            </Label>
            <Input
              type="date"
              value={trxDate}
              onChange={(e) => setTrxDate(e.target.value)}
              className="bg-white border-green-200 focus:ring-green-500 font-medium"
            />
            <p className="text-[10px] text-gray-400">
                *Default adalah hari ini. Ubah tanggal untuk input data lampau (Backdate).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Jenis</Label>
                <Select value={type} onValueChange={(v) => setType(v as UIType)}>
                <SelectTrigger className="bg-white">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="pemasukan" className="text-green-600 font-medium">Pemasukan (+)</SelectItem>
                    <SelectItem value="pengeluaran" className="text-red-600 font-medium">Pengeluaran (-)</SelectItem>
                </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Kelas</Label>
                <Select onValueChange={(v) => setKelas(Number(v))}>
                <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Pilih..." />
                </SelectTrigger>
                <SelectContent>
                    {[7, 8, 9, 10, 11, 12].map((k) => (
                    <SelectItem key={k} value={k.toString()}>
                        Kelas {k}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                value={gender ?? undefined}
                onValueChange={(v) => setGender(v as any)}
                disabled={!kelas}
                >
                <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Pilih..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ikhwan">Ikhwan</SelectItem>
                    <SelectItem value="akhwat">Akhwat</SelectItem>
                </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Santri</Label>
                <Select
                value={santriId ?? undefined}
                onValueChange={(v) => setSantriId(v)}
                disabled={santriList.length === 0}
                >
                <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Pilih nama..." />
                </SelectTrigger>
                <SelectContent>
                    {santriList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                        {s.nama_lengkap}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nominal (Rp)</Label>
            <Input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-bold text-gray-700 bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label>Keterangan</Label>
            <Textarea
              placeholder="Contoh: Tabungan mingguan, Uang saku..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white"
            />
          </div>

          <Button 
            type="submit" 
            className={`w-full font-bold shadow-md transition-all ${
                type === 'pemasukan' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-red-600 hover:bg-red-700'
            }`} 
            disabled={loading}
          >
            {loading ? "Menyimpan..." : type === 'pemasukan' ? "Simpan Pemasukan" : "Simpan Pengeluaran"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TransactionForm;
