/**
 * OrderBuddy - Popup Logic
 * Design System: Skylearn (Friendly, accessible, clean UI)
 */

document.addEventListener("DOMContentLoaded", async () => {
  const profileSelect = document.getElementById("profile-select");
  const profileCountTag = document.getElementById("profile-count-tag");
  const btnQuickNew = document.getElementById("btn-quick-new");
  const btnToggleSidebar = document.getElementById("btn-toggle-page-sidebar");
  const btnAutofill = document.getElementById("btn-autofill");
  const btnCapture = document.getElementById("btn-capture");
  const statusBanner = document.getElementById("status-banner");
  const pageStatusPill = document.getElementById("page-status-pill");
  const btnOpenOptions = document.getElementById("btn-open-options");

  let profiles = [];
  let activeProfileId = null;
  let activeTab = null;

  // Initialize
  await loadState();
  await checkActiveTabStatus();

  // Profile switch
  profileSelect?.addEventListener("change", async (e) => {
    activeProfileId = e.target.value;
    await chrome.storage.local.set({ activeProfileId });
    setStatus("Active profile updated.", "info");
  });

  // Open / Focus On-Page Sidebar
  btnToggleSidebar?.addEventListener("click", async () => {
    if (!activeTab || !activeTab.id) {
      setStatus("Open a catalog tab to launch the sidebar.", "warning");
      return;
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => {
          const panel = document.getElementById("meesho-sidebar-panel");
          if (panel) {
            panel.className = "open";
          }
        }
      });
      window.close(); // Close popup so user sees the docked sidebar
    } catch (e) {
      setStatus("Cannot access tab. Refresh page and try again.", "error");
    }
  });

  // Create new profile
  btnQuickNew?.addEventListener("click", async () => {
    const name = prompt("Enter a name for the new profile (e.g. Baby Godadi, Sarees):");
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
    setStatus(`Created profile "${newProfile.name}".`, "success");
  });

  // One-click autofill
  btnAutofill?.addEventListener("click", async () => {
    if (!activeTab || !activeTab.id) {
      setStatus("No active browser tab found.", "error");
      return;
    }

    const currentProfile = getActiveProfile();
    if (!currentProfile) {
      setStatus("Select or create a profile first.", "warning");
      return;
    }

    btnAutofill.disabled = true;
    setStatus("Filling product fields...", "info");

    try {
      const response = await chrome.tabs.sendMessage(activeTab.id, {
        action: "AUTOFILL_NOW",
        profileId: activeProfileId
      });

      btnAutofill.disabled = false;

      if (response && response.success) {
        if (response.filledCount > 0) {
          setStatus(`Successfully filled ${response.filledCount} fields.`, "success");
        } else {
          setStatus("No matching listing fields found on page.", "warning");
        }
      } else {
        const errMsg = response?.error || "Could not reach page content. Refresh tab and retry.";
        setStatus(`Error: ${errMsg}`, "error");
      }
    } catch (err) {
      btnAutofill.disabled = false;
      setStatus("Cannot access page. Please refresh the page.", "error");
    }
  });

  // Capture ALL fields
  btnCapture?.addEventListener("click", async () => {
    if (!activeTab || !activeTab.id) {
      setStatus("No active browser tab found.", "error");
      return;
    }

    btnCapture.disabled = true;
    setStatus("Capturing fields from page...", "info");

    try {
      const response = await chrome.tabs.sendMessage(activeTab.id, {
        action: "CAPTURE_NOW",
        profileId: activeProfileId
      });

      btnCapture.disabled = false;

      if (response && response.success) {
        await loadState();
        setStatus(`Captured ${response.totalDetected} fields (${response.filledCount} filled).`, "success");
      } else {
        setStatus("No form fields detected on page.", "warning");
      }
    } catch (err) {
      btnCapture.disabled = false;
      setStatus("Cannot access page. Please refresh the page.", "error");
    }
  });

  // Open Profile Manager
  btnOpenOptions?.addEventListener("click", async () => {
    await chrome.runtime.openOptionsPage();
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
    profileCountTag.textContent = `${profiles.length} ${profiles.length === 1 ? "Profile" : "Profiles"}`;

    if (profiles.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No profiles yet (click + to create)";
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
          setStatus(`Found ${res.inputCount} catalog fields ready.`, "success");
        } else {
          updatePageStatusPill("ready", "Ready");
        }
      } else {
        updatePageStatusPill("not-found", "No Form Detected");
      }
    } catch (e) {
      updatePageStatusPill("not-found", "Inactive Tab");
    }
  }

  function updatePageStatusPill(state, text) {
    pageStatusPill.className = `status-chip ${state}`;
    pageStatusPill.querySelector(".status-text").textContent = text;
  }

  function setStatus(text, type = "idle") {
    statusBanner.className = `status-banner ${type}`;
    statusBanner.textContent = text;
  }
});
