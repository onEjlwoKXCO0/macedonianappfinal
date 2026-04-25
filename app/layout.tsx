import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'MK Learn — Macédonien',
  description: 'Application personnelle d\'apprentissage du macédonien',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ minHeight: '100vh' }}>
        <Navbar />
        <main className="main-content" style={{ paddingBottom: '5rem' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
