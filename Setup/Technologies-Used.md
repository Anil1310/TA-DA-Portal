# Technologies Used
**Project**: MIS TA-DA Enterprise Management Portal  
**Document**: `Setup/Technologies-Used.md`  
**Classification**: Software Architecture & Technology Specification  

---

## 1. Executive Summary

The MIS TA-DA Portal is engineered as a high-performance, full-stack cloud web application. It leverages a modern client-side React single-page application (SPA) architecture combined with a serverless Google Cloud / Google Apps Script backend and Google Sheets as a real-time, zero-maintenance database.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        1. CLIENT LAYER (BROWSER)                       │
│      React 18 • Modern JavaScript (ES6+) • CSS3 • HTML5 • Lucide       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ JSON / RESTful API Requests
┌───────────────────────────────────▼────────────────────────────────────┐
│                  2. SERVERLESS BACKEND (GOOGLE CLOUD)                  │
│       Google Apps Script (V8 Engine) • doGet() / doPost() Router       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Native Google Workspace APIs
┌───────────────────────────────────▼────────────────────────────────────┐
│                    3. DATABASE & CLOUD ASSET STORAGE                   │
│      Google Sheets (Relational Database) • Google Drive (Asset CDN)    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Complete Breakdown of Technologies Used

### 🖥️ 1. Frontend Technologies (User Interface)
* **React 18**:
  - Declarative component-based UI architecture.
  - Reactive state management using React Hooks (`useState`, `useEffect`, `useMemo`, `useCallback`).
  - Single-Page Application (SPA) routing without full-page reloads.
* **JavaScript (ECMAScript 2022+ / ES6+)**:
  - Core programming language for client logic.
  - Native asynchronous data handling (`async`/`await`, Promises).
* **HTML5 & JSX**:
  - Semantic markup structure, accessible forms, and dynamic component rendering.
* **CSS3 & UI Design System**:
  - Custom styling in `src/index.css` (no heavy third-party CSS bloat).
  - Modern layout engines: **CSS Flexbox** and **CSS Grid**.
  - CSS custom properties (variables) for uniform themes and borders.
  - Glassmorphism elevation, smooth transitions, and responsive mobile adaptations.
* **Lucide React**:
  - High-resolution SVG vector iconography.

---

### ⚙️ 2. Backend Technologies (Serverless Logic & API)
* **Google Apps Script (V8 JavaScript Engine)**:
  - High-speed, serverless cloud runtime hosted entirely on Google infrastructure.
  - Automatic horizontal scaling with zero server maintenance, zero OS patching, and zero cloud hosting bills.
* **REST-Style API Gateway (`doGet` / `doPost`)**:
  - Custom action-based routing (`action=getClaims`, `action=submitClaim`, `action=uploadLogo`, etc.).
  - Robust error handling returning standardized JSON payloads (`{ success, data, message }`).
* **Role-Based Access Control (RBAC) Engine**:
  - Fine-grained permission verification for Admin, Sales Coordinators (Bharti, Bhawna), and standard staff.
  - Strict multi-territory data isolation.

---

### 🗄️ 3. Database & Cloud Storage Technologies
* **Google Sheets API (`SpreadsheetApp`)**:
  - Serves as the primary real-time, collaborative database.
  - High-efficiency range batching (`getValues` / `setValues`) to avoid quota bottlenecks.
  - Multi-sheet relational data partitioning (Primary vs Secondary 4-State Matrix).
  - Programmatic sheet locking (`protect()`) to freeze reconciled accounting months.
* **Google Drive API (`DriveApp`)**:
  - Automated cloud asset repository (`TA_Portal_Assets`).
  - Base64-to-image decoding and public viewer thumbnail delivery.
* **Properties Service (`ScriptProperties`)**:
  - Key-value persistent storage for company branding, locked months list, and system flags.

---

### 🛠️ 4. Build, Bundling & DevOps Tools
* **Node.js**:
  - Development runtime and execution environment for build scripts.
* **npm (Node Package Manager)**:
  - Manages dependencies and script triggers.
* **Vite 5**:
  - High-speed bundler and development build tool with Rollup asset minification.
* **Google Clasp (`@google/clasp`)**:
  - Command-line interface for local-to-cloud bidirectional code synchronization, testing, and production deployment.
* **Custom Asset Compiler (`scripts/inline-for-appscript.js`)**:
  - Compiles multi-file React JS, CSS, and HTML assets into a single self-contained `apps_script/Index.html` file suitable for deployment on Google's cloud servers.

---

## 3. Technology Summary Table

| Category | Technology Used | Version / Spec | Primary Role |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **React** | 18.3+ | Interactive User Interface & Forms |
| **Client Language** | **JavaScript (ES6+)** | Modern ECMAScript | Application Logic & State Flow |
| **Styling** | **CSS3** | Modern Specification | Theme, Animations & Responsive Layout |
| **Icons** | **Lucide React** | 0.344+ | UI Vector Icons |
| **Server Runtime** | **Google Apps Script** | Modern V8 Engine | Serverless Backend & API Routing |
| **Database** | **Google Sheets** | Cloud Spreadsheet DB | Relational Claims & User Data Storage |
| **File Storage** | **Google Drive** | Cloud Storage | Company Logos & Media Assets |
| **Build Tool** | **Vite** | 5.4+ | Frontend Compilation & Minification |
| **Package Manager**| **npm** | Node.js ecosystem | Dependency Management |
| **DevOps CLI** | **Google Clasp** | 2.4+ | Push, Versioning & Cloud Deployment |
