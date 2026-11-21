# 🚀 TA-DA Portal — Enterprise Management Information System

*Auto-generated on: 21/11/2026, 11:29:55 am (IST)*

---

## ⚡ TEST DEPLOYMENT MODE (Live Testing — Runs Latest Code Immediately)
> **How Test Deployment Works:**
> Whenever changes are pushed via `npm run deploy`, the latest code is saved directly into Google Apps Script. 
> The **Test Deployment (`/dev`) links below automatically and immediately execute the latest saved code** without requiring any manual deployment step. You can use these links to test and verify everything.

| Portal | Test Deployment URL (`/dev`) | Multi-Account Test URL |
| :--- | :--- | :--- |
| 👑 **Admin Master Portal** | [Open Admin Test Portal](https://script.google.com/a/macros/doctorsoap.com/s/1ouE8kYLKAbIi4vklT0v0uCOTJKG2UTeuhqaBpCc_dNJlDM1jdtzJYvCA/dev?portal=admin) | [Multi-Account Admin](https://script.google.com/macros/s/1ouE8kYLKAbIi4vklT0v0uCOTJKG2UTeuhqaBpCc_dNJlDM1jdtzJYvCA/dev?portal=admin) |
| 🔵 **Link-1: Bharti Portal** | [Open Bharti Test Portal](https://script.google.com/a/macros/doctorsoap.com/s/1ouE8kYLKAbIi4vklT0v0uCOTJKG2UTeuhqaBpCc_dNJlDM1jdtzJYvCA/dev) | [Multi-Account Bharti](https://script.google.com/macros/s/1ouE8kYLKAbIi4vklT0v0uCOTJKG2UTeuhqaBpCc_dNJlDM1jdtzJYvCA/dev) |
| 🟣 **Link-2: Bhawna Portal** | [Open Bhawna Test Portal](https://script.google.com/a/macros/doctorsoap.com/s/1dDw7A2kMdHQYwKcK_FqwDhqIM6btoDZHtOdhZpJOMeAohBLsXLs7TB-M/dev) | [Multi-Account Bhawna](https://script.google.com/macros/s/1dDw7A2kMdHQYwKcK_FqwDhqIM6btoDZHtOdhZpJOMeAohBLsXLs7TB-M/dev) |

---

## 🛠️ HOW TO MANUALLY DEPLOY (Once Testing Is Complete)
When you are satisfied with testing in the `/dev` URLs and want to publish a formal production version:

1. **For Link-1 (Primary Script / Bharti & Admin):**
   * 👉 [Open Link-1 Apps Script Editor](https://script.google.com/home/projects/1ouE8kYLKAbIi4vklT0v0uCOTJKG2UTeuhqaBpCc_dNJlDM1jdtzJYvCA/edit)
   * Click the blue **Deploy** button (top right) ➔ Select **New deployment** (or **Manage deployments**).
   * Select type: **Web app**.
   * Set **Execute as:** `Me` (your account).
   * Set **Who has access:** `Anyone with Google account` (or `Anyone within doctorsoap.com`).
   * Click **Deploy**.

2. **For Link-2 (Secondary Script / Bhawna):**
   * 👉 [Open Link-2 Apps Script Editor](https://script.google.com/home/projects/1dDw7A2kMdHQYwKcK_FqwDhqIM6btoDZHtOdhZpJOMeAohBLsXLs7TB-M/edit)
   * Click the blue **Deploy** button (top right) ➔ Select **New deployment**.
   * Select type: **Web app**, set Execute as: `Me`, Who has access, and click **Deploy**.

---

## 📊 Connected Google Sheets

| Sheet | GID / Tab | URL |
| :--- | :--- | :--- |
| **Primary Spreadsheet (TA Bill 2026:- 1)** | All Tabs | [Open Link-1 Sheet](https://docs.google.com/spreadsheets/d/1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY/edit) |
| **Users Database Sheet** | GID 1972170937 | [Open Users Tab](https://docs.google.com/spreadsheets/d/1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY/edit#gid=1972170937) |
| **Secondary Spreadsheet (TA Bill 2026:- 2)** | All Tabs | [Open Link-2 Sheet](https://docs.google.com/spreadsheets/d/166GBY-ACppPT9vFccLK1UJFKzO4KxeTGXxpUSMsrG5w/edit) |

---

### 🔒 Security & Login Summary
- **Regular Users (Bharti & Bhawna):** Email and password start empty. No quick account buttons are visible. Credentials authorize against the Users sheet ([GID 1972170937](https://docs.google.com/spreadsheets/d/1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY/edit?gid=1972170937#gid=1972170937)).
- **Admin:** Accessing with `?portal=admin` (or typing `mis@doctorsoap.com`) enables the Admin Quick Select bar for 1-click access to Admin, Bharti, and Bhawna.
