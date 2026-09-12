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

  // Near-duplicate name matching for the fuzzy fallback below — e.g. "Joe's
  // Pizza" vs "Joes Pizza NYC" should still count as the same restaurant.
  function tokenize(name) {
    return new Set(name.split(" ").filter(Boolean));
  }

  function jaccard(setA, setB) {
    let intersection = 0;
    for (const t of setA) if (setB.has(t)) intersection++;
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  function fuzzyScore(normA, normB) {
    if (!normA || !normB) return 0;
    if (normA === normB) return 1;
    if (normA.length >= 4 && normB.length >= 4 && (normA.includes(normB) || normB.includes(normA))) return 0.9;
    return jaccard(tokenize(normA), tokenize(normB));
  }

  const FUZZY_MATCH_THRESHOLD = 0.6;

  function makeShared(ra, rb) {
    return {
      name: ra.name,
      cuisine: ra.cuisine || rb.cuisine || "",
      scoreA: ra.score,
      scoreB: rb.score,
      diff: Math.abs(ra.score - rb.score),
    };
  }

  // Returns matched items plus the sets of normalized keys (from each
  // person's own map) that ended up matched, so callers can exclude them
  // consistently even when a match came from the fuzzy fallback rather than
  // an exact name match.
  function sharedItems(personA, personB) {
    const mapA = indexByName(personA);
    const mapB = indexByName(personB);
    const items = [];
    const usedA = new Set();
    const usedB = new Set();

    for (const [key, ra] of mapA.entries()) {
      const rb = mapB.get(key);
      if (rb) {
        items.push(makeShared(ra, rb));
        usedA.add(key);
        usedB.add(key);
      }
    }

    for (const [keyA, ra] of mapA.entries()) {
      if (usedA.has(keyA)) continue;
      let bestKey = null, bestRb = null, bestScore = 0;
      for (const [keyB, rb] of mapB.entries()) {
        if (usedB.has(keyB)) continue;
        const score = fuzzyScore(keyA, keyB);
        if (score > bestScore) { bestScore = score; bestKey = keyB; bestRb = rb; }
      }
      if (bestRb && bestScore >= FUZZY_MATCH_THRESHOLD) {
        items.push(makeShared(ra, bestRb));
        usedA.add(keyA);
        usedB.add(bestKey);
      }
    }

    return { items, usedA, usedB };
  }

  function meanCenter(vec) {
    const mean = vec.reduce((a, b) => a + b, 0) / vec.length;
    return vec.map((v) => v - mean);
  }

  // Mean-centered before comparing, i.e. Pearson correlation rather than
  // plain cosine similarity — plain cosine only normalizes magnitude, not
  // offset, so two people who rank places identically but score on
  // different baselines (one always 5-7, the other 8-10) would otherwise
  // come out less "agreed" than they actually are.
  function restaurantCosine(shared) {
    if (shared.length < 2) return null;
    const vecA = meanCenter(shared.map((s) => s.scoreA));
    const vecB = meanCenter(shared.map((s) => s.scoreB));
    return cosineSimilarity(vecA, vecB);
  }

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

  function cuisineVectors(personA, personB) {
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

  function recommendations(to, excludeKeys, threshold = 8, limit = 3) {
    // restaurants "to" rated highly that the other person hasn't matched yet
    return to.restaurants
      .filter((r) => r.score >= threshold && !excludeKeys.has(normalizeName(r.name)))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  function cuisineDiversity(person) {
    const set = new Set();
    for (const r of person.restaurants) {
      const c = (r.cuisine || "").trim().toLowerCase();
      if (c) set.add(c);
    }
    return set.size;
  }

  function compute(personA, personB) {
    const { items: shared, usedA, usedB } = sharedItems(personA, personB);
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
    const topDisagreements = [...shared]
      .filter((s) => s.diff > 0)
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 3);

    return {
      pct,
      tier: tierLabel(pct),
      shared,
      mostAgreed,
      topDisagreements,
      sharedCuisines: topSharedCuisines(cv),
      adventure: { a: cuisineDiversity(personA), b: cuisineDiversity(personB) },
      recsForA: recommendations(personB, usedB),
      recsForB: recommendations(personA, usedA),
    };
  }

  // ---------------- Group ("N-way Blend") ----------------
  // Reuses the pairwise compute() above for the matrix + headline average,
  // rather than inventing new N-way statistics. "Shared by everyone" is
  // exact-normalized-name only (no fuzzy fallback) — clustering near-duplicate
  // names across N lists is real entity-resolution work; out of scope for v1,
  // same as any exact-match limitation, fix names in the review table.

  function variance(scores) {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    return scores.reduce((s, x) => s + (x - mean) ** 2, 0) / scores.length;
  }

  function sharedByAll(people) {
    const maps = people.map(indexByName);
    const [first, ...rest] = maps;
    const items = [];
    for (const [key, r0] of first.entries()) {
      const rows = [r0];
      let ok = true;
      for (const m of rest) {
        const r = m.get(key);
        if (!r) { ok = false; break; }
        rows.push(r);
      }
      if (ok) {
        items.push({
          name: r0.name,
          scores: rows.map((r) => r.score),
          cuisine: rows.find((r) => r.cuisine)?.cuisine || "",
        });
      }
    }
    return items;
  }

  function cuisineVibeGroup(people, limit = 5) {
    const avgs = people.map(avgByCuisine);
    let common = new Set(avgs[0] ? avgs[0].keys() : []);
    for (const m of avgs.slice(1)) common = new Set([...common].filter((c) => m.has(c)));
    return [...common]
      .map((c) => ({ cuisine: c, avgs: avgs.map((m) => m.get(c)), combined: avgs.reduce((s, m) => s + m.get(c), 0) }))
      .sort((a, b) => b.combined - a.combined)
      .slice(0, limit);
  }

  function recommendationsGroup(people, idx, threshold = 8, limit = 3) {
    const target = people[idx];
    const ownKeys = new Set(indexByName(target).keys());
    const scoreMap = new Map();
    people.forEach((p, j) => {
      if (j === idx) return;
      for (const r of p.restaurants) {
        const key = normalizeName(r.name);
        if (!key || ownKeys.has(key)) continue;
        if (!scoreMap.has(key)) scoreMap.set(key, { name: r.name, scores: [] });
        scoreMap.get(key).scores.push(r.score);
      }
    });
    const recs = [];
    for (const { name, scores } of scoreMap.values()) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg >= threshold) recs.push({ name, score: Math.round(avg * 10) / 10 });
    }
    return recs.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  function computeGroup(people) {
    const n = people.length;
    const pairwise = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        pairwise.push({ i, j, result: compute(people[i], people[j]) });
      }
    }
    const pct = Math.round(pairwise.reduce((s, p) => s + p.result.pct, 0) / pairwise.length);

    const shared = sharedByAll(people);
    const withVariance = shared.map((s) => ({ ...s, variance: variance(s.scores) }));
    const sortedByVariance = [...withVariance].sort((a, b) => a.variance - b.variance);
    const mostAgreed = sortedByVariance[0] || null;
    const topDisagreements = [...withVariance]
      .filter((s) => s.variance > 0)
      .sort((a, b) => b.variance - a.variance)
      .slice(0, 3);

    const diversities = people.map(cuisineDiversity);
    const maxDiversity = Math.max(...diversities);
    const mostAdventurousIdx = diversities.indexOf(maxDiversity);

    // Best/worst matched pair straight off the pairwise matrix above — only
    // meaningful with 3+ people (2 people means a single pair, i.e. no
    // "best vs worst" to report).
    const sortedPairwise = [...pairwise].sort((a, b) => b.result.pct - a.result.pct);
    const bestPair = pairwise.length >= 2 ? sortedPairwise[0] : null;
    const worstPair = pairwise.length >= 2 ? sortedPairwise[sortedPairwise.length - 1] : null;

    return {
      pct,
      tier: tierLabel(pct),
      n,
      pairwise,
      bestPair,
      worstPair,
      shared,
      mostAgreed,
      topDisagreements,
      sharedCuisines: cuisineVibeGroup(people),
      adventure: { diversities, mostAdventurousIdx },
      recs: people.map((_, i) => recommendationsGroup(people, i)),
    };
  }

  return { cosineSimilarity, compute, computeGroup, tierLabel };
})();
