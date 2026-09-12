/* global chrome */
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
const panels = new Map();
let lastWindowId = null;
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "ghost-panel") return;
  port.onMessage.addListener((message) => {
    if (message.type === "subscribe" && Number.isInteger(message.windowId)) {
      panels.set(message.windowId, port);
      lastWindowId = message.windowId;
      chrome.tabs
        .query({ active: true, windowId: message.windowId })
        .then(([tab]) => {
          if (tab?.id)
            chrome.tabs
              .sendMessage(tab.id, { type: "observe" })
              .catch(() => {});
        });
    }
  });
  port.onDisconnect.addListener(() => {
    for (const [id, value] of panels) if (value === port) panels.delete(id);
  });
});
chrome.runtime.onMessage.addListener((message, sender) => {
  if (
    message.type !== "observation" ||
    !sender.tab?.active ||
    sender.frameId !== 0
  )
    return;
  const url = new URL(sender.url);
  if (
    url.origin !== "https://mail.google.com" &&
    !(
      url.origin === "https://github.com" &&
      /^\/NassAbd\/ghost-demo-workspace\/issues\/\d+/.test(url.pathname)
    )
  )
    return;
  panels.get(sender.tab.windowId)?.postMessage({
    type: "observation",
    observation: { ...message.observation, url: message.observation.url },
  });
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "insert-draft") return;
  if (
    sender.url !== chrome.runtime.getURL("panel.html") ||
    typeof message.objectId !== "string"
  ) {
    sendResponse({ ok: false, reason: "Invalid insertion request" });
    return;
  }
  const targetWindowId = Number.isInteger(message.windowId)
    ? message.windowId
    : lastWindowId;
  if (!Number.isInteger(targetWindowId)) {
    sendResponse({ ok: false, reason: "Window not found" });
    return;
  }
  chrome.tabs
    .query({ active: true, windowId: targetWindowId })
    .then(async ([tab]) => {
      if (!tab?.id) return { ok: false, reason: "No active Gmail tab" };
      // The content script checks the exact thread, visible Reply, and empty composer atomically.
      return await chrome.tabs.sendMessage(tab.id, {
        type: "insertDraft",
        text: message.text,
        objectId: message.objectId,
      });
    })
    .then((result) =>
      sendResponse(
        result ?? { ok: false, reason: "Gmail did not confirm insertion" },
      ),
    )
    .catch(() =>
      sendResponse({
        ok: false,
        reason: "Gmail content script is unavailable; reload the tab",
      }),
    );
  return true;
});
chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.sendMessage(tabId, { type: "observe" }).catch(() => {});
});
chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  if (tab.active && change.status === "complete")
    chrome.tabs.sendMessage(tabId, { type: "observe" }).catch(() => {});
});
