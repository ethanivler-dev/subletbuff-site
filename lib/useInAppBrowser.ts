import { useState, useEffect } from 'react'

const IN_APP_PATTERNS = [
  'Instagram',
  'FBAN',    // Facebook App
  'FBAV',    // Facebook App Version
  'Twitter',
  'Line/',
  'TikTok',
  'BytedanceWebview',
  'Snapchat',
  'LinkedInApp',
]

export function useInAppBrowser() {
  const [isInApp, setIsInApp] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent || ''
    setIsInApp(IN_APP_PATTERNS.some((p) => ua.includes(p)))
  }, [])

  return isInApp
}
