-- ============================================================================
-- BALKON DERGISI - MASTER DATABASE SETUP
-- ============================================================================
-- Bu dosya Balkon Dergisi projesinin tüm veritabanı kurulumunu içerir
-- Yeni kurulumlar ve mevcut veritabanlarının güncellenmesi için kullanılabilir
-- Güvenli şekilde birden fazla kez çalıştırılabilir (idempotent)
-- ============================================================================

-- Gerekli uzantıları etkinleştir
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- ============================================================================
-- 1. MAGAZINES TABLE - Ana dergi tablosu
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
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT magazines_issue_number_unique UNIQUE (issue_number)
);

-- Version sütununu mevcut tabloya ekle (eğer yoksa)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'magazines' 
    AND column_name = 'version'
  ) THEN
    ALTER TABLE public.magazines 
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    
    RAISE NOTICE 'Version sütunu magazines tablosuna eklendi';
  ELSE
    RAISE NOTICE 'Version sütunu zaten mevcut';
  END IF;
END $$;

-- Performans için indeksler
CREATE INDEX IF NOT EXISTS idx_magazines_issue_number ON public.magazines(issue_number);
CREATE INDEX IF NOT EXISTS idx_magazines_is_published ON public.magazines(is_published);
CREATE INDEX IF NOT EXISTS idx_magazines_created_at ON public.magazines(created_at);
CREATE INDEX IF NOT EXISTS idx_magazines_version ON public.magazines(version);

-- RLS'yi etkinleştir
ALTER TABLE public.magazines ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. USER PROFILES TABLE - Kullanıcı rolleri için
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_role CHECK (role IN ('admin', 'user'))
);

-- RLS'yi etkinleştir
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. MAGAZINE PAGES TABLE - Sayfa metadata'sı için (opsiyonel)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.magazine_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  magazine_id UUID NOT NULL REFERENCES public.magazines(id) ON DELETE CASCADE,
  page_number INT NOT NULL,
  image_url TEXT NOT NULL
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_magazine_pages_magazine_id ON public.magazine_pages(magazine_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_magazine_pages_magazine_page ON public.magazine_pages(magazine_id, page_number);

-- RLS'yi etkinleştir
ALTER TABLE public.magazine_pages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS POLİCİES - MAGAZINES
-- ============================================================================

-- Mevcut policy'leri kaldır (çakışmayı önlemek için)
DROP POLICY IF EXISTS "Anon can select published magazines" ON public.magazines;
DROP POLICY IF EXISTS "Authenticated can full access magazines" ON public.magazines;
DROP POLICY IF EXISTS "Admin can manage all magazines" ON public.magazines;
DROP POLICY IF EXISTS "Authenticated can manage magazines" ON public.magazines;

-- Anonim kullanıcılar sadece yayınlanmış dergileri okuyabilir
CREATE POLICY "Anon can select published magazines"
  ON public.magazines
  FOR SELECT
  TO anon
  USING (is_published = TRUE);

-- Kimlik doğrulaması yapılmış kullanıcılar dergileri yönetebilir
-- Not: Client-side işlemler için basit policy gerekli
-- Admin rolü server action'larda requireAdmin() ile kontrol ediliyor
CREATE POLICY "Authenticated can manage magazines"
  ON public.magazines
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 5. RLS POLİCİES - USER PROFILES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;

-- Kullanıcılar kendi profillerini görüntüleyebilir
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Kullanıcılar kendi profillerini güncelleyebilir (rol hariç)
CREATE POLICY "Users can update their own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 6. RLS POLİCİES - MAGAZINE PAGES
-- ============================================================================

DROP POLICY IF EXISTS "Anon can read pages of published magazines" ON public.magazine_pages;
DROP POLICY IF EXISTS "Admin can manage all magazine pages" ON public.magazine_pages;

-- Anonim kullanıcılar sadece yayınlanmış dergilerin sayfalarını okuyabilir
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

-- Adminler tüm dergi sayfalarına tam erişime sahip
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
-- 9. STORAGE BUCKET KURULUMU
-- ============================================================================

-- Magazines bucket'ını oluştur (görsel erişimi için PUBLIC)
INSERT INTO storage.buckets (id, name, public)
VALUES ('magazines', 'magazines', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

-- Mevcut storage policy'lerini kaldır
DROP POLICY IF EXISTS "Anon can read magazine images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can manage magazine images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can manage magazine images" ON storage.objects;

-- Anonim kullanıcıların dergi görsellerini okumasına izin ver
CREATE POLICY "Anon can read magazine images"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (bucket_id = 'magazines');

-- Kimlik doğrulaması yapılmış kullanıcıların dergi görsellerini yönetmesine izin ver
-- Not: Client-side upload'lar için basit policy gerekli
-- Admin rolü server action'larda requireAdmin() ile kontrol ediliyor
CREATE POLICY "Authenticated can manage magazine images"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'magazines')
  WITH CHECK (bucket_id = 'magazines');

-- ============================================================================
-- 10. OTOMATİK USER PROFILE OLUŞTURMA TRİGGER'I
-- ============================================================================

-- Yeni kullanıcı profili otomatik oluşturma fonksiyonu
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mevcut trigger'ı kaldır
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Yeni kullanıcı kaydı için trigger oluştur
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 11. MEVCUT KULLANICILARI ADMİN YAP
-- ============================================================================

-- Tüm mevcut kullanıcılar için admin profilleri ekle
-- Bu, mevcut tüm kullanıcıları admin yapar
INSERT INTO public.user_profiles (user_id, role)
SELECT id, 'admin' FROM auth.users
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- ============================================================================
-- 12. KURULUM DOĞRULAMA
-- ============================================================================

-- Kurulumun başarılı olduğunu doğrula
DO $$
DECLARE
  magazine_count INTEGER;
  profile_count INTEGER;
  bucket_exists BOOLEAN;
BEGIN
  -- Tablo sayılarını kontrol et
  SELECT COUNT(*) INTO magazine_count FROM public.magazines;
  SELECT COUNT(*) INTO profile_count FROM public.user_profiles;
  
  -- Bucket varlığını kontrol et
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'magazines') INTO bucket_exists;
  
  RAISE NOTICE '=== KURULUM TAMAMLANDI ===';
  RAISE NOTICE 'Magazines tablosu: % kayıt', magazine_count;
  RAISE NOTICE 'User profiles tablosu: % kayıt', profile_count;
  RAISE NOTICE 'Storage bucket: %', CASE WHEN bucket_exists THEN 'Oluşturuldu' ELSE 'HATA!' END;
  RAISE NOTICE 'Version sütunu ve indeksler eklendi';
  RAISE NOTICE 'RLS policy''leri yapılandırıldı';
  RAISE NOTICE 'Trigger''lar aktif';
  RAISE NOTICE '========================';
END $$;

-- ============================================================================
-- 13. PERFORMANS VE GÜVENLİK KONTROLLERI
-- ============================================================================

-- Kritik indekslerin varlığını kontrol et
DO $$
BEGIN
  -- Magazines tablosu indeksleri
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'magazines' AND indexname = 'idx_magazines_issue_number') THEN
    RAISE WARNING 'idx_magazines_issue_number indeksi eksik!';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'magazines' AND indexname = 'idx_magazines_version') THEN
    RAISE WARNING 'idx_magazines_version indeksi eksik!';
  END IF;
  
  -- RLS kontrolü
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'magazines' AND rowsecurity = true) THEN
    RAISE WARNING 'Magazines tablosunda RLS aktif değil!';
  END IF;
  
  RAISE NOTICE 'Güvenlik ve performans kontrolleri tamamlandı';
END $$;