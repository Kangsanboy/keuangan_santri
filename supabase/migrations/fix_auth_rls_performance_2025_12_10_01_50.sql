-- Fix Auth RLS Initialization Plan performance issues
-- Optimize all RLS policies by using (select auth.function()) instead of auth.function()

-- 1. Fix user_profiles table RLS policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles_2025_12_01_21_34;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles_2025_12_01_21_34;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles_2025_12_01_21_34;

-- Recreate optimized policies for user_profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles_2025_12_01_21_34
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles_2025_12_01_21_34
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own profile" ON public.user_profiles_2025_12_01_21_34
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- 2. Fix transactions table RLS policies
DROP POLICY IF EXISTS "Authenticated users can view all transactions" ON public.transactions_2025_12_01_21_34;
DROP POLICY IF EXISTS "Admin users can insert transactions" ON public.transactions_2025_12_01_21_34;
DROP POLICY IF EXISTS "Admin users can update transactions" ON public.transactions_2025_12_01_21_34;
DROP POLICY IF EXISTS "Admin users can delete transactions" ON public.transactions_2025_12_01_21_34;

-- Recreate optimized policies for transactions
CREATE POLICY "Authenticated users can view all transactions" ON public.transactions_2025_12_01_21_34
  FOR SELECT USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Admin users can insert transactions" ON public.transactions_2025_12_01_21_34
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles_2025_12_01_21_34 
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can update transactions" ON public.transactions_2025_12_01_21_34
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles_2025_12_01_21_34 
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete transactions" ON public.transactions_2025_12_01_21_34
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles_2025_12_01_21_34 
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

-- 3. Fix santri table RLS policies
DROP POLICY IF EXISTS "Authenticated users can view santri" ON public.santri_2025_12_01_21_34;
DROP POLICY IF EXISTS "Admin users can insert santri" ON public.santri_2025_12_01_21_34;
DROP POLICY IF EXISTS "Admin users can update santri" ON public.santri_2025_12_01_21_34;
DROP POLICY IF EXISTS "Admin users can delete santri" ON public.santri_2025_12_01_21_34;

-- Recreate optimized policies for santri
CREATE POLICY "Authenticated users can view santri" ON public.santri_2025_12_01_21_34
  FOR SELECT USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Admin users can insert santri" ON public.santri_2025_12_01_21_34
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles_2025_12_01_21_34 
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can update santri" ON public.santri_2025_12_01_21_34
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles_2025_12_01_21_34 
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete santri" ON public.santri_2025_12_01_21_34
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles_2025_12_01_21_34 
      WHERE user_id = (select auth.uid()) AND role = 'admin'
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "Users can view their own profile" ON public.user_profiles_2025_12_01_21_34 IS 'Optimized RLS policy using (select auth.uid()) for better performance';
COMMENT ON POLICY "Authenticated users can view all transactions" ON public.transactions_2025_12_01_21_34 IS 'Optimized RLS policy using (select auth.role()) for better performance';
COMMENT ON POLICY "Authenticated users can view santri" ON public.santri_2025_12_01_21_34 IS 'Optimized RLS policy using (select auth.role()) for better performance';