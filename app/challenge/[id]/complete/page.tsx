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
    ? { emoji: '🏆', color: '#f0c040', border: 'rgba(240,192,64,0.3)', bg: 'rgba(240,192,64,0.07)', message: '完璧！全7日達成！' }
    : doneCount >= 5
    ? { emoji: '🔮', color: '#a78bfa', border: 'rgba(167,139,250,0.3)', bg: 'rgba(167,139,250,0.07)', message: `${doneCount}/7日達成！\n素晴らしい！` }
    : doneCount >= 3
    ? { emoji: '⚗️', color: '#34d399', border: 'rgba(52,211,153,0.3)', bg: 'rgba(52,211,153,0.07)', message: `${doneCount}/7日達成。\n次はもっとやれる！` }
    : { emoji: '🌱', color: '#94a3b8', border: 'rgba(148,163,184,0.3)', bg: 'rgba(148,163,184,0.05)', message: `${doneCount}/7日。\nまず始めたことが大事！` };

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
        @keyframes shimmer { 0%,100% { box-shadow:0 0 10px rgba(240,192,64,0.2); } 50% { box-shadow:0 0 25px rgba(240,192,64,0.5); } }
      `}</style>

      <div style={{ textAlign: 'center', marginBottom: 20, animation: 'fadeUp 0.3s ease' }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 28, color: '#f0c040', textShadow: '0 0 20px rgba(240,192,64,0.5)' }}>Hagrit</div>
      </div>

      {/* 称号バッジ */}
      <div style={{ textAlign: 'center', marginBottom: 16, animation: 'fadeUp 0.35s ease' }}>
        <div style={{ display: 'inline-block', background: 'rgba(240,192,64,0.08)', border: '1px solid rgba(240,192,64,0.35)', borderRadius: 100, padding: '8px 20px', fontFamily: 'Cinzel, serif', fontSize: 14, color: '#f0c040', animation: 'shimmer 2.5s ease-in-out infinite', letterSpacing: '0.05em' }}>
          {titleData.emoji} {titleData.title} — {streakWeeks}週達成
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: hero.bg, border: `1px solid ${hero.border}`, borderRadius: 22, padding: '26px 20px', textAlign: 'center', marginBottom: 16, animation: 'fadeUp 0.4s ease' }}>
        <div style={{ fontSize: 68, animation: 'celebrate 0.6s ease, float 3s 0.6s ease-in-out infinite', display: 'inline-block', marginBottom: 10 }}>{hero.emoji}</div>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 20, color: hero.color, marginBottom: 8, letterSpacing: '0.05em' }}>7日修行終了！</div>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 44, color: '#f1f5f9', lineHeight: 1, marginBottom: 10 }}>
          {doneCount}<span style={{ fontSize: 20, color: '#94a3b8' }}>/7</span>
        </div>
        <div style={{ fontSize: 14, color: '#94a3b8', fontWeight: 700, marginBottom: 14, whiteSpace: 'pre-line', lineHeight: 1.6 }}>{hero.message}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} style={{ fontSize: 18, opacity: i < doneCount ? 1 : 0.15, color: '#f0c040' }}>✦</span>
          ))}
        </div>
      </div>

      {/* 修行ログ */}
      <div style={{ animation: 'fadeUp 0.5s ease', marginBottom: 14 }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#94a3b8', marginBottom: 10, letterSpacing: '0.05em' }}>修行ログ 📜</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 7 }, (_, i) => {
            const d = days.find(x => x.day_number === i + 1);
            const isDone = d?.status === 'done';
            const isNotDone = d?.status === 'not_done';
            return (
              <div key={i} style={{ background: isDone ? 'rgba(240,192,64,0.06)' : isNotDone ? 'rgba(248,113,113,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isDone ? 'rgba(240,192,64,0.25)' : isNotDone ? 'rgba(248,113,113,0.2)' : '#2d3f5a'}`, borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, opacity: d ? 1 : 0.4 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: isDone ? 'linear-gradient(135deg,#f0c040,#c49a20)' : '#0f1729', border: `1px solid ${isDone ? '#f0c040' : isNotDone ? '#f87171' : '#2d3f5a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cinzel, serif', fontSize: 11, color: isDone ? '#0f1729' : '#94a3b8', flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: d ? '#f1f5f9' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Nunito, sans-serif' }}>
                  {d?.plan ?? '未記録'}
                </div>
                <span style={{ fontSize: 13, color: isDone ? '#f0c040' : '#f87171' }}>{isDone ? '✦' : isNotDone ? '✕' : '－'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* シェア */}
      <div style={{ animation: 'fadeUp 0.6s ease', marginBottom: 12 }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#94a3b8', marginBottom: 10, letterSpacing: '0.05em' }}>仲間に伝える 📣</div>
        <div style={{ background: '#1e2d4a', border: '1px solid #2d3f5a', borderRadius: 12, padding: '14px', marginBottom: 10, fontSize: 14, color: '#94a3b8', lineHeight: 1.7, whiteSpace: 'pre-line', fontWeight: 700 }}>{shareText}</div>
        <button onClick={handleCopy} style={{ width: '100%', padding: '13px', borderRadius: 12, border: `1px solid ${copied ? 'rgba(52,211,153,0.4)' : 'rgba(167,139,250,0.4)'}`, background: copied ? 'rgba(52,211,153,0.07)' : 'rgba(167,139,250,0.07)', color: copied ? '#34d399' : '#a78bfa', fontFamily: 'Cinzel, serif', fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', letterSpacing: '0.03em' }}>
          {copied ? '✦ コピーしました！' : '📋 テキストをコピー'}
        </button>
      </div>

      {/* もう一度 */}
      <div style={{ animation: 'fadeUp 0.65s ease', marginBottom: 12 }}>
        <button onClick={handleRetry} style={{ width: '100%', padding: '15px', borderRadius: 12, border: '1px solid rgba(240,192,64,0.3)', background: 'rgba(240,192,64,0.07)', color: '#f0c040', fontFamily: 'Cinzel, serif', fontSize: 14, cursor: 'pointer', transition: 'all 0.15s', letterSpacing: '0.03em' }}>
          {retryLabel}
        </button>
      </div>

      {/* BuddyShare誘導 */}
      <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 20, padding: '22px 20px', textAlign: 'center', marginBottom: 32, animation: 'fadeUp 0.7s ease' }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🚀</div>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 15, color: '#f1f5f9', marginBottom: 8, letterSpacing: '0.05em' }}>次のステージへ</div>
        <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.8, marginBottom: 16, fontWeight: 700 }}>本格的なBuddyShareで<br />仲間と長期的に走り続けよう。</div>
        <a href="https://myapp-hides-projects-19f80db4.vercel.app/" target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '13px', borderRadius: 12, background: 'linear-gradient(135deg, #f0c040, #c49a20)', color: '#0f1729', fontSize: 14, fontWeight: 800, textDecoration: 'none', fontFamily: 'Cinzel, serif', boxShadow: '0 4px 0 #8a6000', letterSpacing: '0.03em' }}>
          BuddyShareを試す →
        </a>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 10, fontWeight: 700 }}>パスワード: catcat</div>
      </div>
    </div>
  );
}
