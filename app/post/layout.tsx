import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Post a Sublet in Boulder | Free Listing on SubletBuff',
  description: 'Post your Boulder sublet for free on SubletBuff. Reach verified CU students, interns, and researchers looking for summer housing. Takes under 3 minutes.',
  alternates: { canonical: '/post' },
}

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
