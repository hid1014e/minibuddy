'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDays, resetAndStartNew, getStreakWeeks, getTitle } from '@/lib/api';
import { MiniChallengeDay } from '@/lib/types';

export default function CompletePage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params.id as string;
  const [days, setDays] = useState<MiniChallengeDay[]>([]);
  const [copied, setCopied] = useState(false);
  const [streakWeeks, setStreakWeeks] = useState(0);

  const load = useCallback(async () => {
    const d = await getDays(challengeId);
    setDays(d);
    const weeks = await getStreakWeeks();
    setStreakWeeks(weeks);
  }, [challengeId]);

  useEffect(() => { load(); }, [load]);

  const doneCount = days.filter(d => d.status === 'done').length;
  const titleData = getTitle(streakWeeks);

  const hero = doneCount === 7
    ? { emoji: '🏆', color: '#ffd700', bg: 'rgba(255,215,0,0.08)', border: 'rgba(255,215,0,0.4)', message: '完璧な修行！全7日達成！' }
    : doneCount >= 5
    ? { emoji: '🔮', color: '#9b59ff', bg: 'rgba(155,89,255,0.08)', border: 'rgba(155,89,255,0.4)', message: `${doneCount}/7日達成！\n素晴らしい魔力です 👏` }
    : doneCount >= 3
    ? { emoji: '⚗️', color: '#00d4aa', bg: 'rgba(0,212,170,0.08)', border: 'rgba(0,212,170,0.4)', message: `${doneCount}/7日達成。\n次はもっとやれる！` }
    : { emoji: '🌱', color: '#c39bff', bg: 'rgba(195,155,255,0.08)', border: 'rgba(195,155,255,0.3)', message: `${doneCount}/7日。\nまず始めたことが大事！` };

  const retryLabel = doneCount === 7 ? '✦ 次の修行へ' : doneCount >= 5 ? '✦ もう一度挑戦する' : '✦ もう一度チャレンジする';
  const shareText = `#Hagrit 7日修行完了！\n${doneCount}/7 達成 🔮`;

  async function handleCopy() {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRetry() {
    await resetAndStartNew();
    router.replace('/challenge/new');
  }

  return (
    <div style={{ paddingTop: 32 }}>
      <style>{`
        @keyframes celebrate { 0% { transform:scale(0) rotate(-15deg); } 60% { transform:scale(1.25) rotate(5deg); } 100% { transform:scale(1) rotate(0deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
        @keyframes shimmer { 0%,100% { box-shadow:0 0 15px rgba(255,215,0,0.3); } 50% { box-shadow:0 0 30px rgba(255,215,0,0.6); } }
      `}</style>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 24, animation: 'fadeUp 0.3s ease' }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 28, color: '#9b59ff', textShadow: '0 0 20px rgba(155,89,255,0.8)' }}>Hagrit</div>
      </div>

      {/* 称号バッジ */}
      <div style={{ textAlign: 'center', marginBottom: 16, animation: 'fadeUp 0.35s ease' }}>
        <div style={{ display: 'inline-block', background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.4)', borderRadius: 100, padding: '8px 20px', fontFamily: 'Cinzel, serif', fontSize: 15, color: '#ffd700', animation: 'shimmer 2s ease-in-out infinite' }}>
          {titleData.emoji} {titleData.title} ({streakWeeks}週達成)
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: hero.bg, border: `1px solid ${hero.border}`, borderRadius: 24, padding: '28px 20px', textAlign: 'center', marginBottom: 16, animation: 'fadeUp 0.4s ease' }}>
        <div style={{ fontSize: 72, animation: 'celebrate 0.6s ease, float 3s 0.6s ease-in-out infinite', display: 'inline-block', marginBottom: 12 }}>
          {hero.emoji}
        </div>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 22, color: hero.color, marginBottom: 8 }}>
          7日修行終了！
        </div>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 48, color: '#f0e6ff', lineHeight: 1, marginBottom: 10 }}>
          {doneCount}<span style={{ fontSize: 22, color: '#9988bb' }}>/7</span>
        </div>
        <div style={{ fontSize: 14, color: '#c39bff', fontWeight: 700, marginBottom: 14, whiteSpace: 'pre-line', lineHeight: 1.6 }}>
          {hero.message}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} style={{ fontSize: 18, opacity: i < doneCount ? 1 : 0.15 }}>✦</span>
          ))}
        </div>
      </div>

      {/* 修行ログ */}
      <div style={{ animation: 'fadeUp 0.5s ease', marginBottom: 14 }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#c39bff', marginBottom: 10 }}>修行ログ 📜</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 7 }, (_, i) => {
            const d = days.find(x => x.day_number === i + 1);
            const isDone = d?.status === 'done';
            const isNotDone = d?.status === 'not_done';
            return (
              <div key={i} style={{ background: isDone ? 'rgba(155,89,255,0.08)' : isNotDone ? 'rgba(255,75,110,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isDone ? 'rgba(155,89,255,0.3)' : isNotDone ? 'rgba(255,75,110,0.3)' : '#4a3a6a'}`, borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, opacity: d ? 1 : 0.4 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: isDone ? 'linear-gradient(135deg,#9b59ff,#6a1fc2)' : isNotDone ? 'rgba(255,75,110,0.2)' : '#1a0a2e', border: `1px solid ${isDone ? '#9b59ff' : isNotDone ? '#ff4b6e' : '#4a3a6a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cinzel, serif', fontSize: 11, color: isDone ? '#fff' : '#9988bb', flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 800, color: d ? '#f0e6ff' : '#9988bb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Nunito, sans-serif' }}>
                  {d?.plan ?? '未記録'}
                </div>
                <span style={{ fontSize: 14 }}>{isDone ? '✦' : isNotDone ? '✕' : '－'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* シェア */}
      <div style={{ animation: 'fadeUp 0.6s ease', marginBottom: 12 }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: '#c39bff', marginBottom: 10 }}>仲間に伝える 📣</div>
        <div style={{ background: '#2d1b4e', border: '1px solid #4a3a6a', borderRadius: 14, padding: '14px', marginBottom: 10, fontSize: 14, color: '#9988bb', lineHeight: 1.7, whiteSpace: 'pre-line', fontWeight: 700 }}>
          {shareText}
        </div>
        <button onClick={handleCopy} style={{ width: '100%', padding: '14px', borderRadius: 12, border: copied ? '1px solid rgba(0,212,170,0.4)' : '1px solid rgba(155,89,255,0.4)', background: copied ? 'rgba(0,212,170,0.08)' : 'rgba(155,89,255,0.1)', color: copied ? '#00d4aa' : '#c39bff', fontFamily: 'Cinzel, serif', fontSize: 14, cursor: 'pointer', transition: 'all 0.15s' }}>
          {copied ? '✦ コピーしました！' : '📋 テキストをコピー'}
        </button>
      </div>

      {/* もう一度 */}
      <div style={{ animation: 'fadeUp 0.65s ease', marginBottom: 12 }}>
        <button onClick={handleRetry} style={{ width: '100%', padding: '16px', borderRadius: 14, border: '1px solid rgba(155,89,255,0.4)', background: 'rgba(155,89,255,0.1)', color: '#c39bff', fontFamily: 'Cinzel, serif', fontSize: 15, cursor: 'pointer', transition: 'all 0.15s' }}>
          {retryLabel}
        </button>
      </div>

      {/* BuddyShare誘導 */}
      <div style={{ background: 'linear-gradient(135deg, rgba(155,89,255,0.2), rgba(106,31,194,0.3))', border: '1px solid rgba(155,89,255,0.4)', borderRadius: 20, padding: '24px 20px', textAlign: 'center', marginBottom: 32, animation: 'fadeUp 0.7s ease' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🚀</div>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#f0e6ff', marginBottom: 8 }}>次のステージへ</div>
        <div style={{ fontSize: 13, color: '#9988bb', lineHeight: 1.7, marginBottom: 16, fontWeight: 700 }}>
          本格的なBuddyShareで<br />仲間と長期的に走り続けよう。
        </div>
        <a href="https://myapp-hides-projects-19f80db4.vercel.app/" target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg, #9b59ff, #6a1fc2)', color: '#fff', fontSize: 15, fontWeight: 800, textDecoration: 'none', fontFamily: 'Cinzel, serif', boxShadow: '0 4px 0 #4a0f8a' }}>
          BuddyShareを試す →
        </a>
        <div style={{ fontSize: 11, color: '#9988bb', marginTop: 10, fontWeight: 700 }}>パスワード: catcat</div>
      </div>
    </div>
  );
}
