'use client';
import Link from 'next/link';
import { modeOf, type ExerciseMode } from '@/lib/modes';
import { ModePicker } from './mode-picker';
import { useEffect, useMemo, useState, createContext, useContext, useCallback } from 'react';
import { LayoutDashboard, CalendarDays, Trophy, Users, UserRound, ArrowUpRight, ChevronRight, Flame, Menu, X, LogOut, ShieldCheck, Play, Settings2 } from 'lucide-react';
import type { Snapshot } from '@/lib/types';
import { api } from '@/lib/api';
import { browserClient } from '@/lib/supabase/client';
import { Brand, Avatar } from './ui';
import { Dashboard, Activity, Competition, Groups, Profile } from './views';
import { WorkoutView } from './workout';
type Context = {data:Snapshot;allData:Snapshot;mode:ExerciseMode;setMode:(m:ExerciseMode)=>void;demo:boolean;refresh:()=>Promise<void>;notice:(s:string)=>void;setData:React.Dispatch<React.SetStateAction<Snapshot>>};
const AppContext=createContext<Context>(null!);
export const useApp=()=>useContext(AppContext);
const navigation=[{id:'dashboard',label:'Overview',icon:LayoutDashboard,href:'/'},{id:'activity',label:'My activity',icon:CalendarDays,href:'/activity'},{id:'competition',label:'Leaderboard',icon:Trophy,href:'/competition'},{id:'groups',label:'My groups',icon:Users,href:'/groups'},{id:'profile',label:'My profile',icon:UserRound,href:'/profile'}];
export function Shell({view,initial,demo}:{view:string;initial:Snapshot;demo:boolean}) {
 const [data,setData]=useState(initial),[message,setMessage]=useState(''),[menu,setMenu]=useState(false);
 const [mode,chooseMode]=useState<ExerciseMode>('standard');
 useEffect(()=>{try{chooseMode(modeOf(localStorage.getItem('pushup.mode.'+initial.profile.id)));}catch{}},[initial.profile.id]);
 const setMode=useCallback((m:ExerciseMode)=>{chooseMode(m);try{localStorage.setItem('pushup.mode.'+initial.profile.id,m);}catch{}},[initial.profile.id]);
 const selected=useMemo(()=>({...data,workouts:data.workouts.filter(w=>modeOf(w.mode)===mode),daily:data.dailyByMode?data.dailyByMode.filter(d=>d.mode===mode):mode==='standard'?data.daily:[],total:data.totalsByMode?.[mode]??(mode==='standard'?data.total:0)}),[data,mode]);
 const refresh=useCallback(async()=>{if(!demo)setData(await api<Snapshot>('snapshot'));},[demo]);
 const notice=useCallback((s:string)=>setMessage(s),[]);
 return <AppContext.Provider value={{data:selected,allData:data,mode,setMode,demo,refresh,notice,setData}}>
  <div className="app-shell">
   {menu&&<button className="nav-scrim" aria-label="Close navigation" onClick={()=>setMenu(false)}/>}
   <aside className={`sidebar ${menu?'open':''}`}>
    <Link href="/" className="brand-link" aria-label="PushUp home"><Brand/></Link>
    <div className="sidebar-label">YOUR DAILY MOVEMENT</div>
    <nav aria-label="Main navigation">{navigation.map(n=><Link key={n.id} href={n.href} className={`nav-link ${view===n.id?'active':''}`} aria-current={view===n.id?'page':undefined}><n.icon size={20}/>{n.label}{view===n.id&&<span className="active-dot"/>}</Link>)}</nav>
    <div className="sidebar-challenge"><span className="mini-icon"><Flame size={22}/></span><h3>A little stronger.<br/>Every single day.</h3><p>Your next rep is a step forward.</p><Link href="/workout">Let’s get moving <ArrowUpRight size={16}/></Link></div>
    <div className="sidebar-bottom"><div className="privacy-note"><ShieldCheck size={16}/>Your camera stays private</div><Link href="/profile" className="account-link"><Avatar name={data.profile.nickname} src={data.profile.avatar_url}/><span><strong>{data.profile.nickname}</strong><small>{demo?'Preview athlete':'Your personal account'}</small></span><ChevronRight size={16}/></Link></div>
   </aside>
   <div className="main-shell">
    <header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={()=>setMenu(true)}><Menu size={22}/></button><span>My workspace</span><ChevronRight size={14}/><strong>{view==='workout'?'Live workout':navigation.find(n=>n.id===view)?.label}</strong></div><div className="topbar-right"><span className="timezone"><span className="green-dot"/>Malaysia time · GMT+8</span><Link className="icon-button" href="/profile" aria-label="Profile settings"><Settings2 size={19}/></Link><Link href="/profile" aria-label="Your profile"><Avatar name={data.profile.nickname} src={data.profile.avatar_url} size="small"/></Link></div></header>
    {demo&&<div className="demo-banner"><span><strong>Explore the preview</strong><span className="demo-detail"> · Sample activity and rankings. Camera practice is real; results stay on this device.</span></span><Link href="/login">Connect accounts <ArrowUpRight size={13}/></Link></div>}
    <main className={`main-content ${view==='workout'?'workout-main':''}`}>{view!=='workout'&&view!=='profile'&&<ModePicker mode={mode} onChange={setMode}/ >}{view==='dashboard'?<Dashboard/>:view==='activity'?<Activity/>:view==='competition'?<Competition/>:view==='groups'?<Groups/>:view==='profile'?<Profile/>:<WorkoutView/>}</main>
    <footer className="footer"><span><span className="footer-brand">pushup.</span> Built for your better every day.</span><span>Every honest rep counts.</span></footer>
   </div>
   <nav className="mobile-nav" aria-label="Mobile navigation">{navigation.slice(0,4).map(n=><Link key={n.id} href={n.href} className={view===n.id?'active':''}><n.icon size={21}/><span>{n.id==='dashboard'?'Home':n.id==='activity'?'Activity':n.id==='competition'?'Ranks':'Groups'}</span></Link>)}<Link href="/workout" className="mobile-start" aria-label="Start workout"><Play size={23} fill="currentColor"/></Link></nav>
   {message&&<div className="toast" role="status"><span>{message}</span><button aria-label="Dismiss notification" onClick={()=>setMessage('')}><X size={18}/></button></div>}
  </div>
 </AppContext.Provider>;
}
