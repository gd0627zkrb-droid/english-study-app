const STORAGE_KEY = "english-study-tabs-v2";

const categories = {
  speaking: { label: "Speaking", icon: "🎙️", description: "話す練習を、自分のテーマごとに整理できます。" },
  listening: { label: "Listening", icon: "🎧", description: "聞き取り練習を、自分のテーマごとに整理できます。" },
  writing: { label: "Writing", icon: "✍️", description: "英作文・日記・添削用のタブを整理できます。" },
  reading: { label: "Reading", icon: "📖", description: "英文読解・記事・教材をテーマごとに整理できます。" },
};

const defaultTabs = {
  speaking: [{ id: "speaking-default", name: "My Speaking" }],
  listening: [{ id: "listening-default", name: "My Listening" }],
  writing: [{ id: "writing-default", name: "My Writing" }],
  reading: [{ id: "reading-default", name: "My Reading", articles: [] }],
};

const initialState = { tabs: defaultTabs, activeCategory: "speaking", activeSubTabs: { speaking: "speaking-default", listening: "listening-default", writing: "writing-default", reading: "reading-default" } };
let state;
try { state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || initialState; } catch { state = initialState; }
Object.keys(defaultTabs).forEach((key) => {
  state.tabs[key] ||= defaultTabs[key];
  state.tabs[key].forEach((tab) => { if (key === "reading") tab.articles ||= []; });
  state.activeSubTabs[key] ||= state.tabs[key][0].id;
});

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function currentCategory() { return categories[state.activeCategory]; }
function activeSubTab() { return state.tabs[state.activeCategory].find((tab) => tab.id === state.activeSubTabs[state.activeCategory]) || state.tabs[state.activeCategory][0]; }
function escapeHtml(value = "") { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }
function showDialog(id) { $("#" + id).showModal(); }
function closeDialog(id) { $("#" + id).close(); }

function renderMainTabs() { $$(".main-tab").forEach((b) => b.classList.toggle("active", b.dataset.mainTab === state.activeCategory)); }

function renderSubTabs() {
  const category = state.activeCategory, tabs = state.tabs[category], activeId = state.activeSubTabs[category], container = $("#subTabs");
  container.innerHTML = "";
  tabs.forEach((tab) => {
    const button = document.createElement("button");
    button.className = `sub-tab${tab.id === activeId ? " active" : ""}`;
    button.dataset.subTab = tab.id;
    button.innerHTML = `<span>${escapeHtml(tab.name)}</span>`;
    if (!tab.id.endsWith("-default")) {
      const close = document.createElement("button"); close.className = "close-sub"; close.type = "button"; close.textContent = "×"; close.title = "このタブを削除";
      close.addEventListener("click", (e) => { e.stopPropagation(); removeSubTab(tab.id); }); button.appendChild(close);
    }
    button.addEventListener("click", () => { state.activeSubTabs[category] = tab.id; persist(); render(); });
    container.appendChild(button);
  });
}

function renderGeneric() {
  const category = currentCategory(), tab = activeSubTab();
  $("#workspaceKicker").textContent = category.label.toUpperCase(); $("#workspaceTitle").textContent = category.label;
  $("#contentIcon").textContent = category.icon; $("#contentTitle").textContent = `${tab.name} を始めよう`; $("#contentDescription").textContent = category.description;
}

function renderReading() {
  const isReading = state.activeCategory === "reading";
  $("#genericContent").classList.toggle("hidden", isReading);
  $("#readingContent").classList.toggle("hidden", !isReading);
  $("#newArticleHeaderButton").classList.toggle("hidden", !isReading);
  if (!isReading) return;
  const tab = activeSubTab(); $("#readingTabTitle").textContent = tab.name;
  const articles = tab.articles || []; const list = $("#articleList"); list.innerHTML = ""; $("#readingEmpty").classList.toggle("hidden", articles.length > 0);
  articles.slice().reverse().forEach((article) => {
    const itemCount = article.items?.length || 0;
    const card = document.createElement("article"); card.className = "article-card";
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

function addSubTab() {
  const category = state.activeCategory, name = window.prompt(`${currentCategory().label} に追加するタブ名を入力してください`, category === "reading" ? "BBC News" : "New lesson");
  if (!name?.trim()) return; const id = `${category}-${Date.now()}`; state.tabs[category].push({ id, name: name.trim(), ...(category === "reading" ? { articles: [] } : {}) }); state.activeSubTabs[category] = id; persist(); render();
}
function removeSubTab(id) {
  const category = state.activeCategory, tabs = state.tabs[category], index = tabs.findIndex((t) => t.id === id); if (index < 0) return;
  if (!confirm(`「${tabs[index].name}」を削除しますか？`)) return; tabs.splice(index, 1); state.activeSubTabs[category] = tabs[Math.max(0, index - 1)].id; persist(); render();
}

$("#newTabButton").addEventListener("click", addSubTab);
$$(".main-tab").forEach((b) => b.addEventListener("click", () => { state.activeCategory = b.dataset.mainTab; persist(); render(); }));
$$("[data-close]").forEach((b) => b.addEventListener("click", () => closeDialog(b.dataset.close)));

function openArticleDialog() { $("#articleForm").reset(); showDialog("articleDialog"); $("#articleTitle").focus(); }
$("#newArticleButton").addEventListener("click", openArticleDialog);
$("#newArticleHeaderButton").addEventListener("click", openArticleDialog);
$("#articleForm").addEventListener("submit", (e) => {
  e.preventDefault(); const tab = activeSubTab(); tab.articles ||= [];
  tab.articles.push({ id: `article-${Date.now()}`, title: $("#articleTitle").value.trim(), url: $("#articleUrl").value.trim(), memo: $("#articleMemo").value.trim(), date: new Date().toLocaleDateString("ja-JP"), items: [] });
  persist(); closeDialog("articleDialog"); render();
});

function parseItems(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("[")) {
    try { const arr = JSON.parse(trimmed); return arr.map((x) => ({ term: x.term || x.word || x.expression || "", meaning: x.meaning || "", how: x.how || x.memory || x.mnemonic || "", example: x.example || "" })).filter((x) => x.term); } catch {}
  }
  return text.split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const parts = line.split(/\t|\s{2,}|\s*\/\s*/).map((x) => x.trim());
    return { term: parts[0] || "", meaning: parts[1] || "", how: parts[2] || "", example: parts[3] || "" };
  }).filter((x) => x.term && x.meaning);
}

function findArticle(id) { return (activeSubTab().articles || []).find((a) => a.id === id); }
$("#articleList").addEventListener("click", (e) => {
  const itemId = e.target.closest("[data-items]")?.dataset.items, reviewId = e.target.closest("[data-review]")?.dataset.review;
  if (itemId) { state.currentArticleId = itemId; $("#itemsInput").value = ""; showDialog("itemsDialog"); $("#itemsInput").focus(); }
  if (reviewId) startReview(findArticle(reviewId));
});
$("#itemsForm").addEventListener("submit", (e) => {
  e.preventDefault(); const article = findArticle(state.currentArticleId); if (!article) return;
  const items = parseItems($("#itemsInput").value); if (!items.length) { alert("読み取れるデータがありません。4列のタブ区切りで貼ってみてください。"); return; }
  article.items = [...(article.items || []), ...items.map((x) => ({ ...x, id: `item-${Date.now()}-${Math.random().toString(16).slice(2)}`, level: 0, lastReviewed: null }))];
  persist(); closeDialog("itemsDialog"); render();
});

let reviewState = null;
function startReview(article) {
  if (!article?.items?.length) return; reviewState = { article, index: 0, revealed: false }; showDialog("reviewDialog"); renderReview();
}
function renderReview() {
  const item = reviewState.article.items[reviewState.index]; const total = reviewState.article.items.length; const revealed = reviewState.revealed;
  $("#reviewBody").innerHTML = `<div class="review-progress">${reviewState.index + 1} / ${total}</div><div class="review-card"><p class="review-label">英語</p><h3>${escapeHtml(item.term)}</h3>${revealed ? `<div class="answer"><strong>${escapeHtml(item.meaning)}</strong>${item.how ? `<p>🧠 ${escapeHtml(item.how)}</p>` : ""}${item.example ? `<p class="review-example">${escapeHtml(item.example)}</p>` : ""}</div>` : `<p class="tap-hint">まず意味を思い出してみよう。</p>`}</div>${revealed ? `<div class="review-buttons"><button class="review-result" data-level="0">😵 忘れた</button><button class="review-result" data-level="1">😐 あやしい</button><button class="review-result good" data-level="2">😊 余裕</button></div>` : `<button class="new-button reveal-button" id="revealAnswer">答えを見る</button>`}`;
  $("#revealAnswer")?.addEventListener("click", () => { reviewState.revealed = true; renderReview(); });
  $$(".review-result").forEach((b) => b.addEventListener("click", () => { item.level = Number(b.dataset.level); item.lastReviewed = new Date().toISOString(); if (reviewState.index < total - 1) { reviewState.index++; reviewState.revealed = false; renderReview(); } else { $("#reviewBody").innerHTML = `<div class="review-finished"><div class="content-icon">🎉</div><h3>今日の復習、おつかれさま！</h3><p>${total}件を復習しました。</p><button class="new-button" data-close="reviewDialog">閉じる</button></div>`; $("[data-close=reviewDialog]").addEventListener("click", () => closeDialog("reviewDialog")); persist(); } }));
}

render();
