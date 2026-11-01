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
      // Look for a preceding heading or title
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

    // 1. Label by for attribute
    if (element.id) {
      const labelFor = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      if (labelFor && labelFor.textContent.trim()) {
        return cleanLabel(labelFor.textContent);
      }
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

    // 4. Form row / Grid container label search
    // Meesho wraps each label and control in a container or grid cell
    const container = element.closest(
      "[class*='formGroup'], [class*='FormGroup'], [class*='form-group'], [class*='field'], [class*='Field'], [class*='input-wrapper'], [class*='control-wrapper'], [class*='item'], [class*='Item'], [class*='row'], [class*='Row'], div"
    );

    if (container) {
      // Look for sibling label/title elements within the same container
      const candidateLabels = container.querySelectorAll(
        "label, [class*='label'], [class*='Label'], [class*='title'], [class*='Title'], [class*='name'], [class*='Name'], span, p"
      );

      for (const cl of candidateLabels) {
        if (cl === element || cl.contains(element) || element.contains(cl)) continue;
        const text = cl.textContent.trim();
        // A label is typically 2-60 chars and doesn't contain action words
        if (text && text.length >= 2 && text.length <= 60 && !["select", "save", "submit", "clear", "cancel"].includes(text.toLowerCase())) {
          return cleanLabel(text);
        }
      }
    }

    // 5. Preceding sibling
    let prev = element.previousElementSibling;
    while (prev) {
      const text = prev.textContent.trim();
      if (text && text.length >= 2 && text.length <= 60) {
        return cleanLabel(text);
      }
      prev = prev.previousElementSibling;
    }

    // 6. Name or ID attribute fallback
    if (element.name) return cleanLabel(element.name);
    if (element.id) return cleanLabel(element.id);

    return "";
  }

  /**
   * Checks if an element is a custom React/Meesho dropdown container
   */
  function isCustomDropdown(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return false;

    // Check role
    const role = el.getAttribute("role");
    if (role === "combobox" || role === "listbox") return true;

    // Check className tokens
    const className = String(el.className || "").toLowerCase();
    const isDropdownClass = className.includes("select") ||
                            className.includes("dropdown") ||
                            className.includes("picker") ||
                            className.includes("combobox");

    // Check if it has a chevron/arrow icon or "Select" text
    const text = el.textContent.trim();
    const hasArrow = !!el.querySelector("svg, i[class*='arrow'], i[class*='chevron'], [class*='arrow'], [class*='chevron']");
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

      const isInputDropdown = el.tagName === "SELECT" ||
        el.getAttribute("role") === "combobox" ||
        el.readOnly ||
        (el.placeholder && el.placeholder.toLowerCase().startsWith("select")) ||
        !!el.closest("[role='combobox'], [class*='select' i], [class*='dropdown' i], [class*='picker' i]") ||
        !!el.parentElement?.querySelector("svg, i[class*='arrow'], i[class*='chevron'], [class*='arrow'], [class*='chevron']");

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

      // If it contains an already visited input, skip outer wrapper
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
    hsn_code: ["hsn", "hsn_number"],
    net_weight: ["weight", "package_weight", "net_weight_gms", "enter_net_weight_gms"],
    style_code: ["product_id", "style_code_product_id", "sku", "sku_id"],
    product_name: ["title", "catalog_title", "product_title"],
    sizes: ["size", "sizes_available"],
    size: ["sizes", "sizes_available"],
    care_instructions: ["care", "fabric_care", "wash_care"],
    closure_type: ["closure"],
    filling_material: ["filling"],
    generic_name: ["generic", "item_name"],
    material: ["fabric", "material_fabric"],
    net_quantity: ["quantity", "net_quantity_n", "qty", "pack_of"],
    net_quantity_n: ["net_quantity", "quantity", "pack_of"],
    product_unit: ["unit", "dimension_unit"],
    importer_name: ["enter_importer_name", "importer_details", "importer"],
    manufacturer_name: ["enter_manufacturer_name", "manufacturer_details", "manufacturer"]
  };

  function getAliases(key) {
    const cleanK = labelToKey(key);
    return FIELD_ALIASES[cleanK] || [];
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
    getAliases
  };
})();
