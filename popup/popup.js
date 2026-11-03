/**
 * OrderBuddy - Popup Logic
 * VoiceBox Editorial Design System
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
    setStatus("ACTIVE PROFILE UPDATED.", "info");
  });

  // Open / Focus On-Page Sidebar
  btnToggleSidebar?.addEventListener("click", async () => {
    if (!activeTab || !activeTab.id) {
      setStatus("OPEN A CATALOG TAB TO LAUNCH SIDEBAR.", "warning");
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
      setStatus("CANNOT ACCESS TAB. REFRESH PAGE AND TRY AGAIN.", "error");
    }
  });

  // Create new profile
  btnQuickNew?.addEventListener("click", async () => {
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
    setStatus(`CREATED PROFILE "${newProfile.name.toUpperCase()}".`, "success");
  });

  // One-click autofill
  btnAutofill?.addEventListener("click", async () => {
    if (!activeTab || !activeTab.id) {
      setStatus("NO ACTIVE BROWSER TAB FOUND.", "error");
      return;
    }

    const currentProfile = getActiveProfile();
    if (!currentProfile) {
      setStatus("SELECT OR CREATE A PROFILE FIRST.", "warning");
      return;
    }

    btnAutofill.disabled = true;
    setStatus("FILLING PRODUCT FIELDS...", "info");

    try {
      const response = await chrome.tabs.sendMessage(activeTab.id, {
        action: "AUTOFILL_NOW",
        profileId: activeProfileId
      });

      btnAutofill.disabled = false;

      if (response && response.success) {
        if (response.filledCount > 0) {
          setStatus(`SUCCESSFULLY FILLED ${response.filledCount} FIELDS.`, "success");
        } else {
          setStatus("NO MATCHING LISTING FIELDS FOUND ON PAGE.", "warning");
        }
      } else {
        const errMsg = response?.error || "COULD NOT REACH PAGE CONTENT. REFRESH TAB AND RETRY.";
        setStatus(`ERROR: ${errMsg.toUpperCase()}`, "error");
      }
    } catch (err) {
      btnAutofill.disabled = false;
      setStatus("CANNOT ACCESS PAGE. PLEASE REFRESH THE PAGE.", "error");
    }
  });

  // Capture ALL fields
  btnCapture?.addEventListener("click", async () => {
    if (!activeTab || !activeTab.id) {
      setStatus("NO ACTIVE BROWSER TAB FOUND.", "error");
      return;
    }

    btnCapture.disabled = true;
    setStatus("CAPTURING FIELDS FROM PAGE...", "info");

    try {
      const response = await chrome.tabs.sendMessage(activeTab.id, {
        action: "CAPTURE_NOW",
        profileId: activeProfileId
      });

      btnCapture.disabled = false;

      if (response && response.success) {
        await loadState();
        setStatus(`CAPTURED ${response.totalDetected} FIELDS (${response.filledCount} FILLED).`, "success");
      } else {
        setStatus("NO FORM FIELDS DETECTED ON PAGE.", "warning");
      }
    } catch (err) {
      btnCapture.disabled = false;
      setStatus("CANNOT ACCESS PAGE. PLEASE REFRESH THE PAGE.", "error");
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
    profileCountTag.textContent = `${profiles.length} PROFILES`;

    if (profiles.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "NO PROFILES (CLICK + TO CREATE)";
      profileSelect.appendChild(opt);
      btnAutofill.disabled = true;
      return;
    }

    btnAutofill.disabled = false;
    profiles.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.name.toUpperCase()} (${(p.category || "General").toUpperCase()})`;
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
        updatePageStatusPill("not-found", "NO TAB");
        return;
      }

      const res = await chrome.tabs.sendMessage(tab.id, { action: "CHECK_PAGE_STATUS" });
      if (res && res.success) {
        if (res.inputCount > 0) {
          updatePageStatusPill("ready", `${res.inputCount} FIELDS FOUND`);
          setStatus(`FOUND ${res.inputCount} FIELDS. READY TO AUTOFILL OR CAPTURE.`, "success");
        } else {
          updatePageStatusPill("ready", "PAGE READY");
        }
      } else {
        updatePageStatusPill("not-found", "NO FORM DETECTED");
      }
    } catch (e) {
      updatePageStatusPill("not-found", "INACTIVE PAGE");
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
