'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startChallenge } from '@/lib/api';

const THEMES = [
  { label: '健康', icon: '💊', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: '#34d399' },
  { label: 'お金', icon: '🪙', color: '#f0c040', bg: 'rgba(240,192,64,0.1)', border: '#f0c040' },
  { label: '夢', icon: '🔮', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: '#a78bfa' },
  { label: 'キャリア', icon: '📜', color: '#7dd3fc', bg: 'rgba(125,211,252,0.1)', border: '#7dd3fc' },
  { label: '人間関係', icon: '🫂', color: '#fda4af', bg: 'rgba(253,164,175,0.1)', border: '#fda4af' },
  { label: 'その他', icon: '🧪', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: '#94a3b8' },
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
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .theme-btn:hover { transform:translateY(-2px); }
        .start-btn:hover { transform:translateY(-2px); }
      `}</style>

      <div style={{ textAlign: 'center', marginBottom: 28, animation: 'fadeUp 0.4s ease' }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 30, color: '#f0c040', textShadow: '0 0 20px rgba(240,192,64,0.5)' }}>
          Hagrit
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 28, animation: 'fadeUp 0.5s ease' }}>
        <div style={{ fontSize: 52, animation: 'float 3s ease-in-out infinite', display: 'inline-block', marginBottom: 12 }}>🪄</div>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 20, color: '#f1f5f9', marginBottom: 8 }}>
          習慣の魔法を解き放て
        </div>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.8, margin: 0 }}>
          7日間の小さな積み重ねが<br />あなたを変える。
        </p>
      </div>

      {/* テーマ選択 */}
      <div style={{ background: '#1e2d4a', borderRadius: 20, padding: 20, marginBottom: 14, animation: 'fadeUp 0.6s ease', border: '1px solid #2d3f5a' }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#f0c040', marginBottom: 14, letterSpacing: '0.05em' }}>
          カテゴリ <span style={{ fontSize: 11, fontFamily: 'Nunito, sans-serif', color: '#94a3b8', fontWeight: 600 }}>（任意）</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {THEMES.map(t => (
            <button key={t.label} className="theme-btn" onClick={() => setSelectedTheme(selectedTheme === t.label ? null : t.label)} style={{ padding: '14px 6px', borderRadius: 14, border: `1.5px solid ${selectedTheme === t.label ? t.border : '#2d3f5a'}`, background: selectedTheme === t.label ? t.bg : 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, boxShadow: selectedTheme === t.label ? `0 4px 14px ${t.bg}` : 'none' }}>
              <span style={{ fontSize: 22 }}>{t.icon}</span>
              <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 700, color: selectedTheme === t.label ? t.color : '#94a3b8' }}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 目標入力 */}
      <div style={{ background: '#1e2d4a', borderRadius: 20, padding: 20, marginBottom: 20, animation: 'fadeUp 0.65s ease', border: '1px solid #2d3f5a' }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#f0c040', marginBottom: 4, letterSpacing: '0.05em' }}>
          7日間の目標 <span style={{ fontSize: 11, fontFamily: 'Nunito, sans-serif', color: '#f87171', fontWeight: 700 }}>必須</span>
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, marginBottom: 12 }}>
          例：毎朝ランニング30分、英単語を10個覚える
        </div>
        <input
          value={goal}
          onChange={e => setGoal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleStart()}
          placeholder="具体的な目標を入力"
          maxLength={40}
          style={{ width: '100%', padding: '14px 16px', border: `1.5px solid ${canStart ? (selectedThemeData?.border ?? '#34d399') : '#2d3f5a'}`, borderRadius: 12, fontSize: 15, fontFamily: 'Nunito, sans-serif', fontWeight: 700, color: '#f1f5f9', background: '#0f1729', transition: 'all 0.15s', boxSizing: 'border-box' as const, outline: 'none' }}
        />
        <div style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', fontWeight: 700, marginTop: 6 }}>{goal.length}/40</div>
      </div>

      <button onClick={handleStart} disabled={!canStart || loading} className="start-btn" style={{ width: '100%', padding: '17px', borderRadius: 16, border: 'none', background: (!canStart || loading) ? '#1e2d4a' : 'linear-gradient(135deg, #f0c040, #c49a20)', color: (!canStart || loading) ? '#2d3f5a' : '#0f1729', fontFamily: 'Cinzel, serif', fontSize: 17, fontWeight: 700, cursor: (!canStart || loading) ? 'not-allowed' : 'pointer', boxShadow: (!canStart || loading) ? 'none' : '0 6px 0 #8a6000, 0 0 30px rgba(240,192,64,0.3)', transition: 'all 0.15s', animation: 'fadeUp 0.7s ease', letterSpacing: '0.05em' }}>
        {loading ? '起動中...' : selectedThemeData ? `${selectedThemeData.icon} 修行開始！` : '✦ 修行開始！'}
      </button>
    </div>
  );
}
