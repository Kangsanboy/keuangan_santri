import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, Filter, User, Download, FileSpreadsheet, TrendingDown } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string | null;
  transaction_date: string;
  created_at: string;
  santri_id: string | null;
  santri?: {
    nama_lengkap: string;
    kelas: number;
    gender: string;
    nis: string | null;
  };
}

interface Santri {
  id: string;
  nama_lengkap: string;
  kelas: number;
  gender: 'ikhwan' | 'akhwat';
  nis: string | null;
}

interface SantriBalance {
  santri_id: string;
  nama_lengkap: string;
  kelas: number;
  gender: string;
  nis: string | null;
  total_income: number;
  total_expense: number;
  balance: number;
}

interface DailyExpense {
  date: string;
  total_expense: number;
  transaction_count: number;
}

const TransactionForm: React.FC = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [santriBalances, setSantriBalances] = useState<SantriBalance[]>([]);
  const [dailyExpenses, setDailyExpenses] = useState<DailyExpense[]>([]);

  // Filter states
  const [selectedKelas, setSelectedKelas] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [selectedSantri, setSelectedSantri] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense',
    amount: '',
    description: '',
    category: '',
    transaction_date: new Date().toISOString().split('T')[0],
    santri_id: '',
  });

  const expenseCategories = [
    'Jajan',
    'Lainnya'
  ];

  const fetchSantri = async () => {
    try {
      const { data, error } = await supabase
        .from('santri_2025_12_01_21_34')
        .select('*')
        .eq('status', 'aktif')
        .order('kelas')
        .order('gender')
        .order('nama_lengkap');

      if (error) throw error;
      setSantriList(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal memuat data santri",
        variant: "destructive",
      });
    }
  };

  const fetchSantriBalances = async () => {
    try {
      const { data, error } = await supabase
        .from('santri_balance_summary_2025_12_01_21_34')
        .select('*');

      if (error) throw error;
      setSantriBalances(data || []);
    } catch (error: any) {
      console.error('Error fetching santri balances:', error);
    }
  };

  const fetchDailyExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions_2025_12_01_21_34')
        .select('transaction_date, amount')
        .eq('type', 'expense')
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      // Group by date and calculate totals
      const expensesByDate = (data || []).reduce((acc: Record<string, DailyExpense>, transaction) => {
        const date = transaction.transaction_date;
        if (!acc[date]) {
          acc[date] = {
            date,
            total_expense: 0,
            transaction_count: 0
          };
        }
        acc[date].total_expense += transaction.amount;
        acc[date].transaction_count += 1;
        return acc;
      }, {});

      const dailyExpensesList = Object.values(expensesByDate).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setDailyExpenses(dailyExpensesList);
    } catch (error: any) {
      console.error('Error fetching daily expenses:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions_2025_12_01_21_34')
        .select(`
          *,
          santri:santri_id (
            nama_lengkap,
            kelas,
            gender,
            nis
          )
        `)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal memuat data transaksi",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchSantri();
    fetchTransactions();
    fetchSantriBalances();
    fetchDailyExpenses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAdmin) {
      toast({
        title: "Akses Ditolak",
        description: "Hanya admin yang dapat menambah transaksi",
        variant: "destructive",
      });
      return;
    }

    if (!formData.santri_id) {
      toast({
        title: "Error",
        description: "Pilih santri terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('transactions_2025_12_01_21_34')
        .insert([
          {
            type: formData.type,
            amount: parseFloat(formData.amount),
            description: formData.description,
            category: formData.category || null,
            transaction_date: formData.transaction_date,
            santri_id: formData.santri_id,
            user_id: (await supabase.auth.getUser()).data.user?.id,
          }
        ]);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: `${formData.type === 'income' ? 'Pemasukan' : 'Pengeluaran'} berhasil ditambahkan`,
      });

      // Reset form
      setFormData({
        type: 'income',
        amount: '',
        description: '',
        category: '',
        transaction_date: new Date().toISOString().split('T')[0],
        santri_id: '',
      });

      // Refresh data
      fetchTransactions();
      fetchSantriBalances();
      fetchDailyExpenses();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  const getTotalBalance = () => {
    return santriBalances.reduce((total, santri) => total + santri.balance, 0);
  };

  const getTotalIncome = () => {
    return santriBalances.reduce((total, santri) => total + santri.total_income, 0);
  };

  const getTotalExpense = () => {
    return santriBalances.reduce((total, santri) => total + santri.total_expense, 0);
  };

  // Filter functions
  const getFilteredSantri = () => {
    return santriList.filter(santri => {
      if (selectedKelas !== 'all' && santri.kelas.toString() !== selectedKelas) return false;
      if (selectedGender !== 'all' && santri.gender !== selectedGender) return false;
      return true;
    });
  };

  const getFilteredSantriBalances = () => {
    return santriBalances.filter(santri => {
      if (selectedKelas !== 'all' && santri.kelas.toString() !== selectedKelas) return false;
      if (selectedGender !== 'all' && santri.gender !== selectedGender) return false;
      if (selectedSantri !== 'all' && santri.santri_id !== selectedSantri) return false;
      return true;
    });
  };

  const getFilteredTransactions = () => {
    return transactions.filter(transaction => {
      if (!transaction.santri) return false;
      if (selectedKelas !== 'all' && transaction.santri.kelas.toString() !== selectedKelas) return false;
      if (selectedGender !== 'all' && transaction.santri.gender !== selectedGender) return false;
      if (selectedSantri !== 'all' && transaction.santri_id !== selectedSantri) return false;
      return true;
    });
  };

  const getMonthlyTransactions = () => {
    return transactions.filter(transaction => {
      const transactionMonth = transaction.transaction_date.slice(0, 7);
      return transactionMonth === selectedMonth;
    });
  };

  const downloadExcel = () => {
    const monthlyTransactions = getMonthlyTransactions();
    
    if (monthlyTransactions.length === 0) {
      toast({
        title: "Tidak Ada Data",
        description: "Tidak ada transaksi pada bulan yang dipilih",
        variant: "destructive",
      });
      return;
    }

    // Prepare data for Excel
    const excelData = monthlyTransactions.map((transaction, index) => ({
      'No': index + 1,
      'Tanggal': new Date(transaction.transaction_date).toLocaleDateString('id-ID'),
      'Nama Santri': transaction.santri?.nama_lengkap || 'N/A',
      'Kelas': transaction.santri?.kelas || 'N/A',
      'Gender': transaction.santri?.gender || 'N/A',
      'NIS': transaction.santri?.nis || 'N/A',
      'Jenis': transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      'Kategori': transaction.category || 'N/A',
      'Keterangan': transaction.description,
      'Jumlah': transaction.amount,
      'Waktu Input': new Date(transaction.created_at).toLocaleString('id-ID')
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const colWidths = [
      { wch: 5 },   // No
      { wch: 12 },  // Tanggal
      { wch: 20 },  // Nama Santri
      { wch: 8 },   // Kelas
      { wch: 10 },  // Gender
      { wch: 12 },  // NIS
      { wch: 12 },  // Jenis
      { wch: 12 },  // Kategori
      { wch: 30 },  // Keterangan
      { wch: 15 },  // Jumlah
      { wch: 18 }   // Waktu Input
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');

    // Generate filename
    const monthName = new Date(selectedMonth + '-01').toLocaleDateString('id-ID', { 
      year: 'numeric', 
      month: 'long' 
    });
    const filename = `Laporan_Keuangan_${monthName.replace(' ', '_')}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);

    toast({
      title: "Berhasil",
      description: `File Excel berhasil diunduh: ${filename}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Total Keseluruhan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getTotalBalance() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(getTotalBalance())}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pemasukan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(getTotalIncome())}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(getTotalExpense())}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pengeluaran Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(
                dailyExpenses.find(d => d.date === new Date().toISOString().split('T')[0])?.total_expense || 0
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Expenses Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Pengeluaran Harian (7 Hari Terakhir)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {dailyExpenses.slice(0, 7).map((daily) => (
              <div key={daily.date} className="text-center p-3 border rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">
                  {new Date(daily.date).toLocaleDateString('id-ID', { 
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                  })}
                </div>
                <div className="font-bold text-red-600 text-sm">
                  {formatCurrency(daily.total_expense)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {daily.transaction_count} transaksi
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Download Excel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Download Laporan Excel
          </CardTitle>
          <CardDescription>
            Unduh laporan keuangan bulanan dalam format Excel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <Label>Pilih Bulan</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-48"
              />
            </div>
            <Button 
              onClick={downloadExcel}
              className="flex items-center gap-2 mt-6"
              variant="outline"
            >
              <Download className="h-4 w-4" />
              Download Excel
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Total transaksi bulan {new Date(selectedMonth + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}: {getMonthlyTransactions().length} transaksi
          </p>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Kelas</Label>
              <Select value={selectedKelas} onValueChange={setSelectedKelas}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelas</SelectItem>
                  {[7, 8, 9, 10, 11, 12].map((kelas) => (
                    <SelectItem key={kelas} value={kelas.toString()}>
                      Kelas {kelas}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={selectedGender} onValueChange={setSelectedGender}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="ikhwan">Ikhwan</SelectItem>
                  <SelectItem value="akhwat">Akhwat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Santri</Label>
              <Select value={selectedSantri} onValueChange={setSelectedSantri}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Santri</SelectItem>
                  {getFilteredSantri().map((santri) => (
                    <SelectItem key={santri.id} value={santri.id}>
                      {santri.nama_lengkap} (Kelas {santri.kelas} {santri.gender})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedKelas('all');
                  setSelectedGender('all');
                  setSelectedSantri('all');
                }}
                className="w-full"
              >
                Reset Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Form - Only for Admin */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Tambah Transaksi
            </CardTitle>
            <CardDescription>
              Tambahkan pemasukan atau pengeluaran untuk santri
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="santri">Pilih Santri</Label>
                  <Select 
                    value={formData.santri_id} 
                    onValueChange={(value) => setFormData({ ...formData, santri_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih santri" />
                    </SelectTrigger>
                    <SelectContent>
                      {santriList.map((santri) => (
                        <SelectItem key={santri.id} value={santri.id}>
                          {santri.nama_lengkap} (Kelas {santri.kelas} {santri.gender})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Jenis Transaksi</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value: 'income' | 'expense') => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Pemasukan (Setoran)</SelectItem>
                      <SelectItem value="expense">Pengeluaran</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Jumlah (Rp)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Tanggal Transaksi</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="date"
                      type="date"
                      value={formData.transaction_date}
                      onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Keterangan</Label>
                <Textarea
                  id="description"
                  placeholder="Masukkan keterangan transaksi..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              {formData.type === 'expense' && (
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori Pengeluaran</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Menyimpan...' : 'Simpan Transaksi'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Santri Balance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Saldo Per Santri
          </CardTitle>
          <CardDescription>
            Ringkasan saldo masing-masing santri
          </CardDescription>
        </CardHeader>
        <CardContent>
          {getFilteredSantriBalances().length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada data santri atau tidak ada yang sesuai filter
            </div>
          ) : (
            <div className="space-y-3">
              {getFilteredSantriBalances().map((santri) => (
                <div
                  key={santri.santri_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{santri.nama_lengkap}</span>
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        Kelas {santri.kelas} {santri.gender}
                      </span>
                      {santri.nis && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                          {santri.nis}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Pemasukan: {formatCurrency(santri.total_income)} | 
                      Pengeluaran: {formatCurrency(santri.total_expense)}
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${
                    santri.balance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(santri.balance)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Transaction History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Transaksi Detail</CardTitle>
          <CardDescription>
            Tabel detail semua transaksi seperti format Excel
          </CardDescription>
        </CardHeader>
        <CardContent>
          {getFilteredTransactions().length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada transaksi atau tidak ada yang sesuai filter
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Nama Santri</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>NIS</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredTransactions().map((transaction, index) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        {new Date(transaction.transaction_date).toLocaleDateString('id-ID')}
                      </TableCell>
                      <TableCell>{transaction.santri?.nama_lengkap || 'N/A'}</TableCell>
                      <TableCell>{transaction.santri?.kelas || 'N/A'}</TableCell>
                      <TableCell className="capitalize">{transaction.santri?.gender || 'N/A'}</TableCell>
                      <TableCell>{transaction.santri?.nis || 'N/A'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          transaction.type === 'income' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                        </span>
                      </TableCell>
                      <TableCell>{transaction.category || 'N/A'}</TableCell>
                      <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                      <TableCell className={`text-right font-medium ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionForm;