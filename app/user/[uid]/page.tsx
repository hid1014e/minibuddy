'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getUserProfile, getUserChallengeHistory, getUserStreakWeeks,
  getTitle, blockUser, unblockUser, isBlocked, ensureAuth,
  getMyProfile, getUserMiniTitles, useIchijiBroom,
} from '@/lib/api';
import { supabase } from '@/lib/supabase';
import ResultDetailModal, { ChallengeResult } from '@/app/components/ResultDetailModal';
import AncientWallButton from '@/app/components/AncientWallButton';

type ChallengeComment = {
  id: string;
  user_id: string;
  nickname: string;
  body: string;
  reply_to: string | null;
  created_at: string;
  day_number: number;
  day_id: string;
};

const THEMES: Record<string, { icon: string; color: string }> = {
  '健康': { icon: '💊', color: '#34d399' },
  'お金': { icon: '🪙', color: '#f0c040' },
  '夢': { icon: '🔮', color: '#a78bfa' },
  'キャリア': { icon: '📜', color: '#7dd3fc' },
  '人間関係': { icon: '🫂', color: '#fda4af' },
  'その他': { icon: '🧪', color: '#94a3b8' },
};

type Challenge = { id: string; theme: string | null; goal: string | null; status: string; started_at: string; done: number; total: number; };

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const uid = params.uid as string;

  const [nickname, setNickname] = useState<string | null>(null);
  const [history, setHistory] = useState<Challenge[]>([]);
  const [streakWeeks, setStreakWeeks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [isSelf, setIsSelf] = useState(false);
  const [openHistoryCommentId, setOpenHistoryCommentId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, ChallengeComment[]>>({});
  const [loadingComments, setLoadingComments] = useState<string | null>(null);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [replyTargets, setReplyTargets] = useState<Record<string, { id: string; nickname: string } | null>>({});
  const [sendingReply, setSendingReply] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myNickname, setMyNickname] = useState<string>('');
  const [myItems, setMyItems] = useState<string[]>([]);
  const [myMiniTitles, setMyMiniTitles] = useState<string[]>([]);
  const [targetMiniTitles, setTargetMiniTitles] = useState<string[]>([]);
  const [broomUsing, setBroomUsing] = useState(false);
  const [broomResult, setBroomResult] = useState<string | null>(null);
  const [resultModal, setResultModal] = useState<ChallengeResult | null>(null);

  useEffect(() => {
    async function load() {
      const [profile, hist, weeks, blockedStatus, me] = await Promise.all([
        getUserProfile(uid),
        getUserChallengeHistory(uid),
        getUserStreakWeeks(uid),
        isBlocked(uid),
        ensureAuth(),
      ]);
      setNickname(profile?.nickname ?? '匿名');
      setHistory(hist);
      setStreakWeeks(weeks);
      setBlocked(blockedStatus);
      setIsSelf(me?.id === uid);
      setMyUserId(me?.id ?? null);
      if (me?.id) {
        const { data: myProf } = await supabase.from('user_profiles').select('nickname').eq('user_id', me.id).maybeSingle();
        setMyNickname(myProf?.nickname ?? '匿名');
      }
      const targetMini = await getUserMiniTitles(uid);
      setTargetMiniTitles(targetMini);
      if (me?.id === uid) {
        const myProf = await getMyProfile();
        setMyItems(myProf?.items ?? []);
        setMyMiniTitles(myProf?.mini_titles ?? []);
      }
      setLoading(false);
    }
    load();
  }, [uid]);

  async function loadChallengeComments(challengeId: string) {
    if (commentsMap[challengeId]) {
      // トグル
      setOpenHistoryCommentId(openHistoryCommentId === challengeId ? null : challengeId);
      return;
    }
    setLoadingComments(challengeId);
    // そのチャレンジの全day_idを取得
    const { data: days } = await supabase
      .from('mini_challenge_days')
      .select('id, day_number')
      .eq('mini_challenge_id', challengeId)
      .order('day_number', { ascending: true });
    if (!days || days.length === 0) {
      setCommentsMap(prev => ({ ...prev, [challengeId]: [] }));
      setOpenHistoryCommentId(challengeId);
      setLoadingComments(null);
      return;
    }
    const dayIds = days.map((d: any) => d.id);
    const dayNumberMap: Record<string, number> = {};
    days.forEach((d: any) => { dayNumberMap[d.id] = d.day_number; });

    const { data: comments } = await supabase
      .from('post_comments')
      .select('id, user_id, nickname, body, reply_to, created_at, day_id')
      .in('day_id', dayIds)
      .order('created_at', { ascending: true });

    const enriched: ChallengeComment[] = (comments ?? []).map((c: any) => ({
      ...c,
      day_number: dayNumberMap[c.day_id] ?? 0,
    }));
    setCommentsMap(prev => ({ ...prev, [challengeId]: enriched }));
    setOpenHistoryCommentId(challengeId);
    setLoadingComments(null);
  }

  async function sendHistoryReply(challengeId: string, dayId: string) {
    const body = (replyInputs[dayId] ?? '').trim();
    if (!body || !myUserId) return;
    setSendingReply(dayId);
    const replyTo = replyTargets[dayId]?.id ?? null;
    await supabase.from('post_comments').insert({
      day_id: dayId,
      user_id: myUserId,
      nickname: myNickname,
      body,
      reply_to: replyTo,
    });
    // コメント再取得
    const { data: days } = await supabase
      .from('mini_challenge_days')
      .select('id, day_number')
      .eq('mini_challenge_id', challengeId)
      .order('day_number', { ascending: true });
    const dayIds = (days ?? []).map((d: any) => d.id);
    const dayNumberMap: Record<string, number> = {};
    (days ?? []).forEach((d: any) => { dayNumberMap[d.id] = d.day_number; });
    const { data: comments } = await supabase
      .from('post_comments')
      .select('id, user_id, nickname, body, reply_to, created_at, day_id')
      .in('day_id', dayIds)
      .order('created_at', { ascending: true });
    const enriched: ChallengeComment[] = (comments ?? []).map((c: any) => ({
      ...c,
      day_number: dayNumberMap[c.day_id] ?? 0,
    }));
    setCommentsMap(prev => ({ ...prev, [challengeId]: enriched }));
    setReplyInputs(prev => ({ ...prev, [dayId]: '' }));
    setReplyTargets(prev => ({ ...prev, [dayId]: null }));
    setSendingReply(null);
  }

  async function handleUseBroom() {
    setBroomUsing(true);
    const result = await useIchijiBroom();
    if (result === 'ok') {
      setMyItems(prev => prev.filter(i => i !== 'ichiji_broom'));
      setMyMiniTitles(prev => [...prev, 'comeback_hero']);
      setTargetMiniTitles(prev => [...prev, 'comeback_hero']);
      setBroomResult('カムバック・ヒーローの称号を獲得しました！ 🦸');
    } else if (result === 'already_used') {
      setBroomResult('すでにカムバック・ヒーローです！');
    } else {
      setBroomResult('アイテムがありません');
    }
    setBroomUsing(false);
  }

  async function openResultModal(c: Challenge) {
    const { data: days } = await supabase
      .from('mini_challenge_days')
      .select('day_number, plan, status, image_url')
      .eq('mini_challenge_id', c.id)
      .order('day_number', { ascending: true });
    setResultModal({
      id: c.id,
      theme: c.theme ?? 'その他',
      goal: c.goal,
      started_at: c.started_at,
      days: days ?? [],
    });
  }

  async function handleBlock() {
    setBlockLoading(true);
    if (blocked) {
      await unblockUser(uid);
      setBlocked(false);
    } else {
      await blockUser(uid);
      setBlocked(true);
    }
    setShowBlockConfirm(false);
    setBlockLoading(false);
  }

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
        <div style={{ display: 'inline-block', background: 'rgba(240,192,64,0.08)', border: '1px solid rgba(240,192,64,0.35)', borderRadius: 100, padding: '6px 18px', fontFamily: 'Cinzel, serif', fontSize: 13, color: '#f0c040', animation: 'shimmer 2.5s ease-in-out infinite', marginBottom: targetMiniTitles.includes('comeback_hero') ? 8 : 16 }}>
          {titleData.emoji} {titleData.title}
        </div>
        {targetMiniTitles.includes('comeback_hero') && (
          <div style={{ marginBottom: 16 }}>
            <span style={{ display: 'inline-block', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.35)', borderRadius: 100, padding: '4px 12px', fontFamily: 'Cinzel, serif', fontSize: 11, color: '#a78bfa', letterSpacing: '0.04em' }}>
              🦸 カムバック・ヒーロー
            </span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: isSelf ? 0 : 16 }}>
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

        {/* アイテムセクション（自分のみ） */}
        {isSelf && (myItems.length > 0 || myMiniTitles.includes('comeback_hero')) && (
          <div style={{ marginTop: 16, borderTop: '1px solid #2d3f5a', paddingTop: 14 }}>
            <div style={{ fontSize: 10, color: '#5a4480', letterSpacing: '0.1em', marginBottom: 10, textTransform: 'uppercase' }}>
              ✦ 所持アイテム
            </div>
            {myItems.includes('ichiji_broom') && (
              <div style={{ background: 'rgba(240,192,64,0.06)', border: '1px solid rgba(240,192,64,0.25)', borderRadius: 14, padding: '14px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: '28px' }}>🧹</span>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: '#f0c040' }}>イチジホウキ</div>
                    <div style={{ fontSize: 11, color: '#7a6090', marginTop: 2 }}>早期登録・初回特典アイテム</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#c4a8f0', fontFamily: 'Nunito, sans-serif', lineHeight: 1.6, marginBottom: 10 }}>
                  使うと「カムバック・ヒーロー」のミニ称号が付与されます。
                </div>
                {broomResult ? (
                  <div style={{ fontSize: 13, color: '#a78bfa', fontWeight: 700, fontFamily: 'Nunito, sans-serif', padding: '8px', background: 'rgba(167,139,250,0.1)', borderRadius: 10, textAlign: 'center' }}>
                    {broomResult}
                  </div>
                ) : (
                  <button
                    onClick={handleUseBroom}
                    disabled={broomUsing}
                    style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #f0c040, #c49a20)', color: '#0f1729', fontFamily: 'Cinzel, serif', fontSize: 13, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.04em' }}
                  >
                    {broomUsing ? '使用中...' : '🧹 ホウキを使う'}
                  </button>
                )}
              </div>
            )}
            {myMiniTitles.includes('comeback_hero') && (
              <div style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '24px' }}>🦸</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#a78bfa' }}>カムバック・ヒーロー</div>
                  <div style={{ fontSize: 11, color: '#7a6090', marginTop: 2 }}>ミニ称号 · 適度な休息の証</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ブロックボタン（自分以外） */}
        {!isSelf && (
          <div style={{ marginTop: 16 }}>
            {showBlockConfirm ? (
              <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 12, padding: '14px' }}>
                <div style={{ fontSize: 13, color: '#f87171', fontWeight: 700, marginBottom: 12 }}>
                  {blocked ? `${nickname}のブロックを解除しますか？` : `${nickname}をブロックしますか？`}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button onClick={() => setShowBlockConfirm(false)} style={{ padding: '9px', borderRadius: 10, border: '1px solid #2d3f5a', background: 'transparent', color: '#94a3b8', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>キャンセル</button>
                  <button onClick={handleBlock} disabled={blockLoading} style={{ padding: '9px', borderRadius: 10, border: 'none', background: blocked ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)', color: blocked ? '#34d399' : '#f87171', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                    {blockLoading ? '処理中...' : blocked ? '解除する' : 'ブロック'}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowBlockConfirm(true)} style={{ padding: '8px 20px', borderRadius: 100, border: `1px solid ${blocked ? 'rgba(52,211,153,0.4)' : 'rgba(248,113,113,0.3)'}`, background: blocked ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.06)', color: blocked ? '#34d399' : '#f87171', fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                {blocked ? '✦ ブロック済み（解除する）' : '🚫 ブロックする'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 修行履歴 */}
      <div style={{ animation: 'fadeUp 0.4s ease' }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, color: '#94a3b8', marginBottom: 10, letterSpacing: '0.05em' }}>修行履歴 📜</div>
        {history.length > 0 && (
          <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'center' }}>
            <AncientWallButton challengeId={history[0].id} />
          </div>
        )}
        {history.length === 0 ? (
          <div style={{ background: '#1e2d4a', borderRadius: 14, padding: '20px', textAlign: 'center', border: '1px solid #2d3f5a', color: '#94a3b8', fontSize: 13, fontWeight: 700 }}>
            まだ修行記録がありません
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {history.map((c, i) => {
              const themeData = c.theme ? THEMES[c.theme] : null;
              const isCompleted = c.status === 'completed';
              const isActive = c.status === 'active';
              const date = new Date(c.started_at);
              const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
              return (
                <div key={c.id} onClick={() => openResultModal(c)} style={{ background: '#1e2d4a', borderRadius: 14, padding: '14px', border: `1px solid ${isCompleted ? 'rgba(240,192,64,0.2)' : isActive ? 'rgba(52,211,153,0.2)' : '#2d3f5a'}`, opacity: i > 5 ? 0.7 : 1, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    {themeData && <span style={{ color: themeData.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, border: `1px solid ${themeData.color}`, background: `${themeData.color}18`, flexShrink: 0 }}>{themeData.icon} {c.theme}</span>}
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginLeft: 'auto', flexShrink: 0 }}>{dateStr}〜</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: isCompleted ? '#f0c040' : isActive ? '#34d399' : '#94a3b8', background: isCompleted ? 'rgba(240,192,64,0.1)' : isActive ? 'rgba(52,211,153,0.1)' : '#0f1729', padding: '2px 8px', borderRadius: 100, flexShrink: 0 }}>
                      {isCompleted ? '✦ 完了' : isActive ? '修行中' : '未完了'}
                    </span>
                  </div>
                  {c.goal && <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', fontFamily: 'Nunito, sans-serif', marginBottom: 10, lineHeight: 1.4 }}>{c.goal}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 6, background: '#0f1729', borderRadius: 100, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(c.done / 7) * 100}%`, background: c.done === 7 ? 'linear-gradient(90deg,#f0c040,#34d399)' : 'linear-gradient(90deg,#a78bfa,#7dd3fc)', borderRadius: 100, transition: 'width 0.5s ease' }} />
                    </div>
                    <div style={{ fontFamily: 'Cinzel, serif', fontSize: 12, color: c.done === 7 ? '#f0c040' : '#a78bfa', flexShrink: 0 }}>{c.done}<span style={{ fontSize: 10, color: '#94a3b8' }}>/7</span></div>
                  </div>
                  {/* コメント履歴 */}
                  <button
                    onClick={() => loadChallengeComments(c.id)}
                    style={{ marginTop: 10, width: '100%', padding: '7px', borderRadius: 10, border: '1px solid #2d3f5a', background: openHistoryCommentId === c.id ? 'rgba(125,211,252,0.08)' : 'transparent', color: openHistoryCommentId === c.id ? '#7dd3fc' : '#94a3b8', fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                  >
                    {loadingComments === c.id ? '読み込み中...' : openHistoryCommentId === c.id ? '▲ コメントを閉じる' : '💬 コメントを見る'}
                  </button>
                  {openHistoryCommentId === c.id && commentsMap[c.id] !== undefined && (
                    <div style={{ marginTop: 10, borderTop: '1px solid #2d3f5a', paddingTop: 10 }}>
                      {commentsMap[c.id].length === 0 ? (
                        <p style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'Nunito, sans-serif', margin: 0 }}>コメントはありません</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {commentsMap[c.id].map(cm => (
                            <div key={cm.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 10, color: '#4a5568', fontFamily: 'Nunito, sans-serif', fontWeight: 700 }}>Day {cm.day_number}</span>
                                <span style={{ fontSize: 12, fontWeight: 800, color: '#a78bfa', fontFamily: 'Nunito, sans-serif' }}>{cm.nickname}</span>
                                {myUserId && (
                                  <button
                                    onClick={() => setReplyTargets(prev => ({ ...prev, [cm.day_id]: prev[cm.day_id]?.id === cm.id ? null : { id: cm.id, nickname: cm.nickname } }))}
                                    style={{ fontSize: 10, color: replyTargets[cm.day_id]?.id === cm.id ? '#7dd3fc' : '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, marginLeft: 'auto' }}
                                  >{replyTargets[cm.day_id]?.id === cm.id ? '✕' : '返信'}</button>
                                )}
                              </div>
                              {cm.reply_to && (
                                <span style={{ fontSize: 11, color: '#7dd3fc', fontFamily: 'Nunito, sans-serif', marginLeft: 8 }}>
                                  @{commentsMap[c.id].find(x => x.id === cm.reply_to)?.nickname ?? ''}
                                </span>
                              )}
                              <span style={{ fontSize: 13, color: '#f1f5f9', fontFamily: 'Nunito, sans-serif', lineHeight: 1.4 }}>{cm.body}</span>
                              {myUserId && replyTargets[cm.day_id]?.id === cm.id && (
                                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                  <input
                                    value={replyInputs[cm.day_id] ?? ''}
                                    onChange={e => setReplyInputs(prev => ({ ...prev, [cm.day_id]: e.target.value }))}
                                    onKeyDown={e => e.key === 'Enter' && sendHistoryReply(c.id, cm.day_id)}
                                    placeholder={`${cm.nickname}へ返信...`}
                                    maxLength={50}
                                    style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid #2d3f5a', background: '#0f1729', color: '#f1f5f9', fontSize: 12, fontFamily: 'Nunito, sans-serif', outline: 'none' }}
                                  />
                                  <button
                                    onClick={() => sendHistoryReply(c.id, cm.day_id)}
                                    disabled={!(replyInputs[cm.day_id] ?? '').trim() || sendingReply === cm.day_id}
                                    style={{ padding: '7px 12px', borderRadius: 8, border: 'none', background: (replyInputs[cm.day_id] ?? '').trim() ? 'linear-gradient(135deg,#f0c040,#c49a20)' : '#2d3f5a', color: (replyInputs[cm.day_id] ?? '').trim() ? '#0f1729' : '#94a3b8', fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                                  >{sendingReply === cm.day_id ? '...' : '送信'}</button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {myUserId && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                          <input
                            value={replyInputs[`new_${c.id}`] ?? ''}
                            onChange={e => setReplyInputs(prev => ({ ...prev, [`new_${c.id}`]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') { const dayId = commentsMap[c.id][commentsMap[c.id].length - 1]?.day_id; if (dayId) sendHistoryReply(c.id, dayId); } }}
                            placeholder="新しいコメント..."
                            maxLength={50}
                            style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid #2d3f5a', background: '#0f1729', color: '#f1f5f9', fontSize: 12, fontFamily: 'Nunito, sans-serif', outline: 'none' }}
                          />
                          <button
                            onClick={() => { const dayId = commentsMap[c.id][commentsMap[c.id].length - 1]?.day_id; if (dayId) { setReplyInputs(prev => ({ ...prev, [dayId]: prev[`new_${c.id}`] ?? '' })); sendHistoryReply(c.id, dayId); setReplyInputs(prev => ({ ...prev, [`new_${c.id}`]: '' })); } }}
                            disabled={!(replyInputs[`new_${c.id}`] ?? '').trim()}
                            style={{ padding: '7px 12px', borderRadius: 8, border: 'none', background: (replyInputs[`new_${c.id}`] ?? '').trim() ? 'linear-gradient(135deg,#f0c040,#c49a20)' : '#2d3f5a', color: (replyInputs[`new_${c.id}`] ?? '').trim() ? '#0f1729' : '#94a3b8', fontFamily: 'Nunito, sans-serif', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                          >送信</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {resultModal && (
        <ResultDetailModal
          challenge={resultModal}
          onClose={() => setResultModal(null)}
        />
      )}
    </div>
  );
}
