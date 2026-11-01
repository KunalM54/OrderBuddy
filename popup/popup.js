/**
 * Meesho AutoListing Pro - Popup Logic
 * Quick launch toolbar and action dispatcher.
 */

document.addEventListener("DOMContentLoaded", async () => {
  const profileSelect = document.getElementById("profile-select");
  const profileCountTag = document.getElementById("profile-count-tag");
  const btnQuickNew = document.getElementById("btn-quick-new");
  const btnToggleSidebar = document.getElementById("btn-toggle-page-sidebar");
  const btnAutofill = document.getElementById("btn-autofill");
  const btnCapture = document.getElementById("btn-capture");
  const btnTrain = document.getElementById("btn-train");
  const statusBanner = document.getElementById("status-banner");
  const pageStatusPill = document.getElementById("page-status-pill");
  const btnOpenOptions = document.getElementById("btn-open-options");
  const btnOpenSandbox = document.getElementById("btn-open-sandbox");

  let profiles = [];
  let activeProfileId = null;
  let activeTab = null;

  // Initialize
  await loadState();
  await checkActiveTabStatus();

  // Profile switch
  profileSelect.addEventListener("change", async (e) => {
    activeProfileId = e.target.value;
    await chrome.storage.local.set({ activeProfileId });
    setStatus("Active profile updated.", "info");
  });

  // Open / Focus On-Page Sidebar
  btnToggleSidebar.addEventListener("click", async () => {
    if (!activeTab || !activeTab.id) {
      setStatus("Please open a Meesho listing tab.", "warning");
      return;
    }

    try {
      // Toggle or ensure sidebar is open
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => {
          const tab = document.getElementById("meesho-sidebar-toggle-tab");
          const panel = document.getElementById("meesho-sidebar-panel");
          if (panel) {
            panel.className = "open";
            if (tab) tab.className = "open";
          }
        }
      });
      window.close(); // Close popup so user sees the docked sidebar
    } catch (e) {
      setStatus("Cannot access tab. Refresh page and try again.", "error");
    }
  });

  // Create new profile
  btnQuickNew.addEventListener("click", async () => {
    const name = prompt("Enter a name for the new profile (e.g. Godari Baby Set, Sarees):");
    if (!name || !name.trim()) return;

    const newProfile = {
      id: "profile_" + Date.now(),
      name: name.trim(),
      category: "General",
      updatedAt: new Date().toISOString(),
      fields: {},
      customMappings: {}
    };

    profiles.push(newProfile);
    activeProfileId = newProfile.id;
    await chrome.storage.local.set({ profiles, activeProfileId });
    renderProfilesDropdown();
    setStatus(`Created new profile "${newProfile.name}".`, "success");
  });

  // One-click autofill
  btnAutofill.addEventListener("click", async () => {
    if (!activeTab || !activeTab.id) {
      setStatus("No active browser tab found.", "error");
      return;
    }

    const currentProfile = getActiveProfile();
    if (!currentProfile) {
      setStatus("Please create or select a profile first.", "warning");
      return;
    }

    btnAutofill.disabled = true;
    setStatus("Filling product fields on page...", "info");

    try {
      const response = await chrome.tabs.sendMessage(activeTab.id, {
        action: "AUTOFILL_NOW",
        profileId: activeProfileId
      });

      btnAutofill.disabled = false;

      if (response && response.success) {
        if (response.filledCount > 0) {
          setStatus(`✓ Successfully filled ${response.filledCount} fields! Review & submit manually.`, "success");
        } else {
          setStatus("⚠️ No matching listing fields found on this page.", "warning");
        }
      } else {
        const errMsg = response?.error || "Could not reach page content. Make sure you are on a Meesho listing tab.";
        setStatus(`Error: ${errMsg}`, "error");
      }
    } catch (err) {
      btnAutofill.disabled = false;
      setStatus("Cannot access page. Please refresh the page and try again.", "error");
    }
  });

  // Capture ALL fields
  btnCapture.addEventListener("click", async () => {
    if (!activeTab || !activeTab.id) {
      setStatus("No active browser tab found.", "error");
      return;
    }

    btnCapture.disabled = true;
    setStatus("Capturing all fields from page...", "info");

    try {
      const response = await chrome.tabs.sendMessage(activeTab.id, {
        action: "CAPTURE_NOW",
        profileId: activeProfileId
      });

      btnCapture.disabled = false;

      if (response && response.success) {
        await loadState();
        setStatus(`✓ Captured ${response.totalDetected} fields (${response.filledCount} filled) from page!`, "success");
      } else {
        setStatus("No form fields detected on page.", "warning");
      }
    } catch (err) {
      btnCapture.disabled = false;
      setStatus("Cannot access page. Please refresh the page.", "error");
    }
  });

  // Train Fields
  btnTrain.addEventListener("click", async () => {
    if (!activeTab || !activeTab.id) {
      setStatus("No active browser tab found.", "error");
      return;
    }

    try {
      await chrome.tabs.sendMessage(activeTab.id, {
        action: "START_FIELD_TRAINING",
        profileId: activeProfileId
      });
      window.close();
    } catch (err) {
      setStatus("Cannot activate training on this page. Refresh tab and retry.", "error");
    }
  });

  // Open Profile Manager
  btnOpenOptions.addEventListener("click", async () => {
    await chrome.runtime.openOptionsPage();
  });

  // Open Sandbox
  btnOpenSandbox.addEventListener("click", async () => {
    const sandboxUrl = chrome.runtime.getURL("test-page/meesho-mock-listing.html");
    await chrome.tabs.create({ url: sandboxUrl });
  });

  // Helper functions
  async function loadState() {
    const data = await chrome.storage.local.get(["profiles", "activeProfileId"]);
    profiles = data.profiles || [];
    activeProfileId = data.activeProfileId || (profiles[0] ? profiles[0].id : null);

    renderProfilesDropdown();
  }

  function renderProfilesDropdown() {
    profileSelect.innerHTML = "";
    profileCountTag.textContent = `${profiles.length} Profiles`;

    if (profiles.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No Profiles (Click +)";
      profileSelect.appendChild(opt);
      btnAutofill.disabled = true;
      return;
    }

    btnAutofill.disabled = false;
    profiles.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.name} (${p.category || "General"})`;
      if (p.id === activeProfileId) {
        opt.selected = true;
      }
      profileSelect.appendChild(opt);
    });
  }

  function getActiveProfile() {
    return profiles.find(p => p.id === activeProfileId) || profiles[0] || null;
  }

  async function checkActiveTabStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      activeTab = tab;

      if (!tab || !tab.id) {
        updatePageStatusPill("not-found", "No Tab");
        return;
      }

      const res = await chrome.tabs.sendMessage(tab.id, { action: "CHECK_PAGE_STATUS" });
      if (res && res.success) {
        if (res.inputCount > 0) {
          updatePageStatusPill("ready", `${res.inputCount} Fields Found`);
          setStatus(`Found ${res.inputCount} listing fields on page. Ready to autofill or capture!`, "success");
        } else {
          updatePageStatusPill("ready", "Page Ready");
        }
      } else {
        updatePageStatusPill("not-found", "No Form Detected");
      }
    } catch (e) {
      updatePageStatusPill("not-found", "Inactive Page");
    }
  }

  function updatePageStatusPill(state, text) {
    pageStatusPill.className = `status-pill ${state}`;
    pageStatusPill.querySelector(".status-text").textContent = text;
  }

  function setStatus(text, type = "idle") {
    statusBanner.className = `status-banner ${type}`;
    statusBanner.textContent = text;
  }
});
