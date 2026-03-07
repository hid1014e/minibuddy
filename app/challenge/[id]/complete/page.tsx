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
  const rate = Math.round((doneCount / 7) * 100);

  const reflection = doneCount === 7
    ? `全7日、完璧に達成！達成率100% 🔥`
    : doneCount >= 5
    ? `${doneCount}/7日達成（達成率${rate}%）。よくやった！`
    : `${doneCount}/7日達成。次のチャレンジに活かそう。`;

  const shareText = `#minibuddy 7日チャレンジ完了！\n${doneCount}/7 達成 🔥\n${days[0]?.plan ? `「${days[0].plan}」から始めて完走しました。` : ''}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ paddingTop: 32, animation: 'fadeIn 0.3s ease' }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes celebrate { 0% { transform:scale(0) rotate(-10deg); } 60% { transform:scale(1.2) rotate(3deg); } 100% { transform:scale(1) rotate(0deg); } }
      `}</style>

      <div className="text-center mb-6">
        <div className="font-pixel" style={{ fontSize: 16, color: '#fff' }}>
          mini<span style={{ color: '#a78bfa' }}>buddy</span>
        </div>
      </div>

      <div className="text-center mb-6">
        <span style={{ fontSize: 64, display: 'block', marginBottom: 16, animation: 'celebrate 0.5s ease' }}>🏆</span>
        <div className="font-pixel mb-2" style={{ fontSize: 14, color: '#fbbf24' }}>CHALLENGE CLEAR!</div>
        <p style={{ fontSize: 14, color: '#888' }}>7日間やり切った、すごい。</p>
      </div>

      <div style={{
        background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)',
        borderRadius: 16, padding: 20, textAlign: 'center', marginBottom: 20,
      }}>
        <span className="font-pixel" style={{ fontSize: 36, color: '#fbbf24' }}>{doneCount}</span>
        <span className="font-pixel" style={{ fontSize: 20, color: '#666' }}> / 7</span>
        <div style={{ fontSize: 12, color: '#888', marginTop: 8, fontWeight: 700 }}>達成日数</div>
        <div style={{ fontSize: 13, color: '#aaa', marginTop: 8 }}>{reflection}</div>
      </div>

      <div className="font-pixel flex items-center gap-2 mb-3" style={{ fontSize: 9, color: '#a78bfa', letterSpacing: 1 }}>
        7日ログ
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(167,139,250,0.3), transparent)' }} />
      </div>
      <div className="flex flex-col gap-2 mb-5">
        {days.map(d => (
          <div key={d.day_number} style={{
            background: d.status === 'done' ? 'rgba(52,211,153,0.04)' : 'rgba(251,113,133,0.02)',
            border: `1px solid ${d.status === 'done' ? 'rgba(52,211,153,0.3)' : 'rgba(251,113,133,0.2)'}`,
            borderRadius: 12, padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span className="font-pixel" style={{ fontSize: 8, color: d.status === 'done' ? '#34d399' : '#fb7185', minWidth: 28 }}>
              D{d.day_number}
            </span>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#e8e8ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.plan}
            </div>
            <span style={{ fontSize: 16 }}>{d.status === 'done' ? '✅' : '❌'}</span>
          </div>
        ))}
      </div>

      <div className="font-pixel flex items-center gap-2 mb-3" style={{ fontSize: 9, color: '#a78bfa', letterSpacing: 1 }}>
        共有する
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(167,139,250,0.3), transparent)' }} />
      </div>
      <div onClick={handleCopy} style={{
        background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12, padding: '14px 16px', fontSize: 13, color: '#aaa',
        lineHeight: 1.7, cursor: 'pointer', marginBottom: 12, position: 'relative',
        whiteSpace: 'pre-line',
      }}>
        <span style={{ position: 'absolute', top: 8, right: 10, fontSize: 10, color: '#555', fontWeight: 700 }}>
          {copied ? '✓ コピー済' : 'タップでコピー'}
        </span>
        {shareText}
      </div>

      <a href="https://myapp-hides-projects-19f80db4.vercel.app/" target="_blank" rel="noopener noreferrer" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: 14, borderRadius: 12, border: '1px solid rgba(52,211,153,0.3)',
        background: 'rgba(52,211,153,0.05)', color: '#34d399', fontSize: 13,
        fontWeight: 700, textDecoration: 'none', transition: 'all 0.15s', marginBottom: 8,
      }}>
        🚀 BuddyShare本編を試す（任意）
      </a>
      <p style={{ fontSize: 11, color: '#444', textAlign: 'center' }}>
        7日回せた人だけ、バディモードも試せます
      </p>
    </div>
  );
}
