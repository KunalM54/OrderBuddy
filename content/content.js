/**
 * Meesho AutoListing Pro - Main Content Script Entrypoint
 * Coordinates on-page docked sidebar, field detection, capture, and autofill.
 */

(() => {
  // Immediately purge any floating tab or legacy floating widget
  document.querySelectorAll(
    "#meesho-sidebar-toggle-tab, #meesho-widget-card, #meesho-widget-header, [id*='toggle-tab'], [class*='toggle-tab']"
  ).forEach(el => el.remove());

  if (window.__MEESHO_AUTOLISTING_INITIALIZED__) return;
  window.__MEESHO_AUTOLISTING_INITIALIZED__ = true;

  // Initialize Docked Sidebar
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      window.MeeshoSidebar?.init();
    });
  } else {
    window.MeeshoSidebar?.init();
  }

  // Synchronize state when chrome.storage changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      if (changes.profiles || changes.activeProfileId) {
        chrome.storage.local.get(["profiles", "activeProfileId"], (data) => {
          window.MeeshoSidebar?.updateProfiles(data.profiles || [], data.activeProfileId);
        });
      }
    }
  });

  // Listen for actions requested from toolbar or manager
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
      try {
        switch (request.action) {
          case "TOGGLE_SIDEBAR": {
            window.MeeshoSidebar?.toggle();
            sendResponse({ success: true, isOpen: window.MeeshoSidebar?.isOpen() });
            break;
          }

          case "OPEN_SIDEBAR": {
            window.MeeshoSidebar?.open();
            sendResponse({ success: true, isOpen: true });
            break;
          }

          case "CLOSE_SIDEBAR": {
            window.MeeshoSidebar?.close();
            sendResponse({ success: true, isOpen: false });
            break;
          }

          case "AUTOFILL_NOW": {
            const data = await chrome.storage.local.get(["profiles", "activeProfileId"]);
            const profiles = data.profiles || [];
            const activeId = request.profileId || data.activeProfileId;
            const profile = profiles.find(p => p.id === activeId) || profiles[0];

            if (!profile) {
              sendResponse({ success: false, error: "No profile found to autofill." });
              return;
            }

            const result = await window.MeeshoAutofillEngine.autofillAllFields(profile, { highlight: true });
            sendResponse(result);
            break;
          }

          case "CAPTURE_NOW": {
            const data = await chrome.storage.local.get(["profiles", "activeProfileId"]);
            const profiles = data.profiles || [];
            let activeId = request.profileId || data.activeProfileId;
            let profile = profiles.find(p => p.id === activeId);

            if (!profile) {
              profile = {
                id: "profile_" + Date.now(),
                name: "Captured Catalog",
                category: "General",
                updatedAt: new Date().toISOString(),
                fields: {},
                customMappings: {}
              };
              profiles.push(profile);
              activeId = profile.id;
            }

            const captureResult = window.MeeshoAutofillEngine.captureAllFields();

            if (captureResult.success) {
              profile.fields = {
                ...profile.fields,
                ...captureResult.fields
              };
              profile.updatedAt = new Date().toISOString();

              const idx = profiles.findIndex(p => p.id === profile.id);
              if (idx !== -1) profiles[idx] = profile;

              await chrome.storage.local.set({ profiles, activeProfileId: profile.id });
              window.MeeshoSidebar?.updateProfiles(profiles, profile.id);
            }

            sendResponse(captureResult);
            break;
          }

          case "START_FIELD_TRAINING": {
            const data = await chrome.storage.local.get(["profiles", "activeProfileId"]);
            const profiles = data.profiles || [];
            const activeId = request.profileId || data.activeProfileId;
            const profile = profiles.find(p => p.id === activeId) || profiles[0];

            if (!profile) {
              sendResponse({ success: false, error: "Please create a profile first to train fields." });
              return;
            }

            window.MeeshoTrainingMode.startTraining(profile);
            sendResponse({ success: true });
            break;
          }

          case "CHECK_PAGE_STATUS": {
            const fields = window.MeeshoFieldMapper.getAllListingFields(document);
            sendResponse({
              success: true,
              inputCount: fields.length,
              url: window.location.href,
              isMeesho: window.location.hostname.includes("meesho.com")
            });
            break;
          }

          default:
            sendResponse({ success: true });
            break;
        }
      } catch (err) {
        console.error("Meesho AutoListing content script error:", err);
        sendResponse({ success: false, error: err.message });
      }
    })();

    return true; // Keep message channel open for async response
  });
})();
