'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startChallenge } from '@/lib/api';

const THEMES = [
  { label: '副業', icon: '💼' },
  { label: '勉強', icon: '📚' },
  { label: '運動', icon: '🏃' },
  { label: '生活', icon: '🌱' },
];

export default function NewChallengePage() {
  const router = useRouter();
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    setLoading(true);
    try {
      const challenge = await startChallenge(selectedTheme ?? undefined);
      router.push(`/challenge/${challenge.id}`);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  return (
    <div style={{ paddingTop: 40, animation: 'fadeIn 0.3s ease' }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes bounce { from { transform:translateY(0); } to { transform:translateY(-8px); } }
        @keyframes glow {
          from { text-shadow: 0 0 10px rgba(150,100,255,0.6); }
          to   { text-shadow: 0 0 20px rgba(180,130,255,1), 0 0 40px rgba(120,80,255,0.6); }
        }
      `}</style>

      <div className="text-center mb-8">
        <div className="font-pixel text-lg mb-1" style={{ color: '#fff', animation: 'glow 2s ease-in-out infinite alternate' }}>
          mini<span style={{ color: '#a78bfa' }}>buddy</span>
        </div>
      </div>

      <div className="text-center mb-10">
        <span style={{ fontSize: 56, display: 'block', marginBottom: 20, animation: 'bounce 1s ease-in-out infinite alternate' }}>
          🎮
        </span>
        <div className="font-pixel mb-3" style={{ fontSize: 13, color: '#fff', lineHeight: 2 }}>
          7日チャレンジ
        </div>
        <p style={{ fontSize: 13, color: '#888', lineHeight: 1.8 }}>
          1日1分の入力だけ。<br />
          仲間の気配を感じながら<br />
          7日間やり切ろう。
        </p>
      </div>

      <div className="font-pixel mb-3" style={{ fontSize: 9, color: '#a78bfa', letterSpacing: 1 }}>
        テーマを選ぶ（任意）
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {THEMES.map(t => (
          <button
            key={t.label}
            onClick={() => setSelectedTheme(selectedTheme === t.label ? null : t.label)}
            style={{
              padding: '12px',
              borderRadius: 12,
              border: `1px solid ${selectedTheme === t.label ? 'rgba(167,139,250,0.6)' : 'rgba(255,255,255,0.1)'}`,
              background: selectedTheme === t.label ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.03)',
              color: selectedTheme === t.label ? '#a78bfa' : '#aaa',
              fontFamily: 'M PLUS Rounded 1c, sans-serif',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div
        style={{ fontSize: 12, color: '#555', textAlign: 'center', marginBottom: 24, cursor: 'pointer', textDecoration: 'underline' }}
        onClick={() => setSelectedTheme(null)}
      >
        スキップして開始
      </div>

      <button
        onClick={handleStart}
        disabled={loading}
        className="font-pixel w-full"
        style={{
          padding: '18px',
          borderRadius: 14,
          border: 'none',
          background: loading ? '#444' : 'linear-gradient(135deg, #6d28d9, #7c3aed, #8b5cf6)',
          color: '#fff',
          fontSize: 11,
          letterSpacing: 2,
          cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: loading ? 'none' : '0 6px 30px rgba(109,40,217,0.5)',
          transition: 'all 0.2s',
        }}
      >
        {loading ? 'LOADING...' : '▶ チャレンジ開始'}
      </button>
    </div>
  );
}
