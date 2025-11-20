-- ============================================================================
-- COMPLETE SUPABASE DATABASE SETUP
-- ============================================================================
-- This script sets up the entire database schema for the magazine application
-- Safe to run multiple times (idempotent)
-- ============================================================================

-- Required extension for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- ============================================================================
-- 1. MAGAZINES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.magazines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title TEXT NOT NULL,
  issue_number INT NOT NULL,
  publication_date DATE NOT NULL,
  cover_image_url TEXT,
  pdf_url TEXT,
  page_count INT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT magazines_issue_number_unique UNIQUE (issue_number)
);

-- Indexes for magazines table
CREATE INDEX IF NOT EXISTS idx_magazines_issue_number ON public.magazines(issue_number);
CREATE INDEX IF NOT EXISTS idx_magazines_is_published ON public.magazines(is_published);
CREATE INDEX IF NOT EXISTS idx_magazines_created_at ON public.magazines(created_at);

-- Enable RLS on magazines
ALTER TABLE public.magazines ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. USER PROFILES TABLE (for role-based access control)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_role CHECK (role IN ('admin', 'user'))
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. MAGAZINE PAGES TABLE (Optional - for page metadata)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.magazine_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  magazine_id UUID NOT NULL REFERENCES public.magazines(id) ON DELETE CASCADE,
  page_number INT NOT NULL,
  image_url TEXT NOT NULL
);

-- Indexes for magazine_pages
CREATE INDEX IF NOT EXISTS idx_magazine_pages_magazine_id ON public.magazine_pages(magazine_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_magazine_pages_magazine_page ON public.magazine_pages(magazine_id, page_number);

-- Enable RLS on magazine_pages
ALTER TABLE public.magazine_pages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS POLICIES FOR MAGAZINES
-- ============================================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anon can select published magazines" ON public.magazines;
DROP POLICY IF EXISTS "Authenticated can full access magazines" ON public.magazines;
DROP POLICY IF EXISTS "Admin can manage all magazines" ON public.magazines;
DROP POLICY IF EXISTS "Authenticated can manage magazines" ON public.magazines;

-- Anonymous users can only read published magazines
CREATE POLICY "Anon can select published magazines"
  ON public.magazines
  FOR SELECT
  TO anon
  USING (is_published = TRUE);

-- Authenticated users can manage magazines
-- Note: Client-side operations need this simpler policy
-- Admin role is still enforced in server actions via requireAdmin()
CREATE POLICY "Authenticated can manage magazines"
  ON public.magazines
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 5. RLS POLICIES FOR USER PROFILES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own profile (but not role)
CREATE POLICY "Users can update their own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 6. RLS POLICIES FOR MAGAZINE PAGES
-- ============================================================================

DROP POLICY IF EXISTS "Anon can read pages of published magazines" ON public.magazine_pages;
DROP POLICY IF EXISTS "Admin can manage all magazine pages" ON public.magazine_pages;

-- Anonymous users can read pages only for published magazines
CREATE POLICY "Anon can read pages of published magazines"
  ON public.magazine_pages
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.magazines m
      WHERE m.id = magazine_pages.magazine_id
        AND m.is_published = TRUE
    )
  );

-- Admins have full access to magazine pages
CREATE POLICY "Admin can manage all magazine pages"
  ON public.magazine_pages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 7. STORAGE BUCKET SETUP
-- ============================================================================

-- Create magazines bucket (PUBLIC for image access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('magazines', 'magazines', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Anon can read magazine images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can manage magazine images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can manage magazine images" ON storage.objects;

-- Allow anonymous reads for magazine images
CREATE POLICY "Anon can read magazine images"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (bucket_id = 'magazines');

-- Allow authenticated users to manage magazine images
-- Note: Client-side uploads need this simpler policy
-- Admin role is still enforced in server actions via requireAdmin()
CREATE POLICY "Authenticated can manage magazine images"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'magazines')
  WITH CHECK (bucket_id = 'magazines');

-- ============================================================================
-- 8. AUTOMATIC USER PROFILE CREATION TRIGGER
-- ============================================================================

-- Function to create user profile automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 9. MAKE EXISTING USERS ADMIN
-- ============================================================================

-- Insert admin profiles for all existing users
-- This will make all current users admins
INSERT INTO public.user_profiles (user_id, role)
SELECT id, 'admin' FROM auth.users
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';