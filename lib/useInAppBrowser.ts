import { useState, useEffect } from 'react'

const IN_APP_PATTERNS = [
  'FBAN', // Facebook app
  'FBAV',
  'FB_IAB',
  'Instagram',
  'Twitter',
  'Line/',
  'TikTok',
  'BytedanceWebview',
  'Snapchat',
  'LinkedInApp',
  'Pinterest',
  'GSA', // Google Search app webview
  'MicroMessenger', // WeChat
  'WhatsApp',
]

const GENERIC_WEBVIEW_PATTERNS = [
  /\bwv\b/i, // Android webview token
  /WebView/i,
  /(iPhone|iPad|iPod).*AppleWebKit(?!.*Safari)/i, // iOS webview without Safari token
]

export function isLikelyInAppBrowser(userAgent?: string) {
  if (typeof navigator === 'undefined' && !userAgent) return false
  const ua = userAgent ?? navigator.userAgent ?? ''
  return (
    IN_APP_PATTERNS.some((pattern) => ua.includes(pattern)) ||
    GENERIC_WEBVIEW_PATTERNS.some((pattern) => pattern.test(ua))
  )
}

export function useInAppBrowser() {
  const [isInApp, setIsInApp] = useState(false)

  useEffect(() => {
    setIsInApp(isLikelyInAppBrowser())
  }, [])

  return isInApp
}
