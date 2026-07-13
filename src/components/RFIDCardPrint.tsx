import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "react-qr-code";
import { Printer, CreditCard, Users, Loader2 } from "lucide-react";

interface Santri {
  id: string;
  nama_lengkap: string;
  nisn: string;
  kelas: number;
  rombel: string;
  gender: string;
  rfid_card_id: string | null;
}

const CLASSES = [7, 8, 9, 10, 11, 12];

const RFIDCardPrint = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [santris, setSantris] = useState<Santri[]>([]);
  
  const [filterKelas, setFilterKelas] = useState<string>("7");
  const [filterGender, setFilterGender] = useState<string>("ikhwan");

  const fetchSantris = async () => {
    if (!filterKelas || !filterGender) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("santri_2025_12_01_21_34")
        .select("id, nama_lengkap, nisn, kelas, rombel, gender, rfid_card_id")
        .eq("status", "aktif")
        .eq("kelas", parseInt(filterKelas))
        .eq("gender", filterGender)
        .order("nama_lengkap");

      if (error) throw error;
      setSantris(data || []);
      
      if (data?.length === 0) {
          toast({ title: "Kosong", description: "Tidak ada data santri di kelas ini." });
      } else {
          toast({ title: "Data Ditemukan", description: `${data?.length} santri siap dicetak.`, className: "bg-green-600 text-white" });
      }
    } catch (err: any) {
      toast({ title: "Gagal memuat data", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Komponen Kartu Depan & Belakang
  const IDCard = ({ santri }: { santri: Santri }) => {
    const qrValue = santri.rfid_card_id || santri.nisn || santri.id;
    const isIkhwan = santri.gender === 'ikhwan' || santri.gender === 'L';

    return (
      <div className="flex flex-col sm:flex-row gap-4 mb-8 print-card-wrapper break-inside-avoid">
        
        {/* BAGIAN DEPAN (FRONT) */}
        <div className="w-[54mm] h-[86mm] bg-white rounded-xl shadow-lg border-2 border-gray-200 flex flex-col overflow-hidden relative print:shadow-none print:border-[1px] print:border-gray-300">
            {/* Header Hijau */}
            <div className="bg-green-900 h-[30mm] w-full flex flex-col items-center justify-start pt-3 relative">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')]"></div>
                <h1 className="text-[10px] font-black tracking-widest text-yellow-400 z-10 font-serif">SIMATREN</h1>
                <p className="text-[5px] text-green-100 uppercase tracking-widest z-10 mb-1">Pesantren Al-Jawahir</p>
                <div className="w-full h-1 bg-yellow-400 mt-auto"></div>
            </div>

            {/* Foto Profil (Tengah, numpuk di garis) */}
            <div className="absolute top-[20mm] left-1/2 -translate-x-1/2 w-[22mm] h-[26mm] bg-gray-100 rounded-lg border-2 border-yellow-400 shadow-sm overflow-hidden flex items-center justify-center z-20">
                <img 
                    src={isIkhwan ? "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=e2e8f0" : "https://api.dicebear.com/7.x/avataaars/svg?seed=Mia&backgroundColor=f87171"} 
                    alt="Foto Santri" 
                    className="w-full h-full object-cover opacity-80"
                />
            </div>

            {/* Body Data */}
            <div className="flex-1 flex flex-col items-center justify-end pb-4 px-2 text-center mt-[12mm]">
                <h2 className="text-[11px] font-bold text-gray-900 leading-tight mb-1 uppercase uppercase line-clamp-2">
                    {santri.nama_lengkap}
                </h2>
                <div className="bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded text-[8px] font-bold mb-1">
                    NISN: {santri.nisn || "-"}
                </div>
                <p className="text-[9px] font-bold text-gray-600">
                    Kls {santri.kelas} - {santri.rombel || "A"}
                </p>
            </div>
            
            {/* Footer */}
            <div className="h-[4mm] bg-green-900 w-full"></div>
        </div>

        {/* BAGIAN BELAKANG (BACK) */}
        <div className="w-[54mm] h-[86mm] bg-white rounded-xl shadow-lg border-2 border-gray-200 flex flex-col overflow-hidden print:shadow-none print:border-[1px] print:border-gray-300">
            <div className="h-[6mm] bg-yellow-400 w-full flex items-center justify-center">
                <p className="text-[6px] font-bold uppercase tracking-widest text-yellow-900">Kartu Identitas & Transaksi</p>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center px-3 gap-2">
                <div className="p-1 bg-white border border-gray-200 rounded-md">
                    <QRCode value={qrValue} size={65} level="M" />
                </div>
                <p className="text-[6px] font-mono text-gray-500">{qrValue}</p>

                <div className="mt-2 text-[5px] text-justify text-gray-600 space-y-1 bg-gray-50 p-2 rounded border border-gray-100 leading-tight">
                    <p><strong>Ketentuan:</strong></p>
                    <p>1. Kartu ini adalah identitas resmi dan alat bayar cashless di lingkungan pesantren.</p>
                    <p>2. Tidak boleh dipindahtangankan.</p>
                    <p>3. Jika hilang, segera lapor ke admin.</p>
                </div>
            </div>

            <div className="h-[8mm] bg-green-900 w-full flex flex-col items-center justify-center text-white">
                <p className="text-[5px]">Jl. Pesantren No.1, Kab. Bandung</p>
                <p className="text-[5px]">Telp: 0812-XXXX-XXXX</p>
            </div>
        </div>

      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* STYLE KHUSUS UNTUK PRINT */}
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            .print-container, .print-container * { visibility: visible; }
            .print-container { 
                position: absolute; left: 0; top: 0; width: 100%; 
                display: flex; flex-wrap: wrap; gap: 15px; justify-content: center;
                background: white !important;
            }
            .no-print { display: none !important; }
            .print-card-wrapper { margin-bottom: 10px; page-break-inside: avoid; }
            @page { size: A4 portrait; margin: 10mm; }
          }
        `}
      </style>

      {/* HEADER & FILTER (Akan disembunyikan saat print) */}
      <div className="no-print space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-green-100">
            <div>
                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2"><CreditCard className="text-green-600" /> ID Card Generator</h1>
                <p className="text-xs text-gray-500 mt-1">Buat dan cetak kartu identitas santri yang dilengkapi QR Code transaksi.</p>
            </div>
          </div>

          <Card className="shadow-sm border-t-4 border-t-green-600">
            <CardHeader className="bg-gray-50 border-b border-gray-100">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-700">
                    <Users size={16}/> Filter Data Santri
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600">Kelas</label>
                    <Select value={filterKelas} onValueChange={setFilterKelas}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Pilih Kelas"/></SelectTrigger>
                        <SelectContent>{CLASSES.map(k => <SelectItem key={k} value={String(k)}>Kelas {k}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600">Gender</label>
                    <Select value={filterGender} onValueChange={setFilterGender}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Pilih Gender"/></SelectTrigger>
                        <SelectContent><SelectItem value="ikhwan">Ikhwan</SelectItem><SelectItem value="akhwat">Akhwat</SelectItem></SelectContent>
                    </Select>
                </div>
                <Button onClick={fetchSantris} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Tampilkan Data"}
                </Button>
                {santris.length > 0 && (
                    <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white w-full shadow-md">
                        <Printer className="w-4 h-4 mr-2" /> Print Semua ({santris.length})
                    </Button>
                )}
            </CardContent>
          </Card>
      </div>

      {/* AREA PREVIEW & PRINT */}
      {santris.length > 0 && (
          <div className="bg-gray-200 p-8 rounded-xl shadow-inner border border-gray-300 min-h-[500px] overflow-auto relative">
              
              <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded no-print shadow-sm">
                  Preview Area (A4 Layout)
              </div>

              {/* Kontainer Utama yang akan diprint */}
              <div className="print-container flex flex-wrap gap-6 justify-center max-w-[210mm] mx-auto pt-4">
                  {santris.map(santri => (
                      <IDCard key={santri.id} santri={santri} />
                  ))}
              </div>
          </div>
      )}

      {santris.length === 0 && !loading && (
          <div className="p-12 text-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 no-print">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Pilih kelas dan gender, lalu klik Tampilkan Data.</p>
          </div>
      )}

    </div>
  );
};

export default RFIDCardPrint;
