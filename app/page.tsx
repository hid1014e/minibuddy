'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getActiveChallenge, ensureAuth } from '@/lib/api';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function init() {
      await ensureAuth();
      const challenge = await getActiveChallenge();
      if (challenge) {
        router.replace(`/challenge/${challenge.id}`);
      } else {
        router.replace('/challenge/new');
      }
    }
    init();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div
          className="font-pixel text-lg mb-4"
          style={{
            color: '#a78bfa',
            textShadow: '0 0 20px rgba(167,139,250,0.8)',
          }}
        >
          minibuddy
        </div>
        <div style={{ color: '#555', fontSize: 12 }}>Loading...</div>
      </div>
    </div>
  );
}
