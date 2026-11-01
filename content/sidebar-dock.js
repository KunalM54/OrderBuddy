/**
 * Meesho AutoListing Pro - Docked On-Page Sidebar (No Floating Toggle Tab)
 * Toggled cleanly by clicking the Chrome extension icon or clicking the 'X' button.
 * Zero unwanted floating buttons on the screen!
 */

window.MeeshoSidebar = (() => {
  let sidebarHost = null;
  let isOpen = false;
  let profilesList = [];
  let currentProfileId = null;

  // Forcefully remove any legacy floating tab or buttons if present in DOM
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
    updateFieldCountBadge();
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

    // NO floating toggle tab on the screen!
    sidebarHost.innerHTML = `
      <!-- Main Docked Sidebar -->
      <aside id="meesho-sidebar-panel" class="${isOpen ? "open" : "closed"}">
        <!-- Sidebar Header -->
        <div class="meesho-sb-header">
          <div class="meesho-sb-brand">
            <span class="brand-bolt">⚡</span>
            <div>
              <div class="brand-title">Meesho AutoListing</div>
              <div id="meesho-sb-detected-badge" class="brand-sub">Scanning page...</div>
            </div>
          </div>
          <button id="meesho-sb-close-btn" class="meesho-icon-btn" title="Close Sidebar (✕)">✕</button>
        </div>

        <!-- Profile Selector Bar -->
        <div class="meesho-sb-profile-bar">
          <div class="profile-select-label-row">
            <label for="meesho-sb-profile-select">Active Profile:</label>
            <span id="meesho-sb-profile-count" class="profile-pill">${profilesList.length} Profiles</span>
          </div>
          <div class="profile-select-row">
            <select id="meesho-sb-profile-select" class="meesho-sb-select">
              ${profilesList.length === 0 ? `<option value="">No Profiles (Click + New)</option>` : ""}
              ${profilesList.map(p => `
                <option value="${p.id}" ${p.id === currentProfileId ? "selected" : ""}>
                  ${escapeHtml(p.name)} (${escapeHtml(p.category || "General")})
                </option>
              `).join("")}
            </select>
            <button id="meesho-sb-btn-new-profile" class="meesho-sb-btn-add" title="Create New Profile">＋</button>
          </div>
        </div>

        <!-- Primary Action Center -->
        <div class="meesho-sb-actions">
          <button id="meesho-sb-btn-autofill" class="meesho-btn-autofill" ${!activeProfile ? "disabled" : ""}>
            <span class="btn-icon">⚡</span>
            <span class="btn-text">One-Click Autofill Form</span>
          </button>

          <div class="meesho-action-subgrid">
            <button id="meesho-sb-btn-capture" class="meesho-sub-btn" title="Capture ALL inputs & dropdowns from Meesho form">
              📥 Auto Capture All Fields
            </button>
            <button id="meesho-sb-btn-train" class="meesho-sub-btn" title="Click on fields to map them">
              🎯 Train Fields
            </button>
          </div>
        </div>

        <!-- Live Status Banner -->
        <div id="meesho-sb-status" class="meesho-status-box idle">
          ${activeProfile ? `Ready to autofill "${escapeHtml(activeProfile.name)}"` : "Click 'Auto Capture' or '＋' to create your profile!"}
        </div>

        <!-- Unified Single-Page Fields Editor (Like Meesho Catalog) -->
        <div class="meesho-sb-fields-container">
          <div class="meesho-sb-section-header">
            <span>Profile Listing Fields</span>
            <button id="meesho-sb-add-field-btn" class="meesho-text-link">+ Add Field</button>
          </div>

          <div id="meesho-sb-fields-list" class="meesho-sb-fields-list">
            ${renderFieldsListHtml(fields)}
          </div>
        </div>

        <!-- Sidebar Footer -->
        <div class="meesho-sb-footer">
          <button id="meesho-sb-save-fields-btn" class="meesho-btn-save-profile" ${!activeProfile ? "disabled" : ""}>
            💾 Save Profile Changes
          </button>
          <div class="meesho-sb-footer-links">
            <button id="meesho-sb-btn-manager" class="footer-link">⚙️ Profile Manager</button>
            <button id="meesho-sb-btn-sandbox" class="footer-link" style="color:#9e2578;">🧪 Test Sandbox</button>
            <span class="footer-shield" title="Manual Control: You must review and submit manually.">🛡️ Manual</span>
          </div>
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
          <p>No fields saved in this profile yet.</p>
          <p class="sub">Open any Meesho listing form and click <strong>"📥 Auto Capture All Fields"</strong> to automatically extract all dropdowns and inputs!</p>
        </div>
      `;
    }

    const sections = {
      "Product, Size and Inventory": [],
      "Product Details": [],
      "Pricing Details": [],
      "Other Attributes": []
    };

    for (const [key, raw] of entries) {
      const val = typeof raw === "object" && raw !== null && "value" in raw ? raw.value : raw;
      const label = typeof raw === "object" && raw !== null && "label" in raw ? raw.label : key.replace(/_/g, " ");
      const sectionName = typeof raw === "object" && raw !== null && "section" in raw ? raw.section : "";

      const fieldObj = { key, label, val };

      const l = label.toLowerCase();
      if (l.includes("price") || l.includes("mrp")) {
        sections["Pricing Details"].push(fieldObj);
      } else if (l.includes("gst") || l.includes("hsn") || l.includes("weight") || l.includes("sku") || l.includes("style") || l.includes("name") || l.includes("size")) {
        sections["Product, Size and Inventory"].push(fieldObj);
      } else if (sectionName && sectionName.toLowerCase().includes("product details")) {
        sections["Product Details"].push(fieldObj);
      } else {
        sections["Other Attributes"].push(fieldObj);
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
                <span class="field-label-text">${escapeHtml(f.label)}</span>
                <button class="btn-remove-row" title="Remove Field">&times;</button>
              </div>
              <input type="text" class="field-val-input" value="${escapeHtml(f.val)}" placeholder="Value for ${escapeHtml(f.label)}">
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
    const trainBtn = sidebarHost.querySelector("#meesho-sb-btn-train");
    const saveFieldsBtn = sidebarHost.querySelector("#meesho-sb-save-fields-btn");
    const addFieldBtn = sidebarHost.querySelector("#meesho-sb-add-field-btn");
    const managerBtn = sidebarHost.querySelector("#meesho-sb-btn-manager");
    const sandboxBtn = sidebarHost.querySelector("#meesho-sb-btn-sandbox");

    // Close button
    closeBtn.addEventListener("click", () => {
      close();
    });

    // Profile switch
    profileSelect.addEventListener("change", async (e) => {
      currentProfileId = e.target.value;
      await chrome.storage.local.set({ activeProfileId: currentProfileId });
      render();
    });

    // Create New Profile
    newProfileBtn.addEventListener("click", async () => {
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
      setStatus(`Created profile "${newP.name}". Click "Auto Capture" to populate it!`, "success");
    });

    // Autofill Now (With 1-Click Stop Feature)
    autofillBtn.addEventListener("click", async () => {
      // If autofill is already running, this click STOPS it immediately!
      if (window.MeeshoAutofillEngine.isRunning()) {
        setStatus("Stopping autofill process...", "warning");
        window.MeeshoAutofillEngine.stopAutofill();
        autofillBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Stopping...</span>';
        return;
      }

      const profile = getActiveProfile();
      if (!profile) {
        setStatus("Please create or select a profile first.", "error");
        return;
      }

      // Switch button to Stop mode
      autofillBtn.classList.add("btn-stopping");
      autofillBtn.innerHTML = '<span class="btn-icon">⏹</span><span class="btn-text">Stop Autofill</span>';
      setStatus("Starting safe autofill...", "info");

      try {
        const result = await window.MeeshoAutofillEngine.autofillAllFields(profile, {
          highlight: true,
          delayMs: 250,
          onProgress: (cur, total, label) => {
            setStatus(`Filling (${cur}/${total}): ${escapeHtml(label)}...`, "info");
          }
        });

        if (result.stopped) {
          setStatus(`⏹ Autofill stopped by user (${result.filledCount} of ${result.totalDetected} fields filled).`, "warning");
        } else if (result.success) {
          if (result.filledCount > 0) {
            const ratio = Math.round((result.filledCount / result.totalDetected) * 100);
            setStatus(`✓ Filled ${result.filledCount} of ${result.totalDetected} fields (${ratio}% accuracy)! Review & submit manually.`, "success");
          } else {
            setStatus("⚠️ No matching fields could be filled with this profile's data.", "warning");
          }
        } else {
          setStatus(`Error: ${result.error}`, "error");
        }
      } catch (err) {
        setStatus(`Error during autofill: ${err.message}`, "error");
      } finally {
        // Reset button back to normal
        autofillBtn.classList.remove("btn-stopping");
        autofillBtn.innerHTML = '<span class="btn-icon">⚡</span><span class="btn-text">One-Click Autofill Form</span>';
      }
    });

    // Auto Capture ALL Fields
    captureBtn.addEventListener("click", async () => {
      let profile = getActiveProfile();

      if (!profile) {
        const name = prompt("Enter profile title for captured product (e.g. Godari):", "Godari");
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

      setStatus("Capturing all inputs and dropdowns from page...", "info");
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
        setStatus(`✓ Captured ${captureResult.totalDetected} fields (${captureResult.filledCount} filled) into "${profile.name}"!`, "success");
      } else {
        setStatus("No listing form fields found on this page.", "warning");
      }
    });

    // Train Fields
    trainBtn.addEventListener("click", () => {
      const profile = getActiveProfile();
      if (!profile) {
        setStatus("Select or create a profile first to train fields.", "warning");
        return;
      }
      window.MeeshoTrainingMode.startTraining(profile);
    });

    // Add field inline
    addFieldBtn.addEventListener("click", () => {
      const label = prompt("Enter field label (e.g. Care Instructions, Filling Material, Color):");
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
    saveFieldsBtn.addEventListener("click", async () => {
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
      setStatus("✓ Profile saved successfully!", "success");
    });

    // Row remove buttons
    sidebarHost.querySelectorAll(".btn-remove-row").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const row = e.target.closest(".meesho-field-row");
        const key = row.getAttribute("data-field-key");
        const profile = getActiveProfile();
        if (profile && profile.fields && key) {
          delete profile.fields[key];
          row.remove();
        }
      });
    });

    // Full Profile Manager
    managerBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "OPEN_OPTIONS_PAGE" });
    });

    // Test Sandbox
    sandboxBtn.addEventListener("click", () => {
      const sandboxUrl = chrome.runtime.getURL("test-page/meesho-mock-listing.html");
      window.open(sandboxUrl, "_blank");
    });
  }

  function setStatus(text, type = "idle") {
    const box = sidebarHost?.querySelector("#meesho-sb-status");
    if (!box) return;
    box.className = `meesho-status-box ${type}`;
    box.textContent = text;
  }

  function updateFieldCountBadge() {
    const fields = window.MeeshoFieldMapper.getAllListingFields(document);
    const badge = sidebarHost?.querySelector("#meesho-sb-detected-badge");
    if (badge) {
      badge.textContent = `${fields.length} Fields Detected on Page`;
    }
  }

  function updateProfiles(newProfiles, newActiveId) {
    profilesList = newProfiles;
    if (newActiveId) currentProfileId = newActiveId;
    render();
    updateFieldCountBadge();
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
