import { NextRequest, NextResponse } from 'next/server';
import { isConfigured, serverClient } from '@/lib/supabase/server';
import { requestOrigin } from '@/lib/request-origin';
export async function GET(request:NextRequest){
 const code=request.nextUrl.searchParams.get('code'),next=request.nextUrl.searchParams.get('next');
 const destination=next==='/login?mode=reset'?next:'/';
 if(code&&isConfigured()){const client=await serverClient();const {error}=await client.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL(destination,requestOrigin(request)));}
 return NextResponse.redirect(new URL('/login?error=callback',requestOrigin(request)));
}
