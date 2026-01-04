-- Fix security definer view issue
-- Drop the existing view with SECURITY DEFINER
DROP VIEW IF EXISTS public.santri_balance_summary_2025_12_01_21_34;

-- Recreate the view without SECURITY DEFINER (uses SECURITY INVOKER by default)
CREATE VIEW public.santri_balance_summary_2025_12_01_21_34 AS
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

-- Grant appropriate permissions to authenticated users
GRANT SELECT ON public.santri_balance_summary_2025_12_01_21_34 TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.santri_balance_summary_2025_12_01_21_34 IS 'View untuk ringkasan saldo santri - menggunakan SECURITY INVOKER untuk keamanan yang lebih baik';