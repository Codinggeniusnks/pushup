'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { EXERCISE_MODES, MODES, type ExerciseMode } from '@/lib/modes';
import { MODEL_ID, validateReferenceSet, type ReferenceSet, type ReferenceSample, type PoseLabel } from '@/lib/pose-classifier';
import { MODEL_SHA256 } from '@/lib/reference-config';
import { benchmark, type ReferenceFrame } from '@/lib/benchmark';
/** Deliberate local-file research only. No upload endpoint or automatic workout capture. */
export function ReferenceLab(){
 const video=useRef<HTMLVideoElement>(null),worker=useRef<Worker|null>(null),url=useRef('');
 const [mode,setMode]=useState<ExerciseMode>('standard'),[label,setLabel]=useState<PoseLabel>('start'),[split,setSplit]=useState<ReferenceSample['split']>('train');
 const [person,setPerson]=useState(''),[recording,setRecording]=useState(''),[source,setSource]=useState(''),[license,setLicense]=useState(''),[rights,setRights]=useState(false),[file,setFile]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[marks,setMarks]=useState('');
 const [frames,setFrames]=useState<ReferenceFrame[]>([]),[reference,setReference]=useState<ReferenceSet|null>(null),[report,setReport]=useState('');
 useEffect(()=>()=>{worker.current?.terminate();if(url.current)URL.revokeObjectURL(url.current);},[]);
 const ask=(w:Worker,data:object,transfer:Transferable[]=[])=>new Promise<any>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Model or frame processing timed out')),60000);w.onmessage=e=>{clearTimeout(timer);e.data.type==='error'?reject(new Error(e.data.message)):resolve(e.data);};w.onerror=()=>{clearTimeout(timer);reject(new Error('Worker failed'));};w.postMessage(data,transfer);});
 const extract=async()=>{
  if(!rights||!source.trim()||!license.trim()||!person.trim()||!recording.trim()){setMessage('Confirm usage rights and fill in source, licence, person and recording IDs.');return;}
  const v=video.current!;if(!Number.isFinite(v.duration)||v.duration<=0||v.duration>180){setMessage('Choose a clip no longer than three minutes.');return;}
  setBusy(true);setMessage('Loading the same Full model used in workouts…');setReport('');setFrames([]);
  const w=new Worker(new URL('../workers/pose.worker.ts',import.meta.url),{type:'module'});worker.current=w;
  try{
   await ask(w,{type:'init',base:location.origin});const output:ReferenceFrame[]=[];v.pause();
   for(let t=.05;t<v.duration;t+=.1){
    await new Promise<void>((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Video seek timed out')),10000);v.onseeked=()=>{clearTimeout(timeout);resolve();};v.currentTime=t;});
    const frame=await createImageBitmap(v);const r=await ask(w,{type:'frame',frame,time:Math.round(t*1000)},[frame]);
    output.push({time:r.time,landmarks:r.landmarks,worldLandmarks:r.worldLandmarks,inferenceMs:r.inferenceMs});setMessage(`Extracting locally: ${Math.round(t/v.duration*100)}%`);
   }
   setFrames(output);setMessage(`Extracted ${output.length} frames. Review labels before downloading. No video was uploaded.`);
  }catch(e){setMessage((e as Error).message);}finally{w.terminate();worker.current=null;setBusy(false);}
 };
 const download=(value:unknown,name:string)=>{const object=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=object;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(object),1000);};
 const exportReference=()=>{
  const set:ReferenceSet={version:`${mode}-v1.0.0`,model:MODEL_ID,source,license,rightsConfirmed:rights,samples:frames.filter(f=>f.landmarks.length===1&&f.worldLandmarks.length===1).map(f=>({person,recording,split,mode,label,landmarks:f.landmarks[0],worldLandmarks:f.worldLandmarks[0],aspect:video.current!.videoWidth/video.current!.videoHeight}))};
  try{validateReferenceSet(set);download({...set,modelSha256:MODEL_SHA256},`${mode}-${split}-${recording}.json`);}catch(e){setMessage((e as Error).message);}
 };
 const evaluate=()=>{try{
  if(split!=='evaluation')throw new Error('Choose evaluation split for a held-out recording.');
  const expectedRepTimes=marks.trim()?marks.split(',').map(s=>Number(s.trim())*1000):[];
  if(expectedRepTimes.some(t=>!Number.isFinite(t)||t<0))throw new Error('Enter comma-separated rep completion times in seconds. Leave empty for an invalid sequence.');
  const sequence={person,recording,mode,aspect:video.current!.videoWidth/video.current!.videoHeight,frames,expectedRepTimes,validSequence:expectedRepTimes.length>0};
  const result=benchmark(sequence,reference??undefined);setReport(JSON.stringify(result,null,2));download({model:MODEL_ID,modelSha256:MODEL_SHA256,source,license,rightsConfirmed:rights,sequence,result},`${mode}-${recording}-evaluation.json`);
 }catch(e){setMessage((e as Error).message);}};
 return <main style={{maxWidth:850,margin:'40px auto',padding:24}}><Link href="/validation">← Validation status</Link><h1>Local reference lab</h1><p>Only use recordings you have permission to process. Choose a short clip containing a single labelled pose phase for training. Use a complete, separately recorded sequence for evaluation. Keep every recording of one person in the same split.</p><div className="mode-status">Research tool. Downloads contain body landmarks, not video. Keep them private unless you have permission to share. Synthetic fixtures must never be imported as accuracy evidence.</div><div className="profile-form"><label>Exercise<select value={mode} disabled={busy} onChange={e=>setMode(e.target.value as ExerciseMode)}>{EXERCISE_MODES.map(m=><option key={m} value={m}>{MODES[m].label}</option>)}</select></label><label>Pose label<select value={label} onChange={e=>setLabel(e.target.value as PoseLabel)}>{['start','end','transition','wrong','invalid'].map(v=><option key={v}>{v}</option>)}</select></label><label>Split<select value={split} onChange={e=>setSplit(e.target.value as ReferenceSample['split'])}>{['train','tune','evaluation'].map(v=><option key={v}>{v}</option>)}</select></label>{[['Person ID',person,setPerson],['Recording ID',recording,setRecording],['Source / consent reference',source,setSource],['Licence / usage permission',license,setLicense]] .map(([name,value,set])=><label key={name as string}>{name as string}<input value={value as string} disabled={busy} onChange={e=>(set as (v:string)=>void)(e.target.value)}/></label>)}<label><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/>I have permission to process this recording for this research.</label><label>Local video<input type="file" accept="video/*" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(!f)return;if(url.current)URL.revokeObjectURL(url.current);url.current=URL.createObjectURL(f);video.current!.src=url.current;setFile(true);setFrames([]);setReport('');}}/></label><video ref={video} controls playsInline muted style={{width:'100%',maxHeight:400}}/><button className="button primary" disabled={!file||busy||!rights} onClick={extract}>{busy?'Extracting…':'Extract local landmarks'}</button><p role="status">{message}</p>{frames.length>0&&<><button className="button secondary" onClick={exportReference}>Download labelled reference set</button><label>Optional combined training reference JSON<input type="file" accept="application/json" onChange={async e=>{try{const f=e.target.files?.[0];if(!f)return;const set=JSON.parse(await f.text());validateReferenceSet(set);setReference(set);}catch(e){setReference(null);setMessage((e as Error).message);}}}/></label><label>Known rep completion times, seconds (blank = invalid sequence)<input value={marks} onChange={e=>setMarks(e.target.value)} placeholder="3.2, 5.8, 8.4"/></label><button className="button secondary" onClick={evaluate}>Evaluate and download report</button>{report&&<pre style={{whiteSpace:'pre-wrap'}}>{report}</pre>}</>}</div></main>;
}
