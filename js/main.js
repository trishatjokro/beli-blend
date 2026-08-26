(function () {
  const viewWelcome = document.getElementById("view-welcome");
  const viewJoin = document.getElementById("view-join");
  const viewResults = document.getElementById("view-results");

  function showView(el) {
    [viewWelcome, viewJoin, viewResults].forEach((v) => v.classList.toggle("hidden", v !== el));
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
      } else {
        setupWelcome();
      }
    } catch (e) {
      alert("That link looks broken or your browser doesn't support it. Starting a fresh Blend.");
      window.location.href = window.location.pathname + window.location.search;
    }
  }

  init();
})();
