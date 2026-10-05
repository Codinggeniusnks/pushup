import {test,expect} from '@playwright/test';
test('dashboard, chart and accessible routes render without horizontal overflow',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.getByRole('heading',{name:'Let’s make it count, Alex.'})).toBeVisible();
 await page.getByRole('button',{name:'Month',exact:true}).click();await expect(page.getByRole('img',{name:/28 days of Standard push-up/})).toBeVisible();
 for(const route of ['/','/activity','/competition','/groups','/profile','/workout','/login']){
  await page.goto(route);await expect(page.locator('h1,h2').first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`Overflow on ${route}`).toBe(true);
 }
 expect(errors).toEqual([]);
});
test('calendar selects a date and displays its sessions',async({page})=>{
 await page.goto('/activity');const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 await page.getByRole('button',{name:`${today}: 62 push-ups`,exact:true}).click();await expect(page.getByText('62 accepted standard push-up reps · Malaysia time')).toBeVisible();await expect(page.getByText('reps on this date')).toBeVisible();
 await page.getByRole('button',{name:'Previous month'}).click();await page.getByRole('button',{name:'Today',exact:true}).click();await expect(page.getByRole('button',{name:`${today}: 62 push-ups`,exact:true})).toHaveAttribute('aria-pressed','true');
});
test('sample groups can be created and the code appears',async({page})=>{
 await page.goto('/groups');await page.getByRole('button',{name:'Create group',exact:true}).click();await page.getByLabel('Group name').fill('Browser Test Crew');await page.getByRole('dialog').getByRole('button',{name:'Create group',exact:true}).click();await expect(page.getByRole('heading',{name:'Browser Test Crew'})).toBeVisible();
 await page.locator('.group-card').filter({hasText:'Browser Test Crew'}).getByRole('button',{name:'Open group'}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('dialog').getByText('Invite code', {exact:false}).first()).toBeVisible();
});
test('nickname editing clearly stays in preview mode',async({page})=>{
 await page.goto('/profile');await page.getByLabel('Nickname',{exact:false}).fill('Test Athlete');await page.getByRole('button',{name:'Save changes'}).click();await expect(page.getByRole('heading',{name:'Test Athlete',exact:true})).toBeVisible();await expect(page.getByRole('status')).toContainText('Preview nickname updated');
});
test('unconfigured APIs reject writes and cross-origin requests',async({request})=>{
 const cross=await request.post('/api/app',{data:{action:'start'},headers:{origin:'https://attacker.invalid'}});expect(cross.status()).toBe(403);
 const unavailable=await request.post('/api/app',{data:{action:'start'},headers:{origin:'http://localhost:3000'}});expect(unavailable.status()).toBe(503);
});
test('camera permission denial is explained',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:()=>Promise.reject(new DOMException('Denied','NotAllowedError'))});});
 await page.goto('/workout');await page.getByRole('button',{name:'Enable camera'}).click();await expect(page.getByRole('alert').filter({hasText:'Camera permission was denied'})).toBeVisible();await expect(page.getByRole('button',{name:'Enable camera'})).toBeEnabled();
});
test('phone setup fits portrait and landscape and identifies the tracking version',async({page})=>{
 await page.goto('/workout');
 await expect(page.getByTestId('tracking-version')).toHaveText('Tracking v4.0.0-preview');
 await expect(page.getByRole('img',{name:/Side view of a straight-arm push-up/})).toBeVisible();
 await page.getByRole('combobox',{name:'Camera',exact:true}).selectOption('environment');
 await expect(page.getByRole('combobox',{name:'Camera',exact:true})).toHaveValue('environment');
 for(const viewport of [{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(viewport);
  const bounds=await page.locator('.camera-panel').evaluate(panel=>{const p=panel.getBoundingClientRect();return [...panel.querySelectorAll('.camera-stage,.camera-placeholder,.tracking-guide,.tracking-checks')].every(el=>{const b=el.getBoundingClientRect();return b.left>=p.left-1&&b.right<=p.right+1;});});
  expect(bounds).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
});
test('real local pose model loads with a synthetic camera and saves no practice score',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const ctx=canvas.getContext('2d')!;
   setInterval(()=>{ctx.fillStyle='#273c32';ctx.fillRect(0,0,640,480);ctx.fillStyle='#fff';ctx.fillText('Synthetic camera — no human footage',30,30);},100);
   const stream=canvas.captureStream(10),track=stream.getVideoTracks()[0];let zoom=1;
   Object.defineProperty(track,'getCapabilities',{value:()=>({zoom:{min:.5,max:3,step:.1}})});
   Object.defineProperty(track,'getSettings',{value:()=>({zoom})});
   Object.defineProperty(track,'applyConstraints',{value:async(constraints:{advanced:{zoom:number}[]})=>{zoom=constraints.advanced[0].zoom;}});
   return stream;
  }});
 });
 await page.goto('/workout');await page.getByRole('button',{name:'Enable camera'}).click();
 await expect(page.getByRole('button',{name:'Start counting'})).toBeVisible({timeout:50000});
 await page.getByRole('button',{name:'Use widest camera view'}).click();await expect(page.getByRole('button',{name:'Widest view selected'})).toBeDisabled();
 await page.getByRole('button',{name:'Start counting'}).click();await expect(page.locator('.camera-feedback')).toContainText('Move fully into view',{timeout:15000});await expect(page.getByRole('button',{name:'Pause workout'})).toBeVisible();await page.getByRole('button',{name:'Pause workout'}).click();await expect(page.getByRole('button',{name:'Resume workout'})).toBeVisible();await page.getByRole('button',{name:'Finish workout'}).click();await expect(page.getByRole('heading',{name:'You showed up.'})).toBeVisible();await expect(page.getByText('Practice results are not added to rankings or sample history.')).toBeVisible();
});

test('landmark replay reaches the displayed counter without phantom-person resets',async({page})=>{
 await page.addInitScript(()=>{
  const spoken=window as unknown as {spokenCues:string[]};spoken.spokenCues=[];
  Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class {constructor(public text:string){}}});
  Object.defineProperty(window,'speechSynthesis',{value:{speaking:false,pending:false,cancel(){},resume(){},getVoices(){return [];},speak(utterance:{text:string}){spoken.spokenCues.push(utterance.text);}}});
  const replay=window as unknown as {depthQueue:number[]};replay.depthQueue=[];
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;
   const ctx=canvas.getContext('2d')!;setInterval(()=>{ctx.fillStyle='#273c32';ctx.fillRect(0,0,640,480);},33);
   return canvas.captureStream(30);
  }});
  class ReplayWorker {
   onmessage:((e:{data:unknown})=>void)|null=null;onerror=null;private time=0;private stopped=false;
   postMessage(data:{type:string;frame?:ImageBitmap}){
    if(data.type==='init'){setTimeout(()=>this.onmessage?.({data:{type:'ready'}}),0);return;}
    data.frame?.close();const depth=replay.depthQueue.shift()??0;
    const p=Array.from({length:33},()=>({x:.5,y:.5,visibility:.9}));
    const sx=.30-.10*depth,sy=.30+.26*depth,ax=.85,ay=.43;
    for(const [ids,shift]of [[[11,13,15,23,25,27],0],[[12,14,16,24,26,28],.01]] as const){
     const points=[[sx,sy],[.3,.50+.06*depth],[.3,.7],[sx+(ax-sx)*.4,sy+(ay-sy)*.4],[sx+(ax-sx)*.72,sy+(ay-sy)*.72],[ax,ay]];
     ids.forEach((id,i)=>{p[id]={x:points[i][0]+shift,y:points[i][1],visibility:.9};});
    }
    const landmarks=depth===.6?[p,p.map(p=>({...p,x:p.x+.12}))]:[p];
    const time=this.time+=100;setTimeout(()=>{if(!this.stopped)this.onmessage?.({data:{type:'pose',landmarks,time}});},0);
   }
   terminate(){this.stopped=true;}
  }
  Object.defineProperty(window,'Worker',{value:ReplayWorker});
 });
 await page.goto('/workout');await page.getByRole('button',{name:'Voice coaching off'}).click();await page.getByRole('button',{name:'Enable camera'}).click();
 await page.getByRole('button',{name:'Start counting'}).click();
 await page.evaluate(()=>{(window as unknown as {depthQueue:number[]}).depthQueue=[...Array(8).fill(0),.2,.4,.6,.8,1,1,.8,.6,.4,.2,0,0,0];});
 await expect(page.locator('.live-count')).toHaveText('01');
 await expect(page.locator('.camera-rep-total strong')).toHaveText('01');
 expect(await page.evaluate(()=>(window as unknown as {spokenCues:string[]}).spokenCues)).toContain('1');
 await page.getByRole('button',{name:'Voice coaching on'}).click();await expect(page.getByRole('button',{name:'Voice coaching off'})).toHaveAttribute('aria-pressed','false');
 await expect(page.getByText('Only one person in frame',{exact:false})).toHaveCount(0);
 await page.getByRole('button',{name:'Finish workout'}).click();
});

test('voice unavailable has a clear fallback',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(window,'speechSynthesis',{value:undefined});Object.defineProperty(window,'SpeechSynthesisUtterance',{value:undefined});});
 await page.goto('/workout');await expect(page.getByRole('button',{name:'Voice coaching off'})).toBeDisabled();
 await expect(page.getByText('Voice is unavailable in this browser. Use the large on-screen counter.')).toBeVisible();
});
