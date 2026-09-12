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
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "observe") {
    last = "";
    schedule();
    return;
  }
  if (message.type === "insertDraft") {
    const fail = (reason) => sendResponse({ ok: false, reason });
    const parsed = globalThis.GhostDOM.parse(document, location.href);
    if (
      document.visibilityState !== "visible" ||
      parsed?.app !== "email" ||
      parsed.action !== "REPLY" ||
      parsed.objectId !== message.objectId
    )
      return fail("Original Gmail reply is no longer active");
    if (
      typeof message.text !== "string" ||
      !message.text.trim() ||
      message.text.length > 10000
    )
      return fail("Invalid draft");
    const composers = [
      ...document.querySelectorAll(
        'main [contenteditable="true"][role="textbox"], [role="main"] [contenteditable="true"][role="textbox"]',
      ),
    ].filter(
      (editor) =>
        editor instanceof HTMLElement &&
        !editor.closest('[hidden], [aria-hidden="true"]') &&
        editor.getClientRects().length &&
        window.getComputedStyle(editor).visibility !== "hidden",
    );
    if (composers.length !== 1)
      return fail("Open one visible Gmail reply composer");
    const composer = composers[0];
    // No overwrite escape hatch. Rich content/signatures count as user content too.
    if (
      composer.textContent.trim() ||
      composer.querySelector(
        'img, video, audio, table, hr, [contenteditable="false"]',
      )
    )
      return fail("composer-has-content");
    composer.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(composer);
    selection.removeAllRanges();
    selection.addRange(range);
    const inserted = document.execCommand("insertText", false, message.text);
    if (!inserted && !composer.textContent.trim())
      composer.textContent = message.text;
    composer.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: message.text,
      }),
    );
    const normalize = (value) => value.replace(/\s+/g, " ").trim();
    const matches =
      normalize(composer.innerText || composer.textContent) ===
      normalize(message.text);
    sendResponse({
      ok: matches,
      ...(matches
        ? { characters: message.text.length }
        : { reason: "Composer write was not confirmed" }),
    });
  }
});
schedule();
