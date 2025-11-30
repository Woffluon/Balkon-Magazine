import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Girişi - Balkon Dergisi',
  robots: {
    index: false,
    follow: false,
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

