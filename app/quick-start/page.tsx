'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const ACTIVITY_OPTIONS = [
  { emoji: '📚', label: '読書' },
  { emoji: '💪', label: '筋トレ' },
  { emoji: '💻', label: '作業' },
  { emoji: '✏️', label: '勉強' },
  { emoji: '🧹', label: '片付け' },
  { emoji: '🧘', label: 'ストレッチ' },
  { emoji: '🌿', label: '瞑想' },
];

const EXAMPLE_HINTS: Record<string, string> = {
  '読書': '本を2ページだけ読む',
  '筋トレ': 'スクワット10回だけ',
  '作業': 'メール1通だけ返す',
  '勉強': '問題を1問だけ解く',
  '片付け': '机の上を5分だけ片付ける',
  'ストレッチ': 'ストレッチ1種目だけ',
  '瞑想': '目を閉じて深呼吸3回だけ',
};

const TIMER_EXAMPLES = [
  { icon: '🗂', text: '机の上を5分だけ片付ける' },
  { icon: '🏋️', text: 'スクワット10回だけ' },
  { icon: '📖', text: '本を2ページだけ読む' },
  { icon: '📧', text: 'メール1通だけ返す' },
  { icon: '🧘', text: 'ストレッチ1種目だけ' },
];

const ADJECTIVES = ['静かな', '小さな', '勇敢な', '光る', '眠れる', '謎の'];
const NOUNS = ['魔法使い', '探求者', '冒険者', '守り手', '旅人', '賢者'];
function generateNickname() {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${a}${n}`;
}

type Phase = 'timer' | 'form' | 'done' | 'saving';
const TOTAL_SEC = 5 * 60;

export default function QuickStartPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('timer');
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [nickname, setNickname] = useState('');
  const [placeholderNick] = useState(generateNickname);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [customActivity, setCustomActivity] = useState('');
  const [tomorrow, setTomorrow] = useState('');
  const [error, setError] = useState('');
  const [savedChallengeId, setSavedChallengeId] = useState<string | null>(null);
  const [savedNickname, setSavedNickname] = useState('');
  const [savedActivity, setSavedActivity] = useState('');
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const [tappedExample, setTappedExample] = useState<string | null>(null);

  const startTimer = useCallback(() => {
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= TOTAL_SEC) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          setPhase('form');
          return TOTAL_SEC;
        }
        return e + 1;
      });
    }, 1000);
  }, []);

  const stopEarly = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current!);
    setRunning(false);
    setPhase('form');
  }, []);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current!); };
  }, []);

  function handleTapExample(text: string) {
    setTappedExample(text);
    const matched = ACTIVITY_OPTIONS.find(o => text.includes(o.label));
    if (matched) {
      setSelectedActivity(matched.label);
    } else {
      setSelectedActivity('other');
      setCustomActivity(text);
    }
  }

  const remaining = TOTAL_SEC - elapsed;
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const progress = elapsed / TOTAL_SEC;
  const R = 88;
  const CIRC = 2 * Math.PI * R;
  const dashOffset = CIRC * (1 - progress);

  async function handleSave() {
    setError('');
    const activityLabel =
      selectedActivity === 'other'
        ? customActivity.trim()
        : selectedActivity ?? customActivity.trim();
    if (!activityLabel) {
      setError('何をしたか教えてください');
      return;
    }
    setPhase('saving');
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw authErr ?? new Error('no user');
      const finalNick = nickname.trim() || placeholderNick;
      await supabase
        .from('user_profiles')
        .upsert({ user_id: user.id, nickname: finalNick }, { onConflict: 'user_id' });
      const { data: challenge, error: cErr } = await supabase
        .from('mini_challenges')
        .insert({
          owner_user_id: user.id,
          theme: activityLabel,
          goal: activityLabel,
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (cErr || !challenge) throw cErr ?? new Error('challenge insert failed');
      await supabase.from('mini_challenge_days').insert({
        mini_challenge_id: challenge.id,
        day_number: 1,
        plan: activityLabel,
        status: 'done',
        next_step: tomorrow.trim() || null,
        updated_at: new Date().toISOString(),
      });
      const today = new Date().toISOString().slice(0, 10);
      const { count } = await supabase
        .from('mini_challenge_days')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'done')
        .gte('updated_at', today + 'T00:00:00');
      setTodayCount(count ?? 1);
      localStorage.setItem('onboarding_done', '1');
      setSavedChallengeId(challenge.id);
      setSavedNickname(finalNick);
      setSavedActivity(activityLabel);
      setPhase('done');
    } catch (e) {
      console.error(e);
      setError('保存に失敗しました。もう一度お試しください。');
      setPhase('form');
    }
  }

  // ── タイマー画面 ──────────────────────────────────────────
  if (phase === 'timer') {
    return (
      <div className="min-h-screen bg-[#0e0b1a] flex flex-col items-center justify-center px-4 pb-8">
        <p className="text-amber-300/60 text-xs tracking-widest uppercase mb-3 font-light">
          5 minute quest
        </p>
        <h1 className="text-white text-xl font-semibold mb-6 tracking-wide text-center leading-relaxed">
          5分だけ。<br />
          <span className="text-white/40 text-base font-normal">人は大体5分なら騙せます</span>
        </h1>

        {/* タイマーリング */}
        <div className="relative flex items-center justify-center mb-8">
          <svg width="210" height="210" className="-rotate-90">
            <circle cx="105" cy="105" r={R} fill="none" stroke="#1e1730" strokeWidth="10" />
            <circle
              cx="105" cy="105" r={R}
              fill="none"
              stroke={running ? '#f59e0b' : '#6b5aff'}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.8s linear' }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-white text-5xl font-mono font-bold tracking-tight">
              {mm}:{ss}
            </span>
            <span className="text-white/30 text-xs mt-1 tracking-widest">remaining</span>
          </div>
        </div>

        {/* おすすめ例 */}
        <div className="w-full max-w-xs mb-8">
          <p className="text-white/30 text-xs text-center mb-3 tracking-widest uppercase">
            suggested quests
          </p>
          <div className="flex flex-col gap-2">
            {TIMER_EXAMPLES.map((ex) => {
              const active = tappedExample === ex.text;
              return (
                <button
                  key={ex.text}
                  onClick={() => handleTapExample(ex.text)}
                  className={`w-full text-left px-4 py-3 rounded-2xl border transition-all duration-200 active:scale-[0.98] ${active ? 'bg-violet-800/60 border-violet-400/80 shadow-[0_0_18px_rgba(139,92,246,0.5)]' : 'bg-white/[0.03] border-white/[0.07] hover:bg-violet-900/25 hover:border-violet-500/30'}`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-lg">{ex.icon}</span>
                    <span className={`text-sm font-medium ${active ? 'text-white' : 'text-white/50'}`}>{ex.text}</span>
                    {active && <span className="ml-auto text-violet-300 text-xs">✦</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {!running ? (
          <button
            onClick={startTimer}
            className="w-full max-w-xs py-4 rounded-2xl text-white text-lg font-semibold tracking-wide bg-gradient-to-r from-violet-600 to-amber-500 shadow-[0_4px_24px_rgba(109,40,217,0.5)] hover:opacity-90 active:scale-95 transition-all duration-150"
          >
            ✨ スタート
          </button>
        ) : (
          <div className="flex flex-col items-center gap-4 w-full max-w-xs">
            <p className="text-white/40 text-sm tracking-wide">集中して！ずっとここにいるよ 🕯️</p>
            <button
              onClick={stopEarly}
              className="w-full py-3 rounded-2xl text-white/60 text-base font-medium border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] hover:text-white/80 active:scale-95 transition-all duration-150"
            >
              終わった！記録する →
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── 保存中 ──────────────────────────────────────────
  if (phase === 'saving') {
    return (
      <div className="min-h-screen bg-[#0e0b1a] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
        <p className="text-white/50 text-sm tracking-wide">記録しています…</p>
      </div>
    );
  }

  // ── 完了画面（今日のログ）──────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div className="min-h-screen bg-[#0e0b1a] flex flex-col items-center justify-center px-6">
        <style>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .fade-up { animation: fadeUp 0.5s ease both; }
        `}</style>

        {/* ヘッダー */}
        <div className="fade-up w-full max-w-xs mb-6 text-center" style={{ animationDelay: '0s' }}>
          <p className="text-amber-300/60 text-xs tracking-widest uppercase mb-3">day 1 complete</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-900/40 border border-violet-500/30 mb-4">
            <span className="text-violet-300 text-xs">✦</span>
            <span className="text-white/70 text-sm font-medium">{savedNickname}</span>
            <span className="text-white/30 text-xs">·</span>
            <span className="text-amber-300/80 text-sm">{savedActivity}</span>
          </div>
          <h1 className="text-white text-2xl font-bold tracking-wide">今日のログ</h1>
          <p className="text-white/40 text-sm mt-1">1日目を刻んだ</p>
        </div>

        {/* ステータスカード */}
        <div className="fade-up w-full max-w-xs mb-8" style={{ animationDelay: '0.15s' }}>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-lg">🔥</span>
                <span className="text-white/50 text-sm">連続記録</span>
              </div>
              <span className="text-amber-300 text-lg font-bold">1日</span>
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="text-violet-400 text-lg">✨</span>
                <span className="text-white/50 text-sm">今日の達成者</span>
              </div>
              <span className="text-violet-300 text-lg font-bold">
                {todayCount !== null ? `${todayCount}人` : '…'}
              </span>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-lg">🚀</span>
                <span className="text-white/50 text-sm">チャレンジ</span>
              </div>
              <span className="text-white/70 text-sm font-medium">7日間スタート</span>
            </div>
          </div>
        </div>

        {/* ホームへボタン */}
        <button
          onClick={() => router.push('/')}
          className="fade-up w-full max-w-xs py-4 rounded-2xl text-white text-lg font-semibold tracking-wide bg-gradient-to-r from-violet-600 to-amber-500 shadow-[0_4px_24px_rgba(109,40,217,0.5)] hover:opacity-90 active:scale-95 transition-all duration-150"
          style={{ animationDelay: '0.3s' }}
        >
          ホームへ →
        </button>
      </div>
    );
  }

  // ── フォーム画面 ──────────────────────────────────────────
  const isOther = selectedActivity === 'other';
  const canSave = selectedActivity !== null && (selectedActivity !== 'other' || customActivity.trim().length > 0);
  const hintText = selectedActivity && selectedActivity !== 'other' ? EXAMPLE_HINTS[selectedActivity] : null;

  return (
    <div className="min-h-screen bg-[#0e0b1a] flex flex-col px-5 pt-12 pb-24">
      {/* ヘッダー */}
      <div className="mb-8">
        <p className="text-amber-300/60 text-xs tracking-widest uppercase mb-2">quest complete</p>
        <h1 className="text-white text-2xl font-semibold leading-snug">
          記録しよう ✦
        </h1>
        <p className="text-white/40 text-sm mt-1">2問だけ答えて、チャレンジを始める</p>
      </div>

      {/* ニックネーム */}
      <section className="mb-8">
        <label className="block text-white/60 text-xs tracking-widest uppercase mb-3">
          name
          <span className="text-white/25 text-xs ml-2 normal-case">（空欄で自動生成）</span>
        </label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={placeholderNick}
          maxLength={20}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/20 text-base focus:outline-none focus:border-violet-400/50 focus:bg-violet-900/20 transition-all duration-150"
        />
      </section>

      {/* 活動選択 */}
      <section className="mb-8">
        <label className="block text-white/60 text-xs tracking-widest uppercase mb-3">
          today's quest
        </label>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {ACTIVITY_OPTIONS.map((opt) => {
            const active = selectedActivity === opt.label;
            return (
              <button
                key={opt.label}
                onClick={() => setSelectedActivity(opt.label)}
                className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl border transition-all duration-200 active:scale-95 ${active ? 'bg-violet-800/60 border-violet-400/80 shadow-[0_0_18px_rgba(139,92,246,0.5)]' : 'bg-white/[0.03] border-white/[0.07] hover:bg-violet-900/25 hover:border-violet-500/30'}`}
              >
                <span className="text-xl">{opt.emoji}</span>
                <span className={`text-xs font-medium leading-tight text-center ${active ? 'text-white' : 'text-white/45'}`}>{opt.label}</span>
                {active && <span className="text-violet-300 text-[9px]">✦</span>}
              </button>
            );
          })}
          <button
            onClick={() => setSelectedActivity('other')}
            className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl border transition-all duration-200 active:scale-95 ${isOther ? 'bg-amber-800/40 border-amber-400/70 shadow-[0_0_18px_rgba(245,158,11,0.4)]' : 'bg-white/[0.03] border-white/[0.07] hover:bg-amber-900/20 hover:border-amber-500/30'}`}
          >
            <span className="text-xl">✏️</span>
            <span className={`text-xs font-medium ${isOther ? 'text-white' : 'text-white/45'}`}>その他</span>
            {isOther && <span className="text-amber-300 text-[9px]">✦</span>}
          </button>
        </div>
        {hintText && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-900/20 border border-violet-500/20 mb-3">
            <span className="text-violet-400 text-xs">✦</span>
            <p className="text-violet-300/70 text-xs">例：{hintText}</p>
          </div>
        )}
        {isOther && (
          <input
            type="text"
            value={customActivity}
            onChange={(e) => setCustomActivity(e.target.value)}
            placeholder="例：ギター、散歩、日記…"
            maxLength={30}
            autoFocus
            className="w-full bg-white/[0.04] border border-amber-400/30 rounded-xl px-4 py-3 text-white placeholder-white/20 text-base focus:outline-none focus:border-amber-400/60 focus:bg-amber-900/10 transition-all duration-150"
          />
        )}
      </section>

      {/* 明日 */}
      <section className="mb-8">
        <label className="block text-white/60 text-xs tracking-widest uppercase mb-3">
          tomorrow
          <span className="text-white/25 text-xs ml-2 normal-case">（任意）</span>
        </label>
        <input
          type="text"
          value={tomorrow}
          onChange={(e) => setTomorrow(e.target.value)}
          placeholder="例：また読書を10ページ"
          maxLength={50}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-white/20 text-base focus:outline-none focus:border-violet-400/50 focus:bg-violet-900/20 transition-all duration-150"
        />
      </section>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-900/20 border border-red-500/30 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={!canSave}
        className={`w-full py-4 rounded-2xl text-white text-lg font-semibold tracking-wide transition-all duration-150 active:scale-95 ${canSave ? 'bg-gradient-to-r from-violet-600 to-amber-500 shadow-[0_4px_24px_rgba(109,40,217,0.5)] hover:opacity-90' : 'bg-white/[0.08] text-white/25 cursor-not-allowed'}`}
      >
        記録して、チャレンジ開始 →
      </button>
    </div>
  );
}