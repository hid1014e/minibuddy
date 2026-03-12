'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  getDays, saveDay, completeChallenge,
  getTodayDoneCount, getTodayClapCount, sendClap, hasClappedToday,
  ensureAuth, getOthersPosts, checkPost, getMyCheerCount,
  getStreakWeeks, getTitle,
} from '@/lib/api';
import { MiniChallengeDay, OthersDayPost } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { calcTodayDayNumber as calcTodayDay } from '@/lib/api';

const THEMES: Record<string, { icon: string; color: string }> = {
  '健康': { icon: '💊', color: '#00d4aa' },
  'お金': { icon: '🪙', color: '#ffd700' },
  '夢': { icon: '🔮', color: '#9b59ff' },
  'キャリア': { icon: '📜', color: '#c39bff' },
  '人間関係': { icon: '🫂', color: '#ff4b6e' },
  'その他': { icon: '🧪', color: '#9988bb' },
};

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

  // フォーム
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState<'done' | 'not_done' | null>(null);
  const [nextStep, setNextStep] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [todayDayNum, setTodayDayNum] = useState(1);
  const todayFilled = days.some(d => d.day_number === todayDayNum);
  const canAddToday = todayDayNum <= 7 && !todayFilled && !showForm;

  const load = useCallback(async () => {
    const user = await ensureAuth();
    setUserId(user?.id ?? null);
    const d = await getDays(challengeId);
    setDays(d);
    setDoneCount(await getTodayDoneCount());
    setClapCount(await getTodayClapCount());

    const { data: challenge } = await supabase
      .from('mini_challenges')
      .select()
      .eq('id', challengeId)
      .maybeSingle();

    if (challenge?.status === 'completed') {
      router.replace(`/challenge/${challengeId}/complete`);
      return;
    }

    if (challenge?.goal) setGoal(challenge.goal);
    if (challenge?.theme) setChallengeTheme(challenge.theme);

    const dayNum = challenge ? calcTodayDay(challenge.started_at) : 1;
    setTodayDayNum(dayNum);

    if (user) {
      const others = await getOthersPosts(dayNum, user.id);
      setOthersPosts(others);
      const cheers = await getMyCheerCount(challengeId, dayNum);
      setCheerCount(cheers);
      const alreadyClapped = await hasClappedToday(user.id);
      setClapped(alreadyClapped);
      const weeks = await getStreakWeeks();
      setStreakWeeks(weeks);
    }
  }, [challengeId, router]);

  useEffect(() => { load(); }, [load]);

  function openNewForm() {
    setEditingDay(null);
    setPlan('');
    setStatus(null);
    setNextStep('');
    setShowForm(true);
  }

  function openEditForm(day: MiniChallengeDay) {
    setEditingDay(day.day_number);
    setPlan(day.plan);
    setStatus(day.status);
    setNextStep(day.next_step ?? '');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingDay(null);
    setPlan('');
    setStatus(null);
    setNextStep('');
  }

  async function handleSave() {
    if (!plan.trim() || !status) return;
    setSaving(true);
    const targetDay = editingDay ?? todayDayNum;
    await saveDay(challengeId, targetDay, plan.trim(), status, nextStep.trim() || undefined);

    if (targetDay === 7 && status === 'done') {
      await completeChallenge(challengeId);
      router.replace(`/challenge/${challengeId}/complete`);
      return;
    }
    await load();
    closeForm();
    setSaving(false);
  }

  async function handleClap() {
    if (clapped || !userId) return;
    setClapped(true);
    setClapCount(c => c + 1);
    const result = await sendClap(userId);
    if (result === 'already_clapped') {
      setClapped(true);
    }
  }

  async function handleCheck(postId: string, idx: number) {
    if (!userId) return;
    const updated = [...othersPosts];
    updated[idx] = { ...updated[idx], already_checked: true, check_count: updated[idx].check_count + 1 };
    setOthersPosts(updated);
    await checkPost(postId, userId);
  }

  const titleData = getTitle(streakWeeks);
  const themeData = theme ? THEMES[theme] : null;
  const daysProgress = days.filter(d => d.status === 'done').length;

  return (
    <div style={{ paddingTop: 24 }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
        @keyframes glow { 0%,100% { box-shadow:0 0 10px rgba(155,89,255,0.2); } 50% { box-shadow:0 0 25px rgba(155,89,255,0.5); } }
        .log-btn:hover { opacity:0.8; }
        .clap-btn:hover { transform:translateY(-2px); }
        .cheer-btn:hover { opacity:0.8; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 26, color: '#9b59ff', textShadow: '0 0 15px rgba(155,89,255,0.6)' }}>
          Hagrit
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: 'rgba(255,215,0,0.1)', borderRadius: 100, padding: '5px 12px', border: '1px solid rgba(255,215,0,0.3)', fontFamily: 'Nunito, sans-serif', fontSize: 12, color: '#ffd700', fontWeight: 700 }}>
            {titleData.emoji} {titleData.title}
          </div>
          <div style={{ background: 'rgba(155,89,255,0.1)', borderRadius: 100, padding: '5px 12px', border: '1px solid rgba(155,89,255,0.3)', fontFamily: 'Nunito, sans-serif', fontSize: 12, color: '#c39bff', fontWeight: 700 }}>
            🔥 {doneCount}人修行中
          </div>
        </div>
      </div>

      {/* 目標カード */}
      {goal && (
        <div style={{ background: '#2d1b4e', borderRadius: 16, padding: '14px 16px', marginBottom: 14, border: '1px solid #4a3a6a', animation: 'fadeUp 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            {themeData && (
              <span style={{ background: 'transparent', color: themeData.color, fontSize: 11, fontFamily: 'Nunito, sans-serif', fontWeight: 700, padding: '2px 8px', borderRadius: 100, border: `1px solid ${themeData.color}`, flexShrink: 0 }}>
                {themeData.icon} {theme}
              </span>
            )}
            <span style={{ fontSize: 11, color: '#9988bb', fontFamily: 'Nunito, sans-serif', fontWeight: 700 }}>7日間の誓い</span>
          </div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: '#f0e6ff', lineHeight: 1.4 }}>
            {goal}
          </div>
        </div>
      )}

      {/* 応援バナー */}
      {cheerCount > 0 && (
        <div style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 14, padding: '10px 14px', marginBottom: 14, textAlign: 'center', animation: 'fadeUp 0.4s ease' }}>
          <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 14, color: '#ffd700', fontWeight: 800 }}>
            ✨ 今日{cheerCount}人があなたに魔力を送っています！
          </span>
        </div>
      )}

      {/* Progress card */}
      <div style={{ background: '#2d1b4e', borderRadius: 20, padding: 20, boxShadow: '0 4px 0 #1a0a2e', marginBottom: 14, animation: 'fadeUp 0.3s ease', border: '1px solid #4a3a6a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: '#c39bff' }}>修行の記録</div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 20, color: '#f0e6ff' }}>
            {daysProgress}<span style={{ fontSize: 13, color: '#9988bb' }}>/7</span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 10, background: '#1a0a2e', borderRadius: 100, marginBottom: 14, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(daysProgress / 7) * 100}%`, background: 'linear-gradient(90deg, #9b59ff, #00d4aa)', borderRadius: 100, transition: 'width 0.5s ease', boxShadow: '0 0 10px rgba(155,89,255,0.5)' }} />
        </div>

        {/* Day dots */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {Array.from({ length: 7 }, (_, i) => {
            const day = days.find(d => d.day_number === i + 1);
            const isToday = i + 1 === todayDayNum;
            const isDone = day?.status === 'done';
            const isNotDone = day?.status === 'not_done';
            return (
              <div key={i} style={{
                width: 36, height: 36, borderRadius: 10,
                background: isDone ? 'linear-gradient(135deg, #9b59ff, #6a1fc2)' : isNotDone ? 'rgba(255,75,110,0.2)' : isToday ? 'rgba(155,89,255,0.15)' : 'rgba(255,255,255,0.04)',
                border: `2px solid ${isDone ? '#9b59ff' : isNotDone ? '#ff4b6e' : isToday ? '#9b59ff' : '#4a3a6a'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Cinzel, serif', fontSize: 12, color: isDone ? '#fff' : isToday ? '#9b59ff' : '#9988bb',
                boxShadow: isDone ? '0 0 10px rgba(155,89,255,0.4)' : isToday ? '0 0 8px rgba(155,89,255,0.2)' : 'none',
                animation: isToday && !day ? 'pulse 2s ease-in-out infinite' : 'none',
              }}>
                {isDone ? '✦' : isNotDone ? '✕' : i + 1}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div style={{ background: '#2d1b4e', borderRadius: 14, padding: '12px 14px', border: '1px solid #4a3a6a', textAlign: 'center' }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>🔮</div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: '#c39bff' }}>{clapCount}</div>
          <div style={{ fontSize: 11, color: '#9988bb', fontWeight: 700 }}>魔力ポーション</div>
        </div>
        <div style={{ background: '#2d1b4e', borderRadius: 14, padding: '12px 14px', border: '1px solid #4a3a6a', textAlign: 'center' }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>📅</div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: '#c39bff' }}>{daysProgress}</div>
          <div style={{ fontSize: 11, color: '#9988bb', fontWeight: 700 }}>修行済み日数</div>
        </div>
      </div>

      {/* 記録ボタン */}
      {canAddToday && (
        <button onClick={openNewForm} style={{ width: '100%', padding: '16px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, #9b59ff, #6a1fc2)', color: '#fff', fontFamily: 'Cinzel, serif', fontSize: 16, cursor: 'pointer', boxShadow: '0 6px 0 #4a0f8a, 0 0 20px rgba(155,89,255,0.3)', marginBottom: 14, animation: 'fadeUp 0.4s ease', transition: 'all 0.15s' }}>
          ✦ Day {todayDayNum} の修行を記録
        </button>
      )}

      {todayFilled && !showForm && (
        <div style={{ background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.3)', borderRadius: 14, padding: '12px 16px', marginBottom: 14, textAlign: 'center', animation: 'fadeUp 0.4s ease' }}>
          <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: 14, color: '#00d4aa', fontWeight: 800 }}>✦ 今日の修行完了！</span>
        </div>
      )}

      {/* フォーム */}
      {showForm && (
        <div style={{ background: '#2d1b4e', borderRadius: 20, padding: 20, marginBottom: 14, border: '1px solid #9b59ff', boxShadow: '0 0 20px rgba(155,89,255,0.2)', animation: 'fadeUp 0.3s ease' }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 15, color: '#c39bff', marginBottom: 16 }}>
            {editingDay ? `Day ${editingDay} を編集` : `Day ${todayDayNum} の記録`}
          </div>

          <label style={{ fontSize: 12, color: '#9988bb', fontWeight: 700, display: 'block', marginBottom: 6 }}>今日やったこと</label>
          <textarea
            value={plan}
            onChange={e => setPlan(e.target.value)}
            placeholder="今日の取り組みを記録..."
            rows={3}
            style={{ width: '100%', padding: '12px', borderRadius: 12, border: '2px solid #4a3a6a', background: '#1a0a2e', color: '#f0e6ff', fontSize: 14, fontFamily: 'Nunito, sans-serif', fontWeight: 700, resize: 'none', marginBottom: 14, boxSizing: 'border-box' as const, outline: 'none' }}
          />

          <label style={{ fontSize: 12, color: '#9988bb', fontWeight: 700, display: 'block', marginBottom: 8 }}>達成度</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            {[{ v: 'done' as const, label: '✦ できた！', color: '#00d4aa', bg: 'rgba(0,212,170,0.1)', border: '#00d4aa' }, { v: 'not_done' as const, label: '✕ できなかった', color: '#ff4b6e', bg: 'rgba(255,75,110,0.1)', border: '#ff4b6e' }].map(opt => (
              <button key={opt.v} onClick={() => setStatus(opt.v)} style={{ padding: '12px', borderRadius: 12, border: `2px solid ${status === opt.v ? opt.border : '#4a3a6a'}`, background: status === opt.v ? opt.bg : 'transparent', color: status === opt.v ? opt.color : '#9988bb', fontFamily: 'Nunito, sans-serif', fontSize: 14, fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s' }}>
                {opt.label}
              </button>
            ))}
          </div>

          <label style={{ fontSize: 12, color: '#9988bb', fontWeight: 700, display: 'block', marginBottom: 6 }}>明日の誓い（任意）</label>
          <input
            value={nextStep}
            onChange={e => setNextStep(e.target.value)}
            placeholder="明日やること..."
            style={{ width: '100%', padding: '12px', borderRadius: 12, border: '2px solid #4a3a6a', background: '#1a0a2e', color: '#f0e6ff', fontSize: 14, fontFamily: 'Nunito, sans-serif', fontWeight: 700, marginBottom: 14, boxSizing: 'border-box' as const, outline: 'none' }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={closeForm} style={{ padding: '12px', borderRadius: 12, border: '2px solid #4a3a6a', background: 'transparent', color: '#9988bb', fontFamily: 'Nunito, sans-serif', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
              キャンセル
            </button>
            <button onClick={handleSave} disabled={!plan.trim() || !status || saving} style={{ padding: '12px', borderRadius: 12, border: 'none', background: (!plan.trim() || !status || saving) ? '#2d1b4e' : 'linear-gradient(135deg, #9b59ff, #6a1fc2)', color: (!plan.trim() || !status || saving) ? '#4a3a6a' : '#fff', fontFamily: 'Nunito, sans-serif', fontSize: 14, fontWeight: 800, cursor: (!plan.trim() || !status || saving) ? 'not-allowed' : 'pointer', boxShadow: (!plan.trim() || !status || saving) ? 'none' : '0 4px 0 #4a0f8a' }}>
              {saving ? '記録中...' : '✦ 記録する'}
            </button>
          </div>
        </div>
      )}

      {/* 7日ログ */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: '#c39bff', marginBottom: 10 }}>修行ログ 📜</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 7 }, (_, i) => {
            const day = days.find(d => d.day_number === i + 1);
            const isToday = i + 1 === todayDayNum;
            const isDone = day?.status === 'done';
            const isNotDone = day?.status === 'not_done';
            return (
              <div key={i} style={{ background: isDone ? 'rgba(155,89,255,0.08)' : isNotDone ? 'rgba(255,75,110,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isDone ? 'rgba(155,89,255,0.3)' : isNotDone ? 'rgba(255,75,110,0.3)' : '#4a3a6a'}`, borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, opacity: !day && !isToday ? 0.4 : 1 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: isDone ? 'linear-gradient(135deg,#9b59ff,#6a1fc2)' : isNotDone ? 'rgba(255,75,110,0.2)' : '#1a0a2e', border: `1px solid ${isDone ? '#9b59ff' : isNotDone ? '#ff4b6e' : '#4a3a6a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cinzel, serif', fontSize: 11, color: isDone ? '#fff' : '#9988bb', flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 800, color: day ? '#f0e6ff' : '#9988bb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {day?.plan ?? (isToday ? '今日の記録待ち...' : '未記録')}
                </div>
                {day && (
                  <button className="log-btn" onClick={() => openEditForm(day)} style={{ fontSize: 11, color: '#9988bb', background: 'transparent', border: '1px solid #4a3a6a', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700 }}>
                    編集
                  </button>
                )}
                <span style={{ fontSize: 14, flexShrink: 0 }}>{isDone ? '✦' : isNotDone ? '✕' : ''}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 仲間の気配 */}
      {othersPosts.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: '#c39bff', marginBottom: 10 }}>仲間の気配 🌑</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {othersPosts.map((post, idx) => (
              <div key={post.id} style={{ background: '#2d1b4e', borderRadius: 14, padding: '12px 14px', border: '1px solid #4a3a6a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#c39bff', fontFamily: 'Nunito, sans-serif' }}>{post.nickname}</span>
                  {post.theme && (
                    <span style={{ fontSize: 10, color: THEMES[post.theme]?.color ?? '#9988bb', border: `1px solid ${THEMES[post.theme]?.color ?? '#9988bb'}`, borderRadius: 100, padding: '1px 7px', fontFamily: 'Nunito, sans-serif', fontWeight: 700 }}>
                      {THEMES[post.theme]?.icon} {post.theme}
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: '#9988bb', marginLeft: 'auto', fontFamily: 'Nunito, sans-serif', fontWeight: 700 }}>Day {post.day_number}</span>
                </div>
                <div style={{ fontSize: 13, color: '#f0e6ff', fontWeight: 700, marginBottom: 8, fontFamily: 'Nunito, sans-serif' }}>{post.plan}</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="cheer-btn" onClick={() => !post.already_checked && handleCheck(post.id, idx)} style={{ padding: '6px 14px', borderRadius: 100, border: `1px solid ${post.already_checked ? 'rgba(0,212,170,0.3)' : 'rgba(155,89,255,0.4)'}`, background: post.already_checked ? 'rgba(0,212,170,0.1)' : 'rgba(155,89,255,0.1)', color: post.already_checked ? '#00d4aa' : '#c39bff', fontSize: 12, fontFamily: 'Nunito, sans-serif', fontWeight: 800, cursor: post.already_checked ? 'default' : 'pointer', transition: 'all 0.15s' }}>
                    {post.already_checked ? `✦ 魔力を送った (${post.check_count})` : `✧ 魔力を送る (${post.check_count})`}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 魔力ポーションボタン（旧：拍手） */}
      <button onClick={handleClap} disabled={clapped} className="clap-btn" style={{ width: '100%', padding: '16px', borderRadius: 16, border: `1px solid ${clapped ? 'rgba(0,212,170,0.3)' : 'rgba(155,89,255,0.4)'}`, background: clapped ? 'rgba(0,212,170,0.08)' : 'rgba(155,89,255,0.1)', color: clapped ? '#00d4aa' : '#c39bff', fontFamily: 'Cinzel, serif', fontSize: 15, cursor: clapped ? 'default' : 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <span style={{ fontSize: 20 }}>🔮</span>
        {clapped ? `魔力を送った！(${clapCount})` : `今日の修行者に魔力を送る (${clapCount})`}
      </button>
    </div>
  );
}
