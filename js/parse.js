// Turns raw text (pasted, or OCR'd off a screenshot) into {name, score, cuisine}
// guesses. It's a heuristic, not a perfect parser — the review table lets the
// user fix whatever it gets wrong, which matters more than nailing every line.
window.BeliParse = (function () {

  function normalizeName(name) {
    return (name || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseLine(rawLine) {
    let line = rawLine.trim();
    if (!line) return null;

    line = line.replace(/^[-*•]\s*/, "");
    line = line.replace(/^\d{1,3}[.)]\s+/, ""); // strip leading rank, e.g. "12) "

    const numRegex = /\d{1,2}(\.\d{1,2})?/g;
    let m;
    let scoreMatch = null;
    while ((m = numRegex.exec(line)) !== null) {
      const val = parseFloat(m[0]);
      if (val >= 0 && val <= 10) scoreMatch = m; // prefer the last plausible score on the line
    }
    if (!scoreMatch) return null;

    const score = parseFloat(scoreMatch[0]);
    let rest = line.slice(0, scoreMatch.index) + line.slice(scoreMatch.index + scoreMatch[0].length);
    rest = rest.replace(/[-|]+/g, ",");
    const parts = rest.split(",").map((s) => s.trim()).filter(Boolean);

    const name = parts[0];
    const cuisine = parts[1] || "";
    if (!name || name.length < 2) return null;

    return { name, score, cuisine };
  }

  function parseBlock(text) {
    return text
      .split("\n")
      .map(parseLine)
      .filter(Boolean);
  }

  return { normalizeName, parseLine, parseBlock };
})();
