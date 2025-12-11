"use client"

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { deleteMagazine, renameMagazine } from './actions'
import { Loader2, Trash2 } from 'lucide-react'
import { handleServerActionResult } from '@/lib/utils/resultValidation'
import { formatErrorWithContext, type FormattedError } from '@/lib/utils/errorMessages'
import { z } from 'zod'

export function RowActions({ id, issue, title, version }: { id: string; issue: number; title: string; version: number }) {
  const [openRename, setOpenRename] = useState(false)
  const [newIssue, setNewIssue] = useState(issue)
  const [newTitle, setNewTitle] = useState(title)
  const [openDelete, setOpenDelete] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [renameError, setRenameError] = useState<FormattedError | null>(null)
  const [deleteError, setDeleteError] = useState<FormattedError | null>(null)

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
                <button type="button" className="w-full text-left text-xs sm:text-sm px-2 py-1">Yeniden Adlandır</button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-md mx-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl text-gray-900 font-semibold">Yeniden Adlandır</DialogTitle>
                </DialogHeader>
                <form
                  action={async (formData: FormData) => {
                    startTransition(async () => {
                      setRenameError(null)
                      await handleServerActionResult(
                        await renameMagazine(formData),
                        z.void(),
                        {
                          onSuccess: () => {
                            setOpenRename(false)
                            setRenameError(null)
                          },
                          onError: (error) => {
                            // Format error with full context
                            const formattedError = formatErrorWithContext(error)
                            setRenameError(formattedError)
                          }
                        },
                        { operation: 'renameMagazine', magazineId: id, oldIssue: issue, newIssue }
                      )
                    })
                  }}
                  className="space-y-3 sm:space-y-4"
                >
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="old_issue" value={issue} />
                  <input type="hidden" name="version" value={version} />
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
                  
                  {/* Enhanced Error Display */}
                  {renameError && (
                    <div className={`rounded-lg border p-3 ${
                      renameError.type === 'CONFLICT' ? 'border-amber-200 bg-amber-50' :
                      renameError.type === 'VALIDATION' ? 'border-red-200 bg-red-50' :
                      renameError.type === 'NETWORK' ? 'border-blue-200 bg-blue-50' :
                      'border-red-200 bg-red-50'
                    }`}>
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0">
                          {renameError.type === 'CONFLICT' ? (
                            <svg className="h-5 w-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          ) : renameError.type === 'NETWORK' ? (
                            <svg className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            renameError.type === 'CONFLICT' ? 'text-amber-800' :
                            renameError.type === 'NETWORK' ? 'text-blue-800' :
                            'text-red-800'
                          }`}>
                            {renameError.message}
                          </p>
                          
                          {/* Show validation field errors */}
                          {renameError.fields && renameError.fields.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {renameError.fields.map((field, idx) => (
                                <li key={idx} className="text-xs text-red-700">
                                  • <span className="font-medium">{field.field}:</span> {field.message}
                                </li>
                              ))}
                            </ul>
                          )}
                          
                          {/* Show retry info for network errors */}
                          {renameError.retryable && (
                            <p className="mt-2 text-xs text-blue-700">
                              Bu hata geçici olabilir. Lütfen tekrar deneyin.
                            </p>
                          )}
                          
                          {/* Show refresh button for conflicts */}
                          {renameError.type === 'CONFLICT' && (
                            <button
                              type="button"
                              onClick={() => window.location.reload()}
                              className="mt-2 text-sm font-medium text-amber-900 hover:text-amber-700 underline"
                            >
                              Sayfayı Yenile
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
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
                <button type="button" className="w-full text-left text-red-600 hover:text-red-700 text-xs sm:text-sm px-2 py-1">Sil</button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-sm mx-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold">Silme işlemini onaylayın</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">Sayı {issue} - &quot;{title}&quot; tamamen kaldırılacak. Bu işlem geri alınamaz.</p>
                <form
                  action={async (formData: FormData) => {
                    startTransition(async () => {
                      setDeleteError(null)
                      await handleServerActionResult(
                        await deleteMagazine(formData),
                        z.void(),
                        {
                          onSuccess: () => {
                            setOpenDelete(false)
                            setDeleteError(null)
                          },
                          onError: (error) => {
                            // Format error with full context
                            const formattedError = formatErrorWithContext(error)
                            setDeleteError(formattedError)
                          }
                        },
                        { operation: 'deleteMagazine', magazineId: id, issueNumber: issue }
                      )
                    })
                  }}
                  className="mt-4"
                >
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="issue_number" value={issue} />
                  <input type="hidden" name="version" value={version} />
                  
                  {/* Enhanced Error Display */}
                  {deleteError && (
                    <div className={`rounded-lg border p-3 mb-4 ${
                      deleteError.type === 'CONFLICT' ? 'border-amber-200 bg-amber-50' :
                      deleteError.type === 'VALIDATION' ? 'border-red-200 bg-red-50' :
                      deleteError.type === 'NETWORK' ? 'border-blue-200 bg-blue-50' :
                      'border-red-200 bg-red-50'
                    }`}>
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0">
                          {deleteError.type === 'CONFLICT' ? (
                            <svg className="h-5 w-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          ) : deleteError.type === 'NETWORK' ? (
                            <svg className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${
                            deleteError.type === 'CONFLICT' ? 'text-amber-800' :
                            deleteError.type === 'NETWORK' ? 'text-blue-800' :
                            'text-red-800'
                          }`}>
                            {deleteError.message}
                          </p>
                          
                          {/* Show cleanup notification if present in context */}
                          {deleteError.context && 'cleanup' in deleteError.context && Boolean(deleteError.context.cleanup) && (
                            <p className="mt-2 text-xs text-red-700">
                              ⚠️ Bazı dosyalar silinemedi. Manuel temizlik gerekebilir.
                            </p>
                          )}
                          
                          {/* Show retry info for network errors */}
                          {deleteError.retryable && (
                            <p className="mt-2 text-xs text-blue-700">
                              Bu hata geçici olabilir. Lütfen tekrar deneyin.
                            </p>
                          )}
                          
                          {/* Show refresh button for conflicts */}
                          {deleteError.type === 'CONFLICT' && (
                            <button
                              type="button"
                              onClick={() => window.location.reload()}
                              className="mt-2 text-sm font-medium text-amber-900 hover:text-amber-700 underline"
                            >
                              Sayfayı Yenile
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
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

