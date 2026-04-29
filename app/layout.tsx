import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import ThemeProvider from '@/components/ThemeProvider';
import AuthProvider from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'MK Learn — Macédonien',
  description: 'Application personnelle d\'apprentissage du macédonien',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <AuthProvider>
          <ThemeProvider />
          <Navbar />
          <main className="main-content pb-20">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
