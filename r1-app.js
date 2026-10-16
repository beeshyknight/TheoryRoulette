import { THEORY_CARDS, STARTER_IDS } from './theoryData.js';
import { CASE_ARCHETYPES, WORD_HUNTS, WILDCARDS } from './gameData.js';

const app = document.getElementById('app');
const bridge = window.R1Bridge;
const byId = Object.fromEntries(THEORY_CARDS.map(c => [c.id, c]));
const INFORM = THEORY_CARDS.filter(c => c.type === 'inform');
const INTERVENE = THEORY_CARDS.filter(c => c.type === 'intervene');

const menus = [
  {id:'learn',name:'LEARN',tag:'THEORY SCHOOL',desc:'Study cards, see full references and unlock new theories through short games.'},
  {id:'build',name:'BUILD',tag:'MY ACTIVE DECK',desc:'Choose 12 theories and interventions. Better-connected decks create stronger options in Apply.'},
  {id:'apply',name:'APPLY',tag:'THEORY ROULETTE',desc:'Follow one changing practice story. Draw, explain, challenge and connect your deck.'},
  {id:'collection',name:'COLLECTION',tag:'150 CARDS',desc:'See what you have discovered, how well you know it and which disciplines are still missing.'}
];

const defaultProgress = () => ({
  xp:0,
  unlocked:[...STARTER_IDS],
  deck:[...STARTER_IDS],
  mastery:{},
  studied:{},
  applied:{},
  connected:{},
  huntsWon:0,
  casesDone:0,
  runs:0,
  bestChain:0,
  milestone:0
});

const state = {
  screen:'home', cursor:0, page:0, cardIndex:0, filterIndex:0,
  progress:defaultProgress(), message:'',
  hunt:null, huntRow:0, huntResult:null,
  caseRun:null, activeCard:null, drawIndex:0, usedRun:[],
  promptIndex:0, linkIndex:0, linkOptions:[], linked:null,
  roundXP:0, runXP:0, chain:0, wildcard:null, unlockedNow:null
};

const esc = (s='') => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const wrap = (n,len) => len ? ((n%len)+len)%len : 0;
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const shuffle = arr => [...arr].sort(() => Math.random()-.5);
const pad = n => String(n).padStart(3,'0');
const unlocked = id => state.progress.unlocked.includes(id);
const inDeck = id => state.progress.deck.includes(id);
const unlockedCards = () => THEORY_CARDS.filter(c => unlocked(c.id));
const activeDeck = () => state.progress.deck.map(id => byId[id]).filter(Boolean);
const save = () => bridge.save(state.progress);

function masteryScore(id){
  const studied = state.progress.studied[id] ? 1 : 0;
  const applied = Math.min(2, state.progress.applied[id] || 0);
  const connected = Math.min(2, state.progress.connected[id] || 0);
  return Math.min(4, studied + (applied>0?1:0) + (applied>1?1:0) + (connected>1?1:0));
}
function dots(id){
  const n=masteryScore(id);
  return [0,1,2,3].map(i=>`<i class="leveldot ${i<n?'on':''}"></i>`).join('');
}
function top(label=''){
  return `<div class="top"><div class="brand">THEORY ROULETTE 2</div><div class="grow"></div><div class="badge">${esc(label)}</div><div class="badge">XP <b>${state.progress.xp}</b></div></div>`;
}
function railClass(i,current,len){
  let d=i-current;
  if(d>len/2)d-=len;
  if(d<-len/2)d+=len;
  if(d===0)return 'current';
  if(d===-1)return 'prev';
  if(d===1)return 'next';
  return 'far';
}
function cardAsset(c){ return c.type==='inform'?'card_inform.png':'card_intervene.png'; }
function fiveRail(list,index,renderer){
  if(!list.length)return '';
  return [-2,-1,0,1,2].map(pos=>{
    const i=wrap(index+pos,list.length);
    const cls=pos===0?'current':pos===-1?'prev':pos===1?'next':'far';
    return renderer(list[i],cls,i);
  }).join('');
}

function renderHome(){
  const rail=menus.map((m,i)=>`<article class="menu-card ${railClass(i,state.cursor,menus.length)}">
    <small>${m.tag}</small><h2>${m.name}</h2><p>${m.desc}</p>
    <div class="count">${m.id==='learn'?`${state.progress.unlocked.length}/150 discovered`:m.id==='build'?`${state.progress.deck.length}/12 active`:m.id==='apply'?`${state.progress.runs} runs completed`:`${masteredCount()} mastered`}</div>
  </article>`).join('');
  return `<section class="screen">${top('LEARN · BUILD · APPLY')}
    <div class="hero"><img class="logo" src="logo.png"><img class="fan" src="card_inform.png"><img class="fan two" src="card_intervene.png">
      <div class="hero-copy"><b>BUILD YOUR<br>THEORY DECK.</b><span>Collect theories, understand their relationships, then use them on practice.</span></div>
    </div>
    <div class="menu-rail">${rail}</div>
    <div class="home-stats"><div class="home-stat"><b>${state.progress.unlocked.length}</b><span>discovered</span></div><div class="home-stat"><b>${state.progress.deck.length}</b><span>active deck</span></div><div class="home-stat"><b>${masteredCount()}</b><span>mastered</span></div></div>
    <div class="hint"><b>WHEEL</b> choose · <b>BUTTON</b> open</div>
  </section>`;
}
function masteredCount(){ return THEORY_CARDS.filter(c=>masteryScore(c.id)>=4).length; }

function renderLearnMenu(){
  const opts=[
    {name:'STUDY CARDS',desc:'Read what a theory helps explain, its limits, meaningful links and full APA 7 reference.'},
    {name:'WORD HUNT',desc:'Find a hidden concept to discover a new theory card.'},
    {name:'CONNECTIONS',desc:'Browse your collection by following the relationships between cards.'}
  ];
  const rail=opts.map((m,i)=>`<article class="menu-card ${railClass(i,state.cursor,opts.length)}"><small>THEORY SCHOOL</small><h2>${m.name}</h2><p>${m.desc}</p><div class="count">${i===0?`${state.progress.unlocked.length} cards available`:i===1?`${state.progress.huntsWon} hunts solved`:`${connectionCount()} known links`}</div></article>`).join('');
  return `<section class="screen">${top('THEORY SCHOOL')}<div><div class="kicker">LEARN BEFORE YOU APPLY</div><h1 class="title">THEORY SCHOOL</h1><p class="sub">A card becomes more useful when you know what it explains, what it misses and what sits beside it.</p></div><div class="menu-rail">${rail}</div><div class="hint"><b>WHEEL</b> choose · <b>BUTTON</b> open · <b>HOLD</b> home</div></section>`;
}
function connectionCount(){
  const s=new Set();
  THEORY_CARDS.forEach(c=>c.links.forEach(l=>{ if(unlocked(c.id)&&unlocked(l.id)) s.add([c.id,l.id].sort((a,b)=>a-b).join('-')); }));
  return s.size;
}

function cardHtml(c, cls, locked=false, build=false){
  return `<article class="tcard ${c.type} ${cls} ${locked?'locked':''}">
    <small>${c.type==='inform'?'THEORY THAT INFORMS':'APPROACH THAT INTERVENES'}</small><span class="num">#${pad(c.id)}</span>
    ${locked?`<div class="lockmark">?</div><h2>UNDISCOVERED</h2><p>Learn and complete Theory Hunts to reveal more of the collection.</p>`:`<h2>${esc(c.name)}</h2><p>${esc(c.summary)}</p><footer><span>${esc(c.discipline)}</span><span>${dots(c.id)}</span></footer>${build?`<span class="togglepill">${inDeck(c.id)?'IN DECK':'ADD'}</span>`:''}`}
  </article>`;
}
function renderStudyBrowse(){
  const list=unlockedCards();
  state.cardIndex=wrap(state.cardIndex,list.length);
  const rail=fiveRail(list,state.cardIndex,(c,cls)=>cardHtml(c,cls));
  const c=list[state.cardIndex];
  return `<section class="screen">${top(`${list.length}/150`)}<div class="deck-head"><h1>STUDY CARDS</h1><span>${esc(c.discipline)}</span></div><div class="card-rail">${rail}</div><div class="hint"><b>WHEEL</b> browse · <b>BUTTON</b> study · <b>HOLD</b> back</div></section>`;
}
function studyPages(c){
  const links=c.links.slice(0,3).map(l=>{
    const other=byId[l.id];
    return `<div class="linkline"><b>${esc(l.kind.toUpperCase())} · ${esc(other.name)}</b><span>${esc(l.explanation)}</span></div>`;
  }).join('');
  return [
    `<div class="kicker">${esc(c.discipline)} · ${esc(c.level)}</div><h2>${esc(c.name)}</h2><p>${esc(c.summary)}</p><div class="revealbox good"><small>HELPS YOU NOTICE</small><p>${esc(c.helps)}</p></div>`,
    `<div class="kicker">CRITICAL USE</div><h2>What might it miss?</h2><div class="revealbox limit"><small>DOES NOT EXPLAIN ALONE</small><p>${esc(c.limits)}</p></div><p>Use this as a lens rather than as a complete explanation of a person.</p>`,
    `<div class="kicker">THEORY NETWORK</div><h2>Meaningful links</h2>${links}`,
    `<div class="kicker">APA 7 REFERENCE</div><h2>Source</h2><p class="ref">${esc(c.reference)}</p><div class="revealbox"><small>WHY THE REFERENCE IS HERE</small><p>The collection uses a seminal source where the card represents an established theory, and a contemporary source where it represents a later practice approach or framework.</p></div>`
  ];
}
function renderStudyDetail(){
  const c=byId[state.selectedCard];
  const pages=studyPages(c); state.page=wrap(state.page,pages.length);
  return `<section class="screen">${top(`PAGE ${state.page+1}/4`)}<div class="card-mini"><img src="${cardAsset(c)}"><div><small>${c.type==='inform'?'INFORM':'INTERVENE'} · #${pad(c.id)}</small><b>${esc(c.name)}</b></div></div><div class="detail">${pages[state.page]}</div><div class="tabs">${pages.map((_,i)=>`<span class="${i===state.page?'on':''}"></span>`).join('')}</div><div class="hint"><b>WHEEL</b> turn pages · <b>BUTTON</b> mark studied · <b>HOLD</b> back</div></section>`;
}

function huntWord(c){
  const candidates=[...(c.keywords||[]),...c.name.split(/\s+/)].map(x=>x.replace(/[^A-Za-z]/g,'').toUpperCase()).filter(x=>x.length>=4&&x.length<=8);
  return candidates[0] || 'THEORY';
}
function newHunt(){
  const locked=THEORY_CARDS.filter(c=>!unlocked(c.id));
  const c=locked.length?pick(locked):pick(THEORY_CARDS);
  const word=huntWord(c), width=8, rows=6, answer=Math.floor(Math.random()*rows);
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const grid=[];
  for(let r=0;r<rows;r++){
    let arr=Array.from({length:width},()=>alphabet[Math.floor(Math.random()*alphabet.length)]);
    if(r===answer){
      const start=Math.floor(Math.random()*(width-word.length+1));
      word.split('').forEach((ch,i)=>arr[start+i]=ch);
    }
    grid.push(arr.join(''));
  }
  state.hunt={card:c,word,grid,answer}; state.huntRow=0; state.huntResult=null;
}
function renderHunt(){
  if(!state.hunt)newHunt();
  const h=state.hunt;
  if(state.huntResult){
    const won=state.huntResult==='win';
    return `<section class="screen">${top('WORD HUNT')}<div class="wordresult panel ${won?'green':'orange'}"><div class="kicker">${won?'CONCEPT FOUND':'NOT THAT ROW'}</div><h2>${won?esc(h.card.name):'Try another hunt'}</h2><p>${won?esc(h.card.summary):`The hidden concept was ${esc(h.word)}. The important part is recognising the idea, not guessing letters.`}</p>${won?`<p><b>+30 XP</b> · ${unlocked(h.card.id)?'mastery practice':'new card discovered'}</p>`:''}</div><div class="hint"><b>BUTTON</b> another hunt · <b>HOLD</b> back</div></section>`;
  }
  return `<section class="screen">${top('DISCOVER A CARD')}<div class="hunt-intro"><h1>WORD HUNT</h1><p>Find the row containing the concept. Solving it reveals the theory behind the clue.</p></div><div class="wordtarget">${esc(h.word)}</div><div class="clue">${esc(h.card.helps)}</div><div class="wordgrid">${h.grid.map((row,i)=>`<div class="wordrow ${i===state.huntRow?'current':''}">${row}</div>`).join('')}</div><div class="hint"><b>WHEEL</b> choose row · <b>BUTTON</b> select · <b>HOLD</b> back</div></section>`;
}

function renderConnections(){
  const list=unlockedCards(); state.cardIndex=wrap(state.cardIndex,list.length);
  const c=list[state.cardIndex];
  const links=c.links.filter(l=>unlocked(l.id)).slice(0,4);
  return `<section class="screen">${top('CONNECTION MAP')}<div class="card-mini"><img src="${cardAsset(c)}"><div><small>${esc(c.discipline)}</small><b>${esc(c.name)}</b></div></div><div class="detail"><div class="kicker">WHY CARDS LINK</div><h2>${links.length?`${links.length} visible connections`:'No unlocked links yet'}</h2>${links.map(l=>`<div class="linkline"><b>${esc(l.kind.toUpperCase())} · ${esc(byId[l.id].name)}</b><span>${esc(l.explanation)}</span></div>`).join('')||'<p>Discover more cards to reveal this theory’s network.</p>'}</div><div class="hint"><b>WHEEL</b> next theory · <b>BUTTON</b> study it · <b>HOLD</b> back</div></section>`;
}

function deckSynergy(){
  const ids=new Set(state.progress.deck); let total=0,strong=0;
  state.progress.deck.forEach(id=>(byId[id]?.links||[]).forEach(l=>{if(ids.has(l.id)&&id<l.id){total++;if(l.strength>=2)strong++;}}));
  return {total,strong};
}
function renderBuild(){
  const list=unlockedCards(); state.cardIndex=wrap(state.cardIndex,list.length);
  const c=list[state.cardIndex], syn=deckSynergy();
  const slots=Array.from({length:12},(_,i)=>`<div class="slot ${i<state.progress.deck.length?'filled':''}">${i<state.progress.deck.length?i+1:'·'}</div>`).join('');
  const rail=fiveRail(list,state.cardIndex,(x,cls)=>cardHtml(x,cls,false,true));
  return `<section class="screen">${top(`${state.progress.deck.length}/12`)}<div class="deck-head"><h1>BUILD MY DECK</h1><span>${syn.strong} strong links</span></div><div class="deckslots">${slots}</div><div class="buildmsg">${state.message||'Mix informing theories and interventions. Connections matter.'}</div><div class="card-rail" style="height:184px">${rail}</div><div class="hint"><b>WHEEL</b> browse · <b>BUTTON</b> add/remove · <b>HOLD</b> home</div></section>`;
}

function renderCollection(){
  const filters=['ALL','PSYCHOLOGY','SOCIOLOGY','NURSING','SOCIAL WORK','INTERVENTIONS'];
  const f=filters[state.filterIndex];
  let list=THEORY_CARDS;
  if(f==='PSYCHOLOGY')list=list.filter(c=>c.discipline.includes('Psychology'));
  if(f==='SOCIOLOGY')list=list.filter(c=>c.discipline.includes('Sociology'));
  if(f==='NURSING')list=list.filter(c=>c.discipline.includes('Nursing'));
  if(f==='SOCIAL WORK')list=list.filter(c=>c.discipline.includes('Social work'));
  if(f==='INTERVENTIONS')list=list.filter(c=>c.type==='intervene');
  if(!list.length)list=THEORY_CARDS;
  state.cardIndex=wrap(state.cardIndex,list.length);
  const c=list[state.cardIndex];
  const rail=fiveRail(list,state.cardIndex,(x,cls)=>cardHtml(x,cls,!unlocked(x.id)));
  const disc=list.filter(x=>unlocked(x.id)).length;
  return `<section class="screen">${top('COLLECTION')}<div class="filters">${filters.map((x,i)=>`<span class="filter ${i===state.filterIndex?'on':''}">${x==='INTERVENTIONS'?'INTERV.':x.slice(0,5)}</span>`).join('')}</div><div class="collection-summary"><div><b>${disc}/${list.length}</b><span>found</span></div><div><b>${masteredCount()}</b><span>mastered</span></div><div><b>${connectionCount()}</b><span>links</span></div></div><div class="card-rail" style="height:181px">${rail}</div><div class="hint"><b>WHEEL</b> browse · <b>BUTTON</b> ${unlocked(c.id)?'study':'locked'} · <b>HOLD</b> next filter · last filter exits</div></section>`;
}

function makeCase(){
  const a=pick(CASE_ARCHETYPES), name=pick(a.people);
  const fmt=s=>s.replace(/\{name\}/g,name);
  const updates=shuffle(a.updates).map(fmt);
  return {archetype:a.id,title:a.title,name,
    opening:[pick(a.base),pick(a.concern),pick(a.voice),pick(a.system)].map(fmt),
    updates,outcome:fmt(pick(a.outcomes)),chapter:0
  };
}
function startApply(){
  if(state.progress.deck.length<6){
    state.screen='build'; state.cardIndex=0; state.message='Build at least 6 cards before Apply.'; return;
  }
  state.caseRun=makeCase(); state.usedRun=[]; state.runXP=0; state.chain=0; state.drawIndex=0; state.activeCard=null; state.unlockedNow=null; state.screen='caseIntro';
}
function renderCaseIntro(update=false){
  const c=state.caseRun;
  if(update){
    const text=c.updates[Math.min(c.chapter-1,c.updates.length-1)];
    return `<section class="screen">${top(`CHAPTER ${c.chapter+1}/5`)}<div class="casehead">NEW INFORMATION · SAME PERSON</div><h1 class="case-title">${esc(c.name)} · ${esc(c.title)}</h1><div class="case"><p class="new">${esc(text)}</p><p>Does this change which theory you trust most? A good formulation should be able to change when the information changes.</p><p><b>Keep the earlier evidence.</b> Do not replace one simple explanation with another.</p></div><div class="hint"><b>BUTTON</b> return to your deck · <b>HOLD</b> wildcard</div></section>`;
  }
  return `<section class="screen">${top('NEW CASE')}<div class="casehead">PROCEDURALLY ASSEMBLED CASE</div><h1 class="case-title">${esc(c.name)} · ${esc(c.title)}</h1><div class="case"><p class="person">${esc(c.opening[0])}</p><p>${esc(c.opening[1])}</p><p>${esc(c.opening[2])}</p><p>${esc(c.opening[3])}</p></div><div class="hint"><b>BUTTON</b> draw your first lens · <b>HOLD</b> wildcard</div></section>`;
}
function runDeck(){
  const deck=activeDeck();
  const remain=deck.filter(c=>!state.usedRun.includes(c.id));
  return remain.length?remain:deck;
}
function renderDraw(){
  const deck=runDeck(); state.drawIndex=wrap(state.drawIndex,deck.length);
  const rail=fiveRail(deck,state.drawIndex,(c,cls)=>cardHtml(c,cls));
  return `<section class="screen">${top(`CHAPTER ${state.caseRun.chapter+1}/5`)}<div class="deck-head"><h1>DRAW A LENS</h1><span>${deck.length} available</span></div><div class="card-rail">${rail}</div><div class="hint"><b>WHEEL</b> flick deck · <b>BUTTON</b> draw · <b>HOLD</b> wildcard</div></section>`;
}
const applyPrompts=[
  'How does this card help you understand what is happening now?',
  'What evidence in the story supports this lens, and what evidence does not?',
  'What does this theory or approach still fail to explain?',
  'Whose voice, power or environment could be missing from this explanation?',
  'What would actually change in practice if you took this lens seriously?'
];
function renderApplyQuestion(){
  const c=state.activeCard;
  return `<section class="screen">${top(`REFLECT ${state.promptIndex+1}/5`)}<div class="card-mini"><img src="${cardAsset(c)}"><div><small>${esc(c.discipline)} · #${pad(c.id)}</small><b>${esc(c.name)}</b></div></div><div class="applyq"><small>DISCUSS OR SAY IT ALOUD</small><b>${esc(applyPrompts[state.promptIndex])}</b><p>The game does not pretend reflective judgement has one correct sentence. Your XP comes from the quality of the connection you build next, not from speaking quickly.</p></div><div class="hint"><b>WHEEL</b> change question · <b>BUTTON</b> turn card over · <b>HOLD</b> wildcard</div></section>`;
}
function renderReveal(){
  const c=state.activeCard;
  return `<section class="screen">${top('TURN THE CARD OVER')}<div class="card-mini"><img src="${cardAsset(c)}"><div><small>${esc(c.discipline)}</small><b>${esc(c.name)}</b></div></div><div class="revealbox good"><small>WHAT THIS LENS ADDS</small><p>${esc(c.helps)}</p></div><div class="revealbox limit"><small>WHAT IT DOES NOT EXPLAIN ALONE</small><p>${esc(c.limits)}</p></div><div class="hint"><b>BUTTON</b> connect another card · <b>HOLD</b> wildcard</div></section>`;
}
function weakRelation(a,b){
  const shared=(a.keywords||[]).filter(k=>(b.keywords||[]).includes(k));
  return {id:b.id,kind:a.type===b.type?'possible overlap':'possible bridge',strength:shared.length?1:0,explanation:shared.length?`Both cards touch on ${shared.slice(0,2).join(' and ')}, but the connection is less established than the stronger links in the theory map.`:'This is an unusual pairing. It may still be defensible, but you would need to explain the mechanism rather than simply placing the cards together.'};
}
function buildLinkOptions(){
  const a=state.activeCard, deck=activeDeck().filter(c=>c.id!==a.id);
  let opts=[];
  for(const l of a.links){
    const b=deck.find(c=>c.id===l.id);
    if(b)opts.push({card:b,rel:l});
  }
  const rest=shuffle(deck.filter(c=>!opts.some(o=>o.card.id===c.id)));
  while(opts.length<4&&rest.length){ const b=rest.shift(); opts.push({card:b,rel:weakRelation(a,b)}); }
  opts.sort((x,y)=>y.rel.strength-x.rel.strength);
  state.linkOptions=opts.slice(0,4); state.linkIndex=0;
}
function renderLink(){
  const opts=state.linkOptions;
  const rail=opts.map((o,i)=>`<article class="linkcard ${railClass(i,state.linkIndex,opts.length)}"><span class="kind">${esc(o.rel.kind.toUpperCase())}</span><span class="power">${'●'.repeat(Math.max(1,o.rel.strength))}</span><strong>${esc(o.card.name)}</strong><p>${esc(o.card.summary)}</p></article>`).join('');
  return `<section class="screen">${top('BUILD THE CONNECTION')}<div class="kicker">NOT EVERY CARD LINKS EQUALLY</div><p class="sub">Choose the card that best strengthens, challenges or changes your current explanation.</p><div class="linkchoice">${rail}</div><div class="hint"><b>WHEEL</b> compare · <b>BUTTON</b> connect · <b>HOLD</b> wildcard</div></section>`;
}
function renderResult(){
  const o=state.linked;
  return `<section class="screen">${top('CONNECTION MADE')}<div class="resultxp">+${state.roundXP}</div><div class="resultlabel">LEARNING XP · NOT A FIXED ROUND SCORE</div><div class="reason"><b>${esc(state.activeCard.name)} → ${esc(o.card.name)}</b><p>${esc(o.rel.explanation)}</p></div>${state.unlockedNow?`<div class="revealbox good"><small>NEW CARD DISCOVERED</small><p>${esc(state.unlockedNow.name)} joined your collection because your XP crossed a discovery milestone.</p></div>`:''}<div class="chapterstats"><div><b>${state.chain}</b><span>chain</span></div><div><b>${state.runXP}</b><span>run xp</span></div><div><b>${state.progress.unlocked.length}</b><span>cards</span></div></div><div class="hint"><b>BUTTON</b> ${state.caseRun.chapter>=4?'finish case':'reveal new information'} · <b>HOLD</b> wildcard</div></section>`;
}
function renderEnd(){
  const c=state.caseRun;
  return `<section class="screen">${top('CASE COMPLETE')}<div class="kicker">RETURN TO THE WHOLE PERSON</div><h1 class="title">${esc(c.name)} is more than a theory.</h1><div class="panel gold"><p style="font-size:9px;line-height:1.25;margin:0">${esc(c.outcome)}</p></div><div class="reason"><b>Your run: ${state.runXP} XP</b><p>You used ${state.chain} connected lenses. The aim is not to find one final theory, but to build a formulation that can hold person, relationships, environment and systems together.</p></div><div class="chapterstats"><div><b>${state.progress.casesDone}</b><span>cases</span></div><div><b>${state.progress.bestChain}</b><span>best chain</span></div><div><b>${masteredCount()}</b><span>mastered</span></div></div><div class="hint"><b>BUTTON</b> home</div></section>`;
}
function wildOverlay(){
  if(!state.wildcard)return '';
  return `<div class="overlay"><div class="modal"><img src="wildcard.png"><small>WILDCARD · +15 XP WHEN USED IN APPLY</small><h2>${esc(state.wildcard.name)}</h2><p>${esc(state.wildcard.prompt)}</p><div class="bonus">A wildcard widens the formulation. It does not automatically make one theory “correct”.</div><div class="hint"><b>BUTTON</b> continue</div></div></div>`;
}

function render(){
  try{
    let html='';
    if(state.screen==='home')html=renderHome();
    else if(state.screen==='learnMenu')html=renderLearnMenu();
    else if(state.screen==='studyBrowse')html=renderStudyBrowse();
    else if(state.screen==='studyDetail')html=renderStudyDetail();
    else if(state.screen==='hunt')html=renderHunt();
    else if(state.screen==='connections')html=renderConnections();
    else if(state.screen==='build')html=renderBuild();
    else if(state.screen==='collection')html=renderCollection();
    else if(state.screen==='caseIntro')html=renderCaseIntro(false);
    else if(state.screen==='caseUpdate')html=renderCaseIntro(true);
    else if(state.screen==='draw')html=renderDraw();
    else if(state.screen==='applyQuestion')html=renderApplyQuestion();
    else if(state.screen==='reveal')html=renderReveal();
    else if(state.screen==='link')html=renderLink();
    else if(state.screen==='result')html=renderResult();
    else if(state.screen==='end')html=renderEnd();
    app.innerHTML=html+wildOverlay();
  }catch(e){
    console.error(e);
    app.innerHTML=`<section class="screen error"><h1>Theory Roulette could not draw this screen.</h1><p>${esc(e.message||String(e))}</p><p>Hold the side button to return home.</p></section>`;
  }
}

function addXP(n){
  const old=state.progress.xp;
  state.progress.xp+=n;
  state.unlockedNow=null;
  const oldM=Math.floor(old/100), newM=Math.floor(state.progress.xp/100);
  if(newM>oldM){
    const locked=THEORY_CARDS.filter(c=>!unlocked(c.id));
    if(locked.length){
      // Prefer a card connected to something the learner already has.
      const owned=new Set(state.progress.unlocked);
      const related=locked.filter(c=>c.links.some(l=>owned.has(l.id)));
      const chosen=pick(related.length?related:locked);
      state.progress.unlocked.push(chosen.id);
      state.unlockedNow=chosen;
    }
  }
}
function markStudied(id){
  if(!state.progress.studied[id]){
    state.progress.studied[id]=true; addXP(10); save();
  }
}
function doHuntSelect(){
  const h=state.hunt, win=state.huntRow===h.answer;
  state.huntResult=win?'win':'lose';
  if(win){
    const was=unlocked(h.card.id);
    if(!was)state.progress.unlocked.push(h.card.id);
    state.progress.huntsWon++;
    addXP(30);
    state.progress.studied[h.card.id]=true;
    save();
  }
}
function toggleDeck(c){
  if(inDeck(c.id)){
    if(state.progress.deck.length<=6){state.message='Keep at least 6 cards so Apply can still work.';return;}
    state.progress.deck=state.progress.deck.filter(id=>id!==c.id);state.message=`Removed ${c.name}.`;
  }else{
    if(state.progress.deck.length>=12){state.message='Your active deck is full. Remove a card first.';return;}
    state.progress.deck.push(c.id);state.message=`Added ${c.name}.`;
  }
  save();
}
function chooseCard(){
  const deck=runDeck();
  state.activeCard=deck[state.drawIndex];
  state.usedRun.push(state.activeCard.id);
  if(state.usedRun.length>=activeDeck().length)state.usedRun=[];
  state.promptIndex=0;state.screen='applyQuestion';
}
function chooseLink(){
  state.linked=state.linkOptions[state.linkIndex];
  const strength=state.linked.rel.strength||0;
  state.roundXP=10 + 15 + (strength===3?45:strength===2?30:strength===1?15:5) + state.caseRun.chapter*3;
  if(state.wildcard){state.roundXP+=15;state.wildcard=null;}
  state.runXP+=state.roundXP;state.chain++;
  const a=state.activeCard.id,b=state.linked.card.id;
  state.progress.applied[a]=(state.progress.applied[a]||0)+1;
  state.progress.connected[a]=(state.progress.connected[a]||0)+1;
  state.progress.connected[b]=(state.progress.connected[b]||0)+1;
  addXP(state.roundXP);
  state.progress.bestChain=Math.max(state.progress.bestChain,state.chain);
  save();state.screen='result';
}
function finishChapter(){
  if(state.caseRun.chapter>=4){
    state.progress.casesDone++;state.progress.runs++;save();state.screen='end';return;
  }
  state.caseRun.chapter++;state.screen='caseUpdate';state.drawIndex=0;
}
function useWildcard(){
  if(state.wildcard)return;
  state.wildcard=pick(WILDCARDS);
  render();
}

function onUp(){
  if(state.wildcard)return;
  if(state.screen==='home'){state.cursor=wrap(state.cursor-1,menus.length);}
  else if(state.screen==='learnMenu'){state.cursor=wrap(state.cursor-1,3);}
  else if(['studyBrowse','connections','build'].includes(state.screen)){state.cardIndex=wrap(state.cardIndex-1,unlockedCards().length);}
  else if(state.screen==='studyDetail'){state.page=wrap(state.page-1,4);}
  else if(state.screen==='hunt'){state.huntRow=wrap(state.huntRow-1,6);}
  else if(state.screen==='collection'){state.cardIndex--;}
  else if(state.screen==='draw'){state.drawIndex=wrap(state.drawIndex-1,runDeck().length);}
  else if(state.screen==='applyQuestion'){state.promptIndex=wrap(state.promptIndex-1,5);}
  else if(state.screen==='link'){state.linkIndex=wrap(state.linkIndex-1,state.linkOptions.length);}
  render();
}
function onDown(){
  if(state.wildcard)return;
  if(state.screen==='home'){state.cursor=wrap(state.cursor+1,menus.length);}
  else if(state.screen==='learnMenu'){state.cursor=wrap(state.cursor+1,3);}
  else if(['studyBrowse','connections','build'].includes(state.screen)){state.cardIndex=wrap(state.cardIndex+1,unlockedCards().length);}
  else if(state.screen==='studyDetail'){state.page=wrap(state.page+1,4);}
  else if(state.screen==='hunt'){state.huntRow=wrap(state.huntRow+1,6);}
  else if(state.screen==='collection'){state.cardIndex++;}
  else if(state.screen==='draw'){state.drawIndex=wrap(state.drawIndex+1,runDeck().length);}
  else if(state.screen==='applyQuestion'){state.promptIndex=wrap(state.promptIndex+1,5);}
  else if(state.screen==='link'){state.linkIndex=wrap(state.linkIndex+1,state.linkOptions.length);}
  render();
}
function onClick(){
  if(state.wildcard){state.wildcard=null;render();return;}
  if(state.screen==='home'){
    const id=menus[state.cursor].id;
    if(id==='learn'){state.screen='learnMenu';state.cursor=0;}
    if(id==='build'){state.screen='build';state.cardIndex=0;state.message='';}
    if(id==='apply')startApply();
    if(id==='collection'){state.screen='collection';state.cardIndex=0;state.filterIndex=0;}
  }else if(state.screen==='learnMenu'){
    if(state.cursor===0){state.screen='studyBrowse';state.cardIndex=0;}
    if(state.cursor===1){newHunt();state.screen='hunt';}
    if(state.cursor===2){state.screen='connections';state.cardIndex=0;}
  }else if(state.screen==='studyBrowse'){
    state.selectedCard=unlockedCards()[state.cardIndex].id;state.page=0;state.screen='studyDetail';
  }else if(state.screen==='studyDetail'){
    markStudied(state.selectedCard);state.page=wrap(state.page+1,4);
  }else if(state.screen==='connections'){
    state.selectedCard=unlockedCards()[state.cardIndex].id;state.page=2;state.screen='studyDetail';
  }else if(state.screen==='hunt'){
    if(state.huntResult){newHunt();}else doHuntSelect();
  }else if(state.screen==='build'){
    toggleDeck(unlockedCards()[state.cardIndex]);
  }else if(state.screen==='collection'){
    const filters=['ALL','PSYCHOLOGY','SOCIOLOGY','NURSING','SOCIAL WORK','INTERVENTIONS'];const f=filters[state.filterIndex];
    let list=THEORY_CARDS;
    if(f==='PSYCHOLOGY')list=list.filter(c=>c.discipline.includes('Psychology'));
    if(f==='SOCIOLOGY')list=list.filter(c=>c.discipline.includes('Sociology'));
    if(f==='NURSING')list=list.filter(c=>c.discipline.includes('Nursing'));
    if(f==='SOCIAL WORK')list=list.filter(c=>c.discipline.includes('Social work'));
    if(f==='INTERVENTIONS')list=list.filter(c=>c.type==='intervene');
    const c=list[wrap(state.cardIndex,list.length)];
    if(unlocked(c.id)){state.selectedCard=c.id;state.page=0;state.screen='studyDetail';}
  }else if(state.screen==='caseIntro'||state.screen==='caseUpdate'){
    state.screen='draw';
  }else if(state.screen==='draw'){
    chooseCard();
  }else if(state.screen==='applyQuestion'){
    state.screen='reveal';
  }else if(state.screen==='reveal'){
    buildLinkOptions();state.screen='link';
  }else if(state.screen==='link'){
    chooseLink();
  }else if(state.screen==='result'){
    finishChapter();
  }else if(state.screen==='end'){
    state.screen='home';state.cursor=0;
  }
  render();
}
function onLong(){
  if(['caseIntro','caseUpdate','draw','applyQuestion','reveal','link','result'].includes(state.screen)){useWildcard();return;}
  if(state.screen==='collection'){
    if(state.filterIndex>=5){state.screen='home';state.cursor=0;state.filterIndex=0;}
    else {state.filterIndex++;state.cardIndex=0;}
    render();return;
  }
  if(state.screen==='home')return;
  if(state.screen==='learnMenu'||state.screen==='build'||state.screen==='collection'){state.screen='home';state.cursor=0;}
  else if(['studyBrowse','hunt','connections'].includes(state.screen)){state.screen='learnMenu';state.cursor=0;}
  else if(state.screen==='studyDetail'){state.screen='studyBrowse';}
  else state.screen='home';
  render();
}

// Gentle shake support when WebView exposes device motion. Long press is always available as fallback.
let lastShake=0;
window.addEventListener('devicemotion',e=>{
  const a=e.accelerationIncludingGravity;
  if(!a)return;
  const magnitude=Math.abs(a.x||0)+Math.abs(a.y||0)+Math.abs(a.z||0);
  if(magnitude>30 && Date.now()-lastShake>1400){
    lastShake=Date.now();
    if(['caseIntro','caseUpdate','draw','applyQuestion','reveal','link','result'].includes(state.screen))useWildcard();
  }
});

async function init(){
  const loaded=await bridge.load();
  if(loaded&&typeof loaded==='object'){
    state.progress={...defaultProgress(),...loaded};
    state.progress.unlocked=Array.from(new Set([...STARTER_IDS,...(loaded.unlocked||[])]));
    state.progress.deck=(loaded.deck||STARTER_IDS).filter(id=>state.progress.unlocked.includes(id)).slice(0,12);
    if(state.progress.deck.length<6)state.progress.deck=[...STARTER_IDS];
  }
  bridge.onUp(onUp);bridge.onDown(onDown);bridge.onClick(onClick);bridge.onLong(onLong);
  render();
}
init();
