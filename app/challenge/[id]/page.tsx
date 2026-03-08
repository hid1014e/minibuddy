'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  getDays, saveDay, completeChallenge,
  getTodayDoneCount, getTodayClapCount, sendClap, hasClappedToday,
  ensureAuth, getOthersPosts, checkPost, getMyCheerCount,
} from '@/lib/api';
import { MiniChallengeDay, OthersDayPost } from '@/lib/types';
import { supabase } from '@/lib/supabase';

function calcTodayDay(startedAt: string): number {
  const start = new Date(startedAt);
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const t = new Date();
  const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  const diff = Math.floor((today.getTime() - s.getTime()) / 86400000);
  return Math.min(Math.max(diff + 1, 1), 7);
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

    // チャレンジ開始日から今日が何日目か（このチャレンジを直接取得）
    const { data: challenge, error: challengeError } = await supabase
      .from('mini_challenges')
      .select()
      .eq('id', challengeId)
      .maybeSingle();

    console.log('challenge status:', challenge?.status, 'id:', challengeId, 'full:', JSON.stringify(challenge));

    // 完了済みなら完了画面へ
    if (challenge?.status === 'completed') {
      router.replace(`/challenge/${challengeId}/complete`);
      return;
    }

    const dayNum = challenge ? calcTodayDay(challenge.started_at) : 1;
    setTodayDayNum(dayNum);

    if (user) {
      const others = await getOthersPosts(dayNum, user.id);
      setOthersPosts(others);
      const cheers = await getMyCheerCount(challengeId, dayNum);
      setCheerCount(cheers);
      const alreadyClapped = await hasClappedToday(user.id);
      setClapped(alreadyClapped);
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
    setPlan(''); setStatus(null); setNextStep('');
  }

  async function handleSave() {
    if (!plan || !status) return;
    setSaving(true);
    try {
      const dayNum = editingDay ?? todayDayNum;
      await saveDay(challengeId, dayNum, plan, status, nextStep);
      if (dayNum === 7 && !editingDay) {
        await completeChallenge(challengeId);
        router.push(`/challenge/${challengeId}/complete`);
        return;
      }
      await load();
      closeForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleClap() {
    if (clapped || !userId) return;
    setClapped(true);
    setClapCount(c => c + 1);
    await sendClap(userId);
  }

  async function handleCheck(post: OthersDayPost) {
    if (post.already_checked || !userId) return;
    setOthersPosts(prev => prev.map(p =>
      p.id === post.id ? { ...p, check_count: p.check_count + 1, already_checked: true } : p
    ));
    await checkPost(userId, post.id);
  }

  const progressPct = (days.filter(d => d.status === 'done').length / 7) * 100;

  return (
    <div style={{ paddingTop: 20 }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pop { 0% { transform:scale(1); } 40% { transform:scale(1.15); } 100% { transform:scale(1); } }
        @keyframes celebrate { 0% { transform:scale(0) rotate(-10deg); } 60% { transform:scale(1.2); } 100% { transform:scale(1); } }
        .day-card:hover { transform:translateY(-2px); box-shadow: 0 5px 0 #ccc !important; }
        .edit-tag:hover { background: #e5f4ff !important; color: #1cb0f6 !important; }
        .save-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow: 0 8px 0 #46a302 !important; }
        .save-btn:active:not(:disabled) { transform:translateY(4px); box-shadow:none !important; }
        .clap-btn:hover { opacity:0.9; transform:scale(1.02); }
        .check-btn:hover:not(:disabled) { transform:scale(1.08); }
        .add-btn:hover { transform:translateY(-2px); box-shadow: 0 8px 0 #0a91d1 !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 28, color: '#58cc02', textShadow: '0 3px 0 #46a302' }}>
          mini<span style={{ color: '#1cb0f6' }}>buddy</span>
        </div>
        <div style={{
          background: '#fff3d7', borderRadius: 100, padding: '6px 14px',
          boxShadow: '0 3px 0 #ffe0a0',
          fontFamily: 'Fredoka One, cursive', fontSize: 15, color: '#ff9600',
          border: '2px solid #ffd080',
        }}>
          🔥 {doneCount}人達成
        </div>
      </div>

      {/* 応援バナー */}
      {cheerCount > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #fff3d7, #ffe8b0)',
          border: '2.5px solid #ffc800',
          borderRadius: 16, padding: '12px 16px',
          marginBottom: 16, textAlign: 'center',
          boxShadow: '0 4px 0 #e0b000',
          animation: 'fadeUp 0.4s ease',
        }}>
          <span style={{ fontSize: 20 }}>📣</span>
          <span style={{ fontFamily: 'Fredoka One, cursive', fontSize: 16, color: '#ff9600', marginLeft: 8 }}>
            今日{cheerCount}人があなたを応援中！
          </span>
        </div>
      )}

      {/* Progress card */}
      <div style={{
        background: '#fff', borderRadius: 20, padding: 20,
        boxShadow: '0 4px 0 #d0d0d0', marginBottom: 16,
        animation: 'fadeUp 0.3s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 16, color: '#3c3c3c' }}>進捗</div>
          <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 15, color: '#58cc02' }}>
            {days.filter(d => d.status === 'done').length}/7 達成
          </div>
        </div>
        <div style={{ background: '#e5e5e5', borderRadius: 100, height: 14, marginBottom: 14, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 100, width: `${progressPct}%`,
            background: 'linear-gradient(90deg, #58cc02, #89e219)',
            boxShadow: '0 2px 4px rgba(88,204,2,0.4)',
            transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: 7 }, (_, i) => {
            const d = days.find(x => x.day_number === i + 1);
            const isToday = i + 1 === todayDayNum;
            const bg = d?.status === 'done' ? '#58cc02'
              : d?.status === 'not_done' ? '#ff4b4b'
              : isToday ? '#1cb0f6' : '#e5e5e5';
            return (
              <div key={i} style={{
                flex: 1, height: 8, borderRadius: 100, background: bg,
                opacity: i + 1 > todayDayNum ? 0.3 : 1,
                transition: 'all 0.3s',
              }} />
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { icon: '👏', num: clapCount, label: '今日の拍手', color: '#ff9600', bg: '#fff3d7', shadow: '#ffe0a0' },
          { icon: '📅', num: days.length, label: '記録済み日数', color: '#ce82ff', bg: '#f1d9ff', shadow: '#e0b0ff' },
        ].map(({ icon, num, label, color, bg, shadow }) => (
          <div key={label} style={{
            background: bg, borderRadius: 16, padding: '14px 12px',
            textAlign: 'center', boxShadow: `0 4px 0 ${shadow}`,
          }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
            <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 26, color, lineHeight: 1 }}>{num}</div>
            <div style={{ fontSize: 11, color: '#999', fontWeight: 700, marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* 今日の入力ボタン（未入力の場合） */}
      {canAddToday && (
        <button
          onClick={openNewForm}
          className="add-btn"
          style={{
            width: '100%', padding: '16px', borderRadius: 16, border: 'none',
            background: '#1cb0f6', color: '#fff',
            fontFamily: 'Fredoka One, cursive', fontSize: 18,
            cursor: 'pointer', boxShadow: '0 6px 0 #0a91d1',
            transition: 'all 0.15s', marginBottom: 16,
          }}
        >
          ✏️ Day {todayDayNum} を記録する！
        </button>
      )}

      {/* 今日入力済みメッセージ */}
      {todayFilled && !showForm && (
        <div style={{
          background: '#f0fce4', border: '2.5px solid #58cc02',
          borderRadius: 20, padding: '16px', textAlign: 'center', marginBottom: 16,
          boxShadow: '0 4px 0 #c8f59a',
        }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
          <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 16, color: '#58cc02' }}>今日の記録完了！</div>
          <div style={{ fontSize: 13, color: '#777', marginTop: 4, fontWeight: 700 }}>また明日！継続は力なり 💪</div>
        </div>
      )}

      {/* フォーム（新規 or 編集） */}
      {showForm && (
        <div style={{
          background: '#fff', borderRadius: 20, padding: 20,
          boxShadow: '0 4px 0 #d0d0d0', marginBottom: 16,
          border: '2.5px solid #1cb0f6',
          animation: 'fadeUp 0.2s ease',
        }}>
          <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 17, color: '#1cb0f6', marginBottom: 16 }}>
            {editingDay ? `Day ${editingDay} を編集` : `Day ${todayDayNum} を記録しよう！`}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 800, color: '#777', display: 'block', marginBottom: 6 }}>今日やること</label>
            <input
              value={plan}
              onChange={e => setPlan(e.target.value)}
              placeholder="例：競合5社のLPを分析する"
              style={{
                width: '100%', padding: '12px 14px',
                border: '2.5px solid #e5e5e5', borderRadius: 12,
                fontSize: 15, fontFamily: 'Nunito, sans-serif', fontWeight: 700,
                color: '#3c3c3c', outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = '#1cb0f6'}
              onBlur={e => e.target.style.borderColor = '#e5e5e5'}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 800, color: '#777', display: 'block', marginBottom: 6 }}>実行した？</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['done', 'not_done'] as const).map(s => (
                <button key={s} onClick={() => setStatus(s)} style={{
                  flex: 1, padding: '12px 8px', borderRadius: 12,
                  border: `2.5px solid ${status === s ? s === 'done' ? '#58cc02' : '#ff4b4b' : '#e5e5e5'}`,
                  background: status === s ? s === 'done' ? '#f0fce4' : '#fff0f0' : '#fafafa',
                  color: status === s ? s === 'done' ? '#58cc02' : '#ff4b4b' : '#999',
                  fontFamily: 'Nunito, sans-serif', fontSize: 14, fontWeight: 800,
                  cursor: 'pointer', transition: 'all 0.15s',
                  boxShadow: status === s ? s === 'done' ? '0 3px 0 #c8f59a' : '0 3px 0 #ffc0c0' : '0 3px 0 #e0e0e0',
                }}>
                  {s === 'done' ? '✅ やった！' : '❌ できなかった'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 13, fontWeight: 800, color: '#777', display: 'block', marginBottom: 6 }}>明日の一手（任意）</label>
            <textarea
              value={nextStep}
              onChange={e => setNextStep(e.target.value)}
              placeholder="例：明日は差別化ポイントをまとめる"
              rows={2}
              style={{
                width: '100%', padding: '12px 14px',
                border: '2.5px solid #e5e5e5', borderRadius: 12,
                fontSize: 14, fontFamily: 'Nunito, sans-serif', fontWeight: 700,
                color: '#3c3c3c', outline: 'none', resize: 'none',
              }}
              onFocus={e => e.target.style.borderColor = '#1cb0f6'}
              onBlur={e => e.target.style.borderColor = '#e5e5e5'}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !plan || !status}
            className="save-btn"
            style={{
              width: '100%', padding: '16px', borderRadius: 14, border: 'none',
              background: saving || !plan || !status ? '#e5e5e5' : '#58cc02',
              color: saving || !plan || !status ? '#afafaf' : '#fff',
              fontFamily: 'Fredoka One, cursive', fontSize: 18,
              cursor: saving || !plan || !status ? 'not-allowed' : 'pointer',
              boxShadow: saving || !plan || !status ? 'none' : '0 6px 0 #46a302',
              transition: 'all 0.15s', marginBottom: 10,
            }}
          >
            {saving ? '保存中...' : `Day ${editingDay ?? todayDayNum} を保存！`}
          </button>

          <button onClick={closeForm} style={{
            width: '100%', padding: '10px', borderRadius: 10,
            border: '2px solid #e5e5e5', background: 'transparent',
            color: '#afafaf', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
          }}>
            キャンセル
          </button>
        </div>
      )}

      {/* Day cards */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 18, color: '#3c3c3c', marginBottom: 10 }}>
          7日ログ 📋
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 7 }, (_, i) => {
            const d = days.find(x => x.day_number === i + 1);
            const isToday = i + 1 === todayDayNum;
            const isFuture = i + 1 > todayDayNum;
            const isEditing = editingDay === i + 1 && showForm;

            const cardBg = d?.status === 'done' ? '#f0fce4'
              : d?.status === 'not_done' ? '#fff0f0'
              : isToday ? '#f0f8ff' : '#fafafa';
            const borderColor = d?.status === 'done' ? '#58cc02'
              : d?.status === 'not_done' ? '#ff4b4b'
              : isToday ? '#1cb0f6' : '#e5e5e5';

            return (
              <div key={i} className="day-card" style={{
                background: cardBg, border: `2.5px solid ${borderColor}`,
                borderRadius: 16, padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
                opacity: isFuture ? 0.5 : 1,
                transition: 'all 0.15s',
                boxShadow: d?.status === 'done' ? '0 3px 0 #c8f59a'
                  : isToday ? '0 3px 0 #b3dfff' : '0 3px 0 #e0e0e0',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: d?.status === 'done' ? '#58cc02'
                    : d?.status === 'not_done' ? '#ff4b4b'
                    : isToday ? '#1cb0f6' : '#e5e5e5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Fredoka One, cursive', fontSize: 13, color: '#fff',
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 800, color: isFuture ? '#bbb' : '#3c3c3c',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {d?.plan || (isToday ? '← 今日の記録を入力！' : '未入力')}
                  </div>
                  {d?.next_step && (
                    <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>→ {d.next_step}</div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {/* 編集ボタン（入力済みならいつでも） */}
                  {d && !isEditing && (
                    <button
                      className="edit-tag"
                      onClick={() => openEditForm(d)}
                      style={{
                        padding: '4px 10px', borderRadius: 8,
                        border: '1.5px solid #e5e5e5', background: '#fafafa',
                        fontSize: 12, fontWeight: 700, color: '#afafaf',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      編集
                    </button>
                  )}
                  <span style={{ fontSize: 20 }}>
                    {d?.status === 'done' ? '✅' : d?.status === 'not_done' ? '❌' : isToday ? '✏️' : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 仲間の気配（同じDay、最大3件） */}
      {othersPosts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'Fredoka One, cursive', fontSize: 18, color: '#3c3c3c', marginBottom: 4 }}>
            仲間の気配 👀
          </div>
          <div style={{ fontSize: 12, color: '#afafaf', fontWeight: 700, marginBottom: 10 }}>
            同じDay{todayDayNum}に取り組む人たち（ランダム3件）
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {othersPosts.map(post => (
              <div key={post.id} style={{
                background: '#fff', border: '2px solid #e5e5e5',
                borderRadius: 16, padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
                boxShadow: '0 3px 0 #e0e0e0',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: '#afafaf', marginBottom: 4, fontWeight: 700 }}>
                    <span style={{ color: '#ce82ff', fontWeight: 800 }}>{post.nickname}</span>
                    {post.theme && (
                      <span style={{
                        marginLeft: 6, padding: '1px 7px', borderRadius: 100,
                        background: '#f0f4ff', fontSize: 11, fontWeight: 800, color: '#6699ff',
                        border: '1.5px solid #ccd9ff',
                      }}>
                        {post.theme === '健康' ? '💪' : post.theme === 'お金' ? '💰' : post.theme === '夢' ? '🌟' : post.theme === 'キャリア' ? '🚀' : post.theme === '人間関係' ? '❤️' : '✨'} {post.theme}
                      </span>
                    )}
                    {' · '}
                    <span style={{ color: post.status === 'done' ? '#58cc02' : '#ff4b4b' }}>
                      {post.status === 'done' ? 'done ✅' : 'not done ❌'}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 800, color: '#3c3c3c',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {post.plan}
                  </div>
                </div>
                <button
                  onClick={() => handleCheck(post)}
                  disabled={post.already_checked}
                  className="check-btn"
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    padding: '8px 12px', borderRadius: 12, flexShrink: 0,
                    border: `2px solid ${post.already_checked ? '#ce82ff' : '#e5e5e5'}`,
                    background: post.already_checked ? '#f1d9ff' : '#fafafa',
                    cursor: post.already_checked ? 'default' : 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: post.already_checked ? '0 3px 0 #e0b0ff' : '0 3px 0 #e0e0e0',
                  }}
                >
                  <span style={{ fontSize: 18 }}>📣</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: post.already_checked ? '#ce82ff' : '#afafaf' }}>
                    {post.already_checked ? '応援済' : '応援する'}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 拍手ボタン */}
      <button
        onClick={handleClap}
        className="clap-btn"
        style={{
          width: '100%', padding: '16px', borderRadius: 16,
          border: clapped ? '2.5px solid #ff9600' : 'none',
          background: clapped ? '#fff3d7' : '#ff9600',
          color: clapped ? '#ff9600' : '#fff',
          fontFamily: 'Fredoka One, cursive', fontSize: 17,
          cursor: clapped ? 'default' : 'pointer',
          boxShadow: clapped ? '0 4px 0 #ffe0a0' : '0 6px 0 #cc7a00',
          transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}
      >
        <span style={{ fontSize: 22 }}>👏</span>
        {clapped ? `拍手した！(${clapCount})` : `今日の達成者に拍手！(${clapCount})`}
      </button>
    </div>
  );
}
