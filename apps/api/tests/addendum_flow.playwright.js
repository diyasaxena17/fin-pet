// Runs after the legacy feeding rehearsal against the same isolated account.
async (page, hooks = {}) => {
  const web = hooks.webBase || 'http://127.0.0.1:5173';
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  await page.goto(web);
  await page.getByRole('heading', {name:'Little steps. A brighter future.',exact:true}).waitFor();
  await page.getByText('Acorns', {exact:true}).waitFor();
  await page.getByText('DEMO controls · preview seeded progress', {exact:true}).click();
  await page.getByRole('button', {name:'Seed level 2 · 100 XP',exact:true}).click();
  await page.getByText(/One small habit, once a day: \+10 acorns/).waitFor();
  const pending = page.waitForResponse(r => new URL(r.url()).pathname === '/api/check-ins' && r.request().method() === 'POST');
  await page.getByRole('button', {name:'Complete daily check-in',exact:true}).click();
  const response = await pending;
  check(response.status() === 200, 'Canonical UI check-in failed');
  check((await response.json()).reward.coins === 10, 'Expected one check-in reward');
  await page.getByText(/Today’s check-in is complete/).waitFor();
  const result = await page.evaluate(async () => {
    const {httpApi: api} = await import('/src/lib/api.ts');
    const check = (condition, message) => { if (!condition) throw new Error(message); };
    const before = await api.getState();
    const report = await api.getDailyReport();
    const month = report.date.slice(0,7);
    check(report.dailyLimit === null && report.underDailyLimit === null, 'Absent budget must remain unknown');
    await api.updatePreferences({voice:'calm'});
    await api.updateBudgets({month,monthlyLimit:500,dailyLimit:25,categoryLimits:{food:100}});
    const transactions = [];
    for (let i=0;i<3;i++) transactions.push((await api.recordTransaction({requestId:crypto.randomUUID(),name:'Takeout',amount:18,
      category:'food',occurredAt:new Date(Date.now()-2*86400000).toISOString()})).transaction);
    const today = {requestId:crypto.randomUUID(),name:'Lunch',amount:18,category:'food',occurredAt:new Date().toISOString()};
    await api.recordTransaction(today); await api.recordTransaction(today);
    const budget = await api.getBudgets(month);
    check(budget.spentThisMonth === 72 && budget.spentToday === 18, 'Budget totals or transaction retry failed');
    check((await api.getTransactions(month)).transactions.length === 4, 'Expected four manual records');
    const insight = (await api.getInsights()).insights[0];
    check(insight.source === 'manual' && insight.evidence.count === 3 && insight.evidence.totalAmount === 54, 'Observed insight mismatch');
    check((await api.getDueReflections()).transactions.length === 3, 'Due reflections mismatch');
    await api.reflect({requestId:crypto.randomUUID(),transactionId:transactions[0].id,verdict:'worth_it'});
    check((await api.getDueReflections()).transactions.length === 2, 'Reflection did not persist');
    const lessons = await api.getLessons();
    const answer = {requestId:crypto.randomUUID(),lessonId:lessons.lessons[0].id,selectedOptionId:'save'};
    check((await api.answerLesson(answer)).reward.xp === 10, 'Lesson reward mismatch');
    check((await api.answerLesson(answer)).reward.xp === 0, 'Lesson retry rewarded twice');
    const after = await api.getState();
    check(JSON.stringify(before.goal) === JSON.stringify(after.goal), 'Spending changed goal savings');
    check(JSON.stringify(before.letter) === JSON.stringify(after.letter), 'Spending changed original letter');
    const finalReport = await api.getDailyReport();
    check(finalReport.spentToday === 18 && finalReport.underDailyLimit && finalReport.completedToday, 'Report mismatch');
    check((await api.checkIn({requestId:crypto.randomUUID()})).reward.coins === 0, 'Check-in repeated across UI and adapter');
    return {budget,observedCount:insight.evidence.count,dueReflections:2,lessonRewardOnce:true,
      reportReadOnly:true,savingsUnchanged:true,voice:after.preferences.voice,canonicalCheckIn:true};
  });
  await page.reload();
  await page.getByText('Acorns', {exact:true}).waitFor();
  const mobileFits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  check(mobileFits, 'Mobile dashboard overflows');
  if (hooks.screenshotDir) await page.screenshot({path:hooks.screenshotDir+'/addendum-mobile.png',fullPage:true});
  await page.setViewportSize({width:1280,height:900});
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Desktop dashboard overflows');
  if (hooks.screenshotDir) await page.screenshot({path:hooks.screenshotDir+'/addendum-desktop.png',fullPage:true});
  return {...result,mobileViewport:'390x844',desktopViewport:'1280x900',mobileFits:true,desktopFits:true,physicalPhone:false};
}
