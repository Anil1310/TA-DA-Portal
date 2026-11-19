import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const assetsDir = path.join(distDir, 'assets');
const targetFile = path.resolve('apps_script', 'Index.html');

// Read CSS
const cssFiles = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir).filter(f => f.endsWith('.css')) : [];
let allCss = '';
for (const f of cssFiles) {
  allCss += fs.readFileSync(path.join(assetsDir, f), 'utf-8') + '\n';
}

// Read JS
const jsFiles = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir).filter(f => f.endsWith('.js')) : [];
let allJs = '';
for (const f of jsFiles) {
  allJs += fs.readFileSync(path.join(assetsDir, f), 'utf-8') + '\n';
}

// Base64 encode the bundle to make it 100% immune to Google Apps Script's
// document.write parser quirks (no unescaped quotes, slashes, or newlines).
const jsBase64 = Buffer.from(allJs, 'utf-8').toString('base64');

// Construct clean standalone HTML compatible with Google Apps Script sandbox
const finalHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <base target="_top" />
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>TA-DA Portal | Enterprise Management Information System</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
${allCss}
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
    <script>
      // Force scheduler fallback to setTimeout in sandboxed iframes
      try {
        if (typeof window !== 'undefined') {
          window.MessageChannel = undefined;
        }
      } catch (e) {}

      // Global error trapper for Google Apps Script sandbox
      window.addEventListener('error', function(e) {
        console.error('Window Error:', e.message, e.filename, e.lineno, e.error);
        var box = document.getElementById('gas-debug-box');
        if (!box) {
          box = document.createElement('div');
          box.id = 'gas-debug-box';
          box.style.cssText = 'position:fixed;bottom:12px;left:12px;right:12px;background:#991b1b;color:#fff;padding:14px 18px;border-radius:10px;font-family:monospace;font-size:12px;z-index:999999;box-shadow:0 4px 20px rgba(0,0,0,0.4);line-height:1.4;';
          document.body.appendChild(box);
        }
        box.innerHTML = '<div style="font-weight:bold;margin-bottom:4px;">Diagnostic Error Notice:</div>' + (e.message || 'Script error') + '<div style="font-size:10px;opacity:0.8;margin-top:4px;">' + (e.filename || '') + ':' + (e.lineno || '') + '</div>';
      });
    </script>
  </head>
  <body>
    <div id="root">
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#0f172a;color:#ffffff;font-family:'Plus Jakarta Sans',sans-serif;">
        <div style="width:48px;height:48px;border:3px solid rgba(255,255,255,0.15);border-top-color:#3b82f6;border-radius:50%;animation:spin 0.9s linear infinite;margin-bottom:20px;"></div>
        <div style="font-size:1.25rem;font-weight:800;letter-spacing:-0.02em;">TA-DA Portal</div>
        <div style="font-size:0.85rem;color:#94a3b8;margin-top:6px;">Loading Enterprise Management Information System...</div>
      </div>
    </div>
    <script>
      (function() {
        try {
          var b64 = "${jsBase64}";
          var binary = atob(b64);
          var bytes = new Uint8Array(binary.length);
          for (var i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          var code = new TextDecoder('utf-8').decode(bytes);
          var scriptEl = document.createElement('script');
          scriptEl.type = 'text/javascript';
          scriptEl.text = code;
          document.body.appendChild(scriptEl);
        } catch (err) {
          console.error('Fatal Script Loader Error:', err);
          var box = document.getElementById('gas-debug-box') || document.createElement('div');
          box.id = 'gas-debug-box';
          box.style.cssText = 'position:fixed;bottom:12px;left:12px;right:12px;background:#991b1b;color:#fff;padding:14px;border-radius:10px;font-family:monospace;z-index:999999;';
          box.innerHTML = '<strong>Fatal Loader Error:</strong> ' + (err.message || String(err));
          document.body.appendChild(box);
        }
      })();
    </script>
  </body>
</html>
`;

fs.writeFileSync(targetFile, finalHtml, 'utf-8');
console.log(`Successfully generated Apps Script standalone bundle: ${targetFile} (${(finalHtml.length / 1024).toFixed(1)} KB)`);

// Automatically generate final web app links and update WEB_APP_LINKS.md
try {
  const { generateLinks } = await import('./generate-web-app-links.js');
  generateLinks();
} catch (e) {
  console.warn('Could not auto-generate links:', e.message);
}
