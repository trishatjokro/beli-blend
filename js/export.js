// Renders the finished compatibility card to a PNG, entirely client-side via
// canvas, so it can be shared to Instagram/etc. — the actual virality driver
// Spotify Blend has that a URL link alone doesn't.
window.BeliExport = (function () {
  const SIZE = 1080;

  function roundedPillWidth(ctx, text, paddingX) {
    return ctx.measureText(text).width + paddingX * 2;
  }

  function renderCard(personA, personB, r) {
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
    ctx.fillStyle = "#fff";

    ctx.font = "700 42px -apple-system, Helvetica, Arial, sans-serif";
    ctx.fillText(`${personA.name} + ${personB.name}'s`, SIZE / 2, 190);

    ctx.font = "900 30px -apple-system, Helvetica, Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("B E L I   B L E N D", SIZE / 2, 240);

    ctx.fillStyle = "#fff";
    ctx.font = "900 240px -apple-system, Helvetica, Arial, sans-serif";
    ctx.fillText(`${r.pct}%`, SIZE / 2, 480);

    ctx.font = "700 34px -apple-system, Helvetica, Arial, sans-serif";
    const pillPaddingX = 34;
    const pillWidth = roundedPillWidth(ctx, r.tier, pillPaddingX);
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
    ctx.fillText(r.tier, SIZE / 2, pillY + pillHeight / 2 + 12);

    let y = 700;
    ctx.font = "500 32px -apple-system, Helvetica, Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    if (r.shared.length > 0) {
      ctx.fillText(`${r.shared.length} shared spot${r.shared.length === 1 ? "" : "s"}`, SIZE / 2, y);
      y += 50;
    }
    if (r.mostAgreed) {
      ctx.fillText(`You both love ${r.mostAgreed.name}`, SIZE / 2, y);
      y += 50;
    }

    ctx.font = "600 26px -apple-system, Helvetica, Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("🍽️  beliblend", SIZE / 2, SIZE - 60);

    return canvas;
  }

  function download(personA, personB, r) {
    const canvas = renderCard(personA, personB, r);
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error("Couldn't generate the image.")); return; }
        const url = URL.createObjectURL(blob);
        const slug = `${personA.name}-${personB.name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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

  return { renderCard, download };
})();
