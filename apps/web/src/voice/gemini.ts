/**
 * Calls Mochi's existing voice server (the original Mochi app's /api/gemini and /api/market on Vercel).
 * The dev server proxies /mochi-voice → that server and adds the MOCHI_PASS header, so no key or
 * passcode is ever in the browser.
 */
export const VOICE_BASE: string = import.meta.env.VITE_MOCHI_VOICE_BASE || '/mochi-voice';
export const CHAT_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.6-flash'];
export const TTS_MODELS = ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts', 'gemini-3.1-flash-tts-preview'];

export interface GeminiPart { text?: string; thought?: boolean; inlineData?: { data: string; mimeType?: string } }
export interface GeminiReply { candidates?: { content?: { parts?: GeminiPart[] } }[] }

export async function gemCall(model: string, body: unknown, ms = 15000): Promise<GeminiReply> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(`${VOICE_BASE}/gemini`, {
      method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, body }),
    });
    if (!res.ok) throw new Error(`${model} ${res.status}: ${(await res.text()).slice(0, 160)}`);
    return await res.json() as GeminiReply;
  } catch (error) {
    throw error instanceof Error && error.name === 'AbortError' ? new Error(`${model} timed out`) : error;
  } finally { clearTimeout(timer); }
}

/** Tries each model until one answers. */
export async function gemText(body: unknown, models = CHAT_MODELS, ms = 12000): Promise<string> {
  let last: unknown;
  for (const model of models) {
    try {
      const data = await gemCall(model, body, ms);
      const out = (data.candidates?.[0]?.content?.parts ?? []).filter(p => !p.thought).map(p => p.text ?? '').join(' ').trim();
      if (out) return out.replace(/[*_#`]/g, '');
      throw new Error(`${model} empty reply`);
    } catch (error) { last = error; }
  }
  throw last instanceof Error ? last : new Error('No model answered');
}

export interface Quote { symbol: string; price: number; changePct: number | null }
export interface Article { title: string; summary?: string; source?: string; url?: string }
export interface MarketData { quotes: Quote[]; financeNews: Article[]; businessNews: Article[]; generalNews: Article[] }

export async function fetchMarket(symbols = 'SPY,VTI,QQQ,VXUS,BND'): Promise<MarketData> {
  const res = await fetch(`${VOICE_BASE}/market?symbols=${encodeURIComponent(symbols)}`);
  if (!res.ok) throw new Error(`market ${res.status}`);
  const d = await res.json() as Partial<MarketData>;
  return { quotes: d.quotes ?? [], financeNews: d.financeNews ?? [], businessNews: d.businessNews ?? [], generalNews: d.generalNews ?? [] };
}
