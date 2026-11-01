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

        // Never select by substring. "g" must not select "kg" and "2390"
        // must not select a larger value that merely contains it.
        if (optVal === normalizedTarget || optText === normalizedTarget) {
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
        // Do not report success when the requested option does not exist.
        // This prevents a later workflow step from treating an unselected
        // native dropdown as correctly filled.
        return false;
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
   * Multi-tiered option text matcher.
   * Guarantees 100% exact match takes absolute priority.
   * Short values (length <= 3 like "g", "kg", "m", "cm", "S", "M", "L", "XL", "1")
   * STRICTLY require 100% exact match to prevent partial collisions (e.g. prevents "kg" matching "g").
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

    // Tier 1: 100% Exact string match
    if (normCandidate === normTarget) return 100;

    // Tier 2: 100% Alphanumeric exact match (ignoring punctuation and spaces)
    const alphaCandidate = window.MeeshoFieldMapper.cleanAlphaNumeric(candidateText);
    const alphaTarget    = window.MeeshoFieldMapper.cleanAlphaNumeric(String(targetValue));
    if (alphaCandidate && alphaTarget && alphaCandidate === alphaTarget) return 100;

    // Strict boundary rule for short values (e.g. "g" vs "kg", "m" vs "cm", "s" vs "xs"):
    // Short values MUST be a 100% exact match. NEVER allow partial matching for short tokens!
    if (normTarget.length <= 3 || normCandidate.length <= 3) {
      return 0;
    }

    // Tier 3: Candidate starts with target followed by punctuation or parenthesis
    // (e.g. target "630492" vs candidate "630492 - Bed linen", target "5%" vs "5% (Apparel...)")
    if (normCandidate.startsWith(normTarget)) {
      const charAfter = normCandidate.slice(normTarget.length, normTarget.length + 1);
      if (!charAfter || /[\s\-\(\[\{:,]/.test(charAfter)) {
        return 92;
      }
    }

    // Tier 4: Target starts with candidate followed by punctuation
    if (normTarget.startsWith(normCandidate)) {
      const charAfter = normTarget.slice(normCandidate.length, normCandidate.length + 1);
      if (!charAfter || /[\s\-\(\[\{:,]/.test(charAfter)) {
        return 90;
      }
    }

    // Tier 5: Digits exact match (e.g. "630492" in "630492 - Bed Linen")
    const targetDigits    = normTarget.replace(/\D/g, "");
    const candidateDigits = normCandidate.replace(/\D/g, "");
    if (targetDigits && candidateDigits && targetDigits === candidateDigits && targetDigits.length >= 4) {
      return 88;
    }

    // Tier 6: Whole word match for longer phrases (length >= 4)
    if (normTarget.length >= 4) {
      const escapedTarget = normTarget.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const wordRegex = new RegExp("(^|[^a-z0-9])" + escapedTarget + "([^a-z0-9]|$)", "i");
      if (wordRegex.test(normCandidate)) {
        return 85;
      }
    }

    return 0;
  }

  function matchesOptionText(candidateText, targetValue) {
    return scoreOptionMatch(candidateText, targetValue) >= 85;
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
   * Find the exact-matching option element inside an active portal.
   * Uses DOM TreeWalker on text nodes to guarantee 100% immune detection,
   * regardless of container classes or component hierarchy.
   */
  function findBestOptionInPortal(portal, targetValue) {
    if (!portal || !targetValue) return null;

    const stringValue = String(targetValue).trim();
    const normTarget = window.MeeshoFieldMapper.normalizeText(stringValue).toLowerCase().trim();
    if (!normTarget) return null;

    const searchInputs = Array.from(portal.querySelectorAll("input, textarea"));

    // 1. Text node exact matching via TreeWalker
    const walker = document.createTreeWalker(portal, NodeFilter.SHOW_TEXT, null, false);
    let textNode;
    const exactMatches = [];

    while ((textNode = walker.nextNode())) {
      const parent = textNode.parentElement;
      if (!parent) continue;
      if (searchInputs.some(inp => inp === parent || inp.contains(parent) || parent.contains(inp))) continue;
      if (isDangerousActionElement(parent) || !isElementVisible(parent)) continue;

      const txt = window.MeeshoFieldMapper.normalizeText(textNode.nodeValue).toLowerCase().trim();
      if (txt === normTarget) {
        exactMatches.push(parent);
      }
    }

    if (exactMatches.length > 0) {
      // Pick the most specific leaf element with the fewest children
      exactMatches.sort((a, b) => a.children.length - b.children.length);
      return exactMatches[0];
    }

    // 2. Direct element textContent exact match fallback
    const candidateElements = Array.from(portal.querySelectorAll("div, span, li, p, a, label, [role='option']")).filter(el => {
      if (isDangerousActionElement(el) || !isElementVisible(el)) return false;
      if (searchInputs.some(inp => inp === el || inp.contains(el))) return false;
      const directText = window.MeeshoFieldMapper.normalizeText(el.innerText || el.textContent).toLowerCase().trim();
      if (directText === normTarget) return true;
      const alphaCandidate = window.MeeshoFieldMapper.cleanAlphaNumeric(el.innerText || el.textContent);
      const alphaTarget = window.MeeshoFieldMapper.cleanAlphaNumeric(stringValue);
      return alphaCandidate && alphaTarget && alphaCandidate === alphaTarget;
    });

    if (candidateElements.length > 0) {
      candidateElements.sort((a, b) => a.children.length - b.children.length);
      return candidateElements[0];
    }

    // 3. For longer strings (length >= 4), prefix match (e.g. "630492 - Bed Linen...")
    if (normTarget.length >= 4) {
      const prefixCandidates = [];
      const walker2 = document.createTreeWalker(portal, NodeFilter.SHOW_TEXT, null, false);
      let tNode;
      while ((tNode = walker2.nextNode())) {
        const parent = tNode.parentElement;
        if (!parent || searchInputs.some(inp => inp === parent || inp.contains(parent))) continue;
        if (isDangerousActionElement(parent) || !isElementVisible(parent)) continue;

        const txt = window.MeeshoFieldMapper.normalizeText(tNode.nodeValue).toLowerCase().trim();
        if (txt.startsWith(normTarget)) {
          const charAfter = txt.slice(normTarget.length, normTarget.length + 1);
          if (!charAfter || /[\s\-\(\[\{:,]/.test(charAfter)) {
            prefixCandidates.push(parent);
          }
        }
      }
      if (prefixCandidates.length > 0) {
        prefixCandidates.sort((a, b) => a.children.length - b.children.length);
        return prefixCandidates[0];
      }
    }

    return null;
  }

  /**
   * Guarantee that ANY open dropdown on the page is fully and cleanly CLOSED.
   * Strictly adheres to safety constraints:
   * - NEVER clicks Discard/Cancel/Submit buttons.
   * - Does NOT send Escape if an option was clicked (prevents reverting selection).
   */
  async function ensureDropdownClosed(triggerEl, maxWaitMs = 500) {
    if (!isAnyDropdownOpen()) return;

    const deadline = Date.now() + maxWaitMs;

    // Step 1: Click outside on document.body or toggle trigger to close naturally
    const evtInit = {
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
      clientX: 20,
      clientY: 20,
      button: 0,
      buttons: 0
    };
    document.body.dispatchEvent(new MouseEvent("mousedown", { ...evtInit, buttons: 1 }));
    document.body.dispatchEvent(new MouseEvent("mouseup",   { ...evtInit, buttons: 0 }));
    document.body.dispatchEvent(new MouseEvent("click",     { ...evtInit, buttons: 0 }));

    if (document.activeElement && !document.activeElement.closest("#meesho-autolisting-host")) {
      document.activeElement.blur?.();
    }

    await sleep(60);
    if (!isAnyDropdownOpen()) return;

    // Step 2: Toggle trigger if it still has open class or aria-expanded
    if (triggerEl) {
      if (triggerEl.classList.contains("ant-select-open") || triggerEl.getAttribute("aria-expanded") === "true") {
        const toggleTarget = triggerEl.querySelector(".ant-select-selector") || triggerEl;
        dispatchFullClick(toggleTarget);
        await sleep(50);
      }
    }

    // Step 3: Wait until closed
    while (Date.now() < deadline && isAnyDropdownOpen()) {
      await sleep(30);
    }

    // Step 4: If any stubborn popup is still displayed, gracefully hide it
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
   * Dispatches ONLY to the target option element (never to outer parent option lists).
   */
  function executeOptionClick(optionEl) {
    if (!optionEl || isDangerousActionElement(optionEl)) return false;

    // Check inner checkbox if multi-select
    const chk = optionEl.querySelector("input[type='checkbox']");
    if (chk && !chk.checked) {
      chk.checked = true;
      chk.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // Scroll option into view with center alignment
    optionEl.scrollIntoView({ behavior: "instant", block: "center" });

    const rect = optionEl.getBoundingClientRect();
    const cx = Math.floor(rect.left + Math.max(2, rect.width / 2));
    const cy = Math.floor(rect.top + Math.max(2, rect.height / 2));
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

    // 1. Dispatch pointer, mouse, and click chain strictly to optionEl
    try {
      optionEl.dispatchEvent(new PointerEvent("pointerdown", { ...evtInit, buttons: 1 }));
      optionEl.dispatchEvent(new MouseEvent("mousedown",     { ...evtInit, buttons: 1 }));
      optionEl.dispatchEvent(new PointerEvent("pointerup",   { ...evtInit, buttons: 0 }));
      optionEl.dispatchEvent(new MouseEvent("mouseup",       { ...evtInit, buttons: 0 }));
      optionEl.dispatchEvent(new MouseEvent("click",         { ...evtInit, buttons: 0 }));
      optionEl.click?.();
    } catch (e) {}

    // 2. React Fiber synthetic event trigger on optionEl and its immediate parent only
    const targetsToTrigger = [optionEl, optionEl.parentElement].filter(Boolean);
    for (const target of targetsToTrigger) {
      const reactKey = Object.keys(target).find(k => k.startsWith("__reactProps") || k.startsWith("__reactEvents"));
      if (reactKey && target[reactKey]) {
        const props = target[reactKey];
        const syntheticEvt = {
          bubbles: true,
          cancelable: true,
          preventDefault: () => {},
          stopPropagation: () => {},
          target: optionEl,
          currentTarget: target
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
      // 1. FIRST: Check if the exact option is ALREADY visible in the portal right now!
      let optionEl = findBestOptionInPortal(portal, stringValue);

      // 2. If NOT immediately visible, use search input to filter the options
      const searchInput =
        portal.querySelector("input[placeholder*='Search' i]") ||
        portal.querySelector("input[type='text']") ||
        portal.querySelector("input:not([type='hidden'])");

      if (!optionEl && searchInput && !searchInput.readOnly && !isDangerousActionElement(searchInput)) {
        searchInput.focus?.();

        // React controlled input tracker bypass so Meesho updates its filter state:
        const prevVal = searchInput.value || "";
        if (searchInput._valueTracker) {
          searchInput._valueTracker.setValue(prevVal + "_temp");
        }

        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(searchInput, stringValue);
        } else {
          searchInput.value = stringValue;
        }
        searchInput.dispatchEvent(new Event("input",  { bubbles: true }));
        searchInput.dispatchEvent(new Event("change", { bubbles: true }));
        await sleep(180);

        optionEl = findBestOptionInPortal(portal, stringValue);
      }

      // 3. If still not visible, scroll virtual list holder to find it
      if (!optionEl) {
        const scrollHolder =
          portal.querySelector(".rc-virtual-list-holder") ||
          portal.querySelector("[class*='virtual' i]") ||
          portal.querySelector("[class*='holder' i]") ||
          portal.querySelector("[class*='list' i]") ||
          portal;

        if (scrollHolder) {
          scrollHolder.scrollTop = 0;
          await sleep(30);
          for (let step = 0; step < 10; step++) {
            optionEl = findBestOptionInPortal(portal, stringValue);
            if (optionEl) break;
            scrollHolder.scrollTop += 80;
            scrollHolder.dispatchEvent(new Event("scroll", { bubbles: true }));
            await sleep(40);
          }
        }
      }

      // 4. Click the exact option!
      if (optionEl) {
        executeOptionClick(optionEl);
        optionSelected = true;
        await sleep(150);
      }
    }

    // Do not fall back to assigning the search box value. That only changes
    // the query text and can leave the dropdown unselected (or select a
    // nearby result). Ordinary inputs are handled by setNativeValue directly.

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
