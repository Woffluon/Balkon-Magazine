-- Migration: Enable RLS and Create Security Policies
-- Created: 2024-11-20
-- Purpose: Implement Row Level Security policies for magazines table and create user_profiles table
-- Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6

-- ============================================================================
-- 1. Create user_profiles table for role-based access control
-- ============================================================================

-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id),
  CONSTRAINT user_profiles_email_unique UNIQUE (email)
);

-- Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY IF NOT EXISTS "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Only admins can read all profiles
CREATE POLICY IF NOT EXISTS "Admins can read all profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Only admins can update profiles
CREATE POLICY IF NOT EXISTS "Admins can update profiles"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 2. Drop existing policies on magazines table (if any)
-- ============================================================================

-- Drop old policies to replace with new role-based policies
DROP POLICY IF EXISTS "Anon can select published magazines" ON public.magazines;
DROP POLICY IF EXISTS "Authenticated can full access magazines" ON public.magazines;

-- ============================================================================
-- 3. Enable RLS on magazines table
-- ============================================================================

-- Enable RLS (idempotent - safe to run multiple times)
ALTER TABLE public.magazines ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. Create public SELECT policy (Requirement 14.1, 14.2)
-- ============================================================================

-- Policy: Anonymous and authenticated users can read only published magazines
CREATE POLICY "Public can select published magazines"
  ON public.magazines
  FOR SELECT
  TO public
  USING (is_published = true);

-- ============================================================================
-- 5. Create admin INSERT policy (Requirement 14.3)
-- ============================================================================

-- Policy: Only users with admin role can insert magazines
CREATE POLICY "Admins can insert magazines"
  ON public.magazines
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 6. Create admin UPDATE policy (Requirement 14.4)
-- ============================================================================

-- Policy: Only users with admin role can update magazines
CREATE POLICY "Admins can update magazines"
  ON public.magazines
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 7. Create admin DELETE policy (Requirement 14.5)
-- ============================================================================

-- Policy: Only users with admin role can delete magazines
CREATE POLICY "Admins can delete magazines"
  ON public.magazines
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 8. Create helper function to automatically create user profile on signup
-- ============================================================================

-- Function to create user profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, role)
  VALUES (NEW.id, NEW.email, 'user')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 9. Grant necessary permissions
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant SELECT on magazines to anonymous users (via RLS policy)
GRANT SELECT ON public.magazines TO anon, authenticated;

-- Grant all operations on magazines to authenticated users (via RLS policy)
GRANT INSERT, UPDATE, DELETE ON public.magazines TO authenticated;

-- Grant SELECT on user_profiles to authenticated users (via RLS policy)
GRANT SELECT ON public.user_profiles TO authenticated;

-- Grant UPDATE on user_profiles to authenticated users (via RLS policy)
GRANT UPDATE ON public.user_profiles TO authenticated;

-- ============================================================================
-- NOTES FOR DEPLOYMENT
-- ============================================================================

-- After running this migration:
-- 1. Existing authenticated users will need to be added to user_profiles table
-- 2. At least one user should be granted 'admin' role:
--    UPDATE public.user_profiles SET role = 'admin' WHERE email = 'your-admin@example.com';
-- 3. The authorization service (src/lib/services/authorization.ts) should be updated
--    to uncomment the user_profiles query logic
-- 4. Test that:
--    - Anonymous users can only see published magazines
--    - Non-admin authenticated users cannot create/update/delete magazines
--    - Admin users can perform all operations
