'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { syncAll, pushAllCards, pushProgress, pushDistractorMemory } from '@/lib/sync';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  signIn: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
});

export function useAuth() { return useContext(Ctx); }

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      // Sync on app load if already logged in (e.g. returning user, different device)
      if (session?.user) void syncAll();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (event === 'SIGNED_IN') {
          // Pull remote first (cross-device sync), then push any local-only data
          await syncAll();
          void Promise.all([pushAllCards(), pushProgress(), pushDistractorMemory()]);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    try {
      // scope:'local' supprime le token localStorage sans appel réseau — toujours fiable
      await supabase.auth.signOut({ scope: 'local' });
    } catch { /* ignore */ }
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, signIn, signOut }}>{children}</Ctx.Provider>;
}
