import { createClient } from '@/lib/supabase/server'
import { Magazine } from '@/types/magazine'

export async function getPublishedMagazines(): Promise<Magazine[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('magazines')
    .select('*')
    .eq('is_published', true)
    .order('issue_number', { ascending: false })

  if (error) {
    throw new Error(`Magazines fetch failed: ${error.message}`)
  }

  return data ?? []
}
