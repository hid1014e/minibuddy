import { supabase } from './supabase';
import { MiniChallenge, MiniChallengeDay } from './types';

export async function ensureAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) await supabase.auth.signInAnonymously();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function startChallenge(theme?: string): Promise<MiniChallenge> {
  const user = await ensureAuth();
  if (!user) throw new Error('auth failed');
  const { data, error } = await supabase
    .from('mini_challenges')
    .insert({ theme: theme ?? null, owner_user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getActiveChallenge(): Promise<MiniChallenge | null> {
  await ensureAuth();
  const { data } = await supabase
    .from('mini_challenge_days')
    .select()
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

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

export async function getTodayDoneCount(): Promise<number> {
  const { data } = await supabase.rpc('get_today_done_count');
  return data ?? 0;
}

export async function getTodayClapCount(): Promise<number> {
  const { data } = await supabase.rpc('get_today_clap_count');
  return data ?? 0;
}

export async function sendClap(userId: string): Promise<'ok' | 'already_clapped'> {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from('daily_user_reactions')
    .insert({ user_id: userId, date: today, reaction_type: 'clap' });
  if (error?.code === '23505') return 'already_clapped';
  return 'ok';
}
