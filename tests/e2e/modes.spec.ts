import {test,expect} from '@playwright/test';
test('mode selection separates sample dashboard, rankings, activity and profile totals',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:/Knee push-up Beginner/}).click();
 await expect(page.locator('.today-number')).toContainText('39');await expect(page.locator('.stat-card').first()).toContainText('960');
 await page.goto('/competition');await expect(page.getByRole('button',{name:/Knee push-up Beginner/})).toHaveAttribute('aria-pressed','true');await expect(page.locator('.ranking-row.you')).toContainText('39');await expect(page.locator('.mode-status')).toContainText('experimental');
 await page.getByRole('button',{name:/Crunch Beginner/}).click();await expect(page.locator('.ranking-row.you')).toContainText('50');
 await page.goto('/activity');await expect(page.locator('.workout-row').first()).toContainText('Crunch');await expect(page.locator('.workout-row')).toHaveCount(1);
 await page.getByLabel('Show sessions from all four modes').check();await expect(page.locator('.workout-row')).toHaveCount(4);await expect(page.locator('.mode-totals>div')).toHaveCount(4);
 await page.goto('/profile');await expect(page.locator('.mode-totals')).toContainText('2,486');await expect(page.locator('.mode-totals')).toContainText('960');await expect(page.locator('.mode-totals')).toContainText('1,430');await expect(page.locator('.mode-totals')).toContainText('725');
});
test('new-mode landmark replays count only the selected full cycle and lock selection',async({page})=>{
 await page.addInitScript(()=>{
  const state=window as unknown as {exercise:string;queue:number[]};state.exercise='crunch';state.queue=[];
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{const c=document.createElement('canvas');c.width=640;c.height=480;const ctx=c.getContext('2d')!;setInterval(()=>{ctx.fillRect(0,0,640,480);},33);return c.captureStream(30);}});
  class WorkerMock{onmessage:((e:{data:any})=>void)|null=null;onerror=null;private t=0;private stopped=false;
   postMessage(data:{type:string;frame?:ImageBitmap}){if(data.type==='init'){setTimeout(()=>this.onmessage?.({data:{type:'ready'}}),0);return;}data.frame?.close();const lift=state.queue.shift()??0;const p=Array.from({length:33},()=>({x:.5,y:.5,visibility:.9}));
    for(const [ids,shift]of [[[11,13,15,23,25,27],0],[[12,14,16,24,26,28],.01]] as const){
     const knee=state.exercise==='knee';const sx=knee?.3-.1*lift:.5-.3*Math.cos(lift*Math.PI/180)/(4/3),sy=knee?.3+.26*lift:.65-.3*Math.sin(lift*Math.PI/180);
     const points=knee?[[sx,sy],[.3,.5+.06*lift],[.3,.7],[sx+(.7-sx)*.55,sy+(.7-sy)*.55],[.7,.7],[.84,.54]]:[[sx,sy],[.3,.4],[.3,.5],[.5,.65],[.65,.42],[.8,.65]];
     ids.forEach((id,i)=>{p[id]={x:points[i][0]+shift,y:points[i][1],visibility:.9};});
    }const time=this.t+=100;setTimeout(()=>{if(!this.stopped)this.onmessage?.({data:{type:'pose',landmarks:[p],time,inferenceMs:20}});},0);
   }terminate(){this.stopped=true;}}
  Object.defineProperty(window,'Worker',{value:WorkerMock});
 });
 for(const [mode,name,peak]of [['knee','Knee push-up',1],['crunch','Crunch',30],['situp','Full sit-up',75]] as const){
  await page.goto('/workout');await page.getByRole('button',{name:new RegExp(name+' ')}).click();await page.evaluate(m=>{(window as any).exercise=m;},mode);await page.getByRole('button',{name:'Enable camera'}).click();await page.getByRole('button',{name:'Start counting'}).click();await expect(page.getByRole('button',{name:/Standard push-up Advanced/})).toBeDisabled();
  await page.evaluate(peak=>{(window as any).queue=[...Array(9).fill(0),...Array(8).fill(peak),...Array(12).fill(0)];},peak);await expect(page.locator('.live-count')).toHaveText('01');await page.getByRole('button',{name:'Finish workout'}).click();await expect(page.locator('.workout-finished')).toContainText(name);
 }
});
test('group standings select a mode and workout restores it with specific guidance',async({page})=>{
 await page.goto('/groups');await page.getByRole('button',{name:'Open group'}).first().click();const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:/Full sit-up Advanced/}).click();await expect(dialog.locator('.mode-status')).toContainText('practice');
 await page.goto('/workout');await expect(page.getByRole('button',{name:/Full sit-up Advanced/})).toHaveAttribute('aria-pressed','true');await expect(page.locator('.tracking-guide')).toContainText('Lie on your back');await expect(page.getByTestId('tracking-version')).toHaveText('Tracking v4.0.0-preview');await expect(page.locator('.workout-tips')).toContainText('substantially upright');
 for(const size of [{width:390,height:844},{width:844,height:390}]){await page.setViewportSize(size);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
 await page.getByRole('link',{name:'Validation status'}).click();await expect(page.getByRole('heading',{name:'Detector validation'})).toBeVisible();await expect(page.getByText(/classifier is implemented but inactive/)).toBeVisible();
});
