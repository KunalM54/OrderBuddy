# Meesho AutoListing Pro - Chrome Extension (Manifest V3)

> A fast, secure, and modern Chrome Extension built for Meesho sellers to eliminate repetitive form filling, manage multi-category listing profiles, and speed up catalog creation on `supplier.meesho.com`.

---

## 🌟 Key Features

1. **⚡ Docked On-Page Sidebar (EcomDost Style):**
   - Injects a full-height, docked assistant on the right edge of `supplier.meesho.com` and catalog listing pages.
   - Pinned toggle tab `[⚡ AutoListing ▶ / ◀]` to collapse or expand instantly without obstructing the seller form.
   - View, edit, and save profile fields right inside the sidebar!

2. **📥 100% Dynamic Auto Capture (Any Category):**
   - Automatically scans and captures **all** listing fields present on the page—not just a few hardcoded inputs.
   - Handles standard `<input>` and `<textarea>` elements as well as custom React dropdowns (e.g. `Care Instructions`, `Closure Type`, `Color`, `Filling Material`, `Generic Name`, `Material`, `Net Quantity`, `Product Breadth`, `Product Height`, `Product Length`, `Product Unit`, `GST`, `HSN Code`, `Net Weight`, `Style code / Product ID`, `Product Name`, etc.).
   - Adapts dynamically whether you are listing Baby Godadi, Sarees, Kurtis, Footwear, Bed sheets, or Fashion Jewellery.

3. **⚡ One-Click Form Autofill:**
   - Populates all captured fields in a single click using React prototype descriptor value setters and simulated synthetic events (`input`, `change`, `blur`).
   - Automatically automates custom React combobox and dropdown selection without requiring manual clicks.
   - Visual green pulse animation highlights all populated fields for instant verification.

4. **📄 Single-Page Profile Layout (Exact Meesho Catalog Match):**
   - Eliminates fragmented 7-8 tabs. Shows all fields in a single, continuous, easy-to-read view matching the Meesho Supplier panel:
     - **Product, Size and Inventory**
     - **Product Details & Attributes**
     - **Pricing & Return Tier Details**
     - **Dynamically Captured & Custom Fields**
     - **Manufacturer & Compliance Information**

5. **🎯 Visual Field Training Mode:**
   - Lets sellers click on any element on the page to teach the extension custom mappings or set default values.

6. **📁 Multiple Profiles & Instant Switching:**
   - Create, edit, duplicate, and delete profiles as needed.
   - **Zero dummy/unwanted profiles on install**—starts with a clean state ready for your real products.
   - Instant switching from the docked sidebar, the toolbar popup, or the profile manager.

7. **🛡️ Strict Manual Control & Privacy:**
   - **Manual Control:** The extension will NEVER auto-submit or click "Submit Catalog to QC". The seller always has 100% review and submission control.
   - **100% Local Storage:** Operates completely offline with `chrome.storage.local`. Zero external network calls.

---

## 🚀 Installation & Testing (Developer Mode)

1. Open Google Chrome and go to `chrome://extensions`.
2. Turn **"Developer mode"** **ON** (top right).
3. Click **"Load unpacked"** (top left) and select:
   ```
   D:\Personal Project\Meesho AutoListing Software
   ```
4. Click the extension icon and click **"🧪 Test Sandbox"** (or open `test-page/meesho-mock-listing.html`).
5. Notice the docked **⚡ AutoListing Sidebar** on the right side!
   - Test **"Auto Capture All Fields"** to read all 20+ fields.
   - Test **"One-Click Autofill"** to populate all fields with green highlight pulses.
   - Test **"Save Profile Changes"** to edit field values directly in the sidebar.

---

## 🛒 Live Meesho Supplier Panel Usage

1. Open [supplier.meesho.com](https://supplier.meesho.com) and go to **Catalog Uploads** > **Add Single Catalog**.
2. Click the docked **⚡ AutoListing** tab on the right edge.
3. If creating your first profile, enter a title (e.g. `Godari`) and click **"Auto Capture All Fields"**.
4. On future listings of the same product or category, click **"One-Click Autofill Form"**—all fields are filled in 1 second!
5. Review your information and click **"Submit Catalog"** manually.
