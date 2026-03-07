'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getActiveChallenge, getProfile } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function init() {
      // Supabaseのセッションを取得（localStorageに保存済みなら復元される）
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // セッションなし（初回 or シークレット）→ 新規匿名ログイン
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error || !data.user) return;
        router.replace(
          `/nickname?uid=${data.user.id}&next=${encodeURIComponent('/challenge/new')}`
        );
        return;
      }

      // セッションあり → プロフィール確認
      const profile = await getProfile(session.user.id);
      if (!profile) {
        // プロフィール未設定ならニックネーム登録へ
        const challenge = await getActiveChallenge();
        const next = challenge ? `/challenge/${challenge.id}` : '/challenge/new';
        router.replace(`/nickname?uid=${session.user.id}&next=${encodeURIComponent(next)}`);
        return;
      }

      // プロフィールあり → チャレンジへ直行
      const challenge = await getActiveChallenge();
      router.replace(challenge ? `/challenge/${challenge.id}` : '/challenge/new');
    }
    init();
  }, [router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 32, color: '#58cc02', textShadow: '0 4px 0 #46a302', marginBottom: 12 }}>
          mini<span style={{ color: '#1cb0f6' }}>buddy</span>
        </div>
        <div style={{ color: '#afafaf', fontSize: 14, fontWeight: 700 }}>Loading...</div>
      </div>
    </div>
  );
}
