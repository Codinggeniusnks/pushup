'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {CoachingCues} from '@/lib/coaching';
import type {CounterResult} from '@/lib/pose';

export function useVoiceCoach(){
  const [available,setAvailable]=useState(false),[enabled,setEnabled]=useState(false),[message,setMessage]=useState('');
  const active=useRef(false),cues=useRef(new CoachingCues());
  const silence=useCallback(()=>{if(typeof window!=='undefined')window.speechSynthesis?.cancel();},[]);
  useEffect(()=>{setAvailable(typeof window.speechSynthesis?.speak==='function'&&typeof window.SpeechSynthesisUtterance==='function');return()=>{active.current=false;silence();};},[silence]);
  const speak=useCallback((text:string,urgent=false)=>{
    if(!active.current||document.hidden)return;
    const synth=window.speechSynthesis;
    if(!urgent&&(synth.speaking||synth.pending))return;
    if(urgent)synth.cancel();
    const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-US';utterance.rate=1.1;utterance.volume=1;
    const voice=synth.getVoices().find(v=>v.localService&&v.lang.startsWith('en'));if(voice)utterance.voice=voice;
    utterance.onerror=e=>{if(e.error==='interrupted'||e.error==='canceled')return;active.current=false;setEnabled(false);setMessage('Voice could not play. Check your phone’s media volume or try another browser.');};
    try{synth.resume();synth.speak(utterance);}catch{active.current=false;setEnabled(false);setMessage('Voice is unavailable in this browser. Use the large on-screen counter.');}
  },[]);
  const toggle=()=>{if(!available)return;active.current=!active.current;setEnabled(active.current);setMessage('');cues.current=new CoachingCues();if(active.current)speak('Voice coaching on. Turn up your media volume.',true);else silence();};
  const update=useCallback((result:CounterResult,time:number)=>{const cue=cues.current.update(result,time);if(cue)speak(cue.text,cue.urgent);},[speak]);
  return {available,enabled,message,toggle,update,speak,silence};
}
