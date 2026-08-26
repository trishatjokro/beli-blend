// The actual "Blend" math: cosine similarity over shared-restaurant score
// vectors (do you two rank the same places the same way), blended with cosine
// similarity over cuisine-preference vectors (do you vibe even where your
// restaurant lists don't overlap yet).
window.BeliAlgorithm = (function () {
  const { normalizeName } = window.BeliParse;

  function cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return null;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  function indexByName(person) {
    const map = new Map();
    for (const r of person.restaurants) {
      const key = normalizeName(r.name);
      if (key) map.set(key, r);
    }
    return map;
  }

  function sharedItems(personA, personB) {
    const mapA = indexByName(personA);
    const mapB = indexByName(personB);
    const items = [];
    for (const [key, ra] of mapA.entries()) {
      const rb = mapB.get(key);
      if (rb) {
        items.push({
          name: ra.name,
          cuisine: ra.cuisine || rb.cuisine || "",
          scoreA: ra.score,
          scoreB: rb.score,
          diff: Math.abs(ra.score - rb.score),
        });
      }
    }
    return items;
  }

  function restaurantCosine(shared) {
    if (shared.length < 2) return null;
    const vecA = shared.map((s) => s.scoreA);
    const vecB = shared.map((s) => s.scoreB);
    return cosineSimilarity(vecA, vecB);
  }

  function cuisineVectors(personA, personB) {
    function avgByCuisine(person) {
      const sums = new Map();
      const counts = new Map();
      for (const r of person.restaurants) {
        const c = (r.cuisine || "").trim().toLowerCase();
        if (!c) continue;
        sums.set(c, (sums.get(c) || 0) + r.score);
        counts.set(c, (counts.get(c) || 0) + 1);
      }
      const avgs = new Map();
      for (const [c, sum] of sums.entries()) avgs.set(c, sum / counts.get(c));
      return avgs;
    }
    const avgA = avgByCuisine(personA);
    const avgB = avgByCuisine(personB);
    const cuisines = Array.from(new Set([...avgA.keys(), ...avgB.keys()]));
    if (cuisines.length === 0) return null;
    const vecA = cuisines.map((c) => avgA.get(c) || 0);
    const vecB = cuisines.map((c) => avgB.get(c) || 0);
    return { cuisines, vecA, vecB, avgA, avgB };
  }

  function tierLabel(pct) {
    if (pct >= 81) return "Same Stomach, Same Soul";
    if (pct >= 61) return "Great Eats Duo";
    if (pct >= 41) return "Solid Match";
    if (pct >= 21) return "Curious Explorers";
    return "Different Palates";
  }

  function topSharedCuisines(cv, limit = 5) {
    if (!cv) return [];
    return cv.cuisines
      .filter((c) => cv.avgA.has(c) && cv.avgB.has(c))
      .map((c) => ({ cuisine: c, avgA: cv.avgA.get(c), avgB: cv.avgB.get(c), combined: cv.avgA.get(c) + cv.avgB.get(c) }))
      .sort((a, b) => b.combined - a.combined)
      .slice(0, limit);
  }

  function recommendations(from, to, shared, threshold = 8, limit = 3) {
    // restaurants "to" rated highly that "from" hasn't been to
    const sharedKeys = new Set(shared.map((s) => normalizeName(s.name)));
    return to.restaurants
      .filter((r) => r.score >= threshold && !sharedKeys.has(normalizeName(r.name)))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  function compute(personA, personB) {
    const shared = sharedItems(personA, personB);
    const rCos = restaurantCosine(shared);
    const cv = cuisineVectors(personA, personB);
    const cCos = cv ? cosineSimilarity(cv.vecA, cv.vecB) : null;

    let raw;
    if (rCos !== null && cCos !== null) raw = 0.7 * rCos + 0.3 * cCos;
    else if (rCos !== null) raw = rCos;
    else if (cCos !== null) raw = cCos;
    else raw = 0;

    const pct = Math.round(Math.max(0, Math.min(1, raw)) * 100);

    const sortedByDiff = [...shared].sort((a, b) => a.diff - b.diff);
    const mostAgreed = sortedByDiff[0] || null;
    const mostDisagreed = sortedByDiff[sortedByDiff.length - 1] || null;

    return {
      pct,
      tier: tierLabel(pct),
      shared,
      mostAgreed,
      mostDisagreed,
      sharedCuisines: topSharedCuisines(cv),
      recsForA: recommendations(personA, personB, shared),
      recsForB: recommendations(personB, personA, shared),
    };
  }

  return { cosineSimilarity, compute, tierLabel };
})();
