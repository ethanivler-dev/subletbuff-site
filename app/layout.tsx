import type { Metadata } from 'next'
import Script from 'next/script'
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
  'Find verified summer sublets and short-term housing in Boulder, CO. Free for students. No scams, no fees. Browse furnished rooms, apartments, and houses near CU Boulder.'

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
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-button focus:text-sm focus:font-medium">
          Skip to content
        </a>
        <Navbar />
        <main id="main-content">{children}</main>
        <Footer />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-18002091746"
          strategy="afterInteractive"
        />
        <Script id="google-ads" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-18002091746');
          `}
        </Script>
      </body>
    </html>
  )
}
