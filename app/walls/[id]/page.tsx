import { createClient } from '@supabase/supabase-js';
import WallPageClient from './WallPageClient';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const revalidate = 60;

export default async function WallPage({ params }: { params: Promise<{ id: string }> }) {
  await params; // Next.js 15 requires awaiting params

  // 全完了チャレンジを取得（最新100件）
  // 削除済み本垢を除外
  const EXCLUDED_USER_IDS = ['588333a1-8ba4-4afc-9d65-711d1439dce2'];

  const { data: challenges } = await supabase
    .from('mini_challenges')
    .select('id, theme, goal, status, started_at, owner_user_id')
    .eq('status', 'done')
    .not('owner_user_id', 'in', '(' + EXCLUDED_USER_IDS.join(',') + ')')
    .order('started_at', { ascending: false })
    .limit(100);

  if (!challenges || challenges.length === 0) {
    return <WallPageClient challenges={[]} daysMap={{}} profileMap={{}} />;
  }

  // 全チャレンジのday情報を取得
  const challengeIds = challenges.map((c: any) => c.id);
  const { data: allDays } = await supabase
    .from('mini_challenge_days')
    .select('mini_challenge_id, day_number, plan, status, next_step, image_url, updated_at')
    .in('mini_challenge_id', challengeIds)
    .order('day_number', { ascending: true });

  // daysMapを作成
  const daysMap: Record<string, any[]> = {};
  (allDays ?? []).forEach((d: any) => {
    if (!daysMap[d.mini_challenge_id]) daysMap[d.mini_challenge_id] = [];
    daysMap[d.mini_challenge_id].push(d);
  });

  // ユーザープロフィールを取得
  const ownerIds = [...new Set(challenges.map((c: any) => c.owner_user_id))];
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, nickname, mini_titles')
    .in('user_id', ownerIds);

  const profileMap: Record<string, { user_id: string; nickname: string; mini_titles: string[] | null }> = {};
  (profiles ?? []).forEach((p: any) => {
    profileMap[p.user_id] = p;
  });

  return (
    <WallPageClient
      challenges={challenges}
      daysMap={daysMap}
      profileMap={profileMap}
    />
  );
}
