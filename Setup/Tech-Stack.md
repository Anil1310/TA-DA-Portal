# Technology Stack (Tech-Stack.md)
**Project**: MIS TA-DA Enterprise Management Portal  
**Document**: `Setup/Tech-Stack.md`  
**Classification**: Official Tech Stack & Systems Architecture Specification  

---

## 1. High-Level Architecture Overview

The MIS TA-DA Portal is an enterprise-grade cloud application built with a **Full-Stack JavaScript** architecture. It pairs a reactive, high-speed **React 18 Single-Page Application (SPA)** frontend with a zero-maintenance **Google Apps Script** serverless backend, utilizing **Google Sheets** as an ACID-compliant collaborative database.

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

## 2. Complete Tech Stack Breakdown

### 🖥️ 1. Frontend Layer (User Interface & Client Logic)
* **UI Framework**: **React 18** (`react`, `react-dom` v18.3+)
  - Functional component hierarchy with reactive hooks (`useState`, `useEffect`, `useMemo`, `useCallback`).
  - Client-side navigation & view routing without browser reloads.
  - Interactive state management for claims data grids, territory filters, and modal dialogues.
* **Programming Language**: **JavaScript (ECMAScript 2022+ / ES6+)**
  - Native asynchronous flows with `async`/`await` and Promises.
  - Array & object transformations (`map`, `filter`, `reduce`) for real-time cost pivots.
* **Markup & Templating**: **HTML5 & JSX** (JavaScript XML)
  - Accessible form controls, dynamic tables, and responsive layout wrappers.
* **Styling & Design System**: **CSS3**
  - Custom styles in `src/index.css` (zero heavy third-party CSS bloat).
  - Modern layout engines: **CSS Flexbox** & **CSS Grid**.
  - CSS Custom Properties (variables) for consistent themes, colors, and elevations.
  - Glassmorphism elevation, smooth cubic-bezier transitions, and mobile responsiveness.
* **Vector Iconography**: **Lucide React**
  - Crisp, scalable SVG vector icons (`lucide-react`).

---

### ⚙️ 2. Backend & Serverless Runtime Layer
* **Cloud Runtime**: **Google Apps Script (V8 Engine)**
  - Google's high-speed V8 JavaScript runtime hosted in Google Cloud data centers.
  - Automatically scales horizontally with zero server maintenance, zero OS patching, and zero cloud hosting charges.
* **API Gateway & Routing**: **REST-Style HTTP Handler**
  - Action-based request dispatcher via `doGet(e)` and `doPost(e)` entry points.
  - Standardized JSON responses (`{ success: true/false, data, message }`).
* **Security & Authorization**: **Role-Based Access Control (RBAC)**
  - Dynamic permission validation for Admin, Sales Coordinators (Bharti, Bhawna), and standard field staff.
  - Multi-territory scope enforcement preventing cross-region data pollution.

---

### 🗄️ 3. Database & Cloud Storage Layer
* **Primary Relational Database**: **Google Sheets API (`SpreadsheetApp`)**
  - Serves as the real-time cloud database for all claims, employee directories, and monthly records.
  - High-performance contiguous range batching (`getValues()` / `setValues()`) to prevent API quota limits.
  - Automated monthly tab rollover, Calibri 10 font enforcement, and row formatting.
  - Programmatic sheet protection (`protect()`) to lock reconciled accounting months against tampering.
* **Object & Media Storage**: **Google Drive API (`DriveApp`)**
  - Dedicated asset directory: `TA_Portal_Assets`.
  - Base64-to-binary image decoding for company branding logos.
  - Generates public CDN thumbnail URLs with high uptime.
* **Persistent Configuration Store**: **Google Apps Script `ScriptProperties`**
  - Secure key-value storage for branding metadata, locked months lists, and runtime flags.

---

### 🛠️ 4. Build, Bundling & DevOps Tooling
* **Package Manager**: **npm** (Node Package Manager)
* **Local Runtime for Scripts**: **Node.js**
* **Frontend Build Tool**: **Vite 5**
  - Extremely fast compilation, Hot Module Replacement (HMR), and Rollup production asset minification.
* **Cloud Deployment CLI**: **Google Clasp (`@google/clasp`)**
  - CLI tool for bidirectional synchronization, testing, and production deployments between local Git repositories and Google Apps Script projects.
* **Custom Asset Compiler**: **Single-File Inlining Engine (`scripts/inline-for-appscript.js`)**
  - Custom Node.js compiler that converts Vite's multi-file JS/CSS output into a single, self-contained `apps_script/Index.html` bundle suitable for deployment on Google Apps Script servers.

---

## 3. Technology Specification Matrix

| Layer | Component | Technology Used | Version / Spec |
| :--- | :--- | :--- | :--- |
| **Frontend** | UI Library | **React** | `^18.3.1` |
| **Frontend** | Programming Language | **JavaScript (ES6+) / JSX** | ECMAScript 2022+ |
| **Frontend** | Styling & Theme | **CSS3** | Modern W3C Spec |
| **Frontend** | Vector Icons | **Lucide React** | `^0.344.0` |
| **Backend** | Cloud Runtime | **Google Apps Script** | Google V8 Engine |
| **Backend** | Server-Side Language | **JavaScript** | ES6 / V8 |
| **Database** | Relational Claims DB | **Google Sheets API** | `SpreadsheetApp` |
| **Storage** | Object / File Storage | **Google Drive API** | `DriveApp` |
| **Build Tool** | Bundler & Minifier | **Vite** | `^5.4.21` |
| **Package Tool**| Package Ecosystem | **npm / Node.js** | LTS |
| **DevOps** | Cloud CLI Sync | **Google Clasp** | `@google/clasp` |

---

## 4. Key Architectural Strengths

1. **Zero Infrastructure Costs**: Runs 100% free on Google Cloud / Apps Script quotas with zero recurring server hosting or database costs.
2. **Direct Collaborative Database**: Management can view and edit raw claims in Google Sheets while field staff interact through the high-speed web portal.
3. **Single-File Monolithic Deployment**: Easily deployed and maintained across personal (`@gmail.com`) or corporate Google Workspace (`@doctorsoap.com`) accounts with one single `clasp push` command.
