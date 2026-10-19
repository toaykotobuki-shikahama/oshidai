/* Load after api.js / search-fast.js and before app.js. No changes to saving or anonymous IDs. */
'use strict';
(()=>{
 if(window.OshidaiMemoryLoading)return;
 const api=window.OshidaiAPI;if(!api)return;
 const request=api.request.bind(api);let current=null;
 const preferenceKey='oshidai-memory-motion-v1';
 function prefersAnimation(){try{const saved=localStorage.getItem(preferenceKey);if(saved==='on')return true;if(saved==='off')return false;}catch(ignore){}return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
 function rememberAnimation(on){try{localStorage.setItem(preferenceKey,on?'on':'off');}catch(ignore){}}

 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 function namesFor(items){
  const inputs=Array.from(document.querySelectorAll('#slots input[id^="q-"]')).map(n=>n.value.trim()).filter(Boolean);
  const chosen=Array.from(document.querySelectorAll('#slots .chosen')).map(n=>n.textContent);
  return (items||[]).slice(0,3).map((item,i)=>{
   if(inputs.length===(items||[]).length&&inputs[i])return inputs[i];
   const label=chosen.length===(items||[]).length?(chosen[i]||''):'';
   if(label.startsWith('選択済み：'))return label.slice('選択済み：'.length);
   if(label.startsWith('確認待ちで申請：'))return label.slice('確認待ちで申請：'.length);
   return String(item.input||'思い出の一台');
  });
 }
 function open(items){
  if(current)return null;
  let animated=prefersAnimation();
  const dialog=el('dialog','memory-loading'),panel=el('div','memory-loading__panel');
  dialog.setAttribute('aria-labelledby','memory-loading-title');dialog.setAttribute('aria-describedby','memory-loading-status');
  dialog.addEventListener('cancel',e=>e.preventDefault());
  panel.append(el('p','memory-loading__eyebrow','おもいで台帳'));
  const title=el('h2','memory-loading__title','あなたの思い出を、台帳へ。');title.id='memory-loading-title';panel.append(title);
  const stage=el('div','memory-loading__stage');stage.setAttribute('aria-hidden','true');
  const book=el('div','memory-loading__book');
  book.append(el('div','memory-loading__pages'));
  const cover=el('div','memory-loading__cover');cover.append(el('span','memory-loading__mark','✳'),el('strong','','おもいで台帳'),el('span','memory-loading__cover-note','あの一台を、ずっと。'));book.append(cover);
  stage.append(book);
  const names=namesFor(items);if(!names.length)names.push('思い出の一台');
  names.forEach((name,i)=>{
   const card=el('div','memory-loading__card');card.style.setProperty('--card-y',(i*80)+'px');card.style.setProperty('--card-delay',(i*1.3)+'s');card.style.setProperty('--card-tilt',((i-1)*3)+'deg');card.append(el('span','memory-loading__card-kicker','MY MEMORY'),el('strong','memory-loading__card-name',name),el('span','memory-loading__card-footer','ずっと、覚えている。'));stage.append(card);
  });
  panel.append(stage);
  const status=el('p','memory-loading__status','思い出を記録しています');status.id='memory-loading-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');panel.append(status);
  panel.append(el('p','memory-loading__note','同じ一台を覚えている、誰かへ。'));
  const toggle=el('button','memory-loading__toggle');toggle.type='button';toggle.setAttribute('aria-label','カード演出');panel.append(toggle);
  dialog.append(panel);document.body.append(dialog);
  const previousFocus=document.activeElement,previousOverflow=document.body.style.overflow;
  try{dialog.showModal();}catch(error){dialog.remove();return null;}
  document.body.style.overflow='hidden';
  const state={dialog,previousFocus,previousOverflow,timers:[]};current=state;
  let settleTimer=null;
  function applyMotion(){
   if(settleTimer!==null)clearTimeout(settleTimer);
   dialog.classList.toggle('memory-loading--reduced',!animated);
   dialog.classList.toggle('memory-loading--motion',animated);
   dialog.classList.remove('memory-loading--settled');
   toggle.textContent=animated?'カード演出をOFF':'カード演出をON';toggle.setAttribute('aria-pressed',String(animated));
   if(animated){settleTimer=setTimeout(()=>{if(current===state)dialog.classList.add('memory-loading--settled');},Math.round((5.6+(names.length-1)*1.3+.3)*1000));state.timers.push(settleTimer);}
  }
  toggle.addEventListener('click',()=>{animated=!animated;rememberAnimation(animated);applyMotion();});
  applyMotion();
  state.timers.push(setTimeout(()=>{if(current===state)status.textContent='記録の完了を待っています。もう少しお待ちください。';},18000));
  return state;
 }
 function close(state){
  if(!state||current!==state)return;
  state.timers.forEach(clearTimeout);state.dialog.close();state.dialog.remove();document.body.style.overflow=state.previousOverflow;current=null;
  // app.js re-enables its buttons in finally; restore focus on the next task.
  setTimeout(()=>{if(state.previousFocus&&state.previousFocus.isConnected&&!state.previousFocus.disabled)state.previousFocus.focus({preventScroll:true});},0);
 }
 window.OshidaiAPI=Object.assign({},api,{async request(action,payload={}){
  if(action!=='register')return request(action,payload);
  // Presentation failures never prevent the actual save request or change its outcome.
  let state;try{state=open(payload.items);}catch(ignore){if(current){state=current;close(state);state=null;}}
  try{return await request(action,payload);}finally{close(state);}
 }});
 window.OshidaiMemoryLoading={version:2};
})();
