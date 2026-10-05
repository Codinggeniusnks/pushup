import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e', fullyParallel:false, workers:1, timeout:60000,
 reporter:[['list']], use:{baseURL:'http://localhost:3000',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'desktop-chrome',use:{...devices['Desktop Chrome'],channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',viewport:{width:1440,height:1000}}},{name:'mobile-chrome',use:{...devices['Pixel 7'],channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'}}],
 webServer:{command:'npm run dev -- --port 3000',url:'http://localhost:3000',reuseExistingServer:true,timeout:60000},
});
