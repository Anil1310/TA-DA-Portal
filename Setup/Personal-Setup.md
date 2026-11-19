# Personal Account Setup & Migration Guide
**Target Environment**: Personal Google Account (`@gmail.com`)  
**Portal Name**: MIS TA-DA Portal  
**Platform**: Google Apps Script + React (Vite) + Google Sheets  
**Version**: v2.5 Cloud Edition  

---

## 1. Overview: Running on a Personal Account

You can run this complete MIS TA-DA web app entirely inside your **personal Google account (`@gmail.com`)** without needing a paid Google Workspace domain.

### Key Advantages of Personal Account Setup:
* **No Domain Firewalls**: No Google Workspace domain restrictions or internal-only blocks.
* **Anyone with Link Access**: Standard users (e.g. staff, coordinators, data entry) can access the portal and submit claims without needing access to your personal Google Drive or Google account.
* **Completely Free**: Google Apps Script and Google Sheets are 100% free with standard consumer Google quotas.

---

## 2. Step 1: Prepare the Google Sheets in Personal Google Drive

1. Log into your personal Google account at [drive.google.com](https://drive.google.com).
2. Either **create new sheets** or **make copies** of the official sheets:
   - **Sheet 1 (Primary / Link-1)**: Main expense sheet (contains `Master`, monthly tabs like `Apr`, `May`... `Mar`, and the hidden `Users` tab).
   - **Sheet 2 (Secondary / Link-2)**: Secondary expense sheet (for Bhawna / 4 states: Rajasthan, Gujarat, Bihar, Jharkhand).
   - **Sheet 3 (Statewise / Direct Combine)** *(if maintained as a separate standalone sheet)*.
3. In **Sheet 1**, ensure the **`Users`** tab exists (or let the web app auto-seed it on first load). The `Users` tab format:
   - Row 1 Headers: `Email` | `Password` | `Name` | `Role` | `Status` | `Allowed States|Scope` | `Created At` | `Last Login`
   - Add your personal admin login (e.g., `yourpersonal@gmail.com`, `yourpassword`, `Your Name`, `admin`, `Active`, `All`).
4. Copy the **Spreadsheet IDs** from each sheet's URL in your browser:
   `https://docs.google.com/spreadsheets/d/`**`1ABCxyz...`**`/edit`

---

## 3. Step 2: Update the Sheet IDs in Code

Update the Spreadsheet IDs in the following 3 files:

### A. Backend Configuration
📁 File: [apps_script/01_Config.gs](file:///c:/Users/docto/OneDrive/Desktop/MIS%20TA/apps_script/01_Config.gs#L10-L16)
```javascript
const CONFIG = {
  SPREADSHEET_ID: 'YOUR_PERSONAL_PRIMARY_SHEET_ID',
  SECONDARY_SPREADSHEET_ID: 'YOUR_PERSONAL_SECONDARY_SHEET_ID',
  SPREADSHEET_IDS: [
    'YOUR_PERSONAL_PRIMARY_SHEET_ID',
    'YOUR_PERSONAL_SECONDARY_SHEET_ID'
  ],
  ...
};
```

### B. Authentication Service
📁 File: [apps_script/07_AuthService.gs](file:///c:/Users/docto/OneDrive/Desktop/MIS%20TA/apps_script/07_AuthService.gs#L17)
```javascript
const USERS_CONFIG = {
  SHEET_NAME: 'Users',
  TARGET_SHEET_GID: 1972170937,
  PRIMARY_SPREADSHEET_ID: 'YOUR_PERSONAL_PRIMARY_SHEET_ID', // <--- Update here
  ...
};
```

### C. Frontend Default Storage Config
📁 File: [src/services/storage.js](file:///c:/Users/docto/OneDrive/Desktop/MIS%20TA/src/services/storage.js#L13-L16)
```javascript
const DEFAULT_CONFIG = {
  spreadsheetId: 'YOUR_PERSONAL_PRIMARY_SHEET_ID',
  secondarySpreadsheetId: 'YOUR_PERSONAL_SECONDARY_SHEET_ID',
  spreadsheetIds: [
    'YOUR_PERSONAL_PRIMARY_SHEET_ID',
    'YOUR_PERSONAL_SECONDARY_SHEET_ID'
  ],
  ...
};
```

---

## 4. Step 3: Switch Clasp to Your Personal Google Account

Because your current `.clasp.json` is linked to the Workspace account, switch your local clasp authentication to your personal Gmail:

### 1. Enable Google Apps Script API
Before using clasp on your personal account, enable the API:
👉 Open [script.google.com/home/usersettings](https://script.google.com/home/usersettings) in your personal account and toggle **"Google Apps Script API"** to **ON**.

### 2. Log Out and Log In via Terminal
Open PowerShell in the project directory (`c:\Users\docto\OneDrive\Desktop\MIS TA`) and run:
```powershell
npx @google/clasp logout
npx @google/clasp login
```
*(A browser window will open. Sign in with your personal `@gmail.com` account and authorize Google Clasp).*

### 3. Create a New Apps Script Project
Run the create command:
```powershell
npx @google/clasp create --title "Personal MIS TA-DA Portal" --type webapp --rootDir ./apps_script
```
*(This automatically creates a new Apps Script container in your personal Google Drive and updates `.clasp.json` with the new personal Script ID).*

---

## 5. Step 4: Build, Inline & Push

Compile the React application into the single-file Apps Script bundle and push:

```powershell
# 1. Build the production React bundle
npm run build

# 2. Inline HTML, CSS, and JS into apps_script/Index.html
node scripts/inline-for-appscript.js

# 3. Push code to your new personal Google Apps Script project
npx @google/clasp push --force
```

---

## 6. Step 5: Deploy the Web App in Personal Gmail

1. Open the project directly in your browser:
   ```powershell
   npx @google/clasp open
   ```
2. In the Apps Script editor:
   - Click the blue **Deploy** button (top right) ➔ **New deployment**.
   - Select type: **Web app** (gear icon).
   - Configure the deployment settings:
     - **Description**: `Personal Production Release v1.0`
     - **Execute as**: `Me (yourpersonal@gmail.com)` ⚠️ **CRITICAL**
     - **Who has access**: `Anyone` ⚠️ **CRITICAL**
3. Click **Deploy**.
4. When prompted, click **Authorize Access**:
   - Choose your personal Gmail account.
   - If Google shows *"Google hasn’t verified this app"*, click **Advanced** (bottom left) ➔ **Go to Personal MIS TA-DA Portal (unsafe)**.
   - Click **Allow**.
5. Copy your new **Web app URL**:
   `https://script.google.com/macros/s/AKfycb.../exec`

> [!IMPORTANT]
> Always set **Who has access** to **"Anyone"**. This allows Bharti, Bhawna, and other team members to open the portal link and log in with their portal credentials without being forced to have edit rights to your personal Google Drive.

---

## 7. Step 6: Verify Everything Works

1. Open your personal Web App URL in an Incognito/Private window.
2. Log in using your Admin credentials created in the `Users` tab.
3. Test the following:
   - **Submit Claim**: Submit a test claim and confirm the row appears in your personal Google Sheet.
   - **Claims Explorer**: Verify claims load correctly from the sheets.
   - **DB Buttons**: Click the **DB** / **DB-1** / **DB-2** buttons in the Topbar to verify they open your personal Google Sheets.
   - **Branding**: Go to **Settings ➔ Company Branding**, upload your logo, and confirm it stores in your personal Google Drive (`TA_Portal_Assets`).
