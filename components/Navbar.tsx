'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: 'Accueil', icon: '🏠' },
  { href: '/lessons', label: 'Leçons', icon: '📘' },
  { href: '/daily', label: "Aujourd'hui", icon: '📅' },
  { href: '/review', label: 'Révision', icon: '🔄' },
  { href: '/practice', label: 'Exercices', icon: '⚡' },
  { href: '/stats', label: 'Stats', icon: '📊' },
];

export default function Navbar() {
  const path = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        className="side-nav fixed top-0 left-0 bottom-0 w-[220px] flex-col py-6 z-50 bg-[var(--bg-card)] border-r border-[var(--border)]"
      >
        <div className="px-5 mb-8">
          <span className="font-extrabold text-xl text-[var(--accent-blue)]">MK Learn</span>
          <div className="text-xs text-[var(--text-muted)] mt-[0.2rem]">Apprentissage Macédonien</div>
        </div>
        {NAV.map((item) => {
          const active = path === item.href || (item.href !== '/' && path.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 py-3 px-5 no-underline text-[0.9rem] transition-all duration-[150ms]"
              style={{
                color: active ? 'var(--accent-blue)' : 'var(--text-muted)',
                background: active ? 'rgba(74,158,255,0.1)' : 'transparent',
                fontWeight: active ? 700 : 400,
                borderRight: active ? '3px solid var(--accent-blue)' : '3px solid transparent',
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
        <div className="flex-1" />
        <Link
          href="/settings"
          className="flex items-center gap-3 py-3 px-5 no-underline text-[0.9rem] text-[var(--text-muted)]"
        >
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
              className="flex-1 flex flex-col items-center py-[0.6rem] no-underline text-[0.7rem] gap-[0.2rem]"
              style={{ color: active ? 'var(--accent-blue)' : 'var(--text-muted)' }}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
