'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getUserProfile, getUserChallengeHistory, getUserStreakWeeks, getTitle } from '@/lib/api';

const THEMES: Record<string, { icon: string; color: string }> = {
  '健康': { icon: '💊', color: '#34d399' },
  'お金': { icon: '🪙', color: '#f0c040' },
  '夢': { icon: '🔮', color: '#a78bfa' },
  'キャリア': { icon: '📜', color: '#7dd3fc' },
  '人間関係': { icon: '🫂', color: '#fda4af' },
  'その他': { icon: '🧪', color: '#94a3b8' },
};

type Challenge = {
  id: string;
  theme: string | null;
  goal: string | null;
  status: string;
  started_at: string;
  done: number;
  total: number;
};

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const uid = params.uid as string;

  const [nickname, setNickname] = useState<string | null>(null);
  const [history, setHistory] = useState<Challenge[]>([]);
  const [streakWeeks, setStreakWeeks] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [profile, hist, weeks] = await Promise.all([
        getUserProfile(uid),
        getUserChallengeHistory(uid),
        getUserStreakWeeks(uid),
      ]);
      setNickname(profile?.nickname ?? '匿名');
      setHistory(hist);
      setStreakWeeks(weeks);
      setLoading(false);
    }
    load();
  }, [uid]);

  const titleData = getTitle(streakWeeks);
  const completedChallenges = history.filter(c => c.status === 'completed');
  const totalDone = completedChallenges.reduce((acc, c) => acc + c.done, 0);
  const totalDays = completedChallenges.reduce((acc, c) => acc + c.total, 0);
  const overallRate = totalDays > 0 ? Math.round((totalDone / totalDays) * 100) : 0;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 28, color: '#f0c040', textShadow: '0 0 20px rgba(240,192,64,0.5)', marginBottom: 12 }}>Hagrit</div>
        <div style={{ color: '#94a3b8', fontSize: 14, fontWeight: 700 }}>読み込み中...</div>
      </div>
    </div>
  );

  return (
    <div style={{ paddingTop: 24 }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0%,100% { box-shadow:0 0 8px rgba(240,192,64,0.2); } 50% { box-shadow:0 0 20px rgba(240,192,64,0.5); } }
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.back()} style={{ background: 'transparent', border: '1px solid #2d3f5a', borderRadius: 10, padding: '8px 14px', color: '#94a3b8', fontSize: 13, fontFamily: 'Nunito, sans-serif', fontWeight: 700, cursor: 'pointer' }}>
          ← 戻る
        </button>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 22, color: '#f0c040', textShadow: '0 0 15px rgba(240,192,64,0.4)' }}>Hagrit</div>
      </div>

      {/* プロフィールカード */}
      <div style={{ background: '#1e2d4a', borderRadius: 20, padding: '24px 20px', marginBottom: 16, border: '1px solid #2d3f5a', textAlign: 'center', animation: 'fadeUp 0.3s ease' }}>
        <div style={{ fontSize: 52, animation: 'float 3s ease-in-out infinite', display: 'inline-block', marginBottom: 12 }}>🧙</div>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 22, color: '#f1f5f9', marginBottom: 10 }}>{nickname}</div>
        <div style={{ display: 'inline-block', background: 'rgba(240,192,64,0.08)', border: '1px solid rgba(240,192,64,0.35)', borderRadius: 100, padding: '6px 18px', fontFamily: 'Cinzel, serif', fontSize: 13, color: '#f0c040', animation: 'shimmer 2.5s ease-in-out infinite', marginBottom: 16 }}>
          {titleData.emoji} {titleData.title}
        </div>

        {/* 統計 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 4 }}>
          <div style={{ background: '#0f1729', borderRadius: 12, padding: '10px 6px' }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 20, color: '#f0c040' }}>{streakWeeks}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginTop: 2 }}>連続週数</div>
          </div>
          <div style={{ background: '#0f1729', borderRadius: 12, padding: '10px 6px' }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 20, color: '#34d399' }}>{completedChallenges.length}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginTop: 2 }}>完了修行</div>
          </div>
          <div style={{ background: '#0f1729', borderRadius: 12, padding: '10px 6px' }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 20, color: '#a78bfa' }}>{overallRate}%</div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginTop: 2 }}>達成率</div>
          </div>
        </div>
      </div>

      {/* 修行履歴 */}
      <div style={{ animation: 'fadeUp 0.4s ease' }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#94a3b8', marginBottom: 10, letterSpacing: '0.05em' }}>
          修行履歴 📜
        </div>

        {history.length === 0 ? (
          <div style={{ background: '#1e2d4a', borderRadius: 14, padding: '20px', textAlign: 'center', border: '1px solid #2d3f5a', color: '#94a3b8', fontSize: 13, fontWeight: 700 }}>
            まだ修行記録がありません
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {history.map((c, i) => {
              const themeData = c.theme ? THEMES[c.theme] : null;
              const rate = c.total > 0 ? Math.round((c.done / c.total) * 100) : 0;
              const isCompleted = c.status === 'completed';
              const isActive = c.status === 'active';
              const date = new Date(c.started_at);
              const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

              return (
                <div key={c.id} style={{ background: '#1e2d4a', borderRadius: 14, padding: '14px', border: `1px solid ${isCompleted ? 'rgba(240,192,64,0.2)' : isActive ? 'rgba(52,211,153,0.2)' : '#2d3f5a'}`, opacity: i > 5 ? 0.7 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    {themeData && (
                      <span style={{ color: themeData.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, border: `1px solid ${themeData.color}`, background: `${themeData.color}18`, flexShrink: 0 }}>
                        {themeData.icon} {c.theme}
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginLeft: 'auto', flexShrink: 0 }}>{dateStr}〜</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: isCompleted ? '#f0c040' : isActive ? '#34d399' : '#94a3b8', background: isCompleted ? 'rgba(240,192,64,0.1)' : isActive ? 'rgba(52,211,153,0.1)' : '#0f1729', padding: '2px 8px', borderRadius: 100, flexShrink: 0 }}>
                      {isCompleted ? '✦ 完了' : isActive ? '修行中' : '未完了'}
                    </span>
                  </div>

                  {c.goal && (
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', fontFamily: 'Nunito, sans-serif', marginBottom: 10, lineHeight: 1.4 }}>
                      {c.goal}
                    </div>
                  )}

                  {/* 達成バー */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 6, background: '#0f1729', borderRadius: 100, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(c.done / 7) * 100}%`, background: c.done === 7 ? 'linear-gradient(90deg,#f0c040,#34d399)' : 'linear-gradient(90deg,#a78bfa,#7dd3fc)', borderRadius: 100, transition: 'width 0.5s ease' }} />
                    </div>
                    <div style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: c.done === 7 ? '#f0c040' : '#a78bfa', flexShrink: 0 }}>
                      {c.done}<span style={{ fontSize: 10, color: '#94a3b8' }}>/7</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
