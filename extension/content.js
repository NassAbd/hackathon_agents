/* global chrome */
let last = "";
let timer;
function observe() {
  if (document.visibilityState !== "visible") return;
  const start = performance.now();
  const parsed = globalThis.GhostDOM.parse(document, location.href);
  if (!parsed) {
    last = "";
    return;
  }
  const fingerprint = JSON.stringify(parsed);
  if (fingerprint === last) return;
  last = fingerprint;
  const url = new URL(location.href);
  url.search = "";
  url.hash =
    parsed.app === "email" ? `#all/${parsed.objectId.split("/").pop()}` : "";
  chrome.runtime
    .sendMessage({
      type: "observation",
      observation: {
        ...parsed,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        url: url.href,
        extractionMs: performance.now() - start,
      },
    })
    .catch(() => {
      last = "";
    });
}
function schedule() {
  clearTimeout(timer);
  timer = setTimeout(observe, 600);
}
new MutationObserver(schedule).observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["aria-hidden", "class"],
});
window.addEventListener("hashchange", () => {
  last = "";
  schedule();
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    last = "";
    schedule();
  }
});
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "observe") {
    last = "";
    schedule();
  }
});
schedule();
