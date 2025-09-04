import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import NavBar from '@/components/NavBar'
import { Analytics } from '@vercel/analytics/react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FakeMyRide - Advanced Route Creator',
  description: 'Create custom cycling and running routes with detailed pace and elevation profiles. Generate GPX files for your virtual rides.',
  keywords: ['cycling', 'running', 'routes', 'GPS', 'training', 'fitness', 'GPX', 'bike'],
  authors: [{ name: 'FakeMyRide Team' }],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'FakeMyRide - Advanced Route Creator',
    description: 'Create custom cycling and running routes with detailed pace and elevation profiles',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full antialiased`} suppressHydrationWarning={true}>
        <div id="root" className="h-full flex flex-col">
          <NavBar />
          <main className="flex-grow">
            {children}
          </main>
        </div>
        <Analytics />
      </body>
    </html>
  )
}