import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from "recharts";
import { Wallet, Clock, ArrowUpCircle, ArrowDownCircle, Search, UserCheck, GraduationCap, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const COLORS = ['#22c55e', '#eab308', '#3b82f6', '#ef4444']; 

const PortalYayasan = () => {
  const { toast } = useToast();
  const [nisn, setNisn] = useState("");
  const [loading, setLoading] = useState(false);
  const [santri, setSantri] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("saldo");

  const [saldo, setSaldo] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<any>({
    kbm: [], mengaji: [], sholat: [], ekskul: []
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nisn) return toast({ title: "Gagal", description: "Masukkan NISN terlebih dahulu", variant: "destructive" });

    setLoading(true);
    try {
      const { data: santriData, error: santriErr } = await supabase
        .from('santri_2025_12_01_21_34')
        .select('*')
        .eq('nisn', nisn) // 🔥 SUDAH DIGANTI JADI NISN
        .single();

      if (santriErr || !santriData) throw new Error("Data santri tidak ditemukan. Periksa kembali NISN.");
      setSantri(santriData);

      const { data: trxData } = await supabase
        .from('transactions_2025_12_01_21_34')
        .select('*, merchant:merchant_id(full_name)')
        .eq('santri_id', santriData.id)
        .order('created_at', { ascending: false });

      if (trxData) {
        setTransactions(trxData);
        const totalSaldo = trxData.reduce((acc, curr) => {
          return curr.type === 'income' ? acc + curr.amount : acc - curr.amount;
        }, 0);
        setSaldo(totalSaldo);
      }

      const { data: absData } = await supabase
        .from('attendance_logs')
        .select('status, activity:activities(category, name)')
        .eq('santri_id', santriData.id);

      if (absData) {
        setAttendanceStats(processAttendance(absData));
      }

      toast({ title: "Berhasil", description: `Selamat datang, Wali dari ${santriData.nama_lengkap}` });
    } catch (err: any) {
      toast({ title: "Akses Ditolak", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const processAttendance = (logs: any[]) => {
    const categories = { kbm: [], mengaji: [], sholat: [], ekskul: [] };

    const groupLogs = (catName: string, filterFn: (log: any) => boolean) => {
      const filtered = logs.filter(filterFn);
      const total = filtered.length;
      if (total === 0) return [{ name: 'Belum Ada Data', value: 1, count: 0, total: 0, percent: 0 }];

      const counts = { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 };
      filtered.forEach(l => {
          if (l.status === 'Hadir') counts.Hadir++;
          else if (l.status === 'Izin') counts.Izin++;
          else if (l.status === 'Sakit') counts.Sakit++;
          else counts.Alpa++; 
      });

      return [
        { name: 'Hadir', value: counts.Hadir, count: counts.Hadir, total, percent: ((counts.Hadir/total)*100).toFixed(1) },
        { name: 'Izin', value: counts.Izin, count: counts.Izin, total, percent: ((counts.Izin/total)*100).toFixed(1) },
        { name: 'Sakit', value: counts.Sakit, count: counts.Sakit, total, percent: ((counts.Sakit/total)*100).toFixed(1) },
        { name: 'Alpa', value: counts.Alpa, count: counts.Alpa, total, percent: ((counts.Alpa/total)*100).toFixed(1) },
      ].filter(x => x.value > 0);
    };

    categories.kbm = groupLogs('kbm', l => l.activity?.category === 'pelajaran') as any;
    categories.sholat = groupLogs('sholat', l => l.activity?.category === 'sholat' || l.activity?.name?.toLowerCase().includes('sholat')) as any;
    categories.mengaji = groupLogs('mengaji', l => l.activity?.category === 'mengaji') as any;
    categories.ekskul = groupLogs('ekskul', l => l.activity?.category === 'ekskul') as any;

    return categories;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (data.name === 'Belum Ada Data') return <div className="bg-white p-2 border shadow-sm text-xs">Belum ada data</div>;
      return (
        <div className="bg-white p-3 border rounded shadow-sm text-sm">
          <p className="font-bold text-gray-800">{data.name}</p>
          <p className="text-gray-600">{data.percent}% ({data.count} Pertemuan)</p>
        </div>
      );
    }
    return null;
  };

  const ChartWidget = ({ title, data }: { title: string, data: any[] }) => (
    <Card className="shadow-sm border-blue-100">
        <CardHeader className="pb-2 bg-blue-50/30">
            <CardTitle className="text-sm font-bold text-center text-blue-900">{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[220px] flex flex-col items-center justify-center pt-4">
            {data[0].name === 'Belum Ada Data' ? (
                <div className="text-gray-400 text-sm italic">Data belum tersedia</div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.name === 'Hadir' ? '#22c55e' : entry.name === 'Izin' ? '#eab308' : entry.name === 'Sakit' ? '#3b82f6' : '#ef4444'} />
                            ))}
                        </Pie>
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}/>
                    </PieChart>
                </ResponsiveContainer>
            )}
        </CardContent>
    </Card>
  );

  if (!santri) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
            <Building className="w-16 h-16 text-blue-700 mx-auto mb-4" />
            <h1 className="text-2xl font-extrabold text-gray-900 uppercase tracking-wider">Portal Wali Santri</h1>
            <p className="text-gray-500">Yayasan Pendidikan Al-Jawahir</p>
        </div>
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-blue-600">
          <CardHeader>
            <CardTitle className="text-center text-lg">Cek Saldo & Kehadiran</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Nomor Induk Santri Nasional (NISN)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input 
                    placeholder="Masukkan NISN santri..." 
                    className="pl-10 h-12 text-lg tracking-widest font-mono"
                    value={nisn}
                    onChange={(e) => setNisn(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-lg font-bold" disabled={loading}>
                {loading ? "Mencari Data..." : "Cek Data Santri"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-blue-700 text-white p-6 md:p-8 rounded-b-[2rem] shadow-md">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/50">
                    <UserCheck className="w-8 h-8 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-extrabold tracking-wide">{santri.nama_lengkap}</h2>
                    <div className="flex gap-3 text-blue-100 text-sm mt-1">
                        <span className="flex items-center gap-1"><GraduationCap size={14}/> Kelas {santri.kelas}</span>
                        <span>•</span>
                        <span className="font-mono tracking-wider">NISN: {santri.nisn}</span> {/* 🔥 SUDAH DIGANTI JADI NISN */}
                    </div>
                </div>
            </div>
            <Button variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/20" onClick={() => setSantri(null)}>
                Keluar
            </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto mt-6 px-4">
        <Tabs defaultValue="saldo" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-white border shadow-sm h-12">
                <TabsTrigger value="saldo" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-base font-bold rounded-md">Tabungan & Saldo</TabsTrigger>
                <TabsTrigger value="absen" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-base font-bold rounded-md">Rekap Absensi</TabsTrigger>
            </TabsList>

            <TabsContent value="saldo" className="space-y-6 animate-in fade-in duration-300">
                <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white border-0 shadow-lg">
                    <CardContent className="p-6 md:p-8 flex flex-col items-center text-center">
                        <p className="text-blue-200 font-medium mb-2 flex items-center gap-2"><Wallet size={18}/> Saldo Santri Saat Ini</p>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight">Rp {saldo.toLocaleString('id-ID')}</h1>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-gray-200">
                    <CardHeader className="bg-gray-50 border-b pb-3">
                        <CardTitle className="text-lg text-gray-800 flex items-center gap-2"><Clock size={18} className="text-blue-600"/> Riwayat Transaksi</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {transactions.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">Belum ada riwayat transaksi.</div>
                        ) : (
                            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                                {transactions.map((trx) => (
                                    <div key={trx.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            {trx.type === 'income' ? <ArrowUpCircle className="text-green-500 w-8 h-8" /> : <ArrowDownCircle className="text-red-500 w-8 h-8" />}
                                            <div>
                                                <p className="font-bold text-gray-800 text-sm">{trx.type === 'income' ? 'Setor Tunai' : 'Pengeluaran/Jajan'}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">{new Date(trx.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
                                                <p className="text-[10px] text-gray-400 mt-1 italic">{trx.description || (trx.merchant ? `Transaksi di ${trx.merchant.full_name}` : "-")}</p>
                                            </div>
                                        </div>
                                        <div className={`font-black text-sm md:text-base ${trx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                            {trx.type === 'income' ? '+' : '-'} Rp {trx.amount.toLocaleString("id-ID")}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="absen" className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800 text-sm mb-4">
                    <p>Berikut adalah rekapitulasi kehadiran ananda berdasarkan data tapping kartu di area pesantren dan absensi guru di kelas.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ChartWidget title="Kegiatan Belajar Mengajar (KBM)" data={attendanceStats.kbm} />
                    <ChartWidget title="Pengajian Kitab / Tahfidz" data={attendanceStats.mengaji} />
                    <ChartWidget title="Sholat Berjamaah" data={attendanceStats.sholat} />
                    <ChartWidget title="Ekstrakurikuler" data={attendanceStats.ekskul} />
                </div>
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PortalYayasan;
