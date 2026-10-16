/* Transport adapter only. No DOM rendering / Sheets access here. */
'use strict';
window.OshidaiAPI = (()=>{
 const cfg=window.OSHIDAI_CONFIG, pending=new Map();let frame,peer,peerOrigin,handshake,readyPromise;
 const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
 const store={get(k){try{return localStorage.getItem(k);}catch(e){throw new Error('STORAGE_UNAVAILABLE');}},set(k,v){try{localStorage.setItem(k,v);}catch(e){throw new Error('STORAGE_UNAVAILABLE');}}};
 let token=store.get('oshidai-token-v1');if(!token){token=random();store.set('oshidai-token-v1',token);}const op=()=>crypto.randomUUID();
 function connect(){if(readyPromise)return readyPromise;
 readyPromise=new Promise((resolve,reject)=>{let url;try{url=new URL(cfg.gasUrl);if(url.origin!=='https://script.google.com'||!/^\/macros\/s\/[^/]+\/exec$/.test(url.pathname))throw Error();}catch(e){reject(new Error('CONFIG_REQUIRED'));return;}
 handshake=random();url.searchParams.set('channel',handshake);frame=document.createElement('iframe');frame.hidden=true;frame.title='思い出台帳 通信';frame.referrerPolicy='no-referrer';frame.src=url.href;
 const timer=setTimeout(()=>{reject(new Error('CONNECT_TIMEOUT'));},30000);
 window.addEventListener('message',e=>{const m=e.data;if(!m||m.channel!=='oshidai-v1')return;
 if(m.type==='boot'&&m.nonce===handshake&&/^https:\/\/[a-zA-Z0-9-]+\.googleusercontent\.com$/.test(e.origin)&&e.source!==window){peer=e.source;peerOrigin=e.origin;clearTimeout(timer);resolve();return;}
 if(e.source!==peer||e.origin!==peerOrigin||m.type!=='reply')return;const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);p.resolve(m.result);}});
 document.body.appendChild(frame);
 });return readyPromise;}
 async function request(action,payload={}){const req={version:1,action,token,...payload};if(cfg.demo)return demo(req);await connect();const id=op();const result=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error('TIMEOUT'));},45000);pending.set(id,{resolve,reject,timer});peer.postMessage({channel:'oshidai-v1',type:'rpc',id,request:req},peerOrigin);});if(!result.ok){const e=new Error(result.error.code);e.retryable=result.error.retryable;throw e;}return result.data;}
 // Deliberately isolated, synthetic local-only demonstration. Production never calls it.
 function demo(req){const seed=window.OSHIDAI_SEED;let d=JSON.parse(store.get('oshidai-demo-v1')||'null')||{users:{},ops:{},counts:{}};const key=token+':'+req.operationId;
 if(req.action==='search'){const q=norm(req.query||'');const scored=seed.machines.map(m=>{let score=0,kind='partial';const names=[m.name,m.display,...seed.aliases.filter(a=>a.machineId===m.id).map(a=>a.name)];for(const name of names){const n=norm(name);if(n===q){score=100;kind='exact';break;}if(n.includes(q)&&q){score=Math.max(score,80);}else if(q.length>=3&&lev(q,n)<=2&&1-lev(q,n)/Math.max(q.length,n.length)>=.55&&score<60){score=60;kind='fuzzy';}}return {id:m.id,name:m.display,type:m.type,era:m.era,kind,score};}).filter(m=>m.score).sort((a,b)=>b.score-a.score).slice(0,8);return Promise.resolve({items:scored});}
 const stats=()=>({participants:Object.keys(d.users).length,machines:Object.values(d.counts).filter(n=>n>0).length});if(req.action==='stats')return Promise.resolve(stats());if(d.ops[key])return Promise.resolve(d.ops[key]);
 let p=d.users[token];if(req.action==='register'){p=p||{machines:[],pending:[],views:{}};for(const x of req.items){if(x.machineId&&!p.machines.includes(x.machineId)){p.machines.push(x.machineId);d.counts[x.machineId]=(d.counts[x.machineId]||0)+1;}else if(!x.machineId)p.pending.push({name:x.input,status:'pending'});}d.users[token]=p;}
 const cards=p?p.machines.map(id=>{const count=d.counts[id],previous=p.views[id];return {id,name:seed.machines.find(m=>m.id===id).display,count,previous:previous??null,delta:previous===undefined?null:Math.max(0,count-previous),adjusted:previous!==undefined&&count<previous};}):[];
 if(p)cards.forEach(c=>p.views[c.id]=c.count);const result={cards,pending:p?p.pending:[],stats:stats(),matches:{enabled:false}};d.ops[key]=result;store.set('oshidai-demo-v1',JSON.stringify(d));return Promise.resolve(result);}
 function norm(s){return String(s).normalize('NFKC').toLowerCase().replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+96)).replace(/[\s・･「」『』()（）\-_:：!！?？]/g,'');}
 function lev(a,b){let p=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const n=[i];for(let j=1;j<=b.length;j++)n[j]=Math.min(n[j-1]+1,p[j]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=n;}return p[b.length];}
 return {request,operationId:op,persistPending(req){store.set('oshidai-pending-v1',JSON.stringify(req));},pending(){return JSON.parse(store.get('oshidai-pending-v1')||'null');},clearPending(){try{localStorage.removeItem('oshidai-pending-v1');}catch(e){}}};
})();
