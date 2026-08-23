const API = "https://vkzxknpveoghhccgwaan.supabase.co/rest/v1";
const KEY = "sb_publishable_N2Hxy1FWrPCbUz6ifyQx6w_fqpWal1l";
const HEADERS = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function api(table, { method = "GET", params = [], body, returning = false } = {}) {
  const qs = params.length ? `?${params.join("&")}` : "";
  const res = await fetch(`${API}/${table}${qs}`, {
    method,
    headers: { ...HEADERS, ...(returning ? { Prefer: "return=representation" } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(data?.message || data?.details || data?.hint || text || `HTTP ${res.status}`);
  return data;
}

function parseBundle(text) {
  const norm = text.replace(/\r/g, "");
  const sections = {};
  const re = /【(英文|翻訳|単語・表現|文法・構文)】/g;
  let match, last = null, lastPos = 0;
  while ((match = re.exec(norm))) {
    if (last) sections[last] = norm.slice(lastPos, match.index).trim();
    last = match[1];
    lastPos = re.lastIndex;
  }
  if (last) sections[last] = norm.slice(lastPos).trim();
  const vocab = (sections["単語・表現"] || "")
    .split(/\n+/)
    .map(x => x.trim())
    .filter(Boolean)
    .filter(x => !/^[-|\s]*$/.test(x))
    .map(line => {
      const p = line.split(/\t|\s*\|\s*/).map(x => x.trim()).filter(Boolean);
      if (p[0]?.includes("単語") && p[1]?.includes("意味")) return null;
      return p.length >= 2 ? { term: p[0], meaning: p[1], context: p[2] || "", how: p[3] || "", example: p[4] || "" } : null;
    })
    .filter(Boolean);
  return {
    english: sections["英文"] || "",
    translation: sections["翻訳"] || "",
    grammar: sections["文法・構文"] || "",
    vocab,
  };
}

function formatBundle(item, items) {
  const vocab = (items || []).map(x => [x.term, x.meaning, x.context || "", x.how || "", x.example || ""].join(" | ")).join("\n");
  return `【英文】\n${item.english || ""}\n\n【翻訳】\n${item.translation || ""}\n\n【単語・表現】\n${vocab}\n\n【文法・構文】\n${item.grammar || ""}`;
}

async function loadReadingBundle(id) {
  const rows = await api("reading_articles", { params: [`id=eq.${encodeURIComponent(id)}`, "select=id,english_text,japanese_translation,grammar_notes"] });
  const item = rows?.[0];
  if (!item) throw new Error("Readingデータが見つかりません。");
  const items = await api("learning_items", { params: [`article_id=eq.${encodeURIComponent(id)}`, "select=id,term,meaning,context,how,example", "order=created_at.asc"] });
  return {
    item: { english: item.english_text || "", translation: item.japanese_translation || "", grammar: item.grammar_notes || "" },
    items: items || [],
  };
}

async function loadListeningBundle(id) {
  const rows = await api("listening_podcasts", { params: [`id=eq.${encodeURIComponent(id)}`, "select=id,transcript,japanese_translation,grammar_notes"] });
  const item = rows?.[0];
  if (!item) throw new Error("Listeningデータが見つかりません。");
  const items = await api("listening_items", { params: [`podcast_id=eq.${encodeURIComponent(id)}`, "select=id,term,meaning,context,how,example", "order=created_at.asc"] });
  return {
    item: { english: item.transcript || "", translation: item.japanese_translation || "", grammar: item.grammar_notes || "" },
    items: items || [],
  };
}

async function mergeVocab({ table, foreignKey, parentId, currentItems, incoming }) {
  const byTerm = new Map((currentItems || []).map(x => [String(x.term || "").trim().toLowerCase(), x]));
  for (const v of incoming) {
    const key = String(v.term || "").trim().toLowerCase();
    const existing = byTerm.get(key);
    const payload = {
      term: v.term,
      meaning: v.meaning,
      context: v.context || null,
      how: v.how || null,
      example: v.example || null,
    };
    if (existing) {
      await api(table, { method: "PATCH", params: [`id=eq.${encodeURIComponent(existing.id)}`], body: payload });
    } else {
      await api(table, { method: "POST", body: { [foreignKey]: parentId, ...payload } });
    }
  }
}

let readingId = null;
let listeningId = null;
let readingExisting = null;
let listeningExisting = null;

function showDialog(id) {
  const el = document.querySelector(`#${id}`);
  if (el && !el.open) el.showModal();
}

function setEditingLabels() {
  document.querySelectorAll("[data-bundle]").forEach(b => b.textContent = "編集 / ChatGPT一括登録");
  document.querySelectorAll("[data-podcast-bundle]").forEach(b => b.textContent = "編集 / ChatGPT一括登録");
}

const observer = new MutationObserver(setEditingLabels);
observer.observe(document.body, { childList: true, subtree: true });
setEditingLabels();

document.addEventListener("click", async (e) => {
  const readingButton = e.target.closest("[data-bundle]");
  const listeningButton = e.target.closest("[data-podcast-bundle]");
  if (!readingButton && !listeningButton) return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  try {
    if (readingButton) {
      readingId = readingButton.dataset.bundle;
      readingExisting = await loadReadingBundle(readingId);
      const input = document.querySelector("#bundleInput");
      input.value = formatBundle(readingExisting.item, readingExisting.items);
      showDialog("bundleDialog");
      input.focus();
    } else {
      listeningId = listeningButton.dataset.podcastBundle;
      listeningExisting = await loadListeningBundle(listeningId);
      const input = document.querySelector("#listeningBundleInput");
      input.value = formatBundle(listeningExisting.item, listeningExisting.items);
      showDialog("listeningBundleDialog");
      input.focus();
    }
  } catch (err) {
    console.error(err);
    alert(`データの読み込みに失敗しました。\n${err.message || err}`);
  }
}, true);

document.addEventListener("submit", async (e) => {
  if (e.target?.id !== "bundleForm" && e.target?.id !== "listeningBundleForm") return;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  try {
    if (e.target.id === "bundleForm") {
      if (!readingId || !readingExisting) return;
      const parsed = parseBundle(document.querySelector("#bundleInput").value);
      await api("reading_articles", {
        method: "PATCH",
        params: [`id=eq.${encodeURIComponent(readingId)}`],
        body: {
          english_text: parsed.english || readingExisting.item.english || null,
          japanese_translation: parsed.translation || readingExisting.item.translation || null,
          grammar_notes: parsed.grammar || readingExisting.item.grammar || null,
        },
      });
      await mergeVocab({ table: "learning_items", foreignKey: "article_id", parentId: readingId, currentItems: readingExisting.items, incoming: parsed.vocab });
      document.querySelector("#bundleDialog")?.close();
    } else {
      if (!listeningId || !listeningExisting) return;
      const parsed = parseBundle(document.querySelector("#listeningBundleInput").value);
      await api("listening_podcasts", {
        method: "PATCH",
        params: [`id=eq.${encodeURIComponent(listeningId)}`],
        body: {
          transcript: parsed.english || listeningExisting.item.english || null,
          japanese_translation: parsed.translation || listeningExisting.item.translation || null,
          grammar_notes: parsed.grammar || listeningExisting.item.grammar || null,
        },
      });
      await mergeVocab({ table: "listening_items", foreignKey: "podcast_id", parentId: listeningId, currentItems: listeningExisting.items, incoming: parsed.vocab });
      document.querySelector("#listeningBundleDialog")?.close();
    }
    location.reload();
  } catch (err) {
    console.error(err);
    alert(`保存に失敗しました。\n${err.message || err}`);
  }
}, true);
