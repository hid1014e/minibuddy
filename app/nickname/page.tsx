'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createProfile, getProfile } from '@/lib/api';

function NicknameForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('uid') ?? '';
  const next = searchParams.get('next') ?? '/challenge/new';

  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function check() {
      if (!userId) return;
      const profile = await getProfile(userId);
      if (profile) { router.replace(next); return; }
      setLoading(false);
    }
    check();
  }, [userId, next, router]);

  async function handleSubmit() {
    if (!nickname.trim()) { setError('魔法名を入力してください'); return; }
    if (nickname.length > 10) { setError('10文字以内で入力してください'); return; }
    setLoading(true);
    try {
      await createProfile(userId, nickname.trim());
      router.replace(next);
    } catch {
      setError('エラーが発生しました。もう一度試してください。');
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 32, color: '#9b59ff', textShadow: '0 0 20px rgba(155,89,255,0.8)', marginBottom: 12 }}>Hagrit</div>
          <div style={{ color: '#9988bb', fontSize: 14, fontWeight: 700 }}>召喚中...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 60 }}>
      <style>{`
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-12px); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes glow { 0%,100% { box-shadow: 0 0 10px rgba(155,89,255,0.3); } 50% { box-shadow: 0 0 25px rgba(155,89,255,0.6); } }
        .submit-btn:hover { transform:translateY(-2px); }
        .nick-input:focus { border-color: #9b59ff !important; box-shadow: 0 0 0 3px rgba(155,89,255,0.3) !important; outline:none; }
      `}</style>

      <div style={{ textAlign: 'center', marginBottom: 32, animation: 'fadeUp 0.4s ease' }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 32, color: '#9b59ff', textShadow: '0 0 20px rgba(155,89,255,0.8)' }}>
          Hagrit
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 32, animation: 'fadeUp 0.5s ease' }}>
        <div style={{ fontSize: 64, animation: 'float 3s ease-in-out infinite', display: 'inline-block', marginBottom: 16 }}>🧙</div>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 20, color: '#f0e6ff', marginBottom: 8 }}>
          魔法使いに入学
        </div>
        <p style={{ fontSize: 14, color: '#9988bb', lineHeight: 1.7, margin: 0 }}>
          あなたの魔法名（ニックネーム）を<br />決めてください（10文字以内）
        </p>
      </div>

      <div style={{ background: '#2d1b4e', borderRadius: 20, padding: 24, boxShadow: '0 4px 0 #1a0a2e, 0 0 30px rgba(155,89,255,0.1)', animation: 'fadeUp 0.6s ease', border: '1px solid #4a3a6a' }}>
        <label style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: '#c39bff', display: 'block', marginBottom: 10 }}>
          魔法名
        </label>
        <input
          className="nick-input"
          value={nickname}
          onChange={e => { setNickname(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="例：たろう、shadow_cat"
          maxLength={10}
          style={{
            width: '100%', padding: '14px 16px',
            border: `2px solid ${error ? '#ff4b6e' : '#4a3a6a'}`,
            borderRadius: 14, fontSize: 16,
            fontFamily: 'Nunito, sans-serif', fontWeight: 700,
            color: '#f0e6ff', background: '#1a0a2e',
            transition: 'all 0.15s', marginBottom: 6,
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: '#ff4b6e', fontWeight: 700 }}>{error}</span>
          <span style={{ fontSize: 12, color: '#9988bb', fontWeight: 700 }}>{nickname.length}/10</span>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!nickname.trim()}
          className="submit-btn"
          style={{
            width: '100%', padding: '16px',
            borderRadius: 14, border: 'none',
            background: !nickname.trim() ? '#2d1b4e' : 'linear-gradient(135deg, #9b59ff, #6a1fc2)',
            color: !nickname.trim() ? '#4a3a6a' : '#fff',
            fontFamily: 'Cinzel, serif', fontSize: 16,
            cursor: !nickname.trim() ? 'not-allowed' : 'pointer',
            boxShadow: !nickname.trim() ? 'none' : '0 6px 0 #4a0f8a, 0 0 20px rgba(155,89,255,0.4)',
            transition: 'all 0.15s',
          }}
        >
          魔法学校へ入学 ✨
        </button>
      </div>
    </div>
  );
}

export default function NicknamePage() {
  return <Suspense><NicknameForm /></Suspense>;
}
