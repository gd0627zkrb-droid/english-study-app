const state = {
  words: [],
  editingId: null,
};

const $ = (id) => document.getElementById(id);
const els = {
  list: $("wordList"), empty: $("emptyState"), search: $("searchInput"), filter: $("difficultyFilter"),
  dialog: $("wordDialog"), form: $("wordForm"), status: $("syncStatus"), count: $("wordCount"), today: $("todayCount"), review: $("reviewCount"),
  delete: $("deleteButton"), title: $("dialogTitle"),
};

const demoWords = [
  { id: "demo-1", word: "abandon", meaning: "捨てる、放棄する", partOfSpeech: "動詞", pronunciation: "/əˈbændən/", example: "I decided to abandon the plan.", exampleTranslation: "私はその計画を断念することにしました。", difficulty: 3, memo: "", createdAt: new Date().toISOString(), studiedAt: null },
  { id: "demo-2", word: "accurate", meaning: "正確な", partOfSpeech: "形容詞", pronunciation: "/ˈækjərət/", example: "Please make sure the information is accurate.", exampleTranslation: "情報が正確であることを確認してください。", difficulty: 2, memo: "", createdAt: new Date().toISOString(), studiedAt: null },
];

function setStatus(text) { els.status.textContent = text; }

function loadWords() {
  const saved = localStorage.getItem("english-study-demo-words");
  state.words = saved ? JSON.parse(saved) : demoWords;
  setStatus("ローカル保存");
  render();
}

function persist() {
  localStorage.setItem("english-study-demo-words", JSON.stringify(state.words));
  setStatus("保存済み");
}

function filteredWords() {
  const q = els.search.value.trim().toLowerCase();
  const d = els.filter.value;
  return state.words.filter((item) => {
    const matchesQuery = !q || [item.word, item.meaning, item.example, item.exampleTranslation, item.memo].join(" ").toLowerCase().includes(q);
    const matchesDifficulty = !d || String(item.difficulty) === d;
    return matchesQuery && matchesDifficulty;
  }).sort((a, b) => a.word.localeCompare(b.word));
}

function render() {
  const words = filteredWords();
  els.count.textContent = state.words.length;
  const today = new Date().toDateString();
  els.today.textContent = state.words.filter((w) => w.studiedAt && new Date(w.studiedAt).toDateString() === today).length;
  els.review.textContent = state.words.filter((w) => !w.studiedAt).length;
  els.list.innerHTML = "";
  els.empty.classList.toggle("hidden", words.length !== 0);

  for (const item of words) {
    const card = document.createElement("article");
    card.className = "word-card";
    const stars = "★".repeat(Number(item.difficulty || 3)) + "☆".repeat(5 - Number(item.difficulty || 3));
    card.innerHTML = `
      <div>
        <div class="word-title"><h3>${escapeHtml(item.word)}</h3><span class="pos">${escapeHtml(item.partOfSpeech || "")}</span></div>
        <div class="pronunciation">${escapeHtml(item.pronunciation || "")}</div>
        <p class="meaning">${escapeHtml(item.meaning)}</p>
        <div class="stars" aria-label="難易度">${stars}</div>
        ${item.example ? `<div class="example"><p>${escapeHtml(item.example)}</p><p class="translation">${escapeHtml(item.exampleTranslation || "")}</p></div>` : ""}
      </div>
      <div class="word-actions">
        <button class="secondary-button" data-edit="${item.id}">編集</button>
        <button class="primary-button" data-study="${item.id}">復習済み</button>
      </div>`;
    els.list.appendChild(card);
  }
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
}

function openDialog(item = null) {
  state.editingId = item?.id || null;
  els.title.textContent = item ? "単語を編集" : "単語を追加";
  els.delete.classList.toggle("hidden", !item);
  $("wordId").value = item?.id || "";
  $("word").value = item?.word || "";
  $("meaning").value = item?.meaning || "";
  $("partOfSpeech").value = item?.partOfSpeech || "";
  $("pronunciation").value = item?.pronunciation || "";
  $("example").value = item?.example || "";
  $("exampleTranslation").value = item?.exampleTranslation || "";
  $("difficulty").value = item?.difficulty || 3;
  $("memo").value = item?.memo || "";
  els.dialog.showModal();
  $("word").focus();
}

function closeDialog() { els.dialog.close(); }

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const id = state.editingId || crypto.randomUUID();
  const existing = state.words.find((w) => w.id === id);
  const item = {
    id, word: $("word").value.trim(), meaning: $("meaning").value.trim(), partOfSpeech: $("partOfSpeech").value.trim(),
    pronunciation: $("pronunciation").value.trim(), example: $("example").value.trim(), exampleTranslation: $("exampleTranslation").value.trim(),
    difficulty: Number($("difficulty").value), memo: $("memo").value.trim(), createdAt: existing?.createdAt || new Date().toISOString(), studiedAt: existing?.studiedAt || null,
  };
  if (existing) Object.assign(existing, item); else state.words.push(item);
  persist(); render(); closeDialog();
});

els.delete.addEventListener("click", () => {
  if (!state.editingId) return;
  state.words = state.words.filter((w) => w.id !== state.editingId);
  persist(); render(); closeDialog();
});

$("addWordButton").addEventListener("click", () => openDialog());
$("closeDialog").addEventListener("click", closeDialog);
$("cancelButton").addEventListener("click", closeDialog);
$("refreshButton").addEventListener("click", render);
els.search.addEventListener("input", render);
els.filter.addEventListener("change", render);
els.list.addEventListener("click", (event) => {
  const editId = event.target.dataset.edit;
  const studyId = event.target.dataset.study;
  if (editId) openDialog(state.words.find((w) => w.id === editId));
  if (studyId) {
    const item = state.words.find((w) => w.id === studyId);
    if (item) { item.studiedAt = new Date().toISOString(); persist(); render(); }
  }
});

loadWords();
