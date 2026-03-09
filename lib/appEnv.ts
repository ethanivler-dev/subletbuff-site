export type AppEnvironment = 'production' | 'staging' | 'development'

function normalizeEnv(value: string | undefined): AppEnvironment | null {
  if (!value) return null
  const v = value.toLowerCase().trim()
  if (v === 'production' || v === 'prod') return 'production'
  if (v === 'staging' || v === 'stage' || v === 'preview') return 'staging'
  if (v === 'development' || v === 'dev' || v === 'local') return 'development'
  return null
}

function inferFromHostname(hostname: string): AppEnvironment | null {
  const host = hostname.toLowerCase().trim()
  if (!host) return null

  if (host === 'localhost' || host === '127.0.0.1') return 'development'

  // Canonical production domains
  if (host === 'subletbuff.com' || host === 'www.subletbuff.com') return 'production'

  // Vercel preview URLs include branch slug with "-git-"
  if (host.endsWith('.vercel.app')) {
    if (host.includes('-git-')) return 'staging'
    return 'production'
  }

  // Allow custom staging hostnames, e.g. staging.subletbuff.com
  if (host.includes('staging') || host.includes('preview')) return 'staging'

  return null
}

export function getAppEnvironment(): AppEnvironment {
  const explicit = normalizeEnv(process.env.NEXT_PUBLIC_APP_ENV ?? process.env.APP_ENV)
  if (explicit) return explicit

  const vercelEnv = normalizeEnv(process.env.VERCEL_ENV)
  if (vercelEnv) return vercelEnv

  if (typeof window !== 'undefined') {
    const inferred = inferFromHostname(window.location.hostname)
    if (inferred) return inferred
  }

  // Server-side fallback for Vercel runtime (without browser hostname)
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) {
    const inferred = inferFromHostname(vercelUrl.replace(/^https?:\/\//, ''))
    if (inferred) return inferred
  }

  return process.env.NODE_ENV === 'production' ? 'production' : 'development'
}

export function isProductionEnvironment(): boolean {
  return getAppEnvironment() === 'production'
}

export function isStagingEnvironment(): boolean {
  return getAppEnvironment() === 'staging'
}

export function shouldHideTestListings(): boolean {
  return isProductionEnvironment()
}
