import { supabase } from './supabase';
import { MiniChallenge, MiniChallengeDay, UserProfile, OthersDayPost } from './types';

// ─── 認証 ────────────────────────────────────────────
export async function ensureAuth() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;

  // セッションなし → 新規匿名ログイン
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) return null;
  return data.user;
}

// ─── プロフィール ─────────────────────────────────────
export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data } = await supabase
    .from('user_profiles')
    .select()
    .eq('user_id', userId)
    .maybeSingle();
  return data ?? null;
}

export async function createProfile(userId: string, nickname: string): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .upsert({ user_id: userId, nickname }, { onConflict: 'user_id' });
  if (error) throw error;
}

// ─── チャレンジ ───────────────────────────────────────
export async function startChallenge(theme?: string, goal?: string): Promise<MiniChallenge> {
  const user = await ensureAuth();
  if (!user) throw new Error('auth failed');
  const { data, error } = await supabase
    .from('mini_challenges')
    .insert({ theme: theme ?? null, goal: goal ?? null, owner_user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getActiveChallenge(): Promise<MiniChallenge | null> {
  const user = await ensureAuth();
  if (!user) return null;
  const { data } = await supabase
    .from('mini_challenges')
    .select()
    .eq('owner_user_id', user.id)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

// チャレンジ開始日から今日が何日目か計算（1〜7）
export function calcTodayDayNumber(startedAt: string): number {
  const start = new Date(startedAt);
  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffMs = todayDate.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.min(Math.max(diffDays + 1, 1), 7);
}

// ─── 日次ログ ─────────────────────────────────────────
export async function getDays(challengeId: string): Promise<MiniChallengeDay[]> {
  const { data } = await supabase
    .from('mini_challenge_days')
    .select()
    .eq('mini_challenge_id', challengeId)
    .order('day_number');
  return data ?? [];
}

export async function saveDay(
  challengeId: string,
  dayNumber: number,
  plan: string,
  status: 'done' | 'not_done',
  nextStep?: string
) {
  const { error } = await supabase
    .from('mini_challenge_days')
    .upsert(
      {
        mini_challenge_id: challengeId,
        day_number: dayNumber,
        plan,
        status,
        next_step: nextStep ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'mini_challenge_id,day_number' }
    );
  if (error) throw error;
}

export async function completeChallenge(challengeId: string) {
  await supabase
    .from('mini_challenges')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', challengeId);
}

export async function resetAndStartNew(): Promise<void> {
  const user = await ensureAuth();
  if (!user) return;
  // 既存チャレンジを全部completedに（念のため）
  await supabase
    .from('mini_challenges')
    .update({ status: 'completed' })
    .eq('owner_user_id', user.id)
    .eq('status', 'active');
}

// ─── 集計 ─────────────────────────────────────────────
export async function getTodayDoneCount(): Promise<number> {
  const { data } = await supabase.rpc('get_today_done_count');
  return data ?? 0;
}

export async function getTodayClapCount(): Promise<number> {
  const { data } = await supabase.rpc('get_today_clap_count');
  return data ?? 0;
}

// ─── 拍手 ─────────────────────────────────────────────
export async function hasClappedToday(userId: string): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('daily_user_reactions')
    .select('id')
    .eq('user_id', userId)
    .eq('date', today)
    .eq('reaction_type', 'clap')
    .maybeSingle();
  return !!data;
}

export async function sendClap(userId: string): Promise<'ok' | 'already_clapped'> {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from('daily_user_reactions')
    .insert({ user_id: userId, date: today, reaction_type: 'clap' });
  if (error?.code === '23505') return 'already_clapped';
  if (error) return 'already_clapped';
  return 'ok';
}

// ─── 他人の投稿（同じDay番号、最大3件）────────────────
export async function getOthersPosts(
  dayNumber: number,
  myUserId: string
): Promise<OthersDayPost[]> {
  if (dayNumber < 1 || dayNumber > 7) return [];

  // 同じday_numberの全投稿を取得
  const { data: allDays, error } = await supabase
    .from('mini_challenge_days')
    .select(`
      id,
      plan,
      status,
      day_number,
      mini_challenges!inner ( owner_user_id, theme )
    `)
    .eq('day_number', dayNumber)
    .limit(50);

  if (error) {
    console.error('getOthersPosts error:', error);
    return [];
  }
  if (!allDays || allDays.length === 0) return [];

  // 自分以外
  const others = (allDays as any[]).filter(
    d => d.mini_challenges.owner_user_id !== myUserId
  );
  if (others.length === 0) return [];

  // ランダム3件
  const shuffled = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
  const dayIds = shuffled.map(d => d.id);
  const ownerIds = shuffled.map(d => d.mini_challenges.owner_user_id);

  // チェック数
  const { data: checks } = await supabase
    .from('day_checks')
    .select('target_day_id, checker_id')
    .in('target_day_id', dayIds);

  // ニックネーム
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, nickname')
    .in('user_id', ownerIds);

  return shuffled.map(d => {
    const dayChecks = (checks ?? []).filter((c: any) => c.target_day_id === d.id);
    const profile = (profiles ?? []).find((p: any) => p.user_id === d.mini_challenges.owner_user_id);
    return {
      id: d.id,
      owner_user_id: d.mini_challenges.owner_user_id,
      plan: d.plan.slice(0, 20),
      status: d.status,
      day_number: d.day_number,
      nickname: profile?.nickname ?? '匿名',
      theme: d.mini_challenges.theme ?? null,
      check_count: dayChecks.length,
      already_checked: dayChecks.some((c: any) => c.checker_id === myUserId),
    };
  });
}

// ─── チェック ─────────────────────────────────────────
export async function checkPost(
  checkerId: string,
  targetDayId: string
): Promise<'ok' | 'already_checked'> {
  const { error } = await supabase
    .from('day_checks')
    .insert({ checker_id: checkerId, target_day_id: targetDayId });
  if (error?.code === '23505') return 'already_checked';
  return 'ok';
}

// 今日自分の投稿を応援してくれた人数
export async function getMyCheerCount(
  challengeId: string,
  dayNumber: number
): Promise<number> {
  // 自分のその日の投稿IDを取得
  const { data: dayData } = await supabase
    .from('mini_challenge_days')
    .select('id')
    .eq('mini_challenge_id', challengeId)
    .eq('day_number', dayNumber)
    .maybeSingle();
  if (!dayData) return 0;

  // そのIDに対するチェック数
  const { count } = await supabase
    .from('day_checks')
    .select('*', { count: 'exact', head: true })
    .eq('target_day_id', dayData.id);
  return count ?? 0;
}

// ─── 連続週数・称号 ────────────────────────────────────
export async function getStreakWeeks(): Promise<number> {
  const user = await ensureAuth();
  if (!user) return 0;
  const { data } = await supabase.rpc('get_streak_weeks', { p_user_id: user.id });
  return data ?? 0;
}

export function getTitle(weeks: number): { title: string; emoji: string } {
  if (weeks >= 8) return { title: '習慣化マジシャン', emoji: '🪄' };
  if (weeks >= 6) return { title: 'OBLの使い手', emoji: '📖' };
  if (weeks >= 4) return { title: '中級魔法使い', emoji: '🧙' };
  if (weeks >= 3) return { title: '呪文の使い手', emoji: '⚗️' };
  if (weeks >= 2) return { title: '魔法使いの卵', emoji: '🔮' };
  if (weeks >= 1) return { title: '見習い魔法使い', emoji: '🌱' };
  return { title: '新入生', emoji: '✨' };
}

// ─── コメント ─────────────────────────────────────────
export async function getComments(dayId: string) {
  const { data } = await supabase
    .from('post_comments')
    .select('id, nickname, body, created_at')
    .eq('day_id', dayId)
    .order('created_at', { ascending: true });
  return data ?? [];
}

export async function addComment(dayId: string, body: string): Promise<void> {
  const user = await ensureAuth();
  if (!user) return;
  const profile = await getProfile(user.id);
  const nickname = profile?.nickname ?? '匿名';
  await supabase.from('post_comments').insert({ day_id: dayId, user_id: user.id, nickname, body });
}

// ─── 自分の今日の投稿へのコメントを取得 ──────────────────
export async function getCommentsOnMyPost(
  challengeId: string,
  dayNumber: number
): Promise<{id:string;nickname:string;body:string;created_at:string;reply_to:string|null}[]> {
  const { data: dayData } = await supabase
    .from('mini_challenge_days')
    .select('id')
    .eq('mini_challenge_id', challengeId)
    .eq('day_number', dayNumber)
    .maybeSingle();
  if (!dayData) return [];

  const { data } = await supabase
    .from('post_comments')
    .select('id, nickname, body, created_at, reply_to')
    .eq('day_id', dayData.id)
    .order('created_at', { ascending: true });
  return data ?? [];
}

// コメントに返信
export async function addReply(dayId: string, body: string, replyTo: string): Promise<void> {
  const user = await ensureAuth();
  if (!user) return;
  const profile = await getProfile(user.id);
  const nickname = profile?.nickname ?? '匿名';
  await supabase.from('post_comments').insert({ day_id: dayId, user_id: user.id, nickname, body, reply_to: replyTo });
}

// ─── ユーザープロフィール ──────────────────────────────
export async function getUserProfile(userId: string) {
  const { data } = await supabase
    .from('user_profiles')
    .select('nickname')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

export async function getUserChallengeHistory(userId: string) {
  const { data } = await supabase
    .from('mini_challenges')
    .select(`
      id, theme, goal, status, started_at, completed_at,
      mini_challenge_days ( status )
    `)
    .eq('owner_user_id', userId)
    .order('started_at', { ascending: false })
    .limit(20);
  return (data ?? []).map((c: any) => {
    const days = c.mini_challenge_days ?? [];
    const done = days.filter((d: any) => d.status === 'done').length;
    const total = days.length;
    return {
      id: c.id,
      theme: c.theme,
      goal: c.goal,
      status: c.status,
      started_at: c.started_at,
      done,
      total,
    };
  });
}

export async function getUserStreakWeeks(userId: string): Promise<number> {
  const { data } = await supabase.rpc('get_streak_weeks', { p_user_id: userId });
  return data ?? 0;
}
