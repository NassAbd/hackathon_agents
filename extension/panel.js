/* global chrome */
const frame = document.getElementById("ghost");
const origin = "http://127.0.0.1:3000";
let ready = false;
let port;
let pending = [];
function connect() {
  port = chrome.runtime.connect({ name: "ghost-panel" });
  chrome.windows
    .getCurrent()
    .then((window) =>
      port.postMessage({ type: "subscribe", windowId: window.id }),
    );
  port.onMessage.addListener((message) => {
    if (ready) frame.contentWindow.postMessage(message, origin);
    else pending = [...pending.slice(-7), message];
  });
  port.onDisconnect.addListener(() => setTimeout(connect, 1000));
}
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
