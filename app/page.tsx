'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getActiveChallenge, getProfile } from '@/lib/api';
import { supabase } from '@/lib/supabase';
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('1. user:', user?.id ?? 'null');
      if (!user) {
        const { data, error } = await supabase.auth.signInAnonymously();
        console.log('2. new anon:', data.user?.id, error?.message);
        if (!data.user) return;
        router.replace(`/nickname?uid=${data.user.id}&next=${encodeURIComponent('/challenge/new')}`);
        return;
      }
      const profile = await getProfile(user.id);
      console.log('3. profile:', profile?.nickname ?? 'null');
      if (!profile) {
        const challenge = await getActiveChallenge();
        console.log('4. challenge(no profile):', challenge?.id ?? 'null');
        const next = challenge ? `/challenge/${challenge.id}` : '/challenge/new';
        router.replace(`/nickname?uid=${user.id}&next=${encodeURIComponent(next)}`);
        return;
      }
      const challenge = await getActiveChallenge();
      console.log('5. challenge:', challenge?.id ?? 'null');
      router.replace(challenge ? `/challenge/${challenge.id}` : '/challenge/new');
    }
    init();
  }, [router]);
  return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}><div style={{textAlign:'center'}}><div style={{fontFamily:'Fredoka One, cursive',fontSize:32,color:'#58cc02'}}>mini<span style={{color:'#1cb0f6'}}>buddy</span></div><div style={{color:'#afafaf',fontSize:14,fontWeight:700}}>Loading...</div></div></div>;
}
