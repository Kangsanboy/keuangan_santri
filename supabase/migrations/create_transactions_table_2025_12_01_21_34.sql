-- Create transactions table for income and expenses
CREATE TABLE IF NOT EXISTS public.transactions_2025_12_01_21_34 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  category TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.transactions_2025_12_01_21_34 ENABLE ROW LEVEL SECURITY;

-- RLS Policies - All authenticated users can view transactions
CREATE POLICY "Authenticated users can view all transactions" ON public.transactions_2025_12_01_21_34
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admin users can insert, update, delete transactions
CREATE POLICY "Admin users can insert transactions" ON public.transactions_2025_12_01_21_34
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles_2025_12_01_21_34 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can update transactions" ON public.transactions_2025_12_01_21_34
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles_2025_12_01_21_34 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete transactions" ON public.transactions_2025_12_01_21_34
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles_2025_12_01_21_34 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_date_2025_12_01_21_34 ON public.transactions_2025_12_01_21_34(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type_2025_12_01_21_34 ON public.transactions_2025_12_01_21_34(type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_2025_12_01_21_34 ON public.transactions_2025_12_01_21_34(user_id);