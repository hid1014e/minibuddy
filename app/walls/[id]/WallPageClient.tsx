'use client';

import { useState } from 'react';

interface Day {
  mini_challenge_id: string;
  day_number: number;
  plan: string;
  status: string;
  next_step: string | null;
  image_url: string | null;
  updated_at: string;
}

interface Challenge {
  id: string;
  theme: string;
  goal: string;
  status: string;
  started_at: string;
  owner_user_id: string;
}

interface Profile {
  user_id: string;
  nickname: string;
  mini_titles: string[] | null;
}

interface Props {
  challenges: Challenge[];
  daysMap: Record<string, Day[]>;
  profileMap: Record<string, Profile>;
}

const MONKEY_COMMENT = (doneDays: number) => {
  if (doneDays === 7) return '7日やり切ったな。\n習慣の入口に片足突っ込んだぞ。\n次の7日も同じ感覚でいけば、\nお前の人生変わるわ。';
  if (doneDays >= 5) return '週4日以上が習慣化の鍵！\n良い調子ですっ';
  if (doneDays >= 3) return 'もう少しだけ目標の負荷を\n下げても良いかもですね！';
  return 'ウキ…始めたことは偉い。\nでも次はもっと頑張れよ！';
};

const HIEROGLYPHS = ['𓂀', '𓃒', '𓅃', '𓆣', '𓇯', '𓈖', '𓊪', '𓋴', '𓌀', '𓍢'];

const THEMES: Record<string, { icon: string; color: string }> = {
  '健康': { icon: '💊', color: '#34d399' },
  'お金': { icon: '🪙', color: '#f0c040' },
  '夢': { icon: '🔮', color: '#a78bfa' },
  'キャリア': { icon: '📜', color: '#7dd3fc' },
  '人間関係': { icon: '🫂', color: '#fda4af' },
  'その他': { icon: '🧪', color: '#94a3b8' },
};

export default function WallPageClient({ challenges, daysMap, profileMap }: Props) {
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [selectedDay, setSelectedDay] = useState<Day | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement('input');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (s: string) => {
    const d = new Date(s);
    return (d.getMonth() + 1) + '/' + d.getDate();
  };

  const totalDoneAll = Object.values(daysMap).flat().filter(d => d.status === 'done').length;

  return (
    <div style={{ minHeight: '100vh', background: '#1a1208', color: '#c9a96e', fontFamily: "'Cinzel', serif", position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'radial-gradient(ellipse at 20% 20%,rgba(80,55,20,.3) 0%,transparent 60%),radial-gradient(ellipse at 80% 80%,rgba(60,40,10,.3) 0%,transparent 60%)', pointerEvents: 'none', zIndex: 0 }}/>
      <div style={{ position: 'relative', zIndex: 2, maxWidth: '480px', margin: '0 auto', padding: '0 0 80px' }}>

        {/* ヒエログリフ装飾 */}
        <div style={{ textAlign: 'center', padding: '28px 20px 16px', borderBottom: '1px solid rgba(107,80,48,0.4)', letterSpacing: '0.3em', fontSize: '18px', opacity: 0.4, userSelect: 'none' }}>
          {HIEROGLYPHS.slice(0, 7).join(' ')}
        </div>

        {/* タイトル */}
        <div style={{ textAlign: 'center', padding: '20px 20px 0' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.3em', color: '#8a6c42', margin: '0 0 8px', fontFamily: 'Nunito, sans-serif' }}>── 古代壁画 ──</p>
          <h1 style={{ fontSize: '20px', letterSpacing: '0.15em', margin: '0 0 6px', textShadow: '0 0 20px rgba(201,169,110,0.3)' }}>修行者たちの記録</h1>
          <p style={{ fontSize: '12px', color: '#8a6c42', margin: '0 0 4px', fontFamily: 'Nunito, sans-serif' }}>
            {challenges.length} 件の修行 ／ {totalDoneAll} 日を刻む
          </p>
        </div>

        {/* 石板グリッド */}
        <div style={{ margin: '24px 16px 0' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.25em', color: '#6b5030', marginBottom: '14px', textAlign: 'center' }}>── 石板を選びて詳細を見よ ──</p>
          {challenges.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b5030', fontFamily: 'Nunito, sans-serif', fontSize: '13px' }}>まだ完了した修行がありません</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {challenges.map((c) => {
                const days = daysMap[c.id] ?? [];
                const doneDays = days.filter(d => d.status === 'done').length;
                const profile = profileMap[c.owner_user_id];
                const nickname = profile?.nickname ?? '名無し';
                const themeData = c.theme ? THEMES[c.theme] : null;
                const isPerfect = doneDays === 7;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedChallenge(c)}
                    style={{
                      background: isPerfect
                        ? 'linear-gradient(135deg,#2a1e00,#3d2e08)'
                        : 'linear-gradient(135deg,#1e1610,#251c12)',
                      border: isPerfect ? '1px solid #c9a96e' : '1px solid #3a2810',
                      borderRadius: '2px',
                      padding: '14px 12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxShadow: isPerfect ? '0 0 12px rgba(201,169,110,0.15)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    {/* テーマ */}
                    <div style={{ fontSize: '10px', color: themeData?.color ?? '#8a6c42', fontFamily: 'Nunito, sans-serif', marginBottom: '6px', letterSpacing: '0.05em' }}>
                      {themeData ? themeData.icon + ' ' + c.theme : c.theme}
                    </div>
                    {/* 目標 */}
                    <div style={{ fontSize: '12px', color: '#c9a96e', fontFamily: 'Nunito, sans-serif', lineHeight: 1.5, marginBottom: '10px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                      {c.goal ?? '（目標なし）'}
                    </div>
                    {/* 達成グリッド 7マス */}
                    <div style={{ display: 'flex', gap: '3px', marginBottom: '8px' }}>
                      {Array.from({ length: 7 }).map((_, i) => {
                        const day = days.find(d => d.day_number === i + 1);
                        const isDone = day?.status === 'done';
                        return (
                          <div key={i} style={{
                            width: '100%', aspectRatio: '1',
                            background: isDone ? '#c9a96e' : '#2a1e10',
                            border: isDone ? '1px solid #e8c98a' : '1px solid #3a2810',
                            borderRadius: '1px',
                          }}/>
                        );
                      })}
                    </div>
                    {/* ニックネーム・日付・達成数 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: '#6b5030', fontFamily: 'Nunito, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{nickname}</span>
                      <span style={{ fontSize: '11px', color: isPerfect ? '#f0c060' : '#8a6c42', fontFamily: 'Cinzel, serif', flexShrink: 0 }}>{doneDays}/7</span>
                    </div>
                    <div style={{ fontSize: '9px', color: '#4a3520', fontFamily: 'Nunito, sans-serif', marginTop: '3px' }}>{formatDate(c.started_at)}〜</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 共有ボタン */}
        <div style={{ margin: '28px 20px 0' }}>
          <button onClick={handleCopy} style={{ width: '100%', padding: '14px', background: copied ? 'linear-gradient(135deg,#1e3020,#2a4030)' : 'linear-gradient(135deg,#2a1a00,#3d2800)', border: copied ? '1px solid #4a8060' : '1px solid #8a6c42', borderRadius: '2px', color: copied ? '#80c0a0' : '#e8c98a', fontFamily: "'Cinzel', serif", fontSize: '13px', letterSpacing: '0.1em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px' }}>{copied ? '✓' : '🪨'}</span>
            {copied ? '壁画の断片をコピーした' : '壁画の破片を共有する'}
            <span style={{ fontSize: '10px', color: copied ? '#4a8060' : '#6b5030', fontFamily: 'Nunito, sans-serif' }}>{copied ? 'URL copied!' : '（URLをコピー）'}</span>
          </button>
        </div>

        <div style={{ textAlign: 'center', padding: '32px 20px 0', letterSpacing: '0.3em', fontSize: '16px', opacity: 0.2, userSelect: 'none' }}>
          {HIEROGLYPHS.slice(3).join(' ')}
        </div>
        <p style={{ textAlign: 'center', fontSize: '10px', color: '#3a2810', fontFamily: 'Nunito, sans-serif', letterSpacing: '0.1em', marginTop: '12px' }}>Hagrit — 7日間の修行記録</p>
      </div>

      {/* 石板詳細モーダル */}
      {selectedChallenge && (() => {
        const days = daysMap[selectedChallenge.id] ?? [];
        const doneDays = days.filter(d => d.status === 'done').length;
        const profile = profileMap[selectedChallenge.owner_user_id];
        const nickname = profile?.nickname ?? '名無し';
        const monkeyComment = MONKEY_COMMENT(doneDays);
        const startDate = new Date(selectedChallenge.started_at);
        const formatDateFull = (d: Date) => d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' }} onClick={() => { setSelectedChallenge(null); setSelectedDay(null); }}>
            <div style={{ background: 'linear-gradient(135deg,#241a0e,#2e2010)', border: '1px solid #6b5030', borderRadius: '2px', padding: '24px 20px', width: '100%', maxWidth: '420px', position: 'relative', marginTop: '10px' }} onClick={e => e.stopPropagation()}>
              <button onClick={() => { setSelectedChallenge(null); setSelectedDay(null); }} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: '#6b5030', fontSize: '18px', cursor: 'pointer', padding: '4px 8px' }}>✕</button>

              {/* ヘッダー */}
              <p style={{ fontSize: '10px', letterSpacing: '0.3em', color: '#8a6c42', margin: '0 0 8px', fontFamily: 'Nunito, sans-serif' }}>── 石板の詳細 ──</p>
              <h2 style={{ fontSize: '16px', margin: '0 0 4px', letterSpacing: '0.1em' }}>{selectedChallenge.theme}</h2>
              {selectedChallenge.goal && (
                <p style={{ fontSize: '12px', color: '#a08060', fontFamily: 'Nunito, sans-serif', margin: '0 0 12px', lineHeight: 1.6 }}>「{selectedChallenge.goal}」</p>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b5030', fontFamily: 'Nunito, sans-serif', marginBottom: '16px' }}>
                <span>{nickname}</span>
                <span>{formatDateFull(startDate)}〜</span>
              </div>

              {/* 7日グリッド */}
              <p style={{ fontSize: '10px', letterSpacing: '0.2em', color: '#6b5030', marginBottom: '10px' }}>── 刻まれし七日間 ──</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '16px' }}>
                {Array.from({ length: 7 }).map((_, i) => {
                  const day = days.find(d => d.day_number === i + 1);
                  const isDone = day?.status === 'done';
                  return (
                    <button key={i} onClick={() => day && setSelectedDay(day)}
                      style={{ aspectRatio: '1', background: isDone ? 'linear-gradient(135deg,#3d2e00,#5a4400)' : 'linear-gradient(135deg,#1e1610,#251c12)', border: isDone ? '1px solid #c9a96e' : '1px solid #3a2810', borderRadius: '2px', cursor: day ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px', padding: '4px 2px' }}>
                      <span style={{ fontSize: '16px', lineHeight: 1, filter: isDone ? 'none' : 'grayscale(1) opacity(.3)' }}>{isDone ? '🔥' : '💤'}</span>
                      <span style={{ fontSize: '8px', color: isDone ? '#c9a96e' : '#4a3520', fontFamily: 'Nunito, sans-serif' }}>Day{i + 1}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '16px' }}>
                <span style={{ fontSize: '10px', color: '#6b5030', fontFamily: 'Nunito, sans-serif' }}>🔥 成し遂げた日</span>
                <span style={{ fontSize: '10px', color: '#4a3520', fontFamily: 'Nunito, sans-serif' }}>💤 眠りし日</span>
              </div>

              {/* 達成数 */}
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '28px', color: doneDays === 7 ? '#f0c060' : '#c9a96e' }}>{doneDays}</span>
                <span style={{ fontSize: '12px', color: '#6b5030' }}>/7日</span>
              </div>

              {/* 猿のコメント */}
              <div style={{ background: 'linear-gradient(135deg,#1e1610,#2a1e10)', border: '1px solid #4a3520', borderRadius: '2px', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '24px', flexShrink: 0 }}>🐵</span>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: '9px', letterSpacing: '0.2em', color: '#6b5030' }}>修行監督・猿の言葉</p>
                  <p style={{ margin: 0, fontSize: '12px', fontFamily: 'Nunito, sans-serif', color: '#c9a96e', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{monkeyComment}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Day詳細モーダル（石板詳細の上に重ねる） */}
      {selectedDay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setSelectedDay(null)}>
          <div style={{ background: 'linear-gradient(135deg,#241a0e,#2e2010)', border: '1px solid #6b5030', borderRadius: '2px', padding: '24px', width: '100%', maxWidth: '380px', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedDay(null)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: '#6b5030', fontSize: '18px', cursor: 'pointer', padding: '4px 8px' }}>✕</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '32px' }}>{selectedDay.status === 'done' ? '🔥' : '💤'}</span>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: '16px', letterSpacing: '0.1em' }}>Day {selectedDay.day_number}</p>
                <p style={{ margin: 0, fontSize: '11px', color: selectedDay.status === 'done' ? '#c9a96e' : '#6b5030', fontFamily: 'Nunito, sans-serif' }}>{selectedDay.status === 'done' ? '成し遂げた' : '眠りし日'}</p>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(107,80,48,.3)', paddingTop: '14px' }}>
              {selectedDay.plan && (
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '10px', letterSpacing: '0.2em', color: '#6b5030' }}>この日の修行内容</p>
                  <p style={{ margin: 0, fontSize: '13px', fontFamily: 'Nunito, sans-serif', color: '#c9a96e', lineHeight: 1.7 }}>{selectedDay.plan}</p>
                </div>
              )}
              {selectedDay.next_step && (
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '10px', letterSpacing: '0.2em', color: '#6b5030' }}>次への一歩</p>
                  <p style={{ margin: 0, fontSize: '13px', fontFamily: 'Nunito, sans-serif', color: '#a08060', lineHeight: 1.7 }}>{selectedDay.next_step}</p>
                </div>
              )}
              {selectedDay.image_url && (
                <div style={{ marginTop: '12px' }}>
                  <img src={selectedDay.image_url} alt={'Day ' + selectedDay.day_number} style={{ width: '100%', borderRadius: '2px', border: '1px solid #3a2810' }}/>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
