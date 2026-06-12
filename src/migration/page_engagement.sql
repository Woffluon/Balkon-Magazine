-- ============================================================================
-- Page Engagement Analytics Schema & Migrations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.page_engagement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL, -- Corresponds to the cookie viewer_session
    magazine_id UUID NOT NULL REFERENCES public.magazines(id) ON DELETE CASCADE,
    page_number INT NOT NULL,
    duration_seconds INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_page_engagement_mag_id ON public.page_engagement(magazine_id);
CREATE INDEX IF NOT EXISTS idx_page_engagement_session_id ON public.page_engagement(session_id);
CREATE INDEX IF NOT EXISTS idx_page_engagement_created_at ON public.page_engagement(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.page_engagement ENABLE ROW LEVEL SECURITY;

-- Remove existing policies to prevent conflicts during migration re-runs
DROP POLICY IF EXISTS "Anyone can insert page engagement" ON public.page_engagement;
DROP POLICY IF EXISTS "Admins can view all page engagement records" ON public.page_engagement;

-- Policy 1: Anyone can insert page engagement records (from public flipbook viewer)
CREATE POLICY "Anyone can insert page engagement"
  ON public.page_engagement
  FOR INSERT
  WITH CHECK (true);

-- Policy 2: Only admins can view page engagement records
CREATE POLICY "Admins can view all page engagement records"
  ON public.page_engagement
  FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());

-- ============================================================================
-- RPC Aggregation Function
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_page_analytics(UUID, INT);
CREATE OR REPLACE FUNCTION public.get_page_analytics(
    p_magazine_id UUID,
    p_days INT
)
RETURNS TABLE (
    page_number INT,
    total_views INT,
    unique_viewers INT,
    average_duration_seconds DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Authorization check: enforce admin role using existing function
    IF NOT public.current_user_is_admin() THEN
        RAISE EXCEPTION 'Not authorized'
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT 
        pe.page_number,
        COUNT(pe.id)::INT AS total_views,
        COUNT(DISTINCT pe.session_id)::INT AS unique_viewers,
        ROUND(AVG(pe.duration_seconds), 2)::DOUBLE PRECISION AS average_duration_seconds
    FROM public.page_engagement pe
    WHERE pe.magazine_id = p_magazine_id
      AND pe.created_at >= (NOW() - (p_days || ' days')::INTERVAL)
    GROUP BY pe.page_number
    ORDER BY pe.page_number ASC;
END;
$$;
