# Beli Blend

<<<<<<< HEAD
Spotify Blend, but for [Beli](https://beliapp.com): a no-login, no-backend, static site that compares two people's Beli restaurant rankings and outputs a Wrapped-style compatibility deck — compatibility score, shared spots, biggest agreement/disagreement, shared cuisine preferences, and cross-recommendations.
=======
Spotify Blend, but for [Beli](https://beliapp.com) — a tool that compares friends' Beli restaurant rankings and reveals a Wrapped-style compatibility breakdown.
>>>>>>> c478b992818b1936caa2ecf5f4072e6c4941c106

## Data model

Beli has no public web app, no official API, and its Terms of Service prohibit scraping and reverse-engineering. This tool never contacts Beli's servers — no login, no scraping, no private API calls. Input is entirely user-supplied, via one of three equivalent paths into the same editable review table:

- **Screenshot upload** — OCR (via [Tesseract.js](https://github.com/naptha/tesseract.js)) reads restaurant names and scores off the image, client-side. Images are never uploaded anywhere.
- **Paste** — a typed or copied list, one restaurant per line.
- **Manual entry** — one restaurant at a time.

There is no backend and no database. A person's list is gzip-compressed and base64url-encoded directly into a shareable URL. Opening that link and adding a second list computes the comparison client-side; a second link encodes the finished result for later reference.

## The algorithm

Each shared restaurant becomes a pair of scores (yours, theirs). Compatibility is computed as:

- **Cosine similarity** over the vector of scores for restaurants you've *both* ranked — this measures whether you two rank shared places the same way, independent of how generous or stingy each of you is with scores.
- **Cosine similarity** over a cuisine-preference vector (average score per cuisine, across your *whole* list) — this captures taste alignment even before your restaurant lists overlap much.
- The two are blended (70% restaurant overlap / 30% cuisine vibe, falling back to whichever signal is available) into a single 0–100% score, mapped to a tier label (e.g. "Great Eats Duo", "Same Stomach, Same Soul").

Recommendations work the same way fan-made "Wrapped" tools for Letterboxd/Goodreads do it: restaurants one person rated highly (≥8) that the other hasn't been to yet.

## Running it

This is a static site — no build step, no server-side code.

```bash
# from the project root
python3 -m http.server 8000
```

Then open `http://localhost:8000`. (Use a local server rather than opening `index.html` directly — the OCR engine and URL compression both need a real `http://` origin to work reliably.)

Or just enable **GitHub Pages** on this repo (Settings → Pages → deploy from `main`) and use the hosted link.

## How to use it

1. Open the site, add your restaurants (screenshot upload, paste, or manual), enter your name, and hit **Generate my Blend link**.
2. Send that link to a friend.
3. They open it, add their own list, and hit **See our Blend** — you both land on the results deck.
4. Either of you can copy a second **results link** to save or re-share the finished Blend.

## Tech

Vanilla HTML/CSS/JS, no framework, no build tooling. `Tesseract.js` is loaded from a CDN for OCR; everything else — parsing, the compatibility algorithm, state encoding, and the slide deck — is plain JS in `js/`.

```
index.html        page shell + templates
styles.css
js/state.js        URL-hash state encode/decode (gzip + base64url, no backend)
js/parse.js         paste/OCR text → {name, score, cuisine} guesses
js/ocr.js            in-browser screenshot OCR (Tesseract.js)
js/algorithm.js      cosine-similarity compatibility scoring
js/ui.js               list-builder UI + results slide deck rendering
js/main.js              view routing / wiring
```

## Limitations

- OCR accuracy depends on screenshot quality and Beli's current UI layout — always double-check the review table before generating your link.
- Restaurant matching between two people is done by normalized name, so slightly different spellings (e.g. "Joe's Pizza" vs "Joes Pizza NYC") may not match perfectly — fix names in the review table if needed.
- This is a for-fun hobby project, not an official Beli product or integration.

## License

MIT — see [LICENSE](LICENSE).
