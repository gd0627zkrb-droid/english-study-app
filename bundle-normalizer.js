// Normalize pasted ChatGPT bundle text before the main app parses it.
// This keeps the core app untouched while accepting Japanese/full-width separators
// and a few common heading variations.
(function () {
  function normalizeBundleText(text) {
    let s = String(text || "").replace(/\r/g, "");

    // Normalize common section heading variations.
    s = s
      .replace(/【\s*(?:覚えたい)?単語(?:・表現)?\s*】/g, "【単語・表現】")
      .replace(/【\s*(?:日本語)?(?:訳|翻訳)\s*】/g, "【翻訳】")
      .replace(/【\s*(?:原文|英文|文字起こし)\s*】/g, "【英文】")
      .replace(/【\s*(?:文法|文法・構文|構文)\s*】/g, "【文法・構文】")
      .replace(/^#{1,6}\s*(?:覚えたい)?単語(?:・表現)?\s*$/gmi, "【単語・表現】")
      .replace(/^#{1,6}\s*(?:日本語)?(?:訳|翻訳)\s*$/gmi, "【翻訳】")
      .replace(/^#{1,6}\s*(?:原文|英文|文字起こし)\s*$/gmi, "【英文】")
      .replace(/^#{1,6}\s*(?:文法|文法・構文|構文)\s*$/gmi, "【文法・構文】");

    // Full-width Japanese vertical bar -> normal pipe.
    s = s.replace(/｜/g, "|");

    // Remove Markdown table edge pipes so the existing parser gets clean columns.
    s = s
      .split("\n")
      .map(line => {
        const trimmed = line.trim();
        if (/^\|.*\|$/.test(trimmed)) return trimmed.slice(1, -1).trim();
        return line;
      })
      .join("\n");

    return s;
  }

  document.addEventListener("submit", function (event) {
    const id = event.target && event.target.id;
    if (id !== "bundleForm" && id !== "listeningBundleForm") return;
    const input = document.querySelector(id === "bundleForm" ? "#bundleInput" : "#listeningBundleInput");
    if (input) input.value = normalizeBundleText(input.value);
  }, true);
})();
