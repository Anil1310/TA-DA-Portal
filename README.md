# MIS TA-DA Portal — Pee Cee Cosma Pvt. Ltd. (Doctor Soap)
**Platform**: Google Apps Script + React 18 (Vite) + Google Sheets + Supabase  
**Developer**: Dev. Anil Kumar Chahar (8126390611)  
**Version**: v2.5 Cloud Edition  

A modern, multi-page enterprise Traveling Allowance (TA-DA) expense management platform built for **Pee Cee Cosma Pvt. Ltd.**, synchronized live with **Google Sheets** and optional **Supabase PostgreSQL**.

---

## 🔗 Live Deployments & Connected Sheets

| Resource | Value / Link | Notes |
| :--- | :--- | :--- |
| **GitHub Pages Live App** | [https://anil1310.github.io/TA-DA-Portal/](https://anil1310.github.io/TA-DA-Portal/) | Hosted 24/7 on GitHub Cloud |
| **GitHub Repository** | [https://github.com/Anil1310/TA-DA-Portal](https://github.com/Anil1310/TA-DA-Portal) | Source Code & CI/CD Pipeline |
| **Primary Script ID** | `1ouE8kYLKAbIi4vklT0v0uCOTJKG2UTeuhqaBpCc_dNJlDM1jdtzJYvCA` | Linked via `.clasp.json` |
| **Primary Sheet (DB-1)** | [`1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY`](https://docs.google.com/spreadsheets/d/1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY/edit) | Bharti & Admin (North & Central India) |
| **Secondary Sheet (DB-2)** | [`166GBY-ACppPT9vFccLK1UJFKzO4KxeTGXxpUSMsrG5w`](https://docs.google.com/spreadsheets/d/166GBY-ACppPT9vFccLK1UJFKzO4KxeTGXxpUSMsrG5w/edit) | Bhawna (Rajasthan, Gujarat, Bihar, Jharkhand) |
| **Live Dev Web App** | [Open Live Dev Deployment](https://script.google.com/a/macros/doctorsoap.com/s/1ouE8kYLKAbIi4vklT0v0uCOTJKG2UTeuhqaBpCc_dNJlDM1jdtzJYvCA/dev) | Google Cloud test link |

---

## ⚡ 1-Click Desktop Automation Scripts

* **`Deploy_To_Google_Cloud.bat`**: Double-click to automatically build the React bundle, inline it, and push live to Google Cloud.
* **`Start_Local_Preview.bat`**: Double-click to start local development server at `http://localhost:5173`.

---

## 🧭 Multi-Page Architecture

1. **📄 Submit TA Claim (`/submit`)**:
   - 12-Month expense selector (`Apr` to `Mar`).
   - Sales representative auto-fill, territory matrix validation, and live Indian Rupee words converter.
2. **📊 Claims Explorer & Audit Grid (`/claims`)**:
   - Comprehensive search, filters by month & territory, voucher printing, CSV export, and quick lock status.
3. **📈 Executive Analytics (`/analytics`)**:
   - Real-time expense metrics, month-on-month trend charts, and state budget distribution.
4. **👥 Staff & Territories (`/directory`)**:
   - Sales representative employee directory and territory assignments.
5. **⚡ Sheet Automation (`/automation`)**:
   - Monthly tab generator, automated state subtotals, Row 2 Master tab compilation, and month locking.
6. **⚙️ Settings & Permissions (`/settings`)**:
   - Company branding with automatic Google Drive upload to `TA_Portal_Assets`.
   - Granular RBAC permission toggles for user delegation.
   - ⚡ Supabase PostgreSQL cloud database configuration & 1-click SQL schema generator.

---

## 📁 Reusable Architecture & Documentation

All architectural standards and migration guides are located in the **[`Setup/`](./Setup/)** directory:
* **[Setup/PRD.md](./Setup/PRD.md)**: Master Reusable Product Requirements Document.
* **[Setup/Tech-Stack.md](./Setup/Tech-Stack.md)**: Full technology specification & system architecture.
* **[Setup/Supabase-Setup.md](./Setup/Supabase-Setup.md)**: Supabase PostgreSQL integration guide.
* **[Setup/Personal-Setup.md](./Setup/Personal-Setup.md)**: Personal Google Account (`@gmail.com`) migration guide.
* **[Setup/Official-Setup.md](./Setup/Official-Setup.md)**: Official Google Workspace (`@doctorsoap.com`) deployment guide.

---

## 📜 Attribution

```
© 2026 Designed & Engineered by Dev. Anil Kumar Chahar • 8126390611 • v2.5 Cloud Edition
```
