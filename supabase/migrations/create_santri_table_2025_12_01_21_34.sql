-- Create santri table for student data management
CREATE TABLE IF NOT EXISTS public.santri_2025_12_01_21_34 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_lengkap TEXT NOT NULL,
  kelas INTEGER NOT NULL CHECK (kelas IN (7, 8, 9, 10, 11, 12)),
  gender TEXT NOT NULL CHECK (gender IN ('ikhwan', 'akhwat')),
  nis TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('aktif', 'nonaktif')) DEFAULT 'aktif',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.santri_2025_12_01_21_34 ENABLE ROW LEVEL SECURITY;

-- RLS Policies - All authenticated users can view santri data
CREATE POLICY "Authenticated users can view santri" ON public.santri_2025_12_01_21_34
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admin users can insert, update, delete santri data
CREATE POLICY "Admin users can insert santri" ON public.santri_2025_12_01_21_34
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles_2025_12_01_21_34 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can update santri" ON public.santri_2025_12_01_21_34
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles_2025_12_01_21_34 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete santri" ON public.santri_2025_12_01_21_34
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles_2025_12_01_21_34 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_santri_kelas_gender_2025_12_01_21_34 ON public.santri_2025_12_01_21_34(kelas, gender);
CREATE INDEX IF NOT EXISTS idx_santri_status_2025_12_01_21_34 ON public.santri_2025_12_01_21_34(status);
CREATE INDEX IF NOT EXISTS idx_santri_nis_2025_12_01_21_34 ON public.santri_2025_12_01_21_34(nis);