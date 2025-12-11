"use client"

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RowActions } from './RowActions'
import type { Magazine } from '@/types/magazine'
import { ArrowUpDown } from 'lucide-react'

type Props = {
  magazines: Magazine[]
}

type SortKey = 'issue_number' | 'title' | 'publication_date'

export default function MagazineTable({ magazines }: Props) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('issue_number')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q
      ? magazines.filter((m) =>
          String(m.issue_number).includes(q) ||
          (m.title || '').toLowerCase().includes(q)
        )
      : magazines

    const sorted = [...base].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'issue_number') {
        return (a.issue_number - b.issue_number) * dir
      }
      if (sortKey === 'title') {
        return (a.title || '').localeCompare(b.title || '') * dir
      }
      const aDate = a.publication_date ? new Date(a.publication_date).getTime() : 0
      const bDate = b.publication_date ? new Date(b.publication_date).getTime() : 0
      return (aDate - bDate) * dir
    })

    return sorted
  }, [magazines, query, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Input
            placeholder="Ara: sayı no veya başlık"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Dergilerde ara"
            className="pl-3 pr-3"
          />
        </div>
        <div className="text-xs text-muted-foreground">
          Toplam <span className="font-medium text-foreground">{filtered.length}</span> dergi
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto px-0 text-left font-medium"
                      onClick={() => toggleSort('issue_number')}
                      aria-label="Sayı numarasına göre sırala"
                    >
                      Sayı No
                      <ArrowUpDown className="ml-1 size-4 opacity-70" />
                    </Button>
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto px-0 text-left font-medium"
                      onClick={() => toggleSort('title')}
                      aria-label="Başlığa göre sırala"
                    >
                      Başlık
                      <ArrowUpDown className="ml-1 size-4 opacity-70" />
                    </Button>
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto px-0 text-left font-medium"
                      onClick={() => toggleSort('publication_date')}
                      aria-label="Yayın tarihine göre sırala"
                    >
                      Yayın Tarihi
                      <ArrowUpDown className="ml-1 size-4 opacity-70" />
                    </Button>
                  </TableHead>
                  <TableHead className="whitespace-nowrap">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((mag) => (
                  <TableRow key={String(mag.id)}>
                    <TableCell className="text-xs sm:text-sm whitespace-nowrap">{mag.issue_number}</TableCell>
                    <TableCell className="text-xs sm:text-sm min-w-[200px] max-w-[260px] truncate">{mag.title}</TableCell>
                    <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                      {mag.publication_date ? new Date(mag.publication_date).toLocaleDateString('tr-TR') : '-'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <RowActions id={String(mag.id)} issue={mag.issue_number} title={mag.title} version={mag.version} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}


