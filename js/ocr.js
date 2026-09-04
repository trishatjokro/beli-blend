// Runs OCR entirely in the browser via Tesseract.js — screenshots never leave
// the device. Beli is mobile-only with no public API/export, so "screenshot
// your own ranked list, then read the text off it locally" is the automated
// path that doesn't touch Beli's servers at all.
window.BeliOCR = (function () {

  async function recognizeFiles(files, onStatus) {
    if (!window.Tesseract) {
      throw new Error("OCR engine failed to load (check your internet connection) — you can still use Paste or Add manually.");
    }

    // Reuse a single worker across all screenshots instead of spinning one up
    // per file — repeated language-data loads are the slow part on mobile.
    const worker = await Tesseract.createWorker("eng", 1, {
      logger: (info) => {
        if (info.status === "recognizing text" && onStatus) {
          const pct = Math.round((info.progress || 0) * 100);
          onStatus(`Reading screenshot… ${pct}%`);
        }
      },
    });

    let combinedText = "";
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        onStatus && onStatus(`Reading screenshot ${i + 1} of ${files.length}…`);
        const result = await worker.recognize(file);
        combinedText += result.data.text + "\n";
      }
    } finally {
      await worker.terminate();
    }
    onStatus && onStatus("");
    return combinedText;
  }

  return { recognizeFiles };
})();
