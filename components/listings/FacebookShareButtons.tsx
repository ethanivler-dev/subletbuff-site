'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
)

interface FacebookShareButtonsProps {
  listingUrl: string
  title: string
  price: number
  neighborhood: string
  bedrooms: number | null
  bathrooms: number | null
  dateRange: string
  /** Render as compact icon buttons (for dashboard rows) */
  compact?: boolean
}

export function FacebookShareButtons({
  listingUrl,
  title,
  price,
  neighborhood,
  bedrooms,
  bathrooms,
  dateRange,
  compact = false,
}: FacebookShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(listingUrl)}`

  const beds = bedrooms ?? '?'
  const baths = bathrooms ?? '?'
  const priceStr = price > 10000 ? Math.round(price / 100) : price

  const copyText = [
    `\u{1F3E0} ${title} - $${priceStr.toLocaleString('en-US')}/mo`,
    `\u{1F4CD} ${neighborhood}, Boulder CO`,
    `\u{1F6CF}\u{FE0F} ${beds}bd/${baths}ba | ${dateRange}`,
    '',
    listingUrl,
  ].join('\n')

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copyText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = copyText
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-button text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: '#1877F2' }}
          title="Share to Facebook"
        >
          <FacebookIcon className="w-3.5 h-3.5" />
          Share
        </a>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-button border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          title="Copy formatted text for Facebook Marketplace or groups"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-600" />
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy for FB
            </>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <a
        href={shareUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors hover:opacity-90"
        style={{ backgroundColor: '#1877F2' }}
      >
        <FacebookIcon className="w-4 h-4" />
        Share to Facebook
      </a>
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        title="Copy formatted text for Facebook Marketplace or groups"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-green-600">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            Copy for Facebook
          </>
        )}
      </button>
    </div>
  )
}
