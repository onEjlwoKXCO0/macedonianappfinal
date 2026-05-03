import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180, height: 180,
          background: '#0f0f12',
          borderRadius: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div style={{ fontSize: 88, lineHeight: 1 }}>🇲🇰</div>
        <div style={{ color: '#4a9eff', fontSize: 30, fontWeight: 800, letterSpacing: -1 }}>
          MK
        </div>
      </div>
    ),
    { ...size }
  );
}
