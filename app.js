const STORAGE_KEY = "english-study-tabs-v1";

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
  reading: [{ id: "reading-default", name: "My Reading" }],
};

const saved = localStorage.getItem(STORAGE_KEY);
const state = saved ? JSON.parse(saved) : { tabs: defaultTabs, activeCategory: "speaking", activeSubTabs: { speaking: "speaking-default", listening: "listening-default", writing: "writing-default", reading: "reading-default" } };

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function currentCategory() {
  return categories[state.activeCategory];
}

function renderMainTabs() {
  $$(".main-tab").forEach((button) => button.classList.toggle("active", button.dataset.mainTab === state.activeCategory));
}

function renderSubTabs() {
  const category = state.activeCategory;
  const tabs = state.tabs[category];
  const activeId = state.activeSubTabs[category];
  const container = $("#subTabs");
  container.innerHTML = "";

  tabs.forEach((tab) => {
    const button = document.createElement("button");
    button.className = `sub-tab${tab.id === activeId ? " active" : ""}`;
    button.dataset.subTab = tab.id;
    button.setAttribute("role", "tab");
    button.innerHTML = `<span>${escapeHtml(tab.name)}</span>`;

    if (!tab.id.endsWith("-default")) {
      const close = document.createElement("button");
      close.className = "close-sub";
      close.type = "button";
      close.title = "このタブを削除";
      close.textContent = "×";
      close.addEventListener("click", (event) => {
        event.stopPropagation();
        removeSubTab(tab.id);
      });
      button.appendChild(close);
    }

    button.addEventListener("click", () => {
      state.activeSubTabs[category] = tab.id;
      persist();
      render();
    });
    container.appendChild(button);
  });
}

function renderContent() {
  const category = currentCategory();
  const activeId = state.activeSubTabs[state.activeCategory];
  const activeTab = state.tabs[state.activeCategory].find((tab) => tab.id === activeId) || state.tabs[state.activeCategory][0];

  $("#workspaceKicker").textContent = category.label.toUpperCase();
  $("#workspaceTitle").textContent = category.label;
  $("#contentIcon").textContent = category.icon;
  $("#contentTitle").textContent = `${activeTab.name} を始めよう`;
  $("#contentDescription").textContent = category.description;
  $("#tabCount").textContent = Object.values(state.tabs).reduce((total, tabs) => total + tabs.length, 0);
}

function render() {
  renderMainTabs();
  renderSubTabs();
  renderContent();
}

function addSubTab() {
  const category = state.activeCategory;
  const name = window.prompt(`${currentCategory().label} に追加するタブ名を入力してください`, "New lesson");
  if (!name || !name.trim()) return;

  const cleanName = name.trim();
  const id = `${category}-${Date.now()}`;
  state.tabs[category].push({ id, name: cleanName });
  state.activeSubTabs[category] = id;
  persist();
  render();
}

function removeSubTab(id) {
  const category = state.activeCategory;
  const tabs = state.tabs[category];
  const index = tabs.findIndex((tab) => tab.id === id);
  if (index === -1) return;
  if (!window.confirm(`「${tabs[index].name}」を削除しますか？`)) return;

  tabs.splice(index, 1);
  if (state.activeSubTabs[category] === id) {
    state.activeSubTabs[category] = tabs[Math.max(0, index - 1)].id;
  }
  persist();
  render();
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

$$(".main-tab").forEach((button) => {
  button.addEventListener("click", () => {
    state.activeCategory = button.dataset.mainTab;
    persist();
    render();
  });
});

$("#newTabButton").addEventListener("click", addSubTab);

render();
