// State encoding: person/results data lives entirely in the URL hash.
// No backend, no accounts — the link *is* the database.
window.BeliState = (function () {

  function bytesToBase64Url(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function base64UrlToBytes(b64url) {
    const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "===".slice((b64.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  async function encode(obj) {
    const json = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(json);
    if (window.CompressionStream) {
      try {
        const cs = new CompressionStream("gzip");
        const writer = cs.writable.getWriter();
        writer.write(bytes);
        writer.close();
        const compressed = new Uint8Array(await new Response(cs.readable).arrayBuffer());
        return "g" + bytesToBase64Url(compressed);
      } catch (e) {
        // fall through to plain encoding
      }
    }
    return "p" + bytesToBase64Url(bytes);
  }

  async function decode(str) {
    const mode = str[0];
    const bytes = base64UrlToBytes(str.slice(1));
    let plainBytes = bytes;
    if (mode === "g") {
      if (!window.DecompressionStream) throw new Error("This link needs a browser that supports DecompressionStream.");
      const ds = new DecompressionStream("gzip");
      const writer = ds.writable.getWriter();
      writer.write(bytes);
      writer.close();
      plainBytes = new Uint8Array(await new Response(ds.readable).arrayBuffer());
    }
    const json = new TextDecoder().decode(plainBytes);
    return JSON.parse(json);
  }

  function readHash() {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return null;
    const eq = hash.indexOf("=");
    if (eq === -1) return null;
    return { key: hash.slice(0, eq), value: hash.slice(eq + 1) };
  }

  async function buildLink(key, obj) {
    const encoded = await encode(obj);
    const url = new URL(window.location.href);
    url.hash = `${key}=${encoded}`;
    return url.toString();
  }

  return { encode, decode, readHash, buildLink };
})();
