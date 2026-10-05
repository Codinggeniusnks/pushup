import type { NextRequest } from 'next/server';
/** Next's local server URL may use 0.0.0.0; browser origin must match the actual Host. */
export function requestOrigin(request:NextRequest){
 const url=new URL(request.url);
 const host=request.headers.get('host');
 if(host)url.host=host;
 if(process.env.VERCEL)url.protocol='https:';
 return url.origin;
}
export function isSameOrigin(request:NextRequest){
 const origin=request.headers.get('origin');
 if(!origin)return false;
 try{return new URL(origin).origin===requestOrigin(request);}catch{return false;}
}
