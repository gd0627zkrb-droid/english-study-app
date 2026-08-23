// Exact-sync editor for Reading / Listening ChatGPT bundle data.
// The text currently visible in the editor becomes the saved source of truth:
// deleting text or vocabulary rows also deletes them from Supabase.
(function () {
  const API = "https://vkzxknpveoghhccgwaan.supabase.co/rest/v1";
  const KEY = "sb_publishable_N2Hxy1FWrPCbUz6ifyQx6w_fqpWal1l";
  const HEADERS = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
  let readingId = null;
  let listeningId = null;

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

  function normalizeBundleText(text) {
    let s = String(text || "").replace(/\r/g, "");
    s = s
      .replace(/【\s*(?:覚えたい)?単語(?:・表現)?\s*】/g, "【単語・表現】")
      .replace(/【\s*(?:日本語)?(?:訳|翻訳)\s*】/g, "【翻訳】")
      .replace(/【\s*(?:原文|英文|文字起こし)\s*】/g, "【英文】")
      .replace(/【\s*(?:文法|文法・構文|構文)\s*】/g, "【文法・構文】")
      .replace(/^#{1,6}\s*(?:覚えたい)?単語(?:・表現)?\s*$/gmi, "【単語・表現】")
      .replace(/^#{1,6}\s*(?:日本語)?(?:訳|翻訳)\s*$/gmi, "【翻訳】")
      .replace(/^#{1,6}\s*(?:原文|英文|文字起こし)\s*$/gmi, "【英文】")
      .replace(/^#{1,6}\s*(?:文法|文法・構文|構文)\s*$/gmi, "【文法・構文】")
      .replace(/｜/g, "|");
    return s.split("\n").map(line => {
      const t = line.trim();
      return /^\|.*\|$/.test(t) ? t.slice(1, -1).trim() : line;
    }).join("\n");
  }

  function parse(text) {
    const norm = normalizeBundleText(text);
    const sections = {};
    const re = /【(英文|翻訳|単語・表現|文法・構文)】/g;
    let m, last = null, lastPos = 0;
    while ((m = re.exec(norm))) {
      if (last) sections[last] = norm.slice(lastPos, m.index).trim();
      last = m[1];
      lastPos = re.lastIndex;
    }
    if (last) sections[last] = norm.slice(lastPos).trim();

    const vocab = (sections["単語・表現"] || "")
      .split(/\n+/)
      .map(x => x.trim())
      .filter(Boolean)
      .filter(x => !/^[-|:\s]+$/.test(x))
      .map(line => {
        const p = line.split(/\t|\s*\|\s*/).map(x => x.trim());
        if (!p[0] || (p[0].includes("単語") && (p[1] || "").includes("意味"))) return null;
        if (!p[1]) return null;
        return { term: p[0], meaning: p[1], context: p[2] || null, how: p[3] || null, example: p[4] || null };
      })
      .filter(Boolean);

    return {
      english: sections["英文"] || "",
      translation: sections["翻訳"] || "",
      grammar: sections["文法・構文"] || "",
      vocab,
    };
  }

  async function replaceItems(table, foreignKey, parentId, vocab) {
    await api(table, { method: "DELETE", params: [`${foreignKey}=eq.${encodeURIComponent(parentId)}`] });
    if (vocab.length) {
      await api(table, {
        method: "POST",
        body: vocab.map(v => ({ [foreignKey]: parentId, ...v })),
      });
    }
  }

  document.addEventListener("click", function (event) {
    const r = event.target.closest?.("[data-bundle]");
    const l = event.target.closest?.("[data-podcast-bundle]");
    if (r) readingId = r.dataset.bundle;
    if (l) listeningId = l.dataset.podcastBundle;
  }, true);

  document.addEventListener("submit", async function (event) {
    const id = event.target && event.target.id;
    if (id !== "bundleForm" && id !== "listeningBundleForm") return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const isReading = id === "bundleForm";
    const input = document.querySelector(isReading ? "#bundleInput" : "#listeningBundleInput");
    const parentId = isReading ? readingId : listeningId;
    if (!input || !parentId) {
      alert("編集対象を取得できませんでした。いったん閉じて、もう一度『編集 / ChatGPT一括登録』を開いてください。");
      return;
    }

    const submit = event.target.querySelector('button[type="submit"]');
    const oldLabel = submit?.textContent;
    if (submit) { submit.disabled = true; submit.textContent = "保存中..."; }

    try {
      const data = parse(input.value);
      if (isReading) {
        await api("reading_articles", {
          method: "PATCH",
          params: [`id=eq.${encodeURIComponent(parentId)}`],
          body: {
            english_text: data.english || null,
            japanese_translation: data.translation || null,
            grammar_notes: data.grammar || null,
          },
        });
        await replaceItems("learning_items", "article_id", parentId, data.vocab);
      } else {
        await api("listening_podcasts", {
          method: "PATCH",
          params: [`id=eq.${encodeURIComponent(parentId)}`],
          body: {
            transcript: data.english || null,
            japanese_translation: data.translation || null,
            grammar_notes: data.grammar || null,
          },
        });
        await replaceItems("listening_items", "podcast_id", parentId, data.vocab);
      }
      location.reload();
    } catch (err) {
      console.error(err);
      alert(`保存に失敗しました。\n${err.message || err}`);
      if (submit) { submit.disabled = false; submit.textContent = oldLabel || "変更を保存"; }
    }
  }, true);
})();
