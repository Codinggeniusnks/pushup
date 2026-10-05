import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { isConfigured, serverClient } from '@/lib/supabase/server';
import { isSameOrigin } from '@/lib/request-origin';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 if(!isSameOrigin(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 if(!isConfigured())return NextResponse.json({error:'Connect Supabase first.'},{status:503});
 try{
  const supabase=await serverClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
  if(Number(request.headers.get('content-length')||0)>3*1024*1024)return NextResponse.json({error:'Photo is too large.'},{status:413});
  const form=await request.formData(),file=form.get('avatar');
  if(!(file instanceof File)||file.size>2*1024*1024||!['image/webp','image/png','image/jpeg'].includes(file.type))return NextResponse.json({error:'Choose a JPG, PNG or WebP image under 2 MB after cropping.'},{status:400});
  const buffer=await sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:25000000}).rotate().resize(512,512,{fit:'cover'}).webp({quality:85}).toBuffer();
  const path=`${user.id}/avatar.webp`;
  const {error}=await supabase.storage.from('avatars').upload(path,buffer,{contentType:'image/webp',upsert:true,cacheControl:'0'});if(error)throw error;
  const {data:profile}=await supabase.from('profiles').select('nickname').eq('id',user.id).single();
  const result=await supabase.rpc('update_profile',{p_nickname:profile?.nickname??'Athlete',p_avatar:path});if(result.error)throw result.error;
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:'Unable to save this photo. Check that avatar storage is configured.'},{status:400});}
}
