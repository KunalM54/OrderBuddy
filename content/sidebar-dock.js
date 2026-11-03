/**
 * OrderBuddy - Docked On-Page Sidebar
 * VoiceBox Editorial Design System
 */

window.MeeshoSidebar = (() => {
  let sidebarHost = null;
  let isOpen = false;
  let profilesList = [];
  let currentProfileId = null;

  // Purge any legacy floating elements
  function purgeLegacyFloatingElements() {
    document.querySelectorAll(
      "#meesho-sidebar-toggle-tab, #meesho-widget-card, #meesho-widget-header, [id*='toggle-tab'], [class*='toggle-tab']"
    ).forEach(el => el.remove());
  }

  async function init() {
    purgeLegacyFloatingElements();
    const data = await chrome.storage.local.get(["profiles", "activeProfileId", "settings"]);
    profilesList = data.profiles || [];
    currentProfileId = data.activeProfileId || (profilesList[0] ? profilesList[0].id : null);

    render();
  }

  function getActiveProfile() {
    return profilesList.find(p => p.id === currentProfileId) || profilesList[0] || null;
  }

  function open() {
    isOpen = true;
    const panel = sidebarHost?.querySelector("#meesho-sidebar-panel");
    if (panel) {
      panel.className = "open";
    }
  }

  function close() {
    isOpen = false;
    const panel = sidebarHost?.querySelector("#meesho-sidebar-panel");
    if (panel) {
      panel.className = "closed";
    }
  }

  function toggle() {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }

  function render() {
    purgeLegacyFloatingElements();
    if (sidebarHost) sidebarHost.remove();

    const activeProfile = getActiveProfile();
    const fields = activeProfile?.fields || {};

    sidebarHost = document.createElement("div");
    sidebarHost.id = "meesho-autolisting-host";
    sidebarHost.className = "meesho-autolisting-ignore";

    sidebarHost.innerHTML = `
      <!-- Main Docked Sidebar -->
      <aside id="meesho-sidebar-panel" class="${isOpen ? "open" : "closed"}">
        <!-- Sidebar Header -->
        <div class="meesho-sb-header">
          <div class="meesho-sb-brand">
            <div class="brand-icon-box" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter">
                <rect x="3" y="3" width="18" height="18"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
            </div>
            <div class="brand-text-col">
              <span class="brand-title">ORDERBUDDY</span>
              <span class="brand-tag">ASSISTANT // v1.2</span>
            </div>
          </div>
          <div class="meesho-sb-header-actions">
            <button id="meesho-sb-btn-manager" class="meesho-header-btn" title="Open Profile Manager">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square" stroke-linejoin="miter">
                <path d="M18 13v6H5V8h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              <span>MANAGER</span>
            </button>
            <button id="meesho-sb-close-btn" class="meesho-icon-btn" title="Close Sidebar" aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <!-- Profile Selector Bar -->
        <div class="meesho-sb-profile-bar">
          <div class="profile-select-label-row">
            <label for="meesho-sb-profile-select">ACTIVE PROFILE</label>
            <span id="meesho-sb-profile-count" class="profile-pill">${profilesList.length} PROFILES</span>
          </div>
          <div class="profile-select-row">
            <select id="meesho-sb-profile-select" class="meesho-sb-select">
              ${profilesList.length === 0 ? `<option value="">NO PROFILES (CLICK + TO CREATE)</option>` : ""}
              ${profilesList.map(p => `
                <option value="${p.id}" ${p.id === currentProfileId ? "selected" : ""}>
                  ${escapeHtml(p.name.toUpperCase())} (${escapeHtml((p.category || "General").toUpperCase())})
                </option>
              `).join("")}
            </select>
            <button id="meesho-sb-btn-new-profile" class="meesho-sb-btn-add" title="Create New Profile" aria-label="New Profile">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>

        <!-- Primary Action Center -->
        <div class="meesho-sb-actions">
          <button id="meesho-sb-btn-autofill" class="meesho-btn-autofill" ${!activeProfile ? "disabled" : ""}>
            <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            <span class="btn-text">AUTOFILL FORM</span>
          </button>

          <button id="meesho-sb-btn-capture" class="meesho-btn-capture" title="Extract all inputs and dropdowns from page">
            <svg class="btn-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square" stroke-linejoin="miter">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
            <span>CAPTURE PAGE FIELDS</span>
          </button>
        </div>

        <!-- Live Status Banner -->
        <div id="meesho-sb-status" class="meesho-status-box idle">
          <span class="status-box-tag">STATUS</span>
          <span class="status-text">${activeProfile ? `READY FOR "${escapeHtml(activeProfile.name.toUpperCase())}"` : "SELECT OR CREATE A PROFILE TO START"}</span>
        </div>

        <!-- Unified Fields Editor -->
        <div class="meesho-sb-fields-container">
          <div class="meesho-sb-section-header">
            <span class="header-tag">LISTING ATTRIBUTES</span>
            <button id="meesho-sb-add-field-btn" class="meesho-text-link">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>ADD FIELD</span>
            </button>
          </div>

          <div id="meesho-sb-fields-list" class="meesho-sb-fields-list">
            ${renderFieldsListHtml(fields)}
          </div>
        </div>

        <!-- Sidebar Footer -->
        <div class="meesho-sb-footer">
          <button id="meesho-sb-save-fields-btn" class="meesho-btn-save-profile" ${!activeProfile ? "disabled" : ""}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square" stroke-linejoin="miter">
              <path d="M19 21H5V5h11l5 5v11z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            <span>SAVE PROFILE CHANGES</span>
          </button>
        </div>
      </aside>
    `;

    document.body.appendChild(sidebarHost);
    bindEvents();
  }

  function renderFieldsListHtml(fields) {
    const entries = Object.entries(fields);
    if (entries.length === 0) {
      return `
        <div class="meesho-empty-fields-state">
          <p class="empty-title">NO FIELDS SAVED IN THIS PROFILE</p>
          <p class="empty-desc">Open a catalog page and click "CAPTURE PAGE FIELDS" to extract attributes.</p>
        </div>
      `;
    }

    const sections = {
      "SPECIFICATIONS": [],
      "ATTRIBUTES": [],
      "COMMERCIALS": [],
      "OTHER": []
    };

    for (const [key, raw] of entries) {
      const val = typeof raw === "object" && raw !== null && "value" in raw ? raw.value : raw;
      const label = typeof raw === "object" && raw !== null && "label" in raw ? raw.label : key.replace(/_/g, " ");
      const sectionName = typeof raw === "object" && raw !== null && "section" in raw ? raw.section : "";

      const fieldObj = { key, label, val };

      const l = label.toLowerCase();
      if (l.includes("price") || l.includes("mrp")) {
        sections["COMMERCIALS"].push(fieldObj);
      } else if (l.includes("gst") || l.includes("hsn") || l.includes("weight") || l.includes("sku") || l.includes("style") || l.includes("name") || l.includes("size")) {
        sections["SPECIFICATIONS"].push(fieldObj);
      } else if (sectionName && (sectionName.toLowerCase().includes("detail") || sectionName.toLowerCase().includes("attribute"))) {
        sections["ATTRIBUTES"].push(fieldObj);
      } else {
        sections["OTHER"].push(fieldObj);
      }
    }

    let html = "";
    for (const [secTitle, list] of Object.entries(sections)) {
      if (list.length === 0) continue;
      html += `
        <div class="meesho-field-group">
          <div class="meesho-group-title">${escapeHtml(secTitle)}</div>
          ${list.map(f => `
            <div class="meesho-field-row" data-field-key="${escapeHtml(f.key)}">
              <div class="field-label-wrap">
                <span class="field-label-text">${escapeHtml(f.label.toUpperCase())}</span>
                <button class="btn-remove-row" title="Remove Field" type="button" aria-label="Remove Field">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square" stroke-linejoin="miter">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14H7V6m3 0V4h4v2"></path>
                  </svg>
                </button>
              </div>
              <input type="text" class="field-val-input" value="${escapeHtml(f.val)}" placeholder="ENTER ${escapeHtml(f.label.toUpperCase())}">
            </div>
          `).join("")}
        </div>
      `;
    }

    return html;
  }

  function bindEvents() {
    const closeBtn = sidebarHost.querySelector("#meesho-sb-close-btn");
    const profileSelect = sidebarHost.querySelector("#meesho-sb-profile-select");
    const newProfileBtn = sidebarHost.querySelector("#meesho-sb-btn-new-profile");
    const autofillBtn = sidebarHost.querySelector("#meesho-sb-btn-autofill");
    const captureBtn = sidebarHost.querySelector("#meesho-sb-btn-capture");
    const saveFieldsBtn = sidebarHost.querySelector("#meesho-sb-save-fields-btn");
    const addFieldBtn = sidebarHost.querySelector("#meesho-sb-add-field-btn");
    const managerBtn = sidebarHost.querySelector("#meesho-sb-btn-manager");

    // Close button
    closeBtn?.addEventListener("click", () => {
      close();
    });

    // Profile switch
    profileSelect?.addEventListener("change", async (e) => {
      currentProfileId = e.target.value;
      await chrome.storage.local.set({ activeProfileId: currentProfileId });
      render();
    });

    // Create New Profile
    newProfileBtn?.addEventListener("click", async () => {
      const name = prompt("Enter a name for the new profile (e.g. Godari Baby Set, Sarees):");
      if (!name || !name.trim()) return;

      const newP = {
        id: "profile_" + Date.now(),
        name: name.trim(),
        category: "General",
        updatedAt: new Date().toISOString(),
        fields: {},
        customMappings: {}
      };

      profilesList.push(newP);
      currentProfileId = newP.id;
      await chrome.storage.local.set({ profiles: profilesList, activeProfileId: currentProfileId });
      render();
      setStatus(`CREATED PROFILE "${newP.name.toUpperCase()}".`, "success");
    });

    // Autofill Now (With 1-Click Stop Feature)
    autofillBtn?.addEventListener("click", async () => {
      if (window.MeeshoAutofillEngine.isRunning()) {
        setStatus("STOPPING AUTOFILL PROCESS...", "warning");
        window.MeeshoAutofillEngine.stopAutofill();
        autofillBtn.innerHTML = '<span class="btn-text">STOPPING...</span>';
        return;
      }

      const profile = getActiveProfile();
      if (!profile) {
        setStatus("SELECT OR CREATE A PROFILE FIRST.", "error");
        return;
      }

      // Switch button to Stop mode
      autofillBtn.classList.add("btn-stopping");
      autofillBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter">
          <rect x="6" y="6" width="12" height="12"></rect>
        </svg>
        <span class="btn-text">STOP AUTOFILL</span>
      `;
      setStatus("STARTING AUTOFILL...", "info");

      try {
        const result = await window.MeeshoAutofillEngine.autofillAllFields(profile, {
          highlight: true,
          delayMs: 250,
          onProgress: (cur, total, label) => {
            setStatus(`FILLING (${cur}/${total}): ${escapeHtml(label.toUpperCase())}...`, "info");
          }
        });

        if (result.stopped) {
          setStatus(`STOPPED (${result.filledCount} OF ${result.totalDetected} FIELDS FILLED).`, "warning");
        } else if (result.success) {
          if (result.filledCount > 0) {
            const ratio = Math.round((result.filledCount / result.totalDetected) * 100);
            setStatus(`FILLED ${result.filledCount} OF ${result.totalDetected} FIELDS (${ratio}%).`, "success");
          } else {
            setStatus("NO MATCHING FIELDS FOUND FOR THIS PROFILE.", "warning");
          }
        } else {
          setStatus(`ERROR: ${result.error}`, "error");
        }
      } catch (err) {
        setStatus(`ERROR DURING AUTOFILL: ${err.message}`, "error");
      } finally {
        // Reset button back to normal
        autofillBtn.classList.remove("btn-stopping");
        autofillBtn.innerHTML = `
          <svg class="btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          <span class="btn-text">AUTOFILL FORM</span>
        `;
      }
    });

    // Auto Capture ALL Fields
    captureBtn?.addEventListener("click", async () => {
      let profile = getActiveProfile();

      if (!profile) {
        const name = prompt("Enter profile title for captured product:", "Godari");
        if (!name || !name.trim()) return;

        profile = {
          id: "profile_" + Date.now(),
          name: name.trim(),
          category: "General",
          updatedAt: new Date().toISOString(),
          fields: {},
          customMappings: {}
        };
        profilesList.push(profile);
        currentProfileId = profile.id;
      }

      setStatus("CAPTURING FIELDS FROM PAGE...", "info");
      const captureResult = window.MeeshoAutofillEngine.captureAllFields();

      if (captureResult.success && captureResult.totalDetected > 0) {
        profile.fields = {
          ...profile.fields,
          ...captureResult.fields
        };
        profile.updatedAt = new Date().toISOString();

        const idx = profilesList.findIndex(p => p.id === profile.id);
        if (idx !== -1) profilesList[idx] = profile;

        await chrome.storage.local.set({ profiles: profilesList, activeProfileId: profile.id });
        render();
        setStatus(`CAPTURED ${captureResult.totalDetected} FIELDS INTO "${profile.name.toUpperCase()}".`, "success");
      } else {
        setStatus("NO LISTING FORM FIELDS FOUND ON THIS PAGE.", "warning");
      }
    });

    // Add field inline
    addFieldBtn?.addEventListener("click", () => {
      const label = prompt("Enter field label (e.g. Care Instructions, Color):");
      if (!label || !label.trim()) return;

      const key = window.MeeshoFieldMapper.labelToKey(label);
      const profile = getActiveProfile();
      if (!profile) return;

      if (!profile.fields) profile.fields = {};
      profile.fields[key] = {
        key,
        label: label.trim(),
        value: "",
        section: "Custom Attributes"
      };

      render();
    });

    // Save Profile Changes from inline editor
    saveFieldsBtn?.addEventListener("click", async () => {
      const profile = getActiveProfile();
      if (!profile) return;

      const rows = sidebarHost.querySelectorAll(".meesho-field-row");
      rows.forEach(row => {
        const key = row.getAttribute("data-field-key");
        const valInput = row.querySelector(".field-val-input");
        if (key && valInput && profile.fields[key]) {
          if (typeof profile.fields[key] === "object") {
            profile.fields[key].value = valInput.value.trim();
          } else {
            profile.fields[key] = valInput.value.trim();
          }
        }
      });

      profile.updatedAt = new Date().toISOString();
      const idx = profilesList.findIndex(p => p.id === profile.id);
      if (idx !== -1) profilesList[idx] = profile;

      await chrome.storage.local.set({ profiles: profilesList });
      setStatus("PROFILE SAVED SUCCESSFULLY.", "success");
    });

    // Row remove buttons
    sidebarHost.querySelectorAll(".btn-remove-row").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const row = e.target.closest(".meesho-field-row");
        const key = row?.getAttribute("data-field-key");
        const profile = getActiveProfile();
        if (profile && profile.fields && key) {
          delete profile.fields[key];
          row.remove();
        }
      });
    });

    // Full Profile Manager
    managerBtn?.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "OPEN_OPTIONS_PAGE" });
    });
  }

  function setStatus(text, type = "idle") {
    const box = sidebarHost?.querySelector("#meesho-sb-status");
    if (!box) return;
    box.className = `meesho-status-box ${type}`;
    const textEl = box.querySelector(".status-text");
    if (textEl) {
      textEl.textContent = text;
    } else {
      box.textContent = text;
    }
  }

  function updateFieldCountBadge() {}

  function updateProfiles(newProfiles, newActiveId) {
    profilesList = newProfiles;
    if (newActiveId) currentProfileId = newActiveId;
    render();
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  return {
    init,
    open,
    close,
    toggle,
    isOpen: () => isOpen,
    updateProfiles,
    setStatus,
    updateFieldCountBadge
  };
})();
