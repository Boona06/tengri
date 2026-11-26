import {chromium} from '@playwright/test';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const env=require('../../back-end/node_modules/dotenv').parse(fs.readFileSync(new URL('../../back-end/.env',import.meta.url)));
const base=process.env.TEST_SITE_URL||'http://127.0.0.1:3101';
const b=await chromium.launch({channel:'chrome',headless:true});
try{
const p=await b.newPage({viewport:{width:1440,height:1000}});
if(base.includes('127.0.0.1'))await p.route('http://localhost:4000/**',async route=>{if(route.request().method()==='OPTIONS'){await route.fulfill({status:204,headers:{'access-control-allow-origin':base,'access-control-allow-credentials':'true','access-control-allow-methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS','access-control-allow-headers':'Content-Type'}});return;}const response=await route.fetch({url:route.request().url().replace('localhost:4000','localhost:4100'),headers:{...route.request().headers(),origin:'http://localhost:3000'}});await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':base,'access-control-allow-credentials':'true'}})});
await p.goto(base+'/admin/login');await p.locator('input[type=email]').fill(env.ADMIN_EMAIL);await p.locator('input[type=password]').fill(env.ADMIN_PASSWORD);await p.locator('button[type=submit]').click();await p.waitForURL('**/admin',{timeout:20000});await p.getByRole('button',{name:'Үнэ ба купон',exact:false}).waitFor();await p.getByText('Бодит орлого',{exact:true}).first().waitFor({timeout:20000});await p.screenshot({path:'test-results/admin-studio.png',fullPage:true});
for(const name of ['Үнэ ба купон','Хандалт','Төлбөр ба орлого','Баг ба эрх','Миний тохиргоо']){await p.getByRole('button',{name,exact:false}).first().click();await p.waitForTimeout(300);console.log('TAB OK',name);}
await p.reload();await p.getByText('Карт бүрт').waitFor();await p.setViewportSize({width:390,height:844});await p.screenshot({path:'test-results/admin-mobile.png',fullPage:true});if(await p.evaluate(()=>document.documentElement.scrollWidth)>390)throw Error('Mobile overflow');console.log('Login, refresh and mobile OK');
await p.goto(base+'/');await p.getByRole('group',{name:'Зөгнөлт картууд'}).waitFor();await p.screenshot({path:'test-results/home-live.png',fullPage:true});console.log('Live catalogue visible');
}finally{await b.close();}
