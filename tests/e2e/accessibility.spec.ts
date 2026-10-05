import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('main screens meet automated WCAG AA checks',async({page})=>{
 const findings:unknown[]=[];
 for(const route of ['/','/activity','/competition','/groups','/profile','/workout','/login']){
  await page.goto(route);
  const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  findings.push(...results.violations.map(v=>({route,id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
 }
 expect(findings).toEqual([]);
});
