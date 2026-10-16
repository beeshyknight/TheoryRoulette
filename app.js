(function(){
  'use strict';

  const DATA = window.THEORY_ROULETTE_DATA;
  const app = document.getElementById('app');
  const nativeR1 = typeof window.PluginMessageHandler !== 'undefined';
  if (!nativeR1) document.documentElement.classList.add('browser');

  const modes = [
    {id:'mixed', name:'MIXED RUN', desc:'10 rounds. Informing theories and interventions in one deck.', rounds:10, filter:'all'},
    {id:'inform', name:'THEORIES THAT INFORM', desc:'8 rounds. Build explanations before choosing action.', rounds:8, filter:'inform'},
    {id:'intervene', name:'THEORIES THAT INTERVENE', desc:'8 rounds. Practice approaches, methods and responses.', rounds:8, filter:'intervene'},
    {id:'quick', name:'QUICK DRAW', desc:'5 fast rounds when you only have a few minutes.', rounds:5, filter:'all'}
  ];

  const state = {
    screen:'home', modeIndex:0, mode:null, round:0, score:0, chain:0,
    deckIndex:0, used:[], card:null, caseItem:null, modifier:null,
    transcript:'', isListening:false, speechSupported:false,
    linkOptions:[], linkIndex:0, linkedCard:null, roundScore:0,
    wildcard:null, wildcardUsed:false, preWildScreen:null,
    aiFeedback:null, drawing:false, longPressActive:false,
    progress:{xp:0,bestChain:0,seen:{},runs:0}
  };

  const familyTagMap = {
    relationships:['relationships','communication'], development:['development'], behaviour:['behaviour','motivation'],
    systems:['systems','quality'], person:['person','motivation'], critical:['critical','rights'], learning:['learning','workforce'],
    motivation:['motivation','behaviour'], communication:['communication','relationships'], therapeutic:['person','behaviour'],
    support:['support','access'], planning:['planning','systems'], safety:['safety'], rights:['rights','critical'],
    access:['access','communication'], community:['community','systems'], workforce:['workforce','systems'], quality:['quality','systems']
  };

  function esc(s){return String(s ?? '').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));}
  function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
  function wrapIndex(n,len){return ((n%len)+len)%len;}
  function shuffled(arr){return [...arr].sort(()=>Math.random()-.5);}
  function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}

  async function storageGet(key){
    try{
      if(window.creationStorage?.plain){
        const raw=await window.creationStorage.plain.getItem(key);
        return raw ? JSON.parse(atob(raw)) : null;
      }
      const raw=localStorage.getItem('tr1_'+key); return raw?JSON.parse(raw):null;
    }catch(e){return null;}
  }
  async function storageSet(key,val){
    try{
      if(window.creationStorage?.plain) await window.creationStorage.plain.setItem(key,btoa(JSON.stringify(val)));
      else localStorage.setItem('tr1_'+key,JSON.stringify(val));
    }catch(e){}
  }
  async function loadProgress(){
    const p=await storageGet('progress_v1');
    if(p && typeof p==='object') state.progress=Object.assign(state.progress,p);
    render();
  }
  function saveProgress(){storageSet('progress_v1',state.progress);}

  function topbar(label){
    return `<div class="topbar"><div class="brand">${esc(label||'THEORY ROULETTE')}</div><div class="spacer"></div><div class="pill">XP <strong>${state.progress.xp+state.score}</strong></div><div class="pill">CHAIN <strong>${state.chain}</strong></div></div>`;
  }

  function currentDeck(){
    let cards=DATA.cards.filter(c=>!state.used.includes(c.id));
    if(state.mode?.filter==='inform') cards=cards.filter(c=>c.type==='inform');
    if(state.mode?.filter==='intervene') cards=cards.filter(c=>c.type==='intervene');
    if(!cards.length){
      state.used=[];
      cards=DATA.cards.filter(c=>state.mode?.filter==='all'||!state.mode||c.type===state.mode.filter);
    }
    return cards;
  }

  function cardHTML(card, cls=''){
    return `<div class="deck-card ${card.type} ${cls}" data-id="${card.id}">
      <div class="cat">${card.type==='inform'?'THEORY · INFORM':'APPROACH · INTERVENE'}</div><div class="num">#${String(card.id).padStart(3,'0')}</div>
      <div class="name">${esc(card.name)}</div><div class="family">${esc(card.family)}</div></div>`;
  }

  function renderHome(){
    const modeEls=modes.map((m,i)=>{
      let delta=i-state.modeIndex;
      if(delta>2) delta-=modes.length; if(delta<-2) delta+=modes.length;
      const cls=delta===0?'current':delta===-1?'prev':delta===1?'next':'far';
      return `<div class="mode-card ${cls}"><div class="mname">${esc(m.name)}</div><div class="mdesc">${esc(m.desc)}</div></div>`;
    }).join('');
    return `<section class="screen home">
      <div class="topbar"><div class="brand">THEORY ROULETTE</div><div class="spacer"></div><div class="pill">COLLECTED <strong>${Object.keys(state.progress.seen||{}).length}/100</strong></div></div>
      <div class="hero-mark"><span class="c"></span><span class="c"></span><span class="c">↻</span></div>
      <div class="title">SPIN.<br>THINK. LINK.</div>
      <p class="subtitle">Turn the wheel through the deck. Draw a card. Use it on practice. Then challenge your own thinking.</p>
      <div class="mode-rail">${modeEls}</div>
      <div class="hint"><b>WHEEL</b> choose run · <b>BUTTON</b> start</div>
    </section>`;
  }

  function renderDeck(){
    const deck=currentDeck();
    state.deckIndex=wrapIndex(state.deckIndex,deck.length);
    const positions=[-2,-1,0,1,2];
    const cards=positions.map(pos=>{
      const card=deck[wrapIndex(state.deckIndex+pos,deck.length)];
      return cardHTML(card,`pos${pos}`);
    }).join('');
    return `<section class="screen deck-screen">${topbar(`ROUND ${state.round+1}/${state.mode.rounds}`)}
      <div class="kicker">${state.mode.name}</div><div class="deck-zone" id="deckZone">${cards}</div>
      <div class="deck-footer"><span class="legend-dot i"></span><span class="kicker">INFORM</span><span class="legend-dot a"></span><span class="kicker">INTERVENE</span></div>
      <div class="hint"><b>WHEEL</b> flick cards · <b>BUTTON</b> draw · shake later for wildcard</div>
    </section>`;
  }

  function miniCard(card){
    return `<div class="mini-card ${card.type}"><div class="mini-icon">${card.type==='inform'?'?':'→'}</div><div class="mini-copy"><div class="mini-cat">${card.type==='inform'?'THEORY THAT INFORMS':'THEORY / APPROACH THAT INTERVENES'}</div><div class="mini-name">${esc(card.name)}</div></div></div>`;
  }

  function promptForCard(){
    return state.card.type==='inform'
      ? 'How could this theory help you understand what is happening?'
      : 'How could this approach help you respond, and why might it fit here?';
  }

  function renderChallenge(){
    return `<section class="screen">${topbar('PRACTICE SITUATION')}${miniCard(state.card)}
      <div class="casebox casebox-large"><div class="case-title">${esc(state.caseItem.title)}</div><div class="case-text">${esc(state.caseItem.text)}</div>${state.modifier?`<div class="case-new">${esc(state.modifier)}</div>`:''}</div>
      <div class="hint"><b>BUTTON</b> take the card into the situation</div>
    </section>`;
  }

  function renderReflection(){
    return `<section class="screen">${topbar('YOUR TURN')}${miniCard(state.card)}
      <div class="reflection-space"><div class="kicker">USE THE CARD</div><div class="reflection-question">${esc(promptForCard())}</div><div class="reflection-nudge">Try to connect the person, context and what this lens changes in your thinking.</div></div>
      <div class="prompt-box reflection-prompt ${state.isListening?'listening':''}"><div class="speak-state"><span class="pulse"></span>${state.isListening?'LISTENING… release PTT when finished':state.speechSupported?'HOLD PTT TO SPEAK · or press to continue':'PRESS WHEN YOU HAVE THOUGHT IT THROUGH'}</div>${state.transcript?`<div class="transcript reflection-transcript">“${esc(state.transcript)}”</div>`:''}</div>
      <div class="hint">There is no automatic right/wrong judgement here.</div>
    </section>`;
  }

  function renderImpact(){
    return `<section class="screen">${topbar('TURN THE CARD OVER')}${miniCard(state.card)}
      ${state.transcript?`<div class="transcript">You said: “${esc(state.transcript)}”</div>`:''}
      <div class="reveal-grid">
        <div class="reveal helps"><div class="rlabel">WHAT IT HELPS YOU NOTICE</div><div class="rtext">${esc(state.card.helps)}</div></div>
        <div class="reveal limits"><div class="rlabel">WHAT IT DOESN’T EXPLAIN ALONE</div><div class="rtext">${esc(state.card.limits)}</div></div>
      </div>
      <div class="hint"><b>BUTTON</b> build a theory–intervention bridge · <b>SHAKE</b> wildcard</div>
    </section>`;
  }

  function renderLink(){
    const prompt=state.card.type==='inform'?'Now choose an intervention this theory could inform.':'Now choose an informing theory that could deepen or challenge this intervention.';
    const opts=state.linkOptions.map((c,i)=>{
      let delta=i-state.linkIndex;
      if(delta>1) delta-=state.linkOptions.length; if(delta<-1) delta+=state.linkOptions.length;
      const cls=delta===0?'current':delta===-1?'prev':delta===1?'next':'far';
      return `<div class="link-card ${c.type} ${cls}"><div class="cat">${c.type==='inform'?'INFORM':'INTERVENE'}</div><div class="lname">${esc(c.name)}</div><div class="lwhy">${esc(c.summary)}</div></div>`;
    }).join('');
    return `<section class="screen">${topbar('MAKE THE BRIDGE')}<div class="link-prompt">${esc(prompt)}</div><div class="link-rail">${opts}</div><div class="hint"><b>WHEEL</b> compare · <b>BUTTON</b> link · none are automatically “wrong”</div></section>`;
  }

  function renderResult(){
    const pct=Math.min(100,(state.round+1)/state.mode.rounds*100);
    const ai=state.aiFeedback?`<div class="combo"><div class="kicker">R1 REFLECTION NOTE</div><div class="why">${esc(state.aiFeedback)}</div></div>`:'';
    return `<section class="screen">${topbar('ROUND COMPLETE')}
      <div class="scoreburst"><div class="big">+${state.roundScore}</div><div class="small">REFLECTION XP</div></div>
      <div class="combo"><div class="kicker">YOUR BRIDGE</div><div class="pair">${esc(state.card.name)} ↔ ${esc(state.linkedCard.name)}</div><div class="why">Two lenses can sit together without saying the same thing. What changes when you use both?</div><div class="progressbar"><span style="width:${pct}%"></span></div></div>
      ${ai}
      <div class="hint"><b>BUTTON</b> ${state.round+1>=state.mode.rounds?'finish run':'next round'} · collection saves automatically</div>
    </section>`;
  }

  function renderRunEnd(){
    const seen=Object.keys(state.progress.seen||{}).length;
    return `<section class="screen">${topbar('RUN COMPLETE')}<div class="kicker">${esc(state.mode.name)}</div><div class="title">GOOD THINKING<br>STAYS OPEN.</div>
      <div class="run-summary"><div class="stat"><b>${state.score}</b><span>run xp</span></div><div class="stat"><b>${state.chain}</b><span>chain</span></div><div class="stat"><b>${seen}</b><span>collected</span></div></div>
      <div class="combo"><div class="kicker">NEXT TIME</div><div class="why">Try deliberately choosing a theory you would not normally use. A stronger formulation often comes from noticing what your first explanation leaves out.</div></div>
      <div class="hint"><b>BUTTON</b> back to modes · best chain ${state.progress.bestChain||0}</div></section>`;
  }

  function wildcardOverlay(){
    if(!state.wildcard) return '';
    return `<div class="wild-overlay"><div class="wild-card"><div class="wild-icon">${esc(state.wildcard.icon)}</div><div class="wild-label">SHAKE WILDCARD · +75 XP</div><div class="wild-name">${esc(state.wildcard.name)}</div><div class="wild-prompt">${esc(state.wildcard.prompt)}</div><div class="wild-bonus">${state.isListening?'LISTENING…':'Hold PTT to speak, or press the button when you have considered it.'}</div></div></div>`;
  }

  function touchbar(){
    if(nativeR1) return '';
    return `<div class="touchbar"><button data-act="prev">◀ WHEEL</button><button data-act="select">BUTTON</button><button data-act="next">WHEEL ▶</button><button data-act="shake">SHAKE</button></div>`;
  }

  function render(){
    let html='';
    if(state.screen==='home') html=renderHome();
    else if(state.screen==='deck') html=renderDeck();
    else if(state.screen==='challenge') html=renderChallenge();
    else if(state.screen==='reflection') html=renderReflection();
    else if(state.screen==='impact') html=renderImpact();
    else if(state.screen==='link') html=renderLink();
    else if(state.screen==='result') html=renderResult();
    else if(state.screen==='runend') html=renderRunEnd();
    app.innerHTML=html+wildcardOverlay()+touchbar();
    bindTouch();
  }

  function bindTouch(){
    app.querySelectorAll('[data-act]').forEach(btn=>btn.addEventListener('click',()=>{
      const a=btn.dataset.act;
      if(a==='prev') onWheel(-1); else if(a==='next') onWheel(1); else if(a==='select') onSideClick(); else if(a==='shake') triggerWildcard();
    }));
  }

  function startRun(){
    state.mode=modes[state.modeIndex]; state.round=0; state.score=0; state.chain=0; state.used=[]; state.deckIndex=0;
    state.card=null; state.caseItem=null; state.transcript=''; state.aiFeedback=null; state.screen='deck'; render();
  }

  function pickCase(card){
    const desired=new Set([card.family,...(familyTagMap[card.family]||[])]);
    const scored=DATA.cases.map(c=>({c,score:c.tags.reduce((n,t)=>n+(desired.has(t)?2:0),0)+Math.random()*2})).sort((a,b)=>b.score-a.score);
    return pick(scored.slice(0,Math.min(8,scored.length))).c;
  }

  function drawCurrent(){
    if(state.drawing) return;
    const deck=currentDeck(); if(!deck.length) return;
    state.card=deck[wrapIndex(state.deckIndex,deck.length)]; state.used.push(state.card.id);
    state.caseItem=pickCase(state.card); state.modifier=Math.random()<.48?pick(DATA.modifiers):null;
    state.transcript=''; state.aiFeedback=null; state.wildcardUsed=false; state.roundScore=100;
    state.drawing=true;
    const zone=document.getElementById('deckZone');
    if(zone){
      zone.querySelectorAll('.deck-card').forEach(el=>{
        if(el.classList.contains('pos0')) el.classList.add('pick');
        else if(el.classList.contains('pos-1')||el.classList.contains('pos-2')) el.classList.add('fly-left');
        else el.classList.add('fly-right');
      });
    }
    setTimeout(()=>{state.drawing=false; state.screen='challenge'; render();},470);
  }

  function buildLinkOptions(){
    const target=state.card.type==='inform'?'intervene':'inform';
    const pool=DATA.cards.filter(c=>c.type===target && c.id!==state.card.id);
    const caseTags=new Set(state.caseItem.tags);
    const ranked=pool.map(c=>{
      const tags=[c.family,...(familyTagMap[c.family]||[])];
      const overlap=tags.reduce((n,t)=>n+(caseTags.has(t)?1:0),0);
      return {c,score:overlap*2+Math.random()*3};
    }).sort((a,b)=>b.score-a.score);
    const strong=ranked.slice(0,12).map(x=>x.c);
    const rest=ranked.slice(12).map(x=>x.c);
    const first=pick(strong); const second=pick(strong.filter(c=>c.id!==first.id)); const third=pick(rest.filter(c=>c.id!==first.id&&c.id!==second.id));
    state.linkOptions=shuffled([first,second,third].filter(Boolean)); state.linkIndex=0;
  }

  function lockLink(){
    state.linkedCard=state.linkOptions[state.linkIndex];
    const caseTags=new Set(state.caseItem.tags);
    const tags=[state.linkedCard.family,...(familyTagMap[state.linkedCard.family]||[])];
    const overlap=tags.some(t=>caseTags.has(t));
    state.roundScore+=90+(overlap?20:0)+Math.min(state.chain,5)*10;
    state.score+=state.roundScore; state.chain+=1;
    state.progress.bestChain=Math.max(state.progress.bestChain||0,state.chain);
    state.progress.seen[state.card.id]=(state.progress.seen[state.card.id]||0)+1;
    state.progress.seen[state.linkedCard.id]=(state.progress.seen[state.linkedCard.id]||0)+1;
    saveProgress(); state.screen='result'; render();
  }

  function nextRound(){
    if(state.round+1>=state.mode.rounds){
      state.progress.xp+=state.score; state.progress.runs=(state.progress.runs||0)+1; saveProgress(); state.screen='runend'; render(); return;
    }
    state.round+=1; state.deckIndex=0; state.card=null; state.linkedCard=null; state.screen='deck'; render();
  }

  function onWheel(dir){
    if(state.wildcard) return;
    if(state.screen==='home'){state.modeIndex=wrapIndex(state.modeIndex+dir,modes.length);render();return;}
    if(state.screen==='deck'){const deck=currentDeck();state.deckIndex=wrapIndex(state.deckIndex+dir,deck.length);render();return;}
    if(state.screen==='link'){state.linkIndex=wrapIndex(state.linkIndex+dir,state.linkOptions.length);render();return;}
  }

  function onSideClick(){
    if(state.longPressActive) return;
    if(state.wildcard){resolveWildcard();return;}
    if(state.screen==='home'){startRun();return;}
    if(state.screen==='deck'){drawCurrent();return;}
    if(state.screen==='challenge'){state.screen='reflection';render();return;}
    if(state.screen==='reflection'){state.roundScore+=state.transcript?50:30; requestReflectionFeedback(); state.screen='impact';render();return;}
    if(state.screen==='impact'){buildLinkOptions();state.screen='link';render();return;}
    if(state.screen==='link'){lockLink();return;}
    if(state.screen==='result'){nextRound();return;}
    if(state.screen==='runend'){state.screen='home';state.mode=null;render();return;}
  }

  function triggerWildcard(){
    if(state.wildcard || state.wildcardUsed) return;
    if(!['challenge','reflection','impact','link'].includes(state.screen)) return;
    state.preWildScreen=state.screen; state.wildcard=pick(DATA.wildcards); state.transcript=''; render();
  }
  function resolveWildcard(){
    state.roundScore+=75; state.wildcardUsed=true; state.wildcard=null; state.isListening=false; render();
  }

  let recognition=null;
  function setupSpeech(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){state.speechSupported=false;return;}
    try{
      recognition=new SR(); recognition.lang='en-GB'; recognition.interimResults=true; recognition.continuous=true;
      recognition.onresult=(ev)=>{
        let text=''; for(let i=0;i<ev.results.length;i++) text+=ev.results[i][0].transcript+' ';
        state.transcript=text.trim();
      };
      recognition.onerror=()=>{state.isListening=false;render();};
      recognition.onend=()=>{state.isListening=false;render();};
      state.speechSupported=true;
    }catch(e){state.speechSupported=false;}
  }
  function onLongPressStart(){
    if(!(state.wildcard||state.screen==='reflection')) return;
    state.longPressActive=true; state.isListening=true; state.transcript='';
    if(recognition){try{recognition.start();}catch(e){}}
    render();
  }
  function onLongPressEnd(){
    if(!state.longPressActive) return;
    state.longPressActive=false; state.isListening=false;
    if(recognition){try{recognition.stop();}catch(e){}}
    if(state.transcript) state.roundScore+=20;
    render();
    setTimeout(()=>{state.longPressActive=false;},120);
  }

  function requestReflectionFeedback(){
    if(!state.transcript || typeof window.PluginMessageHandler==='undefined') return;
    const prompt=`You are supporting reflective learning for UK nursing and social work students. Do not mark the learner right or wrong. In no more than 28 words, identify one useful connection in their answer and one curious question that could deepen it. Theory/approach: ${state.card.name}. Situation: ${state.caseItem.text} Learner answer: ${state.transcript}. Return plain text only.`;
    try{window.PluginMessageHandler.postMessage(JSON.stringify({message:prompt,useLLM:true,wantsR1Response:false,wantsJournalEntry:false}));}catch(e){}
  }

  window.onPluginMessage=function(data){
    let text='';
    try{
      if(data?.data){
        try{const parsed=JSON.parse(data.data);text=parsed.feedback||parsed.message||data.data;}catch(e){text=data.data;}
      } else if(data?.message) text=data.message;
    }catch(e){}
    if(text){state.aiFeedback=String(text).replace(/^['\"]|['\"]$/g,'').slice(0,220); if(state.screen==='result') render();}
  };

  let lastMag=null, lastShake=0;
  function setupShake(){
    const a=window.creationSensors?.accelerometer;
    if(!a?.start) return;
    try{
      a.start((d)=>{
        const mag=Math.sqrt((d.x||0)**2+(d.y||0)**2+(d.z||0)**2);
        if(lastMag!==null){
          const delta=Math.abs(mag-lastMag); const now=Date.now();
          if(delta>1.25 && now-lastShake>1800){lastShake=now;triggerWildcard();}
        }
        lastMag=mag;
      },{frequency:30});
    }catch(e){}
  }

  window.addEventListener('scrollUp',()=>onWheel(-1));
  window.addEventListener('scrollDown',()=>onWheel(1));
  window.addEventListener('sideClick',onSideClick);
  window.addEventListener('longPressStart',onLongPressStart);
  window.addEventListener('longPressEnd',onLongPressEnd);

  window.addEventListener('keydown',(e)=>{
    if(e.key==='ArrowLeft'||e.key==='ArrowUp') onWheel(-1);
    else if(e.key==='ArrowRight'||e.key==='ArrowDown') onWheel(1);
    else if(e.key==='Enter') onSideClick();
    else if(e.key.toLowerCase()==='s') triggerWildcard();
    else if(e.key===' '){e.preventDefault();onLongPressStart();}
  });
  window.addEventListener('keyup',(e)=>{if(e.key===' ') onLongPressEnd();});

  setupSpeech(); render(); loadProgress(); setupShake();
})();
