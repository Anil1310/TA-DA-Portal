# Official Workspace Setup & Production Architecture Guide
**Organization**: Pee Cee Cosma Pvt. Ltd. (`doctorsoap.com`)  
**Portal Name**: MIS TA-DA Portal  
**Platform**: Google Apps Script + React (Vite) + Google Sheets  
**Version**: v2.5 Cloud Edition  

---

## 1. Official Workspace Infrastructure

| Resource | Value / Link | Notes |
| :--- | :--- | :--- |
| **Google Workspace Domain** | `@doctorsoap.com` | Official Corporate Domain |
| **Primary Script ID** | `1ouE8kYLKAbIi4vklT0v0uCOTJKG2UTeuhqaBpCc_dNJlDM1jdtzJYvCA` | Linked via `.clasp.json` |
| **Secondary Script ID** | `1dDw7A2kMdHQYwKcK_FqwDhqIM6btoDZHtOdhZpJOMeAohBLsXLs7TB-M` | Secondary regional container |
| **Live Web App (/dev)** | [Link-1 Dev Test Deployment](https://script.google.com/a/macros/doctorsoap.com/s/1ouE8kYLKAbIi4vklT0v0uCOTJKG2UTeuhqaBpCc_dNJlDM1jdtzJYvCA/dev) | Real-time test deployment |
| **Multi-Account URL** | [Multi-Account Direct Link](https://script.google.com/macros/s/1ouE8kYLKAbIi4vklT0v0uCOTJKG2UTeuhqaBpCc_dNJlDM1jdtzJYvCA/dev) | Automatic Google identity routing |

---

## 2. Official Google Spreadsheets

### 🔵 Primary Sheet (Sheet-1 / Bharti & Admin)
* **Spreadsheet ID**: `1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY`
* **Direct Google Sheet URL**: [Open Primary Sheet in Google Sheets](https://docs.google.com/spreadsheets/d/1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY/edit)
* **Coordinator**: Bharti (`salescoordinator1@doctorsoap.com`) & Admin
* **Allocated Territories**:
  - Delhi, Haryana, Punjab, U.P. West, MP, Chhattisgarh, Uttarakhand, Local Agra, Ex-UP, Meghalaya
* **Core Tabs**:
  - `Master`: Consolidated row-by-row expense master compilation (starts at Row 2).
  - Monthly Tabs: `Apr`, `May`, `Jun`, `Jul`, `Aug`, `Sep`, `Oct`, `Nov`, `Dec`, `Jan`, `Feb`, `Mar`
  - `Users` (Hidden Tab, GID: `1972170937`): Stores encrypted passwords, user roles, allowed states, and permissions.
  - `Provisional Statewise Costing`: Real-time cross-tabulated state expense matrix.

---

### 🟣 Secondary Sheet (Sheet-2 / Bhawna)
* **Spreadsheet ID**: `166GBY-ACppPT9vFccLK1UJFKzO4KxeTGXxpUSMsrG5w`
* **Direct Google Sheet URL**: [Open Secondary Sheet in Google Sheets](https://docs.google.com/spreadsheets/d/166GBY-ACppPT9vFccLK1UJFKzO4KxeTGXxpUSMsrG5w/edit)
* **Coordinator**: Bhawna (`marketing@doctorsoap.com`)
* **Allocated Territories (Strict 4-State Scope)**:
  - Rajasthan, Gujarat, Bihar, Jharkhand
* **Core Tabs**:
  - Monthly accounting tabs (`Apr` through `Mar`)
  - Regional territory subtotal matrices

---

## 3. Official Codebase Architecture

```
MIS TA/
├── apps_script/                    # Apps Script Backend (.gs files)
│   ├── 01_Config.gs                # Centralized Sheet IDs & territory matrix
│   ├── 02_Router.gs                # doGet & doPost API request router
│   ├── 03_ClaimsService.gs         # Claims submission, audit, search & filters
│   ├── 04_DirectoryService.gs      # Staff employee directory service
│   ├── 05_StatewiseCosting.gs      # Real-time state-wise costing matrix
│   ├── 06_Automation.gs            # Monthly rollover, lock toggle, column format
│   ├── 07_AuthService.gs           # Authentication, User Sheet, Drive Logo upload
│   ├── 08_DirectCombine.gs         # Multi-sheet aggregation utilities
│   ├── appsscript.json             # Manifest with OAuth Scopes (Spreadsheets + Drive)
│   └── Index.html                  # Inlined single-page web app bundle
│
├── src/                            # React Frontend Source Code
│   ├── components/                 # Sidebar, Topbar, Modals, StatewiseMatrixTable
│   ├── pages/                      # SubmitClaim, ClaimsExplorer, Analytics, Settings, Automation
│   ├── services/                   # storage.js, auth.js, currency.js, masterData.js
│   ├── App.jsx                     # Top-level routing & layout wrapper
│   └── index.css                   # Responsive theme styling & glassmorphism
│
├── scripts/
│   └── inline-for-appscript.js     # Bundles dist/ into apps_script/Index.html
├── .clasp.json                     # Google Clasp project link configuration
└── package.json                    # Project dependencies & build scripts
```

---

## 4. Official Deployment & Maintenance Workflow

To update the official live web application, execute these commands in PowerShell:

### Step 1: Build Frontend
```powershell
npm run build
```

### Step 2: Inline Assets for Google Apps Script
```powershell
node scripts/inline-for-appscript.js
```

### Step 3: Push to Apps Script
```powershell
npx @google/clasp push --force
```

### Step 4: Verify in Dev Test Deployment
Always test changes first at:  
👉 `https://script.google.com/a/macros/doctorsoap.com/s/1ouE8kYLKAbIi4vklT0v0uCOTJKG2UTeuhqaBpCc_dNJlDM1jdtzJYvCA/dev`

### Step 5: Create a Production Release (When Ready)
To update the permanent versioned production URL:
```powershell
npx @google/clasp deploy --description "Release v2.5 - Circular Logo, Full Collapse & DB Icons"
```

---

## 5. Security & Access Rules Enforced

1. **Role-Based Scoping**:
   - `Admin`: Unrestricted access across all 14 territories, sheet automation, lock/unlock months, and user permissions.
   - `Bharti`: Scoped strictly to North & Central India states.
   - `Bhawna`: Scoped strictly to Rajasthan, Gujarat, Bihar, and Jharkhand.
2. **Hidden Security Tabs**:
   - The `Users` tab is automatically hidden and protected with sheet-level protection in Google Sheets.
3. **Google Drive Company Branding**:
   - Company logos uploaded via the **Settings** menu are automatically uploaded to Google Drive folder `TA_Portal_Assets` with public view access and rendered securely across the portal.
