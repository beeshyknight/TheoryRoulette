import { THEORY_CARDS } from './theoryData.js';
import { PRACTICE_CASES, WILDCARDS, CASE_MODIFIERS } from './gameData.js';

const app = document.getElementById('app');
const bridge = window.R1Bridge;
const INFORM = THEORY_CARDS.filter(c => c.type === 'inform');
const INTERVENE = THEORY_CARDS.filter(c => c.type === 'intervene');

const modes = [
  {id:'mixed',name:'MIXED RUN',desc:'10 rounds · both decks',rounds:10,type:'all'},
  {id:'inform',name:'THEORIES THAT INFORM',desc:'8 rounds · build explanations',rounds:8,type:'inform'},
  {id:'intervene',name:'THEORIES THAT INTERVENE',desc:'8 rounds · choose responses',rounds:8,type:'intervene'},
  {id:'quick',name:'QUICK DRAW',desc:'5 rounds · faster seminar starter',rounds:5,type:'all'}
];

const prompts = [
  'How could this theory or approach help you understand what is happening?',
  'What might this lens be drawing your attention towards?',
  'What does this theory or approach not explain on its own?',
  'Whose voice or experience could still be missing?',
  'What might this mean for what you do next?'
];

const state = {
  screen:'home', cursor:0, mode:null, round:0, deckIndex:0, used:[],
  card:null, caseItem:null, modifier:null, promptIndex:0, linkIndex:0,
  linkOptions:[], linked:null, wildcard:null, score:0, roundScore:0, streak:0,
  progress:{xp:0,seen:{},bestStreak:0,runs:0}, lastShake:0
};

const esc = (s='') => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const wrap = (n,len) => ((n%len)+len)%len;
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const pad = n => String(n).padStart(3,'0');

function top(label=''){
  return `<div class="top"><div class="brand">THEORY ROULETTE</div><div class="grow"></div><div class="badge">${esc(label)}</div><div class="badge">XP <b>${state.progress.xp}</b></div></div>`;
}
function currentDeck(){
  let base = state.mode?.type === 'inform' ? INFORM : state.mode?.type === 'intervene' ? INTERVENE : THEORY_CARDS;
  const remaining = base.filter(c => !state.used.includes(c.id));
  return remaining.length ? remaining : base;
}
function mini(card){
  const icon=card.type==='inform'?'card_inform.png':'card_intervene.png';
  return `<div class="mini"><img src="./assets/images/${icon}" alt=""><div class="mini-copy"><small>${card.type==='inform'?'THEORY THAT INFORMS':'APPROACH THAT INTERVENES'}</small><b>${esc(card.name)}</b></div></div>`;
}
function renderHome(){
  const rail=modes.map((m,i)=>{let d=i-state.cursor;if(d>2)d-=modes.length;if(d<-2)d+=modes.length;const cls=d===0?'current':d===-1?'prev':d===1?'next':'far';return `<div class="mode-card ${cls}"><b>${esc(m.name)}</b><span>${esc(m.desc)}</span></div>`}).join('');
  return `<section class="screen">${top('100 CARDS')}<div class="home-art"><img class="logo" src="./assets/images/logo.png" alt=""><img class="card-a" src="./assets/images/card_inform.png" alt=""><img class="card-b" src="./assets/images/card_intervene.png" alt=""></div><h1 class="home-title">SPIN.<br>THINK. LINK.</h1><p class="home-copy">Flick through the deck, draw a lens, use it on a practice situation, then challenge it with another perspective.</p><div class="mode-strip">${rail}</div><div class="hint"><b>WHEEL</b> choose · <b>BUTTON</b> start</div></section>`;
}
function cardHtml(card,pos){
  return `<article class="card ${card.type} p${pos}" data-pos="${pos}"><div class="type">${card.type==='inform'?'THEORY · INFORM':'APPROACH · INTERVENE'}</div><div class="number">#${pad(card.id)}</div><h2>${esc(card.name)}</h2><p>${esc(card.summary)}</p><div class="family">${esc(card.family)}</div></article>`;
}
function renderDeck(){
  const deck=currentDeck(); state.deckIndex=wrap(state.deckIndex,deck.length);
  const stack=[-2,-1,0,1,2].map(pos=>cardHtml(deck[wrap(state.deckIndex+pos,deck.length)],pos)).join('');
  return `<section class="screen">${top(`ROUND ${state.round+1}/${state.mode.rounds}`)}<div class="deck-title">FLICK THE DECK</div><div class="deck-sub">No repeats in this run · ${currentDeck().length} still available</div><div class="deck" id="deck">${stack}</div><div class="hint"><b>WHEEL</b> flick · <b>BUTTON</b> draw</div></section>`;
}
function renderCase(){
  return `<section class="screen">${top('PRACTICE')}${mini(state.card)}<div class="casebox"><h2>${esc(state.caseItem.title)}</h2><p>${esc(state.caseItem.text)}</p>${state.modifier?`<p class="new-info">${esc(state.modifier)}</p>`:''}</div><div class="hint"><b>BUTTON</b> take this card into the situation · <b>SHAKE</b> wildcard</div></section>`;
}
function renderReflect(){
  return `<section class="screen">${top(`QUESTION ${state.promptIndex+1}/5`)}${mini(state.card)}<div class="question"><small>THINK OR SAY IT ALOUD</small><b>${esc(prompts[state.promptIndex])}</b><div class="say"><strong>R1 NOTE:</strong> speech-to-text is not exposed by the public SDK, so the game does not pretend to grade what you say. Use the prompt to discuss or speak your reasoning.</div></div><div class="steps">${prompts.map((_,i)=>`<span class="${i===state.promptIndex?'on':''}"></span>`).join('')}</div><div class="hint"><b>WHEEL</b> change prompt · <b>BUTTON</b> turn the card over</div></section>`;
}
function renderImpact(){
  return `<section class="screen">${top('TURN IT OVER')}${mini(state.card)}<div class="flip-title">What does this card actually add?</div><div class="reveal helps"><small>HELPS YOU NOTICE</small><p>${esc(state.card.helps)}</p></div><div class="reveal limits"><small>DOES NOT EXPLAIN ALONE</small><p>${esc(state.card.limits)}</p></div><div class="hint"><b>BUTTON</b> build a bridge · <b>SHAKE</b> widen the frame</div></section>`;
}
function buildLinks(){
  const pool=state.card.type==='inform'?INTERVENE:INFORM;
  const scored=[...pool].map(c=>({c,s:(c.family===state.card.family?2:0)+Math.random()*2})).sort((a,b)=>b.s-a.s).slice(0,5).map(x=>x.c);
  state.linkOptions=scored; state.linkIndex=0;
}
function renderLink(){
  const prompt=state.card.type==='inform'?'Which intervention could this theory inform?':'Which informing theory could deepen or challenge this intervention?';
  const rail=state.linkOptions.map((c,i)=>{let d=i-state.linkIndex;if(d>2)d-=state.linkOptions.length;if(d<-2)d+=state.linkOptions.length;const cls=d===0?'current':d===-1?'prev':d===1?'next':'far';return `<article class="link-card ${c.type} ${cls}"><small>${c.type==='inform'?'INFORM':'INTERVENE'}</small><h3>${esc(c.name)}</h3><p>${esc(c.summary)}</p></article>`}).join('');
  return `<section class="screen">${top('BUILD THE BRIDGE')}<div class="link-prompt">${esc(prompt)}</div><div class="link-rail">${rail}</div><div class="hint"><b>WHEEL</b> compare · <b>BUTTON</b> link</div></section>`;
}
function renderResult(){
  return `<section class="screen">${top('ROUND COMPLETE')}<div class="score">+${state.roundScore}</div><div class="score-label">REFLECTION XP</div><div class="bridge"><small>YOUR THEORY–PRACTICE BRIDGE</small><b>${esc(state.card.name)} ↔ ${esc(state.linked.name)}</b><p>Now ask whether the second card strengthens, challenges or changes what you would actually do.</p></div><div class="stats"><div class="stat"><b>${state.streak}</b><span>streak</span></div><div class="stat"><b>${Object.keys(state.progress.seen).length}</b><span>collected</span></div><div class="stat"><b>${state.score}</b><span>run xp</span></div></div><div class="hint"><b>BUTTON</b> ${state.round+1>=state.mode.rounds?'finish':'next round'}</div></section>`;
}
function renderEnd(){
  return `<section class="screen">${top('RUN COMPLETE')}<div class="home-art"><img class="logo" src="./assets/images/logo.png" alt=""></div><h1 class="home-title">DECK<br>COMPLETE.</h1><p class="home-copy">You scored <b>${state.score} XP</b> and built ${state.streak} theory–practice links. Next run, deliberately choose cards you would normally overlook.</p><div class="stats"><div class="stat"><b>${Object.keys(state.progress.seen).length}</b><span>of 100 seen</span></div><div class="stat"><b>${state.progress.bestStreak}</b><span>best streak</span></div><div class="stat"><b>${state.progress.runs}</b><span>runs</span></div></div><div class="hint"><b>BUTTON</b> return home</div></section>`;
}
function wildOverlay(){
  if(!state.wildcard)return '';
  return `<div class="wild-overlay"><div class="wild"><img src="./assets/images/wildcard.png" alt=""><small>SHAKE WILDCARD · +75 XP</small><h2>${esc(state.wildcard.name)}</h2><p>${esc(state.wildcard.prompt)}</p><div class="bonus">Widen the formulation before you continue. BUTTON when discussed.</div></div></div>`;
}
function render(){
  try{
    let html='';
    if(state.screen==='home') html=renderHome();
    else if(state.screen==='deck') html=renderDeck();
    else if(state.screen==='case') html=renderCase();
    else if(state.screen==='reflect') html=renderReflect();
    else if(state.screen==='impact') html=renderImpact();
    else if(state.screen==='link') html=renderLink();
    else if(state.screen==='result') html=renderResult();
    else if(state.screen==='end') html=renderEnd();
    app.innerHTML=html+wildOverlay();
  }catch(error){
    console.error(error);
    app.innerHTML=`<section class="screen error"><h1>Theory Roulette error</h1><p>The Creation loaded but could not draw this screen.</p><p>${esc(error.message||String(error))}</p></section>`;
  }
}
function start(){
  state.mode=modes[state.cursor];state.round=0;state.score=0;state.streak=0;state.used=[];state.deckIndex=0;state.screen='deck';render();
}
function draw(){
  const deck=currentDeck(); if(!deck.length)return;
  state.card=deck[wrap(state.deckIndex,deck.length)];state.used.push(state.card.id);state.progress.seen[state.card.id]=true;
  const p0=app.querySelector('.card.p0');const left=app.querySelectorAll('.card.p-1,.card.p-2');const right=app.querySelectorAll('.card.p1,.card.p2');
  p0?.classList.add('drawn');left.forEach(x=>x.classList.add('toss-left'));right.forEach(x=>x.classList.add('toss-right'));
  const related=PRACTICE_CASES.map(c=>({c,s:c.tags.includes(state.card.family)?3:Math.random()*2})).sort((a,b)=>b.s-a.s).slice(0,8).map(x=>x.c);
  state.caseItem=pick(related);state.modifier=Math.random()<.55?pick(CASE_MODIFIERS):null;state.promptIndex=0;state.roundScore=100;
  setTimeout(()=>{state.screen='case';render();save();},360);
}
function selectLink(){
  state.linked=state.linkOptions[state.linkIndex];state.roundScore+=75;state.score+=state.roundScore;state.streak+=1;state.progress.xp+=state.roundScore;state.progress.bestStreak=Math.max(state.progress.bestStreak,state.streak);state.screen='result';save();render();
}
function nextRound(){
  state.round+=1;
  if(state.round>=state.mode.rounds){state.progress.runs+=1;state.screen='end';save();render();return;}
  state.card=null;state.linked=null;state.wildcard=null;state.deckIndex=0;state.screen='deck';render();
}
function onUp(){
  if(state.wildcard)return;
  if(state.screen==='home'){state.cursor=wrap(state.cursor-1,modes.length);render();}
  else if(state.screen==='deck'){state.deckIndex=wrap(state.deckIndex-1,currentDeck().length);render();}
  else if(state.screen==='reflect'){state.promptIndex=wrap(state.promptIndex-1,prompts.length);render();}
  else if(state.screen==='link'){state.linkIndex=wrap(state.linkIndex-1,state.linkOptions.length);render();}
}
function onDown(){
  if(state.wildcard)return;
  if(state.screen==='home'){state.cursor=wrap(state.cursor+1,modes.length);render();}
  else if(state.screen==='deck'){state.deckIndex=wrap(state.deckIndex+1,currentDeck().length);render();}
  else if(state.screen==='reflect'){state.promptIndex=wrap(state.promptIndex+1,prompts.length);render();}
  else if(state.screen==='link'){state.linkIndex=wrap(state.linkIndex+1,state.linkOptions.length);render();}
}
function onClick(){
  if(state.wildcard){state.roundScore+=75;state.wildcard=null;render();return;}
  if(state.screen==='home')start();
  else if(state.screen==='deck')draw();
  else if(state.screen==='case'){state.screen='reflect';render();}
  else if(state.screen==='reflect'){state.roundScore+=25;state.screen='impact';render();}
  else if(state.screen==='impact'){buildLinks();state.screen='link';render();}
  else if(state.screen==='link')selectLink();
  else if(state.screen==='result')nextRound();
  else if(state.screen==='end'){state.screen='home';state.mode=null;render();}
}
function onLong(){
  if(state.wildcard||!state.card)return;
  if(['case','reflect','impact'].includes(state.screen)){state.promptIndex=2;state.screen='reflect';state.roundScore+=10;render();}
}
function triggerWild(){
  if(state.wildcard||!['case','reflect','impact','link'].includes(state.screen))return;
  state.wildcard=pick(WILDCARDS);render();
}
let lastMag=null;
function setupShake(){
  try{
    const sensor=window.creationSensors?.accelerometer;
    if(!sensor?.start)return;
    sensor.start((d)=>{
      const x=Number(d.x||0),y=Number(d.y||0),z=Number(d.z||0);const mag=Math.sqrt(x*x+y*y+z*z);const now=Date.now();
      if(lastMag!==null&&Math.abs(mag-lastMag)>1.35&&now-state.lastShake>1800){state.lastShake=now;triggerWild();}
      lastMag=mag;
    },{frequency:30});
  }catch(e){console.warn('Shake unavailable',e);}
}
async function save(){await bridge?.save(state.progress)}
async function load(){const p=await bridge?.load();if(p&&typeof p==='object')state.progress={...state.progress,...p,seen:p.seen||{}};render();}

bridge?.onUp(onUp);bridge?.onDown(onDown);bridge?.onClick(onClick);bridge?.onLong(onLong);
window.addEventListener('shakeTheoryRoulette',triggerWild); // simulator helper

if(!THEORY_CARDS.length){app.innerHTML='<section class="screen error"><h1>No cards found</h1><p>theoryData.js did not load.</p></section>';}
else{render();load();setupShake();}
