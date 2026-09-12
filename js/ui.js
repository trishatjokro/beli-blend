// DOM wiring: the restaurant-list builder (shared by the welcome and join
// views) and the Wrapped-style results slide deck.
window.BeliUI = (function () {
  const { parseBlock } = window.BeliParse;

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  // ---------------- Builder ----------------

  function createBuilder(containerEl) {
    const tpl = document.getElementById("tpl-builder");
    containerEl.innerHTML = "";
    containerEl.appendChild(tpl.content.cloneNode(true));
    const root = containerEl.querySelector(".builder");

    const items = [];
    const listeners = [];

    const reviewList = root.querySelector(".review-list");
    const reviewCount = root.querySelector(".review-count");
    const nameInput = root.querySelector(".your-name");

    function notify() {
      listeners.forEach((fn) => fn());
    }

    function addItems(newItems) {
      for (const it of newItems) {
        if (it.name && typeof it.score === "number" && !isNaN(it.score)) {
          items.push({ name: it.name, score: it.score, cuisine: it.cuisine || "" });
        }
      }
      renderReview();
    }

    function renderReview() {
      reviewList.innerHTML = "";
      const rowTpl = document.getElementById("tpl-review-row");
      items.forEach((item, idx) => {
        const node = rowTpl.content.cloneNode(true);
        const row = node.querySelector(".review-row");
        const nameEl = row.querySelector(".rr-name");
        const scoreEl = row.querySelector(".rr-score");
        const cuisineEl = row.querySelector(".rr-cuisine");
        const delEl = row.querySelector(".rr-delete");
        nameEl.value = item.name;
        scoreEl.value = item.score;
        cuisineEl.value = item.cuisine || "";
        nameEl.addEventListener("input", () => { item.name = nameEl.value; notify(); });
        scoreEl.addEventListener("input", () => { item.score = parseFloat(scoreEl.value); notify(); });
        cuisineEl.addEventListener("input", () => { item.cuisine = cuisineEl.value; });
        delEl.addEventListener("click", () => {
          items.splice(idx, 1);
          renderReview();
          notify();
        });
        reviewList.appendChild(node);
      });
      reviewCount.textContent = `${items.length} restaurant${items.length === 1 ? "" : "s"}`;
      notify();
    }

    // Tabs
    const tabBtns = root.querySelectorAll(".tab-btn");
    const panels = root.querySelectorAll(".tab-panel");
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        tabBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        panels.forEach((p) => p.classList.toggle("hidden", p.dataset.panel !== btn.dataset.tab));
      });
    });

    // OCR
    const ocrInput = root.querySelector(".ocr-file-input");
    const ocrStatus = root.querySelector(".ocr-status");
    ocrInput.addEventListener("change", async () => {
      const files = Array.from(ocrInput.files || []);
      if (!files.length) return;
      try {
        const text = await window.BeliOCR.recognizeFiles(files, (msg) => { ocrStatus.textContent = msg; });
        const parsed = parseBlock(text);
        if (parsed.length === 0) {
          ocrStatus.textContent = "Couldn't confidently read any restaurants from that image — try Paste or Add manually instead.";
        } else {
          addItems(parsed);
          ocrStatus.textContent = `Added ${parsed.length} restaurant${parsed.length === 1 ? "" : "s"} — check the list below and fix anything OCR got wrong.`;
        }
      } catch (e) {
        ocrStatus.textContent = e.message || "OCR failed — try Paste or Add manually instead.";
      }
      ocrInput.value = "";
    });

    // Import file (Google Takeout / CSV)
    const importInput = root.querySelector(".import-file-input");
    const importStatus = root.querySelector(".import-status");

    function showImportConfirm(parsed, mapping) {
      importStatus.innerHTML = "";
      const summary = document.createElement("p");
      summary.className = "hint";
      const cuisinePart = mapping.cuisine ? `, cuisine from "${escapeHtml(mapping.cuisine)}"` : "";
      const scalePart = mapping.scaledFromStars ? " (scaled from a 5-star rating to /10)" : "";
      summary.innerHTML = `Found ${parsed.length} restaurant${parsed.length === 1 ? "" : "s"} — name from "${escapeHtml(mapping.name)}", score from "${escapeHtml(mapping.score)}"${scalePart}${cuisinePart}. Check this looks right before adding.`;
      const confirmBtn = document.createElement("button");
      confirmBtn.className = "btn-secondary";
      confirmBtn.textContent = `Add ${parsed.length} restaurant${parsed.length === 1 ? "" : "s"}`;
      confirmBtn.style.marginRight = "8px";
      const cancelBtn = document.createElement("button");
      cancelBtn.className = "btn-tertiary";
      cancelBtn.textContent = "Cancel";
      confirmBtn.addEventListener("click", () => {
        addItems(parsed);
        importStatus.textContent = `Added ${parsed.length} restaurant${parsed.length === 1 ? "" : "s"} — check the list below and fix anything that looks off.`;
      });
      cancelBtn.addEventListener("click", () => { importStatus.textContent = ""; });
      importStatus.appendChild(summary);
      importStatus.appendChild(confirmBtn);
      importStatus.appendChild(cancelBtn);
    }

    importInput.addEventListener("change", async () => {
      const file = importInput.files && importInput.files[0];
      if (!file) return;
      try {
        const { items: parsed, warning, mapping } = await window.BeliImporters.importFile(file);
        if (warning) {
          importStatus.textContent = warning;
        } else if (mapping) {
          // CSV column detection is a heuristic — confirm the mapping before committing.
          showImportConfirm(parsed, mapping);
        } else {
          addItems(parsed);
          importStatus.textContent = `Added ${parsed.length} restaurant${parsed.length === 1 ? "" : "s"} — check the list below and fix anything that looks off.`;
        }
      } catch (e) {
        importStatus.textContent = e.message || "Import failed — try Paste or Add manually instead.";
      }
      importInput.value = "";
    });

    // Paste
    const pasteInput = root.querySelector(".paste-input");
    root.querySelector(".btn-parse-paste").addEventListener("click", () => {
      const parsed = parseBlock(pasteInput.value);
      addItems(parsed);
      pasteInput.value = "";
    });

    // Manual
    const manualName = root.querySelector(".manual-name");
    const manualScore = root.querySelector(".manual-score");
    const manualCuisine = root.querySelector(".manual-cuisine");
    root.querySelector(".btn-add-manual").addEventListener("click", () => {
      const score = parseFloat(manualScore.value);
      if (!manualName.value.trim() || isNaN(score)) return;
      addItems([{ name: manualName.value.trim(), score, cuisine: manualCuisine.value.trim() }]);
      manualName.value = "";
      manualScore.value = "";
      manualCuisine.value = "";
      manualName.focus();
    });

    nameInput.addEventListener("input", notify);

    return {
      onChange(fn) { listeners.push(fn); },
      getName() { return nameInput.value.trim(); },
      getItems() { return items.filter((i) => i.name && typeof i.score === "number" && !isNaN(i.score)); },
      isReady() { return this.getName().length > 0 && this.getItems().length >= 1; },
    };
  }

  // ---------------- Results deck ----------------

  function buildSlides(personA, personB, r) {
    const slides = [];

    slides.push({
      html: `<h2>${escapeHtml(personA.name)} + ${escapeHtml(personB.name)}'s</h2>
             <div class="big-number" style="font-size:2.2rem">Beli Blend</div>
             <p class="desc">Let's see how you two really eat.</p>`,
    });

    slides.push({
      html: `<div class="tier-label">${escapeHtml(r.tier)}</div>
             <div class="big-number">${r.pct}%</div>
             <p class="desc">compatibility, based on the restaurants you've both ranked and the cuisines you both love.</p>`,
    });

    if (r.shared.length > 0) {
      const rows = [...r.shared]
        .sort((a, b) => (b.scoreA + b.scoreB) - (a.scoreA + a.scoreB))
        .slice(0, 8)
        .map((s) => `<div class="item"><span class="name">${escapeHtml(s.name)}</span><span class="meta">${s.scoreA} / ${s.scoreB}</span></div>`)
        .join("");
      slides.push({
        html: `<h2>${r.shared.length} shared spot${r.shared.length === 1 ? "" : "s"}</h2>
               <p class="desc">${escapeHtml(personA.name)} / ${escapeHtml(personB.name)} scores</p>
               <div class="slide-list">${rows}</div>`,
      });
    }

    if (r.mostAgreed) {
      slides.push({
        html: `<h2>You agree most on</h2>
               <div class="big-number" style="font-size:1.8rem">${escapeHtml(r.mostAgreed.name)}</div>
               <p class="desc">${escapeHtml(personA.name)}: ${r.mostAgreed.scoreA} &nbsp;·&nbsp; ${escapeHtml(personB.name)}: ${r.mostAgreed.scoreB}</p>`,
      });
    }

    if (r.topDisagreements.length > 0) {
      const rows = r.topDisagreements
        .map((s) => `<div class="item"><span class="name">${escapeHtml(s.name)}</span><span class="meta">${s.scoreA} / ${s.scoreB}</span></div>`)
        .join("");
      slides.push({
        html: `<h2>Where you disagree most</h2>
               <p class="desc">${escapeHtml(personA.name)} / ${escapeHtml(personB.name)} scores</p>
               <div class="slide-list">${rows}</div>`,
      });
    }

    if (r.adventure.a > 0 || r.adventure.b > 0) {
      const moreAdventurous = r.adventure.a === r.adventure.b
        ? null
        : (r.adventure.a > r.adventure.b ? personA : personB);
      slides.push({
        html: `<h2>Cuisine range</h2>
               <p class="desc">${escapeHtml(personA.name)} has tagged ${r.adventure.a} cuisine${r.adventure.a === 1 ? "" : "s"} &nbsp;·&nbsp; ${escapeHtml(personB.name)} has tagged ${r.adventure.b}</p>
               ${moreAdventurous ? `<div class="tier-label">🌍 ${escapeHtml(moreAdventurous.name)} is the adventurous one</div>` : ""}`,
      });
    }

    if (r.sharedCuisines.length > 0) {
      const rows = r.sharedCuisines
        .map((c) => `<div class="item"><span class="name">${escapeHtml(c.cuisine)}</span><span class="meta">${c.avgA.toFixed(1)} / ${c.avgB.toFixed(1)}</span></div>`)
        .join("");
      slides.push({
        html: `<h2>Your shared cuisine vibe</h2>
               <div class="slide-list">${rows}</div>`,
      });
    }

    if (r.recsForA.length > 0 || r.recsForB.length > 0) {
      const listHtml = (person, recs) => recs.length
        ? `<p class="desc" style="margin-top:14px"><strong>${escapeHtml(person.name)}</strong> should try:</p>
           <div class="slide-list">${recs.map((x) => `<div class="item"><span class="name">${escapeHtml(x.name)}</span><span class="meta">${x.score}</span></div>`).join("")}</div>`
        : "";
      slides.push({
        html: `<h2>Recommendations</h2>${listHtml(personA, r.recsForA)}${listHtml(personB, r.recsForB)}`,
      });
    }

    slides.push({
      html: `<h2>That's your Blend 🍽️</h2>
             <p class="desc">Copy the results link below to save it or send it back to ${escapeHtml(personB.name)}.</p>`,
    });

    return slides;
  }

  // ---------------- Group results deck (3+ people) ----------------

  function joinNamesForTitle(names) {
    const escaped = names.map(escapeHtml);
    if (escaped.length === 1) return escaped[0];
    if (escaped.length === 2) return `${escaped[0]} + ${escaped[1]}`;
    return `${escaped.slice(0, -1).join(", ")} & ${escaped[escaped.length - 1]}`;
  }

  function buildGroupSlides(people, r) {
    const slides = [];
    const names = people.map((p) => p.name);

    slides.push({
      html: `<h2>${joinNamesForTitle(names)}'s</h2>
             <div class="big-number" style="font-size:2.2rem">Beli Blend</div>
             <p class="desc">Let's see how ${people.length} of you really eat.</p>`,
    });

    slides.push({
      html: `<div class="tier-label">${escapeHtml(r.tier)}</div>
             <div class="big-number">${r.pct}%</div>
             <p class="desc">average compatibility across all ${people.length} of you.</p>`,
    });

    {
      const lookup = new Map();
      r.pairwise.forEach((p) => lookup.set(`${p.i}-${p.j}`, p.result.pct));
      const header = `<th></th>` + names.slice(1).map((n) => `<th>${escapeHtml(n)}</th>`).join("");
      const rows = names.slice(0, -1).map((rowName, i) => {
        const cells = names.slice(1).map((_, colOffset) => {
          const j = colOffset + 1;
          return j <= i ? `<td></td>` : `<td>${lookup.get(`${i}-${j}`)}%</td>`;
        }).join("");
        return `<tr><th>${escapeHtml(rowName)}</th>${cells}</tr>`;
      }).join("");
      slides.push({
        html: `<h2>Who vibes with who</h2>
               <div class="matrix-wrap"><table class="compat-matrix"><tr>${header}</tr>${rows}</table></div>`,
      });
    }

    if (r.bestPair) {
      const bestNames = `${escapeHtml(names[r.bestPair.i])} & ${escapeHtml(names[r.bestPair.j])}`;
      const worstDiffers = r.worstPair && r.worstPair.result.pct < r.bestPair.result.pct;
      const worstHtml = worstDiffers
        ? `<div class="tier-label" style="margin-top:14px">Most different: ${escapeHtml(names[r.worstPair.i])} & ${escapeHtml(names[r.worstPair.j])} (${r.worstPair.result.pct}%)</div>`
        : "";
      slides.push({
        html: `<h2>Best matched pair</h2>
               <div class="big-number" style="font-size:1.8rem">${bestNames}</div>
               <p class="desc">${r.bestPair.result.pct}% compatibility</p>
               ${worstHtml}`,
      });
    }

    if (r.shared.length > 0) {
      const rows = [...r.shared]
        .sort((a, b) => b.scores.reduce((s, x) => s + x, 0) - a.scores.reduce((s, x) => s + x, 0))
        .slice(0, 8)
        .map((s) => `<div class="item"><span class="name">${escapeHtml(s.name)}</span><span class="meta">${s.scores.join(" / ")}</span></div>`)
        .join("");
      slides.push({
        html: `<h2>${r.shared.length} spot${r.shared.length === 1 ? "" : "s"} everyone's ranked</h2>
               <p class="desc">${names.map(escapeHtml).join(" / ")} scores</p>
               <div class="slide-list">${rows}</div>`,
      });
    }

    if (r.mostAgreed) {
      slides.push({
        html: `<h2>You all agree most on</h2>
               <div class="big-number" style="font-size:1.8rem">${escapeHtml(r.mostAgreed.name)}</div>
               <p class="desc">${names.map(escapeHtml).join(" / ")}: ${r.mostAgreed.scores.join(" / ")}</p>`,
      });
    }

    if (r.topDisagreements.length > 0) {
      const rows = r.topDisagreements
        .map((s) => `<div class="item"><span class="name">${escapeHtml(s.name)}</span><span class="meta">${s.scores.join(" / ")}</span></div>`)
        .join("");
      slides.push({
        html: `<h2>Where you disagree most</h2>
               <p class="desc">${names.map(escapeHtml).join(" / ")} scores</p>
               <div class="slide-list">${rows}</div>`,
      });
    }

    {
      const maxDiv = r.adventure.diversities[r.adventure.mostAdventurousIdx];
      if (maxDiv > 0) {
        const rows = people
          .map((p, i) => `<div class="item"><span class="name">${escapeHtml(p.name)}</span><span class="meta">${r.adventure.diversities[i]} cuisine${r.adventure.diversities[i] === 1 ? "" : "s"}</span></div>`)
          .join("");
        slides.push({
          html: `<h2>Most adventurous eater</h2>
                 <div class="big-number" style="font-size:1.8rem">${escapeHtml(names[r.adventure.mostAdventurousIdx])}</div>
                 <div class="slide-list">${rows}</div>`,
        });
      }
    }

    if (r.sharedCuisines.length > 0) {
      const rows = r.sharedCuisines
        .map((c) => `<div class="item"><span class="name">${escapeHtml(c.cuisine)}</span><span class="meta">${(c.combined / people.length).toFixed(1)} avg</span></div>`)
        .join("");
      slides.push({
        html: `<h2>Your shared cuisine vibe</h2>
               <div class="slide-list">${rows}</div>`,
      });
    }

    const recBlocks = people
      .map((p, i) => ({ p, recs: r.recs[i] }))
      .filter(({ recs }) => recs.length > 0)
      .map(({ p, recs }) => `<p class="desc" style="margin-top:14px"><strong>${escapeHtml(p.name)}</strong> should try:</p>
             <div class="slide-list">${recs.map((x) => `<div class="item"><span class="name">${escapeHtml(x.name)}</span><span class="meta">${x.score}</span></div>`).join("")}</div>`)
      .join("");
    if (recBlocks) {
      slides.push({ html: `<h2>Recommendations</h2>${recBlocks}` });
    }

    slides.push({
      html: `<h2>That's your Blend 🍽️</h2>
             <p class="desc">Copy the results link below to save it, or invite one more person to grow the group.</p>`,
    });

    return slides;
  }

  function renderDeck(deckSlidesEl, deckProgressEl, slides) {
    deckSlidesEl.innerHTML = slides
      .map((s, i) => `<div class="slide${i === 0 ? " active" : ""}">${s.html}</div>`)
      .join("");
    deckProgressEl.innerHTML = slides
      .map((_, i) => `<span class="dot${i === 0 ? " filled" : ""}"></span>`)
      .join("");

    let current = 0;
    const slideEls = deckSlidesEl.querySelectorAll(".slide");
    const dotEls = deckProgressEl.querySelectorAll(".dot");

    function show(idx) {
      current = Math.max(0, Math.min(slides.length - 1, idx));
      slideEls.forEach((el, i) => el.classList.toggle("active", i === current));
      dotEls.forEach((el, i) => el.classList.toggle("filled", i <= current));
    }

    return {
      next() { show(current + 1); },
      prev() { show(current - 1); },
      show,
    };
  }

  return { createBuilder, buildSlides, buildGroupSlides, renderDeck, escapeHtml };
})();
