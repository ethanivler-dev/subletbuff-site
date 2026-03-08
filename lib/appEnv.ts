export type AppEnvironment = 'production' | 'staging' | 'development'

function normalizeEnv(value: string | undefined): AppEnvironment | null {
  if (!value) return null
  const v = value.toLowerCase().trim()
  if (v === 'production' || v === 'prod') return 'production'
  if (v === 'staging' || v === 'stage' || v === 'preview') return 'staging'
  if (v === 'development' || v === 'dev' || v === 'local') return 'development'
  return null
}

export function getAppEnvironment(): AppEnvironment {
  const explicit = normalizeEnv(process.env.NEXT_PUBLIC_APP_ENV ?? process.env.APP_ENV)
  if (explicit) return explicit

  const vercelEnv = normalizeEnv(process.env.VERCEL_ENV)
  if (vercelEnv) return vercelEnv

  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase()
    if (host === 'localhost' || host === '127.0.0.1') return 'development'
    if (host.includes('staging') || host.includes('-git-staging-')) return 'staging'
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
