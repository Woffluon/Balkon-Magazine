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

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;

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

CREATE POLICY "Admin can manage all magazines"
  ON public.magazines
  FOR ALL
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- ============================================================================
-- 5. RLS POLİCİES - USER PROFILES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can manage user profiles" ON public.user_profiles;

-- Kullanıcılar kendi profillerini görüntüleyebilir
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage user profiles"
  ON public.user_profiles
  FOR ALL
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

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
-- 7. MAGAZINE VIEWS TABLE - İstatistik ve Okunma Takibi
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.magazine_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    magazine_id UUID NOT NULL REFERENCES public.magazines(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    session_id UUID,
    viewer_ip_hash TEXT,
    user_agent_family TEXT
);

ALTER TABLE public.magazine_views
  ADD COLUMN IF NOT EXISTS viewer_ip_hash TEXT,
  ADD COLUMN IF NOT EXISTS user_agent_family TEXT;

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_magazine_views_magazine_id ON public.magazine_views(magazine_id);
CREATE INDEX IF NOT EXISTS idx_magazine_views_viewed_at ON public.magazine_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_magazine_views_session_id ON public.magazine_views(session_id);
CREATE INDEX IF NOT EXISTS idx_magazine_views_composite ON public.magazine_views(magazine_id, viewed_at);

-- RLS'yi etkinleştir
ALTER TABLE public.magazine_views ENABLE ROW LEVEL SECURITY;

-- Mevcut policy'leri kaldır (çakışmayı önlemek için)
DROP POLICY IF EXISTS "Anyone can insert a view" ON public.magazine_views;
DROP POLICY IF EXISTS "Admins can view all records" ON public.magazine_views;

-- Sadece adminler görüntülenme kayıtlarını okuyabilir
CREATE POLICY "Admins can view all records"
  ON public.magazine_views
  FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());

-- ============================================================================
-- 8. RPC FUNCTIONS
-- ============================================================================

-- Görüntülenme tetikleyici RPC fonksiyonu
CREATE OR REPLACE FUNCTION public.increment_magazine_view(
    p_magazine_id UUID,
    p_session_id UUID DEFAULT NULL,
    p_viewer_ip_hash TEXT DEFAULT NULL,
    p_user_agent_family TEXT DEFAULT NULL
) 
RETURNS VOID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.magazines
        WHERE id = p_magazine_id
          AND is_published = TRUE
    ) THEN
        RAISE EXCEPTION 'Magazine is not public'
            USING ERRCODE = '42501';
    END IF;

    -- Sıkı Kontrol: Eğer session_id sağlandıysa, son 24 saat içindeki izlenmeleri kontrol et
    IF p_session_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.magazine_views
            WHERE magazine_id = p_magazine_id 
              AND session_id = p_session_id 
              AND viewed_at > (NOW() - INTERVAL '24 hours')
        ) THEN
            -- Son 24 saat içinde bu session ile zaten okunmuş, kaydetme
            RETURN;
        END IF;
    -- Yedek Kontrol: Eğer session_id yoksa ama IP hash varsa (Cookie'yi engelleyenler için)
    ELSIF p_viewer_ip_hash IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.magazine_views
            WHERE magazine_id = p_magazine_id 
              AND viewer_ip_hash = p_viewer_ip_hash
              AND viewed_at > (NOW() - INTERVAL '1 hour') -- IP için daha kısa süre (ortak ağlar/okul interneti sebebiyle)
        ) THEN
            -- Son 1 saat içinde bu IP hash ile zaten okunmuş, kaydetme
            RETURN;
        END IF;
    END IF;

    -- Yeni görüntülenmeyi kaydet
    INSERT INTO public.magazine_views (magazine_id, session_id, viewer_ip_hash, user_agent_family)
    VALUES (p_magazine_id, p_session_id, p_viewer_ip_hash, p_user_agent_family);
END;
$$;

REVOKE ALL ON FUNCTION public.increment_magazine_view(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_magazine_view(UUID, UUID, TEXT, TEXT) TO anon, authenticated;

-- Gelişmiş İstatistik Verilerini Getiren RPC
CREATE OR REPLACE FUNCTION public.get_advanced_analytics(
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_magazine_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_views BIGINT;
    v_unique_visitors BIGINT;
    v_daily_stats JSONB;
    v_top_magazines JSONB;
    v_device_stats JSONB;
    v_total_all_time BIGINT;
    v_result JSONB;
BEGIN
    IF NOT public.current_user_is_admin() THEN
        RAISE EXCEPTION 'Admin role required'
            USING ERRCODE = '42501';
    END IF;

    -- 0. Genel Toplam (Tüm zamanlar)
    SELECT COUNT(*) INTO v_total_all_time FROM public.magazine_views;

    -- 1. Toplam İzlenme ve Tekil Ziyaretçi (Seçili aralık ve dergi için)
    SELECT 
        COUNT(*),
        COUNT(DISTINCT COALESCE(session_id::text, viewer_ip_hash))
    INTO v_total_views, v_unique_visitors
    FROM public.magazine_views
    WHERE viewed_at >= p_start_date 
      AND viewed_at <= p_end_date
      AND (p_magazine_id IS NULL OR magazine_id = p_magazine_id);

    -- 2. Günlük İstatistikler (Boş günleri doldurarak)
    SELECT jsonb_agg(d) INTO v_daily_stats
    FROM (
        SELECT 
            gs.date::date as date,
            COUNT(v.id) as views,
            COUNT(DISTINCT COALESCE(v.session_id::text, v.viewer_ip_hash)) as unique_views
        FROM generate_series(p_start_date::date, p_end_date::date, '1 day'::interval) gs(date)
        LEFT JOIN public.magazine_views v ON v.viewed_at::date = gs.date::date
            AND (p_magazine_id IS NULL OR v.magazine_id = p_magazine_id)
        GROUP BY 1
        ORDER BY 1
    ) d;

    -- 3. En Çok Okunan Dergiler (Sadece genel aramada anlamlı)
    IF p_magazine_id IS NULL THEN
        SELECT jsonb_agg(t) INTO v_top_magazines
        FROM (
            SELECT 
                m.id,
                m.title,
                m.issue_number,
                COUNT(v.id) as total_views
            FROM public.magazines m
            LEFT JOIN public.magazine_views v ON m.id = v.magazine_id
            WHERE v.viewed_at >= p_start_date 
              AND v.viewed_at <= p_end_date
            GROUP BY m.id, m.title, m.issue_number
            ORDER BY total_views DESC
            LIMIT 10
        ) t;
    ELSE
        v_top_magazines := '[]'::jsonb;
    END IF;

    -- 4. Cihaz İstatistikleri
    SELECT jsonb_agg(dev) INTO v_device_stats
    FROM (
        SELECT 
            CASE 
                WHEN user_agent_family IN ('Mobil', 'Tablet', 'Masaüstü') THEN user_agent_family
                ELSE 'Bilinmeyen'
            END as device,
            COUNT(*) as count
        FROM public.magazine_views
        WHERE viewed_at >= p_start_date 
          AND viewed_at <= p_end_date
          AND (p_magazine_id IS NULL OR magazine_id = p_magazine_id)
        GROUP BY 1
        ORDER BY count DESC
    ) dev;

    -- Sonuçları Birleştir
    v_result := jsonb_build_object(
        'total_views', COALESCE(v_total_views, 0),
        'unique_visitors', COALESCE(v_unique_visitors, 0),
        'daily_stats', COALESCE(v_daily_stats, '[]'::jsonb),
        'top_magazines', COALESCE(v_top_magazines, '[]'::jsonb),
        'device_stats', COALESCE(v_device_stats, '[]'::jsonb),
        'total_views_all_time', COALESCE(v_total_all_time, 0)
    );

    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_advanced_analytics(TIMESTAMPTZ, TIMESTAMPTZ, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_advanced_analytics(TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

-- ============================================================================
-- 9. STORAGE BUCKET KURULUMU
-- ============================================================================

-- Magazines bucket'ını oluştur (görsel erişimi için PUBLIC)
INSERT INTO storage.buckets (id, name, public)
VALUES ('magazines', 'magazines', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

-- Upload logları public obje alanından ayrı, private bucket'ta tutulur
INSERT INTO storage.buckets (id, name, public)
VALUES ('magazine-upload-logs', 'magazine-upload-logs', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

-- Mevcut storage policy'lerini kaldır
DROP POLICY IF EXISTS "Anon can read magazine images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can manage magazine images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can manage magazine images" ON storage.objects;

-- Anonim kullanıcıların dergi görsellerini okumasına izin ver
CREATE POLICY "Anon can read magazine images"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (
    bucket_id = 'magazines'
    AND name ~ '^[0-9]+/(kapak\.webp|pages/sayfa_[0-9]{3}\.webp)$'
  );

CREATE POLICY "Admin can manage magazine images"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id IN ('magazines', 'magazine-upload-logs')
    AND public.current_user_is_admin()
  )
  WITH CHECK (
    bucket_id IN ('magazines', 'magazine-upload-logs')
    AND public.current_user_is_admin()
  );

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
-- 11. MEVCUT KULLANICILAR İÇİN VARSAYILAN PROFİL OLUŞTUR
-- ============================================================================

-- Mevcut kullanıcıları admin yapma; eksik profilleri güvenli varsayılan role ile ekle
INSERT INTO public.user_profiles (user_id, role)
SELECT id, 'user' FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 12. KURULUM DOĞRULAMA
-- ============================================================================

-- Kurulumun başarılı olduğunu doğrula
DO $$
DECLARE
  magazine_count INTEGER;
  profile_count INTEGER;
  views_count INTEGER;
  bucket_exists BOOLEAN;
BEGIN
  -- Tablo sayılarını kontrol et
  SELECT COUNT(*) INTO magazine_count FROM public.magazines;
  SELECT COUNT(*) INTO profile_count FROM public.user_profiles;
  SELECT COUNT(*) INTO views_count FROM public.magazine_views;
  
  -- Bucket varlığını kontrol et
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'magazines') INTO bucket_exists;
  
  RAISE NOTICE '=== KURULUM TAMAMLANDI ===';
  RAISE NOTICE 'Magazines tablosu: % kayıt', magazine_count;
  RAISE NOTICE 'User profiles tablosu: % kayıt', profile_count;
  RAISE NOTICE 'Magazine views tablosu: % kayıt', views_count;
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
