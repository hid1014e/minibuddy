'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startChallenge } from '@/lib/api';

const THEMES = [
  { label: '健康', icon: '💊', color: '#00d4aa', bg: 'rgba(0,212,170,0.1)', shadow: 'rgba(0,212,170,0.3)', border: '#00d4aa' },
  { label: 'お金', icon: '🪙', color: '#ffd700', bg: 'rgba(255,215,0,0.1)', shadow: 'rgba(255,215,0,0.3)', border: '#ffd700' },
  { label: '夢', icon: '🔮', color: '#9b59ff', bg: 'rgba(155,89,255,0.1)', shadow: 'rgba(155,89,255,0.3)', border: '#9b59ff' },
  { label: 'キャリア', icon: '📜', color: '#c39bff', bg: 'rgba(195,155,255,0.1)', shadow: 'rgba(195,155,255,0.3)', border: '#c39bff' },
  { label: '人間関係', icon: '🫂', color: '#ff4b6e', bg: 'rgba(255,75,110,0.1)', shadow: 'rgba(255,75,110,0.3)', border: '#ff4b6e' },
  { label: 'その他', icon: '🧪', color: '#9988bb', bg: 'rgba(153,136,187,0.1)', shadow: 'rgba(153,136,187,0.3)', border: '#9988bb' },
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
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-12px); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes cauldron { 0%,100% { transform:scale(1) rotate(-2deg); } 50% { transform:scale(1.05) rotate(2deg); } }
        .theme-btn:hover { transform:translateY(-3px); }
        .start-btn:hover { transform:translateY(-2px); }
      `}</style>

      <div style={{ textAlign: 'center', marginBottom: 28, animation: 'fadeUp 0.4s ease' }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 32, color: '#9b59ff', textShadow: '0 0 20px rgba(155,89,255,0.8)' }}>
          Hagrit
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 28, animation: 'fadeUp 0.5s ease' }}>
        <div style={{ fontSize: 56, animation: 'cauldron 3s ease-in-out infinite', display: 'inline-block', marginBottom: 12 }}>⚗️</div>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 20, color: '#f0e6ff', marginBottom: 8 }}>
          新しい呪文を唱えよう
        </div>
        <p style={{ fontSize: 14, color: '#9988bb', lineHeight: 1.7, margin: 0 }}>
          7日間の魔法修行。<br />仲間の魔力を感じながらやり切ろう！
        </p>
      </div>

      {/* テーマ選択 */}
      <div style={{ background: '#2d1b4e', borderRadius: 20, padding: 20, boxShadow: '0 4px 0 #1a0a2e', marginBottom: 16, animation: 'fadeUp 0.6s ease', border: '1px solid #4a3a6a' }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: '#c39bff', marginBottom: 14 }}>
          魔法の系統 <span style={{ fontSize: 11, fontFamily: 'Nunito, sans-serif', color: '#9988bb', fontWeight: 600 }}>（任意）</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {THEMES.map(t => (
            <button
              key={t.label}
              className="theme-btn"
              onClick={() => setSelectedTheme(selectedTheme === t.label ? null : t.label)}
              style={{
                padding: '14px 6px', borderRadius: 14,
                border: `2px solid ${selectedTheme === t.label ? t.border : '#4a3a6a'}`,
                background: selectedTheme === t.label ? t.bg : 'rgba(255,255,255,0.03)',
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                boxShadow: selectedTheme === t.label ? `0 4px 12px ${t.shadow}` : 'none',
              }}
            >
              <span style={{ fontSize: 24 }}>{t.icon}</span>
              <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 700, color: selectedTheme === t.label ? t.color : '#9988bb' }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 目標入力 */}
      <div style={{ background: '#2d1b4e', borderRadius: 20, padding: 20, boxShadow: '0 4px 0 #1a0a2e', marginBottom: 20, animation: 'fadeUp 0.65s ease', border: '1px solid #4a3a6a' }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: '#c39bff', marginBottom: 4 }}>
          7日間の誓い <span style={{ fontSize: 11, fontFamily: 'Nunito, sans-serif', color: '#ff4b6e', fontWeight: 700 }}>必須</span>
        </div>
        <div style={{ fontSize: 12, color: '#9988bb', fontWeight: 700, marginBottom: 12 }}>
          例：毎朝ランニング30分、英単語を10個覚える
        </div>
        <input
          value={goal}
          onChange={e => setGoal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleStart()}
          placeholder="具体的な目標を入力"
          maxLength={40}
          style={{
            width: '100%', padding: '14px 16px',
            border: `2px solid ${canStart ? (selectedThemeData?.border ?? '#9b59ff') : '#4a3a6a'}`,
            borderRadius: 14, fontSize: 16,
            fontFamily: 'Nunito, sans-serif', fontWeight: 700,
            color: '#f0e6ff', background: '#1a0a2e',
            transition: 'all 0.15s', boxSizing: 'border-box' as const,
            outline: 'none',
          }}
        />
        <div style={{ textAlign: 'right', fontSize: 12, color: '#9988bb', fontWeight: 700, marginTop: 6 }}>
          {goal.length}/40
        </div>
      </div>

      <button
        onClick={handleStart}
        disabled={!canStart || loading}
        className="start-btn"
        style={{
          width: '100%', padding: '18px',
          borderRadius: 16, border: 'none',
          background: (!canStart || loading) ? '#2d1b4e' : 'linear-gradient(135deg, #9b59ff, #6a1fc2)',
          color: (!canStart || loading) ? '#4a3a6a' : '#fff',
          fontFamily: 'Cinzel, serif', fontSize: 18,
          cursor: (!canStart || loading) ? 'not-allowed' : 'pointer',
          boxShadow: (!canStart || loading) ? 'none' : '0 6px 0 #4a0f8a, 0 0 30px rgba(155,89,255,0.4)',
          transition: 'all 0.15s',
          animation: 'fadeUp 0.7s ease',
        }}
      >
        {loading ? '呪文詠唱中...' : selectedThemeData ? `${selectedThemeData.icon} 修行開始！` : '🪄 修行開始！'}
      </button>
    </div>
  );
}
