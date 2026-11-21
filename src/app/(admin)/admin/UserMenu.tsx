'use client'

import { useState } from 'react'
import { KeyRound, Loader2, LogOut, User } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { t } from '@/lib/i18n'
import { PasswordChangeDialog } from './PasswordChangeDialog'
import { logout } from './login/actions'

type UserMenuProps = {
  userEmail: string
}

export function UserMenu({ userEmail }: UserMenuProps) {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)

    try {
      const result = await logout()
      if (result?.error) {
        toast.error(result.error)
        setIsLoggingOut(false)
      }
    } catch (error) {
      const digest =
        error && typeof error === 'object' && 'digest' in error
          ? String((error as { digest?: unknown }).digest)
          : ''
      if (digest.startsWith('NEXT_REDIRECT')) {
        throw error
      }
      toast.error(t('errors.logoutFailed'))
      setIsLoggingOut(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            data-tour="user-menu"
            disabled={isLoggingOut}
            aria-label={`${t('auth.signedInAs')}: ${userEmail}`}
            className="min-h-9 gap-2 px-2.5 sm:px-3"
          >
            <User className="size-4 shrink-0" aria-hidden="true" />
            <span className="max-w-[110px] truncate text-xs font-medium sm:max-w-[180px] sm:text-sm">
              {userEmail}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-xs text-muted-foreground">{t('auth.signedInAs')}</p>
              <p className="truncate text-sm font-medium text-foreground">{userEmail}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setPasswordDialogOpen(true)}
            className="min-h-9 cursor-pointer"
          >
            <KeyRound className="size-4" aria-hidden="true" />
            <span>{t('password.menuLabel')}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={handleLogout}
            disabled={isLoggingOut}
            variant="destructive"
            className="min-h-9 cursor-pointer"
          >
            {isLoggingOut ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <LogOut className="size-4" aria-hidden="true" />
            )}
            <span>{isLoggingOut ? t('auth.loggingOut') : t('auth.logout')}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PasswordChangeDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
      />
    </>
  )
}
