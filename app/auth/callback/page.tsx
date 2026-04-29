'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Supabase handles the hash token automatically.
    // onAuthStateChange in AuthProvider triggers syncAll.
    supabase.auth.getSession().then(() => {
      router.replace('/');
    });
  }, [router]);

  return (
    <div className="max-w-[400px] mx-auto mt-16 px-4 text-center">
      <div className="text-4xl mb-4">⏳</div>
      <p className="text-[var(--text-muted)]">Connexion en cours...</p>
    </div>
  );
}
