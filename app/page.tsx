'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getActiveChallenge, getProfile } from '@/lib/api';
import { supabase } from '@/lib/supabase';

function isSecretMode(): boolean {
  try {
    const key = '__secret_test__';
    localStorage.setItem(key, '1');
    localStorage.removeItem(key);
    // localStorageに既存のセッションがあるか確認
    const existing = localStorage.getItem('minibuddy-auth-v2');
    return !existing; // キーがなければ新規（シークレット含む）
  } catch {
    return true; // localStorage自体使えない = シークレット
  }
}

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const secret = isSecretMode();

      if (secret) {
        // 既存セッションを無視して新規匿名ログイン
        await supabase.auth.signOut();
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error || !data.user) return;
        router.replace(`/nickname?uid=${data.user.id}&next=${encodeURIComponent('/challenge/new')}`);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error || !data.user) return;
        router.replace(`/nickname?uid=${data.user.id}&next=${encodeURIComponent('/challenge/new')}`);
        return;
      }

      const profile = await getProfile(session.user.id);
      if (!profile) {
        const challenge = await getActiveChallenge();
        const next = challenge ? `/challenge/${challenge.id}` : '/challenge/new';
        router.replace(`/nickname?uid=${session.user.id}&next=${encodeURIComponent(next)}`);
        return;
      }

      const challenge = await getActiveChallenge();
      router.replace(challenge ? `/challenge/${challenge.id}` : '/challenge/new');
    }
    init();
  }, [router]);

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontFamily:'Fredoka One, cursive', fontSize:32, color:'#58cc02', textShadow:'0 4px 0 #46a302', marginBottom:12 }}>
          mini<span style={{ color:'#1cb0f6' }}>buddy</span>
        </div>
        <div style={{ color:'#afafaf', fontSize:14, fontWeight:700 }}>Loading...</div>
      </div>
    </div>
  );
}
