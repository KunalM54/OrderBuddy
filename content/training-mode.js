/**
 * Meesho AutoListing Pro - Interactive Field Training Mode
 * Allows sellers to visually click on any form element and teach the extension
 * how to map it to standard or custom product fields.
 */

window.MeeshoTrainingMode = (() => {
  let isActive = false;
  let activeProfile = null;
  let hoveredElement = null;
  let overlayBox = null;
  let topBanner = null;
  let activeModal = null;

  /**
   * Generate an optimal unique CSS selector for an element
   */
  function generateSelector(element) {
    if (element.id) {
      return `#${CSS.escape(element.id)}`;
    }
    if (element.name) {
      return `${element.tagName.toLowerCase()}[name="${CSS.escape(element.name)}"]`;
    }
    if (element.getAttribute("data-testid")) {
      return `[data-testid="${CSS.escape(element.getAttribute("data-testid"))}"]`;
    }

    // Path generation
    const path = [];
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      if (current.className && typeof current.className === "string") {
        const classes = current.className.split(/\s+/).filter(c => c && !c.startsWith("meesho-autolisting"));
        if (classes.length > 0) {
          selector += `.${CSS.escape(classes[0])}`;
        }
      }
      path.unshift(selector);
      current = current.parentElement;
    }
    return path.slice(-3).join(" > ");
  }

  /**
   * Start training mode
   */
  function startTraining(profile) {
    if (isActive) return;
    isActive = true;
    activeProfile = profile;

    createTopBanner();
    createOverlayBox();

    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);

    document.body.classList.add("meesho-training-active");
  }

  /**
   * Stop training mode and save changes
   */
  async function stopTraining() {
    if (!isActive) return;
    isActive = false;

    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);

    document.body.classList.remove("meesho-training-active");

    if (topBanner) topBanner.remove();
    if (overlayBox) overlayBox.remove();
    if (activeModal) activeModal.remove();

    topBanner = null;
    overlayBox = null;
    activeModal = null;
    hoveredElement = null;

    // Save active profile to storage
    if (activeProfile && activeProfile.id) {
      const data = await chrome.storage.local.get("profiles");
      const profiles = data.profiles || [];
      const idx = profiles.findIndex(p => p.id === activeProfile.id);
      if (idx !== -1) {
        profiles[idx] = activeProfile;
      } else {
        profiles.push(activeProfile);
      }
      await chrome.storage.local.set({ profiles });
    }

    // Show temporary completion toast
    showToast("Training session finished. Custom mappings saved!");
  }

  function createTopBanner() {
    topBanner = document.createElement("div");
    topBanner.id = "meesho-training-banner";
    topBanner.className = "meesho-autolisting-ignore";
    topBanner.innerHTML = `
      <div class="meesho-banner-content">
        <span class="meesho-banner-badge">🎯 Training Mode Active</span>
        <span class="meesho-banner-text">
          Training profile: <strong>${escapeHtml(activeProfile ? activeProfile.name : "Active Profile")}</strong>.
          Hover and click on any input, dropdown, or textarea to map it.
        </span>
        <button id="meesho-finish-training-btn" class="meesho-btn meesho-btn-primary">
          ✓ Finish & Save
        </button>
      </div>
    `;

    document.body.prepend(topBanner);

    const btn = topBanner.querySelector("#meesho-finish-training-btn");
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      stopTraining();
    });
  }

  function createOverlayBox() {
    overlayBox = document.createElement("div");
    overlayBox.id = "meesho-training-overlay";
    overlayBox.className = "meesho-autolisting-ignore";
    overlayBox.innerHTML = `<span class="meesho-overlay-tag">Click to Map Field</span>`;
    document.body.appendChild(overlayBox);
  }

  function onMouseMove(e) {
    if (!isActive || activeModal) return;

    // Ignore extension's own UI
    if (e.target.closest("#meesho-autolisting-host") ||
        e.target.closest("#meesho-training-banner") ||
        e.target.closest("#meesho-training-overlay") ||
        e.target.closest(".meesho-autolisting-ignore")) {
      overlayBox.style.display = "none";
      return;
    }

    const target = e.target.closest("input, select, textarea, [role='combobox'], [contenteditable='true']");
    if (!target) {
      overlayBox.style.display = "none";
      hoveredElement = null;
      return;
    }

    // Avoid submit buttons
    const type = (target.type || "").toLowerCase();
    if (type === "submit" || type === "button") {
      overlayBox.style.display = "none";
      hoveredElement = null;
      return;
    }

    hoveredElement = target;
    const rect = target.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    overlayBox.style.display = "block";
    overlayBox.style.top = `${rect.top + scrollY}px`;
    overlayBox.style.left = `${rect.left + scrollX}px`;
    overlayBox.style.width = `${rect.width}px`;
    overlayBox.style.height = `${rect.height}px`;

    const identified = window.MeeshoFieldMapper.identifyField(target, activeProfile?.customMappings || {});
    const tag = overlayBox.querySelector(".meesho-overlay-tag");
    if (tag) {
      tag.textContent = identified ? `🎯 ${identified.label} (Click to edit)` : "🎯 Click to map field";
    }
  }

  function onClick(e) {
    if (!isActive) return;

    if (e.target.closest("#meesho-training-banner") ||
        e.target.closest("#meesho-training-modal") ||
        e.target.closest(".meesho-autolisting-ignore")) {
      return;
    }

    if (hoveredElement) {
      e.preventDefault();
      e.stopPropagation();
      openTrainingModal(hoveredElement);
    }
  }

  function onKeyDown(e) {
    if (!isActive) return;
    if (e.key === "Escape") {
      if (activeModal) {
        activeModal.remove();
        activeModal = null;
      } else {
        stopTraining();
      }
    }
  }

  function openTrainingModal(element) {
    if (activeModal) activeModal.remove();

    const selector = generateSelector(element);
    const detectedLabel = window.MeeshoFieldMapper.extractLabel(element) || element.name || element.id || "Unlabeled Field";
    const currentValue = element.value || (element.isContentEditable ? element.innerText : "");
    const identified = window.MeeshoFieldMapper.identifyField(element, activeProfile?.customMappings || {});

    activeModal = document.createElement("div");
    activeModal.id = "meesho-training-modal";
    activeModal.className = "meesho-autolisting-ignore";

    const standardFields = window.MeeshoFieldMapper.FIELD_DEFINITIONS;
    const optionsHtml = standardFields.map(f => {
      const isSelected = identified && identified.key === f.key ? "selected" : "";
      return `<option value="${f.key}" ${isSelected}>${f.category}: ${f.label}</option>`;
    }).join("");

    activeModal.innerHTML = `
      <div class="meesho-modal-backdrop"></div>
      <div class="meesho-modal-card">
        <div class="meesho-modal-header">
          <div class="meesho-modal-title">🎯 Map Field to Profile</div>
          <button class="meesho-modal-close">&times;</button>
        </div>
        <div class="meesho-modal-body">
          <div class="meesho-detected-preview">
            <span class="meesho-pill">Selector: <code>${escapeHtml(selector)}</code></span>
            <span class="meesho-pill">Detected: <strong>${escapeHtml(detectedLabel)}</strong></span>
          </div>

          <label class="meesho-form-label">Map to Standard Field:</label>
          <select id="meesho-modal-field-select" class="meesho-input">
            ${optionsHtml}
            <option value="__custom__">+ Create Custom Field</option>
          </select>

          <div id="meesho-modal-custom-wrap" style="display:none; margin-top:8px;">
            <label class="meesho-form-label">Custom Field Name / Key:</label>
            <input id="meesho-modal-custom-name" type="text" class="meesho-input" placeholder="e.g. Occasion, Kurti Length">
          </div>

          <label class="meesho-form-label" style="margin-top:12px;">Default Value for this Profile:</label>
          <input id="meesho-modal-field-val" type="text" class="meesho-input" value="${escapeHtml(currentValue)}" placeholder="Enter value">
        </div>
        <div class="meesho-modal-footer">
          <button id="meesho-modal-cancel" class="meesho-btn meesho-btn-secondary">Cancel</button>
          <button id="meesho-modal-save" class="meesho-btn meesho-btn-primary">Save Mapping</button>
        </div>
      </div>
    `;

    document.body.appendChild(activeModal);

    const selectEl = activeModal.querySelector("#meesho-modal-field-select");
    const customWrap = activeModal.querySelector("#meesho-modal-custom-wrap");
    const customNameInput = activeModal.querySelector("#meesho-modal-custom-name");
    const valInput = activeModal.querySelector("#meesho-modal-field-val");

    selectEl.addEventListener("change", () => {
      if (selectEl.value === "__custom__") {
        customWrap.style.display = "block";
      } else {
        customWrap.style.display = "none";
      }
    });

    activeModal.querySelector(".meesho-modal-close").addEventListener("click", () => {
      activeModal.remove();
      activeModal = null;
    });

    activeModal.querySelector("#meesho-modal-cancel").addEventListener("click", () => {
      activeModal.remove();
      activeModal = null;
    });

    activeModal.querySelector("#meesho-modal-save").addEventListener("click", () => {
      let fieldKey = selectEl.value;
      let fieldLabel = selectEl.options[selectEl.selectedIndex].text;

      if (fieldKey === "__custom__") {
        const customName = customNameInput.value.trim();
        if (!customName) {
          alert("Please provide a name for the custom field.");
          return;
        }
        fieldKey = customName.toLowerCase().replace(/[^a-z0-9]/g, "_");
        fieldLabel = customName;
      }

      const assignedValue = valInput.value.trim();

      // Update active profile
      if (!activeProfile.customMappings) {
        activeProfile.customMappings = {};
      }
      if (!activeProfile.fields) {
        activeProfile.fields = {};
      }

      activeProfile.customMappings[fieldKey] = {
        selector,
        id: element.id || null,
        name: element.name || null,
        label: fieldLabel,
        updatedAt: new Date().toISOString()
      };

      if (assignedValue) {
        activeProfile.fields[fieldKey] = assignedValue;
      }

      showToast(`Field mapped to "${fieldLabel}"!`);

      activeModal.remove();
      activeModal = null;
    });
  }

  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "meesho-autolisting-toast meesho-autolisting-ignore";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("show");
    }, 10);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 2800);
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
    startTraining,
    stopTraining,
    isTraining: () => isActive,
    showToast
  };
})();
