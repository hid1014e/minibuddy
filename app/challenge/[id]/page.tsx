'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  getDays, saveDay, completeChallenge,
  getTodayDoneCount, getTodayClapCount, sendClap, ensureAuth,
} from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { MiniChallengeDay } from '@/lib/types';

export default function ChallengePage() {
  const router = useRouter();
  const params = useParams();
  const challengeId = params.id as string;

  const [days, setDays] = useState<MiniChallengeDay[]>([]);
  const [doneCount, setDoneCount] = useState(0);
  const [clapCount, setClapCount] = useState(0);
  const [clapped, setClapped] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState<'done' | 'not_done' | null>(null);
  const [nextStep, setNextStep] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);

  const currentDay = days.length + 1;

  const load = useCallback(async () => {
    const user = await ensureAuth();
    setUserId(user?.id ?? null);
    const d = await getDays(challengeId);
    setDays(d);
    setDoneCount(await getTodayDoneCount());
    setClapCount(await getTodayClapCount());
  }, [challengeId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!plan || !status) return;
    setSaving(true);
    try {
      const dayNum = editingDay ?? currentDay;
      await saveDay(challengeId, dayNum, plan, status, nextStep);
      if (dayNum === 7 && !editingDay) {
        await completeChallenge(challengeId);
        router.push(`/challenge/${challengeId}/complete`);
        return;
      }
      await load();
      setPlan(''); setStatus(null); setNextStep('');
      setEditingDay(null);
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(day: MiniChallengeDay) {
    setEditingDay(day.day_number);
    setPlan(day.plan);
    setStatus(day.status);
    setNextStep(day.next_step ?? '');
  }

  async function handleClap() {
    if (clapped || !userId) return;
    setClapped(true);
    setClapCount(c => c + 1);
    const result = await sendClap(userId);
    if (result === 'already_clapped') setClapped(true);
  }

  const progressPct = (days.filter(d => d.status === 'done').length / 7) * 100;

  return (
    <div style={{ paddingTop: 24, animation: 'fadeIn 0.3s ease' }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes glow {
          from { text-shadow: 0 0 10px rgba(150,100,255,0.6); }
          to   { text-shadow: 0 0 20px rgba(180,130,255,1), 0 0 40px rgba(120,80,255,0.6); }
        }
        @keyframes pulse-dot { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        @keyframes clap-pop { 0% { transform:scale(1); } 40% { transform:scale(1.2); } 100% { transform:scale(1); } }
      `}</style>

      <div className="text-center mb-4">
        <div className="font-pixel" style={{ fontSize: 16, color: '#fff', animation: 'glow 2s ease-in-out infinite alternate' }}>
          mini<span style={{ color: '#a78bfa' }}>buddy</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { icon: '🔥', num: doneCount, label: '今日達成' },
          { icon: '👏', num: clapCount, label: '拍手' },
          { icon: '📅', num: days.length, label: '記録済み日数' },
        ].map(({ icon, num, label }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(167,139,250,0.2)',
            borderRadius: 12, padding: '10px 8px', textAlign: 'center',
          }}>
            <span style={{ fontSize: 16, display: 'block' }}>{icon}</span>
            <span className="font-pixel" style={{ fontSize: 18, color: '#a78bfa', display: 'block', lineHeight: 1.2, marginTop: 4 }}>{num}</span>
            <span style={{ fontSize: 9, color: '#666', fontWeight: 700, display: 'block', marginTop: 4 }}>{label}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 justify-center mb-3">
        {Array.from({ length: 7 }, (_, i) => {
          const d = days.find(x => x.day_number === i + 1);
          const isToday = i + 1 === currentDay;
          const bg = d?.status === 'done' ? '#34d399'
            : d?.status === 'not_done' ? 'rgba(251,113,133,0.5)'
            : isToday ? 'rgba(167,139,250,0.6)'
            : 'rgba(255,255,255,0.1)';
          return (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: 2, background: bg,
              boxShadow: d?.status === 'done' ? '0 0 6px rgba(52,211,153,0.5)' : 'none',
              animation: isToday ? 'pulse-dot 1s infinite' : 'none',
            }} />
          );
        })}
      </div>

      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 100, height: 5, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 100, width: `${progressPct}%`,
          background: 'linear-gradient(90deg, #7c3aed, #a855f7, #c084fc)',
          transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
        }} />
      </div>

      <div className="font-pixel flex items-center gap-2 mb-3" style={{ fontSize: 9, color: '#a78bfa', letterSpacing: 1 }}>
        7日ログ
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(167,139,250,0.3), transparent)' }} />
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {Array.from({ length: 7 }, (_, i) => {
          const d = days.find(x => x.day_number === i + 1);
          const isToday = i + 1 === currentDay && !editingDay;
          const isFuture = i + 1 > currentDay;
          const isEditing = editingDay === i + 1;
          const borderColor = d?.status === 'done' ? 'rgba(52,211,153,0.3)'
            : d?.status === 'not_done' ? 'rgba(251,113,133,0.2)'
            : isToday ? 'rgba(167,139,250,0.5)'
            : 'rgba(255,255,255,0.07)';
          const bg = d?.status === 'done' ? 'rgba(52,211,153,0.04)'
            : d?.status === 'not_done' ? 'rgba(251,113,133,0.02)'
            : isToday ? 'rgba(167,139,250,0.06)'
            : 'rgba(255,255,255,0.02)';
          return (
            <div key={i} style={{
              background: bg, border: `1px solid ${borderColor}`,
              borderRadius: 14, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
              opacity: isFuture ? 0.35 : 1,
              cursor: d && !isEditing ? 'pointer' : 'default',
              transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
            }}
              onClick={() => d && !isEditing && handleEdit(d)}
            >
              {(d?.status === 'done' || isToday) && (
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                  background: d?.status === 'done'
                    ? 'linear-gradient(180deg, #34d399, #059669)'
                    : 'linear-gradient(180deg, #a78bfa, #7c3aed)',
                  borderRadius: '3px 0 0 3px',
                }} />
              )}
              <span className="font-pixel" style={{
                fontSize: 8,
                color: d?.status === 'done' ? '#34d399' : isToday ? '#a78bfa' : '#555',
                minWidth: 28, flexShrink: 0,
              }}>D{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 700, color: isFuture ? '#444' : '#e8e8ff',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {d?.plan || (isToday ? '← 今日の記録を入力' : '未入力')}
                </div>
                {d?.next_step && <div style={{ fontSize: 11, color: '#666', marginTop: 3 }}>→ {d.next_step}</div>}
                {isEditing && <div style={{ fontSize: 10, color: '#a78bfa', marginTop: 3 }}>編集中...</div>}
              </div>
              <span style={{ fontSize: 18, flexShrink: 0 }}>
                {d?.status === 'done' ? '✅' : d?.status === 'not_done' ? '❌' : isToday ? '✏️' : ''}
              </span>
            </div>
          );
        })}
      </div>

      {currentDay <= 7 && (
        <div style={{
          background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.25)',
          borderRadius: 16, padding: 20, marginBottom: 16, position: 'relative',
        }}>
          <div className="font-pixel" style={{
            position: 'absolute', top: -10, left: 16, fontSize: 7, color: '#a78bfa',
            background: '#0a0a1a', padding: '0 8px',
          }}>
            {editingDay ? `▶ DAY ${editingDay} 編集` : `▶ TODAY — DAY ${currentDay}`}
          </div>

          <label style={{ fontSize: 10, fontWeight: 700, color: '#888', letterSpacing: 1, display: 'block', marginBottom: 6 }}>今日やること</label>
          <input
            value={plan}
            onChange={e => setPlan(e.target.value)}
            placeholder="例：競合5社のLPを分析する"
            style={{
              width: '100%', background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
              padding: '10px 14px', fontFamily: 'M PLUS Rounded 1c, sans-serif',
              fontSize: 14, color: '#e8e8ff', outline: 'none', marginBottom: 14,
            }}
          />

          <label style={{ fontSize: 10, fontWeight: 700, color: '#888', letterSpacing: 1, display: 'block', marginBottom: 6 }}>実行した？</label>
          <div className="flex gap-2 mb-4">
            {(['done', 'not_done'] as const).map(s => (
              <button key={s} onClick={() => setStatus(s)} style={{
                flex: 1, padding: '10px 8px', borderRadius: 10,
                border: `1px solid ${status === s ? s === 'done' ? 'rgba(52,211,153,0.5)' : 'rgba(251,113,133,0.4)' : 'rgba(255,255,255,0.1)'}`,
                background: status === s ? s === 'done' ? 'rgba(52,211,153,0.12)' : 'rgba(251,113,133,0.08)' : 'rgba(0,0,0,0.3)',
                color: status === s ? s === 'done' ? '#34d399' : '#fb7185' : '#666',
                fontFamily: 'M PLUS Rounded 1c, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {s === 'done' ? '✅ やった' : '❌ できなかった'}
              </button>
            ))}
          </div>

          <label style={{ fontSize: 10, fontWeight: 700, color: '#888', letterSpacing: 1, display: 'block', marginBottom: 6 }}>明日の一手（任意）</label>
          <textarea
            value={nextStep}
            onChange={e => setNextStep(e.target.value)}
            placeholder="例：明日は差別化ポイントをまとめる"
            rows={2}
            style={{
              width: '100%', background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
              padding: '10px 14px', fontFamily: 'M PLUS Rounded 1c, sans-serif',
              fontSize: 14, color: '#e8e8ff', outline: 'none', marginBottom: 14, resize: 'none',
            }}
          />

          <button onClick={handleSave} disabled={saving || !plan || !status} className="font-pixel w-full" style={{
            padding: 14, borderRadius: 12, border: 'none',
            background: saving || !plan || !status ? '#333' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
            color: saving || !plan || !status ? '#555' : '#fff',
            fontSize: 10, letterSpacing: 1,
            cursor: saving || !plan || !status ? 'not-allowed' : 'pointer',
            boxShadow: saving || !plan || !status ? 'none' : '0 4px 20px rgba(124,58,237,0.4)',
            transition: 'all 0.15s',
          }}>
            {saving ? 'SAVING...' : editingDay ? 'SAVE EDIT' : `SAVE DAY ${currentDay}`}
          </button>

          {editingDay && (
            <button onClick={() => { setEditingDay(null); setPlan(''); setStatus(null); setNextStep(''); }} style={{
              width: '100%', marginTop: 8, padding: '10px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
              color: '#666', fontSize: 12, cursor: 'pointer',
            }}>キャンセル</button>
          )}
        </div>
      )}

      <div className="text-center mb-4">
        <button onClick={handleClap} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', borderRadius: 100,
          border: `1px solid ${clapped ? 'rgba(251,191,36,0.6)' : 'rgba(251,191,36,0.3)'}`,
          background: clapped ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.05)',
          color: '#fbbf24', fontFamily: 'M PLUS Rounded 1c, sans-serif',
          fontSize: 13, fontWeight: 700, cursor: clapped ? 'default' : 'pointer',
          transition: 'all 0.15s',
        }}>
          👏 今日の達成者に拍手
          <span className="font-pixel" style={{ fontSize: 11 }}>{clapCount}</span>
        </button>
      </div>
    </div>
  );
}
