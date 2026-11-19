/**
 * ============================================================================
 * DIRECT MASTER COMBINE & AUTOMATION SCRIPT (BULLETPROOF / STANDALONE)
 * ============================================================================
 * No Web App required. No UI prompts. No domain permission issues.
 * Run directly from Google Apps Script Editor or attach to a Sheet Button.
 * ============================================================================
 */

const DIRECT_SHEET_1_ID = '1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY'; // TA Bill 2026:- 1 (Bharti)
const DIRECT_SHEET_2_ID = '166GBY-ACppPT9vFccLK1UJFKzO4KxeTGXxpUSMsrG5w'; // TA Bill 2026:- 2 (Bhawna)

const DIRECT_MONTH_ORDER = [
  { short: 'Apr', patterns: ['apr', 'april'] },
  { short: 'May', patterns: ['may'] },
  { short: 'Jun', patterns: ['jun', 'june'] },
  { short: 'Jul', patterns: ['jul', 'july'] },
  { short: 'Aug', patterns: ['aug', 'august'] },
  { short: 'Sep', patterns: ['sep', 'sept', 'september'] },
  { short: 'Oct', patterns: ['oct', 'october'] },
  { short: 'Nov', patterns: ['nov', 'november'] },
  { short: 'Dec', patterns: ['dec', 'december'] },
  { short: 'Jan', patterns: ['jan', 'january'] },
  { short: 'Feb', patterns: ['feb', 'february'] },
  { short: 'Mar', patterns: ['mar', 'march'] }
];



/**
 * MAIN FUNCTION: Runs automation on BOTH spreadsheets in 1 click!
 */
function COMBINE_BOTH_SHEETS_NOW() {
  Logger.log('>>> [1/2] PROCESSING TA Bill 2026:- 1 (Bharti)...');
  const res1 = processDirectSpreadsheet(DIRECT_SHEET_1_ID, false);
  Logger.log('Result 1: ' + JSON.stringify(res1));

  Logger.log('>>> [2/2] PROCESSING TA Bill 2026:- 2 (Bhawna)...');
  const res2 = processDirectSpreadsheet(DIRECT_SHEET_2_ID, true);
  Logger.log('Result 2: ' + JSON.stringify(res2));

  return { sheet1: res1, sheet2: res2 };
}

/**
 * Process a single spreadsheet by ID or active spreadsheet
 */
function processDirectSpreadsheet(spreadsheetId, isBhawna) {
  let ss = null;
  if (spreadsheetId) {
    try {
      ss = SpreadsheetApp.openById(spreadsheetId);
    } catch (e) {
      Logger.log('Cannot open by ID ' + spreadsheetId + ', trying active: ' + e);
    }
  }
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  if (!ss) {
    throw new Error('Spreadsheet could not be opened: ' + spreadsheetId);
  }

  const allSheets = ss.getSheets();
  const orderedMonthSheets = [];

  DIRECT_MONTH_ORDER.forEach(def => {
    for (let i = 0; i < allSheets.length; i++) {
      const name = allSheets[i].getName().trim();
      const lower = name.toLowerCase();
      const isSystem = lower.includes('master') || lower.includes('staff') || lower.includes('costing') || lower.includes('users');
      if (!isSystem && def.patterns.some(p => lower === p || lower.startsWith(p))) {
        if (!orderedMonthSheets.some(m => m.sheet.getSheetId() === allSheets[i].getSheetId())) {
          orderedMonthSheets.push({ sheet: allSheets[i], name: name, label: def.short });
        }
      }
    }
  });

  if (orderedMonthSheets.length === 0) {
    Logger.log('No month sheets found in ' + ss.getName());
    return { count: 0, message: 'No month sheets found' };
  }

  const compiledRows = [];

  orderedMonthSheets.forEach(mObj => {
    const sheet = mObj.sheet;
    const lastRow = sheet.getLastRow();
    const lastCol = Math.max(sheet.getLastColumn(), 8);
    if (lastRow < 2) return;

    const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();

    // Identify header indices dynamically
    let sNoIdx = 0, codeIdx = 1, nameIdx = 2, stateIdx = 3, billIdx = 4, monthIdx = 5, fnfIdx = 6, dateIdx = 7;
    let startRow = 1;

    for (let r = 0; r < Math.min(data.length, 5); r++) {
      const rowTexts = data[r].map(c => String(c || '').trim().toLowerCase());
      if (rowTexts.some(t => t.includes('code') || t.includes('emp'))) {
        startRow = r + 1;
        rowTexts.forEach((t, cIdx) => {
          if (t.includes('s.no') || t.includes('sr.') || t === 'sno') sNoIdx = cIdx;
          else if (t.includes('code') || t.includes('emp')) codeIdx = cIdx;
          else if (t.includes('name') || t.includes('person')) nameIdx = cIdx;
          else if (t.includes('state') || t.includes('region')) stateIdx = cIdx;
          else if (t.includes('bill') || t.includes('ta') || t.includes('amount')) billIdx = cIdx;
          else if (t.includes('month')) monthIdx = cIdx;
          else if (t.includes('full') || t.includes('final')) fnfIdx = cIdx;
          else if (t.includes('date') || t.includes('submission')) dateIdx = cIdx;
        });
        break;
      }
    }

    let currentSectionState = '';
    const learnedStaffMap = (typeof buildStaffStateMap === 'function') ? buildStaffStateMap(ss) : {};
    const learnedNameMap = learnedStaffMap.__nameMap || {};

    for (let i = startRow; i < data.length; i++) {
      const sNoRaw = String(data[i][sNoIdx] || '').trim();
      const empCode = String(data[i][codeIdx] || '').trim();
      const name = String(data[i][nameIdx] || '').trim();
      const rawState = String(data[i][stateIdx] || '').trim();

      const combinedText = (sNoRaw + ' ' + empCode + ' ' + name + ' ' + rawState).toLowerCase();
      if (combinedText.includes('total') || combinedText.includes('grand total')) continue;
      if (empCode.toLowerCase().includes('code') || name.toLowerCase().includes('name')) continue;

      // Check if this row is a state section header (e.g. "GUJARAT", "RAJASTHAN", "BIHAR", "JHARKHAND")
      let detectedStateInRow = '';
      for (let c = 0; c < data[i].length; c++) {
        const cellText = String(data[i][c] || '').trim();
        if (!cellText || cellText.toLowerCase().includes('total')) continue;
        const det = (typeof detectStateName === 'function') ? detectStateName(cellText) : '';
        if (det) {
          detectedStateInRow = det;
          break;
        }
      }

      const taBillRaw = data[i][billIdx];
      let taBill = '';
      let isNumericBill = false;
      if (taBillRaw !== '' && taBillRaw !== null && taBillRaw !== undefined) {
        const num = Number(String(taBillRaw).replace(/[^0-9.-]+/g, ''));
        if (!isNaN(num) && num > 0) {
          taBill = num;
          isNumericBill = true;
        } else {
          taBill = taBillRaw;
        }
      }

      const isSectionHeader = Boolean(detectedStateInRow) && (
        !isNumericBill ||
        empCode.toLowerCase() === detectedStateInRow.toLowerCase() ||
        name.toLowerCase() === detectedStateInRow.toLowerCase() ||
        (empCode === '' && (sNoRaw === '' || isNaN(Number(sNoRaw))))
      );

      if (isSectionHeader) {
        currentSectionState = detectedStateInRow;
        continue; // Skip section header row
      }

      // Check if valid employee row
      if (empCode !== '' || (name !== '' && isNaN(Number(name)))) {
        const uCode = empCode.toUpperCase();
        const lName = name.toLowerCase();
        let finalState = '';

        // 1. Explicit state in state column
        if (rawState && typeof detectStateName === 'function') {
          const fromCol = detectStateName(rawState);
          if (fromCol) finalState = fromCol;
        }

        // 2. State in any row cell
        if (!finalState && detectedStateInRow && isNumericBill) {
          finalState = detectedStateInRow;
        }

        // 3. Dynamic lookup from learned Staff map by Code
        if (!finalState && learnedStaffMap[uCode]) {
          finalState = learnedStaffMap[uCode];
        }

        // 4. Dynamic lookup from learned Staff map by Name
        if (!finalState && learnedNameMap[lName]) {
          finalState = learnedNameMap[lName];
        }

        // 5. Active section header state tracked from sheet
        if (!finalState && currentSectionState) {
          finalState = currentSectionState;
        }

        // 6. Raw state text fallback
        if (!finalState && rawState) {
          finalState = (typeof detectStateName === 'function') ? (detectStateName(rawState) || rawState) : rawState;
        }

        if (finalState) {
          if (uCode) learnedStaffMap[uCode] = finalState;
          if (lName) learnedNameMap[lName] = finalState;
        }

        let rowMonth = String(data[i][monthIdx] || '').trim() || mObj.label;
        const fullFinal = String(data[i][fnfIdx] || '').trim();
        const subDate = String(data[i][dateIdx] || '').trim();

        compiledRows.push([
          compiledRows.length + 1,
          empCode,
          name,
          finalState,
          taBill,
          rowMonth,
          fullFinal,
          subDate
        ]);
      }
    }
  });

  if (compiledRows.length === 0) {
    Logger.log('No employee records found in ' + ss.getName());
    return { count: 0, message: 'No records found' };
  }

  // Find or insert Master tab
  let master = ss.getSheetByName('Master') || ss.getSheetByName('master');
  if (!master) {
    master = ss.insertSheet('Master');
  }

  // Clear existing content and format
  master.clearContents();
  master.clearFormats();

  // Set Row 1 Headers
  const headers = ['S.No.', 'Emp. Code', 'Sales Person Name', 'State', 'TA Bill', 'Month', 'Full & Final', 'Submission Date'];
  const headerRange = master.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers])
    .setBackground('#0B3861')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setFontFamily('Calibri')
    .setFontSize(10)
    .setVerticalAlignment('middle')
    .setHorizontalAlignment('center');
  master.getRange(1, 3).setHorizontalAlignment('left');
  master.setFrozenRows(1);

  // Write all records
  const dataRange = master.getRange(2, 1, compiledRows.length, headers.length);
  dataRange.setValues(compiledRows)
    .setFontFamily('Calibri')
    .setFontSize(10)
    .setFontColor('#000000')
    .setBackground('#FFFFFF')
    .setFontWeight('normal')
    .setVerticalAlignment('middle');

  master.getRange(2, 1, compiledRows.length, 1).setHorizontalAlignment('center');
  master.getRange(2, 2, compiledRows.length, 1).setHorizontalAlignment('center');
  master.getRange(2, 3, compiledRows.length, 1).setHorizontalAlignment('left');
  master.getRange(2, 4, compiledRows.length, 1).setHorizontalAlignment('center');
  master.getRange(2, 5, compiledRows.length, 1).setHorizontalAlignment('center').setNumberFormat('#,##0');
  master.getRange(2, 6, compiledRows.length, 1).setHorizontalAlignment('center');
  master.getRange(2, 7, compiledRows.length, 1).setHorizontalAlignment('center');
  master.getRange(2, 8, compiledRows.length, 1).setHorizontalAlignment('center');

  master.getRange(1, 1, compiledRows.length + 1, headers.length)
    .setBorder(true, true, true, true, true, true, '#000000', SpreadsheetApp.BorderStyle.SOLID);

  Logger.log('Successfully wrote ' + compiledRows.length + ' rows to ' + ss.getName() + ' Master tab!');
  return {
    success: true,
    count: compiledRows.length,
    spreadsheet: ss.getName()
  };
}
