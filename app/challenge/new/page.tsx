'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startChallenge } from '@/lib/api';

const THEMES = [
  { label: '健康', icon: '💪', color: '#58cc02', bg: '#f0fce4', shadow: '#c8f59a' },
  { label: 'お金', icon: '💰', color: '#ff9600', bg: '#fff3d7', shadow: '#ffe0a0' },
  { label: '夢', icon: '🌟', color: '#ffc800', bg: '#fff8d7', shadow: '#ffe880' },
  { label: 'キャリア', icon: '🚀', color: '#1cb0f6', bg: '#ddf4ff', shadow: '#b3dfff' },
  { label: '人間関係', icon: '❤️', color: '#ff4b4b', bg: '#fff0f0', shadow: '#ffc0c0' },
  { label: 'その他', icon: '✨', color: '#ce82ff', bg: '#f1d9ff', shadow: '#e0b0ff' },
];

export default function NewChallengePage() {
  const router = useRouter();
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedThemeData = THEMES.find(t => t.label === selectedTheme);
  const canStart = goal.trim().length > 0;

  async function handleStart() {
    if (!canStart) return;
    setLoading(true);
    try {
      const challenge = await startChallenge(selectedTheme ?? undefined, goal.trim());
      router.push(`/challenge/${challenge.id}`);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  return (
    <div style={{ paddingTop: 40 }}>
      <style>{`
        @keyframes bounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-12px); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .theme-btn:hover { transform: translateY(-3px); }
        .start-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(88,204,2,0.5) !important; }
        .start-btn:active { transform: translateY(4px); box-shadow: none !important; }
        .goal-input:focus { outline: none; border-color: ${selectedThemeData?.color ?? '#1cb0f6'} !important; box-shadow: 0 0 0 3px ${selectedThemeData?.color ?? '#1cb0f6'}33 !important; }
      `}</style>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32, animation: 'fadeUp 0.4s ease' }}>
        <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 32, color: '#58cc02', textShadow: '0 4px 0 #46a302' }}>
          mini<span style={{ color: '#1cb0f6' }}>buddy</span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 28, animation: 'fadeUp 0.5s ease' }}>
        <div style={{ fontSize: 56, animation: 'bounce 2s ease-in-out infinite', display: 'inline-block', marginBottom: 12 }}>
          🎯
        </div>
        <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 24, color: '#3c3c3c', marginBottom: 8 }}>
          7日チャレンジを始めよう
        </div>
        <p style={{ fontSize: 14, color: '#777', lineHeight: 1.7, margin: 0 }}>
          毎日1分の入力だけ。<br />仲間の気配を感じながらやり切ろう！
        </p>
      </div>

      {/* テーマ選択 */}
      <div style={{ background: '#fff', borderRadius: 20, padding: 20, boxShadow: '0 4px 0 #d0d0d0', marginBottom: 16, animation: 'fadeUp 0.6s ease' }}>
        <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 16, color: '#3c3c3c', marginBottom: 14 }}>
          テーマを選ぼう <span style={{ fontSize: 12, fontFamily: 'Nunito, sans-serif', color: '#afafaf', fontWeight: 600 }}>（任意）</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {THEMES.map(t => (
            <button
              key={t.label}
              className="theme-btn"
              onClick={() => setSelectedTheme(selectedTheme === t.label ? null : t.label)}
              style={{
                padding: '14px 6px', borderRadius: 16,
                border: `3px solid ${selectedTheme === t.label ? t.color : '#e5e5e5'}`,
                background: selectedTheme === t.label ? t.bg : '#fafafa',
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                boxShadow: selectedTheme === t.label ? `0 4px 0 ${t.shadow}` : '0 4px 0 #d0d0d0',
              }}
            >
              <span style={{ fontSize: 26 }}>{t.icon}</span>
              <span style={{ fontFamily: 'Fredoka One, cursive', fontSize: 13, color: selectedTheme === t.label ? t.color : '#777' }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 目標入力 */}
      <div style={{ background: '#fff', borderRadius: 20, padding: 20, boxShadow: '0 4px 0 #d0d0d0', marginBottom: 20, animation: 'fadeUp 0.65s ease' }}>
        <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 16, color: '#3c3c3c', marginBottom: 6 }}>
          7日間の目標 <span style={{ fontSize: 12, fontFamily: 'Nunito, sans-serif', color: '#ff4b4b', fontWeight: 700 }}>必須</span>
        </div>
        <div style={{ fontSize: 13, color: '#afafaf', fontWeight: 700, marginBottom: 12 }}>
          例：毎朝ランニング30分、英単語を10個覚える
        </div>
        <input
          className="goal-input"
          value={goal}
          onChange={e => setGoal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleStart()}
          placeholder="具体的な目標を入力"
          maxLength={40}
          style={{
            width: '100%', padding: '14px 16px',
            border: `3px solid ${canStart ? (selectedThemeData?.color ?? '#58cc02') : '#e5e5e5'}`,
            borderRadius: 14, fontSize: 16,
            fontFamily: 'Nunito, sans-serif', fontWeight: 700,
            color: '#3c3c3c', background: '#fafafa',
            transition: 'all 0.15s', boxSizing: 'border-box',
          }}
        />
        <div style={{ textAlign: 'right', fontSize: 12, color: '#afafaf', fontWeight: 700, marginTop: 6 }}>
          {goal.length}/40
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={handleStart}
        disabled={!canStart || loading}
        className="start-btn"
        style={{
          width: '100%', padding: '18px',
          borderRadius: 16, border: 'none',
          background: (!canStart || loading) ? '#e5e5e5' : '#58cc02',
          color: (!canStart || loading) ? '#afafaf' : '#fff',
          fontFamily: 'Fredoka One, cursive', fontSize: 20,
          cursor: (!canStart || loading) ? 'not-allowed' : 'pointer',
          boxShadow: (!canStart || loading) ? 'none' : '0 6px 0 #46a302',
          transition: 'all 0.15s',
          animation: 'fadeUp 0.7s ease',
        }}
      >
        {loading ? '起動中...' : selectedThemeData ? `${selectedThemeData.icon} チャレンジ開始！` : '🚀 チャレンジ開始！'}
      </button>
    </div>
  );
}
