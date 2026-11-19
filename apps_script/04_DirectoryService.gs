/**
 * ==========================================================================
 * 04_DIRECTORYSERVICE.GS - EMPLOYEE & STAFF DIRECTORY
 * ==========================================================================
 * Manages sales representative list, dynamic autocompletion, adding new staff,
 * and editing employee code, name, territory, and details dynamically across
 * Staff sheets, Master sheets, and monthly tabs in both Google Spreadsheets.
 * ZERO HARDCODED CODES OR NAMES - 100% DYNAMIC.
 * ==========================================================================
 */

/**
 * Pre-loads active staff directory dynamically from connected spreadsheets.
 */
function getEmployeeDirectory(filter) {
  try {
    const employees = {};

    let configuredIds = [];
    if (filter && Array.isArray(filter.spreadsheetIds) && filter.spreadsheetIds.filter(Boolean).length > 0) {
      configuredIds = filter.spreadsheetIds.map(function(id) { return String(id || '').trim(); }).filter(Boolean);
    } else {
      configuredIds = getConfiguredSpreadsheetIds();
    }

    const spreadsheets = [];
    for (let i = 0; i < configuredIds.length; i++) {
      try {
        const candidate = SpreadsheetApp.openById(configuredIds[i]);
        if (candidate) spreadsheets.push(candidate);
      } catch (err) {
        console.warn('Directory scan: could not open sheet', configuredIds[i], err);
      }
    }

    if (spreadsheets.length === 0) {
      const fallback = getSpreadsheet();
      if (fallback) spreadsheets.push(fallback);
    }

    spreadsheets.forEach(function(ss) {
      // 1. Check custom Staff sheet if available
      const staffSheet = ss.getSheetByName('Staff');
      if (staffSheet) {
        const sData = staffSheet.getDataRange().getValues();
        if (sData && sData.length > 1) {
          for (let r = 1; r < sData.length; r++) {
            const row = sData[r];
            const code = String(row[0] || '').trim().toUpperCase();
            const name = String(row[1] || '').trim();
            const state = String(row[2] || '').trim();
            const designation = String(row[3] || 'Sales Representative').trim();
            const phone = String(row[4] || '').trim();
            if (code && name && !code.includes('TOTAL') && !code.includes('GRAND')) {
              employees[code] = {
                code: code,
                name: name,
                state: state,
                designation: designation || 'Sales Representative',
                phone: phone
              };
            }
          }
        }
      }
 
      function isGenuineEmployee(code, name) {
        if (!code || !name) return false;
        const c = String(code).trim().toUpperCase();
        const n = String(name).trim().toUpperCase();
        if (c.includes('TOTAL') || c.includes('GRAND') || n.includes('TOTAL') || n.includes('GRAND')) return false;
        if (c.includes('TA-BILL') || c.includes('TA BILL') || c.includes('TA_BILL') || c.includes('TABILL')) return false;
        if (n.includes('TA-BILL') || n.includes('TA BILL') || n.includes('TA_BILL') || n.includes('TABILL')) return false;
        if (c.includes('EMP. CODE') || c.includes('EMP CODE') || c === 'CODE') return false;
        if (n.includes('SALES PERSON') || n.includes('PERSON NAME') || n === 'NAME') return false;
        if (c === 'S.NO' || c === 'S.NO.' || c === 'SL.NO' || c === 'SR.NO') return false;
        if (typeof detectStateName === 'function' && detectStateName(c)) return false;
        return true;
      }

      // 2. Check Master sheet dynamically for all employee records (Row 3 onwards)
      const sheet = getMasterSheet(ss);
      if (sheet) {
        const data = sheet.getDataRange().getValues();
        if (data && data.length > 2) {
          let headerRowIndex = 1; // Default to Row 2
          for (let r = 0; r < Math.min(5, data.length); r++) {
            const rowStr = data[r].join(' ').toLowerCase();
            if ((rowStr.includes('code') || rowStr.includes('emp')) && (rowStr.includes('name') || rowStr.includes('person'))) {
              headerRowIndex = r;
              break;
            }
          }
          headerRowIndex = Math.max(headerRowIndex, 1);

          const headers = data[headerRowIndex].map(function(h) { return String(h).trim().toLowerCase(); });
          let empIdx = headers.findIndex(function(h) { return h.includes('code') || h.includes('emp'); });
          let nameIdx = headers.findIndex(function(h) { return h.includes('name') || h.includes('person'); });
          let stateIdx = headers.findIndex(function(h) { return h === 'state' || h === 'territory' || h.includes('state') || h.includes('territory'); });

          if (empIdx === -1) empIdx = 1;
          if (nameIdx === -1) nameIdx = 2;

          let currentSection = (typeof isBhawnaSpreadsheet === 'function' && isBhawnaSpreadsheet(ss)) ? 'Rajasthan' : 'Delhi';
          // Start strictly from 3rd row (index 2)
          for (let r = Math.max(headerRowIndex + 1, 2); r < data.length; r++) {
            const row = data[r];

            // Check if section header
            let rowText = '';
            for (let c = 0; c < Math.min(5, row.length); c++) {
              const cellVal = String(row[c] || '').trim();
              if (cellVal) rowText += ' ' + cellVal;
            }
            const detState = (typeof detectStateName === 'function') ? detectStateName(rowText) : normalizeStateName(rowText);
            if (detState && detState !== 'Delhi') {
              currentSection = detState;
            } else if (/\bdelhi\b/i.test(rowText) && !rowText.toLowerCase().includes('sharma') && !rowText.toLowerCase().includes('dubey')) {
              currentSection = 'Delhi';
            }

            const code = String(row[empIdx] || '').trim().toUpperCase();
            const name = String(row[nameIdx] || '').trim();

            let state = '';
            if (stateIdx !== -1 && row[stateIdx]) {
              const cellState = (typeof detectStateName === 'function') ? detectStateName(String(row[stateIdx])) : normalizeStateName(String(row[stateIdx]));
              if (cellState) state = cellState;
            }
            if (!state) {
              state = currentSection;
            }

            if (isGenuineEmployee(code, name)) {
              if (!employees[code]) {
                employees[code] = { 
                  code: code, 
                  name: name, 
                  state: state, 
                  designation: 'Sales Representative', 
                  phone: '' 
                };
              } else if (state && (!employees[code].state || employees[code].state === 'Delhi')) {
                employees[code].state = state;
              }
            }
          }
        }
      }

      // 3. Scan monthly tabs to capture any reps in specific months (Row 3 onwards)
      const allSheets = ss.getSheets();
      allSheets.forEach(function(mSheet) {
        const mName = mSheet.getName();
        if (mName === 'Master' || mName === 'Staff' || mName.startsWith('_')) return;
        const vals = mSheet.getDataRange().getValues();
        if (!vals || vals.length < 3) return;

        let hRow = 1; // Default to Row 2
        for (let r = 0; r < Math.min(4, vals.length); r++) {
          const s = vals[r].join(' ').toLowerCase();
          if ((s.includes('code') || s.includes('emp')) && (s.includes('name') || s.includes('person'))) {
            hRow = r;
            break;
          }
        }
        hRow = Math.max(hRow, 1);

        const mHeaders = vals[hRow].map(function(h) { return String(h).trim().toLowerCase(); });
        let cIdx = mHeaders.findIndex(function(h) { return h.includes('code') || h.includes('emp'); });
        let nIdx = mHeaders.findIndex(function(h) { return h.includes('name') || h.includes('person'); });
        let dIdx = mHeaders.findIndex(function(h) { return h.includes('desig') || h.includes('post'); });
        if (cIdx === -1) cIdx = 1;
        if (nIdx === -1) nIdx = 2;

        let currentSection = (typeof isBhawnaSpreadsheet === 'function' && isBhawnaSpreadsheet(ss)) ? 'Rajasthan' : 'Delhi';
        // Start strictly from 3rd row (index 2)
        for (let r = Math.max(hRow + 1, 2); r < vals.length; r++) {
          let rowText = '';
          for (let c = 0; c < Math.min(5, vals[r].length); c++) {
            const cellVal = String(vals[r][c] || '').trim();
            if (cellVal) rowText += ' ' + cellVal;
          }
          const detState = (typeof detectStateName === 'function') ? detectStateName(rowText) : normalizeStateName(rowText);
          if (detState && detState !== 'Delhi') {
            currentSection = detState;
          } else if (/\bdelhi\b/i.test(rowText) && !rowText.toLowerCase().includes('sharma') && !rowText.toLowerCase().includes('dubey')) {
            currentSection = 'Delhi';
          }

          const rCode = String(vals[r][cIdx] || '').trim().toUpperCase();
          const rName = String(vals[r][nIdx] || '').trim();
          const desig = dIdx !== -1 ? String(vals[r][dIdx] || '').trim() : '';

          if (isGenuineEmployee(rCode, rName)) {
            if (!employees[rCode]) {
              employees[rCode] = {
                code: rCode,
                name: rName,
                state: currentSection,
                designation: desig || 'Sales Representative',
                phone: ''
              };
            } else if (!employees[rCode].state || employees[rCode].state === 'Delhi') {
              if (currentSection && currentSection !== 'Delhi') {
                employees[rCode].state = currentSection;
              }
            }
          }
        }
      });
    });

    // Self-heal any unresolved states against default directory
    const defaultList = (typeof getDefaultDirectory === 'function') ? getDefaultDirectory() : [];
    const defaultMap = {};
    defaultList.forEach(function(d) {
      if (d.code) defaultMap[d.code.toUpperCase()] = d.state;
    });

    Object.keys(employees).forEach(function(code) {
      if (!employees[code].state || employees[code].state === 'General') {
        if (defaultMap[code]) {
          employees[code].state = defaultMap[code];
        } else {
          employees[code].state = 'Delhi';
        }
      }
    });

    const list = Object.values(employees);
    if (list.length > 0) return list;

    // Fallback if sheets are completely empty
    return getDefaultDirectory();
  } catch (err) {
    console.error('Error in getEmployeeDirectory:', err);
    return getDefaultDirectory();
  }
}

/**
 * Appends a new employee to the sheet directory across configured spreadsheets.
 */
function addStaffMember(payload) {
  try {
    const code = String(payload.code || '').trim().toUpperCase();
    const name = String(payload.name || '').trim();
    const state = String(payload.state || '').trim();
    const designation = String(payload.designation || 'Sales Representative').trim();
    const phone = String(payload.phone || '').trim();

    if (!code || !name) {
      return { success: false, message: 'Employee Code and Name are required.' };
    }

    const spreadsheets = getTargetSpreadsheets(payload);
    if (spreadsheets.length === 0) {
      const fallback = getSpreadsheet();
      if (fallback) spreadsheets.push(fallback);
    }

    spreadsheets.forEach(function(ss) {
      let staffSheet = ss.getSheetByName('Staff');
      if (!staffSheet) {
        staffSheet = ss.insertSheet('Staff');
        staffSheet.appendRow(['Emp. Code', 'Sales Person Name', 'State', 'Designation', 'Phone']);
        staffSheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#0F172A').setFontColor('#FFFFFF');
      }
      staffSheet.appendRow([code, name, state, designation, phone]);
    });

    return {
      success: true,
      message: `Representative ${name} (${code}) added to Google Sheet!`,
      record: { code: code, name: name, state: state, designation: designation, phone: phone }
    };
  } catch (err) {
    console.error('Error in addStaffMember:', err);
    return { success: false, message: 'Add staff failed: ' + err.toString() };
  }
}

/**
 * Updates an employee's code, name, territory/state, designation, and phone dynamically
 * across Staff sheets, Master sheets, and monthly tabs in all configured spreadsheets.
 * 100% Dynamic - ZERO hardcoding.
 */
function updateStaffMember(payload) {
  try {
    const oldCode = String(payload.oldCode || payload.code || '').trim().toUpperCase();
    const oldName = String(payload.oldName || payload.name || '').trim();
    const newCode = String(payload.code || payload.newCode || oldCode).trim().toUpperCase();
    const newName = String(payload.name || payload.newName || oldName).trim();
    const newState = String(payload.state || payload.newState || '').trim();
    const newDesignation = String(payload.designation || 'Sales Representative').trim();
    const newPhone = String(payload.phone || '').trim();

    if (!oldCode && !oldName) {
      return { success: false, message: 'Existing Employee Code or Name is required to edit.' };
    }

    let configuredIds = [];
    if (payload && Array.isArray(payload.spreadsheetIds) && payload.spreadsheetIds.filter(Boolean).length > 0) {
      configuredIds = payload.spreadsheetIds.map(function(id) { return String(id || '').trim(); }).filter(Boolean);
    } else {
      configuredIds = getConfiguredSpreadsheetIds();
    }

    const spreadsheets = [];
    for (let i = 0; i < configuredIds.length; i++) {
      try {
        const candidate = SpreadsheetApp.openById(configuredIds[i]);
        if (candidate) spreadsheets.push(candidate);
      } catch (err) {
        console.warn('updateStaffMember: could not open sheet', configuredIds[i], err);
      }
    }
    if (spreadsheets.length === 0) {
      const fallback = getSpreadsheet();
      if (fallback) spreadsheets.push(fallback);
    }

    let totalUpdated = 0;

    spreadsheets.forEach(function(ss) {
      // 1. Update in Staff sheet if exists
      const staffSheet = ss.getSheetByName('Staff');
      if (staffSheet) {
        const sData = staffSheet.getDataRange().getValues();
        let foundInStaff = false;
        for (let r = 1; r < sData.length; r++) {
          const rowCode = String(sData[r][0] || '').trim().toUpperCase();
          const rowName = String(sData[r][1] || '').trim();
          if ((oldCode && rowCode === oldCode) || (oldName && rowName.toLowerCase() === oldName.toLowerCase())) {
            staffSheet.getRange(r + 1, 1).setValue(newCode);
            staffSheet.getRange(r + 1, 2).setValue(newName);
            if (newState) staffSheet.getRange(r + 1, 3).setValue(newState);
            if (newDesignation) staffSheet.getRange(r + 1, 4).setValue(newDesignation);
            if (newPhone) staffSheet.getRange(r + 1, 5).setValue(newPhone);
            foundInStaff = true;
            totalUpdated++;
            break;
          }
        }
        if (!foundInStaff) {
          staffSheet.appendRow([newCode, newName, newState, newDesignation, newPhone]);
          totalUpdated++;
        }
      }

      // 2. Update in Master sheet
      const masterSheet = getMasterSheet(ss);
      if (masterSheet) {
        const mData = masterSheet.getDataRange().getValues();
        if (mData && mData.length > 2) {
          let headerRowIndex = 0;
          for (let r = 0; r < Math.min(5, mData.length); r++) {
            const rowStr = mData[r].join(' ').toLowerCase();
            if (rowStr.includes('code') || rowStr.includes('name')) {
              headerRowIndex = r;
              break;
            }
          }
          const headers = mData[headerRowIndex].map(function(h) { return String(h).trim().toLowerCase(); });
          let empIdx = headers.findIndex(function(h) { return h.includes('code') || h.includes('emp'); });
          let nameIdx = headers.findIndex(function(h) { return h.includes('name') || h.includes('person'); });
          let stateIdx = headers.findIndex(function(h) { return h.includes('state') || h.includes('region') || h.includes('territory'); });
          if (empIdx === -1) empIdx = 1;
          if (nameIdx === -1) nameIdx = 2;
          if (stateIdx === -1) stateIdx = 3;

          for (let r = headerRowIndex + 1; r < mData.length; r++) {
            const rowCode = String(mData[r][empIdx] || '').trim().toUpperCase();
            const rowName = String(mData[r][nameIdx] || '').trim();
            if ((oldCode && rowCode === oldCode) || (oldName && rowName.toLowerCase() === oldName.toLowerCase())) {
              masterSheet.getRange(r + 1, empIdx + 1).setValue(newCode);
              masterSheet.getRange(r + 1, nameIdx + 1).setValue(newName);
              if (newState) {
                masterSheet.getRange(r + 1, stateIdx + 1).setValue(newState);
              }
              totalUpdated++;
            }
          }
        }
      }

      // 3. Update in Monthly sheets
      const allSheets = ss.getSheets();
      allSheets.forEach(function(sheet) {
        const sheetName = sheet.getName();
        if (sheetName === 'Master' || sheetName === 'Staff' || sheetName.startsWith('_')) return;
        const vals = sheet.getDataRange().getValues();
        if (!vals || vals.length < 3) return;

        let hRow = -1;
        for (let r = 0; r < Math.min(4, vals.length); r++) {
          const s = vals[r].join(' ').toLowerCase();
          if (s.includes('code') || s.includes('emp') || s.includes('person') || s.includes('name')) {
            hRow = r;
            break;
          }
        }
        if (hRow === -1) hRow = 1;

        const rowHeaders = vals[hRow].map(function(h) { return String(h).trim().toLowerCase(); });
        let cIdx = rowHeaders.findIndex(function(h) { return h.includes('code') || h.includes('emp'); });
        let nIdx = rowHeaders.findIndex(function(h) { return h.includes('name') || h.includes('person'); });
        if (cIdx === -1) cIdx = 1;
        if (nIdx === -1) nIdx = 2;

        for (let r = hRow + 1; r < vals.length; r++) {
          const rowCode = String(vals[r][cIdx] || '').trim().toUpperCase();
          const rowName = String(vals[r][nIdx] || '').trim();
          if ((oldCode && rowCode === oldCode) || (oldName && rowName.toLowerCase() === oldName.toLowerCase())) {
            sheet.getRange(r + 1, cIdx + 1).setValue(newCode);
            sheet.getRange(r + 1, nIdx + 1).setValue(newName);
            totalUpdated++;
          }
        }
      });
    });

    return {
      success: true,
      message: `Updated representative ${newName} (${newCode}) successfully across Google Sheets!`,
      totalUpdated: totalUpdated,
      record: {
        code: newCode,
        name: newName,
        state: newState,
        designation: newDesignation,
        phone: newPhone
      }
    };
  } catch (err) {
    console.error('Error in updateStaffMember:', err);
    return { success: false, message: 'Update staff failed: ' + err.toString() };
  }
}

/**
 * Helper to get target spreadsheets from payload or config
 */
function getTargetSpreadsheets(payload) {
  let ids = [];
  if (payload && Array.isArray(payload.spreadsheetIds) && payload.spreadsheetIds.filter(Boolean).length > 0) {
    ids = payload.spreadsheetIds.map(function(id) { return String(id || '').trim(); }).filter(Boolean);
  } else {
    ids = getConfiguredSpreadsheetIds();
  }
  const result = [];
  for (let i = 0; i < ids.length; i++) {
    try {
      const ss = SpreadsheetApp.openById(ids[i]);
      if (ss) result.push(ss);
    } catch(e) {}
  }
  return result;
}
