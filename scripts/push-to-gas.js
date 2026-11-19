import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';
import { generateLinks } from './generate-web-app-links.js';

const PRIMARY_SCRIPT_ID = '1ouE8kYLKAbIi4vklT0v0uCOTJKG2UTeuhqaBpCc_dNJlDM1jdtzJYvCA';
const SECONDARY_SCRIPT_ID = '1dDw7A2kMdHQYwKcK_FqwDhqIM6btoDZHtOdhZpJOMeAohBLsXLs7TB-M';

function getAccessToken() {
  try {
    const claspRcPath = path.join(process.env.USERPROFILE, '.clasprc.json');
    if (fs.existsSync(claspRcPath)) {
      const claspRc = JSON.parse(fs.readFileSync(claspRcPath, 'utf8'));
      return claspRc?.tokens?.default?.access_token || null;
    }
  } catch (e) {
    // Fall back to clasp CLI
  }
  return null;
}

function pushFolderWithApi(scriptId, folderPath, token) {
  return new Promise((resolve, reject) => {
    const filesToPush = [];
    const files = fs.readdirSync(folderPath);
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      if (fs.statSync(filePath).isDirectory()) continue;

      if (file === 'appsscript.json') {
        filesToPush.push({
          name: 'appsscript',
          type: 'JSON',
          source: fs.readFileSync(filePath, 'utf8')
        });
      } else if (file.endsWith('.gs')) {
        const baseName = path.basename(file, '.gs');
        filesToPush.push({
          name: baseName,
          type: 'SERVER_JS',
          source: fs.readFileSync(filePath, 'utf8')
        });
      } else if (file.endsWith('.html') || file.endsWith('.Html')) {
        const baseName = path.basename(file, path.extname(file));
        filesToPush.push({
          name: baseName,
          type: 'HTML',
          source: fs.readFileSync(filePath, 'utf8')
        });
      }
    }

    const payload = JSON.stringify({ files: filesToPush });
    const options = {
      hostname: 'script.googleapis.com',
      path: `/v1/projects/${scriptId}/content`,
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, res => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ success: true, count: filesToPush.length });
        } else {
          resolve({ success: false, status: res.statusCode, error: resBody });
        }
      });
    });

    req.on('error', err => resolve({ success: false, error: err.message }));
    req.write(payload);
    req.end();
  });
}

function pushWithClasp(scriptId) {
  const claspJsonPath = path.resolve('.clasp.json');
  fs.writeFileSync(claspJsonPath, JSON.stringify({
    scriptId,
    rootDir: './apps_script'
  }, null, 2));
  console.log(`Pushing to ${scriptId} via clasp CLI...`);
  try {
    execSync('npx @google/clasp push --force', {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    return true;
  } catch (e) {
    console.error(`Clasp push failed for ${scriptId}:`, e.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Pushing Code Changes to Google Apps Script (No Web App Deployment)...');

  try {
    // 1. Push Primary (Bharti / MIS Admin)
    console.log(`\n📦 [1/2] Pushing code to Primary Apps Script (${PRIMARY_SCRIPT_ID})...`);
    pushWithClasp(PRIMARY_SCRIPT_ID);

    // 2. Push Secondary (Bhawna) - both sheets use the exact same unified apps_script codebase
    console.log(`\n📦 [2/2] Pushing code to Secondary Apps Script (${SECONDARY_SCRIPT_ID})...`);
    pushWithClasp(SECONDARY_SCRIPT_ID);
  } finally {
    // Always restore Primary Script ID in root .clasp.json
    fs.writeFileSync(path.resolve('.clasp.json'), JSON.stringify({
      scriptId: PRIMARY_SCRIPT_ID,
      rootDir: './apps_script'
    }, null, 2));
  }

  // 3. Auto-generate final web app test links and write WEB_APP_LINKS.md
  console.log('\n🔗 Auto-generating test links in WEB_APP_LINKS.md...');
  generateLinks();

  console.log('\n✅ Push complete! No web app was deployed.');
  console.log('👉 You can now test your changes in Test Deployment mode (/dev).');
  console.log('👉 When you are ready, deploy manually via the Apps Script editor.');
}

main().catch(err => {
  console.error('Fatal deployment error:', err);
  process.exit(1);
});
