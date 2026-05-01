import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512, height: 512,
          background: '#0f0f12',
          borderRadius: 96,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ fontSize: 240, lineHeight: 1 }}>🇲🇰</div>
        <div style={{ color: '#4a9eff', fontSize: 80, fontWeight: 800, letterSpacing: -2 }}>
          MK
        </div>
      </div>
    ),
    { ...size }
  );
}
