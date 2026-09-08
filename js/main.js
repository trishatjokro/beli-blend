(function () {
  const viewWelcome = document.getElementById("view-welcome");
  const viewJoin = document.getElementById("view-join");
  const viewResults = document.getElementById("view-results");
  const viewGroupJoin = document.getElementById("view-group-join");
  const viewGroupResults = document.getElementById("view-group-results");
  const ALL_VIEWS = [viewWelcome, viewJoin, viewResults, viewGroupJoin, viewGroupResults];

  function showView(el) {
    ALL_VIEWS.forEach((v) => v.classList.toggle("hidden", v !== el));
  }

  function joinNames(names) {
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const tmp = document.createElement("textarea");
      tmp.value = text;
      document.body.appendChild(tmp);
      tmp.select();
      document.execCommand("copy");
      document.body.removeChild(tmp);
      return true;
    }
  }

  function renderResults(personA, personB) {
    const results = window.BeliAlgorithm.compute(personA, personB);
    const slides = window.BeliUI.buildSlides(personA, personB, results);
    const deckSlidesEl = document.getElementById("deck-slides");
    const deckProgressEl = document.getElementById("deck-progress");
    const deck = window.BeliUI.renderDeck(deckSlidesEl, deckProgressEl, slides);

    document.getElementById("btn-next").onclick = () => deck.next();
    document.getElementById("btn-prev").onclick = () => deck.prev();

    document.onkeydown = (e) => {
      if (viewResults.classList.contains("hidden")) return;
      if (e.key === "ArrowRight") deck.next();
      if (e.key === "ArrowLeft") deck.prev();
    };

    let touchStartX = null;
    deckSlidesEl.ontouchstart = (e) => { touchStartX = e.touches[0].clientX; };
    deckSlidesEl.ontouchend = (e) => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) dx < 0 ? deck.next() : deck.prev();
      touchStartX = null;
    };

    document.getElementById("btn-share-results").onclick = async () => {
      const link = await window.BeliState.buildLink("r", { a: personA, b: personB });
      await copyToClipboard(link);
      const btn = document.getElementById("btn-share-results");
      const original = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => { btn.textContent = original; }, 1500);
    };

    document.getElementById("btn-download-card").onclick = async () => {
      const btn = document.getElementById("btn-download-card");
      const original = btn.textContent;
      try {
        await window.BeliExport.download(personA, personB, results);
      } catch (e) {
        btn.textContent = "Couldn't generate image";
        setTimeout(() => { btn.textContent = original; }, 1500);
      }
    };

    document.getElementById("btn-invite-third").onclick = async () => {
      const link = await window.BeliState.buildLink("g", { people: [personA, personB] });
      await copyToClipboard(link);
      const btn = document.getElementById("btn-invite-third");
      const original = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => { btn.textContent = original; }, 1500);
    };

    document.getElementById("btn-restart").onclick = () => {
      window.location.href = window.location.pathname + window.location.search;
    };

    showView(viewResults);
  }

  function setupWelcome() {
    const builder = window.BeliUI.createBuilder(document.getElementById("builder-welcome"));
    const btn = document.getElementById("btn-generate-link");
    builder.onChange(() => { btn.disabled = !builder.isReady(); });

    btn.addEventListener("click", async () => {
      const personA = { name: builder.getName(), restaurants: builder.getItems() };
      const link = await window.BeliState.buildLink("s", personA);
      document.getElementById("share-link").value = link;
      document.getElementById("share-box").classList.remove("hidden");
    });

    document.getElementById("btn-copy-link").addEventListener("click", () => {
      copyToClipboard(document.getElementById("share-link").value);
    });

    showView(viewWelcome);
  }

  function setupJoin(personA) {
    document.getElementById("join-friend-name").textContent = personA.name;
    const builder = window.BeliUI.createBuilder(document.getElementById("builder-join"));
    const btn = document.getElementById("btn-see-blend");
    builder.onChange(() => { btn.disabled = !builder.isReady(); });

    btn.addEventListener("click", () => {
      const personB = { name: builder.getName(), restaurants: builder.getItems() };
      renderResults(personA, personB);
    });

    showView(viewJoin);
  }

  function setupGroupJoin(people) {
    document.getElementById("group-join-names").textContent = joinNames(people.map((p) => p.name));
    const builder = window.BeliUI.createBuilder(document.getElementById("builder-group-join"));
    const btn = document.getElementById("btn-see-group-blend");
    builder.onChange(() => { btn.disabled = !builder.isReady(); });

    btn.addEventListener("click", () => {
      const newPerson = { name: builder.getName(), restaurants: builder.getItems() };
      renderGroupResults([...people, newPerson]);
    });

    showView(viewGroupJoin);
  }

  function renderGroupResults(people) {
    const results = window.BeliAlgorithm.computeGroup(people);
    const slides = window.BeliUI.buildGroupSlides(people, results);
    const deckSlidesEl = document.getElementById("group-deck-slides");
    const deckProgressEl = document.getElementById("group-deck-progress");
    const deck = window.BeliUI.renderDeck(deckSlidesEl, deckProgressEl, slides);

    document.getElementById("btn-group-next").onclick = () => deck.next();
    document.getElementById("btn-group-prev").onclick = () => deck.prev();

    document.onkeydown = (e) => {
      if (viewGroupResults.classList.contains("hidden")) return;
      if (e.key === "ArrowRight") deck.next();
      if (e.key === "ArrowLeft") deck.prev();
    };

    let touchStartX = null;
    deckSlidesEl.ontouchstart = (e) => { touchStartX = e.touches[0].clientX; };
    deckSlidesEl.ontouchend = (e) => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) dx < 0 ? deck.next() : deck.prev();
      touchStartX = null;
    };

    document.getElementById("btn-share-group-results").onclick = async () => {
      const link = await window.BeliState.buildLink("gr", { people });
      await copyToClipboard(link);
      const btn = document.getElementById("btn-share-group-results");
      const original = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => { btn.textContent = original; }, 1500);
    };

    document.getElementById("btn-invite-another").onclick = async () => {
      const link = await window.BeliState.buildLink("g", { people });
      await copyToClipboard(link);
      const btn = document.getElementById("btn-invite-another");
      const original = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => { btn.textContent = original; }, 1500);
    };

    const warningEl = document.getElementById("group-size-warning");
    if (people.length >= 6) {
      warningEl.textContent = `Heads up — with ${people.length} people the shareable link is getting long. It'll still work, but some apps may truncate very long links.`;
      warningEl.classList.remove("hidden");
    } else {
      warningEl.classList.add("hidden");
    }

    document.getElementById("btn-restart-group").onclick = () => {
      window.location.href = window.location.pathname + window.location.search;
    };

    showView(viewGroupResults);
  }

  async function init() {
    const hash = window.BeliState.readHash();
    if (!hash) {
      setupWelcome();
      return;
    }
    try {
      if (hash.key === "s") {
        const personA = await window.BeliState.decode(hash.value);
        setupJoin(personA);
      } else if (hash.key === "r") {
        const { a, b } = await window.BeliState.decode(hash.value);
        renderResults(a, b);
      } else if (hash.key === "g") {
        const { people } = await window.BeliState.decode(hash.value);
        setupGroupJoin(people);
      } else if (hash.key === "gr") {
        const { people } = await window.BeliState.decode(hash.value);
        renderGroupResults(people);
      } else {
        setupWelcome();
      }
    } catch (e) {
      console.error("Beli Blend: failed to load link", e);
      alert("That link looks broken or your browser doesn't support it. Starting a fresh Blend.");
      window.location.href = window.location.pathname + window.location.search;
    }
  }

  init();
})();
