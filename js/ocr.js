// Runs OCR entirely in the browser via Tesseract.js — screenshots never leave
// the device. Beli is mobile-only with no public API/export, so "screenshot
// your own ranked list, then read the text off it locally" is the automated
// path that doesn't touch Beli's servers at all.
window.BeliOCR = (function () {

  async function recognizeFiles(files, onStatus) {
    if (!window.Tesseract) {
      throw new Error("OCR engine failed to load (check your internet connection) — you can still use Paste or Add manually.");
    }

    let combinedText = "";
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onStatus && onStatus(`Reading screenshot ${i + 1} of ${files.length}…`);
      const result = await Tesseract.recognize(file, "eng", {
        logger: (info) => {
          if (info.status === "recognizing text" && onStatus) {
            const pct = Math.round((info.progress || 0) * 100);
            onStatus(`Reading screenshot ${i + 1} of ${files.length}… ${pct}%`);
          }
        },
      });
      combinedText += result.data.text + "\n";
    }
    onStatus && onStatus("");
    return combinedText;
  }

  return { recognizeFiles };
})();
