/**
 * ==========================================================================
 * 05_STATEWISECOSTING.GS - STATE-WISE COSTING MATRIX & EXPENSES
 * ==========================================================================
 * Manages official state-wise costing matrix matching user's exact format:
 * Month | TA - DA Expenses | Total | MP | CG | HARYANA | MEGALAYA | BIHAR |
 * JHARKHAND | DELHI | UP | UK | RAJ | PUNJAB | GUJRAT | TOTAL
 * ==========================================================================
 */

/**
 * Returns the state-wise costing matrix.
 * Scans the "Provisional Statewise Costing" sheet tab if present,
 * or returns the official baseline dataset (Apr to Aug, Grand Total ₹6,276,381).
 */
function getStatewiseMatrix() {
  try {
    const ss = getSpreadsheet();
    if (ss) {
      const sheet = getStatewiseSheet(ss);
      if (sheet) {
        const data = sheet.getDataRange().getValues();
        if (data && data.length > 1) {
          // Parse dynamic sheet rows
          const parsed = parseStatewiseSheetData(data);
          if (parsed && parsed.length > 0) {
            return {
              success: true,
              data: parsed,
              source: sheet.getName(),
              columns: CONFIG.STATEWISE_COLUMNS
            };
          }
        }
      }
    }

    // Default: Official baseline dataset
    return {
      success: true,
      data: OFFICIAL_STATEWISE_BASELINE,
      source: 'Official Costing Statement',
      columns: CONFIG.STATEWISE_COLUMNS
    };
  } catch (err) {
    console.error('Error in getStatewiseMatrix:', err);
    return {
      success: true,
      data: OFFICIAL_STATEWISE_BASELINE,
      error: err.toString(),
      columns: CONFIG.STATEWISE_COLUMNS
    };
  }
}

/**
 * Parses raw 2D grid from the statewise sheet tab.
 */
function parseStatewiseSheetData(data) {
  let headerRow = 0;
  for (let r = 0; r < Math.min(5, data.length); r++) {
    const rowStr = data[r].join(' ').toUpperCase();
    if (rowStr.includes('MONTH') && (rowStr.includes('EXPENSES') || rowStr.includes('MP') || rowStr.includes('TOTAL'))) {
      headerRow = r;
      break;
    }
  }

  const headers = data[headerRow].map(h => String(h || '').trim().toUpperCase());
  const colMap = {};
  CONFIG.STATEWISE_COLUMNS.forEach(col => {
    const idx = headers.indexOf(col);
    if (idx !== -1) colMap[col] = idx;
  });

  const monthIdx = headers.indexOf('MONTH');
  const expIdx = headers.findIndex(h => h.includes('EXPENSE') || h.includes('TA - DA'));
  const totalIdx = headers.indexOf('TOTAL');

  const rows = [];
  for (let r = headerRow + 1; r < data.length; r++) {
    const row = data[r];
    const month = String(row[monthIdx !== -1 ? monthIdx : 0] || '').trim();
    if (!month || month.toUpperCase().includes('TOTAL') || month.toUpperCase().includes('GRAND')) continue;

    const expenseType = expIdx !== -1 ? String(row[expIdx] || 'TA-Bills').trim() : 'TA-Bills';
    let rawTotal = totalIdx !== -1 ? row[totalIdx] : 0;
    if (typeof rawTotal === 'string') rawTotal = rawTotal.replace(/[^0-9.-]+/g, '');
    let total = Number(rawTotal) || 0;

    const breakdown = {};
    let calculatedSum = 0;
    CONFIG.STATEWISE_COLUMNS.forEach(col => {
      const cIdx = colMap[col];
      let val = 0;
      if (cIdx !== undefined && cIdx !== -1) {
        let raw = row[cIdx];
        if (typeof raw === 'string') raw = raw.replace(/[^0-9.-]+/g, '');
        val = Number(raw) || 0;
      }
      breakdown[col] = val;
      calculatedSum += val;
    });

    if (total === 0 && calculatedSum > 0) total = calculatedSum;

    rows.push({
      month: month,
      expenseType: expenseType,
      total: total,
      breakdown: breakdown
    });
  }

  return rows;
}

/**
 * Saves or updates a statewise month entry in the "Provisional Statewise Costing" sheet.
 */
function saveStatewiseEntry(payload) {
  try {
    const ss = getSpreadsheet();
    if (!ss) return { success: false, message: 'Could not connect to Google Sheet.' };

    let sheet = getStatewiseSheet(ss);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.STATEWISE_SHEET_NAME);
      const headers = ['Month', 'TA - DA Expenses', 'Total', ...CONFIG.STATEWISE_COLUMNS, 'TOTAL'];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#0066CC')
        .setFontColor('#FFFFFF')
        .setHorizontalAlignment('center');
      sheet.setFrozenRows(1);
    }

    const month = String(payload.month || '').trim();
    if (!month) return { success: false, message: 'Month is required.' };

    const expenseType = String(payload.expenseType || 'TA-Bills').trim();
    const breakdown = payload.breakdown || {};
    let total = 0;
    CONFIG.STATEWISE_COLUMNS.forEach(col => {
      total += Number(breakdown[col] || 0);
    });

    const rowData = [
      month,
      expenseType,
      total,
      ...CONFIG.STATEWISE_COLUMNS.map(col => Number(breakdown[col] || 0)),
      total
    ];

    sheet.appendRow(rowData);
    return { success: true, message: `Statewise costing entry for ${month} saved!` };
  } catch (err) {
    console.error('Error in saveStatewiseEntry:', err);
    return { success: false, message: 'Failed to save statewise entry: ' + err.toString() };
  }
}
