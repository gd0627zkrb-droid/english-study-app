const API = "https://vkzxknpveoghhccgwaan.supabase.co/rest/v1";
const KEY = "sb_publishable_N2Hxy1FWrPCbUz6ifyQx6w_fqpWal1l";
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function db(table, { method="GET", params=[], body, returning=false }={}) {
  const qs = params.length ? `?${params.join("&")}` : "";
  const res = await fetch(`${API}/${table}${qs}`, {
    method, headers: { ...headers, ...(returning ? { Prefer: "return=representation" } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(data?.message || data?.details || data?.hint || text || `HTTP ${res.status}`);
  return data;
}
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const categories={speaking:{label:"Speaking",icon:"🎙️",description:"話す練習を、自分のテーマごとに整理できます。"},listening:{label:"Listening",icon:"🎧",description:"聞き取り練習を、自分のテーマごとに整理できます。"},writing:{label:"Writing",icon:"✍️",description:"英作文・日記・添削用のタブを整理できます。"},reading:{label:"Reading",icon:"📖",description:"英文読解・記事・教材をテーマごとに整理できます。"}};
const defaults={speaking:"My Speaking",listening:"My Listening",writing:"My Writing",reading:"My Reading"};
let state={tabs:{speaking:[],listening:[],writing:[],reading:[]},activeCategory:"speaking",activeSubTabs:{}};
const UI_KEY="english-study-ui-v4";
const esc=v=>String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
function dialog(id){const e=$("#"+id);if(e&&!e.open)e.showModal()} function close(id){const e=$("#"+id);if(e?.open)e.close()}
function saveUI(){localStorage.setItem(UI_KEY,JSON.stringify({activeCategory:state.activeCategory,activeSubTabs:state.activeSubTabs}))}
function restoreUI(){try{const x=JSON.parse(localStorage.getItem(UI_KEY)||"null");if(x){state.activeCategory=x.activeCategory||"speaking";state.activeSubTabs=x.activeSubTabs||{}}}catch{}}
function tabs(){return state.tabs[state.activeCategory]||[]} function activeTab(){const t=tabs();return t.find(x=>x.id===state.activeSubTabs[state.activeCategory])||t[0]}
function showError(e){console.error(e);alert(`保存に失敗しました。\n${e.message||e}`)}
function emailShare(){
  const url=window.location.href.split("?")[0];
  const subject="English Studyを使ってみてください";
  const body=`英語学習用のサイトを作りました。\n\nこちらから開けます：\n${url}\n\nPC・スマホから使えます。`;
  if(navigator.share){
    navigator.share({title:subject,text:body,url}).catch(()=>{});
    return;
  }
  window.location.href=`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
async function load(){
  for(const c of Object.keys(categories)){
    let rows=await db("study_tabs",{params:[`category=eq.${encodeURIComponent(c)}`,"select=id,name,category,created_at","order=created_at.asc"]});
    if(!rows.length) rows=await db("study_tabs",{method:"POST",body:{category:c,name:defaults[c]},returning:true});
    state.tabs[c]=rows;
    if(c==="reading") rows.forEach(t=>t.articles=[]);
  }
  const articles=await db("reading_articles",{params:["select=id,tab_id,title,url,memo,article_date,created_at","order=created_at.desc"]});
  const items=await db("learning_items",{params:["select=id,article_id,term,meaning,how,example,level,last_reviewed,created_at","order=created_at.asc"]});
  const map=new Map(articles.map(a=>[a.id,{id:a.id,title:a.title,url:a.url||"",memo:a.memo||"",date:a.article_date||"",items:[]} ]));
  items.forEach(x=>map.get(x.article_id)?.items.push({id:x.id,term:x.term,meaning:x.meaning,how:x.how||"",example:x.example||"",level:x.level||0,lastReviewed:x.last_reviewed}));
  state.tabs.reading.forEach(t=>t.articles=articles.filter(a=>a.tab_id===t.id).map(a=>map.get(a.id)).filter(Boolean));
  restoreUI();
  for(const c of Object.keys(categories)){if(!state.tabs[c].some(t=>t.id===state.activeSubTabs[c]))state.activeSubTabs[c]=state.tabs[c][0]?.id}
  render();
}
function render(){
  $$(".main-tab").forEach(b=>b.classList.toggle("active",b.dataset.mainTab===state.activeCategory));
  const list=$("#subTabs");list.innerHTML="";const ts=tabs(),at=activeTab();
  ts.forEach(t=>{const b=document.createElement("button");b.type="button";b.className=`sub-tab${t.id===at?.id?" active":""}`;b.innerHTML=`<span>${esc(t.name)}</span>`;if(ts.length>1){const x=document.createElement("button");x.type="button";x.className="close-sub";x.textContent="×";x.onclick=e=>{e.stopPropagation();removeTab(t.id)};b.appendChild(x)}b.onclick=()=>{state.activeSubTabs[state.activeCategory]=t.id;saveUI();render()};list.appendChild(b)});
  const c=categories[state.activeCategory];$("#workspaceKicker").textContent=c.label.toUpperCase();$("#workspaceTitle").textContent=c.label;$("#contentIcon").textContent=c.icon;$("#contentTitle").textContent=`${at?.name||c.label} を始めよう`;$("#contentDescription").textContent=c.description;
  const reading=state.activeCategory==="reading";$("#genericContent").classList.toggle("hidden",reading);$("#readingContent").classList.toggle("hidden",!reading);$("#newArticleHeaderButton").classList.toggle("hidden",!reading);
  if(reading&&at){$("#readingTabTitle").textContent=at.name;const as=at.articles||[];$("#readingEmpty").classList.toggle("hidden",as.length>0);const box=$("#articleList");box.innerHTML="";as.forEach(a=>{const n=a.items?.length||0;const card=document.createElement("article");card.className="article-card";card.innerHTML=`<div class="article-card-top"><div><span class="article-date">${esc(a.date)}</span><h4>${esc(a.title)}</h4><p>${esc(a.memo)}</p></div><span class="article-count">${n} items</span></div><div class="article-actions">${a.url?`<a class="secondary-button link-button" href="${esc(a.url)}" target="_blank" rel="noopener">記事を読む ↗</a>`:""}<button class="secondary-button" data-items="${a.id}">＋ 覚えるものを追加</button>${n?`<button class="new-button" data-review="${a.id}">▶ 復習 ${n}件</button>`:""}</div>${n?`<div class="item-preview">${a.items.slice(0,3).map(x=>`<span><strong>${esc(x.term)}</strong> · ${esc(x.meaning)}</span>`).join("")}</div>`:""}`;box.appendChild(card)})}
  $("#tabCount").textContent=Object.values(state.tabs).reduce((n,x)=>n+x.length,0);$("#studyMinutes").innerHTML=`${state.tabs.reading.reduce((n,t)=>n+(t.articles||[]).reduce((m,a)=>m+(a.items?.length||0),0),0)} <small>items</small>`;
}
async function addTab(){const c=state.activeCategory,name=prompt(`${categories[c].label} に追加するタブ名`,c==="reading"?"BBC News":"New lesson");if(!name?.trim())return;try{const [t]=await db("study_tabs",{method:"POST",body:{category:c,name:name.trim()},returning:true});if(c==="reading")t.articles=[];state.tabs[c].push(t);state.activeSubTabs[c]=t.id;saveUI();render()}catch(e){showError(e)}}
async function removeTab(id){const ts=tabs();if(ts.length<=1)return;const t=ts.find(x=>x.id===id);if(!t||!confirm(`「${t.name}」を削除しますか？`))return;try{await db("study_tabs",{method:"DELETE",params:[`id=eq.${encodeURIComponent(id)}`]});const i=ts.indexOf(t);ts.splice(i,1);state.activeSubTabs[state.activeCategory]=ts[Math.max(0,i-1)].id;saveUI();render()}catch(e){showError(e)}}
function openArticle(){$("#articleForm").reset();dialog("articleDialog");$("#articleTitle").focus()}
async function saveArticle(e){e.preventDefault();const t=activeTab();if(!t)return showError(new Error("Readingタブがありません"));try{const [a]=await db("reading_articles",{method:"POST",body:{tab_id:t.id,title:$("#articleTitle").value.trim(),url:$("#articleUrl").value.trim()||null,memo:$("#articleMemo").value.trim()||null},returning:true});t.articles||=[];t.articles.unshift({id:a.id,title:a.title,url:a.url||"",memo:a.memo||"",date:a.article_date||"",items:[]});close("articleDialog");render()}catch(e){showError(e)}}
function parseItems(text){const s=text.trim();if(s.startsWith("[")){try{return JSON.parse(s).map(x=>({term:x.term||x.word||x.expression||"",meaning:x.meaning||"",how:x.how||x.memory||x.mnemonic||"",example:x.example||""})).filter(x=>x.term&&x.meaning)}catch{}}return s.split(/\n+/).map(l=>l.trim()).filter(Boolean).map(l=>{const p=l.split(/\t|\s{2,}|\s*\/\s*/).map(x=>x.trim());return{term:p[0]||"",meaning:p[1]||"",how:p[2]||"",example:p[3]||""}}).filter(x=>x.term&&x.meaning)}
async function saveItems(e){e.preventDefault();const a=(activeTab()?.articles||[]).find(x=>x.id===window.currentArticleId);if(!a)return;const items=parseItems($("#itemsInput").value);if(!items.length)return alert("読み取れるデータがありません。");try{const data=await db("learning_items",{method:"POST",body:items.map(x=>({article_id:a.id,term:x.term,meaning:x.meaning,how:x.how||null,example:x.example||null})),returning:true});a.items.push(...data.map(x=>({id:x.id,term:x.term,meaning:x.meaning,how:x.how||"",example:x.example||"",level:x.level||0,lastReviewed:x.last_reviewed})));close("itemsDialog");render()}catch(e){showError(e)}}
let review=null;
function startReview(a){if(!a?.items?.length)return;review={a,i:0,revealed:false};dialog("reviewDialog");drawReview()}
function drawReview(){const x=review.a.items[review.i],n=review.a.items.length;$("#reviewBody").innerHTML=`<div class="review-progress">${review.i+1} / ${n}</div><div class="review-card"><p class="review-label">英語</p><h3>${esc(x.term)}</h3>${review.revealed?`<div class="answer"><strong>${esc(x.meaning)}</strong>${x.how?`<p>🧠 ${esc(x.how)}</p>`:""}${x.example?`<p class="review-example">${esc(x.example)}</p>`:""}</div>`:`<p class="tap-hint">まず意味を思い出してみよう。</p>`}</div>${review.revealed?`<div class="review-buttons"><button class="review-result" data-l="0">😵 忘れた</button><button class="review-result" data-l="1">😐 あやしい</button><button class="review-result good" data-l="2">😊 余裕</button></div>`:`<button class="new-button reveal-button">答えを見る</button>`}`;$(".reveal-button")?.addEventListener("click",()=>{review.revealed=true;drawReview()});$$(' .review-result').forEach(b=>b.onclick=async()=>{try{await db("learning_items",{method:"PATCH",params:[`id=eq.${encodeURIComponent(x.id)}`],body:{level:Number(b.dataset.l),last_reviewed:new Date().toISOString()}});x.level=Number(b.dataset.l)}catch(e){showError(e);return}if(review.i<n-1){review.i++;review.revealed=false;drawReview()}else{$("#reviewBody").innerHTML=`<div class="review-finished"><div class="content-icon">🎉</div><h3>今日の復習、おつかれさま！</h3><p>${n}件を復習しました。</p><button class="new-button" id="closeReview">閉じる</button></div>`;$("#closeReview").onclick=()=>close("reviewDialog")}})}

$("#newTabButton").onclick=addTab;$$('.main-tab').forEach(b=>b.onclick=()=>{state.activeCategory=b.dataset.mainTab;saveUI();render()});$$('[data-close]').forEach(b=>b.onclick=()=>close(b.dataset.close));$("#newArticleButton").onclick=openArticle;$("#newArticleHeaderButton").onclick=openArticle;$("#articleForm").onsubmit=saveArticle;$("#articleList").onclick=e=>{const id=e.target.closest('[data-items]')?.dataset.items,r=e.target.closest('[data-review]')?.dataset.review;if(id){window.currentArticleId=id;$("#itemsInput").value="";dialog("itemsDialog");$("#itemsInput").focus()}if(r)startReview((activeTab()?.articles||[]).find(a=>a.id===r))};$("#itemsForm").onsubmit=saveItems;$("#emailShareButton").onclick=emailShare;

// Render the UI even if Supabase is temporarily unavailable. This prevents a reload
// from leaving the user on the raw static HTML with the Reading controls hidden.
try { await load(); } catch(e) {
  console.error("Supabase load failed",e);
  state.tabs={speaking:[{id:"offline-speaking",name:defaults.speaking}],listening:[{id:"offline-listening",name:defaults.listening}],writing:[{id:"offline-writing",name:defaults.writing}],reading:[{id:"offline-reading",name:defaults.reading,articles:[]}]};
  restoreUI(); Object.keys(categories).forEach(c=>state.activeSubTabs[c] ||= state.tabs[c][0].id); render();
}
