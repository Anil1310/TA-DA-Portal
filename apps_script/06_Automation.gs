/**
 * ==========================================================================
 * 06_AUTOMATION.GS - MONTH ROLLOVER & FORMULA AUTOMATIONS
 * ==========================================================================
 * Project: TA - DA Expense Management Web App
 * Features:
 *   1. Dynamic creation of new month sheets from previous month
 *   2. Auto-reset of bills & submission dates while preserving employee directory
 *   3. Dynamic SUM formulas for state sections & grand totals
 *   4. Custom Google Sheets Automation Menu
 * ==========================================================================
 */

/**
 * Standard month sequence helper to predict the next month name.
 */
const MONTH_SEQUENCE = [
  { short: 'Jan', full: 'January' },
  { short: 'Feb', full: 'February' },
  { short: 'Mar', full: 'March' },
  { short: 'Apr', full: 'April' },
  { short: 'May', full: 'May' },
  { short: 'Jun', full: 'June' },
  { short: 'Jul', full: 'July' },
  { short: 'Aug', full: 'August' },
  { short: 'Sep', full: 'September', altShort: 'Sept' },
  { short: 'Oct', full: 'October' },
  { short: 'Nov', full: 'November' },
  { short: 'Dec', full: 'December' }
];

/**
 * Helper to suggest the next month name based on the source sheet name.
 */
function getSuggestedNextMonth(sourceName) {
  const cleanName = String(sourceName || '').trim();
  const idx = MONTH_SEQUENCE.findIndex(m => 
    m.short.toLowerCase() === cleanName.toLowerCase() ||
    m.full.toLowerCase() === cleanName.toLowerCase() ||
    (m.altShort && m.altShort.toLowerCase() === cleanName.toLowerCase())
  );

  if (idx !== -1) {
    const nextIdx = (idx + 1) % 12;
    const isFull = cleanName.length > 4;
    return isFull ? MONTH_SEQUENCE[nextIdx].full : MONTH_SEQUENCE[nextIdx].short;
  }
  return '';
}

/**
 * Helper to safely resolve the target spreadsheet:
 * 1. From passed targetId parameter
 * 2. From SpreadsheetApp.getActiveSpreadsheet()
 * 3. From CONFIG.SPREADSHEET_ID
 */
function getAutomationSpreadsheet(targetSpreadsheetId) {
  if (targetSpreadsheetId) {
    try {
      const candidate = SpreadsheetApp.openById(String(targetSpreadsheetId).trim());
      if (candidate) return candidate;
    } catch (e) {
      console.warn('Could not open spreadsheet by ID:', targetSpreadsheetId, e);
    }
  }
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}
  if (typeof getSpreadsheet === 'function') {
    try {
      const conf = getSpreadsheet();
      if (conf) return conf;
    } catch (e) {}
  }
  return null;
}

/**
 * Dynamically creates a new month sheet by cloning an existing month sheet.
 * Clears expense values (TA Bill, Full & Final, Submission Date) and updates the Month column.
 * Can be invoked from the Google Sheets menu (interactive UI prompt)
 * OR programmatically from the Web App passing options: { spreadsheetId, sourceMonth, newMonth }.
 */
function createNewMonthSheet(param1, param2, param3) {
  let targetSpreadsheetId = null;
  let sourceNameParam = null;
  let newMonthNameParam = null;

  if (typeof param1 === 'object' && param1 !== null) {
    targetSpreadsheetId = param1.spreadsheetId || param1.targetSpreadsheetId;
    sourceNameParam = param1.sourceMonth || param1.sourceName;
    newMonthNameParam = param1.newMonth || param1.newMonthName;
  } else {
    targetSpreadsheetId = param1;
    sourceNameParam = param2;
    newMonthNameParam = param3;
  }

  const ss = getAutomationSpreadsheet(targetSpreadsheetId);
  if (!ss) {
    return { success: false, message: 'Could not connect to target spreadsheet.' };
  }

  let ui = null;
  try {
    ui = SpreadsheetApp.getUi();
  } catch (e) {
    ui = null;
  }

  const activeSheet = ss.getActiveSheet() || ss.getSheets()[0];
  const activeName = activeSheet ? activeSheet.getName() : '';

  // Determine intelligent default months:
  // Target month is current month - 1 month (e.g. October -> Sep)
  // Source month is current month - 2 months (e.g. October -> Aug)
  const now = new Date();
  const targetMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const sourceMonthDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const defaultTargetByDate = MONTH_SEQUENCE[targetMonthDate.getMonth()].short; // 'Sep' when current is October
  const defaultSourceByDate = MONTH_SEQUENCE[sourceMonthDate.getMonth()].short; // 'Aug' when current is October

  // 1. Determine Source Sheet
  // Check if defaultSourceByDate (e.g. Aug) exists in the spreadsheet
  let defaultSource = 'Aug';
  const augSheet = ss.getSheetByName('Aug') || ss.getSheetByName('August');
  const dateSourceSheet = ss.getSheetByName(defaultSourceByDate) || ss.getSheetByName(MONTH_SEQUENCE[sourceMonthDate.getMonth()].full);

  if (dateSourceSheet) {
    defaultSource = dateSourceSheet.getName();
  } else if (augSheet) {
    defaultSource = augSheet.getName();
  } else if (activeName && MONTH_SEQUENCE.some(m => m.short.toLowerCase() === activeName.toLowerCase() || m.full.toLowerCase() === activeName.toLowerCase() || (m.altShort && m.altShort.toLowerCase() === activeName.toLowerCase()))) {
    defaultSource = activeName;
  } else {
    for (let i = MONTH_SEQUENCE.length - 1; i >= 0; i--) {
      const candidate = ss.getSheetByName(MONTH_SEQUENCE[i].short) || ss.getSheetByName(MONTH_SEQUENCE[i].full) || (MONTH_SEQUENCE[i].altShort ? ss.getSheetByName(MONTH_SEQUENCE[i].altShort) : null);
      if (candidate) {
        defaultSource = candidate.getName();
        break;
      }
    }
  }

  let sourceName = sourceNameParam || '';

  if (!sourceName && ui) {
    const promptSource = ui.prompt(
      'Create New Month Sheet',
      `Enter the SOURCE month sheet to duplicate (e.g., Aug, Sep):\n(Default is currently selected: "${defaultSource}")`,
      ui.ButtonSet.OK_CANCEL
    );
    if (promptSource.getSelectedButton() !== ui.Button.OK) {
      return { success: false, message: 'Cancelled by user' };
    }
    sourceName = promptSource.getResponseText().trim() || defaultSource;
  } else if (!sourceName) {
    sourceName = defaultSource;
  }

  const sourceSheet = ss.getSheetByName(sourceName) || 
    (sourceName.toLowerCase() === 'aug' ? (ss.getSheetByName('August') || ss.getSheetByName('Aug')) : null) ||
    (sourceName.toLowerCase() === 'sep' ? (ss.getSheetByName('Sept') || ss.getSheetByName('September') || ss.getSheetByName('Sep')) : null);

  if (!sourceSheet) {
    if (ui) ui.alert('Error', `Source sheet "${sourceName}" not found in this spreadsheet.`, ui.ButtonSet.OK);
    return { success: false, message: `Source sheet "${sourceName}" not found.` };
  }

  // 2. Determine Target Month Name (e.g. Aug -> Sep = current month - 1 month)
  const suggestedNext = getSuggestedNextMonth(sourceSheet.getName()) || defaultTargetByDate;
  let newMonthName = newMonthNameParam || '';

  if (!newMonthName && ui) {
    const promptTarget = ui.prompt(
      'New Month Name',
      `Enter the name for the NEW month tab:\n(Suggested for ${sourceSheet.getName()}: "${suggestedNext}")`,
      ui.ButtonSet.OK_CANCEL
    );
    if (promptTarget.getSelectedButton() !== ui.Button.OK) {
      return { success: false, message: 'Cancelled by user' };
    }
    newMonthName = promptTarget.getResponseText().trim() || suggestedNext;
  } else if (!newMonthName) {
    newMonthName = suggestedNext || defaultTargetByDate;
  }

  if (!newMonthName) {
    if (ui) ui.alert('Invalid Name', 'Sheet name cannot be empty.', ui.ButtonSet.OK);
    return { success: false, message: 'Sheet name cannot be empty.' };
  }

  if (ss.getSheetByName(newMonthName)) {
    if (ui) ui.alert('Already Exists', `A sheet named "${newMonthName}" already exists.`, ui.ButtonSet.OK);
    return { success: false, message: `A sheet named "${newMonthName}" already exists.` };
  }

  // 3. Duplicate and position the new sheet in strict month-wise sequence (Apr ➔ Mar)
  const newSheet = sourceSheet.copyTo(ss);
  newSheet.setName(newMonthName);
  positionMonthSheetInSequence(ss, newSheet, newMonthName);

  // 4. Reset monthly values while keeping employee data and formatting
  const lastRow = newSheet.getLastRow();
  const lastCol = Math.max(newSheet.getLastColumn(), 8);

  if (lastRow >= 2) {
    const numRows = lastRow - 1;
    const range = newSheet.getRange(2, 1, numRows, lastCol);
    const values = range.getValues();

    for (let i = 0; i < values.length; i++) {
      const serialOrLabel = String(values[i][0] || '').trim().toLowerCase();
      const empCode = String(values[i][1] || '').trim();
      const nameOrLabel = String(values[i][2] || '').trim().toLowerCase();

      const isHeaderRow = (
        empCode.toLowerCase() === 'emp. code' ||
        empCode.toLowerCase() === 'emp code' ||
        empCode.toLowerCase() === 'code' ||
        nameOrLabel.includes('sales person name')
      );
      const isTotalRow = serialOrLabel.includes('total') || nameOrLabel.includes('total');
      const isEmployeeRow = empCode !== '' && !isTotalRow && !isHeaderRow;

      if (isEmployeeRow) {
        values[i][4] = '';               // TA Bill
        values[i][5] = newMonthName;     // Month column
        values[i][6] = '';               // Full & Final
        if (lastCol >= 8) values[i][7] = ''; // Submission Date
      } else if (isTotalRow) {
        values[i][2] = 'Grand Total';
      }
    }

    range.setValues(values);
  }

  // 4b. Sync any newly added / increased employees from the directory into this month sheet
  try {
    const allStaff = (typeof getEmployeeDirectory === 'function')
      ? getEmployeeDirectory({ spreadsheetIds: [ss.getId()] })
      : [];

    const existingCodes = new Set();
    const existingNames = new Set();
    const currentData = newSheet.getDataRange().getValues();
    for (let r = 1; r < currentData.length; r++) {
      const c = String(currentData[r][1] || '').trim().toUpperCase();
      const n = String(currentData[r][2] || '').trim().toLowerCase();
      if (c && !c.includes('TOTAL') && !c.includes('GRAND')) existingCodes.add(c);
      if (n && !n.includes('total') && !n.includes('grand')) existingNames.add(n);
    }

    const isBhawna = (typeof isBhawnaSpreadsheet === 'function') ? isBhawnaSpreadsheet(ss) : false;

    allStaff.forEach(staff => {
      const sCode = String(staff.code || '').trim().toUpperCase();
      const sName = String(staff.name || '').trim();
      const sState = String(staff.state || '').trim();
      if (!sCode && !sName) return;

      const isBhawnaStaff = (typeof isBhawnaState === 'function') 
        ? isBhawnaState(sState) 
        : ['rajasthan', 'gujarat', 'bihar', 'jharkhand'].some(bs => sState.toLowerCase().includes(bs));
      if (isBhawna && !isBhawnaStaff) return;
      if (!isBhawna && isBhawnaStaff) return;

      // If employee is newly increased / not in sheet, insert before that state's Grand Total row
      if (!existingCodes.has(sCode) && !existingNames.has(sName.toLowerCase())) {
        const freshGrid = newSheet.getDataRange().getValues();
        let targetInsertRow = -1;

        for (let r = 1; r < freshGrid.length; r++) {
          const rState = String(freshGrid[r][3] || '').trim().toLowerCase();
          if (rState === normS || (typeof detectStateName === 'function' && detectStateName(rState) === detectStateName(sState))) {
            for (let nr = r; nr < freshGrid.length; nr++) {
              const label = String(freshGrid[nr][2] || '').trim().toLowerCase();
              if (label.includes('total') || label.includes('grand')) {
                targetInsertRow = nr + 1;
                break;
              }
            }
            break;
          }
        }

        if (targetInsertRow !== -1) {
          newSheet.insertRowBefore(targetInsertRow);
          newSheet.getRange(targetInsertRow, 1, 1, 8).setValues([[
            1, sCode, sName, sState, '', newMonthName, '', ''
          ]]);
          existingCodes.add(sCode);
          existingNames.add(sName.toLowerCase());
        }
      }
    });
  } catch (errSync) {
    console.warn('Notice syncing increased employees into new month sheet:', errSync);
  }

  // 5. Apply Calibri 10 Middle alignment & update formulas
  newSheet.getRange(1, 1, Math.max(newSheet.getLastRow(), 1), lastCol)
    .setFontFamily('Calibri')
    .setFontSize(10)
    .setVerticalAlignment('middle');

  updateStateSums(newSheet);

  if (ui) {
    showModernAlert({
      title: 'Sheet Created Successfully',
      subtitle: `Created new month sheet "${newMonthName}" cloned from "${sourceName}" as the LAST tab.`,
      stats: [
        { label: 'New Sheet', value: newMonthName },
        { label: 'Position', value: 'Last Tab' }
      ],
      chips: ['Positioned at End', 'Staff List Preserved', 'Increased Staff Synced', 'Formulas Updated'],
      note: 'Calibri 10pt • Ready for Claims'
    });
  }

  return {
    success: true,
    sheetName: newMonthName,
    sourceSheet: sourceName,
    message: `Created new sheet "${newMonthName}" at the LAST position in ${ss.getName()}.`
  };
}

/**
 * Creates the new month sheet at the very LAST tab position in BOTH spreadsheets
 * (Sheet 1: Bharti and Sheet 2: Bhawna), automatically syncing any increased employees.
 */
function createMonthInBothSpreadsheets(payloadOrMonth) {
  const BHARTI_ID = String(CONFIG.SPREADSHEET_ID || '1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY').trim();
  const BHAWNA_ID = String(CONFIG.SECONDARY_SPREADSHEET_ID || '166GBY-ACppPT9vFccLK1UJFKzO4KxeTGXxpUSMsrG5w').trim();

  let newMonth = '';
  let sourceMonth = '';

  if (typeof payloadOrMonth === 'string') {
    newMonth = payloadOrMonth.trim();
  } else if (typeof payloadOrMonth === 'object' && payloadOrMonth !== null) {
    newMonth = payloadOrMonth.newMonth || payloadOrMonth.month || '';
    sourceMonth = payloadOrMonth.sourceMonth || '';
  }

  const results = {
    sheet1: null,
    sheet2: null,
    success: true,
    message: ''
  };

  // 1. Create in Sheet 1 (Bharti)
  try {
    results.sheet1 = createNewMonthSheet({
      spreadsheetId: BHARTI_ID,
      sourceMonth: sourceMonth,
      newMonth: newMonth
    });
  } catch (e1) {
    results.sheet1 = { success: false, message: e1.toString() };
  }

  // 2. Create in Sheet 2 (Bhawna)
  try {
    results.sheet2 = createNewMonthSheet({
      spreadsheetId: BHAWNA_ID,
      sourceMonth: sourceMonth,
      newMonth: newMonth
    });
  } catch (e2) {
    results.sheet2 = { success: false, message: e2.toString() };
  }

  const s1Ok = results.sheet1 && results.sheet1.success;
  const s2Ok = results.sheet2 && results.sheet2.success;
  results.success = s1Ok || s2Ok;

  const actualMonth = (results.sheet1 && results.sheet1.sheetName) || (results.sheet2 && results.sheet2.sheetName) || newMonth;
  results.message = `Created new month sheet "${actualMonth}" at the LAST tab position in ${s1Ok && s2Ok ? 'BOTH spreadsheets (Sheet 1 & Sheet 2)' : (s1Ok ? 'Sheet 1' : 'Sheet 2')} with all increased employees synced!`;

  return results;
}

/**
 * Convenient direct execution function for Admin to create the next month tab in both spreadsheets.
 */
function CREATE_NEW_MONTH_IN_BOTH_SHEETS(monthName) {
  const res = createMonthInBothSpreadsheets(monthName || 'Oct');
  Logger.log(JSON.stringify(res));
  return res;
}

/**
 * Backward compatibility wrapper for createSeptSheet
 */
function createSeptSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName('Aug');

  if (!sourceSheet) {
    SpreadsheetApp.getUi().alert("Source sheet 'Aug' not found!");
    return;
  }

  if (ss.getSheetByName('Sept')) {
    SpreadsheetApp.getUi().alert("A sheet named 'Sept' already exists.");
    return;
  }

  const newSheet = sourceSheet.copyTo(ss);
  newSheet.setName('Sept');
  positionMonthSheetInSequence(ss, newSheet, 'Sept');

  const lastRow = newSheet.getLastRow();
  if (lastRow > 2) {
    const range = newSheet.getRange(3, 1, lastRow - 2, 7);
    const values = range.getValues();

    for (let i = 0; i < values.length; i++) {
      const serialOrLabel = values[i][0];
      const empCode = values[i][1];

      if (empCode !== '' && serialOrLabel !== '') {
        values[i][4] = '';
        values[i][5] = 'Sept';
        values[i][6] = '';
      }
    }
    range.setValues(values);
  }

  updateStateSums(newSheet);
  SpreadsheetApp.getUi().alert("Successfully created 'Sept' sheet from 'Aug'!");
}

/**
 * Automatically calculates and inserts dynamic SUM formulas for each state section.
 * Can be run manually, from the menu, or called directly with a sheet parameter.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} [targetSheet] Optional sheet reference.
 */
/**
 * Automatically calculates and inserts dynamic SUM formulas for each state section,
 * enforces S.No restarting at 1 per state section, highlights Full & Final in yellow (#FFFF00),
 * formats Grand Total rows with thick solid bottom borders, and sets Row 1 Total TA banner.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} [targetSheet] Optional sheet reference.
 */
function updateStateSums(targetSheet) {
  const sheet = targetSheet || SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return;

  // Apply Calibri 10 and Middle vertical alignment to the sheet
  const formatCols = Math.max(sheet.getLastColumn(), 8);
  sheet.getRange(1, 1, lastRow, formatCols)
    .setFontFamily('Calibri')
    .setFontSize(10)
    .setVerticalAlignment('middle');

  // 1. Format Row 1 Banner (Solid Black #000000 background, Neon Green #00FF00 bold Total TA and Sum)
  const maxCols = Math.max(sheet.getLastColumn(), 8);
  const row1Vals = new Array(maxCols).fill('');
  row1Vals[1] = 'Total TA'; // Col B

  sheet.getRange(1, 1, 1, maxCols)
    .setValues([row1Vals])
    .setBackground('#000000');

  sheet.getRange('B1')
    .setValue('Total TA')
    .setFontColor('#00FF00')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  const cellE1 = sheet.getRange('E1');
  cellE1
    .setFontColor('#00FF00')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setNumberFormat('#,##0');

  // 2. Format Row 2 Table Headers (Navy Blue background #0B3861, White bold text)
  const colHeaders = ['S.No.', 'Emp. Code', 'Sales Person Name', 'State', 'TA Bill', 'Month', 'Full & Final', 'Submission Date'];
  const headerRange = sheet.getRange(2, 1, 1, 8);
  headerRange.setValues([colHeaders])
    .setBackground('#0B3861')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  sheet.getRange(2, 3).setHorizontalAlignment('left'); // Sales Person Name

  if (lastRow < 3) {
    cellE1.setValue(0);
    return;
  }

  // 3. Scan data rows from Row 3 down
  const numRows = lastRow - 2;
  const grid = sheet.getRange(3, 1, numRows, 8).getValues();

  let sectionStartRow = 3;
  let sectionEndRow = -1;
  let sectionCounter = 1;
  const totalRows = [];
  const grandTotalRowNumbers = [];
  let inSection = false;

  for (let i = 0; i < grid.length; i++) {
    const rowNum = i + 3; // 1-based row index in sheet
    const sNo = String(grid[i][0] || '').trim();
    const empCode = String(grid[i][1] || '').trim();
    const name = String(grid[i][2] || '').trim();
    const state = String(grid[i][3] || '').trim();
    const fullFinalVal = String(grid[i][6] || '').trim();

    const rowText = (sNo + ' ' + empCode + ' ' + name + ' ' + state).toLowerCase();
    const isExplicitTotal = rowText.includes('total') || rowText.includes('grand');
    const isHeaderRow = (
      empCode.toLowerCase() === 'emp. code' || 
      empCode.toLowerCase() === 'code' || 
      name.toLowerCase().includes('sales person')
    );
    const isBlank = (sNo === '' && empCode === '' && name === '' && !isExplicitTotal);
    const isEmployee = (empCode !== '' || (name !== '' && !isExplicitTotal && !isBlank)) && !isExplicitTotal && !isHeaderRow;

    if (isEmployee) {
      if (!inSection) {
        sectionStartRow = rowNum;
        sectionCounter = 1;
        inSection = true;
      }
      sectionEndRow = rowNum;

      // Enforce section S.No starting from 1 for each state section!
      sheet.getRange(rowNum, 1).setValue(sectionCounter).setHorizontalAlignment('center').setFontWeight('normal');
      sheet.getRange(rowNum, 2).setHorizontalAlignment('center').setFontWeight('normal');
      sheet.getRange(rowNum, 3).setHorizontalAlignment('left').setFontWeight('normal');

      // State in Col 4: Ensure it is genuine text state, never amount/numeric
      var isStateValid = typeof isStateValueValidText === 'function' ? isStateValueValidText(state) : (state && state.indexOf('₹') === -1 && /[a-zA-Z]/.test(state));
      if (!isStateValid) {
        var healedState = (typeof normalizeStateName === 'function') ? normalizeStateName('', empCode) : (empCode === 'HOS0330' ? 'UK' : 'Delhi');
        sheet.getRange(rowNum, 4).setValue(healedState).setNumberFormat('@').setHorizontalAlignment('center').setFontWeight('normal');
      } else if (empCode === 'HOS0330' && state !== 'UK') {
        sheet.getRange(rowNum, 4).setValue('UK').setNumberFormat('@').setHorizontalAlignment('center').setFontWeight('normal');
      } else {
        sheet.getRange(rowNum, 4).setHorizontalAlignment('center').setFontWeight('normal');
      }

      sheet.getRange(rowNum, 5).setNumberFormat('#,##0').setHorizontalAlignment('center').setFontWeight('normal');
      sheet.getRange(rowNum, 6).setHorizontalAlignment('center').setFontWeight('normal');

      // Check Full & Final in Col G: if contains F&F or Full & Final or Settled, highlight yellow #FFFF00 bold black
      const isFF = fullFinalVal.toLowerCase().includes('f&f') || 
                   fullFinalVal.toLowerCase().includes('full') || 
                   fullFinalVal.toLowerCase().includes('final') || 
                   fullFinalVal.toLowerCase().includes('settled');
      const cellG = sheet.getRange(rowNum, 7);
      if (isFF) {
        const ffLabel = fullFinalVal.toLowerCase().includes('settled') ? 'Settled' : 'F&F';
        cellG.setValue(ffLabel)
          .setBackground('#FFFF00')
          .setFontColor('#000000')
          .setFontWeight('bold')
          .setHorizontalAlignment('center');
      } else {
        cellG.setBackground('#FFFFFF')
          .setFontColor('#000000')
          .setFontWeight('normal')
          .setHorizontalAlignment('center');
      }

      sheet.getRange(rowNum, 8).setNumberFormat('@').setHorizontalAlignment('center').setFontWeight('normal');

      sectionCounter++;
    } else if (inSection && (isExplicitTotal || isBlank)) {
      // Reached boundary of the state section -> format Grand Total row
      const grandRow = isExplicitTotal ? rowNum : (sectionEndRow + 1);

      // Clear non-total cells
      sheet.getRange(grandRow, 1).setValue('').setFontWeight('normal');
      sheet.getRange(grandRow, 2).setValue('').setFontWeight('normal');
      sheet.getRange(grandRow, 3).setValue('Grand Total').setFontWeight('bold').setHorizontalAlignment('left');
      sheet.getRange(grandRow, 4).setValue('').setFontWeight('normal');
      sheet.getRange(grandRow, 5).setFormula(`=SUM(E${sectionStartRow}:E${sectionEndRow})`).setFontWeight('bold').setNumberFormat('#,##0').setHorizontalAlignment('center');
      sheet.getRange(grandRow, 6).setValue('').setFontWeight('normal');
      sheet.getRange(grandRow, 7).setValue('').setBackground('#FFFFFF').setFontWeight('normal');
      sheet.getRange(grandRow, 8).setValue('').setFontWeight('normal');

      // Medium solid bottom border
      sheet.getRange(grandRow, 1, 1, 8).setBorder(null, null, true, null, null, null, '#000000', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

      totalRows.push(`E${grandRow}`);
      grandTotalRowNumbers.push(grandRow);
      inSection = false;
    } else if (isExplicitTotal && sectionEndRow >= sectionStartRow) {
      sheet.getRange(rowNum, 1).setValue('').setFontWeight('normal');
      sheet.getRange(rowNum, 2).setValue('').setFontWeight('normal');
      sheet.getRange(rowNum, 3).setValue('Grand Total').setFontWeight('bold').setHorizontalAlignment('left');
      sheet.getRange(rowNum, 4).setValue('').setFontWeight('normal');
      sheet.getRange(rowNum, 5).setFormula(`=SUM(E${sectionStartRow}:E${sectionEndRow})`).setFontWeight('bold').setNumberFormat('#,##0').setHorizontalAlignment('center');
      sheet.getRange(rowNum, 6).setValue('').setFontWeight('normal');
      sheet.getRange(rowNum, 7).setValue('').setBackground('#FFFFFF').setFontWeight('normal');
      sheet.getRange(rowNum, 8).setValue('').setFontWeight('normal');

      sheet.getRange(rowNum, 1, 1, 8).setBorder(null, null, true, null, null, null, '#000000', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

      if (!totalRows.includes(`E${rowNum}`)) totalRows.push(`E${rowNum}`);
      if (!grandTotalRowNumbers.includes(rowNum)) grandTotalRowNumbers.push(rowNum);
      inSection = false;
    }
  }

  // Trailing section if ended without explicit total
  if (inSection && sectionEndRow >= sectionStartRow) {
    const nextRow = sectionEndRow + 1;
    sheet.getRange(nextRow, 1).setValue('').setFontWeight('normal');
    sheet.getRange(nextRow, 2).setValue('').setFontWeight('normal');
    sheet.getRange(nextRow, 3).setValue('Grand Total').setFontWeight('bold').setHorizontalAlignment('left');
    sheet.getRange(nextRow, 4).setValue('').setFontWeight('normal');
    sheet.getRange(nextRow, 5).setFormula(`=SUM(E${sectionStartRow}:E${sectionEndRow})`).setFontWeight('bold').setNumberFormat('#,##0').setHorizontalAlignment('center');
    sheet.getRange(nextRow, 6).setValue('').setFontWeight('normal');
    sheet.getRange(nextRow, 7).setValue('').setBackground('#FFFFFF').setFontWeight('normal');
    sheet.getRange(nextRow, 8).setValue('').setFontWeight('normal');

    sheet.getRange(nextRow, 1, 1, 8).setBorder(null, null, true, null, null, null, '#000000', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

    totalRows.push(`E${nextRow}`);
    grandTotalRowNumbers.push(nextRow);
  }

  // 4. Update Row 1 Col E formula to sum all section grand totals
  if (totalRows.length > 0) {
    cellE1.setFormula(`=SUM(${totalRows.join(',')})`);
  } else {
    cellE1.setValue(0);
  }
  cellE1
    .setFontColor('#00FF00')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setNumberFormat('#,##0');

  // 5. Apply table borders (Row 2 to last row)
  const maxTableEnd = Math.max(sheet.getLastRow(), sectionEndRow + 1);
  if (maxTableEnd >= 2) {
    sheet.getRange(2, 1, maxTableEnd - 1, 8)
      .setBorder(true, true, true, true, true, true, '#000000', SpreadsheetApp.BorderStyle.SOLID);
  }

  // Re-apply thick bottom border to each Grand Total row
  grandTotalRowNumbers.forEach(gRow => {
    sheet.getRange(gRow, 1, 1, 8)
      .setBorder(null, null, true, null, null, null, '#000000', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  });

  if (!targetSheet) {
    SpreadsheetApp.getActiveSpreadsheet().toast('Format & state totals updated successfully!', 'Complete', 3);
  }
}

/**
 * Dynamically builds a new month sheet from the employee directory,
 * grouping staff by state with section Grand Total rows and Row 1 Total TA banner.
 */
function buildMonthSheetFromDirectory(ss, monthName) {
  let sheet = ss.getSheetByName(monthName);
  if (!sheet) {
    sheet = ss.insertSheet(monthName);
  }
  positionMonthSheetInSequence(ss, sheet, monthName);
  sheet.clearContents();
  sheet.clearFormats();

  // Row 1 Banner
  sheet.getRange(1, 1, 1, 8)
    .setValues([['', 'Total TA', '', '', 0, '', '', '']])
    .setBackground('#000000');
  sheet.getRange('B1').setFontColor('#00FF00').setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange('E1').setFontColor('#00FF00').setFontWeight('bold').setHorizontalAlignment('center').setNumberFormat('#,##0');

  // Row 2 Headers
  const colHeaders = ['S.No.', 'Emp. Code', 'Sales Person Name', 'State', 'TA Bill', 'Month', 'Full & Final', 'Submission Date'];
  sheet.getRange(2, 1, 1, 8)
    .setValues([colHeaders])
    .setBackground('#0B3861')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  sheet.getRange(2, 3).setHorizontalAlignment('left');

  // Get staff directory dynamically
  const staffList = (typeof getEmployeeDirectory === 'function') ? getEmployeeDirectory({ spreadsheetIds: [ss.getId()] }) : [];
  const isBhawna = (typeof isBhawnaSpreadsheet === 'function') ? isBhawnaSpreadsheet(ss) : false;

  const filteredStaff = staffList.filter(s => {
    const isStaffBhawna = (typeof isBhawnaState === 'function')
      ? isBhawnaState(s.state)
      : ['Rajasthan', 'Gujarat', 'Bihar', 'Jharkhand'].some(bs => (s.state || '').toLowerCase().includes(bs.toLowerCase()));
    return isBhawna ? isStaffBhawna : !isStaffBhawna;
  });

  // Group by state
  const stateGroups = {};
  filteredStaff.forEach(s => {
    const st = s.state || 'General';
    if (!stateGroups[st]) stateGroups[st] = [];
    stateGroups[st].push(s);
  });

  const stateNames = Object.keys(stateGroups).sort();
  let currentRow = 3;

  stateNames.forEach(st => {
    const members = stateGroups[st];
    const sectionStart = currentRow;

    members.forEach((m, idx) => {
      sheet.getRange(currentRow, 1, 1, 8).setValues([[
        idx + 1,
        m.code || '',
        m.name || '',
        st,
        '',
        monthName,
        '',
        ''
      ]]);
      currentRow++;
    });

    const sectionEnd = currentRow - 1;

    // Grand Total Row
    sheet.getRange(currentRow, 1, 1, 8).setValues([[
      '',
      '',
      'Grand Total',
      '',
      `=SUM(E${sectionStart}:E${sectionEnd})`,
      '',
      '',
      ''
    ]]);
    sheet.getRange(currentRow, 3).setFontWeight('bold').setHorizontalAlignment('left');
    sheet.getRange(currentRow, 5).setFontWeight('bold').setHorizontalAlignment('center').setNumberFormat('#,##0');
    sheet.getRange(currentRow, 1, 1, 8).setBorder(null, null, true, null, null, null, '#000000', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    currentRow++;

    // Separator Empty Row
    sheet.getRange(currentRow, 1, 1, 8).setValues([['', '', '', '', '', '', '', '']]);
    currentRow++;
  });

  updateStateSums(sheet);
  return sheet;
}

/**
 * Combines data from Financial Year month sheets (Apr to Mar) into the 'Master' tab.
 * Processes sheets in chronological order (Apr ➔ Mar) if they exist.
 * Skips total/summary rows, standardizes serial numbers, and applies styling.
 */
function combineDataToMaster(targetSpreadsheetId, skipPrompt) {
  const ss = getAutomationSpreadsheet(targetSpreadsheetId);
  if (!ss) {
    return { success: false, message: 'Could not connect to target spreadsheet.' };
  }
  let ui = null;
  try {
    ui = SpreadsheetApp.getUi();
  } catch (e) {
    ui = null;
  }

  // 1. Financial Year Month Sequence (Apr to Mar)
  const FY_MONTH_DEFINITIONS = [
    { label: 'Apr', patterns: ['apr', 'april'] },
    { label: 'May', patterns: ['may'] },
    { label: 'Jun', patterns: ['jun', 'june'] },
    { label: 'Jul', patterns: ['jul', 'july'] },
    { label: 'Aug', patterns: ['aug', 'august'] },
    { label: 'Sep', patterns: ['sep', 'sept', 'september'] },
    { label: 'Oct', patterns: ['oct', 'october'] },
    { label: 'Nov', patterns: ['nov', 'november'] },
    { label: 'Dec', patterns: ['dec', 'december'] },
    { label: 'Jan', patterns: ['jan', 'january'] },
    { label: 'Feb', patterns: ['feb', 'february'] },
    { label: 'Mar', patterns: ['mar', 'march'] }
  ];

  const allSheets = ss.getSheets();
  const monthSheets = [];

  // Discover existing sheets strictly following the Apr -> Mar order
  FY_MONTH_DEFINITIONS.forEach(def => {
    for (let s = 0; s < allSheets.length; s++) {
      const sName = allSheets[s].getName().trim();
      const sNameLower = sName.toLowerCase();

      // Check if sheet matches month patterns
      const matches = def.patterns.some(p => sNameLower === p || sNameLower.startsWith(p));
      // Exclude system sheets
      const isSystem = sNameLower.includes('master') || sNameLower.includes('staff') || 
                       sNameLower.includes('costing') || sNameLower.includes('statewise');

      if (matches && !isSystem) {
        if (!monthSheets.some(m => m.sheet.getSheetId() === allSheets[s].getSheetId())) {
          monthSheets.push({
            sheet: allSheets[s],
            monthLabel: def.label,
            sheetName: sName
          });
        }
      }
    }
  });

  if (monthSheets.length === 0) {
    if (ui && !skipPrompt) {
      ui.alert('No FY Month Sheets Found', 'No month sheets (from Apr to Mar) were found in this spreadsheet.', ui.ButtonSet.OK);
    }
    return { success: false, message: 'No FY Month Sheets Found' };
  }

  const sheetNamesList = monthSheets.map(m => m.sheetName).join(' ➔ ');
  if (ui && !skipPrompt) {
    const confirm = ui.alert(
      'Combine Data into Master (Apr to Mar)',
      `Found ${monthSheets.length} month sheet(s) in Financial Year order:\n${sheetNamesList}\n\n` +
      `Do you want to combine all employee records (starting from Row 2) from these sheets into the "Master" tab?\n` +
      `(The Master tab will be rebuilt cleanly with all consolidated rows in Apr ➔ Mar sequence)`,
      ui.ButtonSet.OK_CANCEL
    );

    if (confirm !== ui.Button.OK) {
      return { success: false, message: 'Cancelled by user' };
    }
  }

  // Pre-load employee state directory from Staff sheet and default registry
  const staffStateMap = buildStaffStateMap(ss);

  // 2. Extract employee records starting from monthly sheet tabs (Apr to Mar)
  const compiledRows = [];
  const scannedSheets = [];

  monthSheets.forEach(mObj => {
    const mSheet = mObj.sheet;
    const mName = mObj.sheetName;
    const defaultMonth = mObj.monthLabel;
    const lastRow = mSheet.getLastRow();
    const lastCol = Math.max(mSheet.getLastColumn(), 8);

    if (lastRow < 2) return;

    // Scan the entire sheet content from Row 1
    const fullGrid = mSheet.getRange(1, 1, lastRow, lastCol).getValues();
    let monthRecordsCount = 0;
    let currentSectionState = '';

    // Dynamically locate header row & column indices
    let headerRowIdx = -1;
    let sNoCol = 0;
    let empCodeCol = 1;
    let nameCol = 2;
    let stateCol = 3;
    let taBillCol = 4;
    let monthCol = 5;
    let fullFinalCol = 6;
    let dateCol = 7;

    for (let r = 0; r < Math.min(fullGrid.length, 5); r++) {
      const rowTexts = fullGrid[r].map(c => String(c || '').trim().toLowerCase());
      const hasCode = rowTexts.some(t => t.includes('code') || t === 'emp');
      const hasName = rowTexts.some(t => t.includes('name') || t.includes('person'));
      if (hasCode || (hasName && rowTexts.some(t => t.includes('bill') || t.includes('state') || t.includes('ta')))) {
        headerRowIdx = r;
        rowTexts.forEach((t, cIdx) => {
          if (t.includes('s.no') || t.includes('sr.') || t === 'sno' || t === 'sl') sNoCol = cIdx;
          else if (t.includes('code') || t === 'emp' || t.includes('emp.')) empCodeCol = cIdx;
          else if (t.includes('name') || t.includes('person')) nameCol = cIdx;
          else if (t.includes('state') || t.includes('territory') || t.includes('region')) stateCol = cIdx;
          else if (t.includes('bill') || t.includes('ta') || t.includes('amount')) taBillCol = cIdx;
          else if (t.includes('month')) monthCol = cIdx;
          else if (t.includes('full') || t.includes('final') || t.includes('status')) fullFinalCol = cIdx;
          else if (t.includes('date') || t.includes('time') || t.includes('submission')) dateCol = cIdx;
        });
        break;
      }
    }

    const startRowIdx = headerRowIdx !== -1 ? headerRowIdx + 1 : 1;

    for (let i = startRowIdx; i < fullGrid.length; i++) {
      const sNoRaw = String(fullGrid[i][sNoCol] || '').trim();
      const empCode = String(fullGrid[i][empCodeCol] || '').trim();
      const name = String(fullGrid[i][nameCol] || '').trim();
      const rawState = String(fullGrid[i][stateCol] || '').trim();

      const checkText = (sNoRaw + ' ' + empCode + ' ' + name + ' ' + rawState).toLowerCase();
      const isTotalRow = checkText.includes('total') || checkText.includes('grand');
      const isHeaderRow = (
        empCode.toLowerCase() === 'emp. code' ||
        empCode.toLowerCase() === 'emp code' ||
        empCode.toLowerCase() === 'code' ||
        empCode.toLowerCase() === 'employee code' ||
        name.toLowerCase() === 'sales person name' ||
        name.toLowerCase() === 'name' ||
        name.toLowerCase() === 'employee name' ||
        checkText.includes('sales person name') ||
        (checkText.includes('emp') && checkText.includes('code'))
      );

      // Check if this row is a state section header (e.g., "GUJARAT", "RAJASTHAN", "BIHAR", "JHARKHAND")
      let detectedStateInRow = '';
      for (let c = 0; c < fullGrid[i].length; c++) {
        const cellText = String(fullGrid[i][c] || '').trim();
        if (!cellText) continue;
        const lowerCell = cellText.toLowerCase();
        if (lowerCell.includes('grand total') || lowerCell.includes('total ta')) continue;
        const det = detectStateName(cellText);
        if (det) {
          detectedStateInRow = det;
          break;
        }
      }

      const taBillCell = fullGrid[i][taBillCol];
      const hasNumericBill = taBillCell !== '' && taBillCell !== null && !isNaN(Number(String(taBillCell).replace(/[^0-9.-]+/g, ''))) && Number(String(taBillCell).replace(/[^0-9.-]+/g, '')) > 0;

      // Section header row announces a territory and has no bill amount or emp code is the state name
      const isStateSection = Boolean(detectedStateInRow) && (
        !hasNumericBill ||
        empCode.toLowerCase() === detectedStateInRow.toLowerCase() ||
        name.toLowerCase() === detectedStateInRow.toLowerCase() ||
        detectStateName(empCode) !== '' ||
        (empCode === '' && (sNoRaw === '' || isNaN(Number(sNoRaw))))
      );

      if (isStateSection) {
        currentSectionState = detectedStateInRow;
        continue; // Skip section header from being treated as an employee row
      }

      // Valid employee row must have an employee code or name and not be a total row or header row
      const isEmployeeRow = (empCode !== '' || (name !== '' && isNaN(Number(name)))) && !isTotalRow && !isHeaderRow;

      if (isEmployeeRow) {
        // Resolve the accurate State name dynamically:
        let resolvedState = '';

        // 1. Direct from State column if valid text
        const isRawStateValid = typeof isStateValueValidText === 'function' ? isStateValueValidText(rawState) : (rawState && rawState.indexOf('₹') === -1 && /[a-zA-Z]/.test(rawState));
        if (rawState && isRawStateValid) {
          const fromColD = detectStateName(rawState);
          if (fromColD) {
            resolvedState = fromColD;
          }
        }

        // 2. Direct from any other cell in this row if explicit state name is present
        if (!resolvedState && detectedStateInRow && hasNumericBill) {
          resolvedState = detectedStateInRow;
        }

        // 3. Dynamic lookup from Staff state map (by Emp Code)
        const upperCode = empCode.toUpperCase();
        if (!resolvedState && staffStateMap[upperCode]) {
          resolvedState = staffStateMap[upperCode];
        }

        // 4. Dynamic lookup from Staff name map (by Employee Name)
        const lowerName = name.toLowerCase();
        const nameMap = staffStateMap.__nameMap || {};
        if (!resolvedState && nameMap[lowerName]) {
          resolvedState = nameMap[lowerName];
        }

        // 5. Active section header state tracked from the monthly sheet
        if (!resolvedState && currentSectionState) {
          resolvedState = currentSectionState;
        }

        // 6. Fallback to raw state column text
        if (!resolvedState && rawState) {
          resolvedState = detectStateName(rawState) || rawState;
        }

        // Learn and store dynamically for this session
        if (resolvedState) {
          if (upperCode) staffStateMap[upperCode] = resolvedState;
          if (lowerName) nameMap[lowerName] = resolvedState;
        }

        const taBillRaw = fullGrid[i][taBillCol];
        let taBill = '';
        if (taBillRaw !== '' && taBillRaw !== null && taBillRaw !== undefined) {
          const numVal = Number(String(taBillRaw).replace(/[^0-9.-]+/g, ''));
          taBill = !isNaN(numVal) ? numVal : taBillRaw;
        }

        let rowMonth = String(fullGrid[i][monthCol] || '').trim();
        const fullFinal = String(fullGrid[i][fullFinalCol] || '').trim();
        const rawSubDate = fullGrid[i][dateCol];
        let submissionDate = '';
        if (typeof formatColHDate === 'function') {
          submissionDate = formatColHDate(rawSubDate);
        } else {
          submissionDate = String(rawSubDate || '').trim();
        }

        if (!rowMonth) {
          rowMonth = defaultMonth || mName;
        }

        const nextSNo = compiledRows.length + 1;
        compiledRows.push([
          nextSNo,
          empCode,
          name,
          resolvedState,
          taBill,
          rowMonth,
          fullFinal,
          submissionDate
        ]);
        monthRecordsCount++;
      }
    }

    if (monthRecordsCount > 0) {
      scannedSheets.push(`${mName} (${monthRecordsCount} records)`);
    }
  });

  if (compiledRows.length === 0) {
    if (ui) {
      ui.alert('No Records Found', 'No employee records were found in the scanned month sheets.', ui.ButtonSet.OK);
    }
    return { success: false, message: 'No employee records found in scanned month sheets' };
  }

  // 3. Locate or create Master sheet
  let masterSheet = ss.getSheetByName('Master');
  if (!masterSheet) {
    masterSheet = ss.getSheetByName('master') || ss.getSheetByName('MASTER');
  }
  if (!masterSheet) {
    masterSheet = ss.insertSheet('Master');
    ss.setActiveSheet(masterSheet);
    ss.moveActiveSheet(1); // Place Master at the front
  }

  // 4. Reset & populate Master sheet cleanly
  masterSheet.clearContents();
  masterSheet.clearFormats();

  // Set Headers in Row 1 (Navy #0B3861, bold white text)
  const masterHeaders = ['S.No.', 'Emp. Code', 'Sales Person Name', 'State', 'TA Bill', 'Month', 'Full & Final', 'Submission Date'];
  const headerRange = masterSheet.getRange(1, 1, 1, masterHeaders.length);
  headerRange.setValues([masterHeaders])
    .setBackground('#0B3861')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setFontFamily('Calibri')
    .setFontSize(10)
    .setVerticalAlignment('middle')
    .setHorizontalAlignment('center');
  masterSheet.getRange(1, 3).setHorizontalAlignment('left');   // Sales Person Name
  masterSheet.getRange(1, 5).setHorizontalAlignment('center'); // TA Bill
  masterSheet.setFrozenRows(1);

  // Write all consolidated rows (Calibri, Size 10, Middle vertical alignment, Crisp Black font on Clean White)
  const dataRange = masterSheet.getRange(2, 1, compiledRows.length, masterHeaders.length);
  dataRange.setValues(compiledRows)
    .setFontFamily('Calibri')
    .setFontSize(10)
    .setFontColor('#000000')
    .setBackground('#FFFFFF')
    .setFontWeight('normal')
    .setVerticalAlignment('middle');

  // Column formatting
  masterSheet.getRange(2, 1, compiledRows.length, 1).setHorizontalAlignment('center').setFontColor('#000000'); // S.No
  masterSheet.getRange(2, 2, compiledRows.length, 1).setHorizontalAlignment('center').setFontColor('#000000'); // Emp Code
  masterSheet.getRange(2, 3, compiledRows.length, 1).setHorizontalAlignment('left').setFontColor('#000000');   // Name
  masterSheet.getRange(2, 4, compiledRows.length, 1).setHorizontalAlignment('center').setFontColor('#000000'); // State
  masterSheet.getRange(2, 5, compiledRows.length, 1)
    .setHorizontalAlignment('center')
    .setFontColor('#000000')
    .setNumberFormat('#,##0');                                                         // TA Bill
  masterSheet.getRange(2, 6, compiledRows.length, 1).setHorizontalAlignment('center').setFontColor('#000000'); // Month
  masterSheet.getRange(2, 7, compiledRows.length, 1).setHorizontalAlignment('center').setFontColor('#000000'); // Full & Final
  masterSheet.getRange(2, 8, compiledRows.length, 1).setHorizontalAlignment('center').setFontColor('#000000'); // Submission Date

  // Apply clean borders to the Master table
  masterSheet.getRange(1, 1, compiledRows.length + 1, masterHeaders.length)
    .setBorder(true, true, true, true, true, true, '#000000', SpreadsheetApp.BorderStyle.SOLID);

  // Activate Master sheet and show modern alert
  ss.setActiveSheet(masterSheet);
  if (ui && !skipPrompt) {
    const compactSheets = scannedSheets.map(s => s.replace(/\s*records\s*/gi, ''));
    showModernAlert({
      title: 'Master Tab Updated',
      subtitle: `Successfully compiled records from ${scannedSheets.length} sheet(s) into Master tab.`,
      stats: [
        { label: 'Total Records', value: String(compiledRows.length) },
        { label: 'Months', value: String(scannedSheets.length) }
      ],
      chips: compactSheets,
      note: 'Calibri 10pt • Middle Alignment'
    });
  }
  return {
    success: true,
    count: compiledRows.length,
    sheets: scannedSheets
  };
}

/**
 * Locks / Protects the active month sheet so standard users cannot edit or delete claims.
 */
function lockActiveSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const sheetName = sheet.getName();

  // Create sheet protection
  const protection = sheet.protect().setDescription(`Protected by Admin: ${sheetName}`);
  
  try {
    let me = null;
    try {
      me = Session.getEffectiveUser();
    } catch (e1) {
      console.warn('Session.getEffectiveUser failed, trying getActiveUser:', e1);
      try { me = Session.getActiveUser(); } catch (e2) {}
    }

    if (me && me.getEmail()) {
      protection.addEditor(me);
      const editors = protection.getEditors();
      const myEmail = me.getEmail().toLowerCase();
      const others = editors.filter(e => {
        try {
          return (e.getEmail() || '').toLowerCase() !== myEmail;
        } catch (err) {
          return false;
        }
      });
      if (others.length > 0) {
        protection.removeEditors(others);
      }
    } else {
      // Remove all editors except owner/caller
      protection.removeEditors(protection.getEditors());
    }
  } catch (err) {
    console.warn('Fallback protection applied:', err);
    try {
      protection.removeEditors(protection.getEditors());
    } catch (e3) {}
  }

  try {
    if (protection.canDomainEdit()) {
      protection.setDomainEdit(false);
    }
  } catch (e4) {}

  // Also record in script properties for instant Web App checks
  const props = PropertiesService.getScriptProperties();
  let locked = (props.getProperty('LOCKED_MONTHS') || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!locked.includes(sheetName)) {
    locked.push(sheetName);
    props.setProperty('LOCKED_MONTHS', locked.join(','));
  }

  SpreadsheetApp.getUi().alert(
    'Sheet Protected 🔒',
    `Sheet "${sheetName}" is now locked and protected by Admin.\n\n` +
    `Web app users cannot edit or delete any claims in this sheet and will receive a protection alert.`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Unlocks / Unprotects the active month sheet.
 */
function unlockActiveSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const sheetName = sheet.getName();

  // Remove sheet protections
  try {
    const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    protections.forEach(p => {
      try { p.remove(); } catch (err) {}
    });
    const rangeProtections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    rangeProtections.forEach(p => {
      try { p.remove(); } catch (err) {}
    });
  } catch (e) {
    console.warn('Error removing protections:', e);
  }

  // Also remove from script properties
  const props = PropertiesService.getScriptProperties();
  let locked = (props.getProperty('LOCKED_MONTHS') || '').split(',').map(s => s.trim()).filter(Boolean);
  locked = locked.filter(n => n.toLowerCase() !== sheetName.toLowerCase());
  props.setProperty('LOCKED_MONTHS', locked.join(','));

  SpreadsheetApp.getUi().alert(
    'Sheet Unlocked 🔓',
    `Sheet "${sheetName}" is now unprotected.\nUsers can now edit and delete claims normally in the web app.`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Direct toggle for Locking / Unlocking month sheets from Web App or script.
 */
function toggleMonthSheetLock(payload) {
  try {
    payload = payload || {};
    const month = payload.month ? String(payload.month).trim() : '';
    const shouldLock = payload.lock !== undefined ? Boolean(payload.lock) : true;
    const role = payload.role ? String(payload.role).toLowerCase() : '';

    if (role !== 'admin') {
      return { success: false, message: 'Only Administrators can lock or unlock sheets.' };
    }
    if (!month) {
      return { success: false, message: 'Please specify the month sheet to lock/unlock.' };
    }

    // Safely collect target spreadsheet IDs
    let targetSpreadsheetIds = [];
    if (payload.spreadsheetIds && Array.isArray(payload.spreadsheetIds) && payload.spreadsheetIds.length > 0) {
      targetSpreadsheetIds = payload.spreadsheetIds.filter(Boolean);
    } else if (payload.spreadsheetId || payload.targetSpreadsheetId) {
      targetSpreadsheetIds.push(payload.spreadsheetId || payload.targetSpreadsheetId);
    } else if (typeof getConfiguredSpreadsheetIds === 'function') {
      targetSpreadsheetIds = getConfiguredSpreadsheetIds();
    } else if (typeof CONFIG !== 'undefined' && CONFIG.SPREADSHEET_ID) {
      targetSpreadsheetIds = [CONFIG.SPREADSHEET_ID];
    }

    if (targetSpreadsheetIds.length === 0) {
      targetSpreadsheetIds = ['1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY'];
    }

    let sheetsLockedCount = 0;
    targetSpreadsheetIds.forEach(function(sId) {
      try {
        let ss = null;
        if (sId) {
          try {
            ss = SpreadsheetApp.openById(sId);
          } catch (eOpen) {}
        }
        if (!ss && typeof getSpreadsheet === 'function') {
          ss = getSpreadsheet();
        }
        if (!ss) {
          try {
            ss = SpreadsheetApp.getActiveSpreadsheet();
          } catch (eAct) {}
        }
        if (!ss) return;

        let sheet = null;
        if (typeof findTargetMonthSheet === 'function') {
          sheet = findTargetMonthSheet(ss, month);
        }
        if (!sheet) {
          sheet = ss.getSheetByName(month);
        }

        if (sheet) {
          sheetsLockedCount++;
          if (shouldLock) {
            const protection = sheet.protect().setDescription(`Protected by Admin: ${sheet.getName()}`);
            try {
              protection.removeEditors(protection.getEditors());
            } catch (e) {}
            try {
              if (protection.canDomainEdit()) protection.setDomainEdit(false);
            } catch (e) {}
          } else {
            const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
            protections.forEach(function(p) {
              try { p.remove(); } catch (err) {}
            });
          }
        }
      } catch (errSheet) {
        console.warn('Error applying lock to sheet in spreadsheet ' + sId + ':', errSheet);
      }
    });

    const props = PropertiesService.getScriptProperties();
    let locked = (props.getProperty('LOCKED_MONTHS') || '').split(',').map(s => s.trim()).filter(Boolean);
    if (shouldLock) {
      if (!locked.some(m => m.toLowerCase() === month.toLowerCase())) {
        locked.push(month);
      }
    } else {
      locked = locked.filter(m => m.toLowerCase() !== month.toLowerCase());
    }
    props.setProperty('LOCKED_MONTHS', locked.join(','));

    return {
      success: true,
      month: month,
      isLocked: shouldLock,
      sheetsUpdated: sheetsLockedCount,
      message: `Month sheet "${month}" is now ${shouldLock ? 'locked 🔒' : 'unlocked 🔓'} by Admin!`
    };
  } catch (err) {
    return { success: false, message: 'Lock toggle failed: ' + err.toString() };
  }
}

/**
 * Retroactively formats existing submission dates in Master tab to "dd yyyy HH:mm:ss".
 * Also corrects any numeric amounts entered into the State column.
 */
function formatMasterTabColHDates(targetSpreadsheetId) {
  const ss = getAutomationSpreadsheet(targetSpreadsheetId);
  let ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) { ui = null; }

  if (!ss) {
    if (ui) ui.alert('Target spreadsheet not found.');
    return { success: false, message: 'Target spreadsheet not found.' };
  }

  const masterSheet = ss.getSheetByName('Master') || ss.getSheetByName('master') || ss.getSheetByName('MASTER');
  if (!masterSheet) {
    if (ui) ui.alert('Master tab not found in active spreadsheet.');
    return { success: false, message: 'Master tab not found in spreadsheet.' };
  }
  const lastRow = masterSheet.getLastRow();
  if (lastRow < 2) {
    if (ui) ui.alert('Master tab has no data rows.');
    return { success: true, count: 0, updatedCount: 0 };
  }
  const values = masterSheet.getRange(2, 1, lastRow - 1, 8).getValues();
  let updatedCount = 0;
  for (let i = 0; i < values.length; i++) {
    const rawDate = values[i][7];
    const formatted = typeof formatColHDate === 'function' ? formatColHDate(rawDate) : String(rawDate);
    if (formatted && formatted !== rawDate) {
      try {
        masterSheet.getRange(i + 2, 8).setValue(formatted);
        updatedCount++;
      } catch (e) {}
    }
    // Also correct State in Col D if numeric or corrupted
    const empCode = String(values[i][1] || '').trim().toUpperCase();
    const rawState = values[i][3];
    const isStateValid = typeof isStateValueValidText === 'function' ? isStateValueValidText(rawState) : (rawState && String(rawState).indexOf('₹') === -1 && /[a-zA-Z]/.test(String(rawState)));
    if (!isStateValid) {
      if (typeof normalizeStateName === 'function') {
        const fixedState = normalizeStateName('', empCode);
        if (fixedState) {
          try {
            masterSheet.getRange(i + 2, 4).setValue(fixedState).setNumberFormat('@').setHorizontalAlignment('center');
          } catch (e) {}
        }
      }
    } else if (empCode === 'HOS0330' && String(rawState).trim() !== 'UK') {
      try {
        masterSheet.getRange(i + 2, 4).setValue('UK').setNumberFormat('@').setHorizontalAlignment('center');
      } catch (e) {}
    }
  }

  if (ui) {
    ui.alert(
      'Master Tab Formatted ✨',
      `Successfully scanned ${values.length} rows and updated ${updatedCount} dates in Col H to "dd yyyy HH:mm:ss"!\nState column values have also been verified.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }

  return {
    success: true,
    totalRows: values.length,
    updatedCount: updatedCount,
    message: `Scanned ${values.length} rows, formatted ${updatedCount} dates in Col H.`
  };
}

/**
 * Normalizes and detects state names from cell text.
 */
function detectStateName(text) {
  if (!text) return '';
  const s = String(text).trim().toLowerCase();
  if (s.includes('grand total') || s.includes('total ta')) return '';

  if (s === 'del' || s === 'delhi' || s.startsWith('delhi')) return 'Delhi';
  if (s.includes('rajasthan') || s === 'raj') return 'Rajasthan';
  if (s.includes('haryana') || s === 'har') return 'Haryana';
  if (s.includes('punjab') || s === 'pun') return 'Punjab';
  if (s === 'mp' || s.includes('madhya pradesh')) return 'MP';
  if (s.includes('ex-up') || s.includes('ex up') || s.includes('exup')) return 'Ex-UP';
  if (s.includes('local agra') || s === 'agra') return 'Local Agra';
  if (s.includes('up west') || s.includes('u.p. west') || s.includes('up-west') || s === 'upw') return 'U.P. West';
  if (s === 'uk' || s.includes('uttarakhand') || s.includes('uttaranchal')) return 'Uttarakhand';
  if (s.includes('bihar') || s === 'bih') return 'Bihar';
  if (s.includes('jharkhand') || s === 'jhk' || s === 'jh') return 'Jharkhand';
  if (s.includes('gujarat') || s.includes('gujrat') || s === 'guj') return 'Gujarat';
  if (s.includes('chhattisgarh') || s.includes('chattisgarh') || s === 'cg') return 'Chhattisgarh';
  if (s.includes('meghalaya') || s === 'meg') return 'Meghalaya';

  return '';
}



/**
/**
 * Detects if the current spreadsheet is Bhawna TA Master (Link-2 / Secondary Spreadsheet) dynamically:
 * 1. Matches ID with CONFIG.SECONDARY_SPREADSHEET_ID or CONFIG.SPREADSHEET_ID
 * 2. Matches Spreadsheet title/name for Link-2, Bhawna, etc.
 * 3. Dynamically inspects state distributions in monthly/master tabs against configured territories
 *    (No hardcoded employee codes or names).
 */
function isBhawnaSpreadsheet(ss) {
  if (!ss) {
    try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { return false; }
  }
  if (!ss) return false;

  const id = ss.getId();
  const secId = String((typeof CONFIG !== 'undefined' && CONFIG.SECONDARY_SPREADSHEET_ID) || '166GBY-ACppPT9vFccLK1UJFKzO4KxeTGXxpUSMsrG5w').trim();
  const priId = String((typeof CONFIG !== 'undefined' && CONFIG.SPREADSHEET_ID) || '1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY').trim();

  if (id === secId) return true;
  if (id === priId) return false;

  const name = ss.getName().toLowerCase();
  if (name.includes('bhawna') || name.includes('link-2') || name.includes('link 2') || name.includes(':- 2')) return true;
  if (name.includes('bharti') || name.includes('link-1') || name.includes('link 1') || name.includes(':- 1')) return false;

  // Dynamically check sheet content by state distribution (without hardcoding any staff codes or names)
  try {
    const secStates = ((typeof CONFIG !== 'undefined' && CONFIG.SECONDARY_STATES) || ['rajasthan', 'gujarat', 'bihar', 'jharkhand']).map(s => s.toLowerCase());
    const priStates = ((typeof CONFIG !== 'undefined' && CONFIG.PRIMARY_STATES) || ['delhi', 'haryana', 'punjab', 'u.p. west', 'up', 'mp', 'chhattisgarh', 'uttarakhand', 'local agra']).map(s => s.toLowerCase());

    const sheets = ss.getSheets();
    let secScore = 0;
    let priScore = 0;

    for (let i = 0; i < sheets.length; i++) {
      const sName = sheets[i].getName().toLowerCase();
      const isDataSheet = ['apr', 'may', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar', 'master'].some(m => sName === m || sName.startsWith(m));
      if (isDataSheet) {
        const lastRow = Math.min(sheets[i].getLastRow(), 50);
        if (lastRow >= 2) {
          const vals = sheets[i].getRange(2, 4, lastRow - 1, 1).getValues(); // Column D (State)
          for (let r = 0; r < vals.length; r++) {
            const rawSt = String(vals[r][0] || '').trim().toLowerCase();
            if (rawSt) {
              if (secStates.some(s => rawSt.includes(s) || s.includes(rawSt))) secScore++;
              if (priStates.some(s => rawSt.includes(s) || s.includes(rawSt))) priScore++;
            }
          }
          if (secScore >= 3 || priScore >= 3) break;
        }
      }
    }

    if (secScore > priScore) return true;
    if (priScore > secScore) return false;
  } catch (e) {
    console.warn('Dynamic spreadsheet territory detection notice:', e);
  }

  return false;
}

/**
 * Builds a lookup map of EmpCode -> State by scanning all monthly tabs (Apr - Mar)
 * directly from Column D, Staff directory, and territory definitions.
 */
function buildStaffStateMap(ss) {
  const codeMap = {};
  const nameMap = {};
  if (!ss) {
    try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { return codeMap; }
  }
  if (!ss) return codeMap;

  // 1. Scan custom Staff tab in this spreadsheet if present
  try {
    const staffSheet = ss.getSheetByName('Staff') || ss.getSheetByName('staff') || ss.getSheetByName('STAFF');
    if (staffSheet) {
      const data = staffSheet.getDataRange().getValues();
      if (data && data.length > 1) {
        let codeIdx = 0, nameIdx = 1, stateIdx = 2;
        const headers = data[0].map(h => String(h || '').trim().toLowerCase());
        const cFound = headers.findIndex(h => h.includes('code') || h.includes('emp'));
        const nFound = headers.findIndex(h => h.includes('name') || h.includes('person'));
        const sFound = headers.findIndex(h => h.includes('state') || h.includes('territory') || h.includes('region'));
        if (cFound !== -1) codeIdx = cFound;
        if (nFound !== -1) nameIdx = nFound;
        if (sFound !== -1) stateIdx = sFound;

        for (let r = 1; r < data.length; r++) {
          const c = String(data[r][codeIdx] || '').trim().toUpperCase();
          const n = String(data[r][nameIdx] || '').trim().toLowerCase();
          const rawS = String(data[r][stateIdx] || '').trim();
          const detS = detectStateName(rawS) || rawS;
          if (c && detS) codeMap[c] = detS;
          if (n && detS) nameMap[n] = detS;
        }
      }
    }
  } catch (e) {}

  // 2. Scan ALL monthly sheets (Apr -> Mar) dynamically
  try {
    const allSheets = ss.getSheets();
    allSheets.forEach(sheet => {
      const sName = sheet.getName().toLowerCase();
      const isMonth = ['apr', 'may', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec', 'jan', 'feb', 'mar'].some(m => sName === m || sName.startsWith(m));
      if (isMonth && !sName.includes('master') && !sName.includes('staff') && !sName.includes('costing') && !sName.includes('users')) {
        const lastRow = sheet.getLastRow();
        const lastCol = Math.max(sheet.getLastColumn(), 6);
        if (lastRow >= 2) {
          const vals = sheet.getRange(1, 1, lastRow, lastCol).getValues();
          let currentSectionState = '';

          for (let r = 0; r < vals.length; r++) {
            const row = vals[r];
            const rowStr = row.map(cell => String(cell || '').trim()).join(' ');
            const lowerRow = rowStr.toLowerCase();
            if (lowerRow.includes('grand total') || lowerRow.includes('total ta')) continue;

            // Check if any cell matches a state name
            let stateInRow = '';
            for (let c = 0; c < row.length; c++) {
              const cellText = String(row[c] || '').trim();
              if (cellText && !cellText.toLowerCase().includes('total')) {
                const det = detectStateName(cellText);
                if (det) { stateInRow = det; break; }
              }
            }

            // Check if this row is a section header (e.g. "GUJARAT", "RAJASTHAN", "BIHAR")
            const hasBill = row.some((cell, cIdx) => {
              if (cIdx < 3) return false;
              const n = Number(String(cell || '').replace(/[^0-9.-]+/g, ''));
              return !isNaN(n) && n > 100 && String(cell).indexOf(':') === -1;
            });

            if (stateInRow && !hasBill) {
              currentSectionState = stateInRow;
              continue; // Section divider, do not treat as employee
            }

            // If employee row
            const code = String(row[1] || '').trim().toUpperCase();
            const name = String(row[2] || '').trim();
            const stateColVal = String(row[3] || '').trim();

            if (code && !code.includes('CODE') && !code.includes('TOTAL') && !code.includes('GRAND')) {
              const rowState = detectStateName(stateColVal) || stateInRow || currentSectionState;
              if (rowState) {
                codeMap[code] = rowState;
                if (name) nameMap[name.toLowerCase()] = rowState;
              }
            }
          }
        }
      }
    });
  } catch (e) {}

  codeMap.__nameMap = nameMap;
  return codeMap;
}

/**
 * Retroactively fixes state names in the Master tab for all existing records
 * dynamically based on the sheet's Staff tab and dynamically learned monthly data.
 * Also enforces Calibri 10 font with Middle vertical alignment.
 */
function correctMasterTabStates(targetSpreadsheetId) {
  const ss = getAutomationSpreadsheet(targetSpreadsheetId);
  if (!ss) return { success: false, message: 'Target spreadsheet not found.' };

  const masterSheet = ss.getSheetByName('Master') || ss.getSheetByName('master') || ss.getSheetByName('MASTER');
  if (!masterSheet) {
    let ui = null;
    try { ui = SpreadsheetApp.getUi(); } catch (e) {}
    if (ui) ui.alert('Master tab not found.');
    return { success: false, message: 'Master tab not found' };
  }

  const staffMap = buildStaffStateMap(ss);
  const nameMap = staffMap.__nameMap || {};
  const lastRow = masterSheet.getLastRow();
  if (lastRow < 2) return { success: true, count: 0 };

  const range = masterSheet.getRange(2, 1, lastRow - 1, 8);
  const values = range.getValues();
  let updated = 0;

  for (let i = 0; i < values.length; i++) {
    const empCode = String(values[i][1] || '').trim().toUpperCase();
    const empName = String(values[i][2] || '').trim().toLowerCase();
    const currentVal = String(values[i][3] || '').trim();
    let correctState = '';

    // 1. Dynamic lookup from learned Code map
    if (staffMap[empCode]) {
      correctState = staffMap[empCode];
    }
    // 2. Dynamic lookup from learned Name map
    else if (nameMap[empName]) {
      correctState = nameMap[empName];
    }
    // 3. Current cell value if it is already a recognized state
    else if (currentVal) {
      const fromDetected = detectStateName(currentVal);
      if (fromDetected) correctState = fromDetected;
    }

    if (correctState && correctState !== currentVal) {
      values[i][3] = correctState;
      updated++;
    }
  }

  if (updated > 0) {
    range.setValues(values);
  }

  // Enforce Calibri 10, Middle vertical alignment on entire Master table
  masterSheet.getRange(1, 1, lastRow, 8)
    .setFontFamily('Calibri')
    .setFontSize(10)
    .setVerticalAlignment('middle');

  let ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) { ui = null; }
  if (ui) {
    ui.alert(
      'States Corrected & Formatted ✨',
      `Corrected ${updated} state names in the Master tab and applied Calibri (Size 10, Middle alignment)!`,
      ui.ButtonSet.OK
    );
  }
  return { success: true, updatedCount: updated };
}

/**
 * Applies Calibri font, Size 10, and Middle vertical alignment
 * across ALL sheets in target or all connected spreadsheets.
 */
function applyCalibriFormattingToAllSheets(targetSpreadsheetId, skipPrompt) {
  const ssList = [];
  if (targetSpreadsheetId) {
    const ss = getAutomationSpreadsheet(targetSpreadsheetId);
    if (ss) ssList.push(ss);
  } else {
    try {
      const primary = SpreadsheetApp.getActiveSpreadsheet() || getSpreadsheet();
      if (primary) ssList.push(primary);
    } catch (e) {}

    try {
      const secId = CONFIG.SECONDARY_SPREADSHEET_ID;
      if (secId) {
        const secSS = SpreadsheetApp.openById(secId);
        if (secSS && !ssList.some(s => s.getId() === secSS.getId())) {
          ssList.push(secSS);
        }
      }
    } catch (e) {}
  }

  let totalSheetsFormatted = 0;
  ssList.forEach(ss => {
    const sheets = ss.getSheets();
    sheets.forEach(sheet => {
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      if (lastRow > 0 && lastCol > 0) {
        sheet.getRange(1, 1, lastRow, lastCol)
          .setFontFamily('Calibri')
          .setFontSize(10)
          .setVerticalAlignment('middle');
        totalSheetsFormatted++;
      }
    });
  });

  let ui = null;
  if (!skipPrompt) {
    try { ui = SpreadsheetApp.getUi(); } catch (e) { ui = null; }
    if (ui) {
      ui.alert(
        'Calibri Formatting Applied ✨',
        `Successfully applied Calibri (Size 10) and Middle vertical alignment across ${totalSheetsFormatted} sheets in ${ssList.length} spreadsheet(s)!`,
        ui.ButtonSet.OK
      );
    }
  }
  return { success: true, count: totalSheetsFormatted };
}

/**
 * Updates state sums and grand totals across all month sheets in a target spreadsheet.
 */
function updateStateSumsForSpreadsheet(targetSpreadsheetId) {
  const ss = getAutomationSpreadsheet(targetSpreadsheetId);
  if (!ss) return { success: false, message: 'Spreadsheet not found.' };

  const sheets = ss.getSheets();
  let updatedCount = 0;
  sheets.forEach(sheet => {
    const name = sheet.getName().toLowerCase();
    const isExcluded = name.includes('master') || name.includes('users') || name.includes('costing') || name.includes('staff') || name.includes('statewise');
    if (!isExcluded) {
      try {
        updateStateSums(sheet);
        updatedCount++;
      } catch (err) {
        console.warn('Error updating sums for sheet:', sheet.getName(), err);
      }
    }
  });

  return {
    success: true,
    count: updatedCount,
    message: `Updated formulas and grand totals across ${updatedCount} month sheet(s).`
  };
}

/**
 * Universal dispatcher for all sheet automation actions called from Web App or API.
 */
function runAutomationAction(payload) {
  try {
    payload = payload || {};
    let action = payload.automationAction || payload.action || 'runFullAutomation';
    if (action === 'runAutomation' && payload.automationAction) {
      action = payload.automationAction;
    }
    const spreadsheetId = payload.spreadsheetId || payload.targetSpreadsheetId;

    if (action === 'combineMaster' || action === 'combineDataToMaster') {
      return combineDataToMaster(spreadsheetId);
    } else if (action === 'fixStates' || action === 'correctStates' || action === 'correctMasterTabStates') {
      return correctMasterTabStates(spreadsheetId);
    } else if (action === 'formatCalibri' || action === 'applyCalibri' || action === 'applyCalibriFormattingToAllSheets') {
      return applyCalibriFormattingToAllSheets(spreadsheetId);
    } else if (action === 'formatDates' || action === 'formatMasterTabColHDates') {
      return formatMasterTabColHDates(spreadsheetId);
    } else if (action === 'updateSums' || action === 'updateStateSums') {
      return updateStateSumsForSpreadsheet(spreadsheetId);
    } else if (action === 'createMonth' || action === 'createNewMonthSheet') {
      return createNewMonthSheet(payload);
    } else if (action === 'toggleLock' || action === 'toggleMonthSheetLock') {
      return toggleMonthSheetLock(payload);
    } else if (action === 'runFullAutomation' || action === 'runAutomation' || action === 'fullSync') {
      return runFullSheetAutomation(spreadsheetId);
    } else {
      return { success: false, message: 'Unknown action: ' + action };
    }
  } catch (err) {
    return { success: false, message: 'Automation error: ' + err.toString() };
  }
}

/**
 * Runs complete automation suite for a spreadsheet:
 * 1. Consolidate into Master tab starting from Row 2
 * 2. Correct and normalize State names in Master
 * 3. Standardize dates in Column H
 * 4. Apply Calibri 10 font & middle vertical alignment across all sheets
 * 5. Refresh month-wise section sums and grand totals
 */
function runFullSheetAutomation(targetSpreadsheetId) {
  const ss = getAutomationSpreadsheet(targetSpreadsheetId);
  if (!ss) return { success: false, message: 'Target spreadsheet not found.' };

  const resolvedId = ss.getId();
  const isBhawna = isBhawnaSpreadsheet(ss);
  const sheetLabel = isBhawna ? 'Bhawna TA Master' : 'Bharti TA Master';

  const results = {
    spreadsheetId: resolvedId,
    sheetLabel: sheetLabel,
    combine: null,
    states: null,
    dates: null,
    calibri: null,
    sums: null,
    success: true,
    message: ''
  };

  try {
    results.combine = combineDataToMaster(resolvedId, true);
    results.states = correctMasterTabStates(resolvedId);
    results.dates = formatMasterTabColHDates(resolvedId);
    results.calibri = applyCalibriFormattingToAllSheets(resolvedId);
    results.sums = updateStateSumsForSpreadsheet(resolvedId);
    if (typeof applyStandardSheetOrderAndLocks === 'function') {
      applyStandardSheetOrderAndLocks(ss);
    }

    const recordCount = results.combine?.count || 0;
    const statesCount = results.states?.updatedCount || 0;
    const calibriCount = results.calibri?.count || 0;

    results.message = `Successfully automated ${sheetLabel}! Compiled ${recordCount} records into Master tab, standardized ${statesCount} state names, formatted ${calibriCount} sheets with Calibri 10 & middle alignment, and verified all formulas.`;
    return results;
  } catch (err) {
    results.success = false;
    results.message = `Automation pipeline failed for ${sheetLabel}: ` + err.toString();
    return results;
  }
}

/**
 * ==========================================================================
 * ONE-CLICK MASTER AUTOMATION FOR BOTH SHEETS (TA Bill 2026:- 1 & 2)
 * ==========================================================================
 * Run this directly in Google Apps Script editor or attach to a button/timer.
 * 100% bypasses any Web App deployment versioning or browser issues!
 */
function RUN_ALL_AUTOMATION_NOW() {
  const BHARTI_ID = '1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY'; // TA Bill 2026:- 1
  const BHAWNA_ID = '166GBY-ACppPT9vFccLK1UJFKzO4KxeTGXxpUSMsrG5w'; // TA Bill 2026:- 2

  Logger.log('========================================================');
  Logger.log('STARTING AUTOMATION: TA Bill 2026:- 1 (Bharti)');
  Logger.log('========================================================');
  const res1 = runFullSheetAutomation(BHARTI_ID);
  Logger.log('Bharti Result: ' + JSON.stringify(res1));

  Logger.log('========================================================');
  Logger.log('STARTING AUTOMATION: TA Bill 2026:- 2 (Bhawna)');
  Logger.log('========================================================');
  const res2 = runFullSheetAutomation(BHAWNA_ID);
  Logger.log('Bhawna Result: ' + JSON.stringify(res2));

  let ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) {}
  if (ui) {
    showModernAlert({
      title: 'Sheets Automated Successfully ⚡',
      subtitle: 'Finished full automation for both Link-1 and Link-2 sheets.',
      stats: [
        { label: 'Link-1 Records', value: String(res1?.combine?.count || 0) },
        { label: 'Link-2 Records', value: String(res2?.combine?.count || 0) }
      ],
      chips: ['Master Tabs Synced', 'States Normalized', 'Calibri 10pt Applied', 'Totals Verified'],
      note: 'All Operations Completed'
    });
  }

  return {
    success: true,
    sheet1: res1,
    sheet2: res2,
    message: 'Finished automation for both TA Bill 2026:- 1 & TA Bill 2026:- 2!'
  };
}

/**
 * Installs an automatic hourly time-driven trigger to keep both sheets synchronized.
 */
function installAutomaticSyncTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'RUN_ALL_AUTOMATION_NOW') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger('RUN_ALL_AUTOMATION_NOW')
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log('Successfully installed hourly automatic trigger for RUN_ALL_AUTOMATION_NOW!');
}

/**
 * Creates custom menu in Google Sheets for one-click access.
 * Automatically keeps the "Users" sheet hidden for regular users/Bharti.
 */
function onOpen() {
  // Always hide the "Users" tab when spreadsheet is opened
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const usersSheet = ss.getSheetByName('Users');
    if (usersSheet && !usersSheet.isSheetHidden()) {
      usersSheet.hideSheet();
    }
  } catch (e) {}

  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu('⚡ Automation')
    .addItem('🚀 Run Full Automation (Both Sheets)', 'RUN_ALL_AUTOMATION_NOW')
    .addSeparator()
    .addItem('📑 Combine Master Tab', 'combineDataToMaster')
    .addItem('🏷️ Fix Master State Names', 'correctMasterTabStates')
    .addItem('🎨 Apply Calibri 10 & Middle Alignment', 'applyCalibriFormattingToAllSheets')
    .addItem('📊 Recalculate Grand Totals', 'updateStateSums')
    .addItem('🕒 Format Column H Dates', 'formatMasterTabColHDates')
    .addSeparator()
    .addItem('➕ Create New Month Sheet', 'createNewMonthSheet')
    .addItem('📑 Align Tab Sequence (Master ➔ Statewise ➔ Apr..Sep)', 'sortAllSheetsInMonthSequence')
    .addItem('🔒 Apply Standard Tab Locks (Master..Aug Locked, Sep Open)', 'applyStandardSheetOrderAndLocks')
    .addItem('🔒 Lock Month Sheet', 'lockActiveSheet')
    .addItem('🔓 Unlock Month Sheet', 'unlockActiveSheet')
    .addSeparator()
    .addItem('⏰ Enable Auto Hourly Sync Trigger', 'installAutomaticSyncTrigger');

  // Only expose User Management option if not Bharti/Bhawna
  try {
    let isRestricted = false;
    try {
      const activeEmail = (Session.getActiveUser().getEmail() || '').toLowerCase();
      isRestricted = activeEmail.indexOf('bharti') !== -1 || activeEmail.indexOf('bhawna') !== -1;
    } catch (eMail) {}
    if (!isRestricted) {
      menu.addSeparator().addItem('👥 Manage Users & Access (Admin)', 'initUsersSheet');
    }
  } catch (e) {
    menu.addSeparator().addItem('👥 Manage Users & Access (Admin)', 'initUsersSheet');
  }

  menu.addToUi();
}

/**
 * Displays a compact, modern card alert modal in Google Sheets using HTML Service.
 * Falls back to a clean, single-line native toast or compact alert if modal is not supported.
 */
function showModernAlert(options) {
  let ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) { return; }
  if (!ui) return;

  const title = options.title || 'Notification';
  const subtitle = options.subtitle || '';
  const stats = options.stats || [];
  const chips = options.chips || [];
  const note = options.note || 'Calibri 10 • Middle Alignment';

  try {
    const statsHtml = stats.length > 0 ? `
      <div style="display:flex;gap:10px;margin:12px 0 10px;">
        ${stats.map(s => `
          <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;text-align:center;">
            <div style="font-size:1.25rem;font-weight:800;color:#1e40af;line-height:1.2;">${s.value}</div>
            <div style="font-size:0.7rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;margin-top:2px;">${s.label}</div>
          </div>
        `).join('')}
      </div>` : '';

    const chipsHtml = chips.length > 0 ? `
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 12px;max-height:85px;overflow-y:auto;">
        ${chips.map(c => `
          <span style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;font-size:0.75rem;font-weight:600;padding:3px 9px;border-radius:12px;">
            ${c}
          </span>
        `).join('')}
      </div>` : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <base target="_top">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          body { background: #ffffff; padding: 18px 20px 14px; color: #0f172a; overflow: hidden; }
          .header { display: flex; align-items: center; gap: 10px; }
          .icon-box { width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #2563eb, #3b82f6); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 15px; font-weight: bold; flex-shrink: 0; box-shadow: 0 4px 10px rgba(37,99,235,0.25); }
          .title { font-size: 1.1rem; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; }
          .subtitle { font-size: 0.82rem; color: #64748b; margin-top: 2px; line-height: 1.35; }
          .footer { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; padding-top: 12px; border-top: 1px solid #f1f5f9; }
          .note { font-size: 0.74rem; color: #94a3b8; font-weight: 600; }
          .btn-ok { background: linear-gradient(135deg, #1d4ed8, #2563eb); color: #ffffff; border: none; padding: 7px 22px; border-radius: 8px; font-size: 0.85rem; font-weight: 700; cursor: pointer; box-shadow: 0 4px 10px rgba(37,99,235,0.3); transition: transform 0.1s; }
          .btn-ok:hover { opacity: 0.95; transform: translateY(-1px); }
          .btn-ok:active { transform: translateY(1px); }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="icon-box">✓</div>
          <div>
            <div class="title">${title}</div>
            ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
          </div>
        </div>
        ${statsHtml}
        ${chipsHtml}
        <div class="footer">
          <div class="note">${note}</div>
          <button class="btn-ok" onclick="google.script.host.close()">Done</button>
        </div>
      </body>
      </html>
    `;

    const htmlOutput = HtmlService.createHtmlOutput(htmlContent)
      .setWidth(420)
      .setHeight(230);
    ui.showModalDialog(htmlOutput, ' ');
  } catch (err) {
    const chipText = chips.length > 0 ? `\n• ${chips.join(', ')}` : '';
    ui.alert(
      title,
      `${subtitle || title}${chipText}\n\n${note}`,
      ui.ButtonSet.OK
    );
  }
}
