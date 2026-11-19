/**
 * ==========================================================================
 * 03_CLAIMSSERVICE.GS - CLAIMS CRUD & FETCH OPERATIONS
 * ==========================================================================
 * Handles fetching, adding, updating, and deleting TA Expense claims from
 * the Master sheet and individual monthly sheets.
 * ==========================================================================
 */

/**
 * Normalizes month names to standard 3-letter abbreviation (Jan, Feb, Mar...).
 */

/**
 * Normalizes state and territory names.
 */
function isStateValueValidText(val) {
  if (val === undefined || val === null) return false;
  var s = String(val).trim();
  if (!s || s.indexOf('₹') !== -1 || s.indexOf('$') !== -1) return false;
  if (/^\s*₹?\s*[\d,]+(\.\d+)?\s*$/.test(s)) return false;
  var digitsOnly = s.replace(/\D/g, '');
  if (digitsOnly.length >= 2 && !/[a-zA-Z]{2,}/.test(s)) return false;
  return /[a-zA-Z]/.test(s);
}

function getKnownStaffStateMap() {
  var map = {};
  
  // 1. Authoritative base employee directory FIRST (cleanest, guaranteed genuine states)
  try {
    if (typeof getDefaultDirectory === 'function') {
      var dir = getDefaultDirectory();
      if (Array.isArray(dir)) {
        dir.forEach(function(item) {
          if (item && item.code && item.state) {
            var c = String(item.code).trim().toUpperCase();
            var st = String(item.state).trim();
            if (isStateValueValidText(st)) {
              var stLower = st.toLowerCase();
              if (stLower === 'uk' || stLower === 'uttarakhand' || stLower === 'uttaranchal') {
                map[c] = 'UK';
              } else {
                map[c] = st;
              }
            }
          }
        });
      }
    }
  } catch (e) {}

  // 2. Staff sheet if present (validate clean text only, strictly no numbers or currency)
  try {
    var ss = getSpreadsheet();
    if (ss) {
      var staffSheet = ss.getSheetByName('Staff');
      if (staffSheet) {
        var vals = staffSheet.getDataRange().getValues();
        for (var r = 1; r < vals.length; r++) {
          var sc = String(vals[r][0] || '').trim().toUpperCase();
          var sst = String(vals[r][2] || '').trim();
          if (sc && isStateValueValidText(sst)) {
            var sstLower = sst.toLowerCase();
            if (sstLower === 'uk' || sstLower === 'uttarakhand' || sstLower === 'uttaranchal') {
              map[sc] = 'UK';
            } else {
              map[sc] = sst;
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('Dynamic staff state map error:', e);
  }

  // Guaranteed hardcoded overrides for known key employees
  map['HOS0330'] = 'UK'; // Gaurav Khurana
  map['HOS0214'] = 'UK'; // Jay Nandan
  map['HOS0282'] = 'UK'; // Lalit Kumar Sharma
  map['HOS0182'] = 'Delhi'; // Naveen Kumar Sharma
  map['HOS0198'] = 'Delhi'; // Ashutosh Kumar Dubey

  return map;
}

function normalizeStateName(state, empCode) {
  var raw = String(state || '').trim();

  if (isStateValueValidText(raw)) {
    var s = raw.toLowerCase();
    if (s === 'del' || s === 'delhi') return 'Delhi';
    if (s === 'ex-up' || s === 'ex up' || s === 'exup') return 'Ex-UP';
    if (s === 'har' || s === 'haryana') return 'Haryana';
    if (s === 'agra' || s === 'local agra') return 'Local Agra';
    if (s === 'mp' || s === 'madhya pradesh') return 'MP';
    if (s === 'pun' || s === 'punjab') return 'Punjab';
    if (s === 'up west' || s === 'u.p. west' || s === 'up-west' || s === 'upw') return 'U.P. West';
    if (s === 'uk' || s === 'uttarakhand' || s === 'uttaranchal') return 'UK';
    if (s === 'bihar' || s === 'bih') return 'Bihar';
    if (s === 'jharkhand' || s === 'jhk' || s === 'jh') return 'Jharkhand';
    if (s === 'gujrat' || s === 'gujarat' || s === 'guj') return 'Gujarat';
    if (s === 'raj' || s === 'rajasthan') return 'Rajasthan';
    if (s === 'cg' || s === 'chhattisgarh' || s === 'chattisgarh') return 'Chhattisgarh';
    if (s === 'meghalaya' || s === 'meg') return 'Meghalaya';
    return raw;
  }

  // If input was invalid/corrupted with amounts, recover from known staff directory map
  if (empCode) {
    var knownMap = getKnownStaffStateMap();
    var code = String(empCode).trim().toUpperCase();
    if (knownMap[code]) {
      var candidate = knownMap[code];
      if (isStateValueValidText(candidate)) {
        var candLower = candidate.toLowerCase();
        if (candLower === 'uk' || candLower === 'uttarakhand' || candLower === 'uttaranchal') return 'UK';
        return candidate;
      }
    }
  }

  // Never return an amount or currency as state! Fallback safely to genuine state or Delhi.
  return 'Delhi';
}

function normalizeMonthName(mVal) {
  if (!mVal) return '';
  const s = String(mVal).trim().toLowerCase();
  const map = {
    'jan': 'Jan', 'january': 'Jan',
    'feb': 'Feb', 'february': 'Feb',
    'mar': 'Mar', 'march': 'Mar',
    'apr': 'Apr', 'april': 'Apr',
    'may': 'May',
    'jun': 'Jun', 'june': 'Jun',
    'jul': 'Jul', 'july': 'Jul',
    'aug': 'Aug', 'august': 'Aug',
    'sep': 'Sep', 'sept': 'Sep', 'september': 'Sep', 'spe': 'Sep',
    'oct': 'Oct', 'october': 'Oct',
    'nov': 'Nov', 'november': 'Nov',
    'dec': 'Dec', 'december': 'Dec'
  };
  for (const [key, val] of Object.entries(map)) {
    if (s === key || s.startsWith(key)) return val;
  }
  return String(mVal).trim();
}

/**
 * Formats Column H / Submission Date into standard format: "dd yyyy HH:mm:ss" (e.g. "30 2026 13:29:00").
 */
function formatColHDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    try {
      return Utilities.formatDate(val, Session.getScriptTimeZone() || 'GMT+5:30', 'dd yyyy HH:mm:ss');
    } catch (e) {
      var d = String(val.getDate()).padStart(2, '0');
      var y = val.getFullYear();
      var hh = String(val.getHours()).padStart(2, '0');
      var mm = String(val.getMinutes()).padStart(2, '0');
      var ss = String(val.getSeconds()).padStart(2, '0');
      return d + ' ' + y + ' ' + hh + ':' + mm + ':' + ss;
    }
  }
  var str = String(val).trim();
  if (!str) return '';
  if (/^\d{1,2}\s+\d{4}\s+\d{2}:\d{2}(:\d{2})?$/.test(str)) {
    return str;
  }
  if (/^[A-Za-z]{3,9}(\s+\d{4})?$/i.test(str)) {
    return str;
  }
  var parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2000 && (str.indexOf(':') !== -1 || str.length > 12)) {
    var d2 = String(parsed.getDate()).padStart(2, '0');
    var y2 = parsed.getFullYear();
    var hh2 = String(parsed.getHours()).padStart(2, '0');
    var mm2 = String(parsed.getMinutes()).padStart(2, '0');
    var ss2 = String(parsed.getSeconds()).padStart(2, '0');
    return d2 + ' ' + y2 + ' ' + hh2 + ':' + mm2 + ':' + ss2;
  }
  return str;
}

/**
 * Reads all submissions from a single spreadsheet and returns normalized records.
 */
function fetchSubmissionsFromSpreadsheet(ss, filter) {
  const monthFilter = filter && filter.month ? filter.month : null;
  const query = filter && filter.query ? filter.query.toLowerCase() : null;
  const stateFilter = filter && filter.state ? filter.state : null;
  const hideZero = filter && filter.hideZero !== undefined ? filter.hideZero : false;

  const sheet = getMasterSheet(ss);
  if (!sheet) {
    return {
      success: true,
      records: [],
      stats: { totalAmount: 0, totalCount: 0, averageAmount: 0 },
      scannedSheets: []
    };
  }
  const sheetName = sheet.getName();
  const lastRow = Math.max(sheet.getLastRow(), 2);
  const lastCol = Math.max(Math.min(sheet.getLastColumn(), 25), 8);
  const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  if (!data || data.length <= 1) {
    return {
      success: true,
      records: [],
      stats: { totalAmount: 0, totalCount: 0, averageAmount: 0 },
      scannedSheets: [sheetName]
    };
  }

  let headerRowIndex = 1;
  let sNoIdx = 0, empIdx = 1, nameIdx = 2, stateIdx = 3, amtIdx = 4, monthIdx = 5, remarksIdx = 6, dateIdx = -1;
  const monthCols = {};

  for (let r = 0; r < Math.min(10, data.length); r++) {
    const rawRow = data[r].map(c => String(c || '').trim());
    const rowLower = rawRow.map(c => c.toLowerCase());

    const empFound = rowLower.findIndex(h => h.includes('code') || h.includes('emp'));
    const nameFound = rowLower.findIndex(h => h.includes('name') || h.includes('person') || h.includes('sales'));
    const stateFound = rowLower.findIndex(h => h.includes('state') || h.includes('region') || h.includes('territory') || h.includes('zone'));
    const monthFound = rowLower.findIndex(h => h === 'month' || (h.includes('month') && !h.includes('monthly')));

    let amtFound = rowLower.findIndex(h => 
      h === 'ta bill' || h === 'ta amount' || h === 'bill' || h === 'amount' ||
      h.includes('bill') || h.includes('amount') || h.includes('expense') || 
      h.includes('payout') || h.includes('cost') || h.includes('claim') ||
      (h.includes('ta') && !h.includes('state') && !h.includes('status'))
    );

    if (empFound !== -1 || (nameFound !== -1 && (monthFound !== -1 || stateFound !== -1 || amtFound !== -1))) {
      headerRowIndex = Math.max(r, 1); // Row 2 is table header
      if (empFound !== -1) empIdx = empFound;
      if (nameFound !== -1) nameIdx = nameFound;
      if (stateFound !== -1) stateIdx = stateFound;
      if (amtFound !== -1) amtIdx = amtFound;
      if (monthFound !== -1) monthIdx = monthFound;

      const remFound = rowLower.findIndex(h => h.includes('final') || h.includes('remark') || h.includes('note') || h.includes('purpose') || h.includes('status'));
      if (remFound !== -1) remarksIdx = remFound;

      const sNoFound = rowLower.findIndex(h => h.includes('s.no') || h.includes('sno') || h.includes('sl') || h.includes('sr'));
      if (sNoFound !== -1) sNoIdx = sNoFound;

      const dateFound = rowLower.findIndex(h => h.includes('date') || h.includes('time') || h.includes('submission'));
      if (dateFound !== -1) dateIdx = dateFound;

      // Column position fallbacks for standard 8-column layout
      if (dateIdx === -1 && rawRow.length >= 8) dateIdx = 7;
      if (remarksIdx === -1 && rawRow.length >= 7) remarksIdx = 6;
      if (monthIdx === -1 && rawRow.length >= 6) monthIdx = 5;
      if (amtIdx === -1 && rawRow.length >= 5) amtIdx = 4;
      if (stateIdx === -1 && rawRow.length >= 4) stateIdx = 3;

      const all3Months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      rowLower.forEach((h, colI) => {
        all3Months.forEach(m => {
          if (h === m || (h.startsWith(m) && h.length <= 9)) {
            const properMonth = m.charAt(0).toUpperCase() + m.slice(1);
            monthCols[properMonth] = colI;
          }
        });
      });
      break;
    }
  }

  const records = [];
  let totalAmount = 0;
  const hasMonthColumns = Object.keys(monthCols).length >= 3;
  let currentSectionState = '';

  // Start data traversal strictly from 3rd row (index 2) onwards
  for (let r = Math.max(headerRowIndex + 1, 2); r < data.length; r++) {
    const row = data[r];

    // 1. Detect section header row directly from Google Sheets
    let rowText = '';
    for (let c = 0; c < Math.min(5, row.length); c++) {
      const cellVal = String(row[c] || '').trim();
      if (cellVal) rowText += ' ' + cellVal;
    }

    const detected = (typeof detectStateName === 'function') ? detectStateName(rowText) : normalizeStateName(rowText);
    if (detected && detected !== 'Delhi') {
      currentSectionState = detected;
    } else if (/\bdelhi\b/i.test(rowText) && !rowText.toLowerCase().includes('sharma') && !rowText.toLowerCase().includes('dubey')) {
      currentSectionState = 'Delhi';
    }

    const empCode = String(row[empIdx] || '').trim().toUpperCase();
    const name = String(row[nameIdx] || '').trim();

    // Skip banner rows, totals, and empty entries
    if (!empCode && !name) continue;
    if (empCode.includes('TOTAL') || empCode.includes('GRAND') || name.includes('TOTAL') || name.includes('GRAND')) {
      continue;
    }
    if (empCode.includes('TA-BILL') || empCode.includes('TA BILL') || empCode.includes('TA_BILL') || empCode.includes('TABILL')) {
      continue;
    }
    if (name.toUpperCase().includes('TA-BILL') || name.toUpperCase().includes('TA BILL') || name.toUpperCase().includes('TABILL')) {
      continue;
    }
    if (empCode.includes('EMP. CODE') || empCode.includes('EMP CODE') || empCode === 'CODE') {
      continue;
    }
    if (name.toUpperCase().includes('SALES PERSON') || name.toUpperCase().includes('PERSON NAME') || name.toUpperCase() === 'NAME') {
      continue;
    }

    // Check if empCode cell itself holds a section title
    const empAsState = (typeof detectStateName === 'function') ? detectStateName(empCode) : normalizeStateName(empCode);
    if (empAsState) {
      currentSectionState = empAsState;
      continue;
    }

    var rawStateStr = stateIdx !== -1 ? String(row[stateIdx] || '').trim() : '';
    var state = rawStateStr ? normalizeStateName(rawStateStr, empCode) : '';
    if (!state && currentSectionState) {
      state = currentSectionState;
    }
    if (!state && empCode) {
      state = normalizeStateName('', empCode);
    }

    // READ ONLY: Never call setValue() during sync to eliminate protected cell errors!
    const remarks = remarksIdx !== -1 ? String(row[remarksIdx] || '').trim() : '';
    const sNo = sNoIdx !== -1 && row[sNoIdx] ? row[sNoIdx] : (records.length + 1);

    if (hasMonthColumns && (monthIdx === -1 || !row[monthIdx])) {
      for (const [mName, mColIdx] of Object.entries(monthCols)) {
        if (monthFilter && monthFilter !== 'All' && monthFilter !== mName) continue;
        if (stateFilter && stateFilter !== 'All' && normalizeStateName(state).toLowerCase() !== normalizeStateName(stateFilter).toLowerCase()) continue;

        let rawVal = row[mColIdx];
        if (typeof rawVal === 'string') rawVal = rawVal.replace(/[^0-9.-]+/g, '');
        const mAmt = Number(rawVal) || 0;
        if (hideZero && mAmt <= 0) continue;

        totalAmount += mAmt;
        records.push({
          id: 'CLM-' + String(records.length + 1).padStart(3, '0'),
          sNo: records.length + 1,
          empCode: empCode,
          name: name,
          state: state,
          amount: mAmt,
          month: mName,
          remarks: remarks,
          date: mName + ' 2026',
          submissionDate: mName + ' 2026',
          sheet: sheetName,
          status: remarks.toLowerCase().includes('settled') ? 'Settled' : 'Approved'
        });
      }
    } else {
      let rawAmt = amtIdx !== -1 ? row[amtIdx] : 0;
      if (typeof rawAmt === 'string') {
        rawAmt = rawAmt.replace(/[^0-9.-]+/g, '');
      }
      let amount = Number(rawAmt) || 0;

      // Scan other row columns if amount was 0
      if (amount <= 0) {
        for (let col = 0; col < row.length; col++) {
          if (col === sNoIdx || col === empIdx || col === nameIdx || col === stateIdx || col === monthIdx || col === dateIdx) continue;
          let cellVal = row[col];
          if (typeof cellVal === 'string') cellVal = cellVal.replace(/[^0-9.-]+/g, '');
          let cellNum = Number(cellVal) || 0;
          if (cellNum > 50) {
            amount = cellNum;
            break;
          }
        }
      }
      if (hideZero && amount <= 0) continue;

      let rawMonth = monthIdx !== -1 && row[monthIdx] ? String(row[monthIdx]).trim() : '';
      let monthVal = normalizeMonthName(rawMonth) || 'Apr';

      if (monthFilter && monthFilter !== 'All' && monthVal !== monthFilter) continue;
      if (stateFilter && stateFilter !== 'All' && state !== stateFilter) continue;

      if (query) {
        const fullStr = `${empCode} ${name} ${state} ${monthVal} ${remarks}`.toLowerCase();
        if (!fullStr.includes(query)) continue;
      }

      var rawDate = dateIdx !== -1 ? row[dateIdx] : (row.length >= 8 ? row[7] : '');
      var formattedDate = formatColHDate(rawDate);
      var displayDate = formattedDate || (monthVal + ' 2026');

      totalAmount += amount;
      records.push({
        id: 'CLM-' + String(sNo).padStart(3, '0'),
        sNo: sNo,
        empCode: empCode,
        name: name,
        state: state,
        amount: amount,
        month: monthVal,
        remarks: remarks,
        date: displayDate,
        submissionDate: displayDate,
        sheet: sheetName,
        status: remarks.toLowerCase().includes('settled') ? 'Settled' : 'Approved'
      });
    }
  }

  return {
    success: true,
    records: records,
    stats: {
      totalAmount: totalAmount,
      totalCount: records.length,
      averageAmount: records.length > 0 ? Math.round(totalAmount / records.length) : 0
    },
    sourceTab: sheetName,
    scannedSheets: [sheetName]
  };
}

/**
 * Fetches claims submissions from the Google Sheet.
 * Supports filtering by month, query, territory, status, and minAmount.
 */
function fetchSubmissions(filter) {
  try {
    var configuredIds = [];
    if (filter && Array.isArray(filter.spreadsheetIds) && filter.spreadsheetIds.filter(Boolean).length > 0) {
      configuredIds = filter.spreadsheetIds.filter(Boolean);
    } else {
      var defaultIds = [
        '1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY',
        '166GBY-ACppPT9vFccLK1UJFKzO4KxeTGXxpUSMsrG5w'
      ];
      var idSet = {};
      defaultIds.forEach(function(id) { idSet[id] = true; });
      var cfgIds = getConfiguredSpreadsheetIds();
      if (Array.isArray(cfgIds)) {
        cfgIds.forEach(function(id) { if (id) idSet[id] = true; });
      }
      configuredIds = Object.keys(idSet);
    }

    var activeSs = null;
    try {
      activeSs = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {}

    const spreadsheets = [];
    const openErrors = [];

    for (let i = 0; i < configuredIds.length; i++) {
      const targetId = String(configuredIds[i]).trim();
      if (!targetId) continue;
      if (activeSs && activeSs.getId() === targetId) {
        spreadsheets.push(activeSs);
        continue;
      }
      try {
        const ss = SpreadsheetApp.openById(targetId);
        if (ss) spreadsheets.push(ss);
      } catch (err) {
        openErrors.push(`ID "${targetId}": ${err.message || err.toString()}`);
        console.warn('Could not open configured spreadsheet:', targetId, err);
      }
    }

    if (spreadsheets.length === 0) {
      const status = getSpreadsheetWithStatus();
      if (!status.ss) {
        return { 
          success: false, 
          records: [], 
          stats: { totalAmount: 0, totalCount: 0, averageAmount: 0 }, 
          error: 'Spreadsheet connection failed: ' + (openErrors.join('; ') || status.error || 'Check Spreadsheet IDs and permissions.')
        };
      }
      spreadsheets.push(status.ss);
    }

    let mergedRecords = [];
    let totalAmount = 0;
    const scannedSheets = [];
    const scannedSpreadsheets = [];

    spreadsheets.forEach((ss, ssIdx) => {
      const ssTitle = ss.getName() || `Spreadsheet ${ssIdx + 1}`;
      const ssId = ss.getId();
      scannedSpreadsheets.push({ id: ssId, name: ssTitle });

      // Automatically heal any past corrupted cells in Master and Month tabs
      try {
        healAllSheetsInSpreadsheet(ss);
      } catch (eHeal) {}

      const sheetResult = fetchSubmissionsFromSpreadsheet(ss, filter);
      if (sheetResult && Array.isArray(sheetResult.records)) {
        sheetResult.records.forEach((rec) => {
          rec.sourceSpreadsheet = (ssId === '166GBY-ACppPT9vFccLK1UJFKzO4KxeTGXxpUSMsrG5w' || ssTitle.toLowerCase().includes('bhawna') || ['rajasthan', 'bihar', 'jharkhand', 'gujarat'].includes(normalizeStateName(rec.state).toLowerCase()))
            ? 'Bhawna TA Master'
            : 'Bharti TA Master';
          rec.sourceSpreadsheetId = ssId;
        });

        mergedRecords = mergedRecords.concat(sheetResult.records);
        totalAmount += Number(sheetResult.stats && sheetResult.stats.totalAmount ? sheetResult.stats.totalAmount : 0);
        if (sheetResult.sourceTab && !scannedSheets.includes(sheetResult.sourceTab)) {
          scannedSheets.push(sheetResult.sourceTab);
        }
      }
    });

    // Ensure both sheets are accounted for with valid amounts
    var bhawnaRecords = mergedRecords.filter(function(r) {
      var s = normalizeStateName(r.state).toLowerCase();
      return s === 'rajasthan' || s === 'bihar' || s === 'jharkhand' || s === 'gujarat' || r.sourceSpreadsheet === 'Bhawna TA Master';
    });
    var bhawnaTotalAmt = bhawnaRecords.reduce(function(a, b) { return a + (Number(b.amount) || 0); }, 0);

    if (bhawnaRecords.length === 0 || bhawnaTotalAmt <= 0) {
      // Remove any 0-amount placeholder records for Bhawna
      mergedRecords = mergedRecords.filter(function(r) {
        var s = normalizeStateName(r.state).toLowerCase();
        return !(s === 'rajasthan' || s === 'bihar' || s === 'jharkhand' || s === 'gujarat' || r.sourceSpreadsheet === 'Bhawna TA Master');
      });

      var bhawnaFallback = getBhawnaMasterRecords(filter);
      bhawnaFallback.forEach(function(rec) {
        rec.sourceSpreadsheet = 'Bhawna TA Master';
        rec.sourceSpreadsheetId = '166GBY-ACppPT9vFccLK1UJFKzO4KxeTGXxpUSMsrG5w';
      });
      mergedRecords = mergedRecords.concat(bhawnaFallback);
    }

    // Re-calculate total amount from all valid records
    totalAmount = mergedRecords.reduce(function(a, b) { return a + (Number(b.amount) || 0); }, 0);

    // Preserve sheet serial numbers sequentially
    mergedRecords.forEach(function(rec, idx) {
      if (!rec.sNo || isNaN(Number(rec.sNo))) {
        rec.sNo = idx + 1;
      }
      rec.id = 'CLM-' + String(rec.sNo).padStart(3, '0');
    });

    return {
      success: true,
      records: mergedRecords,
      stats: {
        totalAmount: totalAmount,
        totalCount: mergedRecords.length,
        averageAmount: mergedRecords.length > 0 ? Math.round(totalAmount / mergedRecords.length) : 0
      },
      sourceTab: scannedSheets.length > 0 ? scannedSheets.join(', ') : 'Master',
      scannedSheets: scannedSheets.length > 0 ? scannedSheets : ['Master'],
      scannedSpreadsheets: scannedSpreadsheets,
      spreadsheetCount: spreadsheets.length
    };
  } catch (err) {
    console.error('Error fetching combined submissions from Master tabs:', err);
    return { success: false, records: [], stats: { totalAmount: 0, totalCount: 0 }, error: err.toString() };
  }
}

/**
 * Resolves the target spreadsheet (Bharti vs Bhawna) dynamically based on:
 * 1. Explicit spreadsheetId in payload
 * 2. Explicit sourceSpreadsheet / sheetType string
 * 3. Territory / State (Rajasthan, Bihar, Jharkhand, Gujarat -> Bhawna)
 * 4. Employee Directory lookup (Staff / Master)
 * 5. Default to Primary (Bharti)
 */
function getTargetSpreadsheetForClaim(payload) {
  const bhawnaId = String(CONFIG.SECONDARY_SPREADSHEET_ID || '166GBY-ACppPT9vFccLK1UJFKzO4KxeTGXxpUSMsrG5w').trim();
  const bhartiId = String(CONFIG.SPREADSHEET_ID || '1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY').trim();

  // 1. Explicit spreadsheet ID
  if (payload && payload.spreadsheetId) {
    const reqId = String(payload.spreadsheetId).trim();
    try {
      const ss = SpreadsheetApp.openById(reqId);
      if (ss) {
        const title = ss.getName();
        return { ss: ss, id: reqId, name: title.toLowerCase().includes('bhawna') ? 'Bhawna TA Master' : 'Bharti TA Master' };
      }
    } catch (e) {
      console.warn('Could not open spreadsheet by explicit ID:', reqId, e);
    }
  }

  // 2. Explicit sourceSpreadsheet / sheetType name
  const sourceStr = String((payload && (payload.sourceSpreadsheet || payload.sheetType)) || '').toLowerCase();
  if (sourceStr.includes('bhawna')) {
    try {
      const ss = SpreadsheetApp.openById(bhawnaId);
      if (ss) return { ss: ss, id: bhawnaId, name: 'Bhawna TA Master' };
    } catch (e) {}
  } else if (sourceStr.includes('bharti')) {
    try {
      const ss = SpreadsheetApp.openById(bhartiId);
      if (ss) return { ss: ss, id: bhartiId, name: 'Bharti TA Master' };
    } catch (e) {}
  }

  // 3. State-based routing (Rajasthan, Bihar, Jharkhand, Gujarat -> Bhawna TA Master)
  const stateNorm = normalizeStateName(payload && payload.state ? payload.state : '').toLowerCase();
  const bhawnaStates = ['rajasthan', 'bihar', 'jharkhand', 'gujarat'];
  if (bhawnaStates.includes(stateNorm)) {
    try {
      const ss = SpreadsheetApp.openById(bhawnaId);
      if (ss) return { ss: ss, id: bhawnaId, name: 'Bhawna TA Master' };
    } catch (e) {}
  }

  // 4. Employee directory lookup (check if employee is in Bhawna's staff sheet)
  const empCode = String((payload && payload.empCode) || '').trim().toUpperCase();
  if (empCode && bhawnaId) {
    try {
      const bhawnaSS = SpreadsheetApp.openById(bhawnaId);
      const bhawnaStaff = bhawnaSS.getSheetByName('Staff') || getMasterSheet(bhawnaSS);
      if (bhawnaStaff) {
        const staffData = bhawnaStaff.getDataRange().getValues();
        const hasEmp = staffData.some(r => 
          String(r[0] || '').trim().toUpperCase() === empCode || 
          String(r[1] || '').trim().toUpperCase() === empCode
        );
        if (hasEmp) {
          return { ss: bhawnaSS, id: bhawnaId, name: 'Bhawna TA Master' };
        }
      }
    } catch (e) {}
  }

  // 5. Default to Bharti TA Master
  const primarySS = getSpreadsheet();
  return { ss: primarySS, id: bhartiId, name: 'Bharti TA Master' };
}

/**
 * Finds matching month sheet in the spreadsheet (supports exact name and month variations).
 */
function findTargetMonthSheet(ss, monthName) {
  if (!monthName) return null;
  if (!ss) {
    if (typeof getSpreadsheet === 'function') {
      ss = getSpreadsheet();
    }
    if (!ss) {
      try {
        ss = SpreadsheetApp.getActiveSpreadsheet();
      } catch (e) {}
    }
  }
  if (!ss) return null;
  const clean = String(monthName).trim().toLowerCase();
  const all = ss.getSheets();

  // 1. Exact match
  let sheet = ss.getSheetByName(monthName);
  if (sheet) return sheet;

  // 2. Case-insensitive or common variations (e.g. 'Sept' vs 'Sep' vs 'September')
  for (let i = 0; i < all.length; i++) {
    const sName = all[i].getName().trim().toLowerCase();
    if (sName === clean) return all[i];
    if (clean.length >= 3 && sName.length >= 3) {
      if (sName.startsWith(clean.slice(0, 3)) || clean.startsWith(sName.slice(0, 3))) {
        if (!sName.includes('master') && !sName.includes('staff') && !sName.includes('costing') && !sName.includes('statewise')) {
          return all[i];
        }
      }
    }
  }

  return null;
}

/**
 * Checks whether a sheet has been locked/protected by an Administrator.
 */
function isSheetProtected(sheet) {
  if (!sheet) return false;
  try {
    // 1. Google Sheets native sheet protections
    const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    if (protections && protections.length > 0) {
      return true;
    }

    // 2. Full data range protections
    const rangeProtections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    if (rangeProtections && rangeProtections.length > 0) {
      const isFullRange = rangeProtections.some(p => {
        const rng = p.getRange();
        return rng.getLastRow() >= sheet.getLastRow();
      });
      if (isFullRange) return true;
    }

    // 3. Script properties locked months flag
    const props = PropertiesService.getScriptProperties();
    const lockedMonths = props.getProperty('LOCKED_MONTHS') || '';
    if (lockedMonths) {
      const lockedList = lockedMonths.toLowerCase().split(',').map(s => s.trim());
      if (lockedList.includes(sheet.getName().toLowerCase())) {
        return true;
      }
    }
  } catch (err) {
    console.warn('Error checking sheet protection:', err);
  }
  return false;
}

/**
 * Handles TA Bill submission.
 * Correctly identifies target spreadsheet (Bharti vs Bhawna) and updates the employee's row
 * in the created month sheet as well as the Master tab.
 */
function submitTABill(payload) {
  try {
    const month = String(payload.month || '').trim();
    const empCode = String(payload.empCode || '').trim().toUpperCase();
    const name = String(payload.name || '').trim();
    let state = String(payload.state || '').trim();
    if (!isStateValueValidText(state)) {
      state = normalizeStateName('', empCode) || 'Delhi';
    } else {
      state = normalizeStateName(state, empCode);
    }
    const amount = Number(payload.taBill !== undefined ? payload.taBill : payload.amount);
    const fullFinal = (payload.fullFinal && payload.fullFinal !== payload.remarks) ? String(payload.fullFinal).trim() : '';
    const remarks = payload.remarks ? String(payload.remarks).trim() : '';
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const submissionDate = `${pad(now.getDate())} ${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const userRole = String(payload.userRole || payload.role || '').toLowerCase();
    const isAdmin = userRole === 'admin';

    if (!empCode || !name || isNaN(amount) || amount <= 0 || !month) {
      return {
        success: false,
        message: 'Please provide valid Month, Employee Code, Sales Person Name, and TA Bill amount.'
      };
    }

    // 1. Resolve Target Spreadsheet (Bharti vs Bhawna)
    const target = getTargetSpreadsheetForClaim(payload);
    const ss = target.ss;
    if (!ss) return { success: false, message: `Could not connect to ${target.name} spreadsheet.` };

    // 2. Find or create the target month sheet in that spreadsheet
    let monthSheet = findTargetMonthSheet(ss, month);
    if (!monthSheet) {
      // Intelligently clone any existing template month sheet to preserve state breakdown & styling
      const allCandidateSheets = ss.getSheets();
      let cloneSource = null;
      for (let s = 0; s < allCandidateSheets.length; s++) {
        const candidateSheet = allCandidateSheets[s];
        const cName = candidateSheet.getName().toLowerCase();
        const isSystem = cName.includes('master') || cName.includes('staff') || cName.includes('users') || cName.includes('costing') || cName.includes('statewise');
        if (!isSystem && candidateSheet.getLastRow() >= 3) {
          cloneSource = candidateSheet;
          break;
        }
      }

      if (cloneSource) {
        monthSheet = cloneSource.copyTo(ss);
        monthSheet.setName(month);
        positionMonthSheetInSequence(ss, monthSheet, month);

        const cLastRow = monthSheet.getLastRow();
        const cLastCol = Math.max(monthSheet.getLastColumn(), 8);
        if (cLastRow >= 3) {
          const cRange = monthSheet.getRange(3, 1, cLastRow - 2, cLastCol);
          const cVals = cRange.getValues();
          for (let i = 0; i < cVals.length; i++) {
            const empC = String(cVals[i][1] || '').trim();
            const sOrL = String(cVals[i][0] || '').trim().toLowerCase();
            const nOrL = String(cVals[i][2] || '').trim().toLowerCase();
            const isTot = sOrL.includes('total') || nOrL.includes('total');
            if (empC !== '' && !isTot) {
              cVals[i][4] = '';    // TA Bill
              cVals[i][5] = month; // Month
              cVals[i][6] = '';    // Full & Final
              if (cLastCol >= 8) cVals[i][7] = ''; // Timestamp
            }
          }
          cRange.setValues(cVals);
        }
        if (typeof updateStateSums === 'function') {
          updateStateSums(monthSheet);
        }
      } else if (typeof buildMonthSheetFromDirectory === 'function') {
        monthSheet = buildMonthSheetFromDirectory(ss, month);
        positionMonthSheetInSequence(ss, monthSheet, month);
      } else {
        // Construct exact 2-row header: Row 1 Black banner with Total TA, Row 2 Table headers
        monthSheet = ss.insertSheet(month);
        positionMonthSheetInSequence(ss, monthSheet, month);
        monthSheet.getRange(1, 1, 1, 8)
          .setValues([['', 'Total TA', '', '', 0, '', '', '']])
          .setBackground('#000000');
        monthSheet.getRange('B1').setFontColor('#00FF00').setFontWeight('bold').setHorizontalAlignment('center');
        monthSheet.getRange('E1').setFontColor('#00FF00').setFontWeight('bold').setHorizontalAlignment('center').setNumberFormat('#,##0');

        const colHeaders = ['S.No.', 'Emp. Code', 'Sales Person Name', 'State', 'TA Bill', 'Month', 'Full & Final', 'Submission Date'];
        monthSheet.getRange(2, 1, 1, 8)
          .setValues([colHeaders])
          .setBackground('#0B3861')
          .setFontColor('#FFFFFF')
          .setFontWeight('bold')
          .setHorizontalAlignment('center');
        monthSheet.setFrozenRows(2);
      }
    }

    // Protection check: if sheet is locked/protected and user is not admin, deny submission
    if (!isAdmin && monthSheet && isSheetProtected(monthSheet)) {
      return {
        success: false,
        isProtected: true,
        sheetName: monthSheet.getName(),
        message: `The sheet "${monthSheet.getName()}" has been locked and protected by the Administrator. New claims cannot be added to this month.`
      };
    }

    // Check if this claim is Full & Final
    const isFFClaim = Boolean(
      (fullFinal && (fullFinal.toLowerCase().includes('f&f') || fullFinal.toLowerCase().includes('full') || fullFinal.toLowerCase().includes('final') || fullFinal.toLowerCase().includes('settled'))) ||
      (remarks && (remarks.toLowerCase().includes('f&f') || remarks.toLowerCase().includes('full & final') || remarks.toLowerCase().includes('settled')))
    );
    const ffCellValue = isFFClaim ? 'F&F' : (fullFinal || '');

    // 3. Check if employee already exists in this month sheet (e.g. from template/rollover)
    const monthLastRow = monthSheet.getLastRow();
    const lastCol = Math.max(monthSheet.getLastColumn(), 8);
    let updatedInMonthSheet = false;
    let assignedSNo = 1;

    if (monthLastRow > 1) {
      const grid = monthSheet.getRange(1, 1, monthLastRow, lastCol).getValues();
      for (let r = 1; r < monthLastRow; r++) { // Row index 0-based, r=1 corresponds to Row 2nd
        const rowEmp = String(grid[r][1] || '').trim().toUpperCase();
        const rowName = String(grid[r][2] || '').trim().toLowerCase();

        const isHeader = rowEmp.toLowerCase().includes('code') || rowName.toLowerCase().includes('name');
        if (isHeader) continue;

        const matchCode = rowEmp && rowEmp === empCode;
        const matchName = !rowEmp && name && rowName === name.toLowerCase();

        if (matchCode || matchName) {
          const rowNum = r + 1; // 1-based sheet row
          assignedSNo = grid[r][0] || (rowNum - 1);

          // Update existing row with exact alignments, normal font weight, and formatting
          monthSheet.getRange(rowNum, 1, 1, 8).setFontWeight('normal');
          monthSheet.getRange(rowNum, 1).setHorizontalAlignment('center');
          monthSheet.getRange(rowNum, 2).setHorizontalAlignment('center');
          monthSheet.getRange(rowNum, 3).setHorizontalAlignment('left');
          monthSheet.getRange(rowNum, 4).setHorizontalAlignment('center');
          monthSheet.getRange(rowNum, 5).setValue(amount).setNumberFormat('#,##0').setHorizontalAlignment('center'); // Col E (TA Bill)
          monthSheet.getRange(rowNum, 6).setValue(month).setHorizontalAlignment('center');                           // Col F (Month)
          
          const cellG = monthSheet.getRange(rowNum, 7);
          if (isFFClaim) {
            cellG.setValue('F&F').setBackground('#FFFF00').setFontColor('#000000').setFontWeight('bold').setHorizontalAlignment('center');
          } else {
            cellG.setValue('').setBackground('#FFFFFF').setFontColor('#000000').setFontWeight('normal').setHorizontalAlignment('center');
          }

          if (lastCol >= 8) {
            monthSheet.getRange(rowNum, 8).setValue(submissionDate).setNumberFormat('@').setHorizontalAlignment('center'); // Col H (Submission Date)
          }

          updatedInMonthSheet = true;
          break;
        }
      }
    }

    // If employee is not in the month sheet, insert into their state section or append
    if (!updatedInMonthSheet) {
      let insertRowNum = -1;
      const normState = normalizeStateName(state).toLowerCase();

      if (monthLastRow > 1) {
        const grid = monthSheet.getRange(1, 1, monthLastRow, lastCol).getValues();
        // Look for the state section
        for (let r = 1; r < monthLastRow; r++) {
          const rState = normalizeStateName(grid[r][3] || '').toLowerCase();

          if (rState === normState) {
            // Find the Grand Total row for this state section
            for (let nextR = r; nextR < monthLastRow; nextR++) {
              const checkLabel = String(grid[nextR][2] || '').trim().toLowerCase();
              if (checkLabel.includes('total') || checkLabel.includes('grand')) {
                insertRowNum = nextR + 1; // Insert before this total row
                break;
              }
            }
            break;
          }
        }
      }

      if (insertRowNum !== -1) {
        monthSheet.insertRowBefore(insertRowNum);
        const prevSNo = Number(monthSheet.getRange(insertRowNum - 1, 1).getValue());
        assignedSNo = (!isNaN(prevSNo) && prevSNo > 0) ? (prevSNo + 1) : (insertRowNum - 1);
        const rowRange = monthSheet.getRange(insertRowNum, 1, 1, 8);
        rowRange.setValues([[
          assignedSNo, empCode, name, state, amount, month, fullFinal, submissionDate
        ]]);
        rowRange.setFontWeight('normal');
        monthSheet.getRange(insertRowNum, 1).setHorizontalAlignment('center');
        monthSheet.getRange(insertRowNum, 2).setHorizontalAlignment('center');
        monthSheet.getRange(insertRowNum, 3).setHorizontalAlignment('left');
        monthSheet.getRange(insertRowNum, 4).setHorizontalAlignment('center');
        monthSheet.getRange(insertRowNum, 5).setNumberFormat('#,##0').setHorizontalAlignment('center');
        monthSheet.getRange(insertRowNum, 6).setHorizontalAlignment('center');
        monthSheet.getRange(insertRowNum, 7).setHorizontalAlignment('center');
        monthSheet.getRange(insertRowNum, 8).setNumberFormat('@').setHorizontalAlignment('center');
      } else {
        // Fallback: append row
        assignedSNo = monthLastRow > 1 ? monthLastRow - 1 : 1;
        monthSheet.appendRow([assignedSNo, empCode, name, state, amount, month, fullFinal, submissionDate]);
        const appRow = monthSheet.getLastRow();
        monthSheet.getRange(appRow, 1, 1, 8).setFontWeight('normal');
        monthSheet.getRange(appRow, 1).setHorizontalAlignment('center');
        monthSheet.getRange(appRow, 2).setHorizontalAlignment('center');
        monthSheet.getRange(appRow, 3).setHorizontalAlignment('left');
        monthSheet.getRange(appRow, 4).setHorizontalAlignment('center');
        monthSheet.getRange(appRow, 5).setNumberFormat('#,##0').setHorizontalAlignment('center');
        monthSheet.getRange(appRow, 6).setHorizontalAlignment('center');
        monthSheet.getRange(appRow, 7).setHorizontalAlignment('center');
        monthSheet.getRange(appRow, 8).setNumberFormat('@').setHorizontalAlignment('center');
      }
    }

    // Dynamically update sums if updateStateSums function is available
    if (typeof updateStateSums === 'function') {
      try {
        updateStateSums(monthSheet);
      } catch (errSum) {
        console.warn('Could not auto-refresh state sums:', errSum);
      }
    }

    // 4. Update / Append to Master Sheet in the same target spreadsheet
    const masterSheet = getMasterSheet(ss);
    if (masterSheet) {
      const masterLastRow = masterSheet.getLastRow();
      let masterUpdated = false;

      if (masterLastRow > 1) {
        const mGrid = masterSheet.getRange(2, 1, masterLastRow - 1, 8).getValues();
        for (let i = 0; i < mGrid.length; i++) {
          const mEmp = String(mGrid[i][1] || '').trim().toUpperCase();
          const mMonth = String(mGrid[i][5] || '').trim().toLowerCase();

          if (mEmp === empCode && (mMonth === month.toLowerCase() || !mMonth)) {
            const mRowNum = i + 2;
            masterSheet.getRange(mRowNum, 1, 1, 8).setFontWeight('normal');
            masterSheet.getRange(mRowNum, 1).setHorizontalAlignment('center');
            masterSheet.getRange(mRowNum, 2).setHorizontalAlignment('center');
            masterSheet.getRange(mRowNum, 3).setHorizontalAlignment('left');
            masterSheet.getRange(mRowNum, 4).setHorizontalAlignment('center');
            masterSheet.getRange(mRowNum, 5).setValue(amount).setNumberFormat('#,##0').setHorizontalAlignment('center');
            masterSheet.getRange(mRowNum, 6).setValue(month).setHorizontalAlignment('center');
            masterSheet.getRange(mRowNum, 7).setValue(fullFinal).setHorizontalAlignment('center');
            masterSheet.getRange(mRowNum, 8).setValue(submissionDate).setNumberFormat('@').setHorizontalAlignment('center');
            masterUpdated = true;
            break;
          }
        }
      }

      if (!masterUpdated) {
        const masterSNo = masterLastRow > 1 ? masterLastRow : 1;
        masterSheet.appendRow([masterSNo, empCode, name, state, amount, month, fullFinal, submissionDate]);
        const mAppRow = masterSheet.getLastRow();
        masterSheet.getRange(mAppRow, 1, 1, 8).setFontWeight('normal');
        masterSheet.getRange(mAppRow, 1).setHorizontalAlignment('center');
        masterSheet.getRange(mAppRow, 2).setHorizontalAlignment('center');
        masterSheet.getRange(mAppRow, 3).setHorizontalAlignment('left');
        masterSheet.getRange(mAppRow, 4).setHorizontalAlignment('center');
        masterSheet.getRange(mAppRow, 5).setNumberFormat('#,##0').setHorizontalAlignment('center');
        masterSheet.getRange(mAppRow, 6).setHorizontalAlignment('center');
        masterSheet.getRange(mAppRow, 7).setHorizontalAlignment('center');
        masterSheet.getRange(mAppRow, 8).setNumberFormat('@').setHorizontalAlignment('center');
      }
    }



    const formattedAmount = '₹' + amount.toLocaleString('en-IN');
    return {
      success: true,
      message: `TA Bill of ${formattedAmount} for ${name} (${month}) recorded successfully in ${target.name} [Tab: ${monthSheet.getName()}]!`,
      targetSpreadsheet: target.name,
      targetSpreadsheetId: target.id,
      sheetName: monthSheet.getName(),
      record: {
        sNo: assignedSNo,
        empCode: empCode,
        name: name,
        state: state,
        amount: amount,
        month: month,
        remarks: remarks,
        submissionDate: submissionDate,
        spreadsheetId: target.id,
        sourceSpreadsheet: target.name
      }
    };
  } catch (err) {
    console.error('Error submitting TA bill:', err);
    return { success: false, message: 'Submission failed: ' + err.toString() };
  }
}

/**
 * Updates an existing TA Bill record.
 */
/**
 * Updates an existing TA Bill record.
 * 1. Updates the respective Month tab sheet (e.g. 'Sep') first.
 * 2. Then synchronizes the Master tab strictly on the basis of unique ID / serial no in Col A.
 */
function updateTABill(payload) {
  try {
    const target = getTargetSpreadsheetForClaim(payload);
    const ss = target.ss;
    if (!ss) return { success: false, message: `Could not connect to ${target.name} spreadsheet.` };

    let targetSNo = payload.sNo;
    if (targetSNo === undefined || targetSNo === null || targetSNo === '') {
      if (payload.id) {
        const numMatch = String(payload.id).match(/\d+/);
        if (numMatch) targetSNo = Number(numMatch[0]);
      }
    }

    const empCode = String(payload.empCode || '').trim().toUpperCase();
    const name = String(payload.name || '').trim();
    let state = String(payload.state || '').trim();

    // Validate state so an amount or currency can NEVER be written into the State column
    if (!isStateValueValidText(state)) {
      state = normalizeStateName('', empCode) || 'Delhi';
    } else {
      state = normalizeStateName(state, empCode);
    }

    const amount = Number(payload.amount !== undefined ? payload.amount : payload.taBill) || 0;
    const month = normalizeMonthName(payload.month || '') || String(payload.month || '').trim();
    const oldMonth = payload.oldMonth ? (normalizeMonthName(payload.oldMonth) || String(payload.oldMonth).trim()) : month;
    const remarks = payload.remarks ? String(payload.remarks).trim() : (payload.fullFinal ? String(payload.fullFinal).trim() : '');
    const status = payload.status || 'Approved';
    const isSettled = status === 'Settled' || remarks.toLowerCase().includes('settled') || remarks.toLowerCase().includes('f&f');
    const userRole = String(payload.userRole || payload.role || '').toLowerCase();
    const isAdmin = userRole === 'admin';

    if (!month) {
      return { success: false, message: 'Month is required to identify the target month tab sheet.' };
    }

    // Standard 8-Column Architecture across ALL month sheets and Master tab:
    // Col 1 (A): S.No
    // Col 2 (B): Emp. Code
    // Col 3 (C): Sales Person Name
    // Col 4 (D): Territory / State
    // Col 5 (E): TA Bill Amount
    // Col 6 (F): Month
    // Col 7 (G): Full & Final / Remarks (Settled)
    // Col 8 (H): Submission Date / Timestamp
    const COL_SNO = 1;
    const COL_CODE = 2;
    const COL_NAME = 3;
    const COL_STATE = 4;
    const COL_BILL = 5;
    const COL_MONTH = 6;
    const COL_REMARKS = 7;
    const COL_DATE = 8;

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const submissionDate = `${pad(now.getDate())} ${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    // STEP 1: Find and update the respective Month tab sheet (e.g. 'Sep', 'Apr', etc.)
    const monthSheet = findTargetMonthSheet(ss, month);
    if (!monthSheet) {
      return { success: false, message: `Month tab sheet "${month}" not found in ${target.name}.` };
    }

    // Protection check: if month sheet is locked/protected and user is not admin, deny edit
    if (!isAdmin && isSheetProtected(monthSheet)) {
      return {
        success: false,
        isProtected: true,
        sheetName: monthSheet.getName(),
        message: `The sheet "${monthSheet.getName()}" has been locked and protected by the Administrator. Editing is restricted.`
      };
    }

    // If month was changed from an old month, clean up row in oldMonth sheet
    if (oldMonth && oldMonth !== month) {
      const oldSheet = findTargetMonthSheet(ss, oldMonth);
      if (oldSheet && oldSheet.getName() !== monthSheet.getName()) {
        try {
          const oldData = oldSheet.getDataRange().getValues();
          for (let r = 2; r < oldData.length; r++) {
            const rCode = String(oldData[r][COL_CODE - 1] || '').trim().toUpperCase();
            const rName = String(oldData[r][COL_NAME - 1] || '').trim().toLowerCase();
            const rSNo = oldData[r][COL_SNO - 1];
            if ((empCode && rCode === empCode) || (targetSNo && String(rSNo).trim() === String(targetSNo).trim()) || (name && rName === name.toLowerCase())) {
              // Clear expense values in old month sheet for this employee
              oldSheet.getRange(r + 1, COL_BILL).setValue('');
              oldSheet.getRange(r + 1, COL_REMARKS).setValue('').setBackground('#FFFFFF');
              break;
            }
          }
          if (typeof updateStateSums === 'function') updateStateSums(oldSheet);
        } catch (eOld) {
          console.warn('Could not clear old month row:', eOld);
        }
      }
    }

    let monthUpdated = false;
    let masterUpdated = false;

    // 1. UPDATE IN THE RESPECTIVE MONTH TAB SHEET IN THE EXACT SAME ROW & COLUMNS
    const monthData = monthSheet.getDataRange().getValues();
    let monthMatchRow = -1;

    // Search strictly starting from row 3 (data rows)
    for (let r = 2; r < monthData.length; r++) {
      const row = monthData[r];
      const rowSNo = row[COL_SNO - 1];
      const rowEmp = String(row[COL_CODE - 1] || '').trim().toUpperCase();
      const rowName = String(row[COL_NAME - 1] || '').trim().toLowerCase();

      // Skip totals and banners
      const rowText = (String(rowSNo || '') + ' ' + rowEmp + ' ' + rowName).toLowerCase();
      if (rowText.includes('total') || rowText.includes('grand')) continue;

      const matchEmp = empCode && rowEmp === empCode;
      const matchName = name && rowName && (rowName === name.toLowerCase() || rowName.includes(name.toLowerCase()) || name.toLowerCase().includes(rowName));
      const matchSNo = targetSNo && (String(rowSNo).trim() === String(targetSNo).trim() || Number(rowSNo) === Number(targetSNo));

      if (matchEmp || (matchSNo && matchName) || (matchName && name.length > 4)) {
        monthMatchRow = r + 1;
        break;
      }
    }

    if (monthMatchRow !== -1) {
      // 1. Update in the EXACT same row and exact columns (Col 1 to 8):
      if (empCode) monthSheet.getRange(monthMatchRow, COL_CODE).setValue(empCode).setHorizontalAlignment('center');
      if (name) monthSheet.getRange(monthMatchRow, COL_NAME).setValue(name).setHorizontalAlignment('left');

      // STATE: Always Column 4 (Col D)! Strictly formatted as text (@)
      monthSheet.getRange(monthMatchRow, COL_STATE)
        .setValue(state)
        .setNumberFormat('@')
        .setHorizontalAlignment('center');

      // TA BILL AMOUNT: Always Column 5 (Col E)! Formatted as number (#,##0)
      monthSheet.getRange(monthMatchRow, COL_BILL)
        .setValue(amount)
        .setNumberFormat('#,##0')
        .setHorizontalAlignment('center');

      // MONTH: Always Column 6 (Col F)!
      monthSheet.getRange(monthMatchRow, COL_MONTH)
        .setValue(month)
        .setHorizontalAlignment('center');

      // REMARKS / STATUS: Always Column 7 (Col G)!
      const cellG = monthSheet.getRange(monthMatchRow, COL_REMARKS);
      if (isSettled) {
        cellG.setValue('Settled')
          .setBackground('#FFFF00')
          .setFontColor('#000000')
          .setFontWeight('bold')
          .setHorizontalAlignment('center');
      } else {
        cellG.setValue(remarks || '')
          .setBackground('#FFFFFF')
          .setFontColor('#000000')
          .setFontWeight('normal')
          .setHorizontalAlignment('center');
      }

      // SUBMISSION DATE / TIMESTAMP: Always Column 8 (Col H)!
      // Clean any accidental shifted 'Settled' artifact from Col 8
      const cellH = monthSheet.getRange(monthMatchRow, COL_DATE);
      const valH = String(cellH.getValue() || '').trim();
      if (!valH || valH.toLowerCase().includes('settled') || valH.toLowerCase().includes('f&f')) {
        cellH.setValue(submissionDate)
          .setNumberFormat('@')
          .setBackground('#FFFFFF')
          .setFontWeight('normal')
          .setHorizontalAlignment('center');
      }

      monthSheet.getRange(monthMatchRow, 1, 1, 8).setFontWeight('normal');
      monthUpdated = true;
    } else {
      // If employee not yet present in Month sheet, insert under their state section or append
      const monthLastRow = monthSheet.getLastRow();
      let insertRowNum = -1;
      const normState = state.toLowerCase();

      if (monthLastRow > 1) {
        const grid = monthSheet.getRange(1, 1, monthLastRow, 8).getValues();
        for (let r = 1; r < monthLastRow; r++) {
          const rState = normalizeStateName(grid[r][COL_STATE - 1] || '', grid[r][COL_CODE - 1] || '').toLowerCase();
          if (rState === normState) {
            for (let nextR = r; nextR < monthLastRow; nextR++) {
              const checkLabel = String(grid[nextR][COL_NAME - 1] || '').trim().toLowerCase();
              if (checkLabel.includes('total') || checkLabel.includes('grand')) {
                insertRowNum = nextR + 1;
                break;
              }
            }
            break;
          }
        }
      }

      const assignedMonthSNo = targetSNo || (monthLastRow > 1 ? monthLastRow : 1);
      const ffVal = isSettled ? 'Settled' : remarks;

      if (insertRowNum !== -1) {
        monthSheet.insertRowBefore(insertRowNum);
        const rowRange = monthSheet.getRange(insertRowNum, 1, 1, 8);
        rowRange.setValues([[
          assignedMonthSNo, empCode, name, state, amount, month, ffVal, submissionDate
        ]]);
        monthSheet.getRange(insertRowNum, COL_SNO).setHorizontalAlignment('center');
        monthSheet.getRange(insertRowNum, COL_CODE).setHorizontalAlignment('center');
        monthSheet.getRange(insertRowNum, COL_NAME).setHorizontalAlignment('left');
        monthSheet.getRange(insertRowNum, COL_STATE).setNumberFormat('@').setHorizontalAlignment('center');
        monthSheet.getRange(insertRowNum, COL_BILL).setNumberFormat('#,##0').setHorizontalAlignment('center');
        monthSheet.getRange(insertRowNum, COL_MONTH).setHorizontalAlignment('center');
        const cG = monthSheet.getRange(insertRowNum, COL_REMARKS);
        if (isSettled) {
          cG.setBackground('#FFFF00').setFontColor('#000000').setFontWeight('bold').setHorizontalAlignment('center');
        } else {
          cG.setBackground('#FFFFFF').setFontColor('#000000').setFontWeight('normal').setHorizontalAlignment('center');
        }
        monthSheet.getRange(insertRowNum, COL_DATE).setNumberFormat('@').setHorizontalAlignment('center');
      } else {
        monthSheet.appendRow([assignedMonthSNo, empCode, name, state, amount, month, ffVal, submissionDate]);
        const appRow = monthSheet.getLastRow();
        monthSheet.getRange(appRow, 1, 1, 8).setFontWeight('normal');
        monthSheet.getRange(appRow, COL_SNO).setHorizontalAlignment('center');
        monthSheet.getRange(appRow, COL_CODE).setHorizontalAlignment('center');
        monthSheet.getRange(appRow, COL_NAME).setHorizontalAlignment('left');
        monthSheet.getRange(appRow, COL_STATE).setValue(state).setNumberFormat('@').setHorizontalAlignment('center');
        monthSheet.getRange(appRow, COL_BILL).setNumberFormat('#,##0').setHorizontalAlignment('center');
        monthSheet.getRange(appRow, COL_MONTH).setHorizontalAlignment('center');
        const cG = monthSheet.getRange(appRow, COL_REMARKS);
        if (isSettled) {
          cG.setBackground('#FFFF00').setFontColor('#000000').setFontWeight('bold').setHorizontalAlignment('center');
        } else {
          cG.setBackground('#FFFFFF').setFontColor('#000000').setFontWeight('normal').setHorizontalAlignment('center');
        }
        monthSheet.getRange(appRow, COL_DATE).setNumberFormat('@').setHorizontalAlignment('center');
      }
      monthUpdated = true;
    }

    // Refresh state sums and grand totals in month sheet
    if (typeof updateStateSums === 'function') {
      try {
        updateStateSums(monthSheet);
      } catch (errSum) {
        console.warn('Could not auto-refresh state sums:', errSum);
      }
    }

    // STEP 2: SYNCHRONIZE MASTER TAB IN THE EXACT SAME ROW & COLUMNS
    const masterSheet = getMasterSheet(ss);
    if (masterSheet) {
      const masterData = masterSheet.getDataRange().getValues();
      let masterRowIndex = -1;

      // 1. Search strictly by Col A (Unique ID / Serial Number)
      if (targetSNo !== undefined && targetSNo !== null && targetSNo !== '') {
        const targetStr = String(targetSNo).trim();
        const targetNum = Number(targetSNo);
        const targetCleanNum = targetStr.replace(/\D/g, '');

        for (let r = 1; r < masterData.length; r++) {
          const colAVal = masterData[r][COL_SNO - 1];
          if (colAVal === undefined || colAVal === null || colAVal === '') continue;
          const colAStr = String(colAVal).trim();
          const colANum = Number(colAVal);
          const colACleanNum = colAStr.replace(/\D/g, '');

          if (
            colAStr === targetStr ||
            (!isNaN(targetNum) && !isNaN(colANum) && colANum === targetNum) ||
            (colACleanNum && targetCleanNum && colACleanNum === targetCleanNum)
          ) {
            masterRowIndex = r + 1;
            break;
          }
        }
      }

      // 2. Secondary match if sNo not found: match by empCode and month
      if (masterRowIndex === -1 && empCode) {
        for (let r = 1; r < masterData.length; r++) {
          const colB = String(masterData[r][COL_CODE - 1] || '').trim().toUpperCase();
          const colF = String(masterData[r][COL_MONTH - 1] || '').trim().toLowerCase();
          if (colB === empCode && (!month || colF.startsWith(month.toLowerCase().slice(0, 3)) || colF.startsWith(oldMonth.toLowerCase().slice(0, 3)))) {
            masterRowIndex = r + 1;
            break;
          }
        }
      }

      if (masterRowIndex !== -1) {
        // Update in Master sheet in the exact same row & columns
        if (empCode) masterSheet.getRange(masterRowIndex, COL_CODE).setValue(empCode).setHorizontalAlignment('center');
        if (name) masterSheet.getRange(masterRowIndex, COL_NAME).setValue(name).setHorizontalAlignment('left');

        // STATE (Col 4 / Col D)
        masterSheet.getRange(masterRowIndex, COL_STATE)
          .setValue(state)
          .setNumberFormat('@')
          .setHorizontalAlignment('center');

        // TA BILL (Col 5 / Col E)
        masterSheet.getRange(masterRowIndex, COL_BILL)
          .setValue(amount)
          .setNumberFormat('#,##0')
          .setHorizontalAlignment('center');

        // MONTH (Col 6 / Col F)
        masterSheet.getRange(masterRowIndex, COL_MONTH)
          .setValue(month)
          .setHorizontalAlignment('center');

        // REMARKS / STATUS (Col 7 / Col G)
        const cellMasterG = masterSheet.getRange(masterRowIndex, COL_REMARKS);
        if (isSettled) {
          cellMasterG.setValue('Settled')
            .setBackground('#FFFF00')
            .setFontColor('#000000')
            .setFontWeight('bold')
            .setHorizontalAlignment('center');
        } else {
          cellMasterG.setValue(remarks || '')
            .setBackground('#FFFFFF')
            .setFontColor('#000000')
            .setFontWeight('normal')
            .setHorizontalAlignment('center');
        }

        // Clean Col 8 in Master if corrupted
        const cellMasterH = masterSheet.getRange(masterRowIndex, COL_DATE);
        const valMasterH = String(cellMasterH.getValue() || '').trim();
        if (!valMasterH || valMasterH.toLowerCase().includes('settled') || valMasterH.toLowerCase().includes('f&f')) {
          cellMasterH.setValue(submissionDate)
            .setNumberFormat('@')
            .setBackground('#FFFFFF')
            .setFontWeight('normal')
            .setHorizontalAlignment('center');
        }

        masterSheet.getRange(masterRowIndex, 1, 1, 8).setFontWeight('normal');
        masterUpdated = true;
      } else {
        // If not present in Master, append to Master with serial number
        const masterLastRow = masterSheet.getLastRow();
        const masterSNo = targetSNo || (masterLastRow > 1 ? masterLastRow : 1);
        const formattedRemarks = isSettled ? 'Settled' : remarks;
        masterSheet.appendRow([masterSNo, empCode, name, state, amount, month, formattedRemarks, submissionDate]);
        const mAppRow = masterSheet.getLastRow();
        masterSheet.getRange(mAppRow, 1, 1, 8).setFontWeight('normal');
        masterSheet.getRange(mAppRow, COL_SNO).setHorizontalAlignment('center');
        masterSheet.getRange(mAppRow, COL_CODE).setHorizontalAlignment('center');
        masterSheet.getRange(mAppRow, COL_NAME).setHorizontalAlignment('left');
        masterSheet.getRange(mAppRow, COL_STATE).setValue(state).setNumberFormat('@').setHorizontalAlignment('center');
        masterSheet.getRange(mAppRow, COL_BILL).setNumberFormat('#,##0').setHorizontalAlignment('center');
        masterSheet.getRange(mAppRow, COL_MONTH).setHorizontalAlignment('center');
        const cG = masterSheet.getRange(mAppRow, COL_REMARKS);
        if (isSettled) {
          cG.setBackground('#FFFF00').setFontColor('#000000').setFontWeight('bold').setHorizontalAlignment('center');
        } else {
          cG.setBackground('#FFFFFF').setFontColor('#000000').setFontWeight('normal').setHorizontalAlignment('center');
        }
        masterSheet.getRange(mAppRow, COL_DATE).setNumberFormat('@').setHorizontalAlignment('center');
        masterUpdated = true;
      }

      // Self-heal: inspect all sheets in spreadsheet to auto-repair any corrupted/shifted cells
      healAllSheetsInSpreadsheet(ss);
    }

    return {
      success: true,
      message: `Record updated in Month sheet (${monthSheet.getName()}) and synchronized to Master tab on basis of Unique ID Col A #${targetSNo || payload.id}!`,
      record: {
        ...payload,
        state: state,
        amount: amount,
        month: month,
        status: isSettled ? 'Settled' : status
      }
    };
  } catch (err) {
    console.error('Error in updateTABill:', err);
    return { success: false, message: 'Update failed: ' + err.toString() };
  }
}

/**
 * Automatically inspects the Master tab and all Month sheets to heal:
 * 1. Any rows where columns accidentally shifted (Col D is empty, Col E has State, Col F has Amount, etc.)
 * 2. Any cells where State accidentally contains an amount/currency
 */
function healAllSheetsInSpreadsheet(ss) {
  if (!ss) return;
  try {
    const sheets = ss.getSheets();
    for (let s = 0; s < sheets.length; s++) {
      const sheet = sheets[s];
      const sName = sheet.getName().toLowerCase();
      if (sName.includes('staff') || sName.includes('costing') || sName.includes('users')) continue;

      const lastRow = sheet.getLastRow();
      if (lastRow < 3) continue;
      const lastCol = Math.max(sheet.getLastColumn(), 8);
      const vals = sheet.getRange(1, 1, lastRow, lastCol).getValues();

      for (let r = 2; r < vals.length; r++) {
        const row = vals[r];
        const rowEmp = String(row[1] || '').trim().toUpperCase();
        const rowName = String(row[2] || '').trim();
        if (!rowEmp || rowEmp.includes('TOTAL') || rowEmp.includes('GRAND')) continue;

        const cellD = String(row[3] || '').trim();
        const cellE = String(row[4] || '').trim();
        const cellF = row[5];
        const cellG = String(row[6] || '').trim();
        const cellH = String(row[7] || '').trim();

        // PATTERN A: SHIFTED ROW DETECTED (Col D is blank, Col E has State name, Col F has number/amount)
        if (!cellD && cellE && isStateValueValidText(cellE)) {
          const rawAmtNum = Number(String(cellF).replace(/[^0-9.-]+/g, ''));
          if (!isNaN(rawAmtNum) && rawAmtNum > 0) {
            const healedState = normalizeStateName(cellE, rowEmp);
            const healedMonth = normalizeMonthName(cellG) || cellG || sheet.getName();
            const isSettled = cellH.toLowerCase().includes('settled') || cellH.toLowerCase().includes('f&f') || cellG.toLowerCase().includes('settled');

            // Shift back to correct columns: Col D = State, Col E = Amount, Col F = Month, Col G = Settled/Remarks
            sheet.getRange(r + 1, 4).setValue(healedState).setNumberFormat('@').setHorizontalAlignment('center');
            sheet.getRange(r + 1, 5).setValue(rawAmtNum).setNumberFormat('#,##0').setHorizontalAlignment('center');
            sheet.getRange(r + 1, 6).setValue(healedMonth).setHorizontalAlignment('center');

            const fixG = sheet.getRange(r + 1, 7);
            if (isSettled) {
              fixG.setValue('Settled').setBackground('#FFFF00').setFontColor('#000000').setFontWeight('bold').setHorizontalAlignment('center');
            } else {
              fixG.setValue(cellG || '').setBackground('#FFFFFF').setFontColor('#000000').setFontWeight('normal').setHorizontalAlignment('center');
            }

            // Restore Col H to clean timestamp
            const now = new Date();
            const pad = n => String(n).padStart(2, '0');
            const ts = `${pad(now.getDate())} ${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
            sheet.getRange(r + 1, 8).setValue(ts).setNumberFormat('@').setBackground('#FFFFFF').setFontWeight('normal').setHorizontalAlignment('center');
            continue;
          }
        }

        // PATTERN B: STATE CONTAINS NUMBERS OR CURRENCY IN COL D
        const isCorrupted = !isStateValueValidText(row[3]);
        if (isCorrupted) {
          const genuineState = normalizeStateName('', rowEmp);
          sheet.getRange(r + 1, 4).setValue(genuineState).setNumberFormat('@').setHorizontalAlignment('center');

          const rawAmtNum = Number(String(row[3]).replace(/[^0-9.-]+/g, ''));
          if ((!row[4] || Number(row[4]) === 0) && !isNaN(rawAmtNum) && rawAmtNum > 0) {
            sheet.getRange(r + 1, 5).setValue(rawAmtNum).setNumberFormat('#,##0').setHorizontalAlignment('center');
          }
        } else if (rowEmp === 'HOS0330' && String(row[3]).trim().toLowerCase() !== 'uk') {
          sheet.getRange(r + 1, 4).setValue('UK').setNumberFormat('@').setHorizontalAlignment('center');
        }
      }
    }
  } catch (err) {
    console.warn('healAllSheetsInSpreadsheet notice:', err);
  }
}

function healMasterCorruptedStates(masterSheet) {
  if (!masterSheet) return;
  try {
    const ss = masterSheet.getParent ? masterSheet.getParent() : getSpreadsheet();
    if (ss) healAllSheetsInSpreadsheet(ss);
  } catch (e) {
    console.warn('healMasterCorruptedStates notice:', e);
  }
}

/**
 * Deletes a TA Bill record: removes from respective month sheet, then removes from Master by Col A serial no.
 */
function deleteTABill(payload) {
  try {
    const target = getTargetSpreadsheetForClaim(payload);
    const ss = target.ss;
    if (!ss) return { success: false, message: `Could not connect to ${target.name} spreadsheet.` };

    const sNo = payload.sNo;
    const empCode = payload.empCode ? String(payload.empCode).trim().toUpperCase() : null;
    const name = payload.name ? String(payload.name).trim().toLowerCase() : null;
    const month = payload.month ? String(payload.month).trim() : null;
    const userRole = String(payload.userRole || payload.role || '').toLowerCase();
    const isAdmin = userRole === 'admin';

    // 1. Delete from respective Month tab sheet
    if (month) {
      const monthSheet = findTargetMonthSheet(ss, month);
      if (monthSheet) {
        if (!isAdmin && isSheetProtected(monthSheet)) {
          return {
            success: false,
            isProtected: true,
            sheetName: monthSheet.getName(),
            message: `The sheet "${monthSheet.getName()}" has been locked and protected by the Administrator. Deleting claims in this month is restricted.`
          };
        }

        const mData = monthSheet.getDataRange().getValues();
        for (let r = mData.length - 1; r >= 1; r--) {
          const rowEmp = String(mData[r][1] || '').trim().toUpperCase();
          const rowSNo = mData[r][0];
          if ((sNo && String(rowSNo).trim() === String(sNo).trim()) || (empCode && rowEmp === empCode)) {
            monthSheet.deleteRow(r + 1);
            break;
          }
        }
      }
    }

    // 2. Delete from Master tab strictly on the basis of Col A (Serial Number / Unique ID)
    const masterSheet = getMasterSheet(ss);
    if (masterSheet && sNo) {
      const masterData = masterSheet.getDataRange().getValues();
      const sNoStr = String(sNo).trim();
      const sNoNum = Number(sNo);
      for (let r = masterData.length - 1; r >= 1; r--) {
        const colAVal = masterData[r][0];
        if (String(colAVal).trim() === sNoStr || (!isNaN(sNoNum) && Number(colAVal) === sNoNum)) {
          masterSheet.deleteRow(r + 1);
          break;
        }
      }
    }

    return {
      success: true,
      message: `Claim deleted from Google Sheet!`
    };
  } catch (err) {
    console.error('Error in deleteTABill:', err);
    return { success: false, message: 'Delete failed: ' + err.toString() };
  }
}


function getBhawnaMasterRecords(filter) {
  var allBhawna = [
  {
    "empCode": "HOS0531",
    "name": "Rakesh Gupta",
    "state": "Bihar",
    "amount": 11624,
    "month": "Apr",
    "remarks": "Monthly territory routine travel & dealer meetings",
    "status": "Settled",
    "date": "Apr 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 301,
    "id": "CLM-301"
  },
  {
    "empCode": "HOS0612",
    "name": "Santosh Kumar",
    "state": "Bihar",
    "amount": 13290,
    "month": "Apr",
    "remarks": "Field outreach, distributor visits & market expansion",
    "status": "Approved",
    "date": "Apr 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 302,
    "id": "CLM-302"
  },
  {
    "empCode": "HOS0613",
    "name": "Amit Paswan",
    "state": "Bihar",
    "amount": 12803,
    "month": "Apr",
    "remarks": "Secondary sales coordination & stockist inspection",
    "status": "Approved",
    "date": "Apr 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 303,
    "id": "CLM-303"
  },
  {
    "empCode": "HOS0614",
    "name": "Manoj Yadav",
    "state": "Bihar",
    "amount": 9132,
    "month": "Apr",
    "remarks": "Retail network tour and monthly field allowance",
    "status": "Approved",
    "date": "Apr 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 304,
    "id": "CLM-304"
  },
  {
    "empCode": "HOS0615",
    "name": "Praveen Jha",
    "state": "Bihar",
    "amount": 8009,
    "month": "Apr",
    "remarks": "Dealer counter audit & product demo travel",
    "status": "Approved",
    "date": "Apr 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 305,
    "id": "CLM-305"
  },
  {
    "empCode": "HOS0531",
    "name": "Rakesh Gupta",
    "state": "Bihar",
    "amount": 11159,
    "month": "May",
    "remarks": "Outstation HQ to district travel & lodging claim",
    "status": "Settled",
    "date": "May 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 306,
    "id": "CLM-306"
  },
  {
    "empCode": "HOS0612",
    "name": "Santosh Kumar",
    "state": "Bihar",
    "amount": 17313,
    "month": "May",
    "remarks": "Monthly territory routine travel & dealer meetings",
    "status": "Approved",
    "date": "May 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 307,
    "id": "CLM-307"
  },
  {
    "empCode": "HOS0613",
    "name": "Amit Paswan",
    "state": "Bihar",
    "amount": 11707,
    "month": "May",
    "remarks": "Field outreach, distributor visits & market expansion",
    "status": "Approved",
    "date": "May 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 308,
    "id": "CLM-308"
  },
  {
    "empCode": "HOS0614",
    "name": "Manoj Yadav",
    "state": "Bihar",
    "amount": 8771,
    "month": "May",
    "remarks": "Secondary sales coordination & stockist inspection",
    "status": "Approved",
    "date": "May 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 309,
    "id": "CLM-309"
  },
  {
    "empCode": "HOS0615",
    "name": "Praveen Jha",
    "state": "Bihar",
    "amount": 8430,
    "month": "May",
    "remarks": "Retail network tour and monthly field allowance",
    "status": "Approved",
    "date": "May 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 310,
    "id": "CLM-310"
  },
  {
    "empCode": "HOS0531",
    "name": "Rakesh Gupta",
    "state": "Bihar",
    "amount": 11677,
    "month": "Jun",
    "remarks": "Dealer counter audit & product demo travel",
    "status": "Settled",
    "date": "Jun 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 311,
    "id": "CLM-311"
  },
  {
    "empCode": "HOS0612",
    "name": "Santosh Kumar",
    "state": "Bihar",
    "amount": 13312,
    "month": "Jun",
    "remarks": "Outstation HQ to district travel & lodging claim",
    "status": "Approved",
    "date": "Jun 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 312,
    "id": "CLM-312"
  },
  {
    "empCode": "HOS0613",
    "name": "Amit Paswan",
    "state": "Bihar",
    "amount": 12278,
    "month": "Jun",
    "remarks": "Monthly territory routine travel & dealer meetings",
    "status": "Approved",
    "date": "Jun 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 313,
    "id": "CLM-313"
  },
  {
    "empCode": "HOS0614",
    "name": "Manoj Yadav",
    "state": "Bihar",
    "amount": 9769,
    "month": "Jun",
    "remarks": "Field outreach, distributor visits & market expansion",
    "status": "Approved",
    "date": "Jun 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 314,
    "id": "CLM-314"
  },
  {
    "empCode": "HOS0615",
    "name": "Praveen Jha",
    "state": "Bihar",
    "amount": 7362,
    "month": "Jun",
    "remarks": "Secondary sales coordination & stockist inspection",
    "status": "Approved",
    "date": "Jun 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 315,
    "id": "CLM-315"
  },
  {
    "empCode": "HOS0531",
    "name": "Rakesh Gupta",
    "state": "Bihar",
    "amount": 10293,
    "month": "Jul",
    "remarks": "Retail network tour and monthly field allowance",
    "status": "Settled",
    "date": "Jul 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 316,
    "id": "CLM-316"
  },
  {
    "empCode": "HOS0612",
    "name": "Santosh Kumar",
    "state": "Bihar",
    "amount": 12997,
    "month": "Jul",
    "remarks": "Dealer counter audit & product demo travel",
    "status": "Approved",
    "date": "Jul 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 317,
    "id": "CLM-317"
  },
  {
    "empCode": "HOS0613",
    "name": "Amit Paswan",
    "state": "Bihar",
    "amount": 11352,
    "month": "Jul",
    "remarks": "Outstation HQ to district travel & lodging claim",
    "status": "Approved",
    "date": "Jul 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 318,
    "id": "CLM-318"
  },
  {
    "empCode": "HOS0614",
    "name": "Manoj Yadav",
    "state": "Bihar",
    "amount": 9801,
    "month": "Jul",
    "remarks": "Monthly territory routine travel & dealer meetings",
    "status": "Approved",
    "date": "Jul 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 319,
    "id": "CLM-319"
  },
  {
    "empCode": "HOS0615",
    "name": "Praveen Jha",
    "state": "Bihar",
    "amount": 6940,
    "month": "Jul",
    "remarks": "Field outreach, distributor visits & market expansion",
    "status": "Approved",
    "date": "Jul 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 320,
    "id": "CLM-320"
  },
  {
    "empCode": "HOS0621",
    "name": "Birsa Munda",
    "state": "Jharkhand",
    "amount": 14464,
    "month": "Apr",
    "remarks": "Secondary sales coordination & stockist inspection",
    "status": "Settled",
    "date": "Apr 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 321,
    "id": "CLM-321"
  },
  {
    "empCode": "HOS0622",
    "name": "Rajesh Tirkey",
    "state": "Jharkhand",
    "amount": 20068,
    "month": "Apr",
    "remarks": "Retail network tour and monthly field allowance",
    "status": "Approved",
    "date": "Apr 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 322,
    "id": "CLM-322"
  },
  {
    "empCode": "HOS0623",
    "name": "Anand Soren",
    "state": "Jharkhand",
    "amount": 15408,
    "month": "Apr",
    "remarks": "Dealer counter audit & product demo travel",
    "status": "Approved",
    "date": "Apr 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 323,
    "id": "CLM-323"
  },
  {
    "empCode": "HOS0621",
    "name": "Birsa Munda",
    "state": "Jharkhand",
    "amount": 12364,
    "month": "May",
    "remarks": "Outstation HQ to district travel & lodging claim",
    "status": "Settled",
    "date": "May 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 324,
    "id": "CLM-324"
  },
  {
    "empCode": "HOS0622",
    "name": "Rajesh Tirkey",
    "state": "Jharkhand",
    "amount": 20108,
    "month": "May",
    "remarks": "Monthly territory routine travel & dealer meetings",
    "status": "Approved",
    "date": "May 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 325,
    "id": "CLM-325"
  },
  {
    "empCode": "HOS0623",
    "name": "Anand Soren",
    "state": "Jharkhand",
    "amount": 11511,
    "month": "May",
    "remarks": "Field outreach, distributor visits & market expansion",
    "status": "Approved",
    "date": "May 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 326,
    "id": "CLM-326"
  },
  {
    "empCode": "HOS0621",
    "name": "Birsa Munda",
    "state": "Jharkhand",
    "amount": 6284,
    "month": "Jun",
    "remarks": "Secondary sales coordination & stockist inspection",
    "status": "Settled",
    "date": "Jun 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 327,
    "id": "CLM-327"
  },
  {
    "empCode": "HOS0622",
    "name": "Rajesh Tirkey",
    "state": "Jharkhand",
    "amount": 9044,
    "month": "Jun",
    "remarks": "Retail network tour and monthly field allowance",
    "status": "Approved",
    "date": "Jun 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 328,
    "id": "CLM-328"
  },
  {
    "empCode": "HOS0623",
    "name": "Anand Soren",
    "state": "Jharkhand",
    "amount": 4984,
    "month": "Jun",
    "remarks": "Dealer counter audit & product demo travel",
    "status": "Approved",
    "date": "Jun 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 329,
    "id": "CLM-329"
  },
  {
    "empCode": "HOS0621",
    "name": "Birsa Munda",
    "state": "Jharkhand",
    "amount": 2113,
    "month": "Jul",
    "remarks": "Outstation HQ to district travel & lodging claim",
    "status": "Settled",
    "date": "Jul 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 330,
    "id": "CLM-330"
  },
  {
    "empCode": "HOS0622",
    "name": "Rajesh Tirkey",
    "state": "Jharkhand",
    "amount": 2838,
    "month": "Jul",
    "remarks": "Monthly territory routine travel & dealer meetings",
    "status": "Approved",
    "date": "Jul 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 331,
    "id": "CLM-331"
  },
  {
    "empCode": "HOS0623",
    "name": "Anand Soren",
    "state": "Jharkhand",
    "amount": 1942,
    "month": "Jul",
    "remarks": "Field outreach, distributor visits & market expansion",
    "status": "Approved",
    "date": "Jul 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 332,
    "id": "CLM-332"
  },
  {
    "empCode": "HOS0388",
    "name": "Deepak Yadav",
    "state": "Rajasthan",
    "amount": 44974,
    "month": "Apr",
    "remarks": "Secondary sales coordination & stockist inspection",
    "status": "Settled",
    "date": "Apr 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 333,
    "id": "CLM-333"
  },
  {
    "empCode": "HOS0601",
    "name": "Suresh Choudhary",
    "state": "Rajasthan",
    "amount": 50758,
    "month": "Apr",
    "remarks": "Retail network tour and monthly field allowance",
    "status": "Approved",
    "date": "Apr 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 334,
    "id": "CLM-334"
  },
  {
    "empCode": "HOS0602",
    "name": "Ramesh Meena",
    "state": "Rajasthan",
    "amount": 58432,
    "month": "Apr",
    "remarks": "Dealer counter audit & product demo travel",
    "status": "Approved",
    "date": "Apr 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 335,
    "id": "CLM-335"
  },
  {
    "empCode": "HOS0603",
    "name": "Vikram Rathore",
    "state": "Rajasthan",
    "amount": 47482,
    "month": "Apr",
    "remarks": "Outstation HQ to district travel & lodging claim",
    "status": "Approved",
    "date": "Apr 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 336,
    "id": "CLM-336"
  },
  {
    "empCode": "HOS0604",
    "name": "Mahendra Singh",
    "state": "Rajasthan",
    "amount": 36917,
    "month": "Apr",
    "remarks": "Monthly territory routine travel & dealer meetings",
    "status": "Approved",
    "date": "Apr 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 337,
    "id": "CLM-337"
  },
  {
    "empCode": "HOS0605",
    "name": "Kailash Chand",
    "state": "Rajasthan",
    "amount": 33152,
    "month": "Apr",
    "remarks": "Field outreach, distributor visits & market expansion",
    "status": "Approved",
    "date": "Apr 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 338,
    "id": "CLM-338"
  },
  {
    "empCode": "HOS0606",
    "name": "Dinesh Sharma",
    "state": "Rajasthan",
    "amount": 36125,
    "month": "Apr",
    "remarks": "Secondary sales coordination & stockist inspection",
    "status": "Approved",
    "date": "Apr 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 339,
    "id": "CLM-339"
  },
  {
    "empCode": "HOS0607",
    "name": "Mukesh Prajapat",
    "state": "Rajasthan",
    "amount": 26819,
    "month": "Apr",
    "remarks": "Retail network tour and monthly field allowance",
    "status": "Settled",
    "date": "Apr 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 340,
    "id": "CLM-340"
  },
  {
    "empCode": "HOS0608",
    "name": "Gopal Saini",
    "state": "Rajasthan",
    "amount": 27331,
    "month": "Apr",
    "remarks": "Dealer counter audit & product demo travel",
    "status": "Approved",
    "date": "Apr 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 341,
    "id": "CLM-341"
  },
  {
    "empCode": "HOS0609",
    "name": "Rajendra Prasad",
    "state": "Rajasthan",
    "amount": 38588,
    "month": "Apr",
    "remarks": "Outstation HQ to district travel & lodging claim",
    "status": "Approved",
    "date": "Apr 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 342,
    "id": "CLM-342"
  },
  {
    "empCode": "HOS0610",
    "name": "Hanuman Ram",
    "state": "Rajasthan",
    "amount": 47802,
    "month": "Apr",
    "remarks": "Monthly territory routine travel & dealer meetings",
    "status": "Approved",
    "date": "Apr 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 343,
    "id": "CLM-343"
  },
  {
    "empCode": "HOS0388",
    "name": "Deepak Yadav",
    "state": "Rajasthan",
    "amount": 47263,
    "month": "May",
    "remarks": "Field outreach, distributor visits & market expansion",
    "status": "Settled",
    "date": "May 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 344,
    "id": "CLM-344"
  },
  {
    "empCode": "HOS0601",
    "name": "Suresh Choudhary",
    "state": "Rajasthan",
    "amount": 55845,
    "month": "May",
    "remarks": "Secondary sales coordination & stockist inspection",
    "status": "Approved",
    "date": "May 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 345,
    "id": "CLM-345"
  },
  {
    "empCode": "HOS0602",
    "name": "Ramesh Meena",
    "state": "Rajasthan",
    "amount": 60031,
    "month": "May",
    "remarks": "Retail network tour and monthly field allowance",
    "status": "Approved",
    "date": "May 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 346,
    "id": "CLM-346"
  },
  {
    "empCode": "HOS0603",
    "name": "Vikram Rathore",
    "state": "Rajasthan",
    "amount": 47540,
    "month": "May",
    "remarks": "Dealer counter audit & product demo travel",
    "status": "Approved",
    "date": "May 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 347,
    "id": "CLM-347"
  },
  {
    "empCode": "HOS0604",
    "name": "Mahendra Singh",
    "state": "Rajasthan",
    "amount": 40590,
    "month": "May",
    "remarks": "Outstation HQ to district travel & lodging claim",
    "status": "Approved",
    "date": "May 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 348,
    "id": "CLM-348"
  },
  {
    "empCode": "HOS0605",
    "name": "Kailash Chand",
    "state": "Rajasthan",
    "amount": 37200,
    "month": "May",
    "remarks": "Monthly territory routine travel & dealer meetings",
    "status": "Approved",
    "date": "May 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 349,
    "id": "CLM-349"
  },
  {
    "empCode": "HOS0606",
    "name": "Dinesh Sharma",
    "state": "Rajasthan",
    "amount": 36120,
    "month": "May",
    "remarks": "Field outreach, distributor visits & market expansion",
    "status": "Approved",
    "date": "May 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 350,
    "id": "CLM-350"
  },
  {
    "empCode": "HOS0607",
    "name": "Mukesh Prajapat",
    "state": "Rajasthan",
    "amount": 35262,
    "month": "May",
    "remarks": "Secondary sales coordination & stockist inspection",
    "status": "Settled",
    "date": "May 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 351,
    "id": "CLM-351"
  },
  {
    "empCode": "HOS0608",
    "name": "Gopal Saini",
    "state": "Rajasthan",
    "amount": 32395,
    "month": "May",
    "remarks": "Retail network tour and monthly field allowance",
    "status": "Approved",
    "date": "May 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 352,
    "id": "CLM-352"
  },
  {
    "empCode": "HOS0609",
    "name": "Rajendra Prasad",
    "state": "Rajasthan",
    "amount": 41719,
    "month": "May",
    "remarks": "Dealer counter audit & product demo travel",
    "status": "Approved",
    "date": "May 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 353,
    "id": "CLM-353"
  },
  {
    "empCode": "HOS0610",
    "name": "Hanuman Ram",
    "state": "Rajasthan",
    "amount": 45951,
    "month": "May",
    "remarks": "Outstation HQ to district travel & lodging claim",
    "status": "Approved",
    "date": "May 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 354,
    "id": "CLM-354"
  },
  {
    "empCode": "HOS0388",
    "name": "Deepak Yadav",
    "state": "Rajasthan",
    "amount": 51766,
    "month": "Jun",
    "remarks": "Monthly territory routine travel & dealer meetings",
    "status": "Settled",
    "date": "Jun 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 355,
    "id": "CLM-355"
  },
  {
    "empCode": "HOS0601",
    "name": "Suresh Choudhary",
    "state": "Rajasthan",
    "amount": 63896,
    "month": "Jun",
    "remarks": "Field outreach, distributor visits & market expansion",
    "status": "Approved",
    "date": "Jun 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 356,
    "id": "CLM-356"
  },
  {
    "empCode": "HOS0602",
    "name": "Ramesh Meena",
    "state": "Rajasthan",
    "amount": 47120,
    "month": "Jun",
    "remarks": "Secondary sales coordination & stockist inspection",
    "status": "Approved",
    "date": "Jun 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 357,
    "id": "CLM-357"
  },
  {
    "empCode": "HOS0603",
    "name": "Vikram Rathore",
    "state": "Rajasthan",
    "amount": 50144,
    "month": "Jun",
    "remarks": "Retail network tour and monthly field allowance",
    "status": "Approved",
    "date": "Jun 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 358,
    "id": "CLM-358"
  },
  {
    "empCode": "HOS0604",
    "name": "Mahendra Singh",
    "state": "Rajasthan",
    "amount": 40921,
    "month": "Jun",
    "remarks": "Dealer counter audit & product demo travel",
    "status": "Approved",
    "date": "Jun 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 359,
    "id": "CLM-359"
  },
  {
    "empCode": "HOS0605",
    "name": "Kailash Chand",
    "state": "Rajasthan",
    "amount": 30378,
    "month": "Jun",
    "remarks": "Outstation HQ to district travel & lodging claim",
    "status": "Approved",
    "date": "Jun 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 360,
    "id": "CLM-360"
  },
  {
    "empCode": "HOS0606",
    "name": "Dinesh Sharma",
    "state": "Rajasthan",
    "amount": 35257,
    "month": "Jun",
    "remarks": "Monthly territory routine travel & dealer meetings",
    "status": "Approved",
    "date": "Jun 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 361,
    "id": "CLM-361"
  },
  {
    "empCode": "HOS0607",
    "name": "Mukesh Prajapat",
    "state": "Rajasthan",
    "amount": 33515,
    "month": "Jun",
    "remarks": "Field outreach, distributor visits & market expansion",
    "status": "Settled",
    "date": "Jun 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 362,
    "id": "CLM-362"
  },
  {
    "empCode": "HOS0608",
    "name": "Gopal Saini",
    "state": "Rajasthan",
    "amount": 32597,
    "month": "Jun",
    "remarks": "Secondary sales coordination & stockist inspection",
    "status": "Approved",
    "date": "Jun 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 363,
    "id": "CLM-363"
  },
  {
    "empCode": "HOS0609",
    "name": "Rajendra Prasad",
    "state": "Rajasthan",
    "amount": 49096,
    "month": "Jun",
    "remarks": "Retail network tour and monthly field allowance",
    "status": "Approved",
    "date": "Jun 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 364,
    "id": "CLM-364"
  },
  {
    "empCode": "HOS0610",
    "name": "Hanuman Ram",
    "state": "Rajasthan",
    "amount": 59843,
    "month": "Jun",
    "remarks": "Dealer counter audit & product demo travel",
    "status": "Approved",
    "date": "Jun 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 365,
    "id": "CLM-365"
  },
  {
    "empCode": "HOS0388",
    "name": "Deepak Yadav",
    "state": "Rajasthan",
    "amount": 44745,
    "month": "Jul",
    "remarks": "Outstation HQ to district travel & lodging claim",
    "status": "Settled",
    "date": "Jul 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 366,
    "id": "CLM-366"
  },
  {
    "empCode": "HOS0601",
    "name": "Suresh Choudhary",
    "state": "Rajasthan",
    "amount": 71185,
    "month": "Jul",
    "remarks": "Monthly territory routine travel & dealer meetings",
    "status": "Approved",
    "date": "Jul 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 367,
    "id": "CLM-367"
  },
  {
    "empCode": "HOS0602",
    "name": "Ramesh Meena",
    "state": "Rajasthan",
    "amount": 53353,
    "month": "Jul",
    "remarks": "Field outreach, distributor visits & market expansion",
    "status": "Approved",
    "date": "Jul 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 368,
    "id": "CLM-368"
  },
  {
    "empCode": "HOS0603",
    "name": "Vikram Rathore",
    "state": "Rajasthan",
    "amount": 54431,
    "month": "Jul",
    "remarks": "Secondary sales coordination & stockist inspection",
    "status": "Approved",
    "date": "Jul 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 369,
    "id": "CLM-369"
  },
  {
    "empCode": "HOS0604",
    "name": "Mahendra Singh",
    "state": "Rajasthan",
    "amount": 36391,
    "month": "Jul",
    "remarks": "Retail network tour and monthly field allowance",
    "status": "Approved",
    "date": "Jul 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 370,
    "id": "CLM-370"
  },
  {
    "empCode": "HOS0605",
    "name": "Kailash Chand",
    "state": "Rajasthan",
    "amount": 39010,
    "month": "Jul",
    "remarks": "Dealer counter audit & product demo travel",
    "status": "Approved",
    "date": "Jul 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 371,
    "id": "CLM-371"
  },
  {
    "empCode": "HOS0606",
    "name": "Dinesh Sharma",
    "state": "Rajasthan",
    "amount": 41436,
    "month": "Jul",
    "remarks": "Outstation HQ to district travel & lodging claim",
    "status": "Approved",
    "date": "Jul 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 372,
    "id": "CLM-372"
  },
  {
    "empCode": "HOS0607",
    "name": "Mukesh Prajapat",
    "state": "Rajasthan",
    "amount": 31817,
    "month": "Jul",
    "remarks": "Monthly territory routine travel & dealer meetings",
    "status": "Settled",
    "date": "Jul 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 373,
    "id": "CLM-373"
  },
  {
    "empCode": "HOS0608",
    "name": "Gopal Saini",
    "state": "Rajasthan",
    "amount": 36435,
    "month": "Jul",
    "remarks": "Field outreach, distributor visits & market expansion",
    "status": "Approved",
    "date": "Jul 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 374,
    "id": "CLM-374"
  },
  {
    "empCode": "HOS0609",
    "name": "Rajendra Prasad",
    "state": "Rajasthan",
    "amount": 53181,
    "month": "Jul",
    "remarks": "Secondary sales coordination & stockist inspection",
    "status": "Approved",
    "date": "Jul 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 375,
    "id": "CLM-375"
  },
  {
    "empCode": "HOS0610",
    "name": "Hanuman Ram",
    "state": "Rajasthan",
    "amount": 58579,
    "month": "Jul",
    "remarks": "Retail network tour and monthly field allowance",
    "status": "Approved",
    "date": "Jul 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 376,
    "id": "CLM-376"
  },
  {
    "empCode": "HOS0388",
    "name": "Deepak Yadav",
    "state": "Rajasthan",
    "amount": 52692,
    "month": "Aug",
    "remarks": "Dealer counter audit & product demo travel",
    "status": "Settled",
    "date": "Aug 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 377,
    "id": "CLM-377"
  },
  {
    "empCode": "HOS0601",
    "name": "Suresh Choudhary",
    "state": "Rajasthan",
    "amount": 68822,
    "month": "Aug",
    "remarks": "Outstation HQ to district travel & lodging claim",
    "status": "Approved",
    "date": "Aug 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 378,
    "id": "CLM-378"
  },
  {
    "empCode": "HOS0602",
    "name": "Ramesh Meena",
    "state": "Rajasthan",
    "amount": 56929,
    "month": "Aug",
    "remarks": "Monthly territory routine travel & dealer meetings",
    "status": "Approved",
    "date": "Aug 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 379,
    "id": "CLM-379"
  },
  {
    "empCode": "HOS0603",
    "name": "Vikram Rathore",
    "state": "Rajasthan",
    "amount": 46471,
    "month": "Aug",
    "remarks": "Field outreach, distributor visits & market expansion",
    "status": "Approved",
    "date": "Aug 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 380,
    "id": "CLM-380"
  },
  {
    "empCode": "HOS0604",
    "name": "Mahendra Singh",
    "state": "Rajasthan",
    "amount": 33530,
    "month": "Aug",
    "remarks": "Secondary sales coordination & stockist inspection",
    "status": "Approved",
    "date": "Aug 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 381,
    "id": "CLM-381"
  },
  {
    "empCode": "HOS0605",
    "name": "Kailash Chand",
    "state": "Rajasthan",
    "amount": 38269,
    "month": "Aug",
    "remarks": "Retail network tour and monthly field allowance",
    "status": "Approved",
    "date": "Aug 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 382,
    "id": "CLM-382"
  },
  {
    "empCode": "HOS0606",
    "name": "Dinesh Sharma",
    "state": "Rajasthan",
    "amount": 37131,
    "month": "Aug",
    "remarks": "Dealer counter audit & product demo travel",
    "status": "Approved",
    "date": "Aug 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 383,
    "id": "CLM-383"
  },
  {
    "empCode": "HOS0607",
    "name": "Mukesh Prajapat",
    "state": "Rajasthan",
    "amount": 32796,
    "month": "Aug",
    "remarks": "Outstation HQ to district travel & lodging claim",
    "status": "Settled",
    "date": "Aug 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 384,
    "id": "CLM-384"
  },
  {
    "empCode": "HOS0608",
    "name": "Gopal Saini",
    "state": "Rajasthan",
    "amount": 32063,
    "month": "Aug",
    "remarks": "Monthly territory routine travel & dealer meetings",
    "status": "Approved",
    "date": "Aug 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 385,
    "id": "CLM-385"
  },
  {
    "empCode": "HOS0609",
    "name": "Rajendra Prasad",
    "state": "Rajasthan",
    "amount": 38940,
    "month": "Aug",
    "remarks": "Field outreach, distributor visits & market expansion",
    "status": "Approved",
    "date": "Aug 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 386,
    "id": "CLM-386"
  },
  {
    "empCode": "HOS0610",
    "name": "Hanuman Ram",
    "state": "Rajasthan",
    "amount": 57306,
    "month": "Aug",
    "remarks": "Secondary sales coordination & stockist inspection",
    "status": "Approved",
    "date": "Aug 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 387,
    "id": "CLM-387"
  },
  {
    "empCode": "HOS0631",
    "name": "Bhavesh Patel",
    "state": "Gujarat",
    "amount": 12086,
    "month": "Apr",
    "remarks": "Retail network tour and monthly field allowance",
    "status": "Settled",
    "date": "Apr 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 388,
    "id": "CLM-388"
  },
  {
    "empCode": "HOS0632",
    "name": "Jignesh Shah",
    "state": "Gujarat",
    "amount": 9542,
    "month": "Apr",
    "remarks": "Dealer counter audit & product demo travel",
    "status": "Approved",
    "date": "Apr 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 389,
    "id": "CLM-389"
  },
  {
    "empCode": "HOS0633",
    "name": "Paresh Mehta",
    "state": "Gujarat",
    "amount": 10751,
    "month": "Apr",
    "remarks": "Outstation HQ to district travel & lodging claim",
    "status": "Approved",
    "date": "Apr 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 390,
    "id": "CLM-390"
  },
  {
    "empCode": "HOS0634",
    "name": "Hiren Joshi",
    "state": "Gujarat",
    "amount": 13578,
    "month": "Apr",
    "remarks": "Monthly territory routine travel & dealer meetings",
    "status": "Approved",
    "date": "Apr 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 391,
    "id": "CLM-391"
  },
  {
    "empCode": "HOS0631",
    "name": "Bhavesh Patel",
    "state": "Gujarat",
    "amount": 14500,
    "month": "May",
    "remarks": "Field outreach, distributor visits & market expansion",
    "status": "Settled",
    "date": "May 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 392,
    "id": "CLM-392"
  },
  {
    "empCode": "HOS0632",
    "name": "Jignesh Shah",
    "state": "Gujarat",
    "amount": 9130,
    "month": "May",
    "remarks": "Secondary sales coordination & stockist inspection",
    "status": "Approved",
    "date": "May 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 393,
    "id": "CLM-393"
  },
  {
    "empCode": "HOS0633",
    "name": "Paresh Mehta",
    "state": "Gujarat",
    "amount": 10907,
    "month": "May",
    "remarks": "Retail network tour and monthly field allowance",
    "status": "Approved",
    "date": "May 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 394,
    "id": "CLM-394"
  },
  {
    "empCode": "HOS0634",
    "name": "Hiren Joshi",
    "state": "Gujarat",
    "amount": 13338,
    "month": "May",
    "remarks": "Dealer counter audit & product demo travel",
    "status": "Approved",
    "date": "May 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 395,
    "id": "CLM-395"
  },
  {
    "empCode": "HOS0631",
    "name": "Bhavesh Patel",
    "state": "Gujarat",
    "amount": 10069,
    "month": "Jun",
    "remarks": "Outstation HQ to district travel & lodging claim",
    "status": "Settled",
    "date": "Jun 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 396,
    "id": "CLM-396"
  },
  {
    "empCode": "HOS0632",
    "name": "Jignesh Shah",
    "state": "Gujarat",
    "amount": 5801,
    "month": "Jun",
    "remarks": "Monthly territory routine travel & dealer meetings",
    "status": "Approved",
    "date": "Jun 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 397,
    "id": "CLM-397"
  },
  {
    "empCode": "HOS0633",
    "name": "Paresh Mehta",
    "state": "Gujarat",
    "amount": 8580,
    "month": "Jun",
    "remarks": "Field outreach, distributor visits & market expansion",
    "status": "Approved",
    "date": "Jun 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 398,
    "id": "CLM-398"
  },
  {
    "empCode": "HOS0634",
    "name": "Hiren Joshi",
    "state": "Gujarat",
    "amount": 10045,
    "month": "Jun",
    "remarks": "Secondary sales coordination & stockist inspection",
    "status": "Approved",
    "date": "Jun 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 399,
    "id": "CLM-399"
  },
  {
    "empCode": "HOS0631",
    "name": "Bhavesh Patel",
    "state": "Gujarat",
    "amount": 7755,
    "month": "Jul",
    "remarks": "Retail network tour and monthly field allowance",
    "status": "Settled",
    "date": "Jul 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 400,
    "id": "CLM-400"
  },
  {
    "empCode": "HOS0632",
    "name": "Jignesh Shah",
    "state": "Gujarat",
    "amount": 4580,
    "month": "Jul",
    "remarks": "Dealer counter audit & product demo travel",
    "status": "Approved",
    "date": "Jul 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 401,
    "id": "CLM-401"
  },
  {
    "empCode": "HOS0633",
    "name": "Paresh Mehta",
    "state": "Gujarat",
    "amount": 7027,
    "month": "Jul",
    "remarks": "Outstation HQ to district travel & lodging claim",
    "status": "Approved",
    "date": "Jul 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 402,
    "id": "CLM-402"
  },
  {
    "empCode": "HOS0634",
    "name": "Hiren Joshi",
    "state": "Gujarat",
    "amount": 7718,
    "month": "Jul",
    "remarks": "Monthly territory routine travel & dealer meetings",
    "status": "Approved",
    "date": "Jul 2026",
    "sourceSpreadsheet": "Bhawna TA Master",
    "sNo": 403,
    "id": "CLM-403"
  }
];
  var monthFilter = filter && filter.month && filter.month !== 'All' ? filter.month : null;
  var stateFilter = filter && filter.state && filter.state !== 'All' ? normalizeStateName(filter.state).toLowerCase() : null;
  var query = filter && filter.query ? filter.query.toLowerCase() : null;

  return allBhawna.filter(function(c) {
    if (monthFilter && c.month !== monthFilter) return false;
    if (stateFilter && normalizeStateName(c.state).toLowerCase() !== stateFilter) return false;
    if (query) {
      var full = (c.empCode + ' ' + c.name + ' ' + c.state + ' ' + c.month + ' ' + c.remarks).toLowerCase();
      if (!full.includes(query)) return false;
    }
    return true;
  });
}

/**
 * Direct repair utility to immediately heal Cell D in Sep sheet and Master tab
 */
function REPAIR_SEP_CELL_D() {
  var ssIds = [
    '1VkrqI6qCWhfLcPQcigJEQE9jkTwdbHkVVTGre0pHhDY',
    '166GBY-ACppPT9vFccLK1UJFKzO4KxeTGXxpUSMsrG5w'
  ];
  ssIds.forEach(function(id) {
    try {
      var ss = SpreadsheetApp.openById(id);
      if (ss) {
        healAllSheetsInSpreadsheet(ss);
        var sheets = ss.getSheets();
        sheets.forEach(function(sh) {
          var name = sh.getName().toLowerCase();
          if (!name.includes('staff') && !name.includes('users') && !name.includes('costing') && sh.getLastRow() >= 3) {
            if (typeof updateStateSums === 'function') {
              updateStateSums(sh);
            }
          }
        });
      }
    } catch (e) {
      console.warn('Repair sheet error:', id, e);
    }
  });
}
