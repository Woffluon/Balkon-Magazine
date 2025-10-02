'use server'

import { createClient } from '@/lib/supabase/server'

export async function saveUploadLog(issue: string, content: string) {
  'use server'
  try {
    const supabase = await createClient()
    const bucket = supabase.storage.from('magazines')
    const now = new Date().toISOString().replace(/[:.]/g, '-')
    const path = `logs/${issue}/${now}.txt`
    const data = new TextEncoder().encode(content)
    
    const { error } = await bucket.upload(path, data, { 
      contentType: 'text/plain', 
      upsert: true, 
      cacheControl: '3600' 
    })
    
    if (error) {
      console.error('Log upload error:', error)
      throw new Error(`Log kaydedilemedi: ${error.message}`)
    }
    
    return path
  } catch (error) {
    console.error('saveUploadLog error:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Log kaydetme sırasında bilinmeyen hata')
  }
}
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function addMagazineRecord(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) redirect('/admin/login')

    const title = formData.get('title') as string
    const issue_number = Number(formData.get('issue_number'))
    const publication_date = formData.get('publication_date') as string
    const pdf_url = (formData.get('pdf_url') as string) || ''
    const cover_image_url = (formData.get('cover_image_url') as string) || ''
    const page_count_raw = formData.get('page_count') as string | null
    const page_count = page_count_raw ? Number(page_count_raw) : null

    if (!title || !issue_number || !publication_date) {
      throw new Error('Eksik alanlar var')
    }

    if (Number.isNaN(issue_number)) {
      throw new Error('Geçersiz sayı numarası')
    }

    const payload: Record<string, unknown> = { 
      title, 
      issue_number, 
      publication_date, 
      cover_image_url, 
      is_published: true 
    }
    
    if (pdf_url) payload.pdf_url = pdf_url
    if (typeof page_count === 'number' && !Number.isNaN(page_count)) {
      payload.page_count = page_count
    }

    const { error } = await supabase
      .from('magazines')
      .upsert(payload, { onConflict: 'issue_number' })

    if (error) {
      console.error('Database error:', error)
      throw new Error(`Veritabanı hatası: ${error.message}`)
    }
    
    revalidatePath('/admin')
  } catch (error) {
    console.error('addMagazineRecord error:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Bilinmeyen hata oluştu')
  }
}

async function listAllFiles(issue: number) {
  const supabase = await createClient()
  const bucket = supabase.storage.from('magazines')

  const paths: string[] = []

  async function listDir(prefix: string) {
    const { data, error } = await bucket.list(prefix, { limit: 1000 })
    if (error) throw error
    for (const item of data ?? []) {
      const p = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id) {
        paths.push(p)
      } else {
        await listDir(p)
      }
    }
  }

  await listDir(String(issue))
  return paths
}

export async function deleteMagazine(formData: FormData) {
  const { data: { session } } = await (await createClient()).auth.getSession()
  if (!session) redirect('/admin/login')
  const supabase = await createClient()
  const id = formData.get('id') as string
  const issue_number = Number(formData.get('issue_number'))

  // 1) Delete storage files under issue folder
  try {
    const files = await listAllFiles(issue_number)
    if (files.length) {
      const { error: rmErr } = await supabase.storage.from('magazines').remove(files)
      if (rmErr) console.error('Storage remove error:', rmErr)
    }
  } catch (e) {
    console.error('List/remove storage error:', e)
  }

  // 2) Delete DB row
  const { error: dbErr } = await supabase.from('magazines').delete().eq('id', id)
  if (dbErr) {
    console.error('DB delete error:', dbErr)
  }

  revalidatePath('/admin')
}

export async function renameMagazine(formData: FormData) {
  const { data: { session } } = await (await createClient()).auth.getSession()
  if (!session) redirect('/admin/login')
  const supabase = await createClient()
  const id = formData.get('id') as string
  const old_issue = Number(formData.get('old_issue'))
  const new_issue = Number(formData.get('new_issue'))
  const new_title = (formData.get('new_title') as string) || undefined

  if (!id || !new_issue || Number.isNaN(new_issue)) return

  const bucket = supabase.storage.from('magazines')

  // Move pages
  const { data: pages, error: listErr } = await bucket.list(`${old_issue}/pages`, { limit: 1000 })
  if (!listErr && pages?.length) {
    for (const it of pages) {
      const fromPath = `${old_issue}/pages/${it.name}`
      const toPath = `${new_issue}/pages/${it.name}`
      const { error: moveErr } = await bucket.move(fromPath, toPath)
      if (moveErr) {
        const { error: cErr } = await bucket.copy(fromPath, toPath)
        if (!cErr) await bucket.remove([fromPath])
      }
    }
  }

  // Update DB
  const update: Partial<{ issue_number: number; title: string }> = { issue_number: new_issue }
  if (new_title) update.title = new_title

  const { error: upErr } = await supabase.from('magazines').update(update).eq('id', id)
  if (upErr) console.error('DB update error:', upErr)

  revalidatePath('/admin')
}

