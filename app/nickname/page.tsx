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

  // 既にプロフィールがあればスキップ
  useEffect(() => {
    async function check() {
      if (!userId) return;
      const profile = await getProfile(userId);
      if (profile) {
        router.replace(next);
        return;
      }
      setLoading(false);
    }
    check();
  }, [userId, next, router]);

  async function handleSubmit() {
    if (!nickname.trim()) { setError('ニックネームを入力してください'); return; }
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
          <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 32, color: '#58cc02', textShadow: '0 4px 0 #46a302', marginBottom: 12 }}>
            mini<span style={{ color: '#1cb0f6' }}>buddy</span>
          </div>
          <div style={{ color: '#afafaf', fontSize: 14, fontWeight: 700 }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 60 }}>
      <style>{`
        @keyframes bounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .submit-btn:hover { transform:translateY(-2px); box-shadow: 0 8px 24px rgba(28,176,246,0.5) !important; }
        .submit-btn:active { transform:translateY(2px); box-shadow:none !important; }
        .nick-input:focus { border-color: #1cb0f6 !important; box-shadow: 0 0 0 3px rgba(28,176,246,0.2) !important; outline:none; }
      `}</style>

      <div style={{ textAlign: 'center', marginBottom: 32, animation: 'fadeUp 0.4s ease' }}>
        <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 32, color: '#58cc02', textShadow: '0 4px 0 #46a302' }}>
          mini<span style={{ color: '#1cb0f6' }}>buddy</span>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 32, animation: 'fadeUp 0.5s ease' }}>
        <div style={{ fontSize: 64, animation: 'bounce 2s ease-in-out infinite', display: 'inline-block', marginBottom: 12 }}>👋</div>
        <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 24, color: '#3c3c3c', marginBottom: 8 }}>
          はじめまして！
        </div>
        <p style={{ fontSize: 14, color: '#777', lineHeight: 1.7, margin: 0 }}>
          仲間に表示されるニックネームを<br />決めてください（10文字以内）
        </p>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 4px 0 #d0d0d0', animation: 'fadeUp 0.6s ease' }}>
        <label style={{ fontFamily: 'Fredoka One, cursive', fontSize: 15, color: '#3c3c3c', display: 'block', marginBottom: 10 }}>
          ニックネーム
        </label>
        <input
          className="nick-input"
          value={nickname}
          onChange={e => { setNickname(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="例：たろう、study_cat"
          maxLength={10}
          style={{
            width: '100%', padding: '14px 16px',
            border: `3px solid ${error ? '#ff4b4b' : '#e5e5e5'}`,
            borderRadius: 14, fontSize: 16,
            fontFamily: 'Nunito, sans-serif', fontWeight: 700,
            color: '#3c3c3c', background: '#fafafa',
            transition: 'all 0.15s', marginBottom: 6,
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: '#ff4b4b', fontWeight: 700 }}>{error}</span>
          <span style={{ fontSize: 12, color: '#afafaf', fontWeight: 700 }}>{nickname.length}/10</span>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!nickname.trim()}
          className="submit-btn"
          style={{
            width: '100%', padding: '16px',
            borderRadius: 14, border: 'none',
            background: !nickname.trim() ? '#e5e5e5' : '#1cb0f6',
            color: !nickname.trim() ? '#afafaf' : '#fff',
            fontFamily: 'Fredoka One, cursive', fontSize: 18,
            cursor: !nickname.trim() ? 'not-allowed' : 'pointer',
            boxShadow: !nickname.trim() ? 'none' : '0 6px 0 #0a91d1',
            transition: 'all 0.15s',
          }}
        >
          決定！✨
        </button>
      </div>
    </div>
  );
}

export default function NicknamePage() {
  return <Suspense><NicknameForm /></Suspense>;
}
