import {makeDictionary, dailyKey, puzzleNumber, chooseSeed} from './engine.mjs';
import {initInstallable} from './install.mjs';
import {initReminders} from './reminders.mjs';
import {initPush} from './push.mjs';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
let dictionary,pools,day=dailyKey(),mode=['easy','medium','hard'].includes(location.hash.slice(1))?location.hash.slice(1):'easy',state,storageAvailable=true,toastTimer;
const version='onemore-v1';
const storageKey=()=>`${version}:${day}:${mode}`;
function saved(key){try{return JSON.parse(localStorage.getItem(key))}catch{storageAvailable=false;return null}}
function persist(){try{localStorage.setItem(storageKey(),JSON.stringify(state))}catch{storageAvailable=false}}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,3500)}
function modal(html){$('#modal-body').innerHTML=html;if(!$('#modal').open)$('#modal').showModal()}
function closeModal(){$('#modal').close()}
initInstallable({modal,toast});
initReminders({modal,toast});
initPush({modal});
$('#modal-close').onclick=closeModal;
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal()}});
function feedback(text,kind=''){$('#feedback').textContent=text;$('#feedback').className=`feedback ${kind}`}
function current(){return state.chain.at(-1)}
function freshDay(){const newDay=dailyKey();if(day===newDay)return false;day=newDay;closeModal();loadMode(mode);toast('A new morning, three fresh puzzles. Let’s grow.');return true}
function loadMode(nextMode){mode=nextMode;history.replaceState(null,'',`#${mode}`);const seed=chooseSeed(pools,mode,day);const prior=saved(storageKey());
  state={chain:[seed],hints:[],hintLetter:null,done:false,endedBy:null};
  if(prior&&Array.isArray(prior.chain)&&prior.chain[0]===seed){
    const chain=[seed];
    for(let i=1;i<prior.chain.length;i++){if(typeof prior.chain[i]!=='string'||dictionary.validate(chain.at(-1),prior.chain[i]).error)break;chain.push(prior.chain[i]);}
    const trimmed=chain.length!==prior.chain.length;
    state={...state,...prior,chain,hints:Array.isArray(prior.hints)?prior.hints.filter(i=>Number.isInteger(i)&&i>0&&i<chain.length):[]};
    if(trimmed){state.done=false;state.endedBy=null;state.hintLetter=null;toast('Restored your last valid word under the new-root rule.');}
    if(state.hintLetter&&!dictionary.next(current()).some(w=>dictionary.validate(current(),w).added===state.hintLetter))state.hintLetter=null;
  }
  if(!state.done&&dictionary.next(current()).length===0){state.done=true;state.endedBy='deadend';}
  persist();
  $('#word-input').value='';$('#grow-button').classList.remove('has-answer');render();
}
function renderTiles(word,added=null){const tiles=$('#letter-tiles');tiles.style.setProperty('--count',word.length);tiles.classList.toggle('solved',state.chain.length>1);tiles.setAttribute('aria-label',word.toUpperCase().split('').join(' '));let marked=false;tiles.innerHTML=word.split('').map(c=>{const highlight=c===added&&!marked;if(highlight)marked=true;return `<span class="letter-tile${highlight?' new-letter':''}" aria-hidden="true">${c.toUpperCase()}</span>`}).join('')}
function updateEntry(){if(!state||state.done)return;const input=$('#word-input');const size=current().length+1;input.maxLength=size;$('#entry-tiles').style.setProperty('--count',size);$('#entry-tiles').innerHTML=Array.from({length:size},(_,i)=>`<span class="letter-tile${input.value[i]?' filled':''}${i===input.value.length?' cursor':''}">${esc((input.value[i]||'').toUpperCase())}</span>`).join('');$('#grow-button').classList.toggle('has-answer',input.value.length===size)}
function typeLetter(letter){if(!dictionary||state.done||freshDay())return;const input=$('#word-input');if(input.value.length<current().length+1){input.value+=letter;input.removeAttribute('aria-invalid');feedback('');updateEntry()}input.focus({preventScroll:true})}
function deleteLetter(){if(!dictionary||state.done)return;$('#word-input').value=$('#word-input').value.slice(0,-1);$('#word-input').removeAttribute('aria-invalid');feedback('');updateEntry();$('#word-input').focus({preventScroll:true})}
function render(){
  const word=current(),score=state.chain.length-1;
  $$('.mode').forEach(b=>{const active=b.dataset.mode===mode;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));const other=saved(`${version}:${day}:${b.dataset.mode}`);b.querySelector('.mode-status').textContent=(b.dataset.mode===mode?state.done:other?.done)?'✓':''});
  $('#puzzle-label').textContent=`Daily #${puzzleNumber(day)}`;$('#score').textContent=score;
  $('#game-panel').setAttribute('aria-busy','false');
  $('#active-game').hidden=state.done;$('#result').hidden=!state.done;
  $('#chain-caption').textContent=score?`${score} addition${score===1?'':'s'}. ${word.length} letters.`:'One word is just the beginning.';
  $('#chain-section').hidden=score===0;
  $('#chain').innerHTML=state.chain.map((w,i)=>`<li><span class="chain-word">${w.toUpperCase()}${state.hints.includes(i)?'<span title="Hint used" aria-label="hint used"> ✧</span>':''}</span></li>`).join('');
  for(const id of ['shuffle','hint','finish'])$('#'+id).disabled=state.done;
  $('#keyboard').hidden=state.done;$$('.key').forEach(b=>b.disabled=state.done);
  if(state.done){renderResult();return}
  renderTiles(word);updateEntry();$('#word-caption').textContent=score?'YOUR WORD IS GROWING':'YOUR STARTING WORD';
  for(const id of ['word-input','grow-button','hint','finish','shuffle'])$('#'+id).disabled=false;
  $('#word-input').placeholder=`${word.length+1}-letter word`;
  feedback(state.hintLetter?`Try adding ${state.hintLetter.toUpperCase()}.`:'');
  $('#hint').textContent=state.hintLetter?`Hint: ${state.hintLetter.toUpperCase()}`:'Hint';
  if(!storageAvailable)feedback('Progress can’t be saved in this browser. Keep this tab open.');
}
function submit(e){e.preventDefault();if(!dictionary||freshDay()||state.done)return;const result=dictionary.validate(current(),$('#word-input').value);if(result.error){feedback(result.error,'error');$('#word-input').setAttribute('aria-invalid','true');return}
  if(state.hintLetter&&!state.hints.includes(state.chain.length))state.hints.push(state.chain.length);
  state.chain.push(result.word);state.hintLetter=null;$('#word-input').value='';$('#grow-button').classList.remove('has-answer');$('#word-input').removeAttribute('aria-invalid');
  if(dictionary.next(current()).length===0){state.done=true;state.endedBy='deadend'}persist();render();
  if(!state.done){renderTiles(current(),result.added);feedback('');$('#word-input').focus()}
}
$('#word-form').addEventListener('submit',submit);
$('#word-input').addEventListener('input',()=>{$('#word-input').removeAttribute('aria-invalid');feedback('');updateEntry()});
$$('[data-key]').forEach(b=>b.onclick=()=>typeLetter(b.dataset.key));$('#delete-key').onclick=deleteLetter;
document.addEventListener('keydown',e=>{if(!dictionary||state.done||$('#modal').open||!$('#game-menu').hidden||e.target===$('#word-input')||e.ctrlKey||e.metaKey||e.altKey)return;if(/^[a-z]$/i.test(e.key)){e.preventDefault();typeLetter(e.key.toLowerCase())}else if(e.key==='Backspace'){e.preventDefault();deleteLetter()}else if(e.key==='Enter'&&e.target===document.body){e.preventDefault();$('#word-form').requestSubmit()}});
$('#shuffle').onclick=()=>{if(freshDay()||state.done)return;const letters=current().split('');for(let i=letters.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[letters[i],letters[j]]=[letters[j],letters[i]]}renderTiles(letters.join(''));$('#word-input').focus()};
$('#hint').onclick=()=>{if(freshDay()||state.done)return;if(state.hintLetter){feedback(`Try adding ${state.hintLetter.toUpperCase()}.`);return}modal(`<h2>Need a hint?</h2><p>Reveal a possible added letter. Hinted moves are marked ✧.</p><div class="modal-actions"><button class="primary-button" id="confirm-hint">Show hint</button><button class="secondary-button" id="cancel-hint">Cancel</button></div>`);$('#cancel-hint').onclick=closeModal;$('#confirm-hint').onclick=()=>{if(freshDay())return;const options=dictionary.next(current());if(!options.length){closeModal();return}state.hintLetter=dictionary.validate(current(),options[0]).added;persist();render();closeModal();$('#word-input').focus()}};
$('#finish').onclick=()=>{if(freshDay()||state.done)return;modal(`<h2>Finish this puzzle?</h2><p>This ends today’s ${mode} chain.</p><div class="modal-actions"><button class="primary-button" id="confirm-finish">Finish</button><button class="secondary-button" id="cancel-finish">Keep playing</button></div>`);$('#cancel-finish').onclick=closeModal;$('#confirm-finish').onclick=()=>{if(freshDay())return;state.done=true;state.endedBy='banked';persist();closeModal();render()}};
function renderResult(){const n=state.chain.length-1;const ended=state.endedBy==='deadend';$('#result').innerHTML=`<div class="result-inner"><h2>${ended?'End of the chain.':'Nicely done.'}</h2><div class="result-score">${n}<small>word${n===1?'':'s'} added${state.hints.length?' · ✧ assisted':''}</small></div><div class="result-buttons"><button class="primary-button" id="share-score">Share result</button><button class="secondary-button" id="try-next">${mode==='hard'?'Try easy':'Try '+(mode==='easy'?'medium':'hard')}</button></div>${!ended?'<div class="result-note"><button class="text-button" id="show-path">See a possible continuation</button></div>':''}</div>`;
  $('#share-score').onclick=showShare;$('#try-next').onclick=()=>{freshDay();loadMode(mode==='easy'?'medium':mode==='medium'?'hard':'easy')};if($('#show-path'))$('#show-path').onclick=showPath;
}
function showPath(){const path=dictionary.best(current());modal(`<h2>${path.length?'One way forward.':'End of the chain.'}</h2><div class="solution">${[current(),...path].map(w=>esc(w.toUpperCase())).join(' → ')}</div>`)}
const siteLink=()=>location.origin+location.pathname;
function shareText(){const n=state.chain.length-1;const icons=state.chain.slice(1).map((_,i)=>state.hints.includes(i+1)?'✧':'🟩').join('');return `One More + #${puzzleNumber(day)} · ${day}\n${mode[0].toUpperCase()+mode.slice(1)} · ${n} word${n===1?'':'s'} grown · ${current().length} letters\n${icons||'🌱'}${state.hints.length?'\n✧ = hint used':''}\nHow far can you grow?\n${siteLink()}#${mode}`}
async function copyText(text,button){try{await navigator.clipboard.writeText(text);toast('Copied. Send a little challenge.');if(button)button.textContent='Copied ✓'}catch{toast('Select and copy the text below.');const node=$('#share-preview');if(node){const range=document.createRange();range.selectNodeContents(node);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range)}}}
function showShare(){const text=shareText();modal(`<h2>Your result</h2><div class="share-preview" id="share-preview">${esc(text)}</div><div class="modal-actions"><button class="primary-button" id="copy-score">Copy result</button>${navigator.share?'<button class="secondary-button" id="native-share">Share…</button>':''}</div>`);$('#copy-score').onclick=()=>copyText(text,$('#copy-score'));if($('#native-share'))$('#native-share').onclick=async()=>{try{await navigator.share({title:'One More',text})}catch(e){if(e.name!=='AbortError')toast('Use Copy result to share.')}}}
function showInvite(){modal(`<h2>Invite friends</h2><div class="share-preview" id="share-preview">${esc(siteLink())}</div><div class="modal-actions"><button class="primary-button" id="copy-invite">Copy game link</button></div>`);$('#copy-invite').onclick=()=>copyText(siteLink(),$('#copy-invite'))}
$('#menu-invite').onclick=showInvite;
function setMenu(open){$('#game-menu').hidden=!open;$('#menu-toggle').setAttribute('aria-expanded',String(open))}
$('#menu-toggle').onclick=()=>setMenu($('#game-menu').hidden);
$('#game-menu').addEventListener('click',e=>{if(e.target.closest('button'))setMenu(false)});
document.addEventListener('click',e=>{if(!e.target.closest('.more-menu'))setMenu(false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#game-menu').hidden){setMenu(false);$('#menu-toggle').focus()}});
function showHelp(){modal(`<h2>How to play</h2><p>Keep every letter. Add one new letter.<br>Use a different root. Rearranging is optional.</p><p class="example-inline">HATE → HEATS → HASTEN</p><p>Each new word scores a point.<br>No timer. No undo. Stop when you’re stuck.</p><div class="modal-actions"><button class="primary-button" id="help-play">Play</button></div><div class="help-links"><button class="text-button" id="word-rules">Word rules</button><button class="text-button" id="invite">Invite friends</button></div>`);$('#help-play').onclick=closeModal;$('#word-rules').onclick=showRules;$('#invite').onclick=showInvite}
$('#help').onclick=showHelp;$('#quick-help').onclick=showHelp;
function showRules(){modal(`<h2>Word rules</h2><p>Easy starts with 4 letters, medium with 6, hard with 8 or more.</p><p>Keep every existing letter, including repeats, and add exactly one. Use a different word family: plurals, tense changes, and related forms of the same root don’t count. Rearranging is optional. PARS → PARSE counts; HASTE → HASTEN doesn’t. Names, abbreviations, spaces and hyphens don’t.</p><p>Words are checked against the <a href="https://github.com/dolph/dictionary" target="_blank" rel="noopener noreferrer">ENABLE word list</a>. Word families use <a href="https://wordnet.princeton.edu/" target="_blank" rel="noopener noreferrer">Princeton WordNet</a> plus curated rules. Some uncommon word families may be missing.</p><p>New puzzles at 6 a.m. Pacific. Progress is saved in this browser. Finishing locks your chain for the day. Hints are marked ✧.</p>`)}
$('#stats').onclick=()=>{let games=0,best=0,total=0;try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith(version+':')){const data=saved(key);if(data?.done&&Array.isArray(data.chain)){const n=data.chain.length-1;games++;best=Math.max(best,n);total+=n}}}}catch{storageAvailable=false}modal(`<h2>Statistics</h2><div class="stat-grid"><div>${games}<small>played</small></div><div>${best}<small>best chain</small></div><div>${total}<small>words added</small></div></div><p>Saved in this browser.${storageAvailable?'':' Saving is unavailable.'}</p>`)};
$$('.mode').forEach(b=>b.onclick=()=>{if(!dictionary)return;if(!freshDay())loadMode(b.dataset.mode);else if(b.dataset.mode!==mode)loadMode(b.dataset.mode)});
$('.mode-list').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();const list=$$('.mode');let i=list.indexOf(document.activeElement);if(e.key==='Home')i=0;else if(e.key==='End')i=2;else i=(i+(e.key==='ArrowRight'||e.key==='ArrowDown'?1:2))%3;list[i].focus();list[i].click()});
function countdown(){if(dictionary)freshDay()}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&dictionary){freshDay();countdown()}});
window.addEventListener('hashchange',()=>{const m=location.hash.slice(1);if(dictionary&&['easy','medium','hard'].includes(m)){freshDay();loadMode(m)}});
async function init(){try{const responses=await Promise.all([fetch('words.txt'),fetch('puzzles.json'),fetch('common.txt'),fetch('families.json')]);if(responses.some(r=>!r.ok))throw Error('Couldn’t load puzzle data');const [text,data,common,families]=await Promise.all([responses[0].text(),responses[1].json(),responses[2].text(),responses[3].json()]);dictionary=makeDictionary(text,common,families);pools=data;day=dailyKey();loadMode(mode);countdown();setInterval(countdown,30000)}catch(e){feedback('The word list didn’t load. Please refresh to try again.','error');$('#word-input').placeholder='Refresh to load your game';$('#letter-tiles').innerHTML='<span class="loading">A little hiccup. Please refresh.</span>';$('#game-panel').setAttribute('aria-busy','false')}}
init();
