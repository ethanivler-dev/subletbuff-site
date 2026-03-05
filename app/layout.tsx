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

export const metadata: Metadata = {
  title: {
    default: 'SubletBuff — Short-Term Housing in Boulder',
    template: '%s | SubletBuff',
  },
  description:
    "Boulder's verified short-term housing marketplace for interns, seasonal workers, and researchers.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://subletbuff.com'
  ),
  openGraph: {
    type: 'website',
    siteName: 'SubletBuff',
    title: 'SubletBuff — Short-Term Housing in Boulder',
    description:
      "Boulder's verified short-term housing marketplace for interns, seasonal workers, and researchers.",
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SubletBuff — Short-Term Housing in Boulder',
    description:
      "Boulder's verified short-term housing marketplace for interns, seasonal workers, and researchers.",
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
