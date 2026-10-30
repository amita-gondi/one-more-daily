export const signature = word => word.split('').sort().join('');
export function makeDictionary(text,commonText='',families={}) {
  const common=new Set(commonText.trim().split(/\s+/));
  const words = new Set(text.trim().split(/\s+/).filter(w => /^[a-z]+$/.test(w)));
  const index = new Map();
  for (const word of words) {const key=signature(word); if(!index.has(key)) index.set(key,[]); index.get(key).push(word);}
  const sameRoot=(from,to)=>(families[from]||[]).includes(to);
  const cache=new Map();
  function next(word) {if(cache.has(word))return cache.get(word);const key=signature(word);const out=[];for(const c of 'abcdefghijklmnopqrstuvwxyz'){const matches=index.get(signature(key+c));if(matches)out.push(...matches.filter(n=>!sameRoot(word,n)));}out.sort((a,b)=>Number(common.has(b))-Number(common.has(a)));cache.set(word,out);return out;}
  function validate(from,raw) {const word=raw.trim().toLowerCase();if(!/^[a-z]+$/.test(word))return {error:'Letters only, please. No spaces or hyphens.'};if(word.length!==from.length+1)return {error:`Your next word needs exactly ${from.length+1} letters.`};const counts={};for(const c of word)counts[c]=(counts[c]||0)+1;for(const c of from){if(!counts[c])return {error:`Keep every letter in ${from.toUpperCase()} — including repeats.`};counts[c]--;}if(!words.has(word))return {error:`“${word.toUpperCase()}” isn’t in our word list. Try another.`};if(sameRoot(from,word))return {error:'That’s the same word family. Try a new root.'};return {word,added:Object.keys(counts).find(c=>counts[c]>0)};}
  const bestCache=new Map();
  function best(word) {if(bestCache.has(word))return bestCache.get(word);let path=[];for(const n of next(word)){const p=[n,...best(n)];if(p.length>path.length)path=p;}bestCache.set(word,path);return path;}
  return {words,next,validate,best};
}
export function dailyKey(date=new Date()) {
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
  const d=new Date(Date.UTC(+p.year,+p.month-1,+p.day));if(+p.hour<6)d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10);
}
export function puzzleNumber(key) {return Math.floor((Date.parse(key+'T00:00:00Z')-Date.parse('2026-10-29T00:00:00Z'))/86400000)+1;}
export function chooseSeed(pools,mode,key) {const n=puzzleNumber(key)-1;const a=pools[mode];return a[((n+({easy:0,medium:2,hard:3}[mode]))%a.length+a.length)%a.length];}
