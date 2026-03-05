import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'SubletBuff — Short-Term Housing in Boulder'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%)',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            SubletBuff
          </div>
          <div
            style={{
              fontSize: 28,
              opacity: 0.85,
              maxWidth: 600,
              textAlign: 'center',
              lineHeight: 1.4,
            }}
          >
            Boulder&apos;s Short-Term Housing Marketplace
          </div>
          <div
            style={{
              display: 'flex',
              gap: '32px',
              marginTop: '16px',
              fontSize: 18,
              opacity: 0.7,
            }}
          >
            <span>Verified Listings</span>
            <span>·</span>
            <span>Free to Browse</span>
            <span>·</span>
            <span>Boulder Focused</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
