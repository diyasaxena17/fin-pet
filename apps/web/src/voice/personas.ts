/** Mochi's six voices, the same as the original Mochi app (mochi-pet-xi.vercel.app). */
export interface Persona {
  id: 'cute' | 'bubbly' | 'calm' | 'chill' | 'hype' | 'genz';
  name: string; desc: string; emoji: string;
  /** Gemini prebuilt voice, plus the custom designed voice made for this persona. */
  gv: string; voiceId?: string;
  gender: 'female' | 'male'; pitch: number; rate: number; semis?: number;
  lingo?: string; cheers: string[]; sound: SoundName;
}
export type SoundName = 'squeak' | 'arpeggio' | 'chime' | 'boop' | 'horn' | 'drip';

export const PERSONAS: Persona[] = [
  { id: 'cute', name: 'Cutie', desc: 'Tiny, squeaky cartoon pet', emoji: '🐿️', gv: 'Leda', voiceId: 'voice_3byj2azu8as1', gender: 'female', pitch: 2, rate: 1.12,
    cheers: ['Yay yay yay!', 'Eee, so proud of you!', 'Woo-hoo, tiny happy dance!'], sound: 'squeak' },
  { id: 'bubbly', name: 'Sparkle', desc: 'Bubbly best friend', emoji: '✨', gv: 'Laomedeia', voiceId: 'voice_tfnymmk5lmjf', gender: 'female', pitch: 1.35, rate: 1.08,
    cheers: ['Oh my gosh, yes!', 'Okay, look at you saving!', 'Love that for you!'], sound: 'arpeggio' },
  { id: 'calm', name: 'Sage', desc: 'Calm, gentle coach', emoji: '🌿', gv: 'Vindemiatrix', voiceId: 'voice_mmosea3k6jx8', gender: 'female', pitch: 1, rate: 0.92,
    cheers: ['Beautifully done.', "That's a wise choice.", 'Future you says thank you.'], sound: 'chime' },
  { id: 'chill', name: 'Buddy', desc: 'Laid-back friend', emoji: '😎', gv: 'Zubenelgenubi', voiceId: 'voice_eieab7cybz19', gender: 'male', pitch: 0.9, rate: 1,
    cheers: ['Ayyy, nice!', "Let's gooo, my guy!", 'Big brain move.'], sound: 'boop' },
  { id: 'hype', name: 'Coach Max', desc: 'Loud hype coach', emoji: '📣', gv: 'Fenrir', voiceId: 'voice_2qgs82tcc84k', gender: 'male', pitch: 1.1, rate: 1.22,
    cheers: ["LET'S GO! Money champion!", "That's what I'm talking about!", 'Unstoppable! Absolutely unstoppable!'], sound: 'horn' },
  { id: 'genz', name: 'Zay', desc: 'Gen Z bestie, talks in slang', emoji: '💅', gv: 'Puck', voiceId: 'voice_iwyh9fkc7w95', gender: 'male', pitch: 1.1, rate: 1.12,
    lingo: "Talk like a Gen Z best friend. Naturally use Gen Z slang in every reply (for example: no cap, fr fr, lowkey, highkey, bet, say less, it's giving, slay, ate, bussin, mid, a W, an L, rizz, delulu, main character energy, touch grass, vibe check, understood the assignment, the ick, sheesh). Use two or three per reply so it sounds natural, and keep the money facts accurate.",
    cheers: ["Sheesh, that's a W!", 'No cap, you ate that!', 'Main character energy, fr fr!'], sound: 'drip' },
];

const KEY = 'mochi.voice';
export function getPersona(): Persona {
  let id: string | null = null;
  try { id = localStorage.getItem(KEY); } catch { /* storage unavailable */ }
  return PERSONAS.find(p => p.id === id) ?? PERSONAS[0]!;
}
export function setPersona(id: Persona['id']): void {
  try { localStorage.setItem(KEY, id); } catch { /* storage unavailable */ }
  try { window.dispatchEvent(new CustomEvent('mochi:voice', { detail: { id } })); } catch { /* no window */ }
}
