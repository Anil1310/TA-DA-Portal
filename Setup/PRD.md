# Master Product Requirements Document (PRD) & Architecture Blueprint
**Project Type**: Reusable Full-Stack Web Application Framework  
**Document**: `Setup/PRD.md`  
**Standard**: Golden Enterprise Web App Architecture v2.5  
**Author / Chief Architect**: Dev. Anil Kumar Chahar (8126390611)  
**Classification**: Reusable Engineering Specification for New Web Applications  

---

## 1. Executive Vision & Objectives

This PRD establishes the **universal architectural, UI/UX, database, security, and deployment standards** for any new enterprise web application created for the organization.

Whenever a new web portal, dashboard, or business application is developed, it must directly inherit:
1. **The Modern Glassmorphism UI System** (Circular branding, single hamburger menu, proper-case typography, and 100% full-width collapse).
2. **Strict Topbar Navigation Standards** (Clean 4-control header, quick "DB" access pills, and profile pill).
3. **Multi-Role Role-Based Access Control (RBAC)** (Granular permission toggles for user delegations).
4. **Dual-Layer Database Sync** (Real-time Google Sheets collaborative engine + Supabase PostgreSQL cloud sync).
5. **Zero-Hosting-Cost Serverless Deployment** (React 18 + Vite + Google Apps Script monolithic inlining).
6. **Universal Developer Attribution** (`© 2026 Designed & Engineered by Dev. Anil Kumar Chahar • 8126390611 • v2.5 Cloud Edition`).

---

## 2. Global UI/UX Design System & Layout Standards

```
┌────────────────────────────────────────────────────────────────────────┐
│                              TOP NAVIGATION BAR                        │
│ [☰ Expand] [Page Title] ────── [🗄️ DB ↗] [Cloud Sync] [🔔] [User Pill] │
├───────────────┬────────────────────────────────────────────────────────┤
│ SIDEBAR       │ MAIN CONTENT AREA (100% Full Width when Collapsed)     │
│ [Logo 58px ◯] │                                                        │
│ Company Name  │ ┌────────────────────────────────────────────────────┐ │
│ Subtitle      │ │ Interactive Page Card (Claims, Form, Analytics)    │ │
│               │ │ Glassmorphic elevation, 12px radius, soft shadow   │ │
│ ⚡ Navigation │ └────────────────────────────────────────────────────┘ │
│ ⚡ Settings   │                                                        │
│ [👤 Profile]  │ FOOTER: © 2026 Designed & Engineered by Dev. Anil...   │
└───────────────┴────────────────────────────────────────────────────────┘
```

### 2.1. Circular Company Branding & Logo Specification
* **Sidebar Logo Container**:
  - Must strictly be **100% circular** (`borderRadius: '50%'`).
  - Size: **`58px × 58px`** in a **`72px`** height header (scale down to `46px` if compact).
  - Background: Crisp white (`#ffffff`) with subtle `2px solid #bfdbfe` accent border and soft elevation (`boxShadow: '0 3px 10px rgba(0, 0, 0, 0.12)'`).
  - Image scaling: `objectFit: 'contain'`, `transform: 'scale(1.08)'` for edge-to-edge sharpness.
* **Login & Registration Card**:
  - Logo container must be circular (`68px × 68px`, `borderRadius: '50%'`).
* **Automated Google Drive Logo CDN**:
  - Uploading a logo in Settings must automatically write to a dedicated Google Drive folder (`TA_Portal_Assets` / `<App>_Portal_Assets`), set `ANYONE_WITH_LINK` viewer rights, and render via high-reliability thumbnail permalinks (`https://drive.google.com/thumbnail?id={fileId}&sz=w1000`).

---

### 2.2. Sidebar Navigation & Full Collapse Architecture
* **Single Hamburger Toggle**:
  - The sidebar header must **NOT** contain redundant inner chevron or small collapse buttons.
  - Sidebar expand/collapse is driven exclusively by the **prominent Hamburger Menu button (`Menu` icon)** located in the **Topbar**.
* **Full Zero-Width Collapse (`100% Viewport Expansion`)**:
  - When collapsed, the sidebar must **fully disappear** (`width: 0 !important; transform: translateX(-100%); visibility: hidden;`).
  - The main page wrapper must expand to **100% full viewport width** (`margin-left: 0 !important; max-width: 100%`).
  - Transitions: Smooth cubic-bezier transition (`transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1)`).

---

### 2.3. Topbar Navigation (Strict 4-Control Standard)
To eliminate clutter, the top-right header must strictly limit itself to:
1. **"DB" Direct Database Pill(s)**:
   - Replaces generic labels like "Link-1" or "Link-2" with a professional database pill:
     `[ 🗄️ DB ↗ ]` (with Lucide `Database` icon, blue accent `#2563eb`, and target `_blank`).
   - Scoped dynamically by user role:
     - Admin: Displays `[ 🗄️ DB-1 ↗ ]` and `[ 🗄️ DB-2 ↗ ]`.
     - Scoped Staff (e.g. Bharti / Bhawna): Displays strictly their assigned database link `[ 🗄️ DB ↗ ]`.
2. **Cloud Sync / Health Status Indicator**:
   - Pulse circle (`pulse-circle`) with live synchronization status.
3. **Notification Bell Dropdown**:
   - Displays real-time system alerts, submissions, and audit logs.
4. **User Profile Pill & Proper-Case Names**:
   - Displays user initial badge, user display name in **Proper Case** (e.g., `Admin`, `Bharti`, `Bhawna`), and role pill in **Proper Case** (e.g., `[Admin]`, `[Coordinator]`, `[Sales]`).
   - Clicking the profile pill opens the detailed user account modal.

---

### 2.4. Universal Developer Attribution Standard
Every web app, login card, and dashboard must feature the official single-line developer attribution:
```
© 2026 Designed & Engineered by Dev. Anil Kumar Chahar • 8126390611 • v2.5 Cloud Edition
```
* Placement: Bottom of the main content area and bottom of the login card.
* Typography: `0.78rem`, color `#94a3b8`, centered, no emojis.

---

## 3. Multi-Role RBAC & Delegated Admin Permissions

```
                     ┌──────────────────┐
                     │   Super Admin    │ (Full Unrestricted System Access)
                     └─────────┬────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
       ┌───────────────┐               ┌───────────────┐
       │ Coordinator 1 │               │ Coordinator 2 │ (Regionally Scoped:
       │  (Bharti DB1) │               │  (Bhawna DB2) │  Raj, Guj, Bih, Jhk)
       └───────┬───────┘               └───────┬───────┘
               │                               │
               └───────────────┬───────────────┘
                               ▼
                       ┌───────────────┐
                       │  Sales Staff  │ (Submit & View Own Claims)
                       └───────────────┘
```

### 3.1. Role Hierarchy
* **Super Admin**: Access to all 14 territories, Sheet Automation, month locking, user creation, cloud endpoints, and database backups.
* **Regional Coordinators**: Access strictly to assigned territory matrix and sheets.
* **Standard Field Staff**: Permitted only to submit vouchers and view authorized records.

### 3.2. Granular Admin Delegation Toggles
Inside **Settings & Permissions**, Admin has a granular matrix of toggle switches (`ToggleSwitch` component):
* **Page Permissions**: `Submit Form`, `Claims Explorer`, `Analytics`, `Directory`.
* **Feature Permissions**:
  - `openSheetLink`: Show/hide the Topbar "DB" Google Sheet database button.
  - `editClaim`: Allow editing existing vouchers.
  - `deleteClaim`: Allow deleting records (default: OFF).
  - `exportData`: Allow CSV/Excel downloads.
  - `downloadVoucher`: Allow printing expense receipts.
  - `manageBranding`: Allow uploading company logo and changing company name.
  - `manageSupabase`: Allow configuring Supabase PostgreSQL integration.

### 3.3. Hidden Security Table (`Users`)
* User credentials are stored inside a dedicated **`Users`** sheet tab.
* The tab is automatically **hidden and protected** with sheet-level permissions (`sheet.hideSheet()`, `sheet.protect()`).

---

## 4. Dual-Layer Database Architecture

```
                    ┌─────────────────────────┐
                    │  React Web Application  │
                    └────────────┬────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
     ┌───────────────────────┐       ┌───────────────────────┐
     │  Google Sheets Engine │       │  Supabase PostgreSQL  │
     │  (Accounting & Forms) │       │  (Cloud Real-time DB) │
     └───────────────────────┘       └───────────────────────┘
```

### 4.1. Google Sheets Engine (Collaborative Spreadsheet DB)
* **Contiguous Range Batching**: Use `getValues()` and `setValues()` batch processing exclusively to avoid quota limits.
* **12-Month Financial Year Support**:
  - Dropdowns for all 12 accounting months (`Apr` to `Mar`).
  - Automated month tab rollover and template generation.
* **Sheet-Level Locking**:
  - Programmatic month locking (`toggleMonthSheetLock`) protecting finalized tabs against staff edits.
* **Master Tab Consolidation**:
  - Automated ETL script compiling rows strictly starting at **Row 2** across all active month sheets into a centralized `Master` tab.

---

### 4.2. Supabase PostgreSQL Cloud Integration
Every new web app must support optional or hybrid **Supabase PostgreSQL** integration:
* **Connection Form in Settings**:
  - `Project URL` (`https://xyz.supabase.co`)
  - `Anon Public Key` (`eyJhbGci...`)
  - `Table Name` (e.g. `ta_claims`)
  - `Sync Mode`: Dual-Sync (Hybrid), Supabase Only, or Sheets Only.
* **Live Connection Test**:
  - Integrated `testSupabaseConnection()` ping verifying HTTP 200 before saving.
* **1-Click SQL Schema Generator**:
  - Pre-generated SQL with copy-to-clipboard functionality:
  ```sql
  CREATE TABLE IF NOT EXISTS ta_claims (
    id TEXT PRIMARY KEY,
    s_no INT,
    emp_code TEXT NOT NULL,
    sales_person_name TEXT NOT NULL,
    state TEXT NOT NULL,
    ta_bill NUMERIC(12, 2) NOT NULL DEFAULT 0,
    month TEXT NOT NULL,
    full_and_final TEXT DEFAULT 'No',
    submission_date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    source_sheet TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_ta_claims_month ON ta_claims(month);
  CREATE INDEX IF NOT EXISTS idx_ta_claims_state ON ta_claims(state);
  CREATE INDEX IF NOT EXISTS idx_ta_claims_emp ON ta_claims(emp_code);

  ALTER TABLE ta_claims ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Allow public read-write for portal" ON ta_claims FOR ALL USING (true);
  ```

---

## 5. Session Management, Security & Auto-Logout

1. **10-Day "Remember Me"**:
   - When checked, save login credentials in `localStorage` with a 10-day TTL (`10 * 24 * 60 * 60 * 1000` ms).
   - Auto-fill and pre-check "Remember Me" on subsequent visits.
   - Purge automatically after 10 days.
2. **2-Hour Inactivity Auto-Logout**:
   - Throttle activity listeners across mouse, keyboard, touch, and scroll events (`mousemove`, `keydown`, `touchstart`, `scroll`).
   - If 120 minutes (7,200,000 ms) elapse without activity, terminate active session, redirect to login, and show toast notification.
3. **Session vs Credential Independence**:
   - Auto-logout terminates the active session token but preserves the 10-day remembered credentials so the user can easily re-authenticate with one click.

---

## 6. Build, DevOps & Zero-Cost Cloud Deployment

```
[React 18 + Vite] ──► npm run build ──► dist/ ──► [inline-for-appscript.js] ──► Index.html ──► clasp push ──► Google Cloud
```

### 6.1. Build Stack
* **Frontend**: React 18, Vite 5, CSS3, Lucide React.
* **Backend**: Google Apps Script (V8 Engine).
* **Compiler**: Node.js inlining script (`scripts/inline-for-appscript.js`) packing HTML, CSS, and JS into a single monolithic `apps_script/Index.html`.
* **Deployment CLI**: `@google/clasp`.

### 6.2. Standard Build & Push Commands
```powershell
# 1. Compile frontend
npm run build

# 2. Bundle into single Google Apps Script HTML
node scripts/inline-for-appscript.js

# 3. Push to Google Cloud / Apps Script
npx @google/clasp push --force
```

### 6.3. Dual Environment Compatibility
* **Corporate Google Workspace (`@doctorsoap.com`)**:
  - Deployed under corporate domain with internal authorization.
* **Personal Google Account (`@gmail.com`)**:
  - Deployed under consumer Gmail with:
    - **Execute as**: `Me (your personal Gmail)`
    - **Who has access**: `Anyone` *(Crucial: allows team members to submit vouchers without needing Google Drive permissions).*

---

## 7. Reusable Component Checklist for Future Apps

When building your next web app, copy and reuse these standard components:

| Component | Source File | Purpose |
| :--- | :--- | :--- |
| **Circular Brand Logo** | `Sidebar.jsx`, `LoginPage.jsx` | 58px / 68px circular logo badge with Drive CDN |
| **Full Collapse Sidebar** | `Sidebar.jsx`, `index.css` | Zero-width 100% full-screen collapse |
| **Topbar DB Header** | `Topbar.jsx` | Database pill, proper-case user badge, 4-control layout |
| **Permission Switch** | `Settings.jsx` (`ToggleSwitch`) | Granular boolean feature & page toggles |
| **Supabase Integration**| `Settings.jsx`, `storage.js` | Dual-sync, credentials form & SQL generator |
| **Sheet Inliner** | `inline-for-appscript.js` | Monolithic HTML compiler for Apps Script |
| **Attribution Footer** | `App.jsx`, `LoginPage.jsx` | Dev. Anil Kumar Chahar official attribution |
| **12-Month Dropdowns** | `Automation.jsx` | Typos-free financial year selection |

---

## 8. Quality Sign-Off & Verification Rules

Before delivering any new web application:
1. Verify the sidebar collapses completely to 0 width with main content taking 100% width.
2. Verify all user display names and role badges appear in **Proper Case**.
3. Verify Topbar contains **"DB"** with database icon rather than generic text.
4. Verify the footer contains the exact attribution text:  
   `© 2026 Designed & Engineered by Dev. Anil Kumar Chahar • 8126390611 • v2.5 Cloud Edition`.
5. Verify both Google Sheets and Supabase PostgreSQL credentials test green.
