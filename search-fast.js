/* Load after api.js and before app.js. Only public machine search data is retained in memory. */
'use strict';
(()=>{
 const base=window.OshidaiAPI;if(!base)return;
 const request=base.request.bind(base);let catalog=null,loading=null;
 const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+96)).replace(/[\s・･「」『』()（）\-_:：!！?？]/g,'');
 function distance(a,b){let p=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,p[j]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=next;}return p[b.length];}
 function load(){if(catalog)return Promise.resolve(catalog);if(loading)return loading;
  loading=request('catalog').then(data=>{if(data.version!==1||!Array.isArray(data.items)||data.items.some(m=>!m.id||!m.name||!Array.isArray(m.names)))throw Error('INVALID_CATALOG');
   catalog=data.items.map(m=>({id:m.id,name:m.name,type:m.type,era:m.group||'区分確認中',names:Array.from(new Set(m.names.map(norm).filter(Boolean)))}));return catalog;
  }).finally(()=>{loading=null;});return loading;
 }
 function search(items,query){const q=norm(query),found=[];if(!q)return {items:[],query:q};
  for(const m of items){let score=0,kind='partial';for(const s of m.names){let v=0,k='partial';if(s===q){v=100;k='exact';}else if(s.includes(q))v=80;else if(q.length>=3&&s.length<=q.length+8){const d=distance(q,s),ratio=1-d/Math.max(q.length,s.length);if(d<=2&&ratio>=.55){v=ratio*60;k='fuzzy';}}if(v>score){score=v;kind=k;}if(score===100)break;}if(score)found.push({id:m.id,name:m.name,type:m.type,era:m.era,kind,score});}
  found.sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'ja'));
  return {items:found.slice(0,8).map(({score,...m})=>m),query:q};
 }
 window.OshidaiAPI=Object.assign({},base,{async request(action,payload={}){
  if(action!=='search'||window.OSHIDAI_CONFIG.demo)return request(action,payload);
  try{return search(await load(),payload.query);}catch(e){return request(action,payload);}
 }});
 // Suppress intermediate IME input. Search once the Japanese conversion is committed.
 const composing=new WeakSet();
 const isSlot=el=>el&&el.tagName==='INPUT'&&el.id.startsWith('q-');
 document.addEventListener('compositionstart',e=>{if(isSlot(e.target))composing.add(e.target);},true);
 document.addEventListener('input',e=>{if(isSlot(e.target)&&(e.isComposing||composing.has(e.target)))e.stopImmediatePropagation();},true);
 document.addEventListener('compositionend',e=>{if(!isSlot(e.target))return;composing.delete(e.target);e.target.dispatchEvent(new Event('input',{bubbles:true}));},true);
 if(!window.OSHIDAI_CONFIG.demo)load().catch(()=>{});
})();
