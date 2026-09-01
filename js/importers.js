// Imports restaurant ratings from official personal-data exports, so people
// don't have to re-type or screenshot everything.
//
// Google Takeout ("Maps (your places)" -> Reviews.json) format confirmed
// against a real export via a third-party parser (github.com/cnqstdr/
// PizzaPlacesVisited): a GeoJSON FeatureCollection where each feature has
// properties.location.name and properties.five_star_rating_published (1-5).
//
// Yelp's "Download Your Data" export exists (Privacy Settings) but Yelp does
// not document its field names or format anywhere, so rather than guess at
// specific JSON keys, CSV import below uses column-name auto-detection —
// it'll pick up a Yelp export if it turns out to be CSV, plus any other
// spreadsheet-style export, without hardcoding unverified specifics.
window.BeliImporters = (function () {

  function clampScore(n) {
    return Math.max(0, Math.min(10, n));
  }

  function parseGoogleTakeout(jsonText) {
    let data;
    try {
      data = JSON.parse(jsonText);
    } catch (e) {
      return { items: [], warning: "Couldn't parse this as JSON." };
    }
    const features = Array.isArray(data.features) ? data.features : null;
    if (!features) {
      return { items: [], warning: "This doesn't look like a Google Takeout Reviews.json file (expected a GeoJSON FeatureCollection)." };
    }
    const items = [];
    for (const f of features) {
      const props = f.properties || {};
      const name = props.location && props.location.name;
      const rating = props.five_star_rating_published;
      if (!name || typeof rating !== "number") continue;
      items.push({ name, score: clampScore(rating * 2), cuisine: "" });
    }
    if (items.length === 0) {
      return { items: [], warning: "No star-rated reviews found in this file." };
    }
    return { items, warning: null };
  }

  function parseCSVRows(text) {
    const rows = [];
    let row = [], field = "", inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field); field = "";
      } else if (c === "\n") {
        row.push(field); rows.push(row); row = []; field = "";
      } else if (c !== "\r") {
        field += c;
      }
    }
    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim() !== ""));
  }

  function findColumn(header, candidates) {
    for (const c of candidates) {
      const idx = header.indexOf(c);
      if (idx !== -1) return idx;
    }
    for (let i = 0; i < header.length; i++) {
      if (candidates.some((c) => header[i].includes(c))) return i;
    }
    return -1;
  }

  function parseCSV(text) {
    const rows = parseCSVRows(text);
    if (rows.length < 2) {
      return { items: [], warning: "No data rows found in this CSV." };
    }
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const nameIdx = findColumn(header, ["name", "restaurant", "restaurant name", "business", "business name", "place", "place name"]);
    const scoreIdx = findColumn(header, ["rating", "stars", "score", "my rating", "rank"]);
    const cuisineIdx = findColumn(header, ["cuisine", "category", "categories", "tag", "tags"]);

    if (nameIdx === -1 || scoreIdx === -1) {
      return { items: [], warning: "Couldn't find name/rating columns in this CSV — try Paste or Add manually instead." };
    }

    const raw = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const name = (r[nameIdx] || "").trim();
      const score = parseFloat((r[scoreIdx] || "").trim());
      if (!name || isNaN(score)) continue;
      raw.push({ name, score, cuisine: cuisineIdx !== -1 ? (r[cuisineIdx] || "").trim() : "" });
    }
    if (raw.length === 0) {
      return { items: [], warning: "Found the columns but no usable rows — try Paste or Add manually instead." };
    }

    // Auto-scale: if every score fits a 5-star scale, assume stars and normalize to /10.
    const maxScore = Math.max(...raw.map((x) => x.score));
    const scale = maxScore > 0 && maxScore <= 5 ? 2 : 1;
    const items = raw.map((x) => ({ ...x, score: clampScore(x.score * scale) }));
    return { items, warning: null };
  }

  async function importFile(file) {
    const text = await file.text();
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (ext === "json") return parseGoogleTakeout(text);
    if (ext === "csv") return parseCSV(text);
    const trimmed = text.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) return parseGoogleTakeout(text);
    return parseCSV(text);
  }

  return { importFile, parseGoogleTakeout, parseCSV };
})();
