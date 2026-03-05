import type { Metadata } from 'next'
import { DM_Serif_Display, Plus_Jakarta_Sans } from 'next/font/google'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import './globals.css'

const serif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-serif',
  display: 'swap',
})

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const siteTitle = 'SubletBuff | Boulder Sublets & Short-Term Housing Near CU'
const siteDescription =
  'Find verified short-term sublets in Boulder, CO. Perfect for CU interns, researchers, and seasonal workers. Browse furnished rooms, apartments, and shared spaces.'

export const metadata: Metadata = {
  title: {
    default: siteTitle,
    template: '%s | SubletBuff',
  },
  description: siteDescription,
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://subletbuff.com'
  ),
  openGraph: {
    type: 'website',
    siteName: 'SubletBuff',
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body className="font-sans antialiased bg-white">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
