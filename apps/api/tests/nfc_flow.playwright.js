// Run with the companion Node runner or a Playwright page tool. Fresh test DB only.
async (page, hooks = {}) => {
  const web = hooks.webBase || 'http://127.0.0.1:5173';
  const api = hooks.apiBase || 'http://127.0.0.1:3000';
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const read = async path => {
    const response = await page.request.get(api + path);
    check(response.ok(), `GET ${path}: ${response.status()}`);
    return response.json();
  };
  const post = async (path, data) => {
    const response = await page.request.post(api + path, {data});
    check(response.ok(), `POST ${path}: ${response.status()}`);
    return response.json();
  };
  check(!(await read('/api/state')).initialized, 'Use an isolated, uninitialized database. This test never resets progress.');
  await post('/api/onboarding', {petName:'Mochi',goalTitle:'NFC test',goalTarget:200,
    letter:{vision:'A secure future.',why:'More choices.',reminder:'Small steps count.'}});
  await post('/api/decisions', {requestId:'11111111-1111-4111-8111-111111111111',itemName:'Hoodie',amount:60,decision:'skip'});
  await post('/api/savings', {requestId:'22222222-2222-4222-8222-222222222222',amount:50});
  if (hooks.beforeScan) await hooks.beforeScan();
  const before = await read('/api/state');
  const baseline = await read('/api/device/state');
  const feeds = [];
  const errors = [];
  const onRequest = request => {
    if (new URL(request.url()).pathname === '/api/feed' && request.method() === 'POST') feeds.push(request.postDataJSON());
  };
  const onError = error => errors.push(String(error));
  page.on('request', onRequest);
  page.on('pageerror', onError);
  try {
    const nfcUrl = web + '/tap?petId=mochi-01';
    await page.goto(nfcUrl);
    const confirm = () => page.getByRole('button', {name:'Confirm feed · 20 acorns',exact:true});
    await confirm().waitFor({state:'visible'});
    await page.reload();
    await confirm().waitFor({state:'visible'});
    await page.getByRole('link', {name:'Back to dashboard',exact:true}).click();
    await page.getByRole('heading', {name:'Little steps. A brighter future.',exact:true}).waitFor();
    await page.goto(nfcUrl);
    await confirm().waitFor({state:'visible'});
    const opened = await read('/api/state');
    const openedDevice = await read('/api/device/state');
    check(JSON.stringify(opened) === JSON.stringify(before), 'Opening/refreshing/cancelling NFC URL mutated account');
    check(JSON.stringify(openedDevice) === JSON.stringify(baseline), 'Opening NFC URL created a reaction');
    check(feeds.length === 0, 'NFC navigation automatically posted /api/feed');
    const pending = page.waitForResponse(r => new URL(r.url()).pathname === '/api/feed' && r.request().method() === 'POST');
    await confirm().click();
    const response = await pending;
    check(response.status() === 200, 'Explicit feed failed');
    const fed = await response.json();
    await page.getByText('Mochi enjoyed their meal!', {exact:true}).waitFor();
    check(feeds.length === 1, 'One confirmation must submit one feed');
    check(fed.wallet.coins === before.wallet.coins - 20 && fed.wallet.xp === before.wallet.xp, 'Feed balance mismatch');
    check(fed.pet.hunger === 80 && fed.pet.mood === 'happy', 'Feed pet mismatch');
    const device = await read('/api/device/state');
    check(device.reactionSeq === baseline.reactionSeq + 1 && device.reactionType === 'feed', 'Expected one new feed reaction');
    const retried = await post('/api/feed', feeds[0]);
    check(JSON.stringify(retried) === JSON.stringify(fed), 'Retry spent coins twice');
    check(JSON.stringify(await read('/api/device/state')) === JSON.stringify(device), 'Retry created another reaction');
    if (hooks.afterFeed) await hooks.afterFeed();
    check(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
    return {nfcUrl,opened:{coins:opened.wallet.coins,hunger:opened.pet.hunger,feedPosts:0},
      confirmed:{coins:fed.wallet.coins,xp:fed.wallet.xp,hunger:fed.pet.hunger,feedPosts:feeds.length},
      device,retryUnchanged:true,browserErrors:errors};
  } finally {
    page.off('request', onRequest);
    page.off('pageerror', onError);
  }
}
