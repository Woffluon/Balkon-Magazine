'use client'

import { useActionState, startTransition, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ThemeToggle } from '@/components/admin/ThemeToggle'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { loginSchema, type LoginDto } from '@/lib/validators/magazineSchemas'
import { login, type LoginState } from './actions'

export default function LoginPage() {
  const initialState: LoginState = { error: undefined }
  const loginAction = login as (
    prevState: LoginState,
    formData: FormData
  ) => Promise<LoginState>
  const [state, formAction, isPending] = useActionState(loginAction, initialState)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  })

  const busy = isPending || isSubmitting

  return (
    <div className="flex min-h-screen flex-col justify-between bg-background px-4 py-6 text-foreground sm:px-6 sm:py-8">
      {/* Brand & Theme Header */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground"
          >
            B
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-base font-bold tracking-tight text-foreground">
              {t('nav.brandTitle')}
            </span>
            <span className="text-sm text-muted-foreground">{t('nav.brandSubtitle')}</span>
          </span>
        </Link>

        <ThemeToggle showLabel={false} />
      </header>

      {/* Centered Login Card */}
      <main className="mx-auto my-8 flex w-full max-w-sm flex-col items-center justify-center">
        <Card className="w-full border-border bg-card text-card-foreground shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
              {t('auth.loginTitle')}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {t('auth.loginSubtitle')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {state?.error ? (
              <div
                role="alert"
                aria-live="polite"
                className="mb-4 rounded-lg border border-status-error-border bg-status-error-bg px-3 py-2.5 text-sm font-medium text-status-error-fg"
              >
                {state.error}
              </div>
            ) : null}

            <form
              onSubmit={handleSubmit((data) => {
                const formData = new FormData()
                formData.append('email', data.email)
                formData.append('password', data.password)
                startTransition(() => {
                  formAction(formData)
                })
              })}
              noValidate
              className="grid gap-4"
            >
              <div className="grid gap-2">
                <Label htmlFor="email">{t('auth.emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  autoComplete="email"
                  disabled={busy}
                  {...register('email')}
                  aria-invalid={errors.email ? 'true' : 'false'}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className={cn(errors.email && 'border-destructive')}
                />
                {errors.email ? (
                  <p
                    id="email-error"
                    role="alert"
                    className="text-xs font-medium text-status-error-fg"
                  >
                    {errors.email.message}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">{t('auth.passwordLabel')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('auth.passwordPlaceholder')}
                    autoComplete="current-password"
                    disabled={busy}
                    {...register('password')}
                    aria-invalid={errors.password ? 'true' : 'false'}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    className={cn('pr-11', errors.password && 'border-destructive')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={busy}
                    aria-label={
                      showPassword ? t('auth.hidePassword') : t('auth.showPassword')
                    }
                    aria-pressed={showPassword}
                    className="absolute top-1/2 right-0.5 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {errors.password ? (
                  <p
                    id="password-error"
                    role="alert"
                    className="text-xs font-medium text-status-error-fg"
                  >
                    {errors.password.message}
                  </p>
                ) : null}
              </div>

              <Button
                type="submit"
                variant="default"
                disabled={busy}
                aria-busy={busy}
                className="min-h-10 w-full font-semibold"
              >
                {busy ? (
                  <>
                    <Loader2
                      className="size-4 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                    <span>{t('auth.submitting')}</span>
                  </>
                ) : (
                  t('auth.submit')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      {/* Public Site Return Link */}
      <footer className="mx-auto flex w-full max-w-5xl justify-center">
        <Link
          href="/"
          className="inline-flex min-h-9 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
          <span>{t('auth.backToPublic')}</span>
        </Link>
      </footer>
    </div>
  )
}
