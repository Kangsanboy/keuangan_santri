-- Add santri_id column to transactions table
ALTER TABLE public.transactions_2025_12_01_21_34 
ADD COLUMN IF NOT EXISTS santri_id UUID REFERENCES public.santri_2025_12_01_21_34(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_santri_2025_12_01_21_34 ON public.transactions_2025_12_01_21_34(santri_id);

-- Create view for transaction summary by santri
CREATE OR REPLACE VIEW public.santri_balance_summary_2025_12_01_21_34 AS
SELECT 
  s.id as santri_id,
  s.nama_lengkap,
  s.kelas,
  s.gender,
  s.nis,
  COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
  COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expense,
  COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0) as balance
FROM public.santri_2025_12_01_21_34 s
LEFT JOIN public.transactions_2025_12_01_21_34 t ON s.id = t.santri_id
WHERE s.status = 'aktif'
GROUP BY s.id, s.nama_lengkap, s.kelas, s.gender, s.nis
ORDER BY s.kelas, s.gender, s.nama_lengkap;