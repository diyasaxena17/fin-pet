/** Native API/Vite browser check. Uses an existing external Playwright installation. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir, mkdtemp, rm} from 'node:fs/promises';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
for (const port of [3000, 5173]) {
  const probe = createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(port, '0.0.0.0', resolve); });
  await new Promise(resolve => probe.close(resolve));
}
const directory = await mkdtemp(join(tmpdir(), 'mochi-preferences-browser-'));
const children = [];
let browser, releaseState = () => {}, releaseFailure = () => {};
function launch(command, args, env = {}, cwd = repo) {
  const child = spawn(command, args, {cwd, env:{...process.env,...env}, stdio:['ignore','pipe','pipe']});
  child.logs = '';
  child.stdout.on('data', b => { child.logs += b; }); child.stderr.on('data', b => { child.logs += b; });
  child.on('error', e => { child.launchError = e; }); children.push(child); return child;
}
async function ready(child, url) {
  for (let i = 0; i < 150; i++) {
    if (child.launchError || child.exitCode !== null) throw Error(child.launchError?.message || child.logs);
    try { if ((await fetch(url)).ok) return; } catch {}
    await delay(50);
  }
  throw Error('Startup timeout: '+child.logs);
}
async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null || !child.pid) return;
  const exited = once(child, 'exit'); child.kill('SIGTERM');
  const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
  await exited; clearTimeout(timer);
}
const startApi = () => launch(join(repo,'apps/api/build/mochi-api'), [], {
  PORT:'3000',API_HOST:'127.0.0.1',DB_PATH:join(directory,'state.sqlite3'),
  ENABLE_DEVICE_API:'true',DEMO_MODE:'false',DEMO_TIME_ZONE:'America/Toronto',
});
try {
  let backend = startApi(); await ready(backend, 'http://127.0.0.1:3000/health');
  const vite = launch(process.execPath,[join(repo,'apps/web/node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','5173','--strictPort'],
    {VITE_USE_MOCK:'false'}, join(repo,'apps/web'));
  await ready(vite, 'http://127.0.0.1:5173/');
  const call = async (path, method='GET', body) => {
    const response = await fetch('http://127.0.0.1:3000/api'+path,{method,...(body === undefined ? {} : {
      headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
    assert.ok(response.ok, path); return response.json();
  };
  await call('/onboarding','POST',{petName:'Mochi',goalTitle:'Fund',goalTarget:200,
    letter:{vision:'  Original words.\n',why:'Choices',reminder:'Small steps count.'}});
  const baseline = await call('/savings','POST',{requestId:'11111111-1111-4111-8111-111111111111',amount:50});
  const device = await call('/device/state');
  browser = await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_BROWSER_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_BROWSER_EXECUTABLE} : {})});
  const page = await browser.newPage({viewport:{width:390,height:844}});
  const errors = [], writes = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('request', r => { if (r.method()==='PUT' && new URL(r.url()).pathname==='/api/preferences') writes.push(r.postDataJSON()); });
  let delayed = false;
  const stateGate = new Promise(resolve => { releaseState=resolve; });
  await page.route('**/api/state',async route => {
    if (!delayed) { delayed=true; await stateGate; }
    await route.continue();
  });
  await page.goto('http://127.0.0.1:5173/settings');
  await page.getByText('Loading Mochi…',{exact:true}).waitFor();
  releaseState();
  await page.getByRole('heading',{name:'Your squirrel, your style',exact:true}).waitFor();
  assert.equal(await page.getByLabel('Squirrel name').inputValue(),'Mochi');
  assert.equal(writes.length,0);
  const preview = page.getByRole('button',{name:'Preview cute voice',exact:true});
  const previewAvailable = await preview.count() > 0;
  if (previewAvailable) await preview.click();
  await page.getByRole('radio',{name:/Calm/}).check();
  await page.getByLabel('Squirrel name').fill('  Clover  ');
  assert.equal(writes.length,0,'Draft edits and preview must not save');
  let failed = false;
  const failureGate = new Promise(resolve => { releaseFailure=resolve; });
  await page.route('**/api/preferences', async route => {
    if (!failed && route.request().method()==='PUT') {
      failed=true; await failureGate;
      await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:{code:'INTERNAL_ERROR',message:'Test save failed. Try again.'}})});
    } else await route.continue();
  });
  await page.getByRole('button',{name:'Save preferences',exact:true}).click();
  const saving = page.getByRole('button',{name:'Saving preferences…',exact:true});
  await saving.waitFor(); assert.ok(await saving.isDisabled());
  releaseFailure();
  await page.getByRole('alert').filter({hasText:'Test save failed. Try again.'}).waitFor();
  assert.equal(await page.getByLabel('Squirrel name').inputValue(),'  Clover  ');
  assert.ok(await page.getByRole('radio',{name:/Calm/}).isChecked());
  await page.getByRole('button',{name:'Save preferences',exact:true}).click();
  await page.getByText('Your name and voice are saved.',{exact:true}).waitFor();
  assert.deepEqual(writes,[{petName:'Clover',voice:'calm'},{petName:'Clover',voice:'calm'}]);
  const saved = await call('/state');
  assert.deepEqual(saved,{...baseline,pet:{...baseline.pet,name:'Clover'},preferences:{voice:'calm'}});
  assert.deepEqual(await call('/device/state'),device);
  await page.getByRole('link',{name:'Back to dashboard',exact:true}).click();
  await page.getByText('Clover is feeling neutral today',{exact:true}).waitFor();
  await page.getByRole('link',{name:'Settings',exact:true}).click();
  assert.equal(await page.getByLabel('Squirrel name').inputValue(),'Clover');
  await stop(backend); backend=startApi(); await ready(backend,'http://127.0.0.1:3000/health');
  await page.reload();
  await page.getByRole('heading',{name:'Your squirrel, your style',exact:true}).waitFor();
  assert.equal(await page.getByLabel('Squirrel name').inputValue(),'Clover');
  assert.ok(await page.getByRole('radio',{name:/Calm/}).isChecked());
  assert.deepEqual(await call('/state'),saved);
  const screenshots = join(repo,'apps/web/verification'); await mkdir(screenshots,{recursive:true});
  for (const [name,viewport] of [['mobile',{width:390,height:844}],['desktop',{width:1280,height:900}]]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await page.locator('header').count(),1);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name+' overflow');
    await page.screenshot({path:join(screenshots,`preferences-${name}.png`),fullPage:true});
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({loadingObserved:true,explicitSaveOnly:true,failedSaveRetainedDraft:true,retrySucceeded:true,
    name:'Clover',voice:'calm',restartPersistence:true,ledgerAndLetterUnchanged:true,privateDeviceUnchanged:true,
    viewports:['390x844','1280x900'],previewAvailable,speechOutputPhysicallyVerified:false,pageErrors:errors},null,2));
} finally {
  releaseState(); releaseFailure();
  if (browser) await browser.close();
  await Promise.all(children.map(stop));
  await rm(directory,{recursive:true,force:true});
}
