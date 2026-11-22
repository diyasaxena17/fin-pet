/** Daily money brief: Finnhub + GNews data from Mochi's server, summed up by Gemini for a long-term investor. */
import { fetchMarket, gemText, type MarketData } from './gemini';
import type { Persona } from './personas';

const FUND_NAMES: Record<string, string> = {
  SPY: 'the 500 biggest US companies', VTI: 'the whole US stock market', QQQ: 'big US tech companies',
  VXUS: 'stocks outside the US', BND: 'US bonds', XIU: "Canada's 60 biggest companies", XEQT: 'a global all-in-one stock fund',
};
const LONG_TIPS = [
  'Remember, daily ups and downs barely matter over ten years. Keep adding a little to your TFSA every month.',
  "Staying diversified with broad index funds means one bad headline can't sink you.",
  'Build your emergency fund first, then invest money you won\'t need for at least five years.',
  'Low fees add up over time, so cheap, broad index ETFs make a great long-term base.',
];
const today = () => new Date().toLocaleDateString('en-CA');

/** Free, no-AI brief built straight from the data. */
export function templateBrief(d: MarketData): string {
  const out = ["Here's your daily brief!"], q = d.quotes.filter(x => x.changePct !== null);
  if (q.length) {
    const up = q.filter(x => (x.changePct ?? 0) >= 0).length;
    out.push(`Markets are ${up === q.length ? 'up across the board' : up === 0 ? 'down across the board' : up > q.length / 2 ? 'mostly up' : 'mostly down'} today.`);
    q.slice(0, 3).forEach(x => out.push(`${x.symbol}, ${FUND_NAMES[x.symbol] ?? 'one of your picks'}, is ${(x.changePct ?? 0) >= 0 ? 'up' : 'down'} ${Math.abs(x.changePct ?? 0)} percent.`));
  }
  const heads = [...d.financeNews.slice(0, 2), ...d.businessNews.slice(0, 1), ...d.generalNews.slice(0, 1)].map(a => a.title).filter(Boolean);
  if (heads.length) out.push('In the news: ' + heads.map(t => t.replace(/[.!?]+$/, '')).join('. ') + '.');
  out.push(LONG_TIPS[Math.floor(Math.random() * LONG_TIPS.length)]!, 'Want to chat about any of these?');
  return out.join(' ');
}

export async function dailyBrief(petName: string, persona: Persona, force = false): Promise<{ text: string; data: MarketData }> {
  const key = 'mochi.brief.' + today();
  if (!force) { try { const c = localStorage.getItem(key); if (c) return JSON.parse(c) as { text: string; data: MarketData }; } catch { /* no cache */ } }
  const data = await fetchMarket();
  if (!data.quotes.length && !data.financeNews.length && !data.generalNews.length && !data.businessNews.length) throw new Error('no market data');
  let text: string;
  try {
    const prompt = `Today is ${new Date().toDateString()}. Today's data (JSON):
${JSON.stringify(data)}

Write ${petName}'s spoken daily money brief for a Canadian university student who invests for the long term (10+ years, e.g. index ETFs in a TFSA).
70 to 110 words. Plain spoken sentences only: no lists, markdown, emojis, or symbols (say "percent", "dollars").
1) Open with a one-line market mood from the quotes, explaining in plain words what the funds represent. If there are no quotes, skip this.
2) Pick the two or three headlines that matter most and say what each could mean for a long-term investor, not a day trader.
3) Give one calm long-term takeaway (diversify, keep contributing, don't react to daily swings, emergency fund first, etc.).
4) End with a short friendly question.
Only use facts from the data. Never tell them to buy or sell a specific stock or to time the market.${persona.lingo ? '\n' + persona.lingo : ''}`;
    text = await gemText({ systemInstruction: { parts: [{ text: `You are ${petName}, a cute, upbeat but sensible money pet. You speak out loud.` }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 1200, temperature: 0.6 } }, undefined, 20000);
  } catch { text = templateBrief(data); }
  const brief = { text, data };
  try { localStorage.setItem(key, JSON.stringify(brief)); } catch { /* storage full */ }
  return brief;
}
