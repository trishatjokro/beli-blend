// Renders the finished compatibility card to a PNG, entirely client-side via
// canvas, so it can be shared to Instagram/etc. — the actual virality driver
// Spotify Blend has that a URL link alone doesn't. Same header/footer shell
// for both the pairwise and group ("N-way Blend") cards, just different body
// lines and title text.
window.BeliExport = (function () {
  const SIZE = 1080;

  function roundedPillWidth(ctx, text, paddingX) {
    return ctx.measureText(text).width + paddingX * 2;
  }

  function newCanvas() {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, SIZE * 0.25, SIZE);
    gradient.addColorStop(0, "#ff5a36");
    gradient.addColorStop(1, "#ff8a5c");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.textAlign = "center";
    return { canvas, ctx };
  }

  // Title, "BELI BLEND" tag, big %, tier pill — returns the y to start body
  // lines below it.
  function drawHeader(ctx, titleLine, pct, tier) {
    ctx.fillStyle = "#fff";
    const titleFontSize = titleLine.length > 28 ? 32 : 42;
    ctx.font = `700 ${titleFontSize}px -apple-system, Helvetica, Arial, sans-serif`;
    ctx.fillText(titleLine, SIZE / 2, 190);

    ctx.font = "900 30px -apple-system, Helvetica, Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("B E L I   B L E N D", SIZE / 2, 240);

    ctx.fillStyle = "#fff";
    ctx.font = "900 240px -apple-system, Helvetica, Arial, sans-serif";
    ctx.fillText(`${pct}%`, SIZE / 2, 480);

    ctx.font = "700 34px -apple-system, Helvetica, Arial, sans-serif";
    const pillPaddingX = 34;
    const pillWidth = roundedPillWidth(ctx, tier, pillPaddingX);
    const pillHeight = 66;
    const pillY = 530;
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(SIZE / 2 - pillWidth / 2, pillY, pillWidth, pillHeight, pillHeight / 2);
    } else {
      ctx.rect(SIZE / 2 - pillWidth / 2, pillY, pillWidth, pillHeight);
    }
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(tier, SIZE / 2, pillY + pillHeight / 2 + 12);

    return pillY + pillHeight + 100;
  }

  function drawBodyLines(ctx, lines, startY) {
    let y = startY;
    ctx.font = "500 32px -apple-system, Helvetica, Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    for (const line of lines) {
      ctx.fillText(line, SIZE / 2, y);
      y += 50;
    }
  }

  function drawFooter(ctx) {
    ctx.font = "600 26px -apple-system, Helvetica, Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("🍽️  beliblend", SIZE / 2, SIZE - 60);
  }

  function renderCard(personA, personB, r) {
    const { canvas, ctx } = newCanvas();
    const bodyY = drawHeader(ctx, `${personA.name} + ${personB.name}'s`, r.pct, r.tier);
    const lines = [];
    if (r.shared.length > 0) lines.push(`${r.shared.length} shared spot${r.shared.length === 1 ? "" : "s"}`);
    if (r.mostAgreed) lines.push(`You both love ${r.mostAgreed.name}`);
    drawBodyLines(ctx, lines, bodyY);
    drawFooter(ctx);
    return canvas;
  }

  function joinNamesPlain(names) {
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} + ${names[1]}`;
    return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
  }

  function renderGroupCard(people, r) {
    const { canvas, ctx } = newCanvas();
    const names = people.map((p) => p.name);
    const bodyY = drawHeader(ctx, `${joinNamesPlain(names)}'s`, r.pct, r.tier);
    const lines = [];
    if (r.shared.length > 0) lines.push(`${r.shared.length} spot${r.shared.length === 1 ? "" : "s"} everyone's ranked`);
    if (r.mostAgreed) lines.push(`You all love ${r.mostAgreed.name}`);
    lines.push(`${people.length} people blended`);
    drawBodyLines(ctx, lines, bodyY);
    drawFooter(ctx);
    return canvas;
  }

  function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function toDownload(canvas, slug) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error("Couldn't generate the image.")); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `beli-blend-${slug || "results"}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        resolve();
      }, "image/png");
    });
  }

  function download(personA, personB, r) {
    const canvas = renderCard(personA, personB, r);
    return toDownload(canvas, slugify(`${personA.name}-${personB.name}`));
  }

  function downloadGroup(people, r) {
    const canvas = renderGroupCard(people, r);
    return toDownload(canvas, slugify(people.map((p) => p.name).join("-")));
  }

  return { renderCard, download, renderGroupCard, downloadGroup };
})();
