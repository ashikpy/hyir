import { ImageResponse } from 'next/og'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#09090b',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          border: '1px solid #27272a',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 302 283"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M151 0.5V197L75.5 281.5H0.5V84.5L75.5 0.5H151Z"
            fill="#fafafa"
          />
          <path
            d="M225.5 112.5L151.5 197.229V282H301V112.5H225.5Z"
            fill="#fafafa"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
