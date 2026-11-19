/**
 * ==========================================================================
 * 02_ROUTER.GS - REQUEST ROUTING & DISPATCHER
 * ==========================================================================
 * Handles HTTP GET & POST requests, REST API endpoints, and template includes.
 * ==========================================================================
 */

/**
 * Serves the HTML Web App interface or dispatches GET queries.
 */
function doGet(e) {
  // Ensure "Users" tab is always kept hidden and protected from regular users/Bharti
  try {
    if (typeof hideAndProtectUsersSheet === 'function') {
      hideAndProtectUsersSheet();
    }
  } catch (err) {}

  // Automatically heal any past corrupted cells in all sheets
  try {
    var ss = getSpreadsheet();
    if (ss && typeof healAllSheetsInSpreadsheet === 'function') {
      healAllSheetsInSpreadsheet(ss);
    }
  } catch (eHeal) {}

  // If called as a REST API: ?action=...
  if (e && e.parameter && e.parameter.action) {
    return handleApiGet(e.parameter);
  }

  // If user requests standalone statewise view: ?view=statewise
  if (e && e.parameter && e.parameter.view === 'statewise') {
    return HtmlService.createHtmlOutputFromFile('StatewiseView')
      .setTitle('TA-DA State-wise Costing Matrix')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
  }

  // Default: Serve primary Web App interface (Index.html)
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(CONFIG.APP_TITLE)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

/**
 * Handles incoming JSON POST requests (CRUD and updates).
 */
function doPost(e) {
  try {
    let payload = {};
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      payload = e.parameter;
    }

    const action = payload.action || 'create';
    let result = {};

    if (action === 'update') {
      result = updateTABill(payload);
    } else if (action === 'delete') {
      result = deleteTABill(payload);
    } else if (action === 'addStaff') {
      result = addStaffMember(payload);
    } else if (action === 'updateStaff' || action === 'editStaff') {
      result = updateStaffMember(payload);
    } else if (action === 'saveStatewise') {
      result = saveStatewiseEntry(payload);
    } else if (action === 'login' || action === 'authenticate') {
      result = authenticateUser(payload);
    } else if (action === 'register' || action === 'registerUser') {
      result = registerUser(payload);
    } else if (action === 'getUsers') {
      result = getUsersList();
    } else if (action === 'saveUser') {
      result = saveUser(payload);
    } else if (action === 'toggleLock') {
      result = toggleMonthSheetLock(payload);
    } else if (action === 'runAutomation' || action === 'automationAction') {
      result = typeof runAutomationAction === 'function' ? runAutomationAction(payload) : { success: false, message: 'runAutomationAction not found' };
    } else if (action === 'runFullAutomation') {
      result = typeof runFullSheetAutomation === 'function' ? runFullSheetAutomation(payload.spreadsheetId || payload.targetSpreadsheetId) : { success: false };
    } else if (action === 'combineMaster') {
      result = combineDataToMaster(payload.spreadsheetId || payload.targetSpreadsheetId);
    } else if (action === 'correctStates' || action === 'fixStates') {
      result = correctMasterTabStates(payload.spreadsheetId || payload.targetSpreadsheetId);
    } else if (action === 'formatCalibri' || action === 'applyFormatting') {
      result = applyCalibriFormattingToAllSheets(payload.spreadsheetId || payload.targetSpreadsheetId);
    } else if (action === 'formatDates') {
      result = formatMasterTabColHDates(payload.spreadsheetId || payload.targetSpreadsheetId);
    } else if (action === 'updateSums') {
      result = updateStateSumsForSpreadsheet(payload.spreadsheetId || payload.targetSpreadsheetId);
    } else if (action === 'uploadLogo' || action === 'uploadCompanyLogo' || action === 'saveBranding') {
      result = uploadCompanyLogoToDrive(payload);
    } else if (action === 'getBranding') {
      result = getCompanyBranding();
    } else if (action === 'createMonth') {
      result = createNewMonthSheet(payload);
    } else {
      result = submitTABill(payload);
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Server error: ' + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Dispatches API GET queries.
 */
function handleApiGet(params) {
  let output = {};
  const action = params.action;

  if (action === 'getDirectory') {
    output = { success: true, data: getEmployeeDirectory() };
  } else if (action === 'getSubmissions') {
    output = { success: true, data: fetchSubmissions(params) };
  } else if (action === 'getStatewiseMatrix') {
    output = { success: true, data: getStatewiseMatrix() };
  } else if (action === 'login' || action === 'authenticate') {
    output = authenticateUser(params);
  } else if (action === 'register' || action === 'registerUser') {
    output = registerUser(params);
  } else if (action === 'getUsers') {
    output = getUsersList();
  } else if (action === 'getBranding') {
    output = getCompanyBranding();
  } else if (action === 'runAutomation' || action === 'automationAction') {
    output = typeof runAutomationAction === 'function' ? runAutomationAction(params) : { success: false };
  } else if (action === 'runFullAutomation') {
    output = typeof runFullSheetAutomation === 'function' ? runFullSheetAutomation(params.spreadsheetId || params.targetSpreadsheetId) : { success: false };
  } else if (action === 'combineMaster') {
    output = { success: true, data: combineDataToMaster(params.spreadsheetId || params.targetSpreadsheetId) };
  } else if (action === 'correctStates' || action === 'fixStates') {
    output = { success: true, data: correctMasterTabStates(params.spreadsheetId || params.targetSpreadsheetId) };
  } else if (action === 'formatCalibri' || action === 'applyFormatting') {
    output = { success: true, data: applyCalibriFormattingToAllSheets(params.spreadsheetId || params.targetSpreadsheetId) };
  } else if (action === 'formatDates') {
    output = { success: true, data: formatMasterTabColHDates(params.spreadsheetId || params.targetSpreadsheetId) };
  } else if (action === 'updateSums') {
    output = { success: true, data: updateStateSumsForSpreadsheet(params.spreadsheetId || params.targetSpreadsheetId) };
  } else {
    output = { success: false, message: 'Invalid action: ' + action };
  }

  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Standard Apps Script helper to include separate HTML files into templates.
 * Usage in HTML: <?!= include('Styles'); ?> or <?!= include('JavaScript'); ?>
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
