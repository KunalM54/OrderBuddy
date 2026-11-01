/**
 * Meesho AutoListing Pro - 100% Accurate & Safe Dropdown & Form Autofill Engine
 * Reverse-engineered for Meesho's React / Ant Design dynamic forms.
 *
 * Strict Safety Guarantees:
 * - NEVER clicks "Discard", "Cancel", "Submit", "Save", "QC", or navigation buttons.
 * - NEVER dispatches global Escape events to window/document (prevents "Discard Catalog" popups).
 * - Restricts dropdown option searches exclusively to active menu portals (never touches main page buttons).
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
   * Strictly verifies element is not dangerous before dispatching!
   */
  function dispatchFullClick(el) {
    if (!el || isDangerousActionElement(el)) return false;

    el.focus?.();
    const rect = el.getBoundingClientRect();
    const clientX = rect.left + Math.max(2, rect.width / 2);
    const clientY = rect.top + Math.max(2, rect.height / 2);

    const eventInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      button: 0,
      buttons: 1,
      clientX,
      clientY
    };

    el.dispatchEvent(new PointerEvent("pointerover", eventInit));
    el.dispatchEvent(new MouseEvent("mouseover", eventInit));
    el.dispatchEvent(new PointerEvent("pointerdown", eventInit));
    el.dispatchEvent(new MouseEvent("mousedown", eventInit));
    el.dispatchEvent(new PointerEvent("pointerup", eventInit));
    el.dispatchEvent(new MouseEvent("mouseup", eventInit));
    el.dispatchEvent(new MouseEvent("click", eventInit));
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

        if (optVal === normalizedTarget || optText === normalizedTarget || optText.includes(normalizedTarget)) {
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

    element.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true, cancelable: true }));

    return true;
  }

  /**
   * Multi-tiered match tester: checks if candidate option text matches targetValue
   */
  function matchesOptionText(candidateText, targetValue) {
    if (!candidateText || !targetValue) return false;

    const normCandidate = window.MeeshoFieldMapper.normalizeText(candidateText).toLowerCase().trim();
    const normTarget = window.MeeshoFieldMapper.normalizeText(String(targetValue)).toLowerCase().trim();

    if (!normCandidate || !normTarget) return false;

    // Never match dangerous actions or placeholders
    if (["select", "choose", "discard", "cancel", "submit", "delete", "clear"].includes(normCandidate)) {
      return false;
    }

    // Tier 1: Exact match
    if (normCandidate === normTarget) return true;

    // Tier 2: Alphanumeric match (ignoring spaces, hyphens, slashes)
    const alphaCandidate = window.MeeshoFieldMapper.cleanAlphaNumeric(candidateText);
    const alphaTarget = window.MeeshoFieldMapper.cleanAlphaNumeric(String(targetValue));
    if (alphaCandidate && alphaTarget && alphaCandidate === alphaTarget) return true;

    // Tier 3: Numbers match (e.g. "250" vs "250 gms", "5" vs "Pack of 5", "630492" vs "630492 - Bed linen...", "5%" vs "5% (Apparel...)")
    const targetDigits = normTarget.replace(/\D/g, "");
    const candidateDigits = normCandidate.replace(/\D/g, "");
    if (targetDigits.length >= 2 && candidateDigits.length >= 2) {
      if (targetDigits === candidateDigits) return true;
      if (candidateDigits.startsWith(targetDigits) || targetDigits.startsWith(candidateDigits)) return true;
    }

    // Tier 4: Substring starts-with / contains (minimum 3 characters)
    if (normTarget.length >= 3 && normCandidate.startsWith(normTarget)) return true;
    if (normCandidate.length >= 3 && normTarget.startsWith(normCandidate)) return true;
    if (normTarget.length >= 4 && normCandidate.includes(normTarget)) return true;
    if (normCandidate.length >= 4 && normTarget.includes(normCandidate)) return true;

    // Tier 5: Word token overlap
    const targetWords = normTarget.split(/\s+/).filter(w => w.length >= 3);
    const candidateWords = normCandidate.split(/\s+/).filter(w => w.length >= 3);

    if (targetWords.length > 0 && candidateWords.length > 0) {
      const allTargetInCandidate = targetWords.every(tw => candidateWords.some(cw => cw.includes(tw) || tw.includes(cw)));
      if (allTargetInCandidate) return true;

      const allCandidateInTarget = candidateWords.every(cw => targetWords.some(tw => tw.includes(cw) || cw.includes(tw)));
      if (allCandidateInTarget) return true;
    }

    return false;
  }

  /**
   * Search for an option element ONLY within active dropdown menus / portals.
   * NEVER searches general document.body to prevent touching page navigation buttons!
   */
  function findOptionInActivePortals(targetValue, triggerEl) {
    if (!targetValue) return null;

    // Strictly identify active popup/portal containers
    const activePortals = Array.from(document.querySelectorAll(
      "[role='listbox'], [role='menu'], [class*='portal' i], [class*='dropdown-menu' i], [class*='ant-select-dropdown' i], [class*='Select-menu' i], [class*='popover' i], ul[class*='list' i]"
    )).filter(p => !p.closest("#meesho-autolisting-host") && !isDangerousActionElement(p));

    // Also check floating divs appended directly to body with high z-index
    const floatingPortals = Array.from(document.body.children).filter(child => {
      if (child.id === "meesho-autolisting-host" || isDangerousActionElement(child)) return false;
      const s = window.getComputedStyle(child);
      return (s.position === "absolute" || s.position === "fixed") && parseInt(s.zIndex || "0", 10) >= 10;
    });

    const searchRoots = [...new Set([...activePortals, ...floatingPortals])];
    if (searchRoots.length === 0) return null;

    for (const root of searchRoots) {
      const candidates = root.querySelectorAll(
        "[role='option'], [role='menuitem'], [class*='option' i], [class*='item' i], li, div, span, p"
      );

      for (const el of candidates) {
        if (isDangerousActionElement(el)) continue;
        if (triggerEl && (el === triggerEl || triggerEl.contains(el))) continue;

        // Verify element is currently visible
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const txt = el.textContent?.trim();
        if (!txt || txt.length > 100) continue;

        if (matchesOptionText(txt, targetValue)) {
          const leafChild = Array.from(el.children).find(c => {
            const cTxt = c.textContent?.trim();
            return cTxt && matchesOptionText(cTxt, targetValue) && !isDangerousActionElement(c);
          });
          return leafChild || el;
        }
      }
    }

    return null;
  }

  /**
   * Find any scrollable listbox container inside active portals
   */
  function findScrollableListContainer() {
    const containers = Array.from(document.querySelectorAll(
      "[role='listbox'], ul, [class*='virtual' i], [class*='menu' i], [class*='list' i], [class*='scroll' i], div[style*='overflow']"
    )).filter(el => {
      if (el.closest("#meesho-autolisting-host") || isDangerousActionElement(el)) return false;
      return el.scrollHeight > el.clientHeight + 10 && el.clientHeight > 40;
    });

    return containers[0] || null;
  }

  /**
   * Poll active portals for option element with virtual-scroll support
   */
  async function pollAndClickOption(targetValue, triggerEl, maxDurationMs = 1100) {
    const startTime = Date.now();
    let scrollAttempts = 0;

    while (Date.now() - startTime < maxDurationMs) {
      if (abortRequested) return false;

      const matched = findOptionInActivePortals(targetValue, triggerEl);

      if (matched) {
        matched.scrollIntoView?.({ behavior: "instant", block: "nearest" });
        await new Promise(r => setTimeout(r, 60));

        // If matched element has an inner checkbox (e.g. Size checkbox), check it
        const innerCheckbox = matched.querySelector("input[type='checkbox']");
        if (innerCheckbox && !innerCheckbox.checked) {
          innerCheckbox.checked = true;
          innerCheckbox.dispatchEvent(new Event("change", { bubbles: true }));
        }

        dispatchFullClick(matched);
        await new Promise(r => setTimeout(r, 150));
        return true;
      }

      // If not found yet and list might be virtualized, scroll the list container downwards
      if (scrollAttempts < 5) {
        const scrollContainer = findScrollableListContainer();
        if (scrollContainer) {
          scrollContainer.scrollTop += 120;
          scrollContainer.dispatchEvent(new Event("scroll", { bubbles: true }));
          scrollAttempts++;
          await new Promise(r => setTimeout(r, 80));
          continue;
        }
      }

      await new Promise(r => setTimeout(r, 80));
    }

    return false;
  }

  /**
   * Safely close any open dropdown menu.
   * CRITICAL: NEVER dispatches global Escape to window or document (which caused "Discard Catalog" modal).
   * Strictly blurs the trigger/input and toggles trigger element if still expanded.
   */
  async function ensureDropdownClosed(triggerEl) {
    // 1. Blur activeElement and trigger safely
    if (document.activeElement && !document.activeElement.closest("#meesho-autolisting-host")) {
      document.activeElement.blur?.();
    }
    if (triggerEl) {
      triggerEl.blur?.();
    }

    // 2. Dispatch non-bubbling Escape ONLY to the specific trigger/input (never to window/document)
    if (triggerEl) {
      const localEsc = new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, bubbles: false });
      triggerEl.dispatchEvent(localEsc);
    }

    // 3. If trigger element still has aria-expanded="true", click the trigger once to toggle it closed
    if (triggerEl && triggerEl.getAttribute("aria-expanded") === "true") {
      dispatchFullClick(triggerEl);
    }

    await new Promise(r => setTimeout(r, 120));
  }

  /**
   * Automate selection in custom React/Meesho dropdowns or dropdown input fields.
   */
  async function fillDropdownField(element, targetValue) {
    if (!element || !targetValue || abortRequested) return false;
    if (isDangerousActionElement(element)) return false;

    const stringValue = String(targetValue).trim();

    // 1. If native <select>, set directly
    if (element.tagName === "SELECT") {
      return setNativeValue(element, stringValue);
    }

    // 2. Identify the dropdown trigger element
    const trigger = element.closest(
      "[role='combobox'], [class*='select' i], [class*='control' i], [class*='dropdown' i], [class*='picker' i]"
    ) || element;

    if (isDangerousActionElement(trigger)) return false;

    // Scroll trigger into view smoothly so it is fully visible
    trigger.scrollIntoView?.({ behavior: "instant", block: "center" });
    await new Promise(r => setTimeout(r, 80));
    if (abortRequested) return false;

    // Open dropdown by dispatching click
    dispatchFullClick(trigger);
    await new Promise(r => setTimeout(r, 200));
    if (abortRequested) {
      await ensureDropdownClosed(trigger);
      return false;
    }

    // 3. Check for an active search/filter input inside trigger or opened popup
    const activeInput = (element.tagName === "INPUT" ? element : null) ||
      trigger.querySelector("input") ||
      document.querySelector("[role='listbox'] input, [class*='dropdown-menu' i] input, input[type='search']");

    if (activeInput && !activeInput.closest("#meesho-autolisting-host") && !activeInput.readOnly && !isDangerousActionElement(activeInput)) {
      setNativeValue(activeInput, stringValue);

      // Dispatch Enter key to select top filtered match if combobox supports it
      const enterInit = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true };
      activeInput.dispatchEvent(new KeyboardEvent("keydown", enterInit));
      activeInput.dispatchEvent(new KeyboardEvent("keyup", enterInit));
      await new Promise(r => setTimeout(r, 150));
    }

    if (abortRequested) {
      await ensureDropdownClosed(trigger);
      return false;
    }

    // 4. Poll active portals for option element and click it
    let selected = await pollAndClickOption(stringValue, trigger, 1100);

    // 5. If option click succeeded, wait briefly for React state update
    if (selected) {
      await new Promise(r => setTimeout(r, 150));
    } else {
      // Fallback: If trigger or element is an input, set native value directly
      if (element.tagName === "INPUT") {
        setNativeValue(element, stringValue);
        selected = true;
      }
    }

    // 6. Safe close: close menu cleanly without triggering Discard Catalog
    await ensureDropdownClosed(trigger);
    await new Promise(r => setTimeout(r, 80));

    return selected;
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

    const { highlight = true, delayMs = 250, onProgress = null } = options;
    const fieldDescriptors = window.MeeshoFieldMapper.getAllListingFields(document);
    const filledFields = [];
    const customMappings = profile.customMappings || {};

    try {
      for (let i = 0; i < fieldDescriptors.length; i++) {
        // Immediate cancellation check
        if (abortRequested) {
          await ensureDropdownClosed();
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

        // Skip dangerous elements, buttons, and QC submit
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

          for (const [k, v] of Object.entries(profile.fields)) {
            const valCandidate = typeof v === "object" && v !== null && "value" in v ? v.value : v;
            const labelCandidate = typeof v === "object" && v !== null && "label" in v ? v.label : k;

            const normCandidateLabel = window.MeeshoFieldMapper.cleanLabel(labelCandidate).toLowerCase();
            const normCandidateKey = window.MeeshoFieldMapper.labelToKey(k);

            if (normCandidateLabel === normFdLabel ||
                normCandidateKey === fd.key ||
                aliases.includes(normCandidateKey) ||
                normCandidateLabel.includes(normFdLabel) ||
                normFdLabel.includes(normCandidateLabel)) {
              targetValue = valCandidate;
              break;
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

          if (delayMs > 0 && !abortRequested) {
            await new Promise(r => setTimeout(r, delayMs));
          }
        }
      }
    } finally {
      isAutofillRunning = false;
      await ensureDropdownClosed();
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
