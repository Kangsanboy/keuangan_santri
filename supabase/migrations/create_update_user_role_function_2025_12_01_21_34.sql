-- Create function to update user role (only admin can promote users)
CREATE OR REPLACE FUNCTION public.update_user_role_2025_12_01_21_34(
  target_user_id UUID,
  new_role TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles_2025_12_01_21_34 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admin users can update roles';
  END IF;

  -- Validate new role
  IF new_role NOT IN ('admin', 'viewer') THEN
    RAISE EXCEPTION 'Invalid role. Must be admin or viewer';
  END IF;

  -- Update the user role
  UPDATE public.user_profiles_2025_12_01_21_34 
  SET role = new_role, updated_at = NOW()
  WHERE user_id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_user_role_2025_12_01_21_34(UUID, TEXT) TO authenticated;