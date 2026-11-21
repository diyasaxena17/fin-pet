/** Optional real-browser integration. Uses an external Playwright installation. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {runInThisContext} from 'node:vm';

const apiDir = fileURLToPath(new URL('../', import.meta.url));
const repo = dirname(dirname(apiDir));
const playwright = await import(process.env.PLAYWRIGHT_MODULE || 'playwright').catch(() => {
  throw Error('Set PLAYWRIGHT_MODULE to an existing Playwright index.mjs; see apps/api/HARDWARE_DEMO.md. No workspace dependencies are added.');
});
// Refuse occupied ports before starting: never connect a test to an existing account.
for (const port of [3000, 5173]) {
  const probe = createServer();
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(port, '0.0.0.0', resolve); });
  await new Promise(resolve => probe.close(resolve));
}
const directory = await mkdtemp(join(tmpdir(), 'mochi-nfc-browser-'));
const processes = [];
let browser;
function launch(command, args, env = {}, cwd = repo) {
  const child = spawn(command, args, {cwd, env:{...process.env,...env}, stdio:['ignore','pipe','pipe']});
  child.logs = '';
  child.stdout.on('data', data => { child.logs += data; });
  child.stderr.on('data', data => { child.logs += data; });
  child.on('error', error => { child.launchError = error; });
  processes.push(child);
  return child;
}
async function waitFor(check, description) {
  for (let attempt = 0; attempt < 150; ++attempt) {
    for (const process of processes) {
      if (process.launchError || process.exitCode !== null) throw Error(process.launchError?.message || process.logs);
    }
    if (await check()) return;
    await delay(50);
  }
  throw Error(`${description}\n${processes.map(p=>p.logs).join('\n')}`);
}
try {
  launch(join(apiDir,'scripts/start-demo.sh'), ['--no-build'], {DB_PATH:join(directory,'state.sqlite3'),PORT:'3000',API_HOST:'0.0.0.0'});
  launch(process.execPath, [join(repo,'apps/web/node_modules/vite/bin/vite.js')], {VITE_USE_MOCK:'false'}, join(repo,'apps/web'));
  for (const url of ['http://127.0.0.1:3000/health','http://127.0.0.1:5173/']) {
    await waitFor(async () => { try { return (await fetch(url)).ok; } catch { return false; } }, `Server unavailable: ${url}`);
  }
  const controllerFile = join(directory, 'controller.py');
  const callsFile = join(directory, 'calls.txt');
  await writeFile(controllerFile, 'import os\ndef record(name):\n    with open(os.environ["MOCHI_TEST_CALLS"], "a") as f: f.write(name + "\\n")\ndef wag_tail(): record("wag")\ndef play_happy_sound(): record("sound")\n');
  const poller = launch(process.env.PYTHON || 'python3', [join(apiDir,'examples/poll_device.py'),'http://127.0.0.1:3000',
    '--controller',controllerFile,'--sound','--interval','.05','--lock-file',join(directory,'poller.lock')], {MOCHI_TEST_CALLS:callsFile});
  browser = await playwright.chromium.launch({headless:true,...(process.env.PLAYWRIGHT_BROWSER_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_BROWSER_EXECUTABLE} : {})});
  const page = await browser.newPage({viewport:{width:390,height:844}});
  const test = runInThisContext(await readFile(join(apiDir,'tests/nfc_flow.playwright.js'),'utf8'), {filename:'nfc_flow.playwright.js'});
  const result = await test(page, {
    beforeScan:() => waitFor(() => poller.logs.includes('Initial baseline: 0'), 'Pi poller did not baseline'),
    afterFeed:async () => {
      await waitFor(async () => { try { return (await readFile(callsFile,'utf8')) === 'wag\nsound\n'; } catch { return false; } }, 'Expected one wag and sound');
      await delay(200); // Give repeated snapshots a chance to expose an accidental second dispatch.
      assert.equal(await readFile(callsFile,'utf8'), 'wag\nsound\n');
    },
  });
  console.log(JSON.stringify({...result,controllerCalls:['wag_tail','play_happy_sound'],physicalHardware:false},null,2));
} finally {
  if (browser) await browser.close().catch(() => {});
  await Promise.all(processes.reverse().map(async child => {
    if (child.exitCode === null && child.pid) {
      const exited = once(child,'exit');
      child.kill('SIGTERM');
      let timer;
      await Promise.race([exited,new Promise(resolve=>{timer=setTimeout(()=>{child.kill('SIGKILL');resolve();},5000);})]);
      clearTimeout(timer);
      if (child.exitCode === null && child.signalCode === null) await exited;
    }
  }));
  await rm(directory,{recursive:true,force:true});
}
