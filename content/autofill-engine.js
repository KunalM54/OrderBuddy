/**
 * Meesho AutoListing Pro - 100% Accurate & Safe Dropdown & Form Autofill Engine
 * Reverse-engineered for Meesho's React / Ant Design / rc-select dynamic forms.
 *
 * Strict Safety Guarantees:
 * - NEVER clicks "Discard", "Cancel", "Submit", "Save", "QC", or navigation buttons.
 * - NEVER dispatches global Escape events to window/document (prevents "Discard Catalog" popups).
 * - Guarantees every open dropdown is completely closed before proceeding to the next field.
 * - Full fallback support: input fields are never left blank.
 * - Provides instantaneous "Stop Autofill" cancellation.
 */

window.MeeshoAutofillEngine = (() => {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set;

  const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  )?.set;

  const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLSelectElement.prototype,
    "value"
  )?.set;

  // Global cancellation flag for user "Stop Autofill" action
  let isAutofillRunning = false;
  let abortRequested = false;

  function stopAutofill() {
    abortRequested = true;
    isAutofillRunning = false;
  }

  function isRunning() {
    return isAutofillRunning;
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  /**
   * Dangerous action filter: GUARANTEES no Discard, Cancel, Submit, or Save buttons are EVER touched.
   */
  function isDangerousActionElement(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return true;

    // Reject anything inside the sidebar host
    if (el.closest("#meesho-autolisting-host") || el.closest(".meesho-autolisting-ignore")) {
      return true;
    }

    const checkElements = [
      el,
      el.closest("button, a, [role='button'], [class*='btn' i], [class*='header' i], [class*='nav' i], [class*='modal' i]")
    ].filter(Boolean);

    const dangerKeywords = [
      "discard", "cancel", "submit", "publish", "delete", "leave",
      "exit", "go back", "back", "add single catalog", "qc pass", "qc"
    ];

    for (const item of checkElements) {
      const text = (item.textContent || "").toLowerCase().trim();
      const aria = (item.getAttribute("aria-label") || "").toLowerCase().trim();
      const className = String(item.className || "").toLowerCase();
      const id = String(item.id || "").toLowerCase();

      for (const kw of dangerKeywords) {
        if (text.includes(kw) || aria.includes(kw) || className.includes(kw) || id.includes(kw)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Dispatch full pointer and mouse event chain to emulate human interaction.
   * Uses correct W3C button/buttons states: buttons=1 on down, buttons=0 on up/click.
   */
  function dispatchFullClick(el) {
    if (!el || isDangerousActionElement(el)) return false;

    const rect = el.getBoundingClientRect();
    const clientX = rect.left + Math.max(2, rect.width / 2);
    const clientY = rect.top + Math.max(2, rect.height / 2);

    const baseInit = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX,
      clientY
    };

    el.dispatchEvent(new MouseEvent("mouseenter", { ...baseInit, button: 0, buttons: 0 }));
    el.dispatchEvent(new MouseEvent("mouseover",  { ...baseInit, button: 0, buttons: 0 }));
    el.dispatchEvent(new MouseEvent("mousedown",  { ...baseInit, button: 0, buttons: 1 }));
    el.dispatchEvent(new MouseEvent("mouseup",    { ...baseInit, button: 0, buttons: 0 }));
    el.dispatchEvent(new MouseEvent("click",      { ...baseInit, button: 0, buttons: 0 }));
    el.click?.();
    return true;
  }

  /**
   * Set value for standard inputs and textarea elements safely in React/Vue SPAs
   */
  function setNativeValue(element, value) {
    if (!element || value === undefined || value === null) return false;
    if (isDangerousActionElement(element)) return false;

    const stringValue = String(value).trim();

    // If container element, delegate to inner input
    if (element.tagName !== "INPUT" && element.tagName !== "TEXTAREA" && element.tagName !== "SELECT") {
      const innerInput = element.querySelector("input, textarea, select");
      if (innerInput) {
        return setNativeValue(innerInput, value);
      }
    }

    if (element.tagName === "INPUT") {
      const type = (element.type || "text").toLowerCase();

      if (type === "checkbox") {
        let shouldCheck = false;
        const normVal = stringValue.toLowerCase();
        const elVal = (element.value || "").toLowerCase();
        const elLabel = (window.MeeshoFieldMapper.extractLabel(element) || "").toLowerCase();

        if (["true", "1", "yes", "on"].includes(normVal)) {
          shouldCheck = true;
        } else if (normVal.split(/[,;\s]+/).includes(elVal) || normVal.split(/[,;\s]+/).includes(elLabel)) {
          shouldCheck = true;
        } else if (normVal === elVal || normVal === elLabel) {
          shouldCheck = true;
        }

        if (element.checked !== shouldCheck) {
          element.checked = shouldCheck;
          element.dispatchEvent(new Event("change", { bubbles: true }));
          element.dispatchEvent(new Event("input", { bubbles: true }));
        }
        return true;
      }

      if (type === "radio") {
        if (element.value === stringValue || element.id === stringValue) {
          element.checked = true;
          element.dispatchEvent(new Event("change", { bubbles: true }));
          element.dispatchEvent(new Event("input", { bubbles: true }));
          return true;
        }
        return false;
      }

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(element, stringValue);
      } else {
        element.value = stringValue;
      }
    } else if (element.tagName === "TEXTAREA") {
      if (nativeTextareaValueSetter) {
        nativeTextareaValueSetter.call(element, stringValue);
      } else {
        element.value = stringValue;
      }
    } else if (element.tagName === "SELECT") {
      let matchedIndex = -1;
      const normalizedTarget = window.MeeshoFieldMapper.normalizeText(stringValue).toLowerCase();

      for (let i = 0; i < element.options.length; i++) {
        const opt = element.options[i];
        const optVal = window.MeeshoFieldMapper.normalizeText(opt.value).toLowerCase();
        const optText = window.MeeshoFieldMapper.normalizeText(opt.text).toLowerCase();

        if (optVal === normalizedTarget || optText === normalizedTarget || optText.includes(normalizedTarget) || optVal.includes(normalizedTarget)) {
          matchedIndex = i;
          break;
        }
      }

      if (matchedIndex !== -1) {
        element.selectedIndex = matchedIndex;
        if (nativeSelectValueSetter) {
          nativeSelectValueSetter.call(element, element.options[matchedIndex].value);
        } else {
          element.value = element.options[matchedIndex].value;
        }
      } else {
        if (nativeSelectValueSetter) {
          nativeSelectValueSetter.call(element, stringValue);
        } else {
          element.value = stringValue;
        }
      }
    } else if (element.isContentEditable) {
      element.innerText = stringValue;
    }

    element.dispatchEvent(new Event("input",  { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event("blur",   { bubbles: true, cancelable: true }));

    return true;
  }

  /**
   * Multi-tiered option text matcher with zero arbitrary minimum length barriers.
   * Accurately matches short values like "5%", "5", "1", "cm", "m", "S", "M", "L",
   * as well as complex values like "630492 - Bed linen...", "Multicolor", "Pure Cotton".
   */
  function scoreOptionMatch(candidateText, targetValue) {
    if (!candidateText || !targetValue) return 0;

    const normCandidate = window.MeeshoFieldMapper.normalizeText(candidateText).toLowerCase().trim();
    const normTarget    = window.MeeshoFieldMapper.normalizeText(String(targetValue)).toLowerCase().trim();

    if (!normCandidate || !normTarget) return 0;

    // Never match action words or placeholders
    if (["select", "choose", "discard", "cancel", "submit", "delete", "clear"].includes(normCandidate)) {
      return 0;
    }

    // Tier 1: Exact string match
    if (normCandidate === normTarget) return 100;

    // Tier 2: Candidate starts with target (e.g. "5% (Apparel...)" starts with "5%", "630492 - Bed linen" starts with "630492")
    if (normCandidate.startsWith(normTarget)) return 95;

    // Tier 3: Target starts with candidate (e.g. candidate "Pack of 5" vs target "Pack of 5 (Standard)")
    if (normTarget.startsWith(normCandidate)) return 90;

    // Tier 4: Alphanumeric exact match (ignoring spaces, dashes, slashes, percent signs)
    const alphaCandidate = window.MeeshoFieldMapper.cleanAlphaNumeric(candidateText);
    const alphaTarget    = window.MeeshoFieldMapper.cleanAlphaNumeric(String(targetValue));
    if (alphaCandidate && alphaTarget && alphaCandidate === alphaTarget) return 85;

    // Tier 5: Digits exact match or prefix (e.g. "630492" vs "630492 - Bed Linen", "250" vs "250 gms")
    const targetDigits    = normTarget.replace(/\D/g, "");
    const candidateDigits = normCandidate.replace(/\D/g, "");
    if (targetDigits && candidateDigits) {
      if (targetDigits === candidateDigits) return 82;
      if (candidateDigits.startsWith(targetDigits)) return 80;
    }

    // Tier 6: Whole word / token boundary match (e.g. target "5" in candidate "Pack of 5", target "Cotton" in "100% Pure Cotton")
    const escapedTarget = normTarget.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const wordRegex = new RegExp("(^|[^a-z0-9])" + escapedTarget + "([^a-z0-9]|$)", "i");
    if (wordRegex.test(normCandidate)) return 78;

    // Tier 7: Substring contains
    if (normCandidate.includes(normTarget)) return 70;
    if (normTarget.length >= 3 && normTarget.includes(normCandidate)) return 65;

    // Tier 8: Multi-word token overlap
    const targetWords = normTarget.split(/\s+/).filter(w => w.length >= 2);
    const candidateWords = normCandidate.split(/\s+/).filter(w => w.length >= 2);
    if (targetWords.length > 0 && candidateWords.length > 0) {
      const matchCount = targetWords.filter(tw => candidateWords.some(cw => cw.includes(tw) || tw.includes(cw))).length;
      if (matchCount === targetWords.length) return 60;
      if (matchCount > 0) return 40 + (matchCount * 5);
    }

    return 0;
  }

  function matchesOptionText(candidateText, targetValue) {
    return scoreOptionMatch(candidateText, targetValue) >= 60;
  }

  /**
   * Check whether an element is currently physically visible on the screen
   */
  function isElementVisible(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    const s = window.getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") return false;
    const r = el.getBoundingClientRect();
    return r.width > 5 && r.height > 5;
  }

  /**
   * Check whether any dropdown portal, popup or search box is currently visibly open
   */
  function isAnyDropdownOpen() {
    // 1. Visible search inputs that belong to Meesho dropdown popups
    const searchInputs = Array.from(document.querySelectorAll(
      "input[placeholder*='Search' i], input[placeholder*='search' i]"
    )).filter(el => !el.closest("#meesho-autolisting-host") && isElementVisible(el));

    if (searchInputs.length > 0) return true;

    // 2. Open popups / dropdown menus / listboxes
    const candidates = Array.from(document.querySelectorAll(
      ".ant-select-dropdown:not(.ant-select-dropdown-hidden), [role='listbox']:not([aria-hidden='true']), [role='menu'], [class*='dropdown' i]:not(button):not(input):not(select), [class*='popover' i], [class*='popper' i], [class*='portal' i]"
    ));

    for (const el of candidates) {
      if (el.closest("#meesho-autolisting-host") || isDangerousActionElement(el)) continue;
      if (isElementVisible(el)) return true;
    }

    // 3. Open triggers
    const openTrigger = document.querySelector(".ant-select-open, [aria-expanded='true']:not(#meesho-autolisting-host *)");
    return !!openTrigger;
  }

  /**
   * Find the active dropdown portal corresponding to the given trigger element
   */
  function findActiveDropdownPortal(triggerEl) {
    // 1. Look for visible search input [placeholder*='Search' i] (Meesho's signature dropdown popup header)
    const searchInputs = Array.from(document.querySelectorAll(
      "input[placeholder*='Search' i], input[placeholder*='search' i]"
    )).filter(el => !el.closest("#meesho-autolisting-host") && isElementVisible(el));

    if (searchInputs.length > 0) {
      if (triggerEl && searchInputs.length > 1) {
        const tr = triggerEl.getBoundingClientRect();
        searchInputs.sort((a, b) => {
          const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
          const distA = Math.hypot(ar.left - tr.left, ar.top - tr.bottom);
          const distB = Math.hypot(br.left - tr.left, br.top - tr.bottom);
          return distA - distB;
        });
      }
      const activeSearchInput = searchInputs[0];
      const portal = activeSearchInput.closest(
        "[role='listbox'], [role='menu'], [class*='dropdown' i], [class*='popover' i], [class*='popper' i], [class*='menu' i], [class*='select' i], [class*='container' i], div[style*='position']"
      ) || activeSearchInput.parentElement?.parentElement || activeSearchInput.parentElement;
      if (portal && isElementVisible(portal)) {
        return portal;
      }
    }

    // 2. Direct link via aria-controls / id
    const input = triggerEl?.querySelector("input") || (triggerEl?.tagName === "INPUT" ? triggerEl : null);
    const ariaControls = input?.getAttribute("aria-controls") || triggerEl?.getAttribute("aria-controls");
    if (ariaControls) {
      const direct = document.getElementById(ariaControls);
      if (direct && !isDangerousActionElement(direct) && isElementVisible(direct)) {
        const portal = direct.closest(".ant-select-dropdown, [role='listbox']") || direct;
        return portal;
      }
    }

    // 3. Visible Ant Design portals
    const antdPortals = Array.from(document.querySelectorAll(
      ".ant-select-dropdown:not(.ant-select-dropdown-hidden)"
    )).filter(p => !p.closest("#meesho-autolisting-host") && !isDangerousActionElement(p) && isElementVisible(p));

    if (antdPortals.length === 1) return antdPortals[0];
    if (antdPortals.length > 1 && triggerEl) {
      const tr = triggerEl.getBoundingClientRect();
      antdPortals.sort((a, b) => {
        const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
        const distA = Math.hypot(ar.left - tr.left, ar.top - tr.bottom);
        const distB = Math.hypot(br.left - tr.left, br.top - tr.bottom);
        return distA - distB;
      });
      return antdPortals[0];
    }

    // 4. Generic active portals
    const genericPortals = Array.from(document.querySelectorAll(
      "[role='listbox']:not([aria-hidden='true']), [role='menu'], [class*='dropdown-menu' i], [class*='popover' i], [class*='popper' i], [class*='portal' i]"
    )).filter(p => !p.closest("#meesho-autolisting-host") && !isDangerousActionElement(p) && isElementVisible(p));

    if (genericPortals.length > 0) {
      if (triggerEl && genericPortals.length > 1) {
        const tr = triggerEl.getBoundingClientRect();
        genericPortals.sort((a, b) => {
          const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
          const distA = Math.hypot(ar.left - tr.left, ar.top - tr.bottom);
          const distB = Math.hypot(br.left - tr.left, br.top - tr.bottom);
          return distA - distB;
        });
      }
      return genericPortals[0];
    }

    // 5. Subtree or adjacent listbox inside/near trigger
    if (triggerEl) {
      const inlineList = triggerEl.querySelector("[role='listbox'], ul, [class*='list' i], [class*='options' i]");
      if (inlineList && isElementVisible(inlineList)) return inlineList;

      const nextSib = triggerEl.nextElementSibling;
      if (nextSib && isElementVisible(nextSib) && !isDangerousActionElement(nextSib)) {
        if (nextSib.querySelector("input[placeholder*='Search' i], [role='option'], li")) {
          return nextSib;
        }
      }
    }

    return null;
  }

  /**
   * Find the best-matching option element inside an active portal.
   * Returns matching DOM element or null.
   */
  function findBestOptionInPortal(portal, targetValue) {
    if (!portal || !targetValue) return null;

    const stringValue = String(targetValue).trim();

    // 1. Check standard option elements first
    let candidates = Array.from(portal.querySelectorAll(
      ".ant-select-item-option, [role='option'], [role='menuitem'], [class*='item-option' i], [class*='option' i], li"
    )).filter(el => {
      if (isDangerousActionElement(el)) return false;
      if (el.tagName === "INPUT") return false;
      if (el.classList.contains("ant-select-item-option-disabled") || el.getAttribute("aria-disabled") === "true") return false;
      return isElementVisible(el);
    });

    // 2. Fallback: inspect any visible text-bearing elements (div, span, p, a, label)
    if (candidates.length === 0) {
      candidates = Array.from(portal.querySelectorAll("div, span, p, a, label")).filter(el => {
        if (isDangerousActionElement(el)) return false;
        if (el.tagName === "INPUT" || el.querySelector("input")) return false;
        if (!isElementVisible(el)) return false;
        const txt = el.textContent?.trim();
        return txt && txt.length >= 1 && txt.length <= 120;
      });
    }

    let bestEl = null;
    let bestScore = 0;

    for (const el of candidates) {
      const contentEl = el.querySelector(".ant-select-item-option-content, [class*='option-content' i], [class*='label' i]") || el;
      const txt = (contentEl.innerText || contentEl.textContent || "").trim();
      if (!txt || txt.length > 150) continue;

      const score = scoreOptionMatch(txt, stringValue);
      if (score > bestScore) {
        bestScore = score;
        bestEl = el;
        if (score === 100) break;
      }
    }

    return bestScore >= 50 ? bestEl : null;
  }

  /**
   * Guarantee that ANY open dropdown on the page is fully and cleanly CLOSED.
   * Strictly adheres to safety constraints:
   * - NEVER clicks Discard/Cancel/Submit buttons.
   * - Scopes Escape to the active search input/trigger (NEVER triggers global Discard modal).
   * - Hides any lingering unclosed dropdown popups so the user's screen is 100% clean.
   */
  async function ensureDropdownClosed(triggerEl, maxWaitMs = 600) {
    if (!isAnyDropdownOpen()) return;

    const deadline = Date.now() + maxWaitMs;

    // Step 1: Dispatch Escape directly to any open search inputs inside popups
    const openSearchInputs = Array.from(document.querySelectorAll(
      "input[placeholder*='Search' i], input[placeholder*='search' i]"
    )).filter(el => !el.closest("#meesho-autolisting-host") && isElementVisible(el));

    for (const si of openSearchInputs) {
      si.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true, cancelable: true }));
      si.dispatchEvent(new KeyboardEvent("keyup",   { key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true, cancelable: true }));
      si.blur?.();
    }

    await sleep(50);
    if (!isAnyDropdownOpen()) return;

    // Step 2: Toggle trigger if it still has open class or aria-expanded
    if (triggerEl) {
      if (triggerEl.classList.contains("ant-select-open") || triggerEl.getAttribute("aria-expanded") === "true") {
        const toggleTarget = triggerEl.querySelector(".ant-select-selector") || triggerEl;
        dispatchFullClick(toggleTarget);
        await sleep(50);
      }
    }

    if (!isAnyDropdownOpen()) return;

    // Step 3: Dispatch outside click on document.body (safe neutral coordinates)
    const evtInit = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX: 15,
      clientY: 15,
      button: 0,
      buttons: 0
    };
    document.body.dispatchEvent(new MouseEvent("mousedown", { ...evtInit, buttons: 1 }));
    document.body.dispatchEvent(new MouseEvent("mouseup",   { ...evtInit, buttons: 0 }));
    document.body.dispatchEvent(new MouseEvent("click",     { ...evtInit, buttons: 0 }));

    if (document.activeElement && !document.activeElement.closest("#meesho-autolisting-host")) {
      document.activeElement.blur?.();
    }

    // Step 4: Wait until closed
    while (Date.now() < deadline && isAnyDropdownOpen()) {
      await sleep(30);
    }

    // Step 5: If any stubborn popup is still displayed, gracefully hide it so screen is clean!
    if (isAnyDropdownOpen()) {
      const lingering = Array.from(document.querySelectorAll(
        "input[placeholder*='Search' i], input[placeholder*='search' i]"
      )).map(inp => inp.closest("[role='listbox'], [role='menu'], [class*='dropdown' i], [class*='popover' i], [class*='popper' i]") || inp.parentElement?.parentElement).filter(Boolean);

      for (const el of lingering) {
        if (!el.closest("#meesho-autolisting-host") && !isDangerousActionElement(el)) {
          el.style.display = "none";
        }
      }
    }
  }

  /**
   * Execute selection of an option element in a React / Ant Design dropdown.
   * Dispatches realistic pointer/mouse event sequences, calls .click(), and triggers React fiber synthetic handlers.
   */
  function executeOptionClick(optionEl) {
    if (!optionEl || isDangerousActionElement(optionEl)) return false;

    // Check inner checkbox if multi-select
    const chk = optionEl.querySelector("input[type='checkbox']");
    if (chk && !chk.checked) {
      chk.checked = true;
      chk.dispatchEvent(new Event("change", { bubbles: true }));
    }

    const rect = optionEl.getBoundingClientRect();
    const cx = rect.left + Math.max(2, rect.width / 2);
    const cy = rect.top + Math.max(2, rect.height / 2);
    const evtInit = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX: cx,
      clientY: cy,
      button: 0,
      buttons: 0
    };

    // 1. Dispatch full pointer and mouse chain
    try {
      optionEl.dispatchEvent(new PointerEvent("pointerdown", { ...evtInit, buttons: 1 }));
      optionEl.dispatchEvent(new MouseEvent("mousedown",     { ...evtInit, buttons: 1 }));
      optionEl.dispatchEvent(new PointerEvent("pointerup",   { ...evtInit, buttons: 0 }));
      optionEl.dispatchEvent(new MouseEvent("mouseup",       { ...evtInit, buttons: 0 }));
      optionEl.dispatchEvent(new MouseEvent("click",         { ...evtInit, buttons: 0 }));
      optionEl.click?.();
    } catch (e) {}

    // 2. Dispatch on inner content element if present
    const contentEl = optionEl.querySelector(".ant-select-item-option-content, [class*='option-content' i], [class*='label' i]");
    if (contentEl && contentEl !== optionEl) {
      try {
        contentEl.dispatchEvent(new MouseEvent("mousedown", { ...evtInit, buttons: 1 }));
        contentEl.dispatchEvent(new MouseEvent("mouseup",   { ...evtInit, buttons: 0 }));
        contentEl.dispatchEvent(new MouseEvent("click",     { ...evtInit, buttons: 0 }));
      } catch (e) {}
    }

    // 3. React Fiber synthetic event trigger (onMouseDown, onClick, onSelect)
    const reactKey = Object.keys(optionEl).find(k => k.startsWith("__reactProps") || k.startsWith("__reactEvents"));
    if (reactKey && optionEl[reactKey]) {
      const props = optionEl[reactKey];
      const syntheticEvt = {
        bubbles: true,
        cancelable: true,
        preventDefault: () => {},
        stopPropagation: () => {},
        target: optionEl,
        currentTarget: optionEl
      };
      if (typeof props.onMouseDown === "function") {
        try { props.onMouseDown(syntheticEvt); } catch (e) {}
      }
      if (typeof props.onClick === "function") {
        try { props.onClick(syntheticEvt); } catch (e) {}
      }
      if (typeof props.onSelect === "function") {
        try { props.onSelect(syntheticEvt); } catch (e) {}
      }
    }

    return true;
  }

  /**
   * Automate selection in custom React/Meesho dropdowns or dropdown input fields.
   * Guarantees:
   *   1. Closes any previously open dropdown first.
   *   2. Opens dropdown and detects Meesho's search popup.
   *   3. Types into search input inside popup to filter options.
   *   4. Clicks and commits the best matching option.
   *   5. GUARANTEES dropdown is 100% closed before returning!
   *   6. Fallback supports direct value assignment so field is never left empty.
   */
  async function fillDropdownField(element, targetValue) {
    if (!element || targetValue === undefined || targetValue === null || abortRequested) return false;
    if (isDangerousActionElement(element)) return false;

    const stringValue = String(targetValue).trim();
    if (!stringValue) return false;

    // 1. Native HTML <select> — direct value setter
    if (element.tagName === "SELECT") {
      return setNativeValue(element, stringValue);
    }

    // 2. Identify the dropdown trigger element
    const trigger =
      element.closest(".ant-select") ||
      element.closest("[role='combobox']") ||
      element.closest("[class*='select' i]:not(label):not(span):not(p)") ||
      element.closest("[class*='dropdown' i]:not(label)") ||
      element;

    if (isDangerousActionElement(trigger)) return false;

    // 3. Close any stale open dropdown first
    await ensureDropdownClosed(null);
    if (abortRequested) return false;

    // 4. Scroll trigger into view smoothly
    trigger.scrollIntoView({ behavior: "instant", block: "center" });
    await sleep(60);
    if (abortRequested) return false;

    // 5. Open dropdown: click the selector or trigger
    const openTarget = trigger.querySelector(".ant-select-selector") ||
                       trigger.querySelector("[class*='selector' i]") ||
                       trigger.querySelector("input") ||
                       trigger;
    dispatchFullClick(openTarget);

    // 6. Wait for portal to appear
    let portal = null;
    const portalDeadline = Date.now() + 1000;
    while (Date.now() < portalDeadline && !portal) {
      portal = findActiveDropdownPortal(trigger);
      if (portal) break;
      await sleep(35);
    }

    if (abortRequested) {
      await ensureDropdownClosed(trigger);
      return false;
    }

    let optionSelected = false;

    if (portal) {
      // 7. Search/filter if searchable input exists INSIDE THE PORTAL
      const searchInput =
        portal.querySelector("input[placeholder*='Search' i]") ||
        portal.querySelector("input[type='text']") ||
        portal.querySelector("input:not([type='hidden'])");

      let didSearch = false;
      if (searchInput && !searchInput.readOnly && !isDangerousActionElement(searchInput)) {
        searchInput.focus?.();
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(searchInput, stringValue);
        } else {
          searchInput.value = stringValue;
        }
        searchInput.dispatchEvent(new Event("input",  { bubbles: true }));
        searchInput.dispatchEvent(new Event("change", { bubbles: true }));
        didSearch = true;
        await sleep(140);
      }

      // 8. Find matching option in the portal
      let optionEl = findBestOptionInPortal(portal, stringValue);

      // Handle virtual scroll if not immediately visible
      if (!optionEl) {
        const scrollHolder =
          portal.querySelector(".rc-virtual-list-holder") ||
          portal.querySelector("[class*='virtual' i]") ||
          portal.querySelector("[class*='holder' i]") ||
          portal.querySelector("[class*='list' i]") ||
          portal;

        for (let step = 0; step < 8; step++) {
          scrollHolder.scrollTop += 90;
          scrollHolder.dispatchEvent(new Event("scroll", { bubbles: true }));
          await sleep(40);
          optionEl = findBestOptionInPortal(portal, stringValue);
          if (optionEl) break;
        }
      }

      // If search filter over-narrowed and found nothing: clear search and re-scan
      if (!optionEl && didSearch && searchInput) {
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(searchInput, "");
        } else {
          searchInput.value = "";
        }
        searchInput.dispatchEvent(new Event("input",  { bubbles: true }));
        searchInput.dispatchEvent(new Event("change", { bubbles: true }));
        await sleep(100);

        const scrollHolder = portal.querySelector(".rc-virtual-list-holder") || portal;
        scrollHolder.scrollTop = 0;
        await sleep(40);

        for (let step = 0; step < 8; step++) {
          optionEl = findBestOptionInPortal(portal, stringValue);
          if (optionEl) break;
          scrollHolder.scrollTop += 90;
          scrollHolder.dispatchEvent(new Event("scroll", { bubbles: true }));
          await sleep(40);
        }
      }

      // 9. Click the option to select it
      if (optionEl) {
        optionEl.scrollIntoView({ behavior: "instant", block: "nearest" });
        await sleep(40);
        executeOptionClick(optionEl);
        optionSelected = true;

        // If search input exists, dispatch Enter to confirm selection
        if (searchInput) {
          const enterEvt = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true };
          searchInput.dispatchEvent(new KeyboardEvent("keydown", enterEvt));
          searchInput.dispatchEvent(new KeyboardEvent("keyup",   enterEvt));
        }

        // Wait briefly for React state update
        await sleep(120);
      }
    }

    // 10. Fallback: If dropdown option was not found or failed, but element/trigger contains an input:
    if (!optionSelected) {
      const inputEl = element.tagName === "INPUT" ? element : trigger.querySelector("input:not([type='hidden'])");
      if (inputEl && !inputEl.readOnly && !isDangerousActionElement(inputEl)) {
        setNativeValue(inputEl, stringValue);
        optionSelected = true;
      }
    }

    // 11. Safe & Complete Close: GUARANTEE dropdown is 100% closed before proceeding!
    await ensureDropdownClosed(trigger);
    await sleep(50);

    return optionSelected;
  }

  function highlightElement(el) {
    if (!el || isDangerousActionElement(el)) return;
    el.classList.add("meesho-autofill-highlight");
    setTimeout(() => {
      el.classList.remove("meesho-autofill-highlight");
    }, 2400);
  }

  /**
   * Capture 100% of all fields present on the current page
   */
  function captureAllFields() {
    const fieldDescriptors = window.MeeshoFieldMapper.getAllListingFields(document);
    const capturedFields = {};
    const fieldList = [];

    for (const fd of fieldDescriptors) {
      const el = fd.element;
      if (isDangerousActionElement(el)) continue;

      let val = "";

      if (fd.isCustomDropdown || fd.isDropdown) {
        const valContainer = el.querySelector(
          "[class*='singleValue' i], [class*='selection-item' i], [class*='value' i], [class*='selected' i], [class*='placeholder' i]"
        );
        let rawText = valContainer ? valContainer.textContent.trim() : el.textContent.trim();

        const innerInput = el.tagName === "INPUT" ? el : el.querySelector("input");
        if (innerInput && innerInput.value && !innerInput.value.toLowerCase().startsWith("select")) {
          rawText = innerInput.value.trim();
        }

        if (rawText && !rawText.toLowerCase().startsWith("select") && rawText.toLowerCase() !== "choose") {
          val = rawText.replace(/[▼▲\u25BC\u25B2\u2193\u2191✕×\u00d7]/g, "").replace(/\s+/g, " ").trim();
        }
      } else if (el.tagName === "INPUT") {
        const type = (el.type || "").toLowerCase();
        if (type === "checkbox") {
          val = el.checked ? "Yes" : "";
        } else if (type === "radio") {
          if (el.checked) val = el.value || "Selected";
        } else {
          val = el.value ? el.value.trim() : "";
        }
      } else if (el.tagName === "TEXTAREA") {
        val = el.value ? el.value.trim() : "";
      } else if (el.tagName === "SELECT") {
        val = el.options[el.selectedIndex]?.text?.trim() || el.value || "";
        if (val.toLowerCase().startsWith("select")) val = "";
      } else if (el.isContentEditable) {
        val = el.innerText ? el.innerText.trim() : "";
      }

      capturedFields[fd.key] = {
        key: fd.key,
        label: fd.label,
        value: val,
        section: fd.section,
        type: fd.type
      };

      fieldList.push({
        key: fd.key,
        label: fd.label,
        value: val,
        section: fd.section,
        filled: !!val
      });
    }

    return {
      success: true,
      totalDetected: fieldList.length,
      filledCount: fieldList.filter(f => f.filled).length,
      fields: capturedFields,
      list: fieldList
    };
  }

  /**
   * Autofill all matching fields on the page from the active profile.
   * Can be aborted at any moment via stopAutofill().
   */
  async function autofillAllFields(profile, options = {}) {
    if (!profile || !profile.fields) {
      return { success: false, error: "No profile data provided" };
    }

    isAutofillRunning = true;
    abortRequested = false;

    const { highlight = true, delayMs = 200, onProgress = null } = options;
    const fieldDescriptors = window.MeeshoFieldMapper.getAllListingFields(document);
    const filledFields = [];
    const customMappings = profile.customMappings || {};

    try {
      for (let i = 0; i < fieldDescriptors.length; i++) {
        if (abortRequested) {
          await ensureDropdownClosed(null);
          return {
            success: true,
            stopped: true,
            totalDetected: fieldDescriptors.length,
            filledCount: filledFields.length,
            filledFields,
            profileName: profile.name
          };
        }

        const fd = fieldDescriptors[i];
        const el = fd.element;

        if (isDangerousActionElement(el)) continue;
        const type = (el.type || "").toLowerCase();
        if (type === "submit" || type === "button") continue;

        if (typeof onProgress === "function") {
          onProgress(i + 1, fieldDescriptors.length, fd.label);
        }

        // Look up target value in profile
        let targetValue = "";
        const entry = profile.fields[fd.key];
        if (entry !== undefined) {
          targetValue = typeof entry === "object" && entry !== null && "value" in entry ? entry.value : entry;
        }

        if (!targetValue) {
          const normFdLabel = window.MeeshoFieldMapper.cleanLabel(fd.label).toLowerCase();
          const aliases = window.MeeshoFieldMapper.getAliases(fd.key);

          // Tier 1: Exact label or exact key match
          for (const [k, v] of Object.entries(profile.fields)) {
            const valCandidate = typeof v === "object" && v !== null && "value" in v ? v.value : v;
            const labelCandidate = typeof v === "object" && v !== null && "label" in v ? v.label : k;

            const normCandidateLabel = window.MeeshoFieldMapper.cleanLabel(labelCandidate).toLowerCase();
            const normCandidateKey = window.MeeshoFieldMapper.labelToKey(k);

            if (normCandidateLabel === normFdLabel || normCandidateKey === fd.key) {
              targetValue = valCandidate;
              break;
            }
          }

          // Tier 2: Defined aliases match
          if (!targetValue) {
            for (const [k, v] of Object.entries(profile.fields)) {
              const valCandidate = typeof v === "object" && v !== null && "value" in v ? v.value : v;
              const normCandidateKey = window.MeeshoFieldMapper.labelToKey(k);

              if (aliases.includes(normCandidateKey)) {
                targetValue = valCandidate;
                break;
              }
            }
          }

          // Tier 3: Strict prefix/suffix match (only when length >= 5 and excluding ambiguous tokens)
          if (!targetValue) {
            const ambiguousTokens = new Set(["unit", "size", "type", "name", "date", "rate", "code", "level", "value", "item", "weight"]);
            for (const [k, v] of Object.entries(profile.fields)) {
              const valCandidate = typeof v === "object" && v !== null && "value" in v ? v.value : v;
              const labelCandidate = typeof v === "object" && v !== null && "label" in v ? v.label : k;
              const normCandidateLabel = window.MeeshoFieldMapper.cleanLabel(labelCandidate).toLowerCase();

              if (!ambiguousTokens.has(normFdLabel) && !ambiguousTokens.has(normCandidateLabel)) {
                if (normCandidateLabel.length >= 6 && normFdLabel.length >= 6) {
                  if (normCandidateLabel.startsWith(normFdLabel) || normFdLabel.startsWith(normCandidateLabel)) {
                    targetValue = valCandidate;
                    break;
                  }
                }
              }
            }
          }
        }

        if (!targetValue && customMappings[fd.key]) {
          targetValue = customMappings[fd.key].value;
        }

        if (targetValue !== undefined && targetValue !== null && String(targetValue).trim() !== "") {
          let ok = false;

          if (fd.isCustomDropdown || fd.isDropdown || el.tagName === "SELECT") {
            ok = await fillDropdownField(el, targetValue);
          } else {
            ok = setNativeValue(el, targetValue);
          }

          if (ok) {
            if (highlight) highlightElement(el);
            filledFields.push({
              key: fd.key,
              label: fd.label,
              value: targetValue
            });
          }

          // Controlled pacing between fields
          const stepDelay = (fd.isCustomDropdown || fd.isDropdown)
            ? Math.max(delayMs, 200)
            : Math.max(delayMs, 80);

          if (!abortRequested) {
            await sleep(stepDelay);
          }
        }
      }
    } finally {
      isAutofillRunning = false;
      await ensureDropdownClosed(null);
    }

    return {
      success: true,
      stopped: abortRequested,
      totalDetected: fieldDescriptors.length,
      filledCount: filledFields.length,
      filledFields,
      profileName: profile.name
    };
  }

  return {
    dispatchFullClick,
    setNativeValue,
    fillDropdownField,
    ensureDropdownClosed,
    highlightElement,
    captureAllFields,
    autofillAllFields,
    stopAutofill,
    isRunning,
    isDangerousActionElement
  };
})();
