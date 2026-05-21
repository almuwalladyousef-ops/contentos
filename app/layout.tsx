import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/Nav'
import SessionProvider from '@/components/SessionProvider'
import { auth } from '@/auth'

export const metadata: Metadata = {
  title: 'ContentOS',
  description: 'Post and analyze your videos',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  return (
    <html lang="en">
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <SessionProvider session={session}>
          {session && <Nav />}
          <main style={{ flex: 1, padding: session ? '32px 24px' : '0' }}>
            {children}
          </main>
        </SessionProvider>
      </body>
    </html>
  )
}
