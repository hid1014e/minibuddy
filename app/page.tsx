'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getActiveChallenge, getProfile } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error || !data.user) return;
        router.replace(`/nickname?uid=${data.user.id}&next=${encodeURIComponent('/challenge/new')}`);
        return;
      }
      const profile = await getProfile(user.id);
      if (!profile) {
        const challenge = await getActiveChallenge();
        const next = challenge ? `/challenge/${challenge.id}` : '/challenge/new';
        router.replace(`/nickname?uid=${user.id}&next=${encodeURIComponent(next)}`);
        return;
      }
      const challenge = await getActiveChallenge();
      router.replace(challenge ? `/challenge/${challenge.id}` : '/challenge/new');
    }
    init();
  }, [router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 30, color: '#f0c040', textShadow: '0 0 20px rgba(240,192,64,0.5)', marginBottom: 12 }}>Hagrit</div>
        <div style={{ color: '#94a3b8', fontSize: 14, fontWeight: 700 }}>読み込み中...</div>
      </div>
    </div>
  );
}
