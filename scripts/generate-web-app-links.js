import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PRIMARY_SCRIPT_ID = '1ouE8kYLKAbIi4vklT0v0uCOTJKG2UTeuhqaBpCc_dNJlDM1jdtzJYvCA';
const SECONDARY_SCRIPT_ID = '1dDw7A2kMdHQYwKcK_FqwDhqIM6btoDZHtOdhZpJOMeAohBLsXLs7TB-M';

const PRIMARY_FALLBACK_DEPLOYMENT = 'AKfycbzVFMEJbzicH-8Euoe2k12ZizgFuGA1C6B7T9tZo9Y8yBGME0DWVGsyGW1cd9CHJkew';
const SECONDARY_FALLBACK_DEPLOYMENT = 'AKfycbz8epB3cpne2BJDxX57tGV7hpcMCAR4tOkmIctQkeYYGI1cuVKCbA1Ws_dgMBuroIdphA';

function getLatestDeployment(folderPath, fallbackId) {
  try {
    const output = execSync('npx @google/clasp deployments', {
      cwd: folderPath,
      encoding: 'utf8',
      timeout: 15000,
      stdio: ['pipe', 'pipe', 'ignore']
    });

    const lines = output.split('\n');
    const deploymentIds = [];
    for (const line of lines) {
      const match = line.match(/- ([A-Za-z0-9_-]{30,}) @(\d+)/);
      if (match) {
        deploymentIds.push({ id: match[1], version: parseInt(match[2], 10) });
      }
    }
    if (deploymentIds.length > 0) {
      deploymentIds.sort((a, b) => b.version - a.version);
      return deploymentIds[0].id;
    }
  } catch (err) {
    // If clasp CLI fails or times out, fallback to known deployment ID
  }
  return fallbackId;
}

export function generateLinks() {
  const primaryFolder = path.resolve('apps_script');
  const primaryDeploymentId = getLatestDeployment(primaryFolder, PRIMARY_FALLBACK_DEPLOYMENT);
  const secondaryDeploymentId = SECONDARY_FALLBACK_DEPLOYMENT;

  const linksData = {
    generatedAt: new Date().toISOString(),
    primary: {
      name: 'Link-1 / MIS Admin & Bharti Portal',
      scriptId: PRIMARY_SCRIPT_ID,
      deploymentId: primaryDeploymentId,
      devUrlDoctorSoap: `https://script.google.com/a/macros/doctorsoap.com/s/${PRIMARY_SCRIPT_ID}/dev`,
      devUrlStandard: `https://script.google.com/macros/s/${PRIMARY_SCRIPT_ID}/dev`,
      execUrl: `https://script.google.com/macros/s/${primaryDeploymentId}/exec`,
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY/edit'
    },
    secondary: {
      name: 'Link-2 / Bhawna Portal (Rajasthan, Bihar, Jharkhand, Gujarat)',
      scriptId: SECONDARY_SCRIPT_ID,
      deploymentId: secondaryDeploymentId,
      devUrlDoctorSoap: `https://script.google.com/a/macros/doctorsoap.com/s/${SECONDARY_SCRIPT_ID}/dev`,
      devUrlStandard: `https://script.google.com/macros/s/${SECONDARY_SCRIPT_ID}/dev`,
      execUrl: `https://script.google.com/macros/s/${secondaryDeploymentId}/exec`,
      sheetUrl: 'https://docs.google.com/spreadsheets/d/166GBY-ACppPT9vFccLK1UJFKzO4KxeTGXxpUSMsrG5w/edit'
    }
  };

  // 1. Write web_app_links.json for Web App frontend
  const jsonPath = path.resolve('src/services/webAppUrls.json');
  fs.writeFileSync(jsonPath, JSON.stringify(linksData, null, 2), 'utf8');

  // 2. Write WEB_APP_LINKS.md in root directory for instant one-click access
  const mdContent = `# 🚀 TA-DA Portal — Enterprise Management Information System

*Auto-generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)*

---

## ⚡ TEST DEPLOYMENT MODE (Live Testing — Runs Latest Code Immediately)
> **How Test Deployment Works:**
> Whenever changes are pushed via \`npm run deploy\`, the latest code is saved directly into Google Apps Script. 
> The **Test Deployment (\`/dev\`) links below automatically and immediately execute the latest saved code** without requiring any manual deployment step. You can use these links to test and verify everything.

| Portal | Test Deployment URL (\`/dev\`) | Multi-Account Test URL |
| :--- | :--- | :--- |
| 👑 **Admin Master Portal** | [Open Admin Test Portal](${linksData.primary.devUrlDoctorSoap}?portal=admin) | [Multi-Account Admin](${linksData.primary.devUrlStandard}?portal=admin) |
| 🔵 **Link-1: Bharti Portal** | [Open Bharti Test Portal](${linksData.primary.devUrlDoctorSoap}) | [Multi-Account Bharti](${linksData.primary.devUrlStandard}) |
| 🟣 **Link-2: Bhawna Portal** | [Open Bhawna Test Portal](${linksData.primary.devUrlDoctorSoap.replace(PRIMARY_SCRIPT_ID, SECONDARY_SCRIPT_ID)}) | [Multi-Account Bhawna](${linksData.secondary.devUrlStandard}) |

---

## 🛠️ HOW TO MANUALLY DEPLOY (Once Testing Is Complete)
When you are satisfied with testing in the \`/dev\` URLs and want to publish a formal production version:

1. **For Link-1 (Primary Script / Bharti & Admin):**
   * 👉 [Open Link-1 Apps Script Editor](https://script.google.com/home/projects/${PRIMARY_SCRIPT_ID}/edit)
   * Click the blue **Deploy** button (top right) ➔ Select **New deployment** (or **Manage deployments**).
   * Select type: **Web app**.
   * Set **Execute as:** \`Me\` (your account).
   * Set **Who has access:** \`Anyone with Google account\` (or \`Anyone within doctorsoap.com\`).
   * Click **Deploy**.

2. **For Link-2 (Secondary Script / Bhawna):**
   * 👉 [Open Link-2 Apps Script Editor](https://script.google.com/home/projects/${SECONDARY_SCRIPT_ID}/edit)
   * Click the blue **Deploy** button (top right) ➔ Select **New deployment**.
   * Select type: **Web app**, set Execute as: \`Me\`, Who has access, and click **Deploy**.

---

## 📊 Connected Google Sheets

| Sheet | GID / Tab | URL |
| :--- | :--- | :--- |
| **Primary Spreadsheet (TA Bill 2026:- 1)** | All Tabs | [Open Link-1 Sheet](${linksData.primary.sheetUrl}) |
| **Users Database Sheet** | GID 1972170937 | [Open Users Tab](${linksData.primary.sheetUrl}#gid=1972170937) |
| **Secondary Spreadsheet (TA Bill 2026:- 2)** | All Tabs | [Open Link-2 Sheet](${linksData.secondary.sheetUrl}) |

---

### 🔒 Security & Login Summary
- **Regular Users (Bharti & Bhawna):** Email and password start empty. No quick account buttons are visible. Credentials authorize against the Users sheet ([GID 1972170937](https://docs.google.com/spreadsheets/d/1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY/edit?gid=1972170937#gid=1972170937)).
- **Admin:** Accessing with \`?portal=admin\` (or typing \`mis@doctorsoap.com\`) enables the Admin Quick Select bar for 1-click access to Admin, Bharti, and Bhawna.
`;

  const mdPath = path.resolve('WEB_APP_LINKS.md');
  fs.writeFileSync(mdPath, mdContent, 'utf8');

  // Print prominent banner to console
  console.log('\n================================================================================');
  console.log('🎉 LIVE WEB APP LINKS AUTO-GENERATED SUCCESSFULLY!');
  console.log('================================================================================');
  console.log('🔵 LINK-1 (MIS ADMIN & BHARTI):');
  console.log('   👉 Live Web App: ' + linksData.primary.devUrlDoctorSoap);
  console.log('   🌐 Multi-Account: ' + linksData.primary.devUrlStandard);
  console.log('--------------------------------------------------------------------------------');
  console.log('🟣 LINK-2 (BHAWNA - RAJ, GUJ, BIH, JHK):');
  console.log('   👉 Live Web App: ' + linksData.secondary.devUrlDoctorSoap);
  console.log('   🌐 Multi-Account: ' + linksData.secondary.devUrlStandard);
  console.log('================================================================================');
  console.log('📄 Saved to clickable markdown file: WEB_APP_LINKS.md\n');

  return linksData;
}

// Execute if run directly
if (process.argv[1] && process.argv[1].endsWith('generate-web-app-links.js')) {
  generateLinks();
}
