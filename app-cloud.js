import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://vkzxknpveoghhccgwaan.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_N2Hxy1FWrPCbUz6ifyQx6w_fqpWal1l";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const UI_KEY = "english-study-ui-v1";

const categories = {
  speaking: { label: "Speaking", icon: "🎙️", description: "話す練習を、自分のテーマごとに整理できます。" },
  listening: { label: "Listening", icon: "🎧", description: "聞き取り練習を、自分のテーマごとに整理できます。" },
  writing: { label: "Writing", icon: "✍️", description: "英作文・日記・添削用のタブを整理できます。" },
  reading: { label: "Reading", icon: "📖", description: "英文読解・記事・教材をテーマごとに整理できます。" },
};

const defaultNames = { speaking: "My Speaking", listening: "My Listening", writing: "My Writing", reading: "My Reading" };
let state = { tabs: { speaking: [], listening: [], writing: [], reading: [] }, activeCategory: "speaking", activeSubTabs: {} };
let reviewState = null;
let currentUser = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
function escapeHtml(value = "") { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }
function showDialog(id) { const el = $("#" + id); if (!el.open) el.showModal(); }
function closeDialog(id) { const el = $("#" + id); if (el.open) el.close(); }
function saveUi() { localStorage.setItem(UI_KEY, JSON.stringify({ activeCategory: state.activeCategory, activeSubTabs: state.activeSubTabs })); }
function restoreUi() { try { const x = JSON.parse(localStorage.getItem(UI_KEY)); if (x) { state.activeCategory = x.activeCategory || "speaking"; state.activeSubTabs = x.activeSubTabs || {}; } } catch {} }
function categoryTabs() { return state.tabs[state.activeCategory]; }
function activeSubTab() { const tabs = categoryTabs(); return tabs.find((tab) => tab.id === state.activeSubTabs[state.activeCategory]) || tabs[0]; }

async function ensureDefaultTabs() {
  for (const category of Object.keys(categories)) {
    const { data, error } = await supabase.from("study_tabs").select("id,name,category").eq("user_id", currentUser.id).eq("category", category).order("created_at");
    if (error) throw error;
    if (!data.length) {
      const { data: created, error: insertError } = await supabase.from("study_tabs").insert({ user_id: currentUser.id, category, name: defaultNames[category] }).select("id,name,category").single();
      if (insertError) throw insertError;
      state.tabs[category] = [created];
    } else state.tabs[category] = data;
  }
}

async function loadCloudData() {
  if (!currentUser) return;
  state.tabs = { speaking: [], listening: [], writing: [], reading: [] };
  await ensureDefaultTabs();
  const { data: articles, error: articleError } = await supabase.from("reading_articles").select("id,tab_id,title,url,memo,article_date,created_at").eq("user_id", currentUser.id).order("created_at", { ascending: false });
  if (articleError) throw articleError;
  const { data: items, error: itemError } = await supabase.from("learning_items").select("id,article_id,term,meaning,how,example,level,last_reviewed,created_at").eq("user_id", currentUser.id).order("created_at");
  if (itemError) throw itemError;
  const articleMap = new Map();
  (articles || []).forEach((a) => articleMap.set(a.id, { id: a.id, title: a.title, url: a.url || "", memo: a.memo || "", date: a.article_date || "", items: [] }));
  (items || []).forEach((x) => articleMap.get(x.article_id)?.items.push({ id: x.id, term: x.term, meaning: x.meaning, how: x.how || "", example: x.example || "", level: x.level || 0, lastReviewed: x.last_reviewed }));
  state.tabs.reading.forEach((tab) => { tab.articles = (articles || []).filter((a) => a.tab_id === tab.id).map((a) => articleMap.get(a.id)); });
  restoreUi();
  Object.keys(categories).forEach((key) => { state.activeSubTabs[key] ||= state.tabs[key][0]?.id; if (!state.tabs[key].some((t) => t.id === state.activeSubTabs[key])) state.activeSubTabs[key] = state.tabs[key][0]?.id; });
  render();
}

function renderMainTabs() { $$(".main-tab").forEach((b) => b.classList.toggle("active", b.dataset.mainTab === state.activeCategory)); }
function renderSubTabs() {
  const tabs = categoryTabs(), activeId = state.activeSubTabs[state.activeCategory], container = $("#subTabs");
  container.innerHTML = "";
  tabs.forEach((tab) => {
    const button = document.createElement("button"); button.className = `sub-tab${tab.id === activeId ? " active" : ""}`; button.dataset.subTab = tab.id;
    button.innerHTML = `<span>${escapeHtml(tab.name)}</span>`;
    if (tabs.length > 1) { const close = document.createElement("button"); close.className = "close-sub"; close.type = "button"; close.textContent = "×"; close.title = "このタブを削除"; close.addEventListener("click", (e) => { e.stopPropagation(); removeSubTab(tab.id); }); button.appendChild(close); }
    button.addEventListener("click", () => { state.activeSubTabs[state.activeCategory] = tab.id; saveUi(); render(); }); container.appendChild(button);
  });
}
function renderGeneric() {
  const category = categories[state.activeCategory], tab = activeSubTab();
  $("#workspaceKicker").textContent = category.label.toUpperCase(); $("#workspaceTitle").textContent = category.label;
  $("#contentIcon").textContent = category.icon; $("#contentTitle").textContent = `${tab.name} を始めよう`; $("#contentDescription").textContent = category.description;
}
function renderReading() {
  const isReading = state.activeCategory === "reading"; $("#genericContent").classList.toggle("hidden", isReading); $("#readingContent").classList.toggle("hidden", !isReading); $("#newArticleHeaderButton").classList.toggle("hidden", !isReading); if (!isReading) return;
  const tab = activeSubTab(); $("#readingTabTitle").textContent = tab.name; const articles = tab.articles || []; const list = $("#articleList"); list.innerHTML = ""; $("#readingEmpty").classList.toggle("hidden", articles.length > 0);
  articles.forEach((article) => {
    const itemCount = article.items?.length || 0; const card = document.createElement("article"); card.className = "article-card";
    card.innerHTML = `<div class="article-card-top"><div><span class="article-date">${escapeHtml(article.date || "")}</span><h4>${escapeHtml(article.title)}</h4><p>${escapeHtml(article.memo || "")}</p></div><span class="article-count">${itemCount} items</span></div><div class="article-actions">${article.url ? `<a class="secondary-button link-button" href="${escapeHtml(article.url)}" target="_blank" rel="noopener">記事を読む ↗</a>` : ""}<button class="secondary-button" data-items="${article.id}">＋ 覚えるものを追加</button>${itemCount ? `<button class="new-button" data-review="${article.id}">▶ 復習 ${itemCount}件</button>` : ""}</div>${itemCount ? `<div class="item-preview">${article.items.slice(0,3).map((x) => `<span><strong>${escapeHtml(x.term)}</strong> · ${escapeHtml(x.meaning)}</span>`).join("")}${itemCount > 3 ? `<span>＋ ${itemCount-3} more</span>` : ""}</div>` : ""}`;
    list.appendChild(card);
  });
}
function render() {
  renderMainTabs(); renderSubTabs(); renderGeneric(); renderReading();
  $("#tabCount").textContent = Object.values(state.tabs).reduce((n, tabs) => n + tabs.length, 0);
  $("#studyMinutes").innerHTML = `${totalItems()} <small>items</small>`;
}
function totalItems() { return state.tabs.reading.reduce((n, t) => n + (t.articles || []).reduce((m, a) => m + (a.items?.length || 0), 0), 0); }

async function addSubTab() {
  const category = state.activeCategory; const name = window.prompt(`${categories[category].label} に追加するタブ名を入力してください`, category === "reading" ? "BBC News" : "New lesson"); if (!name?.trim()) return;
  const { data, error } = await supabase.from("study_tabs").insert({ user_id: currentUser.id, category, name: name.trim() }).select("id,name,category").single(); if (error) return showError(error);
  data.articles = category === "reading" ? [] : undefined; state.tabs[category].push(data); state.activeSubTabs[category] = data.id; saveUi(); render();
}
async function removeSubTab(id) {
  const category = state.activeCategory, tabs = categoryTabs(), index = tabs.findIndex((t) => t.id === id); if (index < 0 || tabs.length <= 1) return;
  if (!confirm(`「${tabs[index].name}」を削除しますか？`)) return;
  const { error } = await supabase.from("study_tabs").delete().eq("id", id); if (error) return showError(error);
  tabs.splice(index, 1); state.activeSubTabs[category] = tabs[Math.max(0, index - 1)].id; saveUi(); render();
}

async function openArticleDialog() { $("#articleForm").reset(); showDialog("articleDialog"); $("#articleTitle").focus(); }
async function saveArticle(e) {
  e.preventDefault(); const tab = activeSubTab();
  const payload = { user_id: currentUser.id, tab_id: tab.id, title: $("#articleTitle").value.trim(), url: $("#articleUrl").value.trim() || null, memo: $("#articleMemo").value.trim() || null };
  const { data, error } = await supabase.from("reading_articles").insert(payload).select("id,tab_id,title,url,memo,article_date,created_at").single(); if (error) return showError(error);
  tab.articles ||= []; tab.articles.unshift({ id: data.id, title: data.title, url: data.url || "", memo: data.memo || "", date: data.article_date, items: [] }); closeDialog("articleDialog"); render();
}
function parseItems(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("[")) { try { const arr = JSON.parse(trimmed); return arr.map((x) => ({ term: x.term || x.word || x.expression || "", meaning: x.meaning || "", how: x.how || x.memory || x.mnemonic || "", example: x.example || "" })).filter((x) => x.term && x.meaning); } catch {} }
  return text.split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line) => { const parts = line.split(/\t|\s{2,}|\s*\/\s*/).map((x) => x.trim()); return { term: parts[0] || "", meaning: parts[1] || "", how: parts[2] || "", example: parts[3] || "" }; }).filter((x) => x.term && x.meaning);
}
function findArticle(id) { return (activeSubTab()?.articles || []).find((a) => a.id === id); }
async function saveItems(e) {
  e.preventDefault(); const article = findArticle(window.currentArticleId); if (!article) return; const items = parseItems($("#itemsInput").value); if (!items.length) return alert("読み取れるデータがありません。4列のタブ区切りで貼ってみてください。");
  const payload = items.map((x) => ({ user_id: currentUser.id, article_id: article.id, term: x.term, meaning: x.meaning, how: x.how || null, example: x.example || null }));
  const { data, error } = await supabase.from("learning_items").insert(payload).select("id,article_id,term,meaning,how,example,level,last_reviewed"); if (error) return showError(error);
  article.items.push(...data.map((x) => ({ id: x.id, term: x.term, meaning: x.meaning, how: x.how || "", example: x.example || "", level: x.level || 0, lastReviewed: x.last_reviewed }))); closeDialog("itemsDialog"); render();
}

function startReview(article) { if (!article?.items?.length) return; reviewState = { article, index: 0, revealed: false }; showDialog("reviewDialog"); renderReview(); }
async function updateReview(item, level) { const { error } = await supabase.from("learning_items").update({ level, last_reviewed: new Date().toISOString() }).eq("id", item.id); if (error) return showError(error); item.level = level; item.lastReviewed = new Date().toISOString(); }
function renderReview() {
  const item = reviewState.article.items[reviewState.index], total = reviewState.article.items.length, revealed = reviewState.revealed;
  $("#reviewBody").innerHTML = `<div class="review-progress">${reviewState.index + 1} / ${total}</div><div class="review-card"><p class="review-label">英語</p><h3>${escapeHtml(item.term)}</h3>${revealed ? `<div class="answer"><strong>${escapeHtml(item.meaning)}</strong>${item.how ? `<p>🧠 ${escapeHtml(item.how)}</p>` : ""}${item.example ? `<p class="review-example">${escapeHtml(item.example)}</p>` : ""}</div>` : `<p class="tap-hint">まず意味を思い出してみよう。</p>`}</div>${revealed ? `<div class="review-buttons"><button class="review-result" data-level="0">😵 忘れた</button><button class="review-result" data-level="1">😐 あやしい</button><button class="review-result good" data-level="2">😊 余裕</button></div>` : `<button class="new-button reveal-button" id="revealAnswer">答えを見る</button>`}`;
  $("#revealAnswer")?.addEventListener("click", () => { reviewState.revealed = true; renderReview(); });
  $$(".review-result").forEach((b) => b.addEventListener("click", async () => { await updateReview(item, Number(b.dataset.level)); if (reviewState.index < total - 1) { reviewState.index++; reviewState.revealed = false; renderReview(); } else { $("#reviewBody").innerHTML = `<div class="review-finished"><div class="content-icon">🎉</div><h3>今日の復習、おつかれさま！</h3><p>${total}件を復習しました。</p><button class="new-button" data-close="reviewDialog">閉じる</button></div>`; $("[data-close=reviewDialog]").addEventListener("click", () => closeDialog("reviewDialog")); } }));
}

function showError(error) { console.error(error); alert(`保存に失敗しました。\n${error.message || error}`); }
function setAuthMessage(text, isError = false) { const el = $("#authMessage"); el.textContent = text; el.style.color = isError ? "#c33" : ""; }
async function openAppForSession(session) {
  currentUser = session?.user || null;
  if (!currentUser) { $("#logoutButton").classList.add("hidden"); $("#authUser").textContent = ""; showDialog("authDialog"); return; }
  $("#authUser").textContent = currentUser.email || ""; $("#logoutButton").classList.remove("hidden"); closeDialog("authDialog");
  try { await loadCloudData(); } catch (error) { showError(error); }
}
async function login(email, password) { const { data, error } = await supabase.auth.signInWithPassword({ email, password }); if (error) return setAuthMessage(error.message, true); await openAppForSession(data.session); }
async function signup(email, password) { const { data, error } = await supabase.auth.signUp({ email, password }); if (error) return setAuthMessage(error.message, true); if (data.session) await openAppForSession(data.session); else setAuthMessage("確認メールを送りました。メール内のリンクを開いてからログインしてください。"); }

$("#newTabButton").addEventListener("click", addSubTab);
$$(".main-tab").forEach((b) => b.addEventListener("click", () => { state.activeCategory = b.dataset.mainTab; saveUi(); render(); }));
$$("[data-close]").forEach((b) => b.addEventListener("click", () => closeDialog(b.dataset.close)));
$("#newArticleButton").addEventListener("click", openArticleDialog); $("#newArticleHeaderButton").addEventListener("click", openArticleDialog); $("#articleForm").addEventListener("submit", saveArticle);
$("#articleList").addEventListener("click", (e) => { const itemId = e.target.closest("[data-items]")?.dataset.items, reviewId = e.target.closest("[data-review]")?.dataset.review; if (itemId) { window.currentArticleId = itemId; $("#itemsInput").value = ""; showDialog("itemsDialog"); $("#itemsInput").focus(); } if (reviewId) startReview(findArticle(reviewId)); });
$("#itemsForm").addEventListener("submit", saveItems);
$("#authForm").addEventListener("submit", async (e) => { e.preventDefault(); setAuthMessage("ログイン中…"); await login($("#authEmail").value.trim(), $("#authPassword").value); });
$("#signupButton").addEventListener("click", async () => { setAuthMessage("アカウントを作成中…"); await signup($("#authEmail").value.trim(), $("#authPassword").value); });
$("#logoutButton").addEventListener("click", async () => { await supabase.auth.signOut(); });
supabase.auth.onAuthStateChange((_event, session) => { setTimeout(() => openAppForSession(session), 0); });

const { data: { session } } = await supabase.auth.getSession();
await openAppForSession(session);
