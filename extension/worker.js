/* global chrome */
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
const panels = new Map();
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "ghost-panel") return;
  port.onMessage.addListener((message) => {
    if (message.type === "subscribe" && Number.isInteger(message.windowId)) {
      panels.set(message.windowId, port);
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
chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.sendMessage(tabId, { type: "observe" }).catch(() => {});
});
chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  if (tab.active && change.status === "complete")
    chrome.tabs.sendMessage(tabId, { type: "observe" }).catch(() => {});
});
