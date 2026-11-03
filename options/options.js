/**
 * OrderBuddy - Profile Manager Logic
 * Single-page layout matching Meesho Supplier catalog upload sections.
 * Clean state, zero dummy profiles, and category-agnostic field handling.
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
    showToast(`Created profile "${newP.name}"`);
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
    showToast(`Duplicated into "${cloned.name}"`);
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
    showToast("Profile deleted.");
  });

  // Set as Default Active Profile
  btnSetDefault.addEventListener("click", () => {
    if (!editingProfile) return;
    activeProfileId = editingProfile.id;
    saveToStorage();
    renderSidebarList();
    updateHeaderStatus();
    showToast(`"${editingProfile.name}" is now the active default profile!`);
  });

  // Save changes from single-page form
  btnSave.addEventListener("click", () => {
    if (!editingProfile) return;

    readFormToProfile(editingProfile);
    editingProfile.updatedAt = new Date().toISOString();

    saveToStorage();
    renderSidebarList();
    activeTitle.textContent = editingProfile.name;
    activeSubtitle.textContent = `${editingProfile.category || "General"} • Updated just now`;
    showToast("All profile changes saved successfully!");
  });

  // Add custom field row
  btnAddCustomField.addEventListener("click", () => {
    addDynamicFieldRow("", "");
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
    showToast("Exported profiles backup JSON file!");
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
        showToast(`Successfully imported ${profiles.length} profiles!`);
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
        <li style="padding: 16px 12px; color: #94a3b8; font-size: 12px; text-align: center;">
          No profiles yet.<br>Click "＋ Create New Profile" or use "Auto Capture" on Meesho.
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
          <span class="profile-item-sub">${escapeHtml(p.category || "General")}</span>
        </div>
        ${isActiveDefault ? `<span class="profile-pill-badge active" style="font-size:10px; padding:2px 6px;">DEFAULT</span>` : ""}
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
    // Direct match
    if (fields[key] !== undefined) {
      const v = fields[key];
      return typeof v === "object" && v !== null && "value" in v ? v.value : v;
    }
    // Alias match
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
      activeTitle.textContent = "No Profile Selected";
      activeSubtitle.textContent = "Create a profile or capture one from a Meesho listing form";
      activeStatusBadge.style.display = "none";
      clearForm();
      return;
    }

    activeTitle.textContent = p.name;
    activeSubtitle.textContent = `${p.category || "General"} • ID: ${p.id}`;
    updateHeaderStatus();

    document.getElementById("profile-name-input").value = p.name || "";
    document.getElementById("profile-category-input").value = p.category || "";

    const f = p.fields || {};

    // 1. Product, Size and Inventory
    document.getElementById("field-gst").value = getFieldValue(f, "gst", ["gst"]);
    document.getElementById("field-hsn").value = getFieldValue(f, "hsn_code", ["hsn"]);
    document.getElementById("field-weight").value = getFieldValue(f, "net_weight", ["weight"]);
    document.getElementById("field-sku").value = getFieldValue(f, "style_code", ["sku", "style"]);
    document.getElementById("field-product-name").value = getFieldValue(f, "product_name", ["title", "name"]);
    document.getElementById("field-sizes").value = getFieldValue(f, "sizes", ["size"]);

    // 2. Product Details
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

    // 3. Pricing Details
    document.getElementById("field-meesho-price").value = getFieldValue(f, "meesho_price", ["price", "selling"]);
    document.getElementById("field-wrong-return-price").value = getFieldValue(f, "wrong_return_price", ["return"]);
    document.getElementById("field-mrp").value = getFieldValue(f, "mrp", ["maximum retail"]);

    // 4. Compliance & Manufacturer
    document.getElementById("field-country").value = getFieldValue(f, "country_of_origin", ["country", "origin"]) || "India";
    document.getElementById("field-manufacturer").value = getFieldValue(f, "manufacturer_details", ["mfg", "manufacturer"]);
    document.getElementById("field-packer").value = getFieldValue(f, "packer_details", ["packer"]);

    // Render any additional dynamic fields that were captured
    renderDynamicCapturedFields(p);
  }

  function clearForm() {
    const inputs = document.querySelectorAll("#single-page-scroll input, #single-page-scroll textarea");
    inputs.forEach(i => i.value = "");
    dynamicFieldsContainer.innerHTML = "";
  }

  function updateHeaderStatus() {
    if (!editingProfile) {
      activeStatusBadge.style.display = "none";
      return;
    }
    if (editingProfile.id === activeProfileId) {
      activeStatusBadge.style.display = "inline-block";
      activeStatusBadge.className = "profile-pill-badge active";
      activeStatusBadge.textContent = "Active Default";
    } else {
      activeStatusBadge.style.display = "inline-block";
      activeStatusBadge.className = "profile-pill-badge inactive";
      activeStatusBadge.textContent = "Inactive";
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

    // 1. Product, Size and Inventory
    setField("gst", document.getElementById("field-gst").value.trim(), "GST (%)", "Product, Size and Inventory");
    setField("hsn_code", document.getElementById("field-hsn").value.trim(), "HSN Code", "Product, Size and Inventory");
    setField("net_weight", document.getElementById("field-weight").value.trim(), "Net Weight (gms)", "Product, Size and Inventory");
    setField("style_code", document.getElementById("field-sku").value.trim(), "Style code / Product ID", "Product, Size and Inventory");
    setField("product_name", document.getElementById("field-product-name").value.trim(), "Product Name", "Product, Size and Inventory");
    setField("sizes", document.getElementById("field-sizes").value.trim(), "Sizes Available", "Product, Size and Inventory");

    // 2. Product Details
    setField("care_instructions", document.getElementById("field-care-instructions").value.trim(), "Care Instructions", "Product Details");
    setField("closure_type", document.getElementById("field-closure-type").value.trim(), "Closure Type", "Product Details");
    setField("color", document.getElementById("field-color").value.trim(), "Color", "Product Details");
    setField("filling_material", document.getElementById("field-filling-material").value.trim(), "Filling Material", "Product Details");
    setField("generic_name", document.getElementById("field-generic-name").value.trim(), "Generic Name", "Product Details");
    setField("material", document.getElementById("field-material").value.trim(), "Material", "Product Details");
    setField("net_quantity", document.getElementById("field-net-quantity").value.trim(), "Net Quantity (N)", "Product Details");
    setField("pattern", document.getElementById("field-pattern").value.trim(), "Pattern", "Product Details");
    setField("product_breadth", document.getElementById("field-prod-breadth").value.trim(), "Product Breadth", "Product Details");
    setField("product_height", document.getElementById("field-prod-height").value.trim(), "Product Height", "Product Details");
    setField("product_length", document.getElementById("field-prod-length").value.trim(), "Product Length", "Product Details");
    setField("product_unit", document.getElementById("field-prod-unit").value.trim(), "Product Unit", "Product Details");
    setField("description", document.getElementById("field-description").value.trim(), "Product Description", "Product Details");

    // 3. Pricing Details
    setField("meesho_price", document.getElementById("field-meesho-price").value.trim(), "Meesho Price", "Pricing Details");
    setField("wrong_return_price", document.getElementById("field-wrong-return-price").value.trim(), "Wrong Return Price", "Pricing Details");
    setField("mrp", document.getElementById("field-mrp").value.trim(), "MRP", "Pricing Details");

    // 4. Compliance & Manufacturer
    setField("country_of_origin", document.getElementById("field-country").value.trim(), "Country of Origin", "Compliance");
    setField("manufacturer_details", document.getElementById("field-manufacturer").value.trim(), "Manufacturer Details", "Compliance");
    setField("packer_details", document.getElementById("field-packer").value.trim(), "Packer Details", "Compliance");

    // 5. Dynamic additional fields
    const dynamicRows = dynamicFieldsContainer.querySelectorAll(".dynamic-field-row");
    dynamicRows.forEach(row => {
      const keyInput = row.querySelector(".dyn-key");
      const valInput = row.querySelector(".dyn-val");
      if (keyInput && valInput) {
        const k = keyInput.value.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
        const v = valInput.value.trim();
        const lbl = keyInput.value.trim();
        if (k) {
          setField(k, v, lbl, "Dynamic Attributes");
        }
      }
    });
  }

  function renderDynamicCapturedFields(p) {
    dynamicFieldsContainer.innerHTML = "";
    const f = p.fields || {};

    const standardStaticKeys = new Set([
      "gst", "hsn_code", "net_weight", "style_code", "product_name", "sizes",
      "care_instructions", "closure_type", "color", "filling_material", "generic_name",
      "material", "net_quantity", "pattern", "product_breadth", "product_height",
      "product_length", "product_unit", "description", "meesho_price",
      "wrong_return_price", "mrp", "country_of_origin", "manufacturer_details",
      "packer_details"
    ]);

    let count = 0;
    for (const [k, v] of Object.entries(f)) {
      if (!standardStaticKeys.has(k)) {
        const label = typeof v === "object" && v !== null && "label" in v ? v.label : k.replace(/_/g, " ");
        const val = typeof v === "object" && v !== null && "value" in v ? v.value : v;
        addDynamicFieldRow(label, val);
        count++;
      }
    }

    if (count === 0) {
      dynamicFieldsContainer.innerHTML = `
        <div style="padding: 24px; text-align: center; color: #94a3b8; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;">
          No extra dynamic fields yet. All standard fields appear in the sections above.<br>
          Any category-specific attributes captured from Meesho will appear here automatically!
        </div>
      `;
    }
  }

  function addDynamicFieldRow(label = "", value = "") {
    const emptyNotice = dynamicFieldsContainer.querySelector("div[style*='text-align: center']");
    if (emptyNotice) dynamicFieldsContainer.innerHTML = "";

    const row = document.createElement("div");
    row.className = "dynamic-field-row";

    row.innerHTML = `
      <input type="text" class="input dyn-key" placeholder="Field Label (e.g. Saree Length, Fabric)" value="${escapeHtml(label)}">
      <input type="text" class="input dyn-val" placeholder="Field Value" value="${escapeHtml(value)}">
      <button class="btn-remove-dyn" title="Remove Field">&times;</button>
    `;

    row.querySelector(".btn-remove-dyn").addEventListener("click", () => {
      row.remove();
    });

    dynamicFieldsContainer.appendChild(row);
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
