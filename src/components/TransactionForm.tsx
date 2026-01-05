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

interface Santri {
  id: string;
  nama_lengkap: string;
}

const TransactionForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [type, setType] = useState<"pemasukan" | "pengeluaran">("pemasukan");
  const [kelas, setKelas] = useState<number | null>(null);
  const [gender, setGender] = useState<"ikhwan" | "akhwat" | null>(null);
  const [santriId, setSantriId] = useState<string | null>(null);
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  /* 🔹 Reset gender & santri saat kelas berubah */
  useEffect(() => {
    setGender(null);
    setSantriId(null);
    setSantriList([]);
  }, [kelas]);

  /* 🔹 Reset santri saat gender berubah */
  useEffect(() => {
    setSantriId(null);
    setSantriList([]);
  }, [gender]);

  /* 🔹 Ambil santri sesuai kelas & gender */
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

  /* 🔹 Simpan transaksi */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!kelas || !gender || !santriId || !amount) {
      toast({
        title: "Data belum lengkap",
        description: "Lengkapi semua field transaksi",
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

    setLoading(true);

    try {
      const { error } = await supabase
        .from("transactions_2025_12_01_21_34")
        .insert({
          user_id: user?.id,
          santri_id: santriId,
          type,
          amount: Number(amount),
          description,
          transaction_date: new Date().toISOString().split("T")[0],
        });

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Transaksi berhasil disimpan",
      });

      /* 🔔 kasih tahu halaman keuangan */
      window.dispatchEvent(new Event("refresh-keuangan"));

      /* reset sebagian */
      setAmount("");
      setDescription("");
      setSantriId(null);
    } catch {
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
    <Card>
      <CardHeader>
        <CardTitle>Tambah Transaksi</CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Jenis */}
          <div className="space-y-2">
            <Label>Jenis Transaksi</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pemasukan">Pemasukan</SelectItem>
                <SelectItem value="pengeluaran">Pengeluaran</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Kelas */}
          <div className="space-y-2">
            <Label>Kelas</Label>
            <Select onValueChange={(v) => setKelas(Number(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kelas" />
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

          {/* Gender */}
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select
              value={gender ?? undefined}
              onValueChange={(v) => setGender(v as any)}
              disabled={!kelas}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ikhwan">Ikhwan</SelectItem>
                <SelectItem value="akhwat">Akhwat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Santri */}
          <div className="space-y-2">
            <Label>Santri</Label>
            <Select
              value={santriId ?? undefined}
              onValueChange={(v) => setSantriId(v)}
              disabled={santriList.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !kelas || !gender
                      ? "Pilih kelas & gender dulu"
                      : "Pilih santri"
                  }
                />
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

          {/* Nominal */}
          <div className="space-y-2">
            <Label>Nominal</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Masukkan nominal"
            />
          </div>

          {/* Keterangan */}
          <div className="space-y-2">
            <Label>Keterangan</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opsional"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan Transaksi"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TransactionForm;