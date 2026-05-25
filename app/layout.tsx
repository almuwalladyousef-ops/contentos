import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Nav from '@/components/Nav'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ContentOS',
  description: 'Post and analyze your videos',
  other: {
    'tiktok-developers-site-verification': 'YGkyP6kFDJsdHfcKAN8wKtb0NyWuQvQO',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="min-h-screen flex flex-col font-sans bg-bg text-text selection:bg-primary/20">
        <Nav />
        <main className="flex-1 p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </body>
    </html>
  )
}
