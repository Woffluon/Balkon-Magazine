"use client"

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { deleteMagazine, renameMagazine } from './actions'
import { Loader2, Trash2 } from 'lucide-react'

export function RowActions({ id, issue, title }: { id: string; issue: number; title: string }) {
  const [openRename, setOpenRename] = useState(false)
  const [newIssue, setNewIssue] = useState(issue)
  const [newTitle, setNewTitle] = useState(title)
  const [openDelete, setOpenDelete] = useState(false)
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm">
            <span className="hidden sm:inline">İşlemler</span>
            <span className="sm:hidden">⋯</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40 sm:w-48">
          <DropdownMenuLabel className="text-xs sm:text-sm">İşlemler</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Dialog open={openRename} onOpenChange={setOpenRename}>
              <DialogTrigger asChild>
                <button className="w-full text-left text-xs sm:text-sm px-2 py-1">Yeniden Adlandır</button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-md mx-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl text-gray-900 font-semibold">Yeniden Adlandır</DialogTitle>
                </DialogHeader>
                <form
                  action={async (formData: FormData) => {
                    startTransition(async () => {
                      await renameMagazine(formData)
                      setOpenRename(false)
                    })
                  }}
                  className="space-y-3 sm:space-y-4"
                >
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="old_issue" value={issue} />
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-700">Yeni Sayı No</label>
                    <Input 
                      name="new_issue" 
                      type="number" 
                      value={newIssue} 
                      onChange={(e) => setNewIssue(Number(e.target.value))} 
                      required 
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-700">Yeni Başlık</label>
                    <Input 
                      name="new_title" 
                      value={newTitle} 
                      onChange={(e) => setNewTitle(e.target.value)} 
                      className="mt-1 text-sm"
                    />
                  </div>
                  <DialogFooter className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setOpenRename(false)}
                      className="w-full sm:w-auto order-2 sm:order-1"
                    >
                      İptal
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isPending}
                      aria-busy={isPending}
                      className="w-full sm:w-auto order-1 sm:order-2 bg-neutral-900 hover:bg-neutral-800 text-white"
                    >
                      {isPending ? (<><Loader2 className="animate-spin" /> Kaydediliyor</>) : 'Kaydet'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Dialog open={openDelete} onOpenChange={setOpenDelete}>
              <DialogTrigger asChild>
                <button className="w-full text-left text-red-600 hover:text-red-700 text-xs sm:text-sm px-2 py-1">Sil</button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-sm mx-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold">Silme işlemini onaylayın</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">Sayı {issue} - &quot;{title}&quot; tamamen kaldırılacak. Bu işlem geri alınamaz.</p>
                <form
                  action={async (formData: FormData) => {
                    startTransition(async () => {
                      await deleteMagazine(formData)
                      setOpenDelete(false)
                    })
                  }}
                  className="mt-4"
                >
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="issue_number" value={issue} />
                  <DialogFooter className="flex flex-col sm:flex-row gap-2">
                    <Button type="button" variant="ghost" onClick={() => setOpenDelete(false)} className="w-full sm:w-auto order-2 sm:order-1">İptal</Button>
                    <Button type="submit" variant="destructive" disabled={isPending} aria-busy={isPending} className="w-full sm:w-auto order-1 sm:order-2">
                      {isPending ? (<><Loader2 className="animate-spin" /> Siliniyor</>) : (<><Trash2 className="size-4" /> Sil</>)}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

