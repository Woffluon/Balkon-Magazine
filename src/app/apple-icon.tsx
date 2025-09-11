export const runtime = 'edge'

export const size = {
  width: 180,
  height: 180,
}

export const contentType = 'image/png'

export default function AppleIcon() {
  return fetch(new URL('/favicon.png', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
}