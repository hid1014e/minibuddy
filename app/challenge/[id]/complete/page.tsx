'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getDays } from '@/lib/api';
import { MiniChallengeDay } from '@/lib/types';

export default function CompletePage() {
  const params = useParams();
  const challengeId = params.id as string;
  const [days, setDays] = useState<MiniChallengeDay[]>([]);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const d = await getDays(challengeId);
    setDays(d);
  }, [challengeId]);

  useEffect(() => { load(); }, [load]);

  const doneCount = days.filter(d => d.status === 'done').length;
  const totalDays = days.length; // 実際に記録した日数

  // 達成数に応じてヒーロー表示を変える
  const hero = doneCount === 7
    ? { emoji: '🏆', color: '#ff9600', bg: 'linear-gradient(135deg, #fff9e6, #fff3d7)', border: '#ffc800', shadow: '#e0b000', message: '完璧！全7日達成！\nあなたは本物です 🎉' }
    : doneCount >= 5
    ? { emoji: '🌟', color: '#1cb0f6', bg: 'linear-gradient(135deg, #e8f8ff, #ddf4ff)', border: '#1cb0f6', shadow: '#0a91d1', message: `${doneCount}/7日達成！\n素晴らしい継続力です 👏` }
    : doneCount >= 3
    ? { emoji: '💪', color: '#58cc02', bg: 'linear-gradient(135deg, #f0fce4, #e0f8c8)', border: '#58cc02', shadow: '#46a302', message: `${doneCount}/7日達成。\n次はもっとやれる！` }
    : { emoji: '🌱', color: '#ce82ff', bg: 'linear-gradient(135deg, #f8f0ff, #f1d9ff)', border: '#ce82ff', shadow: '#9c44c0', message: `${doneCount}/7日。\nまず始めたことが大事！` };

  // シェアテキスト（「から始めて」は削除）
  const shareText = `#minibuddy 7日チャレンジ完了！\n${doneCount}/7 達成 🔥`;

  async function handleCopy() {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ paddingTop: 32 }}>
      <style>{`
        @keyframes celebrate { 0% { transform:scale(0) rotate(-15deg); } 60% { transform:scale(1.25) rotate(5deg); } 100% { transform:scale(1) rotate(0deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes bounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
      `}</style>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 24, animation: 'fadeUp 0.3s ease' }}>
        <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 28, color: '#58cc02', textShadow: '0 3px 0 #46a302' }}>
          mini<span style={{ color: '#1cb0f6' }}>buddy</span>
        </div>
      </div>

      {/* Hero - 達成数に応じて変わる */}
      <div style={{
        background: hero.bg,
        border: `2.5px solid ${hero.border}`,
        borderRadius: 24, padding: '28px 20px',
        textAlign: 'center', marginBottom: 20,
        boxShadow: `0 6px 0 ${hero.shadow}`,
        animation: 'fadeUp 0.4s ease',
      }}>
        <div style={{ fontSize: 72, animation: 'celebrate 0.6s ease, bounce 2s 0.6s ease-in-out infinite', display: 'inline-block', marginBottom: 12 }}>
          {hero.emoji}
        </div>
        <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 26, color: hero.color, marginBottom: 8 }}>
          7日チャレンジ終了！
        </div>
        <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 52, color: '#3c3c3c', lineHeight: 1, marginBottom: 10 }}>
          {doneCount}<span style={{ fontSize: 24, color: '#afafaf' }}>/7</span>
        </div>
        <div style={{ fontSize: 15, color: '#555', fontWeight: 700, marginBottom: 14, whiteSpace: 'pre-line', lineHeight: 1.6 }}>
          {hero.message}
        </div>
        {/* 星は達成数だけ光る */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} style={{ fontSize: 22, opacity: i < doneCount ? 1 : 0.15, transition: 'opacity 0.3s' }}>⭐</span>
          ))}
        </div>
      </div>

      {/* 7日ログ */}
      <div style={{ animation: 'fadeUp 0.5s ease', marginBottom: 16 }}>
        <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 18, color: '#3c3c3c', marginBottom: 10 }}>
          7日ログ 📋
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {days.map(d => (
            <div key={d.day_number} style={{
              background: d.status === 'done' ? '#f0fce4' : '#fff0f0',
              border: `2px solid ${d.status === 'done' ? '#58cc02' : '#ff4b4b'}`,
              borderRadius: 14, padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: d.status === 'done' ? '0 3px 0 #c8f59a' : '0 3px 0 #ffc0c0',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: d.status === 'done' ? '#58cc02' : '#ff4b4b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Fredoka One, cursive', fontSize: 13, color: '#fff', flexShrink: 0,
              }}>
                {d.day_number}
              </div>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 800, color: '#3c3c3c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.plan}
              </div>
              <span style={{ fontSize: 18 }}>{d.status === 'done' ? '✅' : '❌'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* シェア */}
      <div style={{ animation: 'fadeUp 0.6s ease', marginBottom: 16 }}>
        <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 18, color: '#3c3c3c', marginBottom: 10 }}>
          シェアしよう 📣
        </div>
        <div style={{
          background: '#fff', border: '2px solid #e5e5e5',
          borderRadius: 16, padding: '16px', marginBottom: 10,
          fontSize: 14, color: '#777', lineHeight: 1.7, whiteSpace: 'pre-line',
          fontWeight: 700, boxShadow: '0 3px 0 #e0e0e0',
        }}>
          {shareText}
        </div>
        <button onClick={handleCopy} style={{
          width: '100%', padding: '14px', borderRadius: 14,
          border: copied ? '2px solid #58cc02' : 'none',
          background: copied ? '#f0fce4' : '#1cb0f6',
          color: copied ? '#58cc02' : '#fff',
          fontFamily: 'Fredoka One, cursive', fontSize: 16,
          cursor: 'pointer',
          boxShadow: copied ? '0 4px 0 #c8f59a' : '0 5px 0 #0a91d1',
          transition: 'all 0.15s',
        }}>
          {copied ? '✅ コピーしました！' : '📋 テキストをコピー'}
        </button>
      </div>

      {/* BuddyShare誘導 - 達成数に関わらず常に表示 */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        borderRadius: 20, padding: '24px 20px',
        textAlign: 'center', marginBottom: 12,
        boxShadow: '0 6px 0 #4a3580',
        animation: 'fadeUp 0.7s ease',
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🚀</div>
        <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 18, color: '#fff', marginBottom: 8 }}>
          次のステージへ
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, marginBottom: 16, fontWeight: 700 }}>
          本格的なBuddyShareで<br />
          仲間と長期的に走り続けよう。
        </div>
        <a
          href="https://myapp-hides-projects-19f80db4.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block', padding: '14px 20px', borderRadius: 14,
            background: '#fff', color: '#764ba2',
            fontSize: 16, fontWeight: 800,
            textDecoration: 'none',
            boxShadow: '0 4px 0 rgba(0,0,0,0.2)',
            fontFamily: 'Fredoka One, cursive',
          }}
        >
          BuddyShareを試す →
        </a>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 10, fontWeight: 700 }}>
          パスワード: catcat
        </div>
      </div>
    </div>
  );
}
