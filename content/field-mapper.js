/**
 * Meesho AutoListing Pro - Universal Dynamic Field Mapper
 * Category-agnostic field detection and label extraction.
 * Dynamically discovers ALL standard inputs, textareas, selects,
 * and custom React/AntD/Meesho design system dropdowns across ANY category.
 */

window.MeeshoFieldMapper = (() => {
  /**
   * Normalize text by removing symbols, asterisks, punctuation, and redundant spaces
   */
  function normalizeText(text) {
    if (!text || typeof text !== "string") return "";
    return text
      .replace(/[\*\(\)\[\]\{\}:,;]/g, " ")
      .replace(/ⓘ|ℹ️|\(i\)/gi, " ")
      .replace(/[▼▲\u25BC\u25B2\u2193\u2191✕×\u00d7]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Alphanumeric only (no punctuation, no spaces) for fuzzy matching
   */
  function cleanAlphaNumeric(text) {
    if (!text || typeof text !== "string") return "";
    return text.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  /**
   * Clean human readable label suitable for display in single-page view
   */
  function cleanLabel(rawText) {
    if (!rawText) return "Field";
    return rawText
      .replace(/[\*]/g, "")
      .replace(/ⓘ|ℹ️|\(i\)/gi, "")
      .replace(/optional/gi, "")
      .replace(/^enter\s+/i, "")
      .replace(/^select\s+/i, "")
      .replace(/[▼▲\u25BC\u25B2\u2193✕×\u00d7]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Convert human label to a clean, stable key
   */
  function labelToKey(label) {
    const clean = cleanLabel(label).toLowerCase();
    return clean
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 45) || "field_" + Math.random().toString(36).slice(2, 7);
  }

  /**
   * Detect enclosing section heading (e.g. "Product, Size and Inventory", "Product Details")
   */
  function detectSectionName(element) {
    let current = element;
    while (current && current !== document.body) {
      let prev = current.previousElementSibling;
      while (prev) {
        const heading = prev.matches("h1, h2, h3, h4, h5, [class*='title'], [class*='heading'], [class*='header']")
          ? prev
          : prev.querySelector("h1, h2, h3, h4, h5, [class*='title'], [class*='heading']");

        if (heading && heading.textContent.trim().length > 2 && heading.textContent.trim().length < 60) {
          return cleanLabel(heading.textContent.trim());
        }
        prev = prev.previousElementSibling;
      }
      current = current.parentElement;
    }
    return "General Details";
  }

  /**
   * Extract label text for an element using multiple heuristics
   */
  function extractLabel(element) {
    if (!element) return "";

    // 0. Table column header detection (for Pricing & Inventory table cells)
    const cell = element.closest("td, [role='cell'], [class*='cell' i]");
    if (cell) {
      const row = cell.parentElement;
      const cellIndex = Array.from(row.children).indexOf(cell);
      const table = cell.closest("table, [role='table'], [class*='table' i], [class*='grid' i]");
      if (table && cellIndex >= 0) {
        const headerRow = table.querySelector("thead tr, tr:first-child, [role='row']:first-child, [class*='header' i]");
        const headers = headerRow
          ? Array.from(headerRow.children)
          : Array.from(table.querySelectorAll("th, [role='columnheader']"));
        if (headers[cellIndex]) {
          const headerText = headers[cellIndex].textContent.trim();
          if (headerText && headerText.length >= 2 && headerText.length <= 60) {
            return cleanLabel(headerText);
          }
        }
      }
    }

    // 1. Label by for attribute
    if (element.id && typeof document !== "undefined") {
      try {
        const safeId = (typeof CSS !== "undefined" && CSS.escape) ? CSS.escape(element.id) : element.id.replace(/["\\]/g, "\\$&");
        const labelFor = document.querySelector(`label[for="${safeId}"]`);
        if (labelFor && labelFor.textContent.trim()) {
          return cleanLabel(labelFor.textContent);
        }
      } catch (e) {}
    }

    // 2. Parent / Ancestor <label>
    const parentLabel = element.closest("label");
    if (parentLabel && parentLabel.textContent.trim()) {
      return cleanLabel(parentLabel.textContent);
    }

    // 3. aria-label or placeholder
    if (element.getAttribute("aria-label")) {
      return cleanLabel(element.getAttribute("aria-label"));
    }
    if (element.placeholder && !["select", "enter", "type", "search"].includes(element.placeholder.toLowerCase().trim())) {
      return cleanLabel(element.placeholder);
    }

    // 4. Preceding sibling label (direct)
    let prev = element.previousElementSibling;
    while (prev) {
      const text = prev.textContent.trim();
      if (text && text.length >= 2 && text.length <= 60 && (prev.tagName === "LABEL" || String(prev.className).toLowerCase().includes("label"))) {
        return cleanLabel(text);
      }
      prev = prev.previousElementSibling;
    }

    // 5. Parent's preceding sibling label (typical React form layout: <label>...</label><div input-wrapper><input/></div>)
    if (element.parentElement) {
      let pPrev = element.parentElement.previousElementSibling;
      while (pPrev) {
        const text = pPrev.textContent.trim();
        if (text && text.length >= 2 && text.length <= 60 && (pPrev.tagName === "LABEL" || String(pPrev.className).toLowerCase().includes("label"))) {
          return cleanLabel(text);
        }
        pPrev = pPrev.previousElementSibling;
      }
    }

    // 6. Form row / Grid container label search (scoped strictly to form-group wrappers, NOT generic div)
    const container = element.closest(
      "[class*='formGroup'], [class*='FormGroup'], [class*='form-group'], [class*='form-item'], [class*='form-field'], [class*='field-wrapper'], [class*='control-wrapper']"
    );

    if (container) {
      const candidateLabels = container.querySelectorAll(
        "label, [class*='label']:not([class*='icon']), [class*='Label']:not([class*='Icon'])"
      );

      for (const cl of candidateLabels) {
        if (cl === element || cl.contains(element) || element.contains(cl)) continue;
        const text = cl.textContent.trim();
        if (text && text.length >= 2 && text.length <= 60 && !["select", "save", "submit", "clear", "cancel"].includes(text.toLowerCase())) {
          return cleanLabel(text);
        }
      }
    }

    // 7. Name or ID attribute fallback
    if (element.name) return cleanLabel(element.name);
    if (element.id) return cleanLabel(element.id);

    return "";
  }

  /**
   * Check if an element represents an arrow/dropdown indicator icon (NOT an info ⓘ icon!)
   */
  function isDropdownArrowIcon(el) {
    if (!el) return false;
    const tag = el.tagName ? el.tagName.toLowerCase() : "";
    const cls = String(el.className || "").toLowerCase();
    const aria = String(el.getAttribute("aria-label") || "").toLowerCase();

    // Reject info icons immediately
    if (cls.includes("info") || aria.includes("info") || cls.includes("help") || cls.includes("tooltip")) {
      return false;
    }

    if (cls.includes("arrow") || cls.includes("chevron") || cls.includes("caret") || cls.includes("down") || cls.includes("angle")) {
      return true;
    }

    if (tag === "svg") {
      const dataIcon = String(el.getAttribute("data-icon") || "").toLowerCase();
      if (dataIcon.includes("down") || dataIcon.includes("arrow") || dataIcon.includes("caret")) return true;
    }

    return false;
  }

  /**
   * Checks if an element is a custom React/Meesho dropdown container
   */
  function isCustomDropdown(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return false;

    const role = el.getAttribute("role");
    if (role === "combobox" || role === "listbox") return true;

    const className = String(el.className || "").toLowerCase();
    const isDropdownClass = className.includes("select") ||
                            className.includes("dropdown") ||
                            className.includes("picker") ||
                            className.includes("combobox");

    const text = el.textContent.trim();
    const hasArrow = Array.from(el.querySelectorAll("svg, i, span")).some(isDropdownArrowIcon);
    const isSelectPlaceholder = text.startsWith("Select") || text === "Choose" || text.endsWith("Select");

    if ((isDropdownClass || hasArrow || isSelectPlaceholder) && text.length < 80) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 50 && rect.height > 20 && rect.height < 100) {
        return true;
      }
    }

    return false;
  }

  /**
   * Scan page and return ALL listing fields (inputs, selects, textareas, custom dropdowns)
   */
  function getAllListingFields(root = document) {
    const fields = [];
    const visitedElements = new Set();

    // 1. All standard inputs, textareas, selects
    const standardInputs = Array.from(root.querySelectorAll(
      "input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='file']), textarea, select, [contenteditable='true']"
    ));

    for (const el of standardInputs) {
      if (el.closest("#meesho-autolisting-host") || el.closest(".meesho-autolisting-ignore")) continue;

      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || rect.width === 0 || rect.height === 0) {
        continue;
      }

      visitedElements.add(el);
      const rawLabel = extractLabel(el);
      const humanLabel = rawLabel || el.placeholder || el.name || el.id || "Field";
      const key = labelToKey(humanLabel);
      const section = detectSectionName(el);

      const hasDirectArrow = el.parentElement ? Array.from(el.parentElement.querySelectorAll("svg, i, span")).some(isDropdownArrowIcon) : false;
      const isInputDropdown = el.tagName === "SELECT" ||
        el.getAttribute("role") === "combobox" ||
        el.readOnly ||
        (el.placeholder && el.placeholder.toLowerCase().startsWith("select")) ||
        !!el.closest("[role='combobox'], [class*='select' i]:not([class*='selected']), [class*='dropdown' i], [class*='picker' i]") ||
        hasDirectArrow;

      fields.push({
        element: el,
        isCustomDropdown: false,
        isDropdown: isInputDropdown,
        type: el.tagName === "SELECT" ? "select" : (isInputDropdown ? "dropdown-input" : (el.type || el.tagName.toLowerCase())),
        label: humanLabel,
        key: key,
        section: section
      });
    }

    // 2. Scan for custom React/Meesho dropdowns
    const potentialDropdowns = Array.from(root.querySelectorAll(
      "[role='combobox'], [class*='select' i], [class*='dropdown' i], [class*='Select'], [class*='Dropdown']"
    ));

    for (const el of potentialDropdowns) {
      if (visitedElements.has(el)) continue;
      if (el.closest("#meesho-autolisting-host") || el.closest(".meesho-autolisting-ignore")) continue;

      if (el.querySelector("input, select, textarea")) {
        continue;
      }

      if (isCustomDropdown(el)) {
        visitedElements.add(el);
        const rawLabel = extractLabel(el);
        const humanLabel = rawLabel || "Select Option";
        const key = labelToKey(humanLabel);
        const section = detectSectionName(el);

        fields.push({
          element: el,
          isCustomDropdown: true,
          isDropdown: true,
          type: "custom-select",
          label: humanLabel,
          key: key,
          section: section
        });
      }
    }

    return fields;
  }

  /**
   * Common alias dictionary mapping similar labels / keys
   */
  const FIELD_ALIASES = {
    gst: ["gst_percentage", "gst_rate", "tax"],
    gst_percentage: ["gst", "gst_rate", "tax"],
    hsn_code: ["hsn", "hsn_number", "find_relevant_hsn_code"],
    hsn: ["hsn_code", "hsn_number"],
    net_weight: ["weight", "package_weight", "net_weight_gms", "enter_net_weight_gms", "net_weight_grams"],
    net_weight_gms: ["net_weight", "weight", "net_weight_grams", "enter_net_weight_gms"],
    style_code: ["product_id", "style_code_product_id", "sku", "sku_id", "style_code_product_id_optional"],
    style_code_product_id: ["style_code", "product_id", "sku", "sku_id", "style_code_product_id_optional"],
    product_name: ["title", "catalog_title", "product_title", "name"],
    sizes: ["size", "sizes_available", "size_variation", "free_size"],
    size: ["sizes", "sizes_available", "size_variation", "free_size"],
    free_size: ["size", "sizes", "free_size"],
    copy_price_details_to_all_sizes: ["copy_price", "copy_price_to_all_sizes", "copy_details"],
    size_variation: ["size_variation_optional"],
    meesho_price: ["price", "customer_price", "meesho_price_inr"],
    wrong_return_price: ["wrong_defective_return_price", "wrong_defective_returns_price", "discounted_price", "defective_return_price"],
    wrong_defective_returns_price: ["wrong_return_price", "wrong_defective_return_price", "discounted_price", "defective_return_price"],
    mrp: ["maximum_retail_price", "maximum_retail_price_mrp", "mrp_inr"],
    inventory: ["stock", "qty", "quantity", "available_inventory", "inventory_count"],
    sku_id: ["sku", "style_code", "style_code_product_id", "product_id"],
    care_instructions: ["care", "fabric_care", "wash_care"],
    closure_type: ["closure"],
    color: ["colour", "product_color"],
    filling_material: ["filling"],
    generic_name: ["generic", "item_name"],
    material: ["fabric", "material_fabric"],
    net_quantity: ["quantity", "net_quantity_n", "qty", "pack_of"],
    net_quantity_n: ["net_quantity", "quantity", "pack_of"],
    pattern: ["print", "pattern_type"],
    product_breadth: ["breadth", "width", "item_breadth", "product_width", "item_width"],
    breadth: ["product_breadth", "width", "item_breadth", "product_width", "item_width"],
    width: ["product_breadth", "breadth", "item_breadth", "product_width", "item_width"],
    product_height: ["height", "item_height"],
    height: ["product_height", "item_height"],
    product_length: ["length", "item_length"],
    length: ["product_length", "item_length"],
    product_unit: ["dimension_unit", "dimensions_unit"],
    weight_unit: ["unit_of_weight", "weight_measurement_unit"],
    product_weight: ["item_weight"],
    water_resistance_level: ["water_resistance", "waterproof_level", "water_resistance_level"],
    importer_name: ["enter_importer_name", "importer_details", "importer"],
    importer_address: ["enter_importer_address", "importer_address_details"],
    manufacturer_name: ["enter_manufacturer_name", "manufacturer_details", "manufacturer"],
    manufacturer_address: ["enter_manufacturer_address", "mfg_address", "manufacturer_details"],
    packer_name: ["enter_packer_name", "packer_details", "packer"],
    packer_address: ["enter_packer_address", "packer_details"],
    country_of_origin: ["country", "origin", "origin_country"]
  };

  function getAliases(key) {
    const cleanK = labelToKey(key);
    return FIELD_ALIASES[cleanK] || [];
  }

  const FIELD_DEFINITIONS = [
    // Product, Size and Inventory
    { key: "gst", label: "GST Percentage", category: "Product, Size and Inventory" },
    { key: "hsn_code", label: "HSN Code", category: "Product, Size and Inventory" },
    { key: "net_weight_gms", label: "Net Weight (gms)", category: "Product, Size and Inventory" },
    { key: "style_code", label: "Style Code / Product ID", category: "Product, Size and Inventory" },
    { key: "product_name", label: "Product Name", category: "Product, Size and Inventory" },
    { key: "size", label: "Size", category: "Product, Size and Inventory" },
    { key: "copy_price_details_to_all_sizes", label: "Copy price details to all sizes", category: "Product, Size and Inventory" },

    // Pricing Details
    { key: "meesho_price", label: "Meesho Price (₹)", category: "Pricing Details" },
    { key: "wrong_return_price", label: "Wrong/Defective Return Price (₹)", category: "Pricing Details" },
    { key: "mrp", label: "Maximum Retail Price (MRP ₹)", category: "Pricing Details" },
    { key: "inventory", label: "Inventory", category: "Pricing Details" },
    { key: "sku_id", label: "SKU ID", category: "Pricing Details" },

    // Product Details
    { key: "care_instructions", label: "Care Instructions", category: "Product Details" },
    { key: "closure_type", label: "Closure Type", category: "Product Details" },
    { key: "color", label: "Color", category: "Product Details" },
    { key: "filling_material", label: "Filling Material", category: "Product Details" },
    { key: "generic_name", label: "Generic Name", category: "Product Details" },
    { key: "material", label: "Material / Fabric", category: "Product Details" },
    { key: "net_quantity", label: "Net Quantity (Pack of)", category: "Product Details" },
    { key: "pattern", label: "Pattern / Print", category: "Product Details" },
    { key: "product_length", label: "Product Length", category: "Product Details" },
    { key: "product_breadth", label: "Product Breadth", category: "Product Details" },
    { key: "product_height", label: "Product Height", category: "Product Details" },
    { key: "product_unit", label: "Product Dimension Unit", category: "Product Details" },
    { key: "product_weight", label: "Product Weight", category: "Product Details" },
    { key: "weight_unit", label: "Weight Unit", category: "Product Details" },
    { key: "water_resistance_level", label: "Water Resistance Level", category: "Product Details" },
    { key: "description", label: "Product Description", category: "Product Details" },
    { key: "brand_seller_code", label: "Brand / Seller Code", category: "Product Details" },

    // Manufacturer & Importer Details
    { key: "country_of_origin", label: "Country of Origin", category: "Manufacturer & Importer Details" },
    { key: "manufacturer_name", label: "Manufacturer Name", category: "Manufacturer & Importer Details" },
    { key: "manufacturer_address", label: "Manufacturer Address", category: "Manufacturer & Importer Details" },
    { key: "packer_name", label: "Packer Name", category: "Manufacturer & Importer Details" },
    { key: "packer_address", label: "Packer Address", category: "Manufacturer & Importer Details" },
    { key: "importer_name", label: "Importer Name", category: "Manufacturer & Importer Details" },
    { key: "importer_address", label: "Importer Address", category: "Manufacturer & Importer Details" }
  ];

  /**
   * Identify a given DOM element against custom mappings or standard field definitions
   */
  function identifyField(element, customMappings = {}) {
    if (!element || element.nodeType !== 1) return null;

    // 1. Check customMappings first
    if (customMappings && typeof customMappings === "object") {
      for (const [key, mapping] of Object.entries(customMappings)) {
        if (!mapping) continue;
        if (mapping.id && element.id === mapping.id) {
          return { key, label: mapping.label || cleanLabel(key), category: "Custom Mapping" };
        }
        if (mapping.name && element.name === mapping.name) {
          return { key, label: mapping.label || cleanLabel(key), category: "Custom Mapping" };
        }
        if (mapping.selector) {
          try {
            if (element.matches(mapping.selector)) {
              return { key, label: mapping.label || cleanLabel(key), category: "Custom Mapping" };
            }
          } catch (e) {}
        }
      }
    }

    // 2. Extract label and section
    const rawLabel = extractLabel(element) || element.name || element.id || element.placeholder || "";
    if (!rawLabel) return null;

    const humanLabel = cleanLabel(rawLabel);
    const key = labelToKey(humanLabel);
    const section = detectSectionName(element);

    // 3. Match against FIELD_DEFINITIONS
    const directMatch = FIELD_DEFINITIONS.find(f => f.key === key);
    if (directMatch) {
      return { key: directMatch.key, label: directMatch.label, category: section || directMatch.category };
    }

    // 4. Match against aliases
    const aliases = getAliases(key);
    for (const def of FIELD_DEFINITIONS) {
      if (aliases.includes(def.key)) {
        return { key: def.key, label: def.label, category: section || def.category };
      }
      const defAliases = getAliases(def.key);
      if (defAliases.includes(key)) {
        return { key: def.key, label: def.label, category: section || def.category };
      }
    }

    // 5. Default fallback to detected key & label
    return {
      key: key,
      label: humanLabel,
      category: section || "General Details"
    };
  }

  return {
    normalizeText,
    cleanAlphaNumeric,
    cleanLabel,
    labelToKey,
    extractLabel,
    detectSectionName,
    isCustomDropdown,
    getAllListingFields,
    getAliases,
    identifyField,
    FIELD_DEFINITIONS
  };
})();
