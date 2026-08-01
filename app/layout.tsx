import './globals.css'
import { Cormorant_Garamond, EB_Garamond } from 'next/font/google'
import Scenography from '@/components/Scenography'

const display = Cormorant_Garamond({
  subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], variable: '--font-display',
})
const body = EB_Garamond({
  subsets: ['latin'], weight: ['400', '500'], style: ['normal', 'italic'], variable: '--font-body',
})

export const metadata = { title: 'Museum of Days', description: 'Your day, hung among strangers who felt the same.' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}<Scenography /></body>
    </html>
  )
}
