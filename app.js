'use strict';
// Presentation only: counts already include the current anonymous participant.
function empathyPresentation_(c){
 const count=Number(c.count),first=c.previous===null||c.previous===undefined;
 const copy={lead:'あなたを含め',suffix:'人が共感しています',message:'同じ思い出を持つ仲間がいます',increase:null};
 if(c.adjusted){copy.message='台帳の整理により、人数が調整されました。';}
 else if(count<1){copy.lead='現在の共感人数';copy.suffix='人';copy.message='台帳の整理により、人数を確認しています。';}
 else if(first){copy.message=count===1?'この機種の思い出を最初に登録しました！':count===2?'同じ思い出を持つ仲間が見つかりました！':'同じ思い出を持つ仲間がいます';}
 else if(Number(c.delta)>0){copy.increase='前回から'+Number(c.delta).toLocaleString('ja-JP')+'人増えました';copy.message='新しく'+Number(c.delta).toLocaleString('ja-JP')+'人の仲間が増えました！';}
 else {copy.message=count===1?'あなたの思い出を大切に保管しています。また、のぞいてみてください。':'同じ思い出を持つ仲間がいます。また、のぞいてみてください。';}
 if(count<1){copy.lead='現在の共感人数';copy.suffix='人';}
 return copy;
}
(()=>{
 const $=id=>document.getElementById(id),api=window.OshidaiAPI;if(!api){$('status').textContent='ブラウザの保存領域が利用できません。保存を許可して再読み込みしてください。';return;}
 let slots=[],busy=false,searchTimers=new Map();const messages={CONFIG_REQUIRED:'接続先が未設定です。config.js を確認してください。',CONNECT_TIMEOUT:'接続できませんでした。時間をおいて再読み込みしてください。',TIMEOUT:'結果を確認できませんでした。同じ操作の再試行で重複を防げます。',TRANSPORT:'通信が途切れました。同じ操作を再試行してください。',BUSY:'ただいま処理が混み合っています。少し待ってから再試行してください。',RATE_LIMIT:'操作が続いています。1分ほど待ってから再試行してください。',MAINTENANCE:'台帳を整理しています。時間をおいて再試行してください。',DUPLICATE_SELECTION:'同じ機種が重複しています。別の機種を選んでください。',MACHINE_UNAVAILABLE:'機種情報が更新されました。選び直してください。',USER_MACHINE_LIMIT:'この匿名IDでの登録上限（100機種）に達しました。',CANDIDATE_LIMIT:'確認待ちの申請上限に達しました。',STORAGE_UNAVAILABLE:'ブラウザに保存できません。保存領域の設定を確認してください。'};
 const status=t=>$('status').textContent=t;
 const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 function scroll(id){$(id).scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
 function updateStats(s){if(!s)return;$('participants').textContent=Number(s.participants).toLocaleString('ja-JP')+'人';$('machineCount').textContent=Number(s.machines).toLocaleString('ja-JP')+'機種';}
 let resultPage=0;
 function renderPager(){
  const cards=Array.from($('cards').children),total=cards.length,pages=Math.max(1,Math.ceil(total/10));
  resultPage=Math.max(0,Math.min(resultPage,pages-1));
  cards.forEach((card,i)=>{card.hidden=Math.floor(i/10)!==resultPage;card.style.display=card.hidden?'none':'';});
  ['top','bottom'].forEach(position=>{
   const id='historyPager-'+position;let nav=$(id);
   if(!nav){nav=node('nav');nav.id=id;nav.setAttribute('aria-label',position==='top'?'登録機種のページ選択':'登録機種のページ選択（下部）');nav.style.cssText='display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;margin:16px 0';$('cards').insertAdjacentElement(position==='top'?'beforebegin':'afterend',nav);}
   nav.replaceChildren();nav.hidden=total<=10;nav.style.display=total<=10?'none':'flex';
   const prev=node('button','前の10機種'),next=node('button','次の10機種');prev.type=next.type='button';
   const info=node('span',(resultPage+1)+' / '+pages+'ページ（'+(total?resultPage*10+1:0)+'〜'+Math.min((resultPage+1)*10,total)+' / '+total+'機種）');info.setAttribute('aria-live','polite');
   prev.disabled=busy||resultPage===0;next.disabled=busy||resultPage===pages-1;
   const move=step=>{if(busy||resultPage+step<0||resultPage+step>=pages)return;resultPage+=step;renderPager();const target=$('historyPager-top');target.tabIndex=-1;target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'auto'});};
   prev.onclick=()=>move(-1);next.onclick=()=>move(1);nav.append(prev,info,next);
  });
 }
 function setBusy(b){busy=b;document.querySelectorAll('button,input').forEach(el=>el.disabled=b);$('submitButton').textContent=b?'思い出を登録しています…':'思い出を登録する';if($('historyPager-top'))renderPager();}
 function start(){if(busy||api.pending())return;slots=[{key:crypto.randomUUID(),query:'',selection:null}];renderSlots();$('entry').hidden=false;$('results').hidden=true;scroll('entry');setTimeout(()=>$('slots').querySelector('input').focus(),100);}
 function renderSlots(){$('slots').replaceChildren();slots.forEach((s,index)=>{const block=node('div'),label=node('label',(index+1)+'機種目'+(index?'（任意）':''));label.htmlFor='q-'+s.key;block.append(label);const wrap=node('div',undefined,'input-wrap'),input=node('input');input.id=label.htmlFor;input.maxLength=80;input.placeholder='例：初代吉宗、モンキーターン';input.value=s.query;input.autocomplete='off';const feedback=node('div'),list=node('div',undefined,'suggestions');list.id='list-'+s.key;input.setAttribute('aria-controls',list.id);input.setAttribute('aria-expanded','false');wrap.append(input);if(index){const del=node('button','×','remove');del.setAttribute('aria-label',(index+1)+'機種目を削除');del.onclick=()=>{slots=slots.filter(x=>x!==s);renderSlots();};wrap.append(del);}block.append(wrap,feedback,list);if(s.selection)feedback.append(node('p',s.selection.machineId?'選択済み：'+s.selection.name:'確認待ちで申請：'+s.selection.input,'chosen'));
 input.addEventListener('input',()=>{s.query=input.value;s.selection=null;feedback.replaceChildren();list.replaceChildren();input.setAttribute('aria-expanded','false');clearTimeout(searchTimers.get(s.key));const query=s.query.trim();if(!query)return;searchTimers.set(s.key,setTimeout(async()=>{try{const result=await api.request('search',{query});if(s.query.trim()!==query||s.selection||!input.isConnected)return;list.replaceChildren();if(result.items.some(m=>m.kind==='fuzzy'||m.kind==='variant'))list.append(node('p','もしかして、この機種ですか？','hint'));
 result.items.forEach(m=>{const b=node('button',m.name);b.type='button';b.append(node('small',(m.type==='slot'?'スロット':'パチンコ')+' · '+(m.era||'年代確認中')));b.onclick=()=>{if(slots.some(x=>x!==s&&x.selection&&x.selection.machineId===m.id)){status('この機種はすでに選択されています。');return;}s.selection={machineId:m.id,input:query,name:m.name};s.query=m.name;renderSlots();};list.append(b);});const unknown=node('button','探している機種が見つからない場合','unknown');unknown.type='button';unknown.onclick=()=>{s.selection={input:query,name:query};feedback.replaceChildren(node('p','「'+query+'」を確認待ちとして申請します。確認が終わるまで共感人数には含まれません。','hint'));list.replaceChildren();input.setAttribute('aria-expanded','false');};list.append(unknown);input.setAttribute('aria-expanded','true');}catch(e){if(s.query.trim()===query)feedback.textContent=messages[e.message]||'検索できませんでした。少し待って入力し直してください。';}},100));});$('slots').append(block);});$('addButton').hidden=slots.length>=3;}
 function showResults(d,req){$('entry').hidden=true;$('results').hidden=false;$('cards').replaceChildren();$('pending').replaceChildren();$('matches').replaceChildren();updateStats(d.stats);$('resultIntro').textContent=d.cards.length?'またここで、仲間が増えていく様子を見てみてください。':'登録された機種はまだありません。思い出の一台を追加してみましょう。';
 // Keep the API's registration order. Every count uses exactly the same card classes.
 d.cards.forEach(c=>{const copy=empathyPresentation_(c),card=node('article',undefined,'card');card.append(node('h3',c.name),node('p',copy.lead),node('div',undefined,'count'));const number=card.lastChild;number.append(document.createTextNode(Number(c.count).toLocaleString('ja-JP')),node('small',copy.suffix));if(copy.increase)card.append(node('p',copy.increase));card.append(node('p',copy.message,'growth'));const a=node('a','この思い出をXで共有する','share');const text='昔好きだった'+c.name+'、私を含め'+c.count+'人が共感しています！\nあなたの歴代推し台は？';a.href='https://twitter.com/intent/tweet?'+new URLSearchParams({text,url:location.href.split('?')[0].split('#')[0]});a.target='_blank';a.rel='noopener noreferrer';card.append(a);$('cards').append(card);});
 (d.pending||[]).forEach(c=>{$('pending').append(node('p','「'+c.name+'」：'+(c.status==='approved'?'確認済み・正式集計に反映しました':c.status==='rejected'?'確認の結果、今回の集計対象外となりました':'管理者による確認待ちです。共感人数への反映は保留しています。'),'hint'));});
 if(d.matches&&d.matches.enabled){$('matches').append(node('h3','思い出の重なり'));Object.keys(d.matches.exact).map(Number).sort((a,b)=>b-a).forEach(n=>$('matches').append(node('p',n+'機種が一致した仲間：'+d.matches.exact[n]+'人')));$('matches').append(node('p','1機種以上が一致した仲間：'+d.matches.total+'人'));}
 const selected=new Set(req&&req.action==='register'?(req.payload.items||[]).map(x=>x.machineId).filter(Boolean):[]);
 const freshIndex=d.cards.findIndex(c=>selected.has(c.id)&&(c.previous===null||c.previous===undefined));
 const selectedIndex=freshIndex>=0?freshIndex:d.cards.findIndex(c=>selected.has(c.id));
 resultPage=selectedIndex>=0?Math.floor(selectedIndex/10):0;renderPager();
 scroll('results');}
 async function execute(req){if(busy)return;setBusy(true);status('思い出の台帳を確認しています…');$('retryButton').hidden=true;try{const d=await api.request(req.action,req.payload);api.clearPending();status('');showResults(d,req);}catch(e){status(messages[e.message]||'処理を確認できませんでした。同じ操作を再試行してください。');if(['DUPLICATE_SELECTION','MACHINE_UNAVAILABLE','USER_MACHINE_LIMIT','CANDIDATE_LIMIT','INVALID_INPUT','SELECT_1_TO_3'].includes(e.message)){api.clearPending();}else $('retryButton').hidden=false;}finally{setBusy(false);}}
 $('startButton').onclick=start;$('moreButton').onclick=start;$('cancelButton').onclick=()=>{$('entry').hidden=true;window.scrollTo({top:0});};$('addButton').onclick=()=>{if(slots.length<3){slots.push({key:crypto.randomUUID(),query:'',selection:null});renderSlots();}};
 $('submitButton').onclick=()=>{if(busy||api.pending())return;const filled=slots.filter(s=>s.query.trim());if(!filled.length||filled.some(s=>!s.selection)){status('機種候補を選ぶか「見つからない場合」から申請してください。');return;}const keys=filled.map(s=>s.selection.machineId||'pending:'+s.selection.input.trim());if(new Set(keys).size!==keys.length){status('同じ機種が重複しています。');return;}const req={action:'register',payload:{operationId:api.operationId(),items:filled.map(s=>({machineId:s.selection.machineId||null,input:s.selection.input}))}};api.persistPending(req);execute(req);};
 $('checkButton').onclick=()=>{if(busy||api.pending())return;const req={action:'check',payload:{operationId:api.operationId()}};api.persistPending(req);execute(req);};$('retryButton').onclick=()=>{const req=api.pending();if(req)execute(req);};
 $('demoNotice').hidden=!window.OSHIDAI_CONFIG.demo;const pending=api.pending();if(pending){status('前回の操作結果が未確認です。「同じ操作を再試行する」で確認してください。');$('retryButton').hidden=false;}api.request('stats').then(updateStats).catch(e=>status(messages[e.message]||'ただいま台帳に接続できません。'));
})();
