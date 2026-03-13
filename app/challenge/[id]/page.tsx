'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  getDays, saveDay, completeChallenge,
  getTodayDoneCount, getTodayClapCount, sendClap, hasClappedToday,
  ensureAuth, getOthersPosts, checkPost, getMyCheerCount,
  getStreakWeeks, getTitle, getComments, addComment, addReply,
  getCommentsOnMyPost, getProfile,
} from '@/lib/api';
import { MiniChallengeDay, OthersDayPost } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { calcTodayDayNumber as calcTodayDay } from '@/lib/api';

type Comment = { id: string; nickname: string; body: string; created_at: string; reply_to: string | null };

const THEMES: Record<string, { icon: string; color: string }> = {
  '健康': { icon: '💊', color: '#34d399' },
  'お金': { icon: '🪙', color: '#f0c040' },
  '夢': { icon: '🔮', color: '#a78bfa' },
  'キャリア': { icon: '📜', color: '#7dd3fc' },
  '人間関係': { icon: '🫂', color: '#fda4af' },
  'その他': { icon: '🧪', color: '#94a3b8' },
};

function CommentThread({ comments, dayId, onAdd }: {
  comments: Comment[];
  dayId: string;
  onAdd: (body: string, replyTo?: string) => Promise<void>;
}) {
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; nickname: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const topLevel = comments.filter(c => !c.reply_to);
  const replies = (parentId: string) => comments.filter(c => c.reply_to === parentId);
  const PREVIEW = 2;
  const visibleTop = showAll ? topLevel : topLevel.slice(0, PREVIEW);
  const hiddenCount = topLevel.length - PREVIEW;

  async function handleSend() {
    const body = input.trim();
    if (!body) return;
    setSending(true);
    await onAdd(body, replyTo?.id);
    setInput(''); setReplyTo(null); setSending(false); setShowAll(true);
  }

  return (
    <div style={{ marginTop: 10, borderTop: '1px solid #2d3f5a', paddingTop: 10 }}>
      {topLevel.length === 0 && <div style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'Nunito, sans-serif', marginBottom: 8 }}>まだコメントはありません</div>}
      {visibleTop.map(c => (
        <div key={c.id} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#a78bfa', fontFamily: 'Nunito, sans-serif' }}>{c.nickname}</span>
              <span style={{ fontSize: 13, color: '#f1f5f9', fontFamily: 'Nunito, sans-serif', marginLeft: 8 }}>{c.body}</span>
            </div>
            <button onClick={() => setReplyTo(replyTo?.id === c.id ? null : { id: c.id, nickname: c.nickname })} style={{ fontSize: 11, color: replyTo?.id === c.id ? '#7dd3fc' : '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, flexShrink: 0 }}>
              {replyTo?.id === c.id ? '✕' : '返信'}
            </button>
          </div>
          {replies(c.id).map(r => (
            <div key={r.id} style={{ marginLeft: 14, marginTop: 5, paddingLeft: 10, borderLeft: '2px solid #2d3f5a' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#7dd3fc', fontFamily: 'Nunito, sans-serif' }}>{r.nickname}</span>
              <span style={{ fontSize: 12, color: '#f1f5f9', fontFamily: 'Nunito, sans-serif', marginLeft: 8 }}>{r.body}</span>
            </div>
          ))}
        </div>
      ))}
      {!showAll && hiddenCount > 0 && <button onClick={() => setShowAll(true)} style={{ fontSize: 12, color: '#7dd3fc', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, marginBottom: 8 }}>▼ 他{hiddenCount}件を見る</button>}
      {showAll && topLevel.length > PREVIEW && <button onClick={() => setShowAll(false)} style={{ fontSize: 12, color: '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, marginBottom: 8 }}>▲ 折りたたむ</button>}
      {replyTo && <div style={{ fontSize: 11, color: '#7dd3fc', fontFamily: 'Nunito, sans-serif', fontWeight: 700, marginBottom: 6 }}>↩ {replyTo.nickname} に返信中</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !sending && handleSend()} placeholder={replyTo ? `${replyTo.nickname}へ返信...` : 'コメント（50文字以内）'} maxLength={50} style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '1px solid #2d3f5a', background: '#0f1729', color: '#f1f5f9', fontSize: 13, fontFamily: 'Nunito, sans-serif', fontWeight: 700, outline: 'none' }} />
        <button onClick={handleSend} disabled={!input.trim() || sending} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: input.trim() ? 'linear-gradient(135deg,#f0c040,#c49a20)' : '#2d3f5a', color: input.trim() ? '#0f1729' : '#94a3b8', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 800, cursor: input.trim() ? 'pointer' : 'not-allowed' }}>
          {sending ? '...' : '送信'}
        </button>
      </div>
    </div>
  );
}

export default function ChallengePage() {
  const router = useRouter();
  const params = useParams();
  const challengeId = params.id as string;

  const [days, setDays] = useState<MiniChallengeDay[]>([]);
  const [doneCount, setDoneCount] = useState(0);
  const [clapCount, setClapCount] = useState(0);
  const [clapped, setClapped] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [othersPosts, setOthersPosts] = useState<OthersDayPost[]>([]);
  const [cheerCount, setCheerCount] = useState(0);
  const [goal, setGoal] = useState<string | null>(null);
  const [theme, setChallengeTheme] = useState<string | null>(null);
  const [streakWeeks, setStreakWeeks] = useState(0);
  const [todayDayNum, setTodayDayNum] = useState(1);
  const [myNickname, setMyNickname] = useState('');
  const [myPostComments, setMyPostComments] = useState<Comment[]>([]);
  const [showMyComments, setShowMyComments] = useState(false);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState<'done' | 'not_done' | null>(null);
  const [nextStep, setNextStep] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const todayFilled = days.some(d => d.day_number === todayDayNum);
  const canAddToday = todayDayNum <= 7 && !todayFilled && !showForm;

  const load = useCallback(async () => {
    const user = await ensureAuth();
    setUserId(user?.id ?? null);
    const d = await getDays(challengeId);
    setDays(d);
    setDoneCount(await getTodayDoneCount());
    setClapCount(await getTodayClapCount());

    const { data: challenge } = await supabase.from('mini_challenges').select().eq('id', challengeId).maybeSingle();
    if (challenge?.status === 'completed') { router.replace(`/challenge/${challengeId}/complete`); return; }
    if (challenge?.goal) setGoal(challenge.goal);
    if (challenge?.theme) setChallengeTheme(challenge.theme);
    const dayNum = challenge ? calcTodayDay(challenge.started_at) : 1;
    setTodayDayNum(dayNum);

    if (user) {
      const [others, cheers, alreadyClapped, weeks, mc, profile] = await Promise.all([
        getOthersPosts(dayNum, user.id),
        getMyCheerCount(challengeId, dayNum),
        hasClappedToday(user.id),
        getStreakWeeks(),
        getCommentsOnMyPost(challengeId, dayNum),
        getProfile(user.id),
      ]);
      setOthersPosts(others);
      setCheerCount(cheers);
      setClapped(alreadyClapped);
      setStreakWeeks(weeks);
      setMyPostComments(mc as Comment[]);
      setMyNickname(profile?.nickname ?? '');
    }
  }, [challengeId, router]);

  useEffect(() => { load(); }, [load]);

  function openNewForm() { setEditingDay(null); setPlan(''); setStatus(null); setNextStep(''); setShowForm(true); }
  function openEditForm(day: MiniChallengeDay) { setEditingDay(day.day_number); setPlan(day.plan); setStatus(day.status); setNextStep(day.next_step ?? ''); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditingDay(null); setPlan(''); setStatus(null); setNextStep(''); }

  async function handleSave() {
    if (!plan.trim() || !status) return;
    setSaving(true);
    const targetDay = editingDay ?? todayDayNum;
    await saveDay(challengeId, targetDay, plan.trim(), status, nextStep.trim() || undefined);
    if (targetDay === 7 && status === 'done') { await completeChallenge(challengeId); router.replace(`/challenge/${challengeId}/complete`); return; }
    await load(); closeForm(); setSaving(false);
  }

  async function handleClap() {
    if (clapped || !userId) return;
    setClapped(true); setClapCount(c => c + 1);
    await sendClap(userId);
  }

  async function handleCheck(postId: string, idx: number) {
    if (!userId) return;
    const updated = [...othersPosts];
    updated[idx] = { ...updated[idx], already_checked: true, check_count: updated[idx].check_count + 1 };
    setOthersPosts(updated);
    await checkPost(postId, userId);
  }

  async function toggleComments(dayId: string) {
    if (openCommentId === dayId) { setOpenCommentId(null); return; }
    setOpenCommentId(dayId);
    if (!comments[dayId]) {
      const data = await getComments(dayId);
      setComments(prev => ({ ...prev, [dayId]: data as Comment[] }));
    }
  }

  async function handleAddComment(dayId: string, body: string, replyTo?: string) {
    if (replyTo) await addReply(dayId, body, replyTo);
    else await addComment(dayId, body);
    const data = await getComments(dayId);
    setComments(prev => ({ ...prev, [dayId]: data as Comment[] }));
  }

  const titleData = getTitle(streakWeeks);
  const themeData = theme ? THEMES[theme] : null;
  const daysProgress = days.filter(d => d.status === 'done').length;
  const topLevelMyComments = myPostComments.filter(c => !c.reply_to);

  return (
    <div style={{ paddingTop: 24 }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        @keyframes shimmer { 0%,100% { box-shadow:0 0 8px rgba(240,192,64,0.2); } 50% { box-shadow:0 0 20px rgba(240,192,64,0.5); } }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 24, color: '#f0c040', textShadow: '0 0 15px rgba(240,192,64,0.4)' }}>Hagrit</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {myNickname && (
            <button onClick={() => router.push('/settings')} style={{ background: 'rgba(240,192,64,0.08)', border: '1px solid rgba(240,192,64,0.25)', borderRadius: 100, padding: '5px 12px', fontSize: 12, color: '#f0c040', fontWeight: 800, fontFamily: 'Nunito, sans-serif', cursor: 'pointer' }}>
              🧙 {myNickname}
            </button>
          )}
          <div style={{ background: 'rgba(52,211,153,0.1)', borderRadius: 100, padding: '5px 12px', border: '1px solid rgba(52,211,153,0.3)', fontSize: 11, color: '#34d399', fontWeight: 700 }}>
            🔥 {doneCount}人修行中
          </div>
        </div>
      </div>

      {/* 称号バッジ */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'inline-block', background: 'rgba(240,192,64,0.08)', border: '1px solid rgba(240,192,64,0.3)', borderRadius: 100, padding: '5px 14px', fontSize: 11, color: '#f0c040', fontWeight: 700, animation: 'shimmer 3s ease-in-out infinite' }}>
          {titleData.emoji} {titleData.title}
        </div>
      </div>

      {/* 目標カード */}
      {goal && (
        <div style={{ background: '#1e2d4a', borderRadius: 16, padding: '14px 16px', marginBottom: 14, border: '1px solid #2d3f5a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            {themeData && <span style={{ color: themeData.color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100, border: `1px solid ${themeData.color}`, background: `${themeData.color}18` }}>{themeData.icon} {theme}</span>}
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>7日間の目標</span>
          </div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 15, color: '#f1f5f9', lineHeight: 1.5 }}>{goal}</div>
        </div>
      )}

      {/* 通知：自分の投稿へのコメント */}
      {todayFilled && myPostComments.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <button onClick={() => setShowMyComments(v => !v)} style={{ width: '100%', background: 'rgba(125,211,252,0.07)', border: '1px solid rgba(125,211,252,0.25)', borderRadius: 12, padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#7dd3fc', fontWeight: 800 }}>💬 あなたの投稿に{topLevelMyComments.length}件のコメント</span>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>{showMyComments ? '▲ 閉じる' : '▼ 見る'}</span>
          </button>
          {showMyComments && (
            <div style={{ background: '#1e2d4a', border: '1px solid #2d3f5a', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '12px 14px', animation: 'fadeUp 0.2s ease' }}>
              {topLevelMyComments.map(c => (
                <div key={c.id} style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#a78bfa', fontFamily: 'Nunito, sans-serif' }}>{c.nickname}</span>
                  <span style={{ fontSize: 13, color: '#f1f5f9', fontFamily: 'Nunito, sans-serif', marginLeft: 8 }}>{c.body}</span>
                  {myPostComments.filter(r => r.reply_to === c.id).map(r => (
                    <div key={r.id} style={{ marginLeft: 14, marginTop: 4, paddingLeft: 10, borderLeft: '2px solid #2d3f5a' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#7dd3fc', fontFamily: 'Nunito, sans-serif' }}>{r.nickname}</span>
                      <span style={{ fontSize: 12, color: '#f1f5f9', fontFamily: 'Nunito, sans-serif', marginLeft: 8 }}>{r.body}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 応援バナー */}
      {cheerCount > 0 && (
        <div style={{ background: 'rgba(240,192,64,0.07)', border: '1px solid rgba(240,192,64,0.25)', borderRadius: 12, padding: '10px 14px', marginBottom: 14, textAlign: 'center' }}>
          <span style={{ fontSize: 13, color: '#f0c040', fontWeight: 800 }}>✦ 今日{cheerCount}人があなたを応援しています！</span>
        </div>
      )}

      {/* Progress */}
      <div style={{ background: '#1e2d4a', borderRadius: 20, padding: 18, marginBottom: 14, border: '1px solid #2d3f5a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#94a3b8', letterSpacing: '0.05em' }}>修行の記録</div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 20, color: '#f1f5f9' }}>{daysProgress}<span style={{ fontSize: 13, color: '#94a3b8' }}>/7</span></div>
        </div>
        <div style={{ height: 8, background: '#0f1729', borderRadius: 100, marginBottom: 14, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(daysProgress / 7) * 100}%`, background: 'linear-gradient(90deg, #f0c040, #34d399)', borderRadius: 100, transition: 'width 0.5s ease' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {Array.from({ length: 7 }, (_, i) => {
            const day = days.find(d => d.day_number === i + 1);
            const isToday = i + 1 === todayDayNum;
            const isDone = day?.status === 'done';
            const isNotDone = day?.status === 'not_done';
            return (
              <div key={i} style={{ width: 34, height: 34, borderRadius: 10, background: isDone ? 'linear-gradient(135deg,#f0c040,#c49a20)' : isNotDone ? 'rgba(248,113,113,0.15)' : isToday ? 'rgba(240,192,64,0.1)' : 'rgba(255,255,255,0.03)', border: `1.5px solid ${isDone ? '#f0c040' : isNotDone ? '#f87171' : isToday ? 'rgba(240,192,64,0.5)' : '#2d3f5a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cinzel, serif', fontSize: 11, color: isDone ? '#0f1729' : isToday ? '#f0c040' : '#94a3b8', animation: isToday && !day ? 'pulse 2s ease-in-out infinite' : 'none' }}>
                {isDone ? '✦' : isNotDone ? '✕' : i + 1}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div style={{ background: '#1e2d4a', borderRadius: 14, padding: '12px', border: '1px solid #2d3f5a', textAlign: 'center' }}>
          <div style={{ fontSize: 18, marginBottom: 4 }}>🔮</div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: '#a78bfa' }}>{clapCount}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>魔力ポーション</div>
        </div>
        <div style={{ background: '#1e2d4a', borderRadius: 14, padding: '12px', border: '1px solid #2d3f5a', textAlign: 'center' }}>
          <div style={{ fontSize: 18, marginBottom: 4 }}>📅</div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: '#a78bfa' }}>{daysProgress}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>修行済み日数</div>
        </div>
      </div>

      {/* 記録ボタン */}
      {canAddToday && (
        <button onClick={openNewForm} style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #f0c040, #c49a20)', color: '#0f1729', fontFamily: 'Cinzel, serif', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 5px 0 #8a6000', marginBottom: 14, transition: 'all 0.15s' }}>
          ✦ Day {todayDayNum} を記録する
        </button>
      )}
      {todayFilled && !showForm && (
        <div style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 12, padding: '11px', marginBottom: 14, textAlign: 'center' }}>
          <span style={{ fontSize: 13, color: '#34d399', fontWeight: 800 }}>✦ 今日の修行完了！</span>
        </div>
      )}

      {/* 記録フォーム */}
      {showForm && (
        <div style={{ background: '#1e2d4a', borderRadius: 20, padding: 20, marginBottom: 14, border: '1px solid rgba(240,192,64,0.3)', animation: 'fadeUp 0.3s ease' }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: '#f0c040', marginBottom: 16 }}>
            {editingDay ? `Day ${editingDay} を編集` : `Day ${todayDayNum} の記録`}
          </div>
          <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: 6 }}>今日やったこと</label>
          <textarea value={plan} onChange={e => setPlan(e.target.value)} placeholder="今日の取り組みを記録..." rows={3} style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #2d3f5a', background: '#0f1729', color: '#f1f5f9', fontSize: 14, fontFamily: 'Nunito, sans-serif', fontWeight: 700, resize: 'none', marginBottom: 14, boxSizing: 'border-box' as const, outline: 'none' }} />
          <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: 8 }}>達成度</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            {([{ v: 'done' as const, label: '✦ できた！', color: '#34d399', border: '#34d399', bg: 'rgba(52,211,153,0.1)' }, { v: 'not_done' as const, label: '✕ できなかった', color: '#f87171', border: '#f87171', bg: 'rgba(248,113,113,0.1)' }]).map(opt => (
              <button key={opt.v} onClick={() => setStatus(opt.v)} style={{ padding: '11px', borderRadius: 10, border: `1.5px solid ${status === opt.v ? opt.border : '#2d3f5a'}`, background: status === opt.v ? opt.bg : 'transparent', color: status === opt.v ? opt.color : '#94a3b8', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s' }}>
                {opt.label}
              </button>
            ))}
          </div>
          <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: 6 }}>明日の一言（任意）</label>
          <input value={nextStep} onChange={e => setNextStep(e.target.value)} placeholder="明日やること..." style={{ width: '100%', padding: '11px', borderRadius: 10, border: '1px solid #2d3f5a', background: '#0f1729', color: '#f1f5f9', fontSize: 13, fontFamily: 'Nunito, sans-serif', fontWeight: 700, marginBottom: 14, boxSizing: 'border-box' as const, outline: 'none' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={closeForm} style={{ padding: '11px', borderRadius: 10, border: '1px solid #2d3f5a', background: 'transparent', color: '#94a3b8', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>キャンセル</button>
            <button onClick={handleSave} disabled={!plan.trim() || !status || saving} style={{ padding: '11px', borderRadius: 10, border: 'none', background: (!plan.trim() || !status || saving) ? '#2d3f5a' : 'linear-gradient(135deg,#f0c040,#c49a20)', color: (!plan.trim() || !status || saving) ? '#94a3b8' : '#0f1729', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 800, cursor: (!plan.trim() || !status || saving) ? 'not-allowed' : 'pointer', boxShadow: (!plan.trim() || !status || saving) ? 'none' : '0 3px 0 #8a6000' }}>
              {saving ? '記録中...' : '✦ 記録する'}
            </button>
          </div>
        </div>
      )}

      {/* 修行ログ */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#94a3b8', marginBottom: 10, letterSpacing: '0.05em' }}>修行ログ 📜</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 7 }, (_, i) => {
            const day = days.find(d => d.day_number === i + 1);
            const isToday = i + 1 === todayDayNum;
            const isDone = day?.status === 'done';
            const isNotDone = day?.status === 'not_done';
            return (
              <div key={i} style={{ background: isDone ? 'rgba(240,192,64,0.06)' : isNotDone ? 'rgba(248,113,113,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isDone ? 'rgba(240,192,64,0.25)' : isNotDone ? 'rgba(248,113,113,0.25)' : '#2d3f5a'}`, borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, opacity: !day && !isToday ? 0.4 : 1 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: isDone ? 'linear-gradient(135deg,#f0c040,#c49a20)' : '#0f1729', border: `1px solid ${isDone ? '#f0c040' : isNotDone ? '#f87171' : '#2d3f5a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cinzel, serif', fontSize: 11, color: isDone ? '#0f1729' : '#94a3b8', flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: day ? '#f1f5f9' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Nunito, sans-serif' }}>
                  {day?.plan ?? (isToday ? '今日の記録待ち...' : '未記録')}
                </div>
                {day && <button onClick={() => openEditForm(day)} style={{ fontSize: 11, color: '#94a3b8', background: 'transparent', border: '1px solid #2d3f5a', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700 }}>編集</button>}
                <span style={{ fontSize: 13, flexShrink: 0, color: isDone ? '#f0c040' : '#f87171' }}>{isDone ? '✦' : isNotDone ? '✕' : ''}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 仲間の気配 */}
      {othersPosts.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#94a3b8', marginBottom: 10, letterSpacing: '0.05em' }}>仲間の気配 🌙</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {othersPosts.map((post, idx) => (
              <div key={post.id} style={{ background: '#1e2d4a', borderRadius: 14, padding: '12px 14px', border: '1px solid #2d3f5a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span onClick={() => router.push(`/user/${post.owner_user_id}`)} style={{ fontSize: 13, fontWeight: 800, color: '#a78bfa', fontFamily: 'Nunito, sans-serif', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}>{post.nickname}</span>
                  {post.theme && <span style={{ fontSize: 10, color: THEMES[post.theme]?.color ?? '#94a3b8', border: `1px solid ${THEMES[post.theme]?.color ?? '#94a3b8'}`, borderRadius: 100, padding: '1px 7px', fontFamily: 'Nunito, sans-serif', fontWeight: 700 }}>{THEMES[post.theme]?.icon} {post.theme}</span>}
                  <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 'auto', fontFamily: 'Nunito, sans-serif', fontWeight: 700 }}>Day {post.day_number}</span>
                </div>
                <div style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 700, marginBottom: 10, fontFamily: 'Nunito, sans-serif' }}>{post.plan}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button onClick={() => toggleComments(post.id)} style={{ padding: '5px 12px', borderRadius: 100, border: '1px solid #2d3f5a', background: openCommentId === post.id ? 'rgba(125,211,252,0.1)' : 'transparent', color: openCommentId === post.id ? '#7dd3fc' : '#94a3b8', fontSize: 11, fontFamily: 'Nunito, sans-serif', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                    💬 {comments[post.id] ? `${comments[post.id].length}件` : 'コメント'}
                  </button>
                  <button onClick={() => !post.already_checked && handleCheck(post.id, idx)} style={{ padding: '5px 14px', borderRadius: 100, border: `1px solid ${post.already_checked ? 'rgba(52,211,153,0.4)' : 'rgba(167,139,250,0.4)'}`, background: post.already_checked ? 'rgba(52,211,153,0.08)' : 'rgba(167,139,250,0.08)', color: post.already_checked ? '#34d399' : '#a78bfa', fontSize: 12, fontFamily: 'Nunito, sans-serif', fontWeight: 800, cursor: post.already_checked ? 'default' : 'pointer', transition: 'all 0.15s' }}>
                    {post.already_checked ? `✦ 応援した (${post.check_count})` : `✧ 応援する (${post.check_count})`}
                  </button>
                </div>
                {openCommentId === post.id && (
                  <CommentThread comments={comments[post.id] ?? []} dayId={post.id} onAdd={(body, replyTo) => handleAddComment(post.id, body, replyTo)} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 魔力ポーション */}
      <button onClick={handleClap} disabled={clapped} style={{ width: '100%', padding: '15px', borderRadius: 14, border: `1px solid ${clapped ? 'rgba(52,211,153,0.3)' : 'rgba(167,139,250,0.4)'}`, background: clapped ? 'rgba(52,211,153,0.07)' : 'rgba(167,139,250,0.08)', color: clapped ? '#34d399' : '#a78bfa', fontFamily: 'Cinzel, serif', fontSize: 14, cursor: clapped ? 'default' : 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>🔮</span>
        {clapped ? `魔力を送った！(${clapCount})` : `修行者に魔力を送る (${clapCount})`}
      </button>
    </div>
  );
}
