'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: 'Accueil', icon: '🏠' },
  { href: '/lessons', label: 'Leçons', icon: '📘' },
  { href: '/daily', label: 'Aujourd\'hui', icon: '📅' },
  { href: '/review', label: 'Révision', icon: '🔄' },
  { href: '/stats', label: 'Stats', icon: '📊' },
];

export default function Navbar() {
  const path = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="side-nav" style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: 220,
        background: 'var(--bg-card)', borderRight: '1px solid var(--border)',
        flexDirection: 'column', padding: '1.5rem 0', zIndex: 50,
      }}>
        <div style={{ padding: '0 1.25rem', marginBottom: '2rem' }}>
          <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--accent-blue)' }}>MK Learn</span>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Apprentissage Macédonien</div>
        </div>
        {NAV.map((item) => {
          const active = path === item.href || (item.href !== '/' && path.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1.25rem', textDecoration: 'none',
                color: active ? 'var(--accent-blue)' : 'var(--text-muted)',
                background: active ? 'rgba(74,158,255,0.1)' : 'transparent',
                fontWeight: active ? 700 : 400, fontSize: '0.9rem',
                borderRight: active ? '3px solid var(--accent-blue)' : '3px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
        <div style={{ flex: 1 }} />
        <Link href="/settings" style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.75rem 1.25rem', textDecoration: 'none',
          color: 'var(--text-muted)', fontSize: '0.9rem',
        }}>
          ⚙️ Paramètres
        </Link>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav">
        {NAV.map((item) => {
          const active = path === item.href || (item.href !== '/' && path.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '0.6rem 0', textDecoration: 'none',
                color: active ? 'var(--accent-blue)' : 'var(--text-muted)',
                fontSize: '0.7rem', gap: '0.2rem',
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
