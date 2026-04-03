'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getActiveChallenge, getProfile, shouldShowIchijiBroom, grantIchijiBroom } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();
  const [showBroom, setShowBroom] = useState(false);
  const [broomReceived, setBroomReceived] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);

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
      const target = challenge ? `/challenge/${challenge.id}` : '/challenge/new';

      // イチジホウキ判定
      const show = await shouldShowIchijiBroom();
      if (show) {
        await grantIchijiBroom();
        setRedirectTarget(target);
        setShowBroom(true);
      } else {
        router.replace(target);
      }
    }
    init();
  }, [router]);

  function handleReceiveBroom() {
    setBroomReceived(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ichiji_broom_received', '1');
    }
    setTimeout(() => {
      if (redirectTarget) router.replace(redirectTarget);
    }, 800);
  }

  if (showBroom) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: 'radial-gradient(ellipse at center, #1a0e35 0%, #080414 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '24px',
        textAlign: 'center',
      }}>
        <style>{`
          @keyframes broomFloat {
            0%,100% { transform: translateY(0) rotate(-8deg); }
            50% { transform: translateY(-16px) rotate(8deg); }
          }
          @keyframes broomFadeIn {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes starTwinkle {
            0%,100% { opacity: 0.3; } 50% { opacity: 1; }
          }
          @keyframes goldShimmer {
            0%,100% { box-shadow: 0 0 20px rgba(240,192,64,0.3); }
            50% { box-shadow: 0 0 40px rgba(240,192,64,0.7), 0 0 80px rgba(240,192,64,0.2); }
          }
        `}</style>

        {['10%,15%', '85%,20%', '5%,70%', '90%,65%', '50%,8%'].map((pos, i) => {
          const [left, top] = pos.split(',');
          return (
            <div key={i} style={{
              position: 'absolute', left, top,
              fontSize: ['16px','12px','18px','10px','14px'][i],
              animation: `starTwinkle ${1.5 + i * 0.4}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
              color: '#f0c040',
            }}>✦</div>
          );
        })}

        <div style={{
          fontSize: '12px', color: '#f0c040', fontFamily: 'Cinzel, serif',
          letterSpacing: '0.1em', marginBottom: '20px',
          animation: 'broomFadeIn 0.6s ease',
          opacity: 0.85,
        }}>
          🦁 レオ総裁のお屋敷より
        </div>

        <div style={{
          fontSize: '88px',
          animation: 'broomFloat 3s ease-in-out infinite, broomFadeIn 0.5s ease',
          marginBottom: '28px',
          filter: 'drop-shadow(0 0 20px rgba(240,192,64,0.5))',
        }}>🧹</div>

        <div style={{
          animation: 'broomFadeIn 0.7s ease',
          marginBottom: '32px',
        }}>
          <div style={{
            fontFamily: 'Cinzel, serif', fontSize: '22px',
            color: '#f0c040', marginBottom: '12px',
            textShadow: '0 0 20px rgba(240,192,64,0.5)',
            letterSpacing: '0.05em',
          }}>
            イチジホウキ
          </div>
          <div style={{
            fontSize: '14px', color: '#c4a8f0',
            fontFamily: 'Nunito, sans-serif', fontWeight: 700,
            lineHeight: 1.7, maxWidth: '280px',
          }}>
            お主の帰還を待っておったぞ。
            <br />
            レオ総裁のお屋敷より、
            <br />
            特別なホウキを授けよう。
          </div>
        </div>

        <button
          onClick={handleReceiveBroom}
          disabled={broomReceived}
          style={{
            padding: '16px 48px',
            borderRadius: '100px',
            border: 'none',
            background: broomReceived
              ? 'rgba(240,192,64,0.3)'
              : 'linear-gradient(135deg, #f0c040, #c49a20)',
            color: broomReceived ? '#f0c040' : '#0f1729',
            fontFamily: 'Cinzel, serif',
            fontSize: '16px',
            fontWeight: 800,
            cursor: broomReceived ? 'default' : 'pointer',
            animation: 'broomFadeIn 0.9s ease, goldShimmer 2s ease-in-out infinite',
            letterSpacing: '0.05em',
            minWidth: '200px',
          }}
        >
          {broomReceived ? '✦ 受け取りました' : '🧹 受け取る'}
        </button>

        <div style={{
          marginTop: '20px', fontSize: '11px',
          color: '#5a4480', fontFamily: 'Nunito, sans-serif',
          animation: 'broomFadeIn 1s ease',
        }}>
          プロフィールから確認・使用できます
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 30, color: '#f0c040', textShadow: '0 0 20px rgba(240,192,64,0.5)', marginBottom: 12 }}>Hagrit</div>
        <div style={{ color: '#94a3b8', fontSize: 14, fontWeight: 700 }}>読み込み中...</div>
      </div>
    </div>
  );
}
