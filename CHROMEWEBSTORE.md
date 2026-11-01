# Chrome Web Store Listing — Meesho AutoListing Pro

> Last Updated: 2026-11-01

## Store Listing

**Extension Name**
Meesho AutoListing Pro - Fast Catalog Autofill

**Short Description**
Accelerate product listings on the Meesho Supplier Panel with one-click autofill, smart field capture, and multi-category profiles.

**Detailed Description**
Streamline and speed up your product catalog upload workflow on the Meesho Supplier Panel.

Meesho AutoListing Pro eliminates repetitive, manual data entry when uploading single product catalogs on Meesho. With reusable category profiles, instant field detection, and one-click autofill, sellers can cut catalog creation time from minutes to seconds.

KEY FEATURES
- One-Click Form Autofill: Fills all pricing, tax, logistics, attribute, and description fields with a single click.
- Multi-Category Profiles: Create and manage custom profiles for Sarees, Kurtis, Western Wear, Jewellery, Home Decor, and more.
- Instant Profile Switching: Switch between saved product categories in real-time from the popup or floating assistant.
- Auto Capture Existing Listings: Open any existing listing form to automatically extract and save fields into a reusable profile.
- Visual Field Training Mode: Easily teach the tool new or custom fields simply by clicking on them.
- In-Page Floating Assistant: Convenient draggable on-page toolbar for fast access without constantly reopening the extension popup.
- Offline Backup & Restore: Export and import your product profiles locally with zero cloud dependencies.
- 100% Manual Control: AutoListing never automatically submits or publishes your listing. You review and submit every product manually.

HOW TO USE
1. Click the AutoListing toolbar icon or use the in-page floating widget on supplier.meesho.com.
2. Select your product profile (or customize one in the Profile Manager).
3. Click "One-Click Autofill" to populate all matching fields on the catalog page.
4. Review your product details, upload your images, and manually submit the catalog to Quality Check (QC).

PRIVACY & SECURITY
Your catalog data never leaves your computer. Meesho AutoListing Pro operates completely offline using local browser storage (`chrome.storage.local`). No analytics, no tracking, and no external server communication.

SUPPORT & FEEDBACK
For assistance, profile templates, or feedback, visit our documentation or submit an issue via our developer support channels.

**Category**
Productivity

**Single Purpose**
Enables Meesho sellers to autofill and manage repetitive product catalog form fields using saved local profiles.

**Primary Language**
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | icons/icon128.png |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ Not created | screenshots/screen1.png |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | screenshots/screen2.png |
| Screenshot 3 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | screenshots/screen3.png |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | promo/tile-small.png |
| Marquee Promo Tile | 1400×560 | ⬜ Not created | promo/tile-marquee.png |

### Screenshot Notes
- Screenshot 1: In-page floating assistant demonstrating one-click autofill on a Meesho supplier catalog form with green field highlights.
- Screenshot 2: Chrome extension popup showing the active profile selector, instant snapshot summary, and one-click action buttons.
- Screenshot 3: Dedicated Full Profile Manager interface showing tabbed editing for Pricing, Attributes, Logistics, and Backup import/export.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Required to store and retrieve reusable product listing profiles, settings, and custom field training rules locally on the seller's computer. |
| `tabs` | permissions | Used to identify the active Meesho supplier catalog tab and coordinate autofill and training actions between the popup and webpage. |
| `activeTab` | permissions | Grants the extension temporary access to the currently focused listing tab when the user clicks the extension action icon. |
| `scripting` | permissions | Enables runtime coordination of field highlighting and form element interaction on supplier listing forms. |
| `*://supplier.meesho.com/*` | host_permissions | Allows the extension to detect input fields and automate form filling on the official Meesho Supplier panel. |
| `*://*.meesho.com/*` | host_permissions | Supports subdomains and staging listing URLs used by Meesho sellers. |
| `*://localhost/*` | host_permissions | Permits offline testing and local sandbox catalog form verification during development. |
| `*://127.0.0.1/*` | host_permissions | Permits offline testing and local sandbox catalog form verification during development. |
| `file:///*` | host_permissions | Enables local offline testing of bundled sample forms in developer mode. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

The extension does NOT collect, transmit, or share any personal, financial, authentication, or product catalog data. All data entered by the user is stored solely on their local device using standard browser local storage (`chrome.storage.local`).

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | No | N/A | No |
| Health info | No | No | N/A | No |
| Financial info | No | No | N/A | No |
| Authentication info | No | No | N/A | No |
| Personal communications | No | No | N/A | No |
| Location | No | No | N/A | No |
| Web history | No | No | N/A | No |
| User activity | No | No | N/A | No |
| Website content | No | No | N/A | No |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL**
`https://github.com/meesho-autolisting-pro/privacy-policy` (or seller's hosted repository)

## Distribution

**Visibility**: Public
**Regions**: All regions (optimized for India)

## Developer Info

**Publisher Name**: Meesho AutoListing Tools
**Contact Email**: support@meesho-autolisting.local
**Support URL / Email**: support@meesho-autolisting.local

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-11-01 | Initial release with 1-click autofill, multi-profile management, field training mode, and floating assistant. | Draft |

## Review Notes

### Known Issues / Limitations
- Does not automatically click submit/publish buttons (intentional safety feature to give sellers 100% review control before submission).
