import './globals.css'
export const metadata = { title: 'Emotion Museum', description: 'Your day, hung among strangers who felt the same.' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
