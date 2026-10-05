import { redirect } from 'next/navigation';
import { isConfigured, serverClient } from '@/lib/supabase/server';
import { demoSnapshot } from '@/lib/demo';
import { Shell } from './shell';
import type { Snapshot } from '@/lib/types';
export async function AppRoot({view}:{view:string}) {
 if (!isConfigured()) return <Shell view={view} initial={demoSnapshot()} demo />;
 const supabase=await serverClient();
 const {data:{user}}=await supabase.auth.getUser();
 if (!user) redirect('/login');
 const {data,error}=await supabase.rpc('app_snapshot');
 if (error || !data) return <main className="setup-error"><h1>One more setup step.</h1><p>Your account is connected, but the workout database isn’t ready. Apply the included Supabase migration and reload.</p><a className="button primary" href="/">Try again</a></main>;
 return <Shell view={view} initial={data as Snapshot} demo={false} />;
}
