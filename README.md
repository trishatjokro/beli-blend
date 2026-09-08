# Beli Blend

Spotify Blend, but for [Beli](https://beliapp.com): a no-login, no-backend, static site that compares friends' Beli restaurant rankings and outputs a Wrapped-style compatibility deck — compatibility score, shared spots, where you most agree/disagree, cuisine range, shared cuisine preferences, and cross-recommendations.

## Data model

Beli has no public web app, no official API, and its Terms of Service prohibit scraping and reverse-engineering. This tool never contacts Beli's servers — no login, no scraping, no private API calls. Input is entirely user-supplied, via one of three equivalent paths into the same editable review table:

- **Screenshot upload** — OCR (via [Tesseract.js](https://github.com/naptha/tesseract.js)) reads restaurant names and scores off the image, client-side. Images are never uploaded anywhere.
- **Paste** — a typed or copied list, one restaurant per line.
- **Manual entry** — one restaurant at a time.

There is no backend and no database. A person's list is gzip-compressed and base64url-encoded directly into a shareable URL. Opening that link and adding a second list computes the comparison client-side; a second link encodes the finished result for later reference.

## Algorithm

Compatibility % = `0.7 × restaurant_cosine + 0.3 × cuisine_cosine` (falls back to whichever term is available if the other has insufficient data):

- **restaurant_cosine** — cosine similarity between the two people's *mean-centered* score vectors over restaurants both have ranked (i.e. Pearson correlation). Requires ≥2 shared restaurants; mean-centering is what makes it independent of each person's overall scoring generosity — plain cosine only normalizes magnitude, not offset, so it would still reward two people who happen to score on the same baseline over two who rank identically but grade on different curves.
- **cuisine_cosine** — cosine similarity between two cuisine-preference vectors (each person's average score per cuisine, over their full list). Requires ≥1 cuisine tagged by either person; captures taste alignment even with no restaurant overlap.

The resulting 0–100 score maps to a tier label (e.g. "Great Eats Duo", "Same Stomach, Same Soul"). Recommendations: for each person, restaurants the other rated ≥8 that they haven't ranked themselves, sorted by score, top 3.

Restaurants are matched between the two lists by normalized name first, falling back to a fuzzy match (substring containment or word-overlap) for near-duplicates like "Joe's Pizza" vs "Joes Pizza NYC" — see Limitations.

## Running it

This is a static site — no build step, no server-side code.

```bash
# from the project root
python3 -m http.server 8000
```

Then open `http://localhost:8000`. (Use a local server rather than opening `index.html` directly — the OCR engine and URL compression both need a real `http://` origin to work reliably.)

Or just enable **GitHub Pages** on this repo (Settings → Pages → deploy from `main`) and use the hosted link.

It's also installable — "Add to Home Screen" (mobile) or the install icon in the address bar (desktop) — and the app shell is cached by a service worker (`sw.js`), so it still opens with a spotty connection.

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
- Restaurant matching falls back to a fuzzy match for slightly different spellings (e.g. "Joe's Pizza" vs "Joes Pizza NYC"), but very different names for the same place (or coincidentally similar names for different places) can still match wrong — fix names in the review table if needed.
- This is a for-fun hobby project, not an official Beli product or integration.

## License

MIT — see [LICENSE](LICENSE).
