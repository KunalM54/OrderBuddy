/**
 * OrderBuddy - Background Service Worker
 * Manifest V3 compliant service worker.
 * Pure local operation - zero external network requests.
 * Clicking extension icon directly toggles the on-page sidebar.
 */

const DEFAULT_SETTINGS = {
  highlightFilledFields: true,
  autoFillDelays: 40,
  protectSubmitButton: true
};

// Initialize clean storage on install without any dummy profiles
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(["profiles", "activeProfileId", "settings"]);

  if (!data.profiles) {
    await chrome.storage.local.set({
      profiles: [],
      activeProfileId: null
    });
  }

  if (!data.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }

  console.log("OrderBuddy ready - clean state initialized.");
});

// Toggle on-page sidebar when extension toolbar icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { action: "TOGGLE_SIDEBAR" });
  } catch (err) {
    // If content script was not yet loaded (e.g. newly installed), inject it dynamically
    try {
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ["content/content.css"]
      });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: [
          "content/field-mapper.js",
          "content/autofill-engine.js",
          "content/sidebar-dock.js",
          "content/content.js"
        ]
      });
      // Send toggle message again after injection
      setTimeout(async () => {
        try {
          await chrome.tabs.sendMessage(tab.id, { action: "TOGGLE_SIDEBAR" });
        } catch (e) {}
      }, 150);
    } catch (injectErr) {
      console.warn("Could not toggle sidebar on tab:", injectErr.message);
    }
  }
});

// Message hub between sidebar, options and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case "GET_ACTIVE_TAB": {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          sendResponse({ success: true, tab });
          break;
        }

        case "OPEN_OPTIONS_PAGE": {
          await chrome.runtime.openOptionsPage();
          sendResponse({ success: true });
          break;
        }

        case "FORWARD_TO_CONTENT": {
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!activeTab || !activeTab.id) {
            sendResponse({ success: false, error: "No active tab found" });
            return;
          }

          try {
            const result = await chrome.tabs.sendMessage(activeTab.id, message.payload);
            sendResponse({ success: true, result });
          } catch (err) {
            sendResponse({
              success: false,
              error: "Could not communicate with the page. Refresh the tab and retry."
            });
          }
          break;
        }

        default:
          sendResponse({ success: true });
          break;
      }
    } catch (error) {
      console.error("Service worker error:", error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Keep channel open for async response
});
