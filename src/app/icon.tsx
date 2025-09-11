export const runtime = 'edge'

export const size = {
  width: 32,
  height: 32,
}

export const contentType = 'image/png'

export default function Icon() {
  return fetch(new URL('/favicon.png', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
}