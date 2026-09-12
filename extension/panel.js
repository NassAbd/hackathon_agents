/* global chrome */
const frame = document.getElementById("ghost");
const origin = "http://127.0.0.1:3000";
let ready = false;
let port;
let pending = [];
const panelWindowId = { current: null };
function connect() {
  port = chrome.runtime.connect({ name: "ghost-panel" });
  chrome.windows.getCurrent().then((window) => {
    panelWindowId.current = window.id;
    port.postMessage({ type: "subscribe", windowId: window.id });
  });
  port.onMessage.addListener((message) => {
    if (ready) frame.contentWindow.postMessage(message, origin);
    else pending = [...pending.slice(-7), message];
  });
  port.onDisconnect.addListener(() => setTimeout(connect, 1000));
}
window.addEventListener("message", (event) => {
  if (event.origin !== origin || event.source !== frame.contentWindow) return;
  if (event.data?.type === "ghost-insert-draft") {
    const draft = String(event.data?.text ?? "").trim();
    if (!draft) return;
    chrome.runtime
      .sendMessage({
        type: "insert-draft",
        text: draft,
        objectId: event.data.objectId,
        requestId: event.data.requestId,
        windowId: panelWindowId.current,
      })
      .then((result) =>
        frame.contentWindow.postMessage(
          {
            type: "ghost-draft-result",
            requestId: event.data.requestId,
            ...result,
          },
          origin,
        ),
      )
      .catch(() =>
        frame.contentWindow.postMessage(
          {
            type: "ghost-draft-result",
            requestId: event.data.requestId,
            ok: false,
            reason: "Extension connection lost; reload GHOST",
          },
          origin,
        ),
      );
  }
});
window.addEventListener("message", (event) => {
  if (
    event.origin !== origin ||
    event.source !== frame.contentWindow ||
    event.data?.type !== "ghost-ready"
  )
    return;
  ready = true;
  for (const message of pending)
    frame.contentWindow.postMessage(message, origin);
  pending = [];
  if (!port) connect();
});
