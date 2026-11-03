/**
 * OrderBuddy - Profile Manager Logic
 * VoiceBox Editorial Design System
 */

document.addEventListener("DOMContentLoaded", async () => {
  let profiles = [];
  let activeProfileId = null;
  let editingProfile = null;

  // DOM Elements
  const profileListEl = document.getElementById("profile-list");
  const profileSearch = document.getElementById("profile-search");
  const profilesCount = document.getElementById("profiles-count");
  const btnCreateProfile = document.getElementById("btn-create-profile");
  const btnExportJson = document.getElementById("btn-export-json");
  const btnImportTrigger = document.getElementById("btn-import-json-trigger");
  const importFileInput = document.getElementById("import-file-input");

  const activeTitle = document.getElementById("active-profile-title");
  const activeSubtitle = document.getElementById("active-profile-subtitle");
  const activeStatusBadge = document.getElementById("active-status-badge");
  const btnSetDefault = document.getElementById("btn-set-default");
  const btnDuplicate = document.getElementById("btn-duplicate-profile");
  const btnDelete = document.getElementById("btn-delete-profile");
  const btnSave = document.getElementById("btn-save-profile");

  const dynamicFieldsContainer = document.getElementById("dynamic-fields-container");
  const btnAddCustomField = document.getElementById("btn-add-custom-field");

  // Load storage data
  await loadData();

  // Search filter
  profileSearch.addEventListener("input", (e) => {
    renderSidebarList(e.target.value.trim().toLowerCase());
  });

  // Create new profile
  btnCreateProfile.addEventListener("click", () => {
    const name = prompt("Enter profile title (e.g. Godari Baby Set, Sarees, Kurtis):");
    if (!name || !name.trim()) return;

    const newP = {
      id: "profile_" + Date.now(),
      name: name.trim(),
      category: "General",
      updatedAt: new Date().toISOString(),
      fields: {},
      customMappings: {}
    };

    profiles.push(newP);
    activeProfileId = newP.id;
    editingProfile = newP;
    saveToStorage();
    renderSidebarList();
    loadProfileToForm(newP);
    showToast(`CREATED PROFILE "${newP.name.toUpperCase()}"`);
  });

  // Duplicate profile
  btnDuplicate.addEventListener("click", () => {
    if (!editingProfile) return;

    const cloned = JSON.parse(JSON.stringify(editingProfile));
    cloned.id = "profile_" + Date.now();
    cloned.name = `${editingProfile.name} (Copy)`;
    cloned.updatedAt = new Date().toISOString();

    profiles.push(cloned);
    editingProfile = cloned;
    saveToStorage();
    renderSidebarList();
    loadProfileToForm(cloned);
    showToast(`DUPLICATED INTO "${cloned.name.toUpperCase()}"`);
  });

  // Delete profile
  btnDelete.addEventListener("click", () => {
    if (!editingProfile) return;

    const confirmDelete = confirm(`Are you sure you want to delete "${editingProfile.name}"?`);
    if (!confirmDelete) return;

    const deleteId = editingProfile.id;
    profiles = profiles.filter(p => p.id !== deleteId);

    if (activeProfileId === deleteId) {
      activeProfileId = profiles[0]?.id || null;
    }
    editingProfile = profiles.find(p => p.id === activeProfileId) || profiles[0] || null;

    saveToStorage();
    renderSidebarList();
    loadProfileToForm(editingProfile);
    showToast("PROFILE DELETED.");
  });

  // Set / Toggle Default Active Profile (Enable / Disable)
  btnSetDefault.addEventListener("click", () => {
    if (!editingProfile) return;

    if (activeProfileId === editingProfile.id) {
      // Toggle disable default
      activeProfileId = null;
      saveToStorage();
      renderSidebarList();
      updateHeaderStatus();
      showToast(`DEFAULT DISABLED FOR "${editingProfile.name.toUpperCase()}".`);
    } else {
      // Enable as default
      activeProfileId = editingProfile.id;
      saveToStorage();
      renderSidebarList();
      updateHeaderStatus();
      showToast(`"${editingProfile.name.toUpperCase()}" IS NOW ACTIVE DEFAULT.`);
    }
  });

  // Save changes from single-page form
  btnSave.addEventListener("click", () => {
    if (!editingProfile) return;

    readFormToProfile(editingProfile);
    editingProfile.updatedAt = new Date().toISOString();

    saveToStorage();
    renderSidebarList();
    activeTitle.textContent = editingProfile.name.toUpperCase();
    activeSubtitle.textContent = `${(editingProfile.category || "General").toUpperCase()} // UPDATED JUST NOW`;
    showToast("PROFILE CHANGES SAVED SUCCESSFULLY.");
  });

  // Add custom field row
  btnAddCustomField.addEventListener("click", () => {
    const fieldName = prompt("Enter custom attribute name (e.g. Sleeve Length, Neck Style):");
    if (fieldName === null) return;
    const finalLabel = fieldName.trim() || "NEW ATTRIBUTE";
    const item = addDynamicFieldRow(finalLabel, "");
    if (item) {
      const valInput = item.querySelector(".dyn-val");
      if (valInput) valInput.focus();
    }
  });

  // Backup Export
  btnExportJson.addEventListener("click", () => {
    const backupData = {
      version: "1.2.0",
      exportedAt: new Date().toISOString(),
      profiles,
      activeProfileId
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orderbuddy-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("EXPORTED BACKUP JSON FILE.");
  });

  // Backup Import
  btnImportTrigger.addEventListener("click", () => {
    importFileInput.click();
  });

  importFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (!imported.profiles || !Array.isArray(imported.profiles)) {
          alert("Invalid backup file: 'profiles' array missing.");
          return;
        }

        profiles = imported.profiles;
        activeProfileId = imported.activeProfileId || profiles[0]?.id || null;

        await saveToStorage();
        editingProfile = profiles.find(p => p.id === activeProfileId) || profiles[0] || null;
        renderSidebarList();
        loadProfileToForm(editingProfile);
        showToast(`IMPORTED ${profiles.length} PROFILES SUCCESSFULLY.`);
      } catch (err) {
        alert("Failed to parse JSON backup file: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // Helper functions
  async function loadData() {
    const data = await chrome.storage.local.get(["profiles", "activeProfileId"]);
    profiles = data.profiles || [];
    activeProfileId = data.activeProfileId || (profiles[0] ? profiles[0].id : null);

    if (profiles.length > 0) {
      editingProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];
    } else {
      editingProfile = null;
    }

    renderSidebarList();
    loadProfileToForm(editingProfile);
  }

  function renderSidebarList(filter = "") {
    profileListEl.innerHTML = "";
    profilesCount.textContent = profiles.length;

    if (profiles.length === 0) {
      profileListEl.innerHTML = `
        <li style="padding: 28px 16px; color: var(--text-secondary); font-family: var(--font-body); font-size: 13px; font-weight: 500; text-align: center; line-height: 1.6; text-transform: uppercase;">
          NO PROFILES SAVED YET.<br>CLICK "NEW PROFILE" TO BEGIN.
        </li>
      `;
      return;
    }

    const filtered = profiles.filter(p => {
      if (!filter) return true;
      return (
        p.name.toLowerCase().includes(filter) ||
        (p.category && p.category.toLowerCase().includes(filter))
      );
    });

    filtered.forEach(p => {
      const li = document.createElement("li");
      li.className = `profile-item ${editingProfile && editingProfile.id === p.id ? "active" : ""}`;

      const isActiveDefault = p.id === activeProfileId;

      li.innerHTML = `
        <div class="profile-info">
          <span class="profile-item-name">${escapeHtml(p.name)}</span>
          <span class="profile-item-sub">${escapeHtml((p.category || "General").toUpperCase())}</span>
        </div>
      `;

      li.addEventListener("click", () => {
        editingProfile = p;
        renderSidebarList(profileSearch.value.trim().toLowerCase());
        loadProfileToForm(p);
      });

      profileListEl.appendChild(li);
    });
  }

  function getFieldValue(fields, key, fallbackLabels = []) {
    if (!fields) return "";
    if (fields[key] !== undefined) {
      const v = fields[key];
      return typeof v === "object" && v !== null && "value" in v ? v.value : v;
    }
    for (const [k, v] of Object.entries(fields)) {
      const val = typeof v === "object" && v !== null && "value" in v ? v.value : v;
      const label = typeof v === "object" && v !== null && "label" in v ? v.label : k;

      if (k.toLowerCase() === key.toLowerCase()) return val;
      for (const fl of fallbackLabels) {
        if (label.toLowerCase().includes(fl.toLowerCase()) || k.toLowerCase().includes(fl.toLowerCase())) {
          return val;
        }
      }
    }
    return "";
  }

  function loadProfileToForm(p) {
    if (!p) {
      activeTitle.textContent = "NO PROFILE SELECTED";
      activeSubtitle.textContent = "CREATE A PROFILE OR CAPTURE ONE FROM A LISTING FORM";
      activeStatusBadge.style.display = "none";
      clearForm();
      return;
    }

    activeTitle.textContent = p.name.toUpperCase();
    activeSubtitle.textContent = `${(p.category || "General").toUpperCase()} // ID: ${p.id}`;
    updateHeaderStatus();

    document.getElementById("profile-name-input").value = p.name || "";
    document.getElementById("profile-category-input").value = p.category || "";

    const f = p.fields || {};

    // 1. Specifications
    document.getElementById("field-gst").value = getFieldValue(f, "gst", ["gst", "tax", "supplier_gst", "gst_percent"]);
    document.getElementById("field-hsn").value = getFieldValue(f, "hsn_code", ["hsn"]);
    document.getElementById("field-weight").value = getFieldValue(f, "net_weight", ["weight", "net_weight", "product_weight"]);
    document.getElementById("field-sku").value = getFieldValue(f, "style_code", ["sku", "style", "style_code", "product id", "supplier_sku"]);
    document.getElementById("field-product-name").value = getFieldValue(f, "product_name", ["title", "name", "product_name"]);
    document.getElementById("field-sizes").value = getFieldValue(f, "sizes", ["size", "sizes"]);

    // 2. Attributes
    document.getElementById("field-care-instructions").value = getFieldValue(f, "care_instructions", ["care"]);
    document.getElementById("field-closure-type").value = getFieldValue(f, "closure_type", ["closure"]);
    document.getElementById("field-color").value = getFieldValue(f, "color", ["colour"]);
    document.getElementById("field-filling-material").value = getFieldValue(f, "filling_material", ["filling"]);
    document.getElementById("field-generic-name").value = getFieldValue(f, "generic_name", ["generic"]);
    document.getElementById("field-material").value = getFieldValue(f, "material", ["fabric"]);
    document.getElementById("field-net-quantity").value = getFieldValue(f, "net_quantity", ["quantity", "pack"]);
    document.getElementById("field-pattern").value = getFieldValue(f, "pattern", ["print"]);
    document.getElementById("field-prod-breadth").value = getFieldValue(f, "product_breadth", ["breadth"]);
    document.getElementById("field-prod-height").value = getFieldValue(f, "product_height", ["height"]);
    document.getElementById("field-prod-length").value = getFieldValue(f, "product_length", ["length"]);
    document.getElementById("field-prod-unit").value = getFieldValue(f, "product_unit", ["unit"]);
    document.getElementById("field-description").value = getFieldValue(f, "description", ["desc"]);

    // 3. Pricing
    document.getElementById("field-meesho-price").value = getFieldValue(f, "meesho_price", ["price", "selling"]);
    document.getElementById("field-wrong-return-price").value = getFieldValue(f, "wrong_return_price", ["return"]);
    document.getElementById("field-mrp").value = getFieldValue(f, "mrp", ["mrp", "maximum retail", "product_mrp", "product mrp"]);

    // 4. Compliance
    document.getElementById("field-country").value = getFieldValue(f, "country_of_origin", ["country", "origin"]) || "India";
    document.getElementById("field-manufacturer").value = getFieldValue(f, "manufacturer_details", ["mfg", "manufacturer"]);
    document.getElementById("field-packer").value = getFieldValue(f, "packer_details", ["packer"]);

    // 5. Dynamic additional fields
    renderDynamicCapturedFields(p);
  }

  function clearForm() {
    const inputs = document.querySelectorAll("#single-page-scroll input, #single-page-scroll textarea");
    inputs.forEach(i => i.value = "");
    dynamicFieldsContainer.innerHTML = "";
  }

  function updateHeaderStatus() {
    activeStatusBadge.style.display = "none";

    if (!editingProfile) {
      btnSetDefault.disabled = true;
      btnDuplicate.disabled = true;
      btnDelete.disabled = true;
      btnSave.disabled = true;
      return;
    }

    btnSetDefault.disabled = false;
    btnDuplicate.disabled = false;
    btnDelete.disabled = false;
    btnSave.disabled = false;

    const isDefault = (editingProfile.id === activeProfileId);
    if (isDefault) {
      btnSetDefault.className = "btn-default-dark";
      btnSetDefault.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2.2" stroke-linecap="square" stroke-linejoin="miter">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
        <span>DEFAULT</span>
      `;
      btnSetDefault.title = "Default profile is active (click to disable)";
    } else {
      btnSetDefault.className = "btn-secondary";
      btnSetDefault.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square" stroke-linejoin="miter">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
        <span>SET DEFAULT</span>
      `;
      btnSetDefault.title = "Click to enable as default profile";
    }
  }

  function readFormToProfile(p) {
    p.name = document.getElementById("profile-name-input").value.trim() || p.name;
    p.category = document.getElementById("profile-category-input").value.trim() || "General";

    if (!p.fields) p.fields = {};

    function setField(k, val, label, section) {
      p.fields[k] = {
        key: k,
        label: label,
        value: val,
        section: section
      };
    }

    // 1. Specifications
    setField("gst", document.getElementById("field-gst").value.trim(), "GST (%)", "Product, Size and Inventory");
    setField("hsn_code", document.getElementById("field-hsn").value.trim(), "HSN Code", "Product, Size and Inventory");
    setField("net_weight", document.getElementById("field-weight").value.trim(), "Net Weight (gms)", "Product, Size and Inventory");
    setField("style_code", document.getElementById("field-sku").value.trim(), "Style Code / SKU", "Product, Size and Inventory");
    setField("product_name", document.getElementById("field-product-name").value.trim(), "Product Name", "Product, Size and Inventory");
    setField("sizes", document.getElementById("field-sizes").value.trim(), "Available Sizes", "Product, Size and Inventory");

    // 2. Attributes
    setField("care_instructions", document.getElementById("field-care-instructions").value.trim(), "Care Instructions", "Product Details");
    setField("closure_type", document.getElementById("field-closure-type").value.trim(), "Closure Type", "Product Details");
    setField("color", document.getElementById("field-color").value.trim(), "Color", "Product Details");
    setField("filling_material", document.getElementById("field-filling-material").value.trim(), "Filling Material", "Product Details");
    setField("generic_name", document.getElementById("field-generic-name").value.trim(), "Generic Name", "Product Details");
    setField("material", document.getElementById("field-material").value.trim(), "Material", "Product Details");
    setField("net_quantity", document.getElementById("field-net-quantity").value.trim(), "Net Quantity", "Product Details");
    setField("pattern", document.getElementById("field-pattern").value.trim(), "Pattern", "Product Details");
    setField("product_breadth", document.getElementById("field-prod-breadth").value.trim(), "Breadth", "Product Details");
    setField("product_height", document.getElementById("field-prod-height").value.trim(), "Height", "Product Details");
    setField("product_length", document.getElementById("field-prod-length").value.trim(), "Length", "Product Details");
    setField("product_unit", document.getElementById("field-prod-unit").value.trim(), "Unit", "Product Details");
    setField("description", document.getElementById("field-description").value.trim(), "Description", "Product Details");

    // 3. Pricing
    setField("meesho_price", document.getElementById("field-meesho-price").value.trim(), "Meesho Price", "Pricing Details");
    setField("wrong_return_price", document.getElementById("field-wrong-return-price").value.trim(), "Wrong Return Price", "Pricing Details");
    setField("mrp", document.getElementById("field-mrp").value.trim(), "MRP", "Pricing Details");

    // 4. Compliance
    setField("country_of_origin", document.getElementById("field-country").value.trim(), "Country of Origin", "Compliance");
    setField("manufacturer_details", document.getElementById("field-manufacturer").value.trim(), "Manufacturer Details", "Compliance");
    setField("packer_details", document.getElementById("field-packer").value.trim(), "Packer Details", "Compliance");

    // 5. Dynamic additional fields
    const dynamicRows = dynamicFieldsContainer.querySelectorAll(".dynamic-field-item, .dynamic-field-row");
    dynamicRows.forEach(row => {
      const keyInput = row.querySelector(".dyn-key-label, .dyn-key");
      const valInput = row.querySelector(".dyn-val");
      if (keyInput && valInput) {
        const rawLabel = keyInput.value.trim();
        const k = rawLabel.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/^_+|_+$/g, "");
        const v = valInput.value.trim();
        if (k) {
          setField(k, v, rawLabel, "Dynamic Attributes");
        }
      }
    });
  }

  function isStandardFieldKey(k, label = "") {
    const norm = (k + " " + label).toLowerCase().replace(/[^a-z0-9]/g, "_");
    const standardPatterns = [
      /gst/,
      /hsn/,
      /weight/,
      /sku/,
      /style/,
      /product_id/,
      /product_name/,
      /^title$/,
      /^size_?$/,
      /^sizes_?$/,
      /care/,
      /closure/,
      /colo?ur/,
      /filling/,
      /generic/,
      /material/,
      /fabric/,
      /quantity/,
      /pattern/,
      /print/,
      /breadth/,
      /height/,
      /length/,
      /^unit_?$/,
      /product_unit/,
      /description/,
      /meesho_price/,
      /customer_price/,
      /return_price/,
      /wrong_return/,
      /mrp/,
      /country/,
      /origin/,
      /manufacturer/,
      /packer/
    ];
    return standardPatterns.some(p => p.test(norm));
  }

  function renderDynamicCapturedFields(p) {
    dynamicFieldsContainer.innerHTML = "";
    const f = p.fields || {};

    let count = 0;
    for (const [k, v] of Object.entries(f)) {
      const label = typeof v === "object" && v !== null && "label" in v ? v.label : k.replace(/_/g, " ");
      const val = typeof v === "object" && v !== null && "value" in v ? v.value : v;

      if (!isStandardFieldKey(k, label)) {
        addDynamicFieldRow(label, val);
        count++;
      }
    }

    if (count === 0) {
      dynamicFieldsContainer.innerHTML = `
        <div class="dynamic-empty-state">
          NO EXTRA DYNAMIC FIELDS ADDED. ALL STANDARD ATTRIBUTES APPEAR ABOVE.
        </div>
      `;
    }
  }

  function addDynamicFieldRow(label = "", value = "") {
    const emptyNotice = dynamicFieldsContainer.querySelector(".dynamic-empty-state, div[style*='text-align: center']");
    if (emptyNotice) emptyNotice.remove();

    const item = document.createElement("div");
    item.className = "form-group dynamic-field-item";

    item.innerHTML = `
      <div class="dyn-label-wrap">
        <input type="text" class="dyn-key-label" placeholder="FIELD NAME" value="${escapeHtml(label)}" title="Click to edit field name">
        <button class="btn-remove-dyn" title="Remove Field" type="button" aria-label="Remove Field">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square" stroke-linejoin="miter">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14H7V6m3 0V4h4v2"></path>
          </svg>
        </button>
      </div>
      <input type="text" class="input dyn-val" placeholder="Enter ${escapeHtml(label ? label.toUpperCase() : 'value')}" value="${escapeHtml(value)}">
    `;

    const keyInput = item.querySelector(".dyn-key-label");
    const valInput = item.querySelector(".dyn-val");

    keyInput.addEventListener("input", (e) => {
      const val = e.target.value.trim().toUpperCase();
      valInput.placeholder = val ? `Enter ${val}` : "Enter value";
    });

    item.querySelector(".btn-remove-dyn").addEventListener("click", () => {
      item.remove();
      if (dynamicFieldsContainer.querySelectorAll(".dynamic-field-item, .dynamic-field-row").length === 0) {
        dynamicFieldsContainer.innerHTML = `
          <div class="dynamic-empty-state">
            NO EXTRA DYNAMIC FIELDS ADDED. ALL STANDARD ATTRIBUTES APPEAR ABOVE.
          </div>
        `;
      }
    });

    dynamicFieldsContainer.appendChild(item);
    return item;
  }

  async function saveToStorage() {
    await chrome.storage.local.set({
      profiles,
      activeProfileId
    });
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
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
});
