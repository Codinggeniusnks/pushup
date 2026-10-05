import { NextRequest, NextResponse } from 'next/server';
import { isConfigured, serverClient } from '@/lib/supabase/server';
import { requestOrigin } from '@/lib/request-origin';
export async function GET(request:NextRequest){
 const token_hash=request.nextUrl.searchParams.get('token_hash'),type=request.nextUrl.searchParams.get('type');
 if(token_hash&&(type==='signup'||type==='recovery'||type==='email')&&isConfigured()){
  const client=await serverClient();const {error}=await client.auth.verifyOtp({token_hash,type});
  if(!error)return NextResponse.redirect(new URL(type==='recovery'?'/login?mode=reset':'/',requestOrigin(request)));
 }
 return NextResponse.redirect(new URL('/login?error=confirmation',requestOrigin(request)));
}
