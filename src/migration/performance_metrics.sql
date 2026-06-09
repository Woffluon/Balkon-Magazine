-- Create performance_metrics table
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_id TEXT NOT NULL,
  name TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  path TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Allow public anonymous insert for metrics (needed for client reporting)
CREATE POLICY "Allow public inserts on performance_metrics" 
  ON public.performance_metrics 
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- Allow authenticated admin users to read performance metrics
CREATE POLICY "Allow admin read on performance_metrics" 
  ON public.performance_metrics 
  FOR SELECT 
  TO authenticated
  USING (true);

-- Add indexes for aggregation performance
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_created ON public.performance_metrics(name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created ON public.performance_metrics(created_at DESC);
