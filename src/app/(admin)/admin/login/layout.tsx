import type { Metadata } from 'next'
import { t } from '@/lib/i18n'

export const metadata: Metadata = {
  title: `${t('auth.loginTitle')} - ${t('nav.brandTitle')} ${t('nav.brandSubtitle')}`,
  robots: {
    index: false,
    follow: false,
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
