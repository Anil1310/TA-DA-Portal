/**
 * ==========================================================================
 * 07_AUTHSERVICE.GS - USER AUTHENTICATION & ACCESS CONTROL
 * ==========================================================================
 * Project: TA - DA Expense Management Web App
 * Features:
 *   1. Manages the 'Users' tab in Google Sheets
 *   2. Authenticates users using email & password
 *   3. Authorizes access (Active/Inactive status, Role, Allowed States)
 *   4. Admin user creation & authorization tools
 * ==========================================================================
 */

const USERS_CONFIG = {
  SHEET_NAME: 'Users',
  TARGET_SHEET_GID: 1972170937,
  PRIMARY_SPREADSHEET_ID: '1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY',
  HEADERS: ['Email', 'Password', 'Name', 'Role', 'Status', 'Allowed States|Scope', 'Created At', 'Last Login']
};

/**
 * Returns or creates the 'Users' sheet tab in the primary spreadsheet.
 */
function getUsersSheet(ss) {
  let targetSS = ss;
  if (!targetSS) {
    try {
      targetSS = SpreadsheetApp.openById(USERS_CONFIG.PRIMARY_SPREADSHEET_ID);
    } catch (e) {
      targetSS = getSpreadsheet();
    }
  }
  if (!targetSS) return null;

  // 1. Locate by GID (1972170937)
  try {
    const allSheets = targetSS.getSheets();
    for (let i = 0; i < allSheets.length; i++) {
      const s = allSheets[i];
      if (s.getSheetId() === USERS_CONFIG.TARGET_SHEET_GID || String(s.getSheetId()) === String(USERS_CONFIG.TARGET_SHEET_GID)) {
        return s;
      }
    }
  } catch (eGid) {}

  // 2. Locate by sheet name ('Users' case-insensitive)
  let sheet = targetSS.getSheetByName(USERS_CONFIG.SHEET_NAME);
  if (sheet) return sheet;

  try {
    const allSheets = targetSS.getSheets();
    for (let i = 0; i < allSheets.length; i++) {
      const s = allSheets[i];
      if (s.getName().trim().toLowerCase() === 'users') {
        return s;
      }
    }
  } catch (eName) {}

  // 3. Fallback: insert and format if missing
  try {
    sheet = targetSS.insertSheet(USERS_CONFIG.SHEET_NAME);
    formatUsersSheet(sheet);
    seedDefaultUsers(sheet);
  } catch (eInsert) {}

  // Ensure "Users" tab is kept hidden from regular sheets navigation
  try {
    if (sheet && !sheet.isSheetHidden()) {
      sheet.hideSheet();
    }
  } catch (e) {}

  return sheet;
}

/**
 * Formats the Users sheet with standard enterprise styling and protects it.
 */
function formatUsersSheet(sheet) {
  sheet.clearFormats();
  const headerRange = sheet.getRange(1, 1, 1, USERS_CONFIG.HEADERS.length);
  headerRange.setValues([USERS_CONFIG.HEADERS])
    .setBackground('#0B3861')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 240); // Email
  sheet.setColumnWidth(2, 160); // Password
  sheet.setColumnWidth(3, 180); // Name
  sheet.setColumnWidth(4, 120); // Role
  sheet.setColumnWidth(5, 110); // Status
  sheet.setColumnWidth(6, 320); // Allowed States
  sheet.setColumnWidth(7, 160); // Created At
  sheet.setColumnWidth(8, 160); // Last Login

  // Protect and hide sheet
  try {
    const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    if (protections.length === 0) {
      const p = sheet.protect().setDescription('Admin Protected - Users & Passwords');
      p.setWarningOnly(false);
    }
    if (!sheet.isSheetHidden()) {
      sheet.hideSheet();
    }
  } catch (e) {}
}

/**
 * Seeds initial users if the Users sheet is empty.
 */
function seedDefaultUsers(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) return; // Already has users

  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+5:30', 'dd-MMM-yyyy HH:mm');
  const initialUsers = [
    [
      'mis@doctorsoap.com',
      'admin123',
      'System Administrator',
      'admin',
      'Active',
      'All',
      now,
      ''
    ],
    [
      'salescoordinator1@doctorsoap.com',
      'bharti123',
      'Bharti',
      'sales',
      'Active',
      'Delhi, Ex-UP, Haryana, Local Agra, MP, Punjab, U.P. West, Uttarakhand, Chhattisgarh, Meghalaya',
      now,
      ''
    ],
    [
      'marketing@doctorsoap.com',
      'bhawna123',
      'Bhawna',
      'sales',
      'Active',
      'Rajasthan, Bihar, Jharkhand, Gujarat',
      now,
      ''
    ]
  ];

  sheet.getRange(2, 1, initialUsers.length, USERS_CONFIG.HEADERS.length).setValues(initialUsers);
  sheet.getRange(2, 1, initialUsers.length, USERS_CONFIG.HEADERS.length)
    .setBorder(true, true, true, true, true, true, '#000000', SpreadsheetApp.BorderStyle.SOLID);

  // Guarantee Users tab is hidden
  try {
    if (!sheet.isSheetHidden()) {
      sheet.hideSheet();
    }
  } catch (e) {}
}

/**
 * Hides and protects the Users sheet tab across spreadsheets.
 */
function hideAndProtectUsersSheet(ss) {
  try {
    const targetSS = ss || getSpreadsheet();
    if (!targetSS) return;
    const sheet = targetSS.getSheetByName(USERS_CONFIG.SHEET_NAME);
    if (sheet) {
      if (!sheet.isSheetHidden()) {
        sheet.hideSheet();
      }
      const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
      if (protections.length === 0) {
        const p = sheet.protect().setDescription('Admin Protected - Users & Passwords');
        p.setWarningOnly(false);
      }
    }
  } catch (e) {}
}

/**
 * Initializes the Users sheet tab directly (callable from custom menu, restricted to Admin).
 */
function initUsersSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const activeEmail = (Session.getActiveUser().getEmail() || '').toLowerCase();

  // If Bharti or non-admin attempts to access Users sheet
  if (activeEmail.indexOf('bharti') !== -1 || activeEmail.indexOf('bhawna') !== -1) {
    SpreadsheetApp.getUi().alert(
      'Access Denied 🔒',
      'The "Users" sheet is protected and only accessible to the System Administrator.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    const s = ss.getSheetByName(USERS_CONFIG.SHEET_NAME);
    if (s && !s.isSheetHidden()) s.hideSheet();
    return;
  }

  let sheet = getUsersSheet(ss);
  if (sheet) {
    sheet.showSheet();
    ss.setActiveSheet(sheet);
    SpreadsheetApp.getUi().alert(
      'Users Tab (Admin View)',
      `The "Users" sheet is now visible for administrator management.\n\n` +
      `Admin can add new users or change passwords & status directly in this sheet.\n` +
      `• Status: "Active" to grant access, "Inactive" to revoke\n` +
      `• Role: "admin" or "sales"\n` +
      `• Allowed States: Comma-separated states or "All"\n\n` +
      `Note: This tab remains automatically hidden for sales representatives like Bharti.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Authenticates user against the Users sheet in Google Sheets.
 *
 * @param {Object} credentials { email, password }
 * @returns {Object} { success: boolean, user: Object, message: string }
 */
function authenticateUser(credentials) {
  try {
    const rawEmail = String(credentials && credentials.email ? credentials.email : '').trim().toLowerCase();
    const rawPassword = String(credentials && credentials.password ? credentials.password : '').trim();

    if (!rawEmail || !rawPassword) {
      return { success: false, message: 'Please provide both email and password.' };
    }

    // 1. PRIMARY AUTHORIZATION FROM GOOGLE SHEET 'USERS' TAB (gid: 1972170937)
    // Target Spreadsheet ID: 1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY
    let sheet = null;
    try {
      sheet = getUsersSheet();
    } catch (eSheet) {
      console.warn('Could not connect to Users sheet directly:', eSheet);
    }

    if (sheet) {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        const data = sheet.getRange(2, 1, lastRow - 1, USERS_CONFIG.HEADERS.length).getValues();

        for (let r = 0; r < data.length; r++) {
          const row = data[r];
          const sheetEmail = String(row[0] || '').trim().toLowerCase();
          const sheetPassword = String(row[1] || '').trim();
          const name = String(row[2] || '').trim();
          const role = String(row[3] || 'sales').trim().toLowerCase();
          const status = String(row[4] || 'Active').trim();
          const rawStates = String(row[5] || '').trim();

          const isEmailMatch = (sheetEmail === rawEmail) ||
            (rawEmail === 'admin@company.com' && sheetEmail === 'mis@doctorsoap.com') ||
            (rawEmail === 'bharti@company.com' && sheetEmail === 'salescoordinator1@doctorsoap.com') ||
            (rawEmail === 'bhawna@company.com' && sheetEmail === 'marketing@doctorsoap.com');

          if (isEmailMatch) {
            // Verify password directly against the Users sheet in Google Sheets
            if (sheetPassword !== rawPassword) {
              return { success: false, message: 'Incorrect password. Please try again.' };
            }

            // Verify active status from Google Sheet
            if (status.toLowerCase() !== 'active') {
              return { success: false, message: 'Your account is deactivated. Please contact your administrator.' };
            }

            // Update Last Login timestamp in Column 8 (Column H)
            try {
              const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+5:30', 'dd-MMM-yyyy HH:mm');
              sheet.getRange(r + 2, 8).setValue(now);
              SpreadsheetApp.flush();
            } catch (eTime) {
              console.warn('Could not update last login time in sheet:', eTime);
            }

            // Parse allowed states
            let allowedStates = [];
            if (role === 'admin' || rawStates.toLowerCase() === 'all' || !rawStates) {
              allowedStates = [];
            } else {
              allowedStates = rawStates.split(',').map(s => s.trim()).filter(Boolean);
            }

            // Determine assigned Google Sheet based on user login / role / territories
            const isBhawna = rawEmail.indexOf('bhawna') !== -1 || rawEmail.indexOf('marketing') !== -1 || 
              name.toLowerCase().indexOf('bhawna') !== -1 ||
              (allowedStates.length > 0 && allowedStates.every(function(s) { 
                return (typeof isBhawnaState === 'function') 
                  ? isBhawnaState(s) 
                  : ['rajasthan', 'bihar', 'jharkhand', 'gujarat'].indexOf(String(s || '').toLowerCase()) !== -1; 
              }));

            let userSheets = [];
            if (role === 'admin') {
              userSheets = [
                {
                  key: 'bharti',
                  name: 'Link-1',
                  shortName: 'Link-1',
                  sheetTitle: 'Link-1 (TA Bill 2026:- 1)',
                  id: CONFIG.SPREADSHEET_ID,
                  url: 'https://docs.google.com/spreadsheets/d/' + CONFIG.SPREADSHEET_ID + '/edit',
                  badgeColor: '#1d4ed8',
                  bgColor: '#eff6ff',
                  borderColor: '#bfdbfe'
                },
                {
                  key: 'bhawna',
                  name: 'Link-2',
                  shortName: 'Link-2',
                  sheetTitle: 'Link-2 (TA Bill 2026:- 2)',
                  id: CONFIG.SECONDARY_SPREADSHEET_ID,
                  url: 'https://docs.google.com/spreadsheets/d/' + CONFIG.SECONDARY_SPREADSHEET_ID + '/edit',
                  badgeColor: '#7c3aed',
                  bgColor: '#f5f3ff',
                  borderColor: '#ddd6fe'
                }
              ];
            } else if (isBhawna) {
              userSheets = [
                {
                  key: 'bhawna',
                  name: 'Link-2',
                  shortName: 'Link-2',
                  sheetTitle: 'Link-2 (TA Bill 2026:- 2)',
                  id: CONFIG.SECONDARY_SPREADSHEET_ID,
                  url: 'https://docs.google.com/spreadsheets/d/' + CONFIG.SECONDARY_SPREADSHEET_ID + '/edit',
                  badgeColor: '#7c3aed',
                  bgColor: '#f5f3ff',
                  borderColor: '#ddd6fe'
                }
              ];
            } else {
              userSheets = [
                {
                  key: 'bharti',
                  name: 'Link-1',
                  shortName: 'Link-1',
                  sheetTitle: 'Link-1 (TA Bill 2026:- 1)',
                  id: CONFIG.SPREADSHEET_ID,
                  url: 'https://docs.google.com/spreadsheets/d/' + CONFIG.SPREADSHEET_ID + '/edit',
                  badgeColor: '#1d4ed8',
                  bgColor: '#eff6ff',
                  borderColor: '#bfdbfe'
                }
              ];
            }

            return {
              success: true,
              message: 'Authentication successful',
              user: {
                id: sheetEmail.replace(/[^a-z0-9]/g, '_'),
                email: sheetEmail,
                name: name || sheetEmail.split('@')[0],
                role: role,
                status: status,
                allowedStates: allowedStates,
                sheets: userSheets
              }
            };
          }
        }

        // If sheet was read and user email was not found in the sheet:
        return { success: false, message: 'User account not authorized. Please contact Admin.' };
      }
    }

    // 2. Emergency offline fallback only if Google Sheet is unreachable or unseeded
    const bootstrapUsers = [
      {
        emails: ['mis@doctorsoap.com', 'admin@company.com'],
        pass: 'admin123',
        name: 'System Administrator',
        role: 'admin',
        states: []
      },
      {
        emails: ['salescoordinator1@doctorsoap.com', 'bharti@company.com'],
        pass: 'bharti123',
        name: 'Bharti',
        role: 'sales',
        states: ['Delhi', 'Ex-UP', 'Haryana', 'Local Agra', 'MP', 'Punjab', 'U.P. West', 'Uttarakhand', 'Chhattisgarh', 'Meghalaya']
      },
      {
        emails: ['marketing@doctorsoap.com', 'bhawna@company.com'],
        pass: 'bhawna123',
        name: 'Bhawna',
        role: 'sales',
        states: ['Rajasthan', 'Bihar', 'Jharkhand', 'Gujarat']
      }
    ];

    const matchBootstrap = bootstrapUsers.find(b => b.emails.includes(rawEmail));
    if (matchBootstrap) {
      if (rawPassword !== matchBootstrap.pass) {
        return { success: false, message: 'Incorrect password. Please try again.' };
      }

      const role = matchBootstrap.role;
      const isBhawna = rawEmail.includes('bhawna') || rawEmail.includes('marketing');
      let userSheets = [];

      if (role === 'admin') {
        userSheets = [
          {
            key: 'bharti',
            name: 'Link-1',
            shortName: 'Link-1',
            sheetTitle: 'Link-1 (TA Bill 2026:- 1)',
            id: CONFIG.SPREADSHEET_ID,
            url: 'https://docs.google.com/spreadsheets/d/' + CONFIG.SPREADSHEET_ID + '/edit',
            badgeColor: '#1d4ed8',
            bgColor: '#eff6ff',
            borderColor: '#bfdbfe'
          },
          {
            key: 'bhawna',
            name: 'Link-2',
            shortName: 'Link-2',
            sheetTitle: 'Link-2 (TA Bill 2026:- 2)',
            id: CONFIG.SECONDARY_SPREADSHEET_ID,
            url: 'https://docs.google.com/spreadsheets/d/' + CONFIG.SECONDARY_SPREADSHEET_ID + '/edit',
            badgeColor: '#7c3aed',
            bgColor: '#f5f3ff',
            borderColor: '#ddd6fe'
          }
        ];
      } else if (isBhawna) {
        userSheets = [
          {
            key: 'bhawna',
            name: 'Link-2',
            shortName: 'Link-2',
            sheetTitle: 'Link-2 (TA Bill 2026:- 2)',
            id: CONFIG.SECONDARY_SPREADSHEET_ID,
            url: 'https://docs.google.com/spreadsheets/d/' + CONFIG.SECONDARY_SPREADSHEET_ID + '/edit',
            badgeColor: '#7c3aed',
            bgColor: '#f5f3ff',
            borderColor: '#ddd6fe'
          }
        ];
      } else {
        userSheets = [
          {
            key: 'bharti',
            name: 'Link-1',
            shortName: 'Link-1',
            sheetTitle: 'Link-1 (TA Bill 2026:- 1)',
            id: CONFIG.SPREADSHEET_ID,
            url: 'https://docs.google.com/spreadsheets/d/' + CONFIG.SPREADSHEET_ID + '/edit',
            badgeColor: '#1d4ed8',
            bgColor: '#eff6ff',
            borderColor: '#bfdbfe'
          }
        ];
      }

      return {
        success: true,
        message: 'Authentication successful (offline fallback)',
        user: {
          id: rawEmail.replace(/[^a-z0-9]/g, '_'),
          email: rawEmail,
          name: matchBootstrap.name,
          role: matchBootstrap.role,
          status: 'Active',
          allowedStates: matchBootstrap.states,
          sheets: userSheets
        }
      };
    }

    return { success: false, message: 'User not found. Please contact Admin to authorize access.' };
  } catch (err) {
    console.error('Error in authenticateUser:', err);
    return { success: false, message: 'Authentication error: ' + err.toString() };
  }
}

/**
 * Returns list of authorized users (for admin management).
 */
function getUsersList() {
  try {
    const sheet = getUsersSheet();
    if (!sheet) return { success: false, users: [], message: 'Could not access Users sheet' };

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: true, users: [] };

    const data = sheet.getRange(2, 1, lastRow - 1, USERS_CONFIG.HEADERS.length).getValues();
    const users = data.map((row, idx) => ({
      sNo: idx + 1,
      email: String(row[0] || '').trim(),
      name: String(row[2] || '').trim(),
      role: String(row[3] || 'sales').trim(),
      status: String(row[4] || 'Active').trim(),
      allowedStates: String(row[5] || '').trim(),
      createdAt: String(row[6] || '').trim(),
      lastLogin: String(row[7] || '').trim()
    })).filter(u => u.email !== '');

    return { success: true, users: users };
  } catch (err) {
    return { success: false, users: [], message: err.toString() };
  }
}

/**
 * Adds or updates a user in the Users sheet.
 */
function saveUser(payload) {
  try {
    const sheet = getUsersSheet();
    if (!sheet) return { success: false, message: 'Could not access Users sheet.' };

    const email = String(payload.email || '').trim().toLowerCase();
    const password = String(payload.password || '').trim();
    const name = String(payload.name || '').trim();
    const role = String(payload.role || 'sales').trim().toLowerCase();
    const status = String(payload.status || 'Active').trim();
    const allowedStates = Array.isArray(payload.allowedStates)
      ? payload.allowedStates.join(', ')
      : String(payload.allowedStates || (role === 'admin' ? 'All' : '')).trim();

    if (!email) return { success: false, message: 'Email is required.' };

    const lastRow = sheet.getLastRow();
    let updated = false;

    if (lastRow > 1) {
      const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
      for (let r = 0; r < data.length; r++) {
        if (String(data[r][0] || '').trim().toLowerCase() === email) {
          const rowNum = r + 2;
          if (password) sheet.getRange(rowNum, 2).setValue(password);
          if (name) sheet.getRange(rowNum, 3).setValue(name);
          sheet.getRange(rowNum, 4).setValue(role);
          sheet.getRange(rowNum, 5).setValue(status);
          sheet.getRange(rowNum, 6).setValue(allowedStates);
          updated = true;
          break;
        }
      }
    }

    if (!updated) {
      if (!password) return { success: false, message: 'Password is required for new user.' };
      const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+5:30', 'dd-MMM-yyyy HH:mm');
      sheet.appendRow([email, password, name, role, status, allowedStates, now, '']);
      const newRow = sheet.getLastRow();
      sheet.getRange(newRow, 1, 1, USERS_CONFIG.HEADERS.length)
        .setBorder(true, true, true, true, true, true, '#000000', SpreadsheetApp.BorderStyle.SOLID);
    }

    return { success: true, message: `User ${email} ${updated ? 'updated' : 'created and authorized'} successfully!` };
  } catch (err) {
    return { success: false, message: 'Failed to save user: ' + err.toString() };
  }
}

/**
 * Registers a new user directly into the Google Sheets 'Users' tab (GID: 1972170937).
 *
 * @param {Object} payload { email, password, name, state }
 * @returns {Object} { success: boolean, message: string }
 */
function registerUser(payload) {
  try {
    const rawEmail = String(payload && payload.email ? payload.email : '').trim().toLowerCase();
    const rawPassword = String(payload && payload.password ? payload.password : '').trim();
    const rawName = String(payload && payload.name ? payload.name : '').trim() || rawEmail.split('@')[0];
    const rawState = String(payload && payload.state ? payload.state : '').trim() || 'All';

    if (!rawEmail) {
      return { success: false, message: 'Please provide a valid work email.' };
    }
    if (!rawPassword || rawPassword.length < 3) {
      return { success: false, message: 'Password must be at least 3 characters long.' };
    }

    const sheet = getUsersSheet();
    if (!sheet) {
      return { success: false, message: 'Could not connect to Users database in Google Sheets.' };
    }

    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const existingData = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < existingData.length; i++) {
        const existingEmail = String(existingData[i][0] || '').trim().toLowerCase();
        if (existingEmail === rawEmail) {
          return { success: false, message: 'An account with this email already exists. Please sign in.' };
        }
      }
    }

    const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+5:30', 'dd-MMM-yyyy HH:mm');
    const newUserData = [
      rawEmail,
      rawPassword,
      rawName,
      'sales',      // Default role
      'Active',     // Active status
      rawState,     // Allowed states / scope
      now,          // Created At
      ''            // Last Login
    ];

    sheet.appendRow(newUserData);
    const newRow = sheet.getLastRow();
    sheet.getRange(newRow, 1, 1, USERS_CONFIG.HEADERS.length)
      .setBorder(true, true, true, true, true, true, '#000000', SpreadsheetApp.BorderStyle.SOLID);
    SpreadsheetApp.flush();

    return {
      success: true,
      message: `Account registered successfully for ${rawEmail}! You can now sign in.`
    };
  } catch (err) {
    console.error('Error in registerUser:', err);
    return { success: false, message: 'Registration failed: ' + err.toString() };
  }
}

/**
 * ==========================================================================
 * COMPANY BRANDING & LOGO GOOGLE DRIVE UPLOAD
 * ==========================================================================
 */

/**
 * Uploads company logo directly into a dedicated Google Drive folder ("TA_Portal_Assets"),
 * sets file permissions to public read so it renders in web browsers without cookie barriers,
 * stores branding details in ScriptProperties, and returns the direct Google Drive image thumbnail URL.
 */
function uploadCompanyLogoToDrive(payload) {
  try {
    payload = payload || {};
    var companyName = String(payload.companyName || 'TA-DA Portal').trim();
    var companySubtitle = String(payload.companySubtitle || 'Enterprise MIS').trim();
    var base64Data = payload.base64Data || payload.logoBase64 || payload.logoUrl || '';
    var fileName = payload.fileName || ('company_logo_' + new Date().getTime() + '.png');
    var mimeType = payload.mimeType || 'image/png';

    var driveUrl = '';
    var fileId = '';
    var fileViewUrl = '';

    // If an image was uploaded as base64
    if (base64Data && base64Data.indexOf('data:') === 0 && base64Data.indexOf('base64,') !== -1) {
      var parts = base64Data.split('base64,');
      var header = parts[0];
      var rawBase64 = parts[1];

      // Extract mime type if present in header
      var mimeMatch = header.match(/data:([^;]+);/);
      if (mimeMatch && mimeMatch[1]) {
        mimeType = mimeMatch[1];
      }

      var bytes = Utilities.base64Decode(rawBase64);
      var blob = Utilities.newBlob(bytes, mimeType, fileName);

      // 1. Locate or create folder "TA_Portal_Assets"
      var folderName = 'TA_Portal_Assets';
      var folders = DriveApp.getFoldersByName(folderName);
      var targetFolder;
      if (folders.hasNext()) {
        targetFolder = folders.next();
      } else {
        targetFolder = DriveApp.createFolder(folderName);
      }

      // 2. Create file in folder
      var file = targetFolder.createFile(blob);
      fileId = file.getId();
      fileViewUrl = file.getUrl();

      // 3. Set sharing to anyone with link viewable so web app can render it
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (eShare) {
        console.warn('Set sharing notice:', eShare);
      }

      // 4. Generate Google Drive thumbnail URL that embeds reliably without cookie auth
      driveUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1000';
    } else if (payload.logoUrl && payload.logoUrl.indexOf('http') === 0) {
      // Direct external URL passed
      driveUrl = payload.logoUrl;
    }

    // 5. Store branding in ScriptProperties
    var props = PropertiesService.getScriptProperties();
    var existingBranding = {};
    try {
      var raw = props.getProperty('COMPANY_BRANDING');
      if (raw) existingBranding = JSON.parse(raw);
    } catch (e) {}

    var finalBranding = {
      companyName: companyName,
      companySubtitle: companySubtitle,
      logoUrl: driveUrl || existingBranding.logoUrl || '',
      fileId: fileId || existingBranding.fileId || '',
      fileViewUrl: fileViewUrl || existingBranding.fileViewUrl || '',
      driveUrl: driveUrl || existingBranding.driveUrl || '',
      updatedAt: new Date().toISOString()
    };

    props.setProperty('COMPANY_BRANDING', JSON.stringify(finalBranding));

    return {
      success: true,
      message: fileId 
        ? 'Company logo uploaded to Google Drive folder "TA_Portal_Assets" successfully!' 
        : 'Company branding details updated successfully!',
      fileId: fileId,
      driveUrl: driveUrl,
      fileViewUrl: fileViewUrl,
      branding: finalBranding
    };
  } catch (err) {
    console.error('Error in uploadCompanyLogoToDrive:', err);
    return {
      success: false,
      message: 'Failed to upload logo to Google Drive: ' + err.toString()
    };
  }
}

/**
 * Returns the stored company branding from ScriptProperties.
 */
function getCompanyBranding() {
  try {
    var props = PropertiesService.getScriptProperties();
    var raw = props.getProperty('COMPANY_BRANDING');
    if (raw) {
      var branding = JSON.parse(raw);
      return { success: true, branding: branding };
    }
  } catch (err) {
    console.error('Error in getCompanyBranding:', err);
  }
  return { 
    success: true, 
    branding: {
      companyName: 'TA-DA Portal',
      companySubtitle: 'Enterprise MIS',
      logoUrl: ''
    } 
  };
}
