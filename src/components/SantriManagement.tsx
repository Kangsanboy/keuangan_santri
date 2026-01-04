import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Users } from 'lucide-react';

interface Santri {
  id: string;
  nama_lengkap: string;
  kelas: number;
  gender: 'ikhwan' | 'akhwat';
  nis: string | null;
  status: 'aktif' | 'nonaktif';
}

const SantriManagement: React.FC = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    nama_lengkap: '',
    kelas: 7,
    gender: 'ikhwan' as 'ikhwan' | 'akhwat',
    nis: '',
  });

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

  useEffect(() => {
    fetchSantri();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAdmin) {
      toast({
        title: "Akses Ditolak",
        description: "Hanya admin yang dapat menambah santri",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('santri_2025_12_01_21_34')
        .insert([
          {
            nama_lengkap: formData.nama_lengkap,
            kelas: formData.kelas,
            gender: formData.gender,
            nis: formData.nis || null,
          }
        ]);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Data santri berhasil ditambahkan",
      });

      // Reset form
      setFormData({
        nama_lengkap: '',
        kelas: 7,
        gender: 'ikhwan',
        nis: '',
      });

      // Refresh santri list
      fetchSantri();
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

  const handleFileUpload = async () => {
    if (!selectedFile || !isAdmin) {
      toast({
        title: "Error",
        description: "Pilih file CSV terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const text = await selectedFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header if exists
      const dataLines = lines.slice(1);
      
      const santriData = dataLines.map(line => {
        const [nama_lengkap, kelas, gender, nis] = line.split(',').map(item => item.trim());
        
        return {
          nama_lengkap,
          kelas: parseInt(kelas),
          gender: gender.toLowerCase() as 'ikhwan' | 'akhwat',
          nis: nis || null,
        };
      }).filter(item => item.nama_lengkap && item.kelas && item.gender);

      if (santriData.length === 0) {
        throw new Error('Tidak ada data valid dalam file');
      }

      const handleDeleteSantri = async (santriId: string, namaLengkap: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data santri "${namaLengkap}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('santri_2025_12_01_21_34')
        .delete()
        .eq('id', santriId);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: `Data santri "${namaLengkap}" berhasil dihapus`,
      });

      // Refresh santri list
      fetchSantri();
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

      const { error } = await supabase
        .from('santri_2025_12_01_21_34')
        .insert(santriData);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: `${santriData.length} data santri berhasil diupload`,
      });

      setSelectedFile(null);
      fetchSantri();
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

  const getSantriByClass = (kelas: number, gender: 'ikhwan' | 'akhwat') => {
    return santriList.filter(s => s.kelas === kelas && s.gender === gender);
  };

  const getTotalSantri = () => {
    return santriList.length;
  };

  const getSantriByGender = (gender: 'ikhwan' | 'akhwat') => {
    return santriList.filter(s => s.gender === gender).length;
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Data Santri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Hanya admin yang dapat mengelola data santri
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Santri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {getTotalSantri()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ikhwan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {getSantriByGender('ikhwan')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Akhwat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">
              {getSantriByGender('akhwat')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Data Santri
          </CardTitle>
          <CardDescription>
            Upload file CSV dengan format: Nama Lengkap, Kelas, Gender (ikhwan/akhwat), NIS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">File CSV</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <p className="text-sm text-muted-foreground">
                Contoh format CSV:<br />
                Nama Lengkap,Kelas,Gender,NIS<br />
                Ahmad Fauzi,7,ikhwan,2024001<br />
                Siti Aisyah,8,akhwat,2024002
              </p>
            </div>
            <Button 
              onClick={handleFileUpload} 
              disabled={!selectedFile || isLoading}
              className="w-full"
            >
              {isLoading ? 'Mengupload...' : 'Upload Data Santri'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Manual Add Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tambah Santri Manual
          </CardTitle>
          <CardDescription>
            Tambahkan data santri satu per satu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nama">Nama Lengkap</Label>
                <Input
                  id="nama"
                  type="text"
                  placeholder="Masukkan nama lengkap"
                  value={formData.nama_lengkap}
                  onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nis">NIS (Opsional)</Label>
                <Input
                  id="nis"
                  type="text"
                  placeholder="Masukkan NIS"
                  value={formData.nis}
                  onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kelas">Kelas</Label>
                <Select 
                  value={formData.kelas.toString()} 
                  onValueChange={(value) => setFormData({ ...formData, kelas: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[7, 8, 9, 10, 11, 12].map((kelas) => (
                      <SelectItem key={kelas} value={kelas.toString()}>
                        Kelas {kelas}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select 
                  value={formData.gender} 
                  onValueChange={(value: 'ikhwan' | 'akhwat') => setFormData({ ...formData, gender: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ikhwan">Ikhwan</SelectItem>
                    <SelectItem value="akhwat">Akhwat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Menyimpan...' : 'Tambah Santri'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Santri List by Class and Gender */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ikhwan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Santri Ikhwan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[7, 8, 9, 10, 11, 12].map((kelas) => {
                const santriKelas = getSantriByClass(kelas, 'ikhwan');
                return (
                  <div key={`ikhwan-${kelas}`} className="border rounded-lg p-3">
                    <h4 className="font-medium mb-2">Kelas {kelas} ({santriKelas.length} santri)</h4>
                    {santriKelas.length > 0 ? (
                      <div className="space-y-1">
                        {santriKelas.map((santri) => (
                          <div key={santri.id} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {santri.nama_lengkap} {santri.nis && `(${santri.nis})`}
                            </span>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteSantri(santri.id, santri.nama_lengkap)}
                              className="h-6 px-2 text-xs"
                            >
                              Hapus
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Belum ada data</div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Akhwat */}
        <Card>
          <CardHeader>
            <CardTitle className="text-pink-600">Santri Akhwat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[7, 8, 9, 10, 11, 12].map((kelas) => {
                const santriKelas = getSantriByClass(kelas, 'akhwat');
                return (
                  <div key={`akhwat-${kelas}`} className="border rounded-lg p-3">
                    <h4 className="font-medium mb-2">Kelas {kelas} ({santriKelas.length} santri)</h4>
                    {santriKelas.length > 0 ? (
                      <div className="space-y-1">
                        {santriKelas.map((santri) => (
                          <div key={santri.id} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {santri.nama_lengkap} {santri.nis && `(${santri.nis})`}
                            </span>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteSantri(santri.id, santri.nama_lengkap)}
                              className="h-6 px-2 text-xs"
                            >
                              Hapus
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Belum ada data</div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SantriManagement;