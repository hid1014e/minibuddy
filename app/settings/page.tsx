'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ensureAuth, getProfile, deleteMyAccount } from '@/lib/api';

export default function SettingsPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const user = await ensureAuth();
      if (!user) return;
      const profile = await getProfile(user.id);
      setNickname(profile?.nickname ?? '');
      setLoading(false);
    }
    load();
  }, []);

  async function handleDelete() {
    if (deleteInput !== 'DELETE') return;
    setDeleting(true);
    await deleteMyAccount();
    router.replace('/');
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: 28, color: '#f0c040', textShadow: '0 0 20px rgba(240,192,64,0.5)' }}>Hagrit</div>
    </div>
  );

  return (
    <div style={{ paddingTop: 24 }}>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={() => router.back()} style={{ background: 'transparent', border: '1px solid #2d3f5a', borderRadius: 10, padding: '8px 14px', color: '#94a3b8', fontSize: 13, fontFamily: 'Nunito, sans-serif', fontWeight: 700, cursor: 'pointer' }}>
          ← 戻る
        </button>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 22, color: '#f0c040', textShadow: '0 0 15px rgba(240,192,64,0.4)' }}>設定</div>
      </div>

      {/* アカウント情報 */}
      <div style={{ background: '#1e2d4a', borderRadius: 16, padding: '16px 18px', marginBottom: 14, border: '1px solid #2d3f5a', animation: 'fadeUp 0.3s ease' }}>
        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 6, fontFamily: 'Nunito, sans-serif' }}>ニックネーム</div>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 18, color: '#f1f5f9' }}>{nickname}</div>
      </div>

      {/* アカウント削除 */}
      <div style={{ background: '#1e2d4a', borderRadius: 16, padding: '16px 18px', border: '1px solid rgba(248,113,113,0.2)', animation: 'fadeUp 0.4s ease' }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: '#f87171', marginBottom: 8 }}>アカウント削除</div>
        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, marginBottom: 14, lineHeight: 1.7 }}>
          全ての修行記録・コメント・プロフィールが削除されます。この操作は取り消せません。
        </div>

        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(248,113,113,0.4)', background: 'rgba(248,113,113,0.08)', color: '#f87171', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
            🗑️ アカウントを削除する
          </button>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: '#f87171', fontWeight: 800, marginBottom: 10 }}>
              確認のため「DELETE」と入力してください
            </div>
            <input
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder="DELETE"
              style={{ width: '100%', padding: '11px', borderRadius: 10, border: `1.5px solid ${deleteInput === 'DELETE' ? '#f87171' : '#2d3f5a'}`, background: '#0f1729', color: '#f1f5f9', fontSize: 14, fontFamily: 'Nunito, sans-serif', fontWeight: 700, marginBottom: 12, boxSizing: 'border-box' as const, outline: 'none' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }} style={{ padding: '10px', borderRadius: 10, border: '1px solid #2d3f5a', background: 'transparent', color: '#94a3b8', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                キャンセル
              </button>
              <button onClick={handleDelete} disabled={deleteInput !== 'DELETE' || deleting} style={{ padding: '10px', borderRadius: 10, border: 'none', background: deleteInput === 'DELETE' ? '#f87171' : '#2d3f5a', color: deleteInput === 'DELETE' ? '#fff' : '#94a3b8', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 800, cursor: deleteInput === 'DELETE' ? 'pointer' : 'not-allowed' }}>
                {deleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
